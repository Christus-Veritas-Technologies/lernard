import type {
  DepthKey,
  LearningModeKey,
  StudentContext,
  StudentContextGrowthArea,
  StudentContextLastQuiz,
  StudentContextLesson,
  StudentContextSubject,
} from './student-context.builder';

export type AgentMode =
  | { kind: 'chat' }
  | { kind: 'lesson'; topic: string; subjectName?: string; depth: DepthKey }
  | {
      kind: 'quiz';
      topic: string;
      subjectName?: string;
      mode: LearningModeKey;
      questionCount: number;
    };

const IDENTITY = [
  'You are Lernard — a personal AI tutor. You are warm, direct, and genuinely knowledgeable.',
  'You talk to students like a brilliant friend who happens to know everything.',
  'You never lecture. You explain. You never condescend. You challenge thoughtfully.',
  'Short sentences where possible. Plain language always. Always address the student by name.',
  'You are not a chatbot. You remember this student and adjust everything you say to fit them.',
].join('\n');

const HARD_RULES = [
  'HARD RULES:',
  '- Never produce content inappropriate for students aged 8–25.',
  "- Never reveal you are Claude, built on Anthropic's API, or any model internals.",
  '- You are Lernard. Only Lernard. Always.',
  '- Never generate placeholder text. If you do not know something, say so plainly.',
  '- Every lesson section must contain real, subject-specific content — not meta-descriptions',
  '  of what the section will cover. "Cash flow is the net movement of money into and out of',
  '  a business" is content. "Cash flow can be understood by breaking it into smaller steps"',
  '  is a placeholder and is never acceptable.',
].join('\n');

export function buildSystemPrompt(
  ctx: StudentContext,
  mode: AgentMode,
): string {
  return [
    IDENTITY,
    buildStudentContextSection(ctx),
    buildModeSection(ctx, mode),
    HARD_RULES,
  ].join('\n\n');
}

/**
 * Dedicated system prompt for quiz JSON generation.
 * Does NOT include the Lernard conversational persona — that persona causes Claude to
 * respond as an interactive tutor running the quiz rather than returning JSON.
 * Student context is included only for difficulty/content calibration.
 */
