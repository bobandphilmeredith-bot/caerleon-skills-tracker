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
      strand("Developing mathematical proficiency", ["Conceptual understanding", "Logical reasoning", "Fluency", "Strategic competence", "Communicating with symbols"]),
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
