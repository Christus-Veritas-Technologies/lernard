import type { ProjectLevel, ProjectTemplateDefinition } from '@lernard/shared-types';

const PROJECT_TEMPLATES: ProjectTemplateDefinition[] = [
  {
    id: 'tpl-grade7-community-investigation',
    name: 'Grade 7 Community Investigation',
    description:
      'Simple investigative write-up for Grade 7 learners focused on local community observations.',
    level: 'grade7',
    labels: ['investigation', 'community', 'foundation'],
    steps: [
      { key: 'introduction', title: 'Introduction' },
      { key: 'aim_objectives', title: 'Aim and Objectives' },
      { key: 'materials_method', title: 'Materials and Method' },
      { key: 'findings_results', title: 'Findings and Results' },
      { key: 'conclusion', title: 'Conclusion' },
    ],
  },
  {
    id: 'tpl-olevel-practical-study',
    name: 'O Level Practical Study',
    description:
      'Structured O Level project format with hypothesis, method, results, and discussion.',
    level: 'olevel',
    labels: ['practical', 'zimsec', 'analysis'],
    steps: [
      { key: 'introduction_background', title: 'Introduction and Background' },
      { key: 'hypothesis_research_question', title: 'Hypothesis / Research Question' },
      { key: 'apparatus_method', title: 'Apparatus and Method' },
      { key: 'results_data', title: 'Results and Data' },
      { key: 'analysis_discussion', title: 'Analysis and Discussion' },
      { key: 'conclusion_evaluation', title: 'Conclusion and Evaluation' },
    ],
  },
  {
    id: 'tpl-alevel-research-report',
    name: 'A Level Research Report',
    description:
      'Formal A Level academic report layout with literature review and references.',
    level: 'alevel',
    labels: ['research', 'formal', 'advanced'],
    steps: [
      { key: 'abstract', title: 'Abstract' },
      { key: 'introduction_literature_review', title: 'Introduction and Literature Review' },
      { key: 'methodology', title: 'Methodology' },
      { key: 'results_data_analysis', title: 'Results and Data Analysis' },
      { key: 'discussion', title: 'Discussion' },
      { key: 'conclusion_recommendations', title: 'Conclusion and Recommendations' },
      { key: 'references', title: 'References' },
    ],
  },
];

export function listProjectTemplates(level?: ProjectLevel): ProjectTemplateDefinition[] {
  if (!level) {
    return PROJECT_TEMPLATES;
  }

  return PROJECT_TEMPLATES.filter((template) => template.level === level);
}

export function findProjectTemplate(templateId: string): ProjectTemplateDefinition | null {
  return PROJECT_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export function buildAutoTemplateId(level: ProjectLevel): string {
  return `auto-${level}`;
}

export function buildAutoTemplateName(level: ProjectLevel): string {
  if (level === 'grade7') {
    return 'Lernard Auto (Grade 7)';
  }
  if (level === 'olevel') {
    return 'Lernard Auto (O Level)';
  }
  return 'Lernard Auto (A Level)';
}
