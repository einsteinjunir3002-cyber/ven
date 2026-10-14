import { QuizGenResponse } from '../prompts/quiz_gen';
import { formatMathObject } from '@/lib/math-format';

interface GeneratorOptions {
  subject: string;
  topic: string;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  types: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank' | 'mixed';
  level?: string;
  contextNotes?: string;
}

// Curated pedagogical knowledge base across major domains
interface TopicTemplate {
  concept: string;
  mcq: {
    prompt: string;
    options: string[];
    correct: number;
    explanation: string;
    tip: string;
  };
  tf: {
    prompt: string;
    correct: boolean;
    explanation: string;
    tip: string;
  };
  sa: {
    prompt: string;
    rubricPoints: Array<{ point: string; weight: number }>;
    sampleAnswer: string;
    explanation: string;
    tip: string;
  };
  blank: {
    prompt: string;
    accepted: string[];
    explanation: string;
    tip: string;
  };
}

const SUBJECT_TEMPLATES: Record<string, TopicTemplate[]> = {
  mathematics: [
    {
      concept: 'Calculus & Derivatives',
      mcq: {
        prompt: 'What is the derivative of f(x) = 3x² + 5x - 7 with respect to x?',
        options: ['6x + 5', '3x + 5', '6x² + 5', '6x - 7'],
        correct: 0,
        explanation: 'Using the power rule d/dx[xⁿ] = n·xⁿ⁻¹: d/dx[3x²] = 6x, d/dx[5x] = 5, and the derivative of a constant (-7) is 0. Thus, f′(x) = 6x + 5.',
        tip: 'Power Rule: Bring the exponent down in front, then subtract 1 from the power.',
      },
      tf: {
        prompt: 'True or False: If a function is continuous at a point x = c, it is guaranteed to be differentiable at that point.',
        correct: false,
        explanation: 'Differentiability implies continuity, but continuity does NOT guarantee differentiability. A classic counterexample is f(x) = |x| at x = 0, which is continuous but has a sharp corner (no unique tangent slope).',
        tip: 'Continuity means no gaps; Differentiability means no gaps AND no sharp corners.',
      },
      sa: {
        prompt: 'Explain the geometric meaning of the definite integral of a function f(x) from x = a to x = b.',
        rubricPoints: [
          { point: 'Represents the net signed area between f(x) and the x-axis', weight: 1 },
          { point: 'Areas above x-axis are positive; areas below x-axis are negative', weight: 1 },
        ],
        sampleAnswer: 'The definite integral represents the net signed area bounded by the curve y = f(x), the x-axis, and the vertical lines x = a and x = b, where area above the axis is positive and below is negative.',
        explanation: 'Geometrically, integration sums infinitely many infinitesimal rectangular strips f(x)dx, yielding the accumulated area.',
        tip: 'Integral = Accumulated Area under the curve.',
      },
      blank: {
        prompt: 'The point where the second derivative f\'\'(x) equals zero and changes sign is known as a point of _______.',
        accepted: ['inflection', 'inflection point'],
        explanation: 'A point of inflection is where the graph changes concavity from concave upward to downward, or vice versa.',
        tip: 'Inflection = Change in curve curvature/concavity.',
      },
    },
    {
      concept: 'Linear Algebra & Matrices',
      mcq: {
        prompt: 'If the determinant of a square matrix A is equal to zero, what does this indicate about matrix A?',
        options: ['Matrix A is singular and has no inverse', 'Matrix A is an identity matrix', 'Matrix A has linearly independent columns', 'Matrix A has rank equal to its dimension'],
        correct: 0,
        explanation: 'When det(A) = 0, the matrix is non-invertible (singular). Its columns/rows are linearly dependent, and its transformation collapses space into a lower dimension.',
        tip: 'Zero Determinant = Singular Matrix = No Inverse.',
      },
      tf: {
        prompt: 'True or False: Matrix multiplication is commutative, meaning A * B = B * A for all square matrices.',
        correct: false,
        explanation: 'Matrix multiplication is generally non-commutative (AB != BA in general). The order of linear transformations matters.',
        tip: 'Order matters in matrix transforms: AB does not usually equal BA.',
      },
      sa: {
        prompt: 'Define what an eigenvector and eigenvalue of a square matrix A are.',
        rubricPoints: [
          { point: 'An eigenvector is a non-zero vector whose direction does not change under transformation A', weight: 1 },
          { point: 'The eigenvalue is the scalar factor by which the eigenvector is stretched or compressed (A*v = lambda*v)', weight: 1 },
        ],
        sampleAnswer: 'An eigenvector v is a non-zero vector that satisfies A*v = lambda*v, meaning the matrix transformation only scales the vector by scalar lambda (the eigenvalue) without altering its line of direction.',
        explanation: 'Eigenvectors represent the invariant directional axes of a linear transformation, scaled by eigenvalues.',
        tip: 'Eigenvector = Unchanged Direction; Eigenvalue = Scaling Multiplier.',
      },
      blank: {
        prompt: 'A square matrix with ones on the main diagonal and zeros everywhere else is called the _______ matrix.',
        accepted: ['identity', 'identity matrix'],
        explanation: 'The identity matrix (I) acts as the multiplicative identity: A * I = I * A = A.',
        tip: 'Identity matrix = Matrix equivalent of number 1.',
      },
    },
  ],
  physics: [
    {
      concept: 'Newtonian Mechanics',
      mcq: {
        prompt: 'According to Newton\'s Second Law, if the net force acting on an object is doubled while its mass remains constant, its acceleration will:',
        options: ['Double', 'Halve', 'Quadruple', 'Remain unchanged'],
        correct: 0,
        explanation: 'From F = m * a, solving for acceleration gives a = F / m. Because acceleration is directly proportional to net force, doubling the force directly doubles the acceleration.',
        tip: 'F = m*a: Force and acceleration are directly proportional.',
      },
      tf: {
        prompt: 'True or False: An object moving at a constant speed in a circular path experiences zero net acceleration.',
        correct: false,
        explanation: 'Even if speed is constant, the direction of the velocity vector is constantly changing. A change in velocity requires centripetal acceleration directed toward the center of the circle.',
        tip: 'Velocity is a vector: changing direction requires acceleration even at constant speed.',
      },
      sa: {
        prompt: 'State the Law of Conservation of Momentum and under what condition it applies.',
        rubricPoints: [
          { point: 'Total momentum of a system remains constant before and after collisions/events', weight: 1 },
          { point: 'Condition: No external net forces act on the system (closed/isolated system)', weight: 1 },
        ],
        sampleAnswer: 'The Law of Conservation of Momentum states that the total momentum of a system remains constant, provided that no external unbalanced forces act upon it (an isolated system).',
        explanation: 'In collisions, internal action-reaction force pairs cancel out (Newton\'s 3rd Law), so the system\'s total momentum before equals total momentum after.',
        tip: 'Closed system + no external net force = Momentum is conserved.',
      },
      blank: {
        prompt: 'The rate of doing work or the rate at which energy is transferred over time is called _______.',
        accepted: ['power'],
        explanation: 'Power = Work / Time (measured in Watts, where 1 Watt = 1 Joule per second).',
        tip: 'Power = Speed of energy transfer (Joules/sec).',
      },
    },
    {
      concept: 'Electromagnetism',
      mcq: {
        prompt: 'Which law states that an induced electromotive force (EMF) is proportional to the time rate of change of magnetic flux?',
        options: ['Faraday\'s Law of Induction', 'Coulomb\'s Law', 'Ohm\'s Law', 'Ampere\'s Law'],
        correct: 0,
        explanation: 'Faraday\'s Law states EMF = -d(Phi_B)/dt, meaning changing magnetic flux through a loop induces an electric voltage and current.',
        tip: 'Faraday = Changing magnetic field generates voltage.',
      },
      tf: {
        prompt: 'True or False: Magnetic monopoles (isolated North or South poles) have been confirmed to exist in classical electromagnetism.',
        correct: false,
        explanation: 'Gauss\'s Law for Magnetism (div B = 0) states that magnetic field lines form continuous closed loops. No isolated magnetic monopoles exist in classical physics.',
        tip: 'Magnets always have paired North and South poles.',
      },
      sa: {
        prompt: 'Explain Lenz\'s Law and how it reflects the conservation of energy.',
        rubricPoints: [
          { point: 'The induced current creates a magnetic field that opposes the change in magnetic flux that produced it', weight: 1 },
          { point: 'Energy conservation: work must be done against the opposing force to generate electrical energy', weight: 1 },
        ],
        sampleAnswer: 'Lenz\'s Law states that an induced current always flows in such a direction that its magnetic field opposes the original change in magnetic flux. This ensures conservation of energy, as work must be expended to induce electrical current.',
        explanation: 'If induced flux aided the change instead of opposing it, a runaway feedback loop would create free energy, violating conservation laws.',
        tip: 'Lenz\'s Law = Opposition: The minus sign in Faraday\'s equation.',
      },
      blank: {
        prompt: 'The SI unit of electrical capacitance is the _______.',
        accepted: ['farad', 'farads'],
        explanation: 'Capacitance is measured in Farads (F), named after Michael Faraday, defined as one coulomb per volt.',
        tip: 'Capacitor capacity = Farad (F).',
      },
    },
  ],
  chemistry: [
    {
      concept: 'Chemical Bonding & Structure',
      mcq: {
        prompt: 'Which type of bond is formed by the electrostatic attraction between oppositely charged ions?',
        options: ['Ionic bond', 'Covalent bond', 'Metallic bond', 'Hydrogen bond'],
        correct: 0,
        explanation: 'Ionic bonding occurs when electrons are transferred from a metal to a nonmetal, forming cations and anions held together by strong electrostatic forces.',
        tip: 'Ionic = Electron transfer and charged ion attraction.',
      },
      tf: {
        prompt: 'True or False: Water (H2O) has a linear molecular geometry because oxygen forms two single bonds with hydrogen.',
        correct: false,
        explanation: 'Although oxygen forms two bonds, it also possesses two lone pairs of electrons. According to VSEPR theory, four electron domains arrange tetrahedrally, giving water a bent geometry (~104.5 degrees).',
        tip: 'Lone pairs repel bonds: Water has a bent shape, not linear.',
      },
      sa: {
        prompt: 'Explain what electronegativity is and how it determines whether a covalent bond is polar or nonpolar.',
        rubricPoints: [
          { point: 'Definition: An atom\'s relative ability to attract bonding shared electrons toward itself', weight: 1 },
          { point: 'Unequal sharing (electronegativity difference) creates a dipole/polar bond; equal sharing is nonpolar', weight: 1 },
        ],
        sampleAnswer: 'Electronegativity is the measure of an atom\'s ability to attract shared electrons in a bond. When two bonded atoms have a significant electronegativity difference, electrons are pulled closer to the more electronegative atom, creating partial charges and a polar bond.',
        explanation: 'Bonds with delta-EN < 0.4 are nonpolar covalent; 0.4 to 1.7 are polar covalent; > 1.7 are generally ionic.',
        tip: 'Electronegativity = Tug-of-war for shared electrons.',
      },
      blank: {
        prompt: 'According to Le Chatelier\'s Principle, increasing the concentration of reactants shifts equilibrium toward the _______.',
        accepted: ['products', 'right'],
        explanation: 'The system responds to stress by consuming the added reactants, thus driving the forward reaction toward the products.',
        tip: 'Add reactants -> System pushes right toward products.',
      },
    },
  ],
  biology: [
    {
      concept: 'Cell Biology & Energetics',
      mcq: {
        prompt: 'Which cellular organelle is responsible for generating the majority of chemical ATP through oxidative phosphorylation?',
        options: ['Mitochondrion', 'Golgi Apparatus', 'Lysosome', 'Smooth Endoplasmic Reticulum'],
        correct: 0,
        explanation: 'The mitochondrion contains the electron transport chain across its inner cristae membrane, using proton gradients (chemiosmosis) to synthesize ATP.',
        tip: 'Mighty Mitochondria = Primary ATP energy powerhouse.',
      },
      tf: {
        prompt: 'True or False: Plant cell walls are composed primarily of the carbohydrate cellulose.',
        correct: true,
        explanation: 'Plant cell walls consist of cellulose microfibrils embedded in a pectin and hemicellulose matrix, providing structural turgor support.',
        tip: 'Cellulose = Tough fiber wall in plants.',
      },
      sa: {
        prompt: 'Describe the main function of stomata in plant leaves and how guard cells regulate them.',
        rubricPoints: [
          { point: 'Regulates gas exchange: CO2 intake for photosynthesis and O2 release', weight: 1 },
          { point: 'Controls transpiration (water loss) by turgor swelling and shrinking of guard cells', weight: 1 },
        ],
        sampleAnswer: 'Stomata are microscopic leaf pores that regulate gas exchange (absorbing carbon dioxide and releasing oxygen) and control water transpiration. Guard cells open stomata when turgid and close them when flaccid.',
        explanation: 'Guard cells use potassium ion pumping to modulate osmotic water uptake, balancing photosynthesis against dehydration.',
        tip: 'Stomata = Leaf lungs and water gates.',
      },
      blank: {
        prompt: 'The biological catalyst proteins that accelerate metabolic reactions without being consumed are called _______.',
        accepted: ['enzymes', 'enzyme'],
        explanation: 'Enzymes lower the activation energy required for biochemical reactions to proceed rapidly at body temperature.',
        tip: 'Enzymes = Biological reaction accelerators.',
      },
    },
  ],
  computer_science: [
    {
      concept: 'Algorithms & Data Structures',
      mcq: {
        prompt: 'What is the average time complexity of searching for an element in a balanced Binary Search Tree (BST)?',
        options: ['O(log n)', 'O(1)', 'O(n)', 'O(n log n)'],
        correct: 0,
        explanation: 'Because each comparison halves the remaining search space in a balanced BST, search operations run in logarithmic time O(log n).',
        tip: 'Halving search space at each step = O(log n).',
      },
      tf: {
        prompt: 'True or False: An array allows O(1) constant-time insertion at the very beginning without shifting subsequent elements.',
        correct: false,
        explanation: 'Inserting at index 0 of an array requires shifting all n existing elements one position to the right, which takes O(n) linear time.',
        tip: 'Array index 0 insert requires shifting all items: O(n).',
      },
      sa: {
        prompt: 'Explain the difference between a Stack and a Queue data structure.',
        rubricPoints: [
          { point: 'Stack follows LIFO (Last-In, First-Out) where elements are added and removed from the top', weight: 1 },
          { point: 'Queue follows FIFO (First-In, First-Out) where elements are enqueued at rear and dequeued from front', weight: 1 },
        ],
        sampleAnswer: 'A Stack operates on a LIFO (Last In, First Out) principle like a stack of plates, pushing and popping from the top. A Queue operates on a FIFO (First In, First Out) principle like a checkout line, inserting at the rear and removing from the front.',
        explanation: 'Stacks are used in call stacks and undo history; Queues are used in task scheduling and breadth-first search.',
        tip: 'Stack = LIFO (plate stack); Queue = FIFO (movie line).',
      },
      blank: {
        prompt: 'A sorting algorithm that maintains the relative order of equal elements is called a _______ sort.',
        accepted: ['stable', 'stable sort'],
        explanation: 'A stable sorting algorithm preserves the original sequential order of records with equal keys.',
        tip: 'Stable = Preserves ties in original order.',
      },
    },
  ],
  history: [
    {
      concept: 'Modern World History',
      mcq: {
        prompt: 'Which treaty signed in 1919 formally concluded World War I between Germany and the Allied Powers?',
        options: ['Treaty of Versailles', 'Treaty of Westphalia', 'Treaty of Paris', 'Treaty of Utrecht'],
        correct: 0,
        explanation: 'The Treaty of Versailles was signed on June 28, 1919, creating the League of Nations and imposing reparations and disarmament conditions on Germany.',
        tip: 'Versailles 1919 = Ended World War I.',
      },
      tf: {
        prompt: 'True or False: The Industrial Revolution originated in Great Britain during the 18th century before spreading globally.',
        correct: true,
        explanation: 'Great Britain possessed coal reserves, iron ore, naval trade routes, stable capital institutions, and steam innovations that initiated industrialization.',
        tip: 'Britain in the mid-1700s was the cradle of the Industrial Revolution.',
      },
      sa: {
        prompt: 'Identify two major factors that contributed to the fall of the Western Roman Empire in 476 CE.',
        rubricPoints: [
          { point: 'Internal political instability, economic inflation, and succession crises', weight: 1 },
          { point: 'External migrations and invasions by Germanic tribes (Visigoths, Vandals, Huns)', weight: 1 },
        ],
        sampleAnswer: 'Two primary factors were internal economic decline and political corruption leading to frequent civil wars, alongside external military pressure and migrations from Germanic tribes that fractured Roman frontiers.',
        explanation: 'Historians attribute the collapse to a confluence of internal structural decay and sustained external pressures.',
        tip: 'Rome fell from both internal decay and external frontier pressures.',
      },
      blank: {
        prompt: 'The period of cultural, artistic, and intellectual rebirth that bridged medieval Europe and modernity is called the _______.',
        accepted: ['renaissance'],
        explanation: 'The Renaissance (meaning "rebirth") began in 14th-century Italy, reviving classical philosophy, arts, and humanism.',
        tip: 'Renaissance = Rebirth of art and classical learning.',
      },
    },
  ],
};

