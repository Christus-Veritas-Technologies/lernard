/**
 * Static First Look baseline questions.
 * One question per subject per difficulty level, keyed by normalised subject name.
 * For subjects without a specific entry, a generic fallback question is used.
 */

export interface StaticQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // zero-based index
  explanation: string;
}

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

type SubjectQuestions = Record<Difficulty, StaticQuestion>;

const QUESTION_BANK: Record<string, SubjectQuestions> = {
  mathematics: {
    beginner: {
      question: 'What is 7 × 8?',
      options: ['48', '54', '56', '64'],
      correctAnswer: 2,
      explanation: '7 × 8 = 56. Multiplying 7 by 8 gives 56.',
    },
    intermediate: {
      question: 'What is the value of x in: 3x + 9 = 30?',
      options: ['5', '7', '9', '13'],
      correctAnswer: 1,
      explanation: '3x = 21, so x = 7.',
    },
    advanced: {
      question: 'What is the derivative of f(x) = 4x³ − 2x?',
      options: ['12x² − 2', '4x² − 2', '12x² + 2', '4x³ − 2'],
      correctAnswer: 0,
      explanation: "Using the power rule: f'(x) = 12x² − 2.",
    },
  },
  english: {
    beginner: {
      question:
        'Which word is a noun in this sentence: "The cat sat on the mat"?',
      options: ['sat', 'on', 'the', 'cat'],
      correctAnswer: 3,
      explanation: '"Cat" is a noun — it names a thing.',
    },
    intermediate: {
      question:
        'What literary device is used in: "The wind whispered through the trees"?',
      options: ['Simile', 'Metaphor', 'Personification', 'Alliteration'],
      correctAnswer: 2,
      explanation:
        'Giving the wind a human quality (whispering) is personification.',
    },
    advanced: {
      question:
        'In which narrative perspective does the narrator know the thoughts of every character?',
      options: [
        'First person',
        'Second person',
        'Third-person limited',
        'Third-person omniscient',
      ],
      correctAnswer: 3,
      explanation:
        "Third-person omniscient narrators have access to all characters' inner thoughts.",
    },
  },
  science: {
    beginner: {
      question: 'Which gas do plants absorb during photosynthesis?',
      options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
      correctAnswer: 2,
      explanation: 'Plants absorb CO₂ and release O₂ during photosynthesis.',
    },
    intermediate: {
      question: "What is Newton's second law of motion?",
      options: ['F = mv', 'F = ma', 'a = m/F', 'F = m/a'],
      correctAnswer: 1,
      explanation: 'Force equals mass times acceleration: F = ma.',
    },
    advanced: {
      question: "In chemistry, what does Le Chatelier's Principle state?",
      options: [
        'A catalyst lowers activation energy',
        'Matter cannot be created or destroyed',
        'A system in equilibrium shifts to oppose any imposed change',
        'Electron pairs repel each other',
      ],
      correctAnswer: 2,
      explanation:
        "Le Chatelier's Principle: an equilibrium system shifts direction to counteract a disturbance.",
    },
  },
  history: {
    beginner: {
      question: 'In which year did World War II end?',
      options: ['1939', '1943', '1945', '1948'],
      correctAnswer: 2,
      explanation:
        'World War II ended in 1945 with the surrender of Germany and Japan.',
    },
    intermediate: {
      question: 'What was the primary cause of the First World War?',
      options: [
        'The assassination of Archduke Franz Ferdinand',
        'The invasion of Poland',
        'The bombing of Pearl Harbor',
        'The fall of the Berlin Wall',
      ],
      correctAnswer: 0,
      explanation:
        'The assassination of Archduke Franz Ferdinand in 1914 was the immediate trigger for WWI.',
    },
    advanced: {
      question: 'What economic policy describes the post-WWII Marshall Plan?',
      options: [
        'Protectionism through import tariffs',
        'US financial aid to rebuild Western European economies',
        'Soviet collectivisation of Eastern Europe',
        'Decolonisation of African nations',
      ],
      correctAnswer: 1,
      explanation:
        'The Marshall Plan (1948) provided US aid to help Western European economies recover after WWII.',
    },
  },
  geography: {
    beginner: {
      question: 'What is the largest continent by area?',
      options: ['Africa', 'North America', 'Asia', 'Europe'],
      correctAnswer: 2,
      explanation:
        'Asia is the largest continent, covering about 44 million km².',
    },
    intermediate: {
      question: 'What drives the movement of tectonic plates?',
      options: [
        'Ocean currents',
        'Convection currents in the mantle',
        'Solar wind',
        'Rotation of the Earth',
      ],
      correctAnswer: 1,
      explanation:
        "Heat-driven convection currents in the Earth's mantle move tectonic plates.",
    },
    advanced: {
      question: 'What is the Coriolis effect?',
      options: [
        "The deflection of wind due to Earth's rotation",
        'Rising warm air over the equator',
        'The gravitational pull of the Moon',
        'Ocean temperature variation with depth',
      ],
      correctAnswer: 0,
      explanation:
        "The Coriolis effect deflects moving air and water due to Earth's rotation.",
    },
  },
  'computer science': {
    beginner: {
      question: 'What does CPU stand for?',
      options: [
        'Central Processing Unit',
        'Computer Power Unit',
        'Core Processing Utility',
        'Central Power Unit',
      ],
      correctAnswer: 0,
      explanation:
        'CPU stands for Central Processing Unit — the brain of a computer.',
    },
    intermediate: {
      question:
        'What is the time complexity of binary search on a sorted array?',
      options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
      correctAnswer: 2,
      explanation:
        'Binary search halves the search space each step, giving O(log n) complexity.',
    },
    advanced: {
      question: 'Which data structure uses LIFO (Last-In, First-Out) ordering?',
      options: ['Queue', 'Stack', 'Heap', 'Linked List'],
      correctAnswer: 1,
      explanation:
        'A stack follows LIFO: the last item pushed is the first popped.',
    },
  },
  physics: {
    beginner: {
      question: 'What is the SI unit of force?',
      options: ['Joule', 'Watt', 'Newton', 'Pascal'],
      correctAnswer: 2,
      explanation: 'The Newton (N) is the SI unit of force.',
    },
    intermediate: {
      question:
        'An object accelerates at 5 m/s² with a mass of 10 kg. What force acts on it?',
      options: ['2 N', '15 N', '50 N', '500 N'],
      correctAnswer: 2,
      explanation: 'F = ma = 10 × 5 = 50 N.',
    },
    advanced: {
      question:
        "According to special relativity, what happens to an object's mass as it approaches the speed of light?",
      options: [
        'It decreases',
        'It stays the same',
        'It increases',
        'It becomes undefined',
      ],
      correctAnswer: 2,
      explanation:
        'Relativistic mass increases as velocity approaches c, per Lorentz factor γ.',
    },
  },
  chemistry: {
    beginner: {
      question: 'What is the chemical symbol for water?',
      options: ['O₂', 'CO₂', 'H₂O', 'NaCl'],
      correctAnswer: 2,
      explanation:
        'Water is H₂O — two hydrogen atoms bonded to one oxygen atom.',
    },
    intermediate: {
      question:
        'In the periodic table, what do elements in the same group share?',
      options: [
        'Same number of protons',
        'Same atomic mass',
        'Same number of valence electrons',
        'Same electron shells',
      ],
      correctAnswer: 2,
      explanation:
        'Elements in the same group have the same number of valence electrons, giving similar chemical properties.',
    },
    advanced: {
      question:
        'What type of reaction occurs when an acid and a base react to form water and a salt?',
      options: ['Oxidation', 'Reduction', 'Neutralisation', 'Polymerisation'],
      correctAnswer: 2,
      explanation: 'Acid + Base → Salt + Water is a neutralisation reaction.',
    },
  },
  biology: {
    beginner: {
      question: 'What is the powerhouse of the cell?',
      options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Cell membrane'],
      correctAnswer: 2,
      explanation:
        'Mitochondria produce ATP — the energy currency of the cell.',
    },
    intermediate: {
      question: 'What is the role of DNA in cells?',
      options: [
        'Provides structural support',
        'Carries genetic instructions for building proteins',
        'Transports oxygen',
        'Digests nutrients',
      ],
      correctAnswer: 1,
      explanation:
        'DNA encodes the instructions for building proteins and passing on hereditary information.',
    },
    advanced: {
      question:
        'Which process describes how mRNA is produced from a DNA template?',
      options: ['Translation', 'Replication', 'Transcription', 'Transduction'],
      correctAnswer: 2,
      explanation:
        'Transcription: DNA is used as a template to produce mRNA in the nucleus.',
    },
  },
  art: {
    beginner: {
      question: 'Which of these is a primary colour?',
      options: ['Green', 'Orange', 'Purple', 'Blue'],
      correctAnswer: 3,
      explanation:
        'The primary colours (in traditional mixing) are red, yellow, and blue.',
    },
    intermediate: {
      question: 'What art movement was Salvador Dalí associated with?',
      options: ['Impressionism', 'Cubism', 'Surrealism', 'Baroque'],
      correctAnswer: 2,
      explanation:
        'Dalí was a leading figure of Surrealism, known for dreamlike imagery.',
    },
    advanced: {
      question: 'What technique involves painting on freshly laid wet plaster?',
      options: ['Tempera', 'Fresco', 'Encaustic', 'Gouache'],
      correctAnswer: 1,
      explanation:
        'Fresco (from Italian "fresh") involves applying pigments to wet plaster so they bond as it dries.',
    },
  },
  music: {
    beginner: {
      question: 'How many beats are in a bar of 4/4 time?',
      options: ['2', '3', '4', '6'],
      correctAnswer: 2,
      explanation: '4/4 time means four quarter-note beats per bar.',
    },
    intermediate: {
      question: 'What is the interval between C and G called?',
      options: ['A third', 'A fourth', 'A fifth', 'An octave'],
      correctAnswer: 2,
      explanation: 'C to G spans five scale degrees — a perfect fifth.',
    },
    advanced: {
      question:
        'In sonata form, what is the section that develops and explores melodic themes called?',
      options: ['Exposition', 'Development', 'Recapitulation', 'Coda'],
      correctAnswer: 1,
      explanation:
        'The development section transforms and explores the themes introduced in the exposition.',
    },
  },
};

/** Returns a single static question for a given subject name and difficulty level. */
export function getStaticFirstLookQuestion(
  subjectName: string,
  difficulty: Difficulty,
): StaticQuestion {
  const key = subjectName.toLowerCase().trim();
  const bank = QUESTION_BANK[key] ?? QUESTION_BANK['science'];
  return bank[difficulty];
}
