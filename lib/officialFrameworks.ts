import type { ElementDefinition, FrameworkDefinition, ProgressionStep } from "@/lib/types";

const progressionSteps: ProgressionStep[] = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"];

export const officialFrameworkLibrary: FrameworkDefinition[] = [
  {
    name: "Literacy Framework",
    shortName: "Literacy",
    strands: [
      strand("Translanguaging", ["Translanguaging"]),
      strand("Listening", ["Listening for meaning", "Developing vocabulary", "Listening to understand", "Listening as part of collaborative talk"]),
      strand("Reading", ["Phonological and phonemic awareness", "Reading strategies", "Understanding, response and analysis"]),
      strand("Speaking", ["Clarity and vocabulary", "Purpose", "Collaborative talk", "Questioning"]),
      strand("Writing", ["Vocabulary, spelling, grammar", "Connectives and syntax", "Punctuation", "Planning and organising for different purposes, audiences and context", "Proofreading, editing and improving"])
    ]
  },
  {
    name: "Numeracy Framework",
    shortName: "Numeracy",
    strands: [
      strand("Developing mathematical proficiency", ["Conceptual understanding", "Communication using symbols", "Fluency", "Logical reasoning", "Strategic competence"]),
      strand("Understanding the number system helps us to represent and compare relationships between numbers and quantities", ["The number system", "Relationships within the number system", "Calculation", "Financial literacy"]),
      strand("Learning about geometry helps us understand shape, space and position, and learning about measurement helps us quantify in the real world", ["Measurement", "Shape and space", "Position", "Angle"]),
      strand("Learning that statistics represent data and that probability models chance helps us make informed inferences and decisions", ["Collecting data", "Representing data", "Interpreting data"])
    ]
  },
  {
    name: "Digital Competence Framework",
    shortName: "DCF",
    strands: [
      strand("Citizenship", ["Identity, image and reputation", "Health and well-being", "Digital rights, licensing and ownership", "Online behaviour and cyberbullying"]),
      strand("Interacting and collaborating", ["Communication", "Collaboration", "Storing and sharing"]),
      strand("Producing", ["Sourcing, searching and planning digital content", "Creating digital content", "Evaluating and improving digital content"]),
      strand("Data and computational thinking", ["Problem solving and modelling", "Data and information literacy"])
    ]
  },
  {
    name: "Cross-cutting Themes",
    shortName: "Themes",
    strands: [
      {
        name: "Relationships and sexuality education",
        elements: [
          element("Healthy relationships", "Learners explore respect, consent, communication and wellbeing in age-appropriate ways.", ["Scenario discussion", "Trusted adults map", "Respectful language task"]),
          element("Rights and equity", "Learners consider rights, fairness and inclusion in relationships and communities.", ["Rights charter", "Equity case study", "Class agreement"]),
          element("Personal identity", "Learners reflect on identity, values and belonging.", ["Identity artwork", "Reflective writing", "Community interview"])
        ]
      },
      {
        name: "Human rights",
        elements: [
          element("Voice and participation", "Learners understand how people can participate and have their voices heard.", ["School council brief", "Campaign design", "Public consultation role-play"]),
          element("Fairness", "Learners explore fair treatment and decision-making.", ["Resource allocation task", "Justice debate", "Case study review"]),
          element("Dignity", "Learners consider dignity, respect and the rights of others.", ["Charter comparison", "Ethical dilemma", "Community values discussion"])
        ]
      },
      {
        name: "Diversity",
        elements: [
          element("Identity", "Learners explore identity as complex, personal and connected to community.", ["Identity map", "Local voices project", "Personal narrative"]),
          element("Culture and community", "Learners investigate cultures, languages and communities in Wales and beyond.", ["Community research", "Cultural celebration analysis", "Place-name enquiry"]),
          element("Challenging stereotypes", "Learners identify stereotypes and consider how to challenge them.", ["Media analysis", "Representation audit", "Alternative narrative task"])
        ]
      },
      {
        name: "Careers and work-related experiences",
        elements: [
          element("Pathways", "Learners understand possible learning and career pathways.", ["Pathway map", "Alumni profile", "Options comparison"]),
          element("Workplace skills", "Learners identify transferable skills used in different roles.", ["Skills audit", "Employer brief", "Team role reflection"]),
          element("Future planning", "Learners connect current learning to future choices and aspirations.", ["Personal action plan", "Careers interview", "Goal review"])
        ]
      }
    ]
  }
];

function strand(name: string, elementNames: string[]) {
  return {
    name,
    elements: elementNames.map((elementName) => element(elementName, explanationFor(elementName), examplesFor(elementName)))
  };
}

function element(name: string, explanation: string, examples: string[]): ElementDefinition {
  return {
    name,
    officialWording: explanation,
    explanation,
    examples,
    progressionDescriptors: Object.fromEntries(progressionSteps.map((step) => [step, `${step}: curriculum opportunities linked to ${name}.`])) as Record<ProgressionStep, string>,
    searchKeywords: name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
    relatedConnections: []
  };
}

function explanationFor(name: string) {
  return `Learners develop ${name.toLowerCase()} through planned curriculum opportunities.`;
}

function examplesFor(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("data")) return ["Collecting information", "Representing findings", "Discussing patterns"];
  if (lower.includes("digital") || lower.includes("online")) return ["Digital scenario review", "Shared document task", "Online safety discussion"];
  if (lower.includes("writing") || lower.includes("punctuation") || lower.includes("grammar")) return ["Drafting task", "Peer review", "Editing checklist"];
  if (lower.includes("reading") || lower.includes("listening") || lower.includes("speaking")) return ["Source discussion", "Collaborative talk", "Response task"];
  return ["Classroom discussion", "Subject task", "Reflection activity"];
}