export function generateDynamicQuestions(options: GeneratorOptions): QuizGenResponse {
  const normalizedSubject = options.subject.toLowerCase().trim().replace(/[\s-]+/g, '_');
  const matchedKey = Object.keys(SUBJECT_TEMPLATES).find((k) => normalizedSubject.includes(k) || k.includes(normalizedSubject)) || 'biology';
  const templates = SUBJECT_TEMPLATES[matchedKey] || SUBJECT_TEMPLATES.biology;

  const count = Math.min(Math.max(options.count || 5, 1), 20);
  const requestedTypes = options.types === 'mixed'
    ? ['mcq', 'true_false', 'short_answer', 'fill_blank']
    : [options.types];

  const questions: QuizGenResponse['questions'] = [];

  for (let i = 0; i < count; i++) {
    const tIndex = i % templates.length;
    const template = templates[tIndex];
    const qType = requestedTypes[i % requestedTypes.length] as 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
    const position = i + 1;

    if (qType === 'mcq') {
      questions.push({
        type: 'mcq',
        prompt: template.mcq.prompt.replace(/f\(x\)/g, `f(x)`),
        options: template.mcq.options,
        correct_option: template.mcq.correct,
        difficulty: options.difficulty === 'mixed' ? (i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard') : options.difficulty,
        subject: options.subject,
        topic: options.topic,
        concept: template.concept,
        explanation: template.mcq.explanation,
        remember_tip: template.mcq.tip,
      });
    } else if (qType === 'true_false') {
      questions.push({
        type: 'true_false',
        prompt: template.tf.prompt,
        correct_bool: template.tf.correct,
        difficulty: options.difficulty === 'mixed' ? 'easy' : options.difficulty,
        subject: options.subject,
        topic: options.topic,
        concept: template.concept,
        explanation: template.tf.explanation,
        remember_tip: template.tf.tip,
      });
    } else if (qType === 'short_answer') {
      questions.push({
        type: 'short_answer',
        prompt: template.sa.prompt,
        rubric: {
          key_points: template.sa.rubricPoints,
          sample_answer: template.sa.sampleAnswer,
        },
        difficulty: options.difficulty === 'mixed' ? 'medium' : options.difficulty,
        subject: options.subject,
        topic: options.topic,
        concept: template.concept,
        explanation: template.sa.explanation,
        remember_tip: template.sa.tip,
      });
    } else {
      questions.push({
        type: 'fill_blank',
        prompt: template.blank.prompt,
        accepted_answers: template.blank.accepted,
        difficulty: options.difficulty === 'mixed' ? 'medium' : options.difficulty,
        subject: options.subject,
        topic: options.topic,
        concept: template.concept,
        explanation: template.blank.explanation,
        remember_tip: template.blank.tip,
      });
    }
  }

  return formatMathObject({
    title: `${options.subject}: ${options.topic}`,
    subject: options.subject,
    topic: options.topic,
    questions,
  });
}
