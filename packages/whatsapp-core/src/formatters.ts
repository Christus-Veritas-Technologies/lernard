/**
 * Message formatting helpers for the Lernard WhatsApp client.
 *
 * WhatsApp does not render arbitrary Markdown.  These helpers convert
 * Lernard's rich content (LessonContent, quiz questions, etc.) into
 * clean WhatsApp-safe text.
 *
 * WhatsApp formatting support:
 *   *bold*   _italic_   ~strikethrough~   ```code```   > blockquote
 * NOT supported: headers (##), HTML, tables, links rendered as cards.
 */

// ─── Types (minimal — we avoid importing @lernard/shared-types so this
//     package has zero runtime dependencies on it) ──────────────────────────

interface LessonSection {
  type: string;
  heading: string | null;
  body: string;
  terms?: Array<{ term: string; explanation: string }>;
}

export interface LessonContentLike {
  topic: string;
  subjectName?: string;
  estimatedMinutes?: number;
  depth?: string;
  sections: LessonSection[];
}

export interface QuizQuestionLike {
  type: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

// ─── Markdown stripping ───────────────────────────────────────────────────

/**
 * Remove Markdown syntax that WhatsApp will render literally.
 * Preserves *bold* and _italic_ as WhatsApp supports those.
 */
export function stripMarkdown(text: string): string {
  return text
    // Remove ATX headings — keep heading text, promote to bold
    .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '──────────')
    // Remove fenced code blocks — keep content
    .replace(/```[\s\S]*?```/g, (match) => {
      const inner = match.replace(/```[^\n]*\n?/g, '').replace(/\n?```/g, '');
      return '```' + inner.trim() + '```';
    })
    // Remove inline code — keep content
    .replace(/`([^`]+)`/g, '$1')
    // Remove link markup — keep link text only
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove image markup entirely
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Lesson formatting ────────────────────────────────────────────────────

const SECTION_EMOJI: Record<string, string> = {
  hook: '🪝',
  concept: '📖',
  examples: '💡',
  recap: '✅',
};

/**
 * Split a lesson into an array of WhatsApp messages, one per section.
 * The first message is always a header card.
 * Each section body is processed to remove unsupported Markdown.
 */
export function formatLesson(content: LessonContentLike): string[] {
  const messages: string[] = [];

  // Header message
  const depthLabel = content.depth
    ? { quick: 'Quick', standard: 'Standard', deep: 'Deep dive' }[content.depth] ?? content.depth
    : '';
  const timeLabel = content.estimatedMinutes ? ` • ~${content.estimatedMinutes} min` : '';
  const subjectLabel = content.subjectName ? `\n📚 *${content.subjectName}*` : '';

  messages.push(
    `📖 *${stripMarkdown(content.topic)}*${subjectLabel}\n` +
      `${depthLabel}${timeLabel}\n` +
      `──────────`,
  );

  // One message per section
  for (const section of content.sections) {
    const emoji = SECTION_EMOJI[section.type] ?? '•';
    const heading = section.heading
      ? `${emoji} *${stripMarkdown(section.heading)}*\n\n`
      : `${emoji} *${capitalize(section.type)}*\n\n`;

    let body = stripMarkdown(section.body);

    // Inline key terms at the end of the section if present
    if (section.terms && section.terms.length > 0) {
      const termLines = section.terms
        .map((t) => `• *${t.term}* — ${t.explanation}`)
        .join('\n');
      body += `\n\n📌 *Key terms*\n${termLines}`;
    }

    messages.push(heading + body);
  }

  // Footer
  messages.push(
    `✅ *Lesson complete!*\n\nReply *QUIZ* to test yourself on this topic,\nor *MENU* for more options.`,
  );

  return messages;
}

// ─── Quiz formatting ──────────────────────────────────────────────────────

/**
 * Format a single multiple-choice question for WhatsApp.
 */
export function formatQuestion(
  question: QuizQuestionLike,
  index: number,
  total: number,
): string {
  const header = `*Question ${index + 1} of ${total}*\n\n`;
  const body = stripMarkdown(question.text) + '\n';

  if (!question.options || question.options.length === 0) {
    return header + body + '\n_(Type your answer)_';
  }

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const optionsText = question.options
    .map((opt, i) => `${letters[i] ?? i + 1}) ${stripMarkdown(opt)}`)
    .join('\n');

  return header + body + '\n' + optionsText + '\n\n_Reply with the letter of your answer_';
}

/**
 * Format quiz answer feedback (shown after each answer).
 */
export function formatAnswerFeedback(
  isCorrect: boolean,
  correctAnswer: string,
  explanation: string | undefined,
): string {
  const verdict = isCorrect ? '✅ *Correct!*' : `❌ *Incorrect.* The answer was *${correctAnswer}*.`;
  const explanationText = explanation ? `\n\n💬 ${stripMarkdown(explanation)}` : '';
  return verdict + explanationText;
}

/**
 * Format final quiz score summary.
 */
export function formatScore(
  score: number,
  total: number,
  passThreshold: number,
): string {
  const pct = Math.round((score / total) * 100);
  const passed = pct >= passThreshold * 100;
  const medal = pct === 100 ? '🏆' : pct >= 80 ? '🥇' : pct >= 60 ? '🥈' : '🥉';

  return (
    `${medal} *Quiz complete!*\n\n` +
    `You scored *${score}/${total}* (${pct}%)\n` +
    (passed
      ? `✅ *Passed!* Great work.\n`
      : `📉 *Not quite.* Keep practising.\n`) +
    `\nReply *LESSON* to learn more, or *MENU* for options.`
  );
}

// ─── Progress summary ─────────────────────────────────────────────────────

export interface ProgressSummaryInput {
  name: string;
  streak: number;
  xp: number;
  plan: string;
  lessonsThisMonth?: number;
  quizzesThisMonth?: number;
}

export function formatProgressSummary(input: ProgressSummaryInput): string {
  const planLabel = formatPlanLabel(input.plan);
  return (
    `📊 *Your Lernard snapshot*\n\n` +
    `👤 ${input.name}\n` +
    `🔥 Streak: ${input.streak} day${input.streak === 1 ? '' : 's'}\n` +
    `⭐ XP: ${input.xp.toLocaleString()}\n` +
    `💳 Plan: ${planLabel}\n` +
    (input.lessonsThisMonth !== undefined
      ? `📖 Lessons this period: ${input.lessonsThisMonth}\n`
      : '') +
    (input.quizzesThisMonth !== undefined
      ? `📝 Quizzes this period: ${input.quizzesThisMonth}\n`
      : '') +
    `\nReply *MENU* for options.`
  );
}

// ─── Private helpers ─────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    explorer: 'Explorer (Free)',
    scholar: 'Scholar',
    household: 'Household',
    student_scholar: 'Student Scholar',
    student_pro: 'Student Pro',
    guardian_family_starter: 'Family Starter',
    guardian_family_standard: 'Family Standard',
    guardian_family_premium: 'Family Premium',
  };
  return labels[plan.toLowerCase()] ?? plan;
}
