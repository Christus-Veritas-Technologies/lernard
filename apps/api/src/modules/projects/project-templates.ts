import type {
  ProjectTemplateDefinition,
  ProjectLevel,
} from '@lernard/shared-types';

const PROJECT_TEMPLATES: ProjectTemplateDefinition[] = [
  {
    id: 'zimsec-agriculture-investigation',
    name: 'Agriculture Investigation Project',
    subject: 'Agriculture',
    level: 'grade7',
    description:
      'A structured investigation report with context, method, findings, and reflection.',
    totalMarks: 30,
    steps: [
      {
        key: 'introduction',
        title: 'Introduction and Context',
        guidance:
          'Explain the community context, what was observed, and why the topic matters.',
        required: true,
      },
      {
        key: 'aim',
        title: 'Aim and Objectives',
        guidance:
          'State one clear aim and specific measurable objectives linked to the topic.',
        required: true,
      },
      {
        key: 'method',
        title: 'Method and Materials',
        guidance:
          'Describe tools, resources, participants, and procedural steps in order.',
        required: true,
      },
      {
        key: 'findings',
        title: 'Findings and Analysis',
        guidance:
          'Present outcomes and interpret what they show using evidence from the activity.',
        required: true,
      },
      {
        key: 'conclusion',
        title: 'Conclusion and Recommendations',
        guidance:
          'Summarize key learning and provide practical recommendations.',
        required: true,
      },
    ],
  },
  {
    id: 'zimsec-olevel-science-project',
    name: 'Science Practical Investigation',
    subject: 'Integrated Science',
    level: 'olevel',
    description:
      'A full practical write-up aligned to hypothesis, apparatus, procedure, and analysis.',
    totalMarks: 50,
    steps: [
      {
        key: 'background',
        title: 'Background and Problem',
        guidance: 'Define the problem and provide short scientific background context.',
        required: true,
      },
      {
        key: 'hypothesis',
        title: 'Hypothesis',
        guidance:
          'State a testable hypothesis with clear independent and dependent variables.',
        required: true,
      },
      {
        key: 'apparatus',
        title: 'Apparatus and Materials',
        guidance: 'List all materials and apparatus required for the investigation.',
        required: true,
      },
      {
        key: 'procedure',
        title: 'Procedure',
        guidance:
          'Provide numbered steps that allow another student to replicate the investigation.',
        required: true,
      },
      {
        key: 'results',
        title: 'Results and Data Handling',
        guidance:
          'Present observations and data trends, including summary interpretation.',
        required: true,
      },
      {
        key: 'evaluation',
        title: 'Evaluation and Improvement',
        guidance:
          'Explain reliability, limitations, and actionable improvements for accuracy.',
        required: true,
      },
    ],
  },
  {
    id: 'zimsec-alevel-research-project',
    name: 'Advanced Research Project',
    subject: 'Research Methods',
    level: 'alevel',
    description:
      'Extended project framework for advanced independent investigation and reporting.',
    totalMarks: 100,
    steps: [
      {
        key: 'rationale',
        title: 'Rationale and Scope',
        guidance: 'Justify the study and define scope, assumptions, and boundaries.',
        required: true,
      },
      {
        key: 'literature',
        title: 'Literature and Conceptual Frame',
        guidance:
          'Summarize prior knowledge and establish a conceptual frame for the project.',
        required: true,
      },
      {
        key: 'methodology',
        title: 'Methodology',
        guidance:
          'Describe design, sampling, instruments, data collection, and ethics.',
        required: true,
      },
      {
        key: 'analysis',
        title: 'Analysis and Discussion',
        guidance:
          'Analyze findings, compare against expectations, and discuss significance.',
        required: true,
      },
      {
        key: 'conclusion',
        title: 'Conclusion and Recommendations',
        guidance:
          'Conclude from evidence and propose justified recommendations and follow-up work.',
        required: true,
      },
    ],
  },
];

export function listProjectTemplates(level?: ProjectLevel): ProjectTemplateDefinition[] {
  if (!level) {
    return PROJECT_TEMPLATES;
  }
  return PROJECT_TEMPLATES.filter((template) => template.level === level);
}

export function findProjectTemplateById(
  templateId: string,
): ProjectTemplateDefinition | null {
  return PROJECT_TEMPLATES.find((template) => template.id === templateId) ?? null;
}
