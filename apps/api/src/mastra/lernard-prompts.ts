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
    '      "body": "3–5 bullet points. Each one is a complete, testable fact from the lesson. Not \'you learned what X is\'. State what X actually is.",',
    '      "terms": []',
    '    }',
    '  ]',
    '}',
    '',
    'QUALITY CHECK — before returning, verify each section:',
    '- Does the hook name the topic and explain its real-world relevance with specific detail?',
    '- Does the concept section define terms precisely and explain the mechanism clearly?',
    '- Does the examples section show actual working, not a description of what working looks like?',
    '- Does the recap contain testable facts, not meta-commentary about the lesson?',
    'If any section fails this check, rewrite it before returning.',
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
  },
): string {
  const subject = input.subjectName ?? 'General';
  const topicStrength =
    ctx.subjects.find((s) => s.name.toLowerCase() === subject.toLowerCase())
      ?.strengthLevel ?? 'developing';
  const recentlyStruggled =
    ctx.growthAreas.map((g) => g.topic).join(', ') || 'none';
  const lastQuiz = ctx.lastQuizResult;
  const lastQuizScore = lastQuiz
    ? `${lastQuiz.score}/${lastQuiz.total}`
    : 'no prior attempt';
  const lastWeak = lastQuiz?.weakTopics.length
    ? lastQuiz.weakTopics.join(', ')
    : 'not available';

  return [
    `Generate ${input.questionCount} quiz questions on: ${input.topic}`,
    `Subject: ${subject}`,
    `Student: ${ctx.name}, ${ctx.grade ?? ctx.ageGroup ?? 'student'} level`,
    `Student's strength on this topic: ${topicStrength}`,
    `Topics the student has struggled with recently: ${recentlyStruggled}`,
    `Last quiz score on a related topic: ${lastQuizScore}`,
    `Weak subtopics from last attempt: ${lastWeak}`,
    '',
    'QUESTION DIFFICULTY:',
    '- If strength is "strong" or last score was 8+/10: include at least 2 hard questions',
    '- If strength is "developing" or last score was 5–7/10: mix of easy and medium',
    '- If strength is "needs_work" or last score was below 5/10: mostly easy-to-medium, build confidence',
    '',
    'QUESTION RULES:',
    `1. Every question must test knowledge of ${input.topic} specifically.`,
    `   A question like "which statement best describes ${input.topic}?" is not specific enough.`,
    '   Use scenarios with concrete numbers, names, and conditions.',
    '',
    '2. Question types to use across the set:',
    '   - multiple_choice: factual recall or applied calculation. Exactly 4 options. One correct.',
    `   - true_false: target common misconceptions about ${input.topic}. No options array needed.`,
    '   - multiple_select: ask which of 4–5 items belong to a category. 2–3 correct answers.',
    '   - fill_blank: complete a definition or formula. 1–5 word answer.',
    '   - short_answer: explain a concept or interpret a scenario in 1–2 sentences.',
    '',
    `3. Because questionCount is ${input.questionCount}:`,
    input.questionCount >= 5
      ? '   - Include at least 1 multiple_select question'
      : '   - (skip multi-type minimums for short quizzes)',
    input.questionCount >= 5
      ? '   - Include at least 1 fill_blank OR short_answer question'
      : '',
    '   - No more than 2 questions of the same type in a row',
    '',
    '4. For multiple_choice questions:',
    '   - All 4 options must be plausible. Wrong options should represent real misconceptions,',
    `     not obviously absurd answers like "${input.topic} cannot be explained or practised."`,
    '   - The correct answer must be one of the 4 options, worded identically.',
    '',
    '5. Every question must include a one-sentence "explanation" that says specifically',
    '   why the correct answer is right — not just that it is right.',
    '',
    `6. Calibrate language to ${ctx.name}'s level (${ctx.grade ?? ctx.ageGroup ?? 'student'}).`,
    '   For lower grades, use everyday scenarios. For university level, use professional contexts.',
    '',
    'RETURN FORMAT — JSON only, no markdown:',
    '{"questions":[{"type":"multiple_choice|multiple_select|true_false|fill_blank|short_answer","text":"...","options":["..."],"correctAnswer":"...","correctAnswers":["..."],"explanation":"..."}]}',
    '',
    'Do NOT number the question text (no "1." prefix). Do not repeat question patterns.',
  ]
    .filter((line) => line !== '')
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
