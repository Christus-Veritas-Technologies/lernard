import type { ProjectLevel } from '@lernard/shared-types';

export interface ProjectLayoutSection {
  key: string;
  title: string;
}

export interface ProjectLayoutDefinition {
  id: string;
  name: string;
  level: ProjectLevel;
  sections: ProjectLayoutSection[];
}

const PROJECT_LAYOUTS: ProjectLayoutDefinition[] = [
  {
    id: 'level-grade7',
    name: 'Grade 7 Project',
    level: 'grade7',
    sections: [
      { key: 'introduction', title: 'Introduction' },
      { key: 'aim_objectives', title: 'Aim and Objectives' },
      { key: 'materials_method', title: 'Materials and Method' },
      { key: 'findings_results', title: 'Findings and Results' },
      { key: 'conclusion', title: 'Conclusion' },
    ],
  },
  {
    id: 'level-olevel',
    name: 'O Level Project',
    level: 'olevel',
    sections: [
      { key: 'introduction_background', title: 'Introduction and Background' },
      { key: 'hypothesis_research_question', title: 'Hypothesis / Research Question' },
      { key: 'apparatus_method', title: 'Apparatus and Method' },
      { key: 'results_data', title: 'Results and Data' },
      { key: 'analysis_discussion', title: 'Analysis and Discussion' },
      { key: 'conclusion_evaluation', title: 'Conclusion and Evaluation' },
    ],
  },
  {
    id: 'level-alevel',
    name: 'A Level Project',
    level: 'alevel',
    sections: [
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

export function getProjectLayout(level: ProjectLevel): ProjectLayoutDefinition {
  const layout = PROJECT_LAYOUTS.find((l) => l.level === level);
  if (!layout) {
    throw new Error(`No project layout found for level: ${level}`);
  }
  return layout;
}
