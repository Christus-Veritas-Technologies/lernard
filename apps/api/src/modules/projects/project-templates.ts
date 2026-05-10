import type {
  ProjectTemplateDefinition,
  ProjectLevel,
} from '@lernard/shared-types';

const PROJECT_TEMPLATES: ProjectTemplateDefinition[] = [
  {
    id: 'zimsec-agriculture-investigation',
    name: 'Agriculture Field Investigation',
    subject: 'Agriculture',
    level: 'grade7',
    description:
      'A practical field investigation template for local farming challenges, from observation to recommendations.',
    totalMarks: 30,
    steps: [
      {
        key: 'community_context',
        title: 'Community Context',
        guidance:
          'Describe the farming setting, who is affected, and why this issue matters to the community.',
        required: true,
      },
      {
        key: 'aim_objectives',
        title: 'Aim and Objectives',
        guidance:
          'Write one clear project aim and 2-3 simple objectives that can be checked at the end.',
        required: true,
      },
      {
        key: 'method_materials',
        title: 'Method and Materials',
        guidance:
          'List materials and explain step-by-step how observations or measurements were collected.',
        required: true,
      },
      {
        key: 'findings_patterns',
        title: 'Findings and Patterns',
        guidance:
          'Present what you found using clear evidence and explain the patterns in simple language.',
        required: true,
      },
      {
        key: 'conclusion_actions',
        title: 'Conclusion and Recommendations',
        guidance:
          'Summarize the key lesson and suggest practical actions learners or families can take.',
        required: true,
      },
    ],
  },
  {
    id: 'grade7-water-use-audit',
    name: 'Community Water Use Audit',
    subject: 'Integrated Science',
    level: 'grade7',
    description:
      'A beginner-friendly audit template to investigate daily water use, wastage points, and conservation actions.',
    totalMarks: 35,
    steps: [
      {
        key: 'problem_focus',
        title: 'Problem Focus',
        guidance:
          'State the water-use problem clearly and explain where it appears at home or school.',
        required: true,
      },
      {
        key: 'data_collection_plan',
        title: 'Data Collection Plan',
        guidance:
          'Explain who was observed, what was measured, and when measurements were taken.',
        required: true,
      },
      {
        key: 'data_table',
        title: 'Data Table',
        guidance:
          'Record daily measurements neatly in a table and label units correctly.',
        required: true,
      },
      {
        key: 'analysis',
        title: 'Simple Analysis',
        guidance:
          'Identify biggest water-use areas and compare expected vs observed use.',
        required: true,
      },
      {
        key: 'improvement_actions',
        title: 'Improvement Actions',
        guidance:
          'Suggest realistic conservation actions and explain why each action can work.',
        required: true,
      },
    ],
  },
  {
    id: 'grade7-food-preservation-study',
    name: 'Food Preservation Comparison Study',
    subject: 'Home Economics',
    level: 'grade7',
    description:
      'A structured comparison project for testing basic food preservation methods and reporting results clearly.',
    totalMarks: 30,
    steps: [
      {
        key: 'topic_reason',
        title: 'Topic and Reason',
        guidance:
          'Introduce the food item and explain why preserving it is useful in your context.',
        required: true,
      },
      {
        key: 'methods_compared',
        title: 'Methods Compared',
        guidance:
          'Name the preservation methods chosen and why they were selected.',
        required: true,
      },
      {
        key: 'procedure',
        title: 'Procedure',
        guidance:
          'Describe each preparation and storage step in order so another learner can repeat it.',
        required: true,
      },
      {
        key: 'observations',
        title: 'Observations',
        guidance:
          'Report visible changes over time such as smell, colour, texture, and shelf life.',
        required: true,
      },
      {
        key: 'best_method',
        title: 'Best Method and Conclusion',
        guidance:
          'Choose the most effective method and justify your answer with evidence.',
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
      'A full practical write-up aligned to hypothesis testing, controlled methods, and evidence-based conclusions.',
    totalMarks: 50,
    steps: [
      {
        key: 'background_problem',
        title: 'Background and Problem',
        guidance:
          'Define the scientific problem and provide concise theory relevant to the investigation.',
        required: true,
      },
      {
        key: 'hypothesis_variables',
        title: 'Hypothesis and Variables',
        guidance:
          'State a testable hypothesis and identify independent, dependent, and controlled variables.',
        required: true,
      },
      {
        key: 'apparatus_materials',
        title: 'Apparatus and Materials',
        guidance:
          'List all apparatus and materials with sufficient detail for reproducibility.',
        required: true,
      },
      {
        key: 'procedure_controls',
        title: 'Procedure and Controls',
        guidance:
          'Provide a numbered method, including control measures for fair testing.',
        required: true,
      },
      {
        key: 'results_processing',
        title: 'Results and Processing',
        guidance:
          'Present data tables/graphs and process findings accurately.',
        required: true,
      },
      {
        key: 'evaluation',
        title: 'Evaluation and Improvement',
        guidance:
          'Evaluate reliability and suggest specific improvements to increase validity.',
        required: true,
      },
    ],
  },
  {
    id: 'olevel-geography-fieldwork',
    name: 'Geography Fieldwork Enquiry',
    subject: 'Geography',
    level: 'olevel',
    description:
      'A fieldwork project template for collecting, presenting, and interpreting geographic data from a local site.',
    totalMarks: 60,
    steps: [
      {
        key: 'enquiry_question',
        title: 'Enquiry Question',
        guidance:
          'Frame one focused geographic question linked to a real local environment.',
        required: true,
      },
      {
        key: 'site_description',
        title: 'Site Description',
        guidance:
          'Describe location, key physical/human features, and map references.',
        required: true,
      },
      {
        key: 'sampling_method',
        title: 'Sampling and Methods',
        guidance:
          'Explain sampling strategy and field techniques for reliable data collection.',
        required: true,
      },
      {
        key: 'data_presentation',
        title: 'Data Presentation',
        guidance:
          'Present data using suitable tables, charts, or sketch maps.',
        required: true,
      },
      {
        key: 'interpretation',
        title: 'Interpretation',
        guidance:
          'Interpret trends, anomalies, and spatial patterns using evidence.',
        required: true,
      },
      {
        key: 'limitations',
        title: 'Limitations and Improvements',
        guidance:
          'Discuss limitations and propose realistic improvements for better fieldwork quality.',
        required: true,
      },
    ],
  },
  {
    id: 'olevel-business-enterprise-study',
    name: 'Small Enterprise Case Study',
    subject: 'Business Studies',
    level: 'olevel',
    description:
      'A practical business case-study framework for analyzing operations, customers, finance basics, and growth options.',
    totalMarks: 55,
    steps: [
      {
        key: 'business_profile',
        title: 'Business Profile',
        guidance:
          'Introduce the enterprise, products/services, ownership type, and market served.',
        required: true,
      },
      {
        key: 'operations_review',
        title: 'Operations Review',
        guidance:
          'Describe day-to-day processes, resources used, and workflow efficiency.',
        required: true,
      },
      {
        key: 'customer_analysis',
        title: 'Customer and Competitor Analysis',
        guidance:
          'Identify target customers and compare with key competitors.',
        required: true,
      },
      {
        key: 'financial_snapshot',
        title: 'Financial Snapshot',
        guidance:
          'Summarize income, costs, and profit pressures using available evidence.',
        required: true,
      },
      {
        key: 'swot',
        title: 'SWOT Summary',
        guidance:
          'Present strengths, weaknesses, opportunities, and threats clearly.',
        required: true,
      },
      {
        key: 'strategic_recommendations',
        title: 'Strategic Recommendations',
        guidance:
          'Recommend realistic actions to improve performance and sustainability.',
        required: true,
      },
    ],
  },
  {
    id: 'olevel-history-source-enquiry',
    name: 'History Source-Based Enquiry',
    subject: 'History',
    level: 'olevel',
    description:
      'A source-analysis template for evaluating historical evidence and constructing balanced arguments.',
    totalMarks: 50,
    steps: [
      {
        key: 'historical_question',
        title: 'Historical Question',
        guidance:
          'Set a focused historical question that can be investigated using sources.',
        required: true,
      },
      {
        key: 'source_selection',
        title: 'Source Selection',
        guidance:
          'Identify primary and secondary sources and explain why they were chosen.',
        required: true,
      },
      {
        key: 'source_analysis',
        title: 'Source Analysis',
        guidance:
          'Analyze origin, purpose, value, and limitations of each key source.',
        required: true,
      },
      {
        key: 'comparison',
        title: 'Comparison and Corroboration',
        guidance:
          'Compare source claims and show where evidence agrees or conflicts.',
        required: true,
      },
      {
        key: 'argument',
        title: 'Historical Argument',
        guidance:
          'Construct a balanced argument supported by accurate source references.',
        required: true,
      },
      {
        key: 'judgement',
        title: 'Final Judgement',
        guidance:
          'Reach a justified conclusion and identify remaining uncertainties.',
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
      'An extended independent research framework with strong methodology, critical analysis, and academic reporting.',
    totalMarks: 100,
    steps: [
      {
        key: 'rationale_scope',
        title: 'Rationale and Scope',
        guidance:
          'Justify the study and define boundaries, assumptions, and intended contribution.',
        required: true,
      },
      {
        key: 'literature_review',
        title: 'Literature Review',
        guidance:
          'Synthesize key scholarship and identify the specific research gap addressed.',
        required: true,
      },
      {
        key: 'methodology_design',
        title: 'Methodology Design',
        guidance:
          'Detail design choices, sampling, instruments, ethics, and validity strategies.',
        required: true,
      },
      {
        key: 'analysis_discussion',
        title: 'Analysis and Discussion',
        guidance:
          'Interpret findings critically and connect them to existing theory and context.',
        required: true,
      },
      {
        key: 'conclusion_recommendations',
        title: 'Conclusion and Recommendations',
        guidance:
          'Draw evidence-led conclusions and propose realistic recommendations and further research.',
        required: true,
      },
    ],
  },
  {
    id: 'alevel-economics-policy-brief',
    name: 'Economics Policy Brief',
    subject: 'Economics',
    level: 'alevel',
    description:
      'A policy-focused economics project structure for diagnosing a problem and defending data-driven interventions.',
    totalMarks: 90,
    steps: [
      {
        key: 'policy_problem',
        title: 'Policy Problem Definition',
        guidance:
          'Define the economic issue, affected groups, and current policy context.',
        required: true,
      },
      {
        key: 'evidence_base',
        title: 'Evidence Base',
        guidance:
          'Present relevant data trends, indicators, and credible sources.',
        required: true,
      },
      {
        key: 'option_analysis',
        title: 'Policy Option Analysis',
        guidance:
          'Compare at least two policy options with likely costs, benefits, and trade-offs.',
        required: true,
      },
      {
        key: 'recommended_option',
        title: 'Recommended Option',
        guidance:
          'Select the strongest option and justify the decision with economic reasoning.',
        required: true,
      },
      {
        key: 'implementation_plan',
        title: 'Implementation Plan',
        guidance:
          'Outline rollout stages, stakeholders, and practical delivery considerations.',
        required: true,
      },
      {
        key: 'risk_monitoring',
        title: 'Risk and Monitoring',
        guidance:
          'Identify key risks and define indicators for monitoring policy impact.',
        required: true,
      },
    ],
  },
  {
    id: 'alevel-literature-critical-study',
    name: 'Literature Critical Study',
    subject: 'Literature in English',
    level: 'alevel',
    description:
      'A rigorous critical-study template for analyzing texts, perspectives, and scholarly interpretations.',
    totalMarks: 85,
    steps: [
      {
        key: 'research_focus',
        title: 'Research Focus',
        guidance:
          'Define the text(s), critical theme, and central interpretive question.',
        required: true,
      },
      {
        key: 'critical_context',
        title: 'Critical Context',
        guidance:
          'Summarize relevant historical, cultural, and theoretical context.',
        required: true,
      },
      {
        key: 'close_reading',
        title: 'Close Reading Analysis',
        guidance:
          'Analyze language, form, and structure with precise textual evidence.',
        required: true,
      },
      {
        key: 'scholarly_dialogue',
        title: 'Scholarly Dialogue',
        guidance:
          'Engage with critics by comparing interpretations and evaluating claims.',
        required: true,
      },
      {
        key: 'argument_development',
        title: 'Argument Development',
        guidance:
          'Build a coherent line of argument that responds directly to the research focus.',
        required: true,
      },
      {
        key: 'critical_conclusion',
        title: 'Critical Conclusion',
        guidance:
          'Conclude with a nuanced judgement and implications for further study.',
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
