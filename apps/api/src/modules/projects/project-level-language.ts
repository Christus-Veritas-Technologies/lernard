import type { ProjectLevel } from '@lernard/shared-types';

export interface ProjectLevelLanguageProfile {
  audienceLabel: string;
  vocabularyGuidance: string;
  sentenceGuidance: string;
  explanationDepth: string;
  examplesGuidance: string;
}

export function getProjectLevelLanguageProfile(
  level: ProjectLevel,
): ProjectLevelLanguageProfile {
  if (level === 'grade7') {
    return {
      audienceLabel: 'Grade 7 learner',
      vocabularyGuidance:
        'use everyday words and explain any unavoidable subject term immediately',
      sentenceGuidance:
        'keep sentences short and direct, mostly one idea per sentence',
      explanationDepth:
        'focus on concrete steps, observable outcomes, and practical meaning',
      examplesGuidance:
        'use familiar school or home/community examples',
    };
  }

  if (level === 'olevel') {
    return {
      audienceLabel: 'O Level learner',
      vocabularyGuidance:
        'use subject-appropriate terminology and define technical terms when first used',
      sentenceGuidance:
        'use clear medium-length sentences with explicit logical connectors',
      explanationDepth:
        'show method, cause-effect links, and concise justification from evidence',
      examplesGuidance:
        'use realistic exam-style and local contextual examples',
    };
  }

  return {
    audienceLabel: 'A Level learner',
    vocabularyGuidance:
      'use precise academic terminology with disciplined, context-aware definitions',
    sentenceGuidance:
      'use structured analytical sentences with explicit argument flow',
    explanationDepth:
      'provide critical reasoning, trade-offs, limitations, and implications',
    examplesGuidance:
      'use advanced domain examples and reference methodological rigor',
  };
}