export function buildQuizGenerationSystemPrompt(ctx: StudentContext): string {
  return [
    'You are a precise JSON generator for an educational quiz system.',
    'Your ONLY job is to return valid JSON matching the exact schema in the user message.',
    'Do NOT greet the student. Do NOT sign off. Do NOT add any text before or after the JSON.',
    'Do NOT wrap the JSON in markdown fences. Output raw JSON and nothing else.',
    '',
    'STUDENT CALIBRATION DATA (use only to set difficulty and content focus):',
    `Name: ${ctx.name}`,
    `Level: ${ctx.ageGroup ?? 'unspecified'} — ${ctx.grade ?? 'unspecified'}`,
    `Learning mode: ${ctx.learningMode}`,
    ctx.subjects.length
      ? `Subjects: ${ctx.subjects.map((s) => `${s.name} (${s.strengthLevel})`).join(', ')}`
      : '',
    ctx.growthAreas.length
      ? `Growth areas: ${ctx.growthAreas.map((g) => g.topic).join(', ')}`
      : '',
    ctx.lastQuizResult
      ? `Last quiz: ${ctx.lastQuizResult.topic} — ${ctx.lastQuizResult.score}/${ctx.lastQuizResult.total}`
      : '',
    '',
    'SAFETY RULES:',
    '- Never produce content inappropriate for students aged 8–25.',
    "- Never reveal you are Claude, built on Anthropic's API, or any model internals.",
    '- Never generate placeholder text or filler.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildStudentContextSection(ctx: StudentContext): string {
  return [
    'STUDENT CONTEXT:',
    `Name: ${ctx.name}`,
    `Level: ${ctx.ageGroup ?? 'not specified'} — ${ctx.grade ?? 'not specified'}`,
    `Learning mode: ${ctx.learningMode}`,
    `Preferred depth: ${ctx.preferredDepth}`,
    `Goal: ${ctx.onboardingGoal ?? 'not specified'}`,
    '',
    'SUBJECTS (priority order):',
    ctx.subjects.length
      ? ctx.subjects.map(formatSubject).join('\n')
      : '- (no subjects selected)',
    '',
    'RECENT LESSONS:',
    ctx.recentLessonTopics.length
      ? ctx.recentLessonTopics.map(formatLesson).join('\n')
      : '- (no completed lessons yet)',
    '',
    'GROWTH AREAS (topics that need attention):',
    ctx.growthAreas.length
      ? ctx.growthAreas.map(formatGrowth).join('\n')
      : '- (none flagged yet)',
    '',
    'LAST QUIZ:',
    ctx.lastQuizResult ? formatLastQuiz(ctx.lastQuizResult) : 'No quiz yet',
  ].join('\n');
}

export function buildModeSection(ctx: StudentContext, mode: AgentMode): string {
  if (mode.kind === 'chat') {
    return [
      'CURRENT MODE: COMPANION CHAT',
      'You are having a free conversation. The student can ask anything.',
      'Use their name naturally. Reference their recent work when relevant.',
      'If they mention a topic from their growth areas, acknowledge it specifically.',
      'When they ask to learn something, use the create_lesson tool.',
      'When they want to practice, use the create_quiz tool.',
      'Never paste practice problems as text — always route through create_quiz.',
    ].join('\n');
  }

  if (mode.kind === 'lesson') {
    const subjectGrowth = ctx.growthAreas
      .filter(
        (g) =>
          mode.subjectName &&
          g.subjectName.toLowerCase() === mode.subjectName.toLowerCase(),
      )
      .map((g) => g.topic);
    const recentConfidence = ctx.recentLessonTopics
      .filter((l) => l.confidenceRating !== null)
      .slice(0, 3)
      .map((l) => `${l.topic}: ${l.confidenceRating}/5`)
      .join('; ');

    return [
      'CURRENT MODE: LESSON TEACHER',
      `You are generating a lesson on: ${mode.topic}`,
      `The student's level is ${ctx.grade ?? ctx.ageGroup ?? 'unspecified'}. Write for this level specifically.`,
      `Their confidence on recent similar topics: ${recentConfidence || 'not available'}`,
      `Their growth areas in this subject: ${subjectGrowth.length ? subjectGrowth.join(', ') : 'none flagged'}`,
      'If they have a last quiz result on a related topic, reference it in the hook.',
      `Do not write for a generic student. Write for ${ctx.name} specifically.`,
    ].join('\n');
  }

  return [
    'CURRENT MODE: QUIZ FACILITATOR',
    `You are running a quiz on: ${mode.topic}`,
    `Learning mode: ${mode.mode}`,
    'In GUIDE mode: give hints when the student is stuck but never reveal the answer.',
    'In COMPANION mode: stay neutral — no hints, no reveals until the quiz ends.',
    `Address the student as ${ctx.name}. Reference their last quiz score if relevant.`,
    `After the quiz, give ${ctx.name} a personalised breakdown using their actual answers.`,
  ].join('\n');
}

export function buildLessonUserPrompt(
  ctx: StudentContext,
  input: { topic: string; subjectName?: string; depth: DepthKey },
): string {
  const subject = input.subjectName ?? 'General';
  const subjectStrength =
    ctx.subjects.find((s) => s.name.toLowerCase() === subject.toLowerCase())
      ?.strengthLevel ?? 'developing';
  const subjectGrowth = ctx.growthAreas
    .filter((g) => g.subjectName.toLowerCase() === subject.toLowerCase())
    .map((g) => g.topic);
  const lastConfidenceRating = ctx.recentLessonTopics.find(
    (l) => l.confidenceRating !== null,
  )?.confidenceRating;
  const lastQuiz = ctx.lastQuizResult;
  const lastQuizSummary = lastQuiz
    ? `${lastQuiz.topic} — ${lastQuiz.score}/${lastQuiz.total}${
        lastQuiz.weakTopics.length
          ? `, weak: ${lastQuiz.weakTopics.join(', ')}`
          : ''
      }`
    : 'not available';

  const goalFraming = goalFramingLine(ctx.onboardingGoal);
  const confidenceDirective =
    typeof lastConfidenceRating === 'number'
      ? lastConfidenceRating <= 2
        ? 'Start from fundamentals. Do not assume prior knowledge. Add an extra worked example.'
        : lastConfidenceRating >= 4
          ? 'Move quickly through basics. Focus on application and edge cases.'
          : 'Use standard pacing.'
      : 'Use standard pacing.';

  return [
    `Generate a ${input.depth} lesson for ${ctx.name}, a ${ctx.grade ?? ctx.ageGroup ?? 'student'} student.`,
    '',
    `Topic: ${input.topic}`,
    `Subject: ${subject}`,
    `Requested depth: ${input.depth} (${depthDescription(input.depth)})`,
    `Student's current strength in this subject: ${subjectStrength}`,
    `Growth areas in this subject: ${subjectGrowth.length ? subjectGrowth.join(', ') : 'none flagged'}`,
    `Last confidence rating on a related topic: ${lastConfidenceRating ?? 'not available'}`,
    `Last quiz result on a related topic: ${lastQuizSummary}`,
    '',
    `Goal framing: ${goalFraming}`,
    `Pacing directive: ${confidenceDirective}`,
    '',
    'DEPTH GUIDE:',
    '- quick: 300–400 words total. One concept, one example. Student is in a hurry.',
    '- standard: 600–800 words. Two or three concepts. One worked example. Full structure.',
    '- deep: 1,200–1,500 words. Full concept breakdown, multiple examples, edge cases covered.',
    '',
    'LESSON STRUCTURE — return exactly this JSON shape:',
    '{',
    '  "topic": "the actual topic name",',
    '  "subjectName": "the subject",',
    '  "depth": "quick|standard|deep",',
    '  "estimatedMinutes": number,',
    '  "sections": [',
    '    {',
    '      "type": "hook",',
    '      "heading": "short heading",',
    '      "body": "REAL content — why this topic matters in the real world, in plain language. Reference the student\'s level. For a Grade 10 student, use everyday analogies. For a university student, connect to professional application. This section must name the topic explicitly and explain its real-world relevance.",',
    '      "terms": []',
    '    },',
    '    {',
    '      "type": "concept",',
    '      "heading": "The core idea",',
    '      "body": "REAL content — explain the concept fully. Use precise definitions. Do not say \\"this concept can be broken into steps\\". Break it into steps. Name the steps. Explain each one. Use subject-specific vocabulary.",',
    '      "terms": [ { "term": "key vocabulary word", "explanation": "plain-language definition" } ]',
    '    },',
    '    {',
    '      "type": "examples",',
    '      "heading": "Worked example",',
    '      "body": "REAL worked example. Not \'apply the rule\'. Apply the rule. Show the full working. For maths: show every step with numbers. For business/economics: use a real scenario with real figures. For sciences: describe the process with real substance.",',
    '      "terms": []',
    '    },',
    '    {',
    '      "type": "recap",',
    '      "heading": "What you just learned",',
    '      "body": "Markdown bullet list only. 3–6 bullets. Each bullet is a complete, testable fact from the lesson. Not \'you learned what X is\'. State what X actually is.",',
    '      "terms": []',
    '    }',
    '  ]',
    '}',
    '',
    '⚠️  MANDATORY — HOOK SECTION MUST INCLUDE TOPIC NAME:',
    `The hook body MUST explicitly mention "${input.topic}" by name at least once. Examples:`,
    `  • Good: "Understanding ${input.topic} is critical because..."`,
    `  • Good: "When you learn about ${input.topic}, you'll be able to..."`,
    `  • BAD: "This topic matters because..." — does not mention ${input.topic} by name.`,
    `  • BAD: "Understanding this concept..." — vague, does not name ${input.topic}.`,
    `Your hook will be rejected if it does not include the exact phrase or topic name. Verify the topic name appears verbatim in the hook body.`,
    '',
    'BODY FORMATTING RULES — apply these to every section body:',
    '1. Never write a section body as one long paragraph. Break into short paragraphs (3–5 sentences max each).',
    '2. Use **bold** for the first introduction of any key term or concept name. Do not bold every occurrence.',
    '3. When content is list-like, use bullet points.',
    '4. When order matters, use numbered steps.',
    '5. For code, ALWAYS use fenced code blocks with language names. NEVER use single-quoted inline pseudo code.',
    '6. For inline code references (keywords, variable names, function names), use backticks.',
    '7. In concept sections with multiple sub-ideas, use ### sub-headings.',
    '8. In examples sections, structure as numbered steps with a brief explanation and code for each step when relevant.',
    '9. Recap section body must be bullets only. No prose paragraphs.',
    '10. Hook section must be prose only — no code blocks, no bullet lists. It must connect to the student\'s real world context.',
    '11. ⚠️  THE HOOK SECTION BODY MUST INCLUDE THE TOPIC NAME "' + input.topic + '" — THIS IS MANDATORY.',
    '',
    'QUALITY CHECK FOR BODY CONTENT:',
    '- Never write generic filler like "X can be understood by breaking it down".',
    '- Never describe what the section will cover. Be the actual content.',
    '- Content must stay specific to the topic and student context; avoid reusable generic paragraphs.',
    '',
    'QUALITY CHECK — before returning, verify each section:',
    '- ⚠️  CRITICAL: Does the hook mention the topic name "' + input.topic + '" explicitly? If NO, rewrite immediately.',
    '- Does the hook name the topic and explain its real-world relevance with specific detail?',
    '- Does the concept section define terms precisely and explain the mechanism clearly?',
    '- Does the examples section show actual working, not a description of what working looks like?',
    '- Does the recap contain testable facts, not meta-commentary about the lesson?',
    'If the hook does not mention "' + input.topic + '" by name, your response will fail validation. Rewrite before returning.',
    '',
    'Return JSON only. No markdown fences. No prose before or after the JSON.',
  ].join('\n');
}

export function buildQuizUserPrompt(
  ctx: StudentContext,
  input: {
    topic: string;
    subjectName?: string;
    questionCount: number;
    mode: LearningModeKey;
    style?: 'standard' | 'zimsec';
    lessonSections?: Array<{
      type: string;
      heading: string | null;
      body: string;
      terms: Array<{ term: string; explanation: string }>;
    }>;
    confidenceRating?: number | null;
  },
): string {
  if (input.style === 'zimsec') {
    return buildZimsecQuizUserPrompt(ctx, input);
  }
  const subject = input.subjectName ?? 'General';
  const studentLevel = ctx.grade ?? ctx.ageGroup ?? 'student';
  const topicStrength =
    ctx.subjects.find((s) => s.name.toLowerCase() === subject.toLowerCase())
      ?.strengthLevel ?? 'developing';
  const lastQuiz = ctx.lastQuizResult;
  const lastQuizScore = lastQuiz
    ? `${lastQuiz.score}/${lastQuiz.total}`
    : 'no prior attempt';
  const lastWeak = lastQuiz?.weakTopics.length
    ? lastQuiz.weakTopics.join(', ')
    : 'none flagged';

  // ── Student context block ──────────────────────────────────────────────────
  const studentContextBlock = [
    `STUDENT CONTEXT:`,
    `Name: ${ctx.name}`,
    `Level: ${studentLevel}`,
    `Learning mode: ${input.mode}`,
    `Strength on ${subject}: ${topicStrength}`,
    `Growth areas: ${ctx.growthAreas.map((g) => g.topic).join(', ') || 'none'}`,
    `Last quiz score: ${lastQuizScore}`,
    `Weak subtopics from last attempt: ${lastWeak}`,
  ].join('\n');

  // ── Lesson context or standalone context ──────────────────────────────────
  let sourceContextBlock: string;
  if (input.lessonSections && input.lessonSections.length > 0) {
    const sectionLines = input.lessonSections.map((s) => {
      const termsText = s.terms.length > 0
        ? `TERMS INTRODUCED: ${s.terms.map((t) => `${t.term}: ${t.explanation}`).join('; ')}`
        : '';
      return [
        `  TYPE: ${s.type}`,
        s.heading ? `  HEADING: ${s.heading}` : null,
        `  KEY POINTS: ${s.body}`,
        termsText ? `  ${termsText}` : null,
      ].filter(Boolean).join('\n');
    });

    let confidenceNote = '';
    if (input.confidenceRating !== null && input.confidenceRating !== undefined) {
      if (input.confidenceRating <= 2) {
        confidenceNote =
          `\nThe student found this lesson difficult (confidence: ${input.confidenceRating}/5). Weight questions toward foundational understanding, not edge cases.`;
      } else if (input.confidenceRating >= 4) {
        confidenceNote =
          `\nThe student felt confident (confidence: ${input.confidenceRating}/5). Include harder application and edge-case questions.`;
      } else {
        confidenceNote = `\nConfidence rating: ${input.confidenceRating}/5 — use standard difficulty for the student's level.`;
      }
    } else {
      confidenceNote = '\nNo confidence rating — use standard difficulty for the student\'s level.';
    }

    sourceContextBlock = [
      `LESSON CONTEXT:`,
      `Topic: ${input.topic}`,
      `Subject: ${subject}`,
      '',
      'Lesson sections covered:',
      sectionLines.join('\n\n'),
      confidenceNote,
    ].join('\n');
  } else {
    sourceContextBlock = [
      `STANDALONE QUIZ:`,
      `Topic: ${input.topic}`,
      `Subject: ${subject}`,
      '',
      `This quiz is NOT linked to a lesson. Generate questions that cover:`,
      `- Core definitions and terminology for ${input.topic}`,
      `- Practical application of ${input.topic}`,
      `- Common misconceptions about ${input.topic}`,
      `- The relationship between ${input.topic} and adjacent concepts in ${subject}`,
      '',
      `Student's prior performance on this topic:`,
      `Strength level: ${topicStrength}`,
      `Previous quiz score: ${lastQuizScore}`,
      `Known weak subtopics: ${lastWeak}`,
    ].join('\n');
  }

  // ── Distribution table ─────────────────────────────────────────────────────
  let distributionTable: string;
  if (input.questionCount >= 15) {
    distributionTable = [
      '15 questions:',
      '  5× multiple_choice',
      '  3× true_false',
      '  3× multiple_select',
      '  2× fill_blank',
      '  2× short_answer',
    ].join('\n');
  } else if (input.questionCount >= 10) {
    distributionTable = [
      '10 questions:',
      '  4× multiple_choice',
      '  2× true_false',
      '  2× multiple_select',
      '  1× fill_blank',
      '  1× short_answer',
    ].join('\n');
  } else {
    distributionTable = [
      '5 questions:',
      '  2× multiple_choice',
      '  1× true_false',
      '  1× multiple_select',
      '  1× fill_blank OR short_answer',
    ].join('\n');
  }

  // ── Difficulty calibration ─────────────────────────────────────────────────
  const difficultyTable = [
    `RULE 3 — CALIBRATE DIFFICULTY TO THE STUDENT'S LEVEL.`,
    `${ctx.name} is a ${studentLevel} student. Their current strength on this topic is ${topicStrength}.`,
    '',
    'Use this table:',
    '  needs_work + primary/secondary:',
    '    → 60% recall questions, 30% basic application, 10% synthesis',
    '    → Simple scenarios, everyday analogies, direct definitions',
    '    → Options clearly differentiated (not tricky)',
    '',
    '  developing + any level:',
    '    → 40% recall, 40% application, 20% edge cases',
    '    → Realistic scenarios, small code snippets, numerical examples',
    '    → Options require careful reading but are not traps',
    '',
    '  strong + secondary/university:',
    '    → 20% recall, 50% application, 30% synthesis/analysis',
    '    → Complex scenarios, code that has bugs or edge cases',
    '    → Options include common professional mistakes',
    '',
    '  strong + professional:',
    '    → 10% recall, 40% application, 50% synthesis/analysis',
    '    → Real-world architecture decisions, performance trade-offs, subtle correctness issues',
    '    → Options indistinguishable to a beginner, clear to an expert',
  ].join('\n');

  const lessonRuleNote = input.lessonSections && input.lessonSections.length > 0
    ? `\nRULE 7 — IF A LESSON WAS PROVIDED, USE IT.\nAt least ${Math.max(4, Math.floor(input.questionCount * 0.8))} of ${input.questionCount} questions must test concepts, terms, or examples that appeared in the lesson above. The lesson is the source material — the quiz tests whether the student retained it.`
    : '';

  return [
    `Generate ${input.questionCount} quiz questions for ${ctx.name}, a ${studentLevel} student.`,
    '',
    studentContextBlock,
    '',
    sourceContextBlock,
    '',
    '═══════════════════════════════════════════════════════',
    'QUESTION GENERATION RULES',
    '═══════════════════════════════════════════════════════',
    '',
    'RULE 1 — EVERY QUESTION MUST TEST SPECIFIC KNOWLEDGE.',
    '',
    'A good question names specific terms, values, scenarios, or mechanisms from the topic.',
    'A bad question could apply to any topic by replacing the topic name.',
    'Every question text must contain at least 15 words and include concrete topic detail.',
    '',
    `GOOD: "Which of the following correctly [does something specific to ${input.topic}]?"`,
    `BAD:  "Which statement best describes ${input.topic}?"`,
    '',
    `If ANY question you generate could have its topic name replaced with another topic and still make sense, that question is invalid. Rewrite it.`,
    '',
    '───────────────────────────────────────────────────────',
    '',
    'RULE 2 — WRONG OPTIONS MUST BE PLAUSIBLE MISCONCEPTIONS.',
    '',
    'For multiple_choice questions, all four options must be things a student might genuinely believe if they misunderstood the topic.',
    'BAD wrong options: absurd statements, obviously grammatically wrong, repetitions of the correct answer.',
    '',
    '───────────────────────────────────────────────────────',
    '',
    difficultyTable,
    '',
    '───────────────────────────────────────────────────────',
    '',
    `RULE 4 — QUESTION TYPE DISTRIBUTION.`,
    '',
    `For ${input.questionCount} questions, use this distribution:`,
    distributionTable,
    '',
    'Do NOT put the same question type more than twice in a row. Vary the order.',
    '',
    '───────────────────────────────────────────────────────',
    '',
    'RULE 5 — QUESTION TYPE SPECIFICATIONS.',
    '',
    'multiple_choice: Exactly 4 options. correctAnswer must be the exact text of one option. All 4 options roughly similar in length.',
    'multiple_select: 4 to 5 options. correctAnswers is an array of 2 or 3 correct option texts.',
    'true_false: No options array. correctAnswer must be exactly "true" or "false" (lowercase). Target common misconceptions.',
    'fill_blank: The blank appears as _____ in the question text. correctAnswer is 1–5 words.',
    'short_answer: No options array. correctAnswer is a model answer (1–2 sentences). Question asks for explanation, not recall.',
    '',
    '───────────────────────────────────────────────────────',
    '',
    'RULE 6 — EVERY QUESTION NEEDS AN EXPLANATION.',
    '',
    'The explanation must:',
    '  - Be one sentence (at least 10 words)',
    '  - Explain WHY the correct answer is correct — not just state that it is',
    '  - Name the specific concept, rule, or mechanism being tested',
    '',
    '───────────────────────────────────────────────────────',
    lessonRuleNote,
    '═══════════════════════════════════════════════════════',
    'RETURN FORMAT',
    '═══════════════════════════════════════════════════════',
    '',
    'Return ONLY valid JSON. No markdown fences. No preamble. No explanation.',
    '',
    'Each question must include a "subtopic" field: a 2–5 word label for the specific sub-concept being tested (e.g. "const vs let", "scope rules", "hoisting").',
    '',
    '{"questions":[{"type":"multiple_choice","text":"...","options":["...","...","...","..."],"correctAnswer":"...","explanation":"...","subtopic":"..."},{"type":"multiple_select","text":"...","options":["...","...","...","..."],"correctAnswers":["...","..."],"explanation":"...","subtopic":"..."},{"type":"true_false","text":"...","correctAnswer":"true","explanation":"...","subtopic":"..."},{"type":"fill_blank","text":"A variable declared with _____ cannot be reassigned.","correctAnswer":"const","explanation":"...","subtopic":"..."},{"type":"short_answer","text":"...","correctAnswer":"...","explanation":"...","subtopic":"..."}]}',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

function formatSubject(subject: StudentContextSubject): string {
  return `- ${subject.name} (${subject.strengthLevel})`;
}

function formatLesson(lesson: StudentContextLesson): string {
  const confidence = lesson.confidenceRating ?? 'not rated';
  return `- ${lesson.topic} (${lesson.subjectName}) — confidence: ${confidence}`;
}

function formatGrowth(area: StudentContextGrowthArea): string {
  return `- ${area.topic} (${area.subjectName}) — reason: ${area.flagReason}`;
}

function formatLastQuiz(quiz: StudentContextLastQuiz): string {
  const weak = quiz.weakTopics.length
    ? quiz.weakTopics.join(', ')
    : 'none recorded';
  return `${quiz.topic} (${quiz.subjectName}): ${quiz.score}/${quiz.total}. Weak areas: ${weak}`;
}

function depthDescription(depth: DepthKey): string {
  if (depth === 'quick') return 'short focused refresher';
  if (depth === 'deep') return 'thorough deep-dive with edge cases';
  return 'full lesson with hook, concept, example, recap';
}

function goalFramingLine(goal: StudentContext['onboardingGoal']): string {
  switch (goal) {
    case 'exam_prep':
      return 'This is likely to appear on an exam in one of two forms — flag those forms in the hook.';
    case 'keep_up':
      return 'Frame the topic in the context of what their class is probably covering right now and why it matters.';
    case 'learn_something_new':
      return 'Approach this from first principles — assume they have not seen the topic before.';
    case 'fill_gaps':
      return 'They may have seen this before — make sure the foundation is solid before any extension.';
    default:
      return 'No specific framing — explain clearly and connect to real-world relevance.';
  }
}

// ─── ZIMSEC-style structured quiz prompt ─────────────────────────────────────

function buildZimsecQuizUserPrompt(
  ctx: StudentContext,
  input: {
    topic: string;
    subjectName?: string;
    questionCount: number;
    mode: LearningModeKey;
    lessonSections?: Array<{
      type: string;
      heading: string | null;
      body: string;
      terms: Array<{ term: string; explanation: string }>;
    }>;
    confidenceRating?: number | null;
  },
): string {
  const subject = input.subjectName ?? 'General';
  const studentLevel = ctx.grade ?? ctx.ageGroup ?? 'student';
  const topicStrength =
    ctx.subjects.find((s) => s.name.toLowerCase() === subject.toLowerCase())
      ?.strengthLevel ?? 'developing';
  const lastQuiz = ctx.lastQuizResult;
  const lastQuizScore = lastQuiz
    ? `${lastQuiz.score}/${lastQuiz.total}`
    : 'no prior attempt';
  const lastWeak = lastQuiz?.weakTopics.length
    ? lastQuiz.weakTopics.join(', ')
    : 'none flagged';

  const studentContextBlock = [
    `STUDENT CONTEXT:`,
    `Name: ${ctx.name}`,
    `Level: ${studentLevel}`,
    `Subject: ${subject}`,
    `Strength on ${subject}: ${topicStrength}`,
    `Growth areas: ${ctx.growthAreas.map((g) => g.topic).join(', ') || 'none'}`,
    `Last quiz score: ${lastQuizScore}`,
    `Weak subtopics from last attempt: ${lastWeak}`,
  ].join('\n');

  let sourceContextBlock: string;
  if (input.lessonSections && input.lessonSections.length > 0) {
    const sectionLines = input.lessonSections.map((s) => {
      const termsText = s.terms.length > 0
        ? `TERMS INTRODUCED: ${s.terms.map((t) => `${t.term}: ${t.explanation}`).join('; ')}`
        : '';
      return [
        `  TYPE: ${s.type}`,
        s.heading ? `  HEADING: ${s.heading}` : null,
        `  KEY POINTS: ${s.body}`,
        termsText ? `  ${termsText}` : null,
      ].filter(Boolean).join('\n');
    });
    sourceContextBlock = [
      `LESSON CONTEXT:`,
      `Topic: ${input.topic}`,
      '',
      'Lesson sections covered:',
      sectionLines.join('\n\n'),
    ].join('\n');
  } else {
    sourceContextBlock = [
      `STANDALONE QUIZ:`,
      `Topic: ${input.topic}`,
      `Subject: ${subject}`,
      '',
      `Cover core concepts, definitions, mechanisms, calculations, and applications for ${input.topic} in ${subject}.`,
    ].join('\n');
  }

  // The number of structured questions to generate
  const numQuestions = Math.min(Math.max(input.questionCount, 2), 5);

  return [
    `Generate ${numQuestions} ZIMSEC-style structured exam questions for ${ctx.name}, a ${studentLevel} student.`,
    '',
    studentContextBlock,
    '',
    sourceContextBlock,
    '',
    '═══════════════════════════════════════════════════════',
    'ZIMSEC STRUCTURED QUESTION RULES',
    '═══════════════════════════════════════════════════════',
    '',
    'RULE 1 — ALL QUESTIONS ARE STRUCTURED TYPE.',
    'Every question must be type "structured". Do NOT generate multiple_choice, true_false, fill_blank, or short_answer.',
    'A structured question has a stem (the main scenario or context) and multiple numbered/lettered sub-parts.',
    '',
    'RULE 2 — ZIMSEC COMMAND WORD TAXONOMY.',
    'Assign each sub-part exactly one command word. Choose from:',
    '  recall tier:      State, Define, Identify, Name, List, Give, Write',
    '  application tier: Describe, Explain, Calculate, Determine, Solve, Apply, Show that',
    '  analysis tier:    Discuss, Compare, Evaluate, Justify, Analyse, Hence, Suggest',
    '',
    '"Show that" questions: give the student the final answer and ask them to derive/prove it.',
    '"Hence" questions: follow directly from a previous part — require the student to use the result of the prior part.',
    '',
    'RULE 3 — SUB-PART PROGRESSION.',
    'Sub-parts must progress from lower to higher cognitive demand:',
    '  (a) → recall (State/Define/Identify) — 1–2 marks',
    '  (b) → application (Explain/Calculate/Describe) — 2–4 marks',
    '  (c) → analysis (Discuss/Evaluate/Hence/Justify) — 3–6 marks',
    'Never start with analysis. Never put a recall question after an analysis question.',
    '',
    'RULE 4 — MARK ALLOCATION.',
    'Total marks per structured question: 8–15 marks.',
    'Each sub-part mark value must match the command word:',
    '  State/Define/Identify/Name: 1–2 marks',
    '  Explain/Describe/Calculate/Determine: 2–4 marks',
    '  Discuss/Evaluate/Justify/Analyse: 3–6 marks',
    '  Show that/Hence: 2–4 marks',
    'totalMarks must equal the sum of all sub-part marks exactly.',
    '',
    'RULE 5 — MARKING POINTS.',
    'Every sub-part must include markingPoints: an array of acceptable credit-earning statements.',
    'Rules for marking points:',
    '  - One mark = one marking point (1 mark → 1 point, 3 marks → 3 points)',
    '  - State the EXACT fact, value, or statement that earns the mark',
    '  - Use examiner-style phrasing: "Identifies X as...", "States that X = ...", "Explains that..."',
    '  - For calculations: include the method step AND the final value as separate points',
    '',
    'RULE 6 — MODEL ANSWER.',
    'Each sub-part must include a modelAnswer: a complete student-facing answer at the target level.',
    'The model answer must be a natural prose/calculation response — not bullet points.',
    '',
    'RULE 7 — DIFFICULTY CALIBRATION.',
    `${ctx.name} is a ${studentLevel} student. Strength: ${topicStrength}.`,
    'needs_work: Simple stems. Recall-heavy (50%). Familiar contexts. Small numbers in calculations.',
    'developing: Moderate complexity. Balanced recall/application. Real-world contexts.',
    'strong: Complex stems. Analysis-heavy (40%+). Multi-step calculations. Counter-intuitive scenarios.',
    '',
    '═══════════════════════════════════════════════════════',
    'RETURN FORMAT',
    '═══════════════════════════════════════════════════════',
    '',
    'Return ONLY valid JSON. No markdown fences. No preamble. No explanation.',
    '',
    'Each structured question must follow this exact shape:',
    '{',
    '  "type": "structured",',
    '  "subtopic": "2-5 word label for the specific concept being tested",',
    '  "text": "The stem — sets the scenario, context, or given information. May be multiple sentences.",',
    '  "totalMarks": <sum of all part marks>,',
    '  "parts": [',
    '    {',
    '      "label": "(a)",',
    '      "command": "State",',
    '      "text": "The sub-question text (do not repeat the stem).",',
    '      "marks": 2,',
    '      "tier": "recall",',
    '      "answerType": "short",',
    '      "markingPoints": ["States that X is...", "Identifies Y as..."],',
    '      "modelAnswer": "Full model answer text.",',
    '      "explanation": "Why this is the correct answer — 1 sentence."',
    '    }',
    '  ]',
    '}',
    '',
    'answerType must be one of: "short" (1-3 sentences), "written" (paragraph/extended), "numeric" (number or calculation)',
    'label format: "(a)", "(b)", "(c)", or nested "(b)(i)", "(b)(ii)" for sub-sub-parts.',
    '',
    `Full response shape: {"questions":[<${numQuestions} structured question objects>]}`,
    '',
    'QUALITY CHECK — before returning, verify each question:',
    '- Does totalMarks equal the sum of all part marks?',
    '- Does each part have the correct number of marking points for its mark allocation?',
    '- Do sub-parts progress from recall → application → analysis?',
    '- Does the model answer match the command word (e.g. "Calculate" → shows working)?',
    '- Is every marking point a specific, testable, examiner-style statement?',
    '',
    'Return JSON only. No markdown fences. No prose before or after the JSON.',
  ].join('\n');
}
