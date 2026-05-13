import type { AoleConfig, Card, Dashboard, ElementCoverageRow, FrameworkCoverage, FrameworkDefinition, MappingEntry, SubjectConfig, SubjectDetail, SubjectOverview } from "@/lib/types";

export const aoleOptions = ["Expressive Arts", "Health and Well-being", "Humanities", "Languages, Literacy and Communication", "Mathematics and Numeracy", "Science and Technology"];

export const aoleConfigs: AoleConfig[] = aoleOptions.map((name) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  active: true
}));

export const subjectConfigs: SubjectConfig[] = [
  subjectConfig("Maths", "Mathematics and Numeracy", 1),
  subjectConfig("English", "Languages, Literacy and Communication", 2),
  subjectConfig("French", "Languages, Literacy and Communication", 3),
  subjectConfig("German", "Languages, Literacy and Communication", 4),
  subjectConfig("Welsh", "Languages, Literacy and Communication", 5),
  subjectConfig("Geography", "Humanities", 6),
  subjectConfig("History", "Humanities", 7),
  subjectConfig("PE", "Health and Well-being", 8),
  subjectConfig("Business", "Humanities", 9),
  subjectConfig("Chemistry", "Science and Technology", 10),
  subjectConfig("Biology", "Science and Technology", 11),
  subjectConfig("Physics", "Science and Technology", 12),
  subjectConfig("Sociology", "Humanities", 13),
  subjectConfig("RSE", "Health and Well-being", 14),
  subjectConfig("Skills", undefined, 15),
  subjectConfig("DT", "Science and Technology", 16),
  subjectConfig("ICT", "Science and Technology", 17),
  subjectConfig("King's Trust", undefined, 18),
  subjectConfig("PSE", "Health and Well-being", 19),
  subjectConfig("Art", "Expressive Arts", 20),
  subjectConfig("Music", "Expressive Arts", 21)
];

export const subjects = subjectConfigs.filter((subject) => subject.active && subject.appearsInMappingDropdowns).sort((a, b) => a.displayOrder - b.displayOrder).map((subject) => subject.name);

export const faculties = aoleOptions;

export const departments = subjects;

export const yearGroups = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];

export const terms = ["Autumn", "Spring", "Summer"];

export const frameworkLibrary: FrameworkDefinition[] = [
  {
    name: "Literacy",
    shortName: "Literacy",
    strands: [
      {
        name: "Oracy",
        elements: [
          element("Listening for meaning", "Learners listen actively, identify key points and respond to spoken ideas.", ["Structured seminar", "Peer explanation", "Debate preparation"]),
          element("Collaborative discussion", "Learners build on contributions and use talk to shape shared understanding.", ["Group enquiry roles", "Think-pair-share", "Project critique circle"]),
          element("Presenting information", "Learners organise and communicate information clearly for a chosen audience.", ["Short presentation", "Podcast script", "Exhibition talk"])
        ]
      },
      {
        name: "Reading",
        elements: [
          element("Locating information", "Learners find relevant details from texts, diagrams, sources and digital materials.", ["Source investigation", "Information hunt", "Research note taking"]),
          element("Inference and deduction", "Learners use evidence to read between the lines and justify interpretations.", ["Character evidence grid", "Historical source inference", "Scientific explanation reading"]),
          element("Comparing sources", "Learners compare viewpoints, reliability and purpose across sources.", ["News comparison", "Primary and secondary source check", "Website reliability review"])
        ]
      },
      {
        name: "Writing",
        elements: [
          element("Planning writing", "Learners plan structure, content and sequence before producing written work.", ["Writing frame", "Storyboard", "Report plan"]),
          element("Technical accuracy", "Learners edit spelling, punctuation, grammar and vocabulary choices.", ["Redrafting checklist", "Peer editing", "Subject vocabulary focus"]),
          element("Audience and purpose", "Learners adapt tone, register and form to suit the intended reader.", ["Campaign leaflet", "Formal report", "Museum label"])
        ]
      }
    ]
  },
  {
    name: "Numeracy",
    shortName: "Numeracy",
    strands: [
      {
        name: "Using number skills",
        elements: [
          element("Use of calculation", "Learners choose and apply calculations in meaningful subject contexts.", ["Budget comparison", "Recipe scaling", "Science formula practice"]),
          element("Estimating and checking", "Learners estimate, check reasonableness and explain numerical decisions.", ["Approximate cost planning", "Data sense check", "Measurement prediction"]),
          element("Financial contexts", "Learners apply number skills to money, value and financial decision-making.", ["Enterprise pricing", "Household budget", "Cost-benefit comparison"])
        ]
      },
      {
        name: "Using measuring skills",
        elements: [
          element("Time and scale", "Learners use time, timelines, maps or scale to understand relationships.", ["Historical timeline", "Map scale task", "Training plan timings"]),
          element("Area and volume", "Learners calculate, compare or reason with space, area and volume.", ["Garden design", "Packaging system", "Classroom layout"]),
          element("Interpreting units", "Learners select and interpret units accurately across practical contexts.", ["Lab measurement", "Recipe conversion", "Material dimensions"])
        ]
      },
      {
        name: "Using data skills",
        elements: [
          element("Collecting data", "Learners gather data fairly and record it in usable forms.", ["Survey design", "Fieldwork tally", "Experiment results table"]),
          element("Representing data", "Learners choose appropriate charts, tables or visual displays.", ["Infographic", "Graph selection", "Dashboard sketch"]),
          element("Interpreting trends", "Learners describe patterns, anomalies and relationships in data.", ["Climate trend discussion", "Performance data story", "Population graph analysis"])
        ]
      },
      {
        name: "Developing numerical reasoning",
        elements: [
          element("Selecting strategies", "Learners choose approaches and explain why they fit the problem.", ["Multi-step problem", "Planning a route", "Comparing solution methods"]),
          element("Justifying decisions", "Learners use numbers to support conclusions and communicate reasoning.", ["Evidence-backed recommendation", "Data-led argument", "Estimate justification"]),
          element("Evaluating accuracy", "Learners consider precision, uncertainty and reliability in numerical work.", ["Rounding discussion", "Measurement error review", "Graph scale critique"])
        ]
      }
    ]
  },
  {
    name: "Digital Competence Framework",
    shortName: "DCF",
    strands: [
      {
        name: "Citizenship",
        elements: [
          element("Identity and wellbeing", "Learners understand their digital identity and how online choices affect wellbeing.", ["Online profile discussion", "Screen-time reflection", "Digital footprint check"]),
          element("Digital rights", "Learners recognise ownership, permission and responsible use of digital content.", ["Copyright check", "Image permission task", "Creative Commons review"]),
          element("Online behaviour", "Learners communicate respectfully and safely in digital spaces.", ["Comment protocol", "Shared document etiquette", "Online scenario sort"])
        ]
      },
      {
        name: "Interacting and collaborating",
        elements: [
          element("Communication", "Learners select appropriate digital communication tools and formats.", ["Email for audience", "Video update", "Class discussion board"]),
          element("Collaboration", "Learners use shared tools to co-create, review and improve work.", ["Shared slide deck", "Collaborative planning board", "Peer feedback document"]),
          element("Storing and sharing", "Learners organise, name and share digital files responsibly.", ["Folder structure", "Version naming", "Share settings check"])
        ]
      },
      {
        name: "Producing",
        elements: [
          element("Planning digital products", "Learners plan digital outputs with audience, purpose and success criteria in mind.", ["Storyboard", "Wireframe", "Production checklist"]),
          element("Creating digital content", "Learners combine media and tools to create purposeful digital outcomes.", ["Video explainer", "Interactive poster", "System portfolio"]),
          element("Evaluating outputs", "Learners review digital work against purpose and make improvements.", ["Usability review", "Audience feedback", "Iteration notes"])
        ]
      },
      {
        name: "Data and computational thinking",
        elements: [
          element("Problem solving", "Learners break problems into steps and develop logical approaches.", ["Algorithm cards", "Debugging routine", "Process map"]),
          element("Data handling", "Learners collect, structure and use data with digital tools.", ["Spreadsheet model", "Database fields", "Data cleaning task"]),
          element("Modelling", "Learners use digital models or simulations to test ideas.", ["What-if spreadsheet", "Simulation variables", "System behaviour model"])
        ]
      }
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

export const frameworkMap: Record<string, Record<string, string[]>> = Object.fromEntries(
  frameworkLibrary.map((framework) => [
    framework.name,
    Object.fromEntries(framework.strands.map((strand) => [strand.name, strand.elements.map((item) => item.name)]))
  ])
);

const coreMappings: MappingEntry[] = [
  entry("History", "Literacy", "Reading", "Locating information", "Year 8", "Autumn", "Local heritage source enquiry", "Pupils locate details in archive extracts and create evidence notes about Caerleon landmarks.", "HIS-Y8-A1", "2026-04-18"),
  entry("History", "Literacy", "Reading", "Comparing sources", "Year 8", "Autumn", "Caerleon through sources", "Pupils compare museum captions and visitor articles to identify how viewpoint changes the account.", "HIS-Y8-A2", "2026-04-22"),
  entry("French", "Literacy", "Oracy", "Collaborative discussion", "Year 9", "Spring", "Structured group discussion", "Pupils use target language prompts to build a shared response to a cultural scenario.", "FRE-Y9-S1", "2026-03-14"),
  entry("Welsh", "Literacy", "Writing", "Audience and purpose", "Year 10", "Summer", "Persuasive writing for audience", "Pupils draft a persuasive article and adapt tone for a youth audience.", "WEL-Y10-S3", "2026-05-02"),
  entry("Chemistry", "Numeracy", "Using data skills", "Collecting data", "Year 9", "Spring", "Water quality investigation", "Pupils collect water quality readings and organise results in a shared data table.", "CHE-Y9-S2", "2026-04-08"),
  entry("Biology", "Numeracy", "Using data skills", "Interpreting trends", "Year 9", "Spring", "Ecosystem results analysis", "Pupils interpret reaction graphs and use data to justify conclusions.", "BIO-Y9-S4", "2026-04-19"),
  entry("Maths", "Numeracy", "Using number skills", "Use of calculation", "Year 7", "Autumn", "Budget challenge", "Pupils calculate costs for a community event and compare different spending choices.", "MAT-Y7-A2", "2026-03-28"),
  entry("Maths", "Numeracy", "Developing numerical reasoning", "Justifying decisions", "Year 10", "Summer", "Data-led recommendations", "Pupils use summary statistics to recommend an option and explain their numerical reasoning.", "MAT-Y10-S1", "2026-05-05"),
  entry("DT", "Digital Competence Framework", "Producing", "Creating digital content", "Year 10", "Spring", "Design portfolio", "Pupils build a digital portfolio showing design choices, model photographs and user feedback.", "DT-Y10-S1", "2026-04-12"),
  entry("DT", "Digital Competence Framework", "Producing", "Evaluating outputs", "Year 10", "Spring", "Design iteration review", "Pupils review a model against audience needs and record improvements for the next iteration.", "DT-Y10-S2", "2026-04-21"),
  entry("Physics", "Digital Competence Framework", "Data and computational thinking", "Data handling", "Year 8", "Summer", "Spreadsheet model of results", "Pupils structure experiment results in a spreadsheet and use formulae to compare outcomes.", "PHY-Y8-SU2", "2026-05-01"),
  entry("Art", "Cross-cutting Themes", "Diversity", "Culture and community", "Year 7", "Autumn", "Community arts brief", "Pupils research local community stories and use them to shape a creative response.", "ART-Y7-A1", "2026-04-04"),
  entry("RSE", "Cross-cutting Themes", "Relationships and sexuality education", "Healthy relationships", "Year 8", "Spring", "Respectful communication", "Pupils discuss scenario cards and identify respectful communication choices.", "RSE-Y8-S1", "2026-03-30"),
  entry("Geography", "Cross-cutting Themes", "Human rights", "Voice and participation", "Year 9", "Summer", "Local decision-making enquiry", "Pupils examine local consultation examples and plan how young people can share views.", "GEO-Y9-SU1", "2026-05-06"),
  entry("English", "Literacy", "Reading", "Comparing sources", "Year 8", "Spring", "Persuasive viewpoints", "Pupils compare two persuasive articles and identify how writers shape viewpoint.", "ENG-Y8-S2", "2026-05-08"),
  entry("Biology", "Literacy", "Reading", "Comparing sources", "Year 10", "Autumn", "Bias in science media", "Pupils compare science news reports and evaluate how evidence is selected.", "BIO-Y10-A3", "2026-05-09"),
  entry("Geography", "Numeracy", "Using data skills", "Interpreting trends", "Year 9", "Summer", "Population change enquiry", "Pupils interpret population graphs and connect trends to migration factors.", "GEO-Y9-SU3", "2026-05-10"),
  entry("English", "Cross-cutting Themes", "Diversity", "Challenging stereotypes", "Year 8", "Summer", "Representation in fiction", "Pupils analyse character descriptions and discuss how writers challenge stereotypes.", "ENG-Y8-SU1", "2026-05-10")
];

export const mappings: MappingEntry[] = expandMappings(coreMappings);

const columns = yearGroups;

export const frameworkCoverage: Record<string, FrameworkCoverage> = Object.fromEntries(frameworkLibrary.map((framework) => [framework.name, buildCoverage(framework)]));

export const wholeSchoolDashboard: Dashboard = {
  eyebrow: "Whole-school view",
  title: "Whole-school Dashboard",
  description: "A single curriculum map showing where Literacy, Numeracy, DCF and cross-cutting themes are planned across subjects and year groups.",
  cards: [
    { label: "Mapped opportunities", value: String(mappings.length), note: "Curriculum mapping entries across the school." },
    { label: "Frameworks visible", value: "4", note: "Literacy, Numeracy, DCF and cross-cutting themes." },
    { label: "Subjects included", value: String(subjects.length), note: "Subject-first curriculum list configured in admin." },
    { label: "Recent updates", value: String(mappings.filter((entryItem) => entryItem.lastMappedDate >= "2026-04-01").length), note: "Curriculum entries updated this term." }
  ],
  heatmapTitle: "Framework Coverage by Year Group",
  heatmapRows: ["Literacy", "Numeracy", "DCF", "Cross-cutting themes"],
  heatmapColumns: columns,
  heatmapValues: [
    [86, 78, 82, 69, 61],
    [74, 81, 76, 66, 58],
    [63, 72, 79, 71, 54],
    [58, 64, 69, 62, 49]
  ],
  reviewItems: [
    { title: "Year 11 visibility", status: "Mapping note", description: "Year 11 curriculum entries are represented across every framework." },
    { title: "DCF progression", status: "Mapping note", description: "Producing has more mapped entries than data and computational thinking." },
    { title: "Numeracy in Arts", status: "Mapping note", description: "There are opportunities to make measurement and data links more explicit." }
  ],
  entries: [...mappings].sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate)).slice(0, 8)
};

export const literacyDashboard = makeDashboard("Literacy", "Literacy Dashboard", "Reading, writing and oracy opportunities across subjects.", [
  [91, 84, 80, 72, 65],
  [79, 76, 82, 74, 68],
  [73, 81, 78, 70, 63]
]);

export const numeracyDashboard = makeDashboard("Numeracy", "Numeracy Dashboard", "Number, measurement, data and numerical reasoning opportunities across curriculum planning.", [
  [84, 88, 78, 70, 62],
  [72, 79, 76, 69, 57],
  [66, 74, 83, 71, 60],
  [58, 63, 67, 72, 55]
]);

export const dcfDashboard = makeDashboard("Digital Competence Framework", "DCF Dashboard", "Digital competence opportunities across digital citizenship, collaboration, producing and data thinking.", [
  [64, 70, 76, 68, 55],
  [73, 78, 82, 74, 62],
  [69, 76, 84, 80, 67],
  [51, 58, 66, 61, 49]
]);

export const themesDashboard = makeDashboard("Cross-cutting Themes", "Cross-cutting Themes Dashboard", "Visibility for RSE, human rights, diversity and careers-related learning across curriculum plans.", [
  [61, 67, 72, 64, 51],
  [70, 74, 69, 66, 58],
  [76, 82, 78, 71, 63],
  [55, 63, 68, 72, 60]
]);

export const subjectOverviews: SubjectOverview[] = subjects.map((subject, index) => {
  const subjectMappings = mappings.filter((item) => item.subject === subject);
  const config = subjectConfigs.find((item) => item.name === subject);
  const fallbackTotal = 24 + index * 3;
  return {
    subject,
    aole: config?.aole,
    active: config?.active ?? true,
    appearsInMappingDropdowns: config?.appearsInMappingDropdowns ?? true,
    faculty: config?.aole ?? "Optional AoLE not set",
    department: subject,
    total: subjectMappings.length ? subjectMappings.length * 7 + fallbackTotal : fallbackTotal,
    literacy: countFramework(subjectMappings, "Literacy", 8 + index),
    numeracy: countFramework(subjectMappings, "Numeracy", 7 + index),
    dcf: countFramework(subjectMappings, "Digital Competence Framework", 5 + index),
    themes: countFramework(subjectMappings, "Cross-cutting Themes", 4 + index),
    lastReviewedDate: `2026-0${(index % 4) + 2}-${String(12 + index).padStart(2, "0")}`
  };
});

export const subjectDetails: Record<string, SubjectDetail> = Object.fromEntries(
  subjectOverviews.map((overview, index) => {
    const subjectMappings = mappings.filter((item) => item.subject === overview.subject);
    return [
      overview.subject,
      {
        ...overview,
        byYearGroup: Object.fromEntries(yearGroups.map((year, yearIndex) => [year, subjectMappings.filter((item) => item.year === year).length * 4 + 2 + ((index + yearIndex) % 5)])),
        byFramework: {
          Literacy: overview.literacy,
          Numeracy: overview.numeracy,
          DCF: overview.dcf,
          "Cross-cutting themes": overview.themes
        },
        schemes: unique(subjectMappings.map((item) => item.schemeReference)).concat([`${overview.subject.slice(0, 3).toUpperCase()}-MAP-${index + 1}`]).slice(0, 4),
        strandsCovered: unique(subjectMappings.map((item) => item.strand)).slice(0, 6),
        elementsCovered: unique(subjectMappings.map((item) => item.element)).slice(0, 8)
      }
    ];
  })
);

export const subjectProfiles: Record<string, { cards: Card[]; rows: string[]; columns: string[]; values: number[][]; notes: string[] }> = Object.fromEntries(
  subjects.map((subject, index) => {
    const overview = subjectDetails[subject];
    return [
      subject,
      {
        cards: [
          { label: "Mapped entries", value: String(overview.total), note: "Subject-level curriculum planning entries." },
          { label: "Frameworks covered", value: String(Object.values(overview.byFramework).filter(Boolean).length), note: "Curriculum areas visible in this subject." },
          { label: "Schemes referenced", value: String(overview.schemes.length), note: "Planning references connected to mappings." },
          { label: "AoLE metadata", value: overview.aole ?? "Not set", note: "Optional reporting metadata only." }
        ],
        rows: ["Literacy", "Numeracy", "DCF", "Themes"],
        columns,
        values: [
          [78 + index, 81, 76, 70, 62],
          [61, 68 + index, 72, 66, 58],
          [54, 63, 70 + index, 69, 57],
          [48, 58, 65, 62 + index, 53]
        ],
        notes: [
          `${subject} has clear opportunities to show planned skill development without recording learner outcomes.`,
          "Subject discussion can focus on visibility, progression language and balance across year groups.",
          `Review suggested: ${overview.lastReviewedDate}. The map is intentionally separate from assessment and behaviour records.`
        ]
      }
    ];
  })
);

export const adminSetupGroups = [
  { title: "Faculties", items: faculties },
  { title: "Departments", items: departments },
  { title: "Subjects", items: subjects },
  { title: "Frameworks", items: frameworkLibrary.map((item) => item.name) },
  { title: "Strands", items: frameworkLibrary.flatMap((framework) => framework.strands.map((strand) => strand.name)) },
  { title: "Elements", items: frameworkLibrary.flatMap((framework) => framework.strands.flatMap((strand) => strand.elements.map((item) => item.name))) },
  { title: "Teacher-friendly explanations", items: frameworkLibrary.flatMap((framework) => framework.strands.flatMap((strand) => strand.elements.map((item) => item.explanation))).slice(0, 8) },
  { title: "Example classroom opportunities", items: frameworkLibrary.flatMap((framework) => framework.strands.flatMap((strand) => strand.elements.flatMap((item) => item.examples))).slice(0, 8) },
  {
    title: "Element active status",
    items: frameworkLibrary
      .flatMap((framework) => framework.strands.flatMap((strand) => strand.elements.map((item, index) => `${item.name}: ${index === 2 ? "Inactive" : "Active"}`)))
      .slice(0, 10)
  }
];

export const subjectAoleMap: Record<string, string | undefined> = Object.fromEntries(subjectConfigs.map((subject) => [subject.name, subject.aole]));

function makeDashboard(framework: string, title: string, description: string, values: number[][]): Dashboard {
  const coverage = frameworkCoverage[framework];

  return {
    eyebrow: "Framework view",
    title,
    description,
    cards: frameworkCards(coverage),
    heatmapTitle: `${coverage.framework} Coverage by Year Group`,
    heatmapRows: coverage.strands.map((item) => item.strand),
    heatmapColumns: columns,
    heatmapValues: values,
    reviewItems: [
      { title: "Distribution by strand", status: "Visibility", description: "Shows how mapped opportunities are spread across this framework." },
      { title: "Element library", status: "Visibility", description: "Teachers can browse strand and element explanations before mapping." },
      { title: "Unmapped elements", status: "Visibility", description: "Elements with no current mappings are listed for curriculum planning conversations." }
    ],
    entries: mappings.filter((entryItem) => entryItem.framework === framework).slice(0, 6),
    coverage
  };
}

function frameworkCards(coverage: FrameworkCoverage): Card[] {
  return [
    { label: "Mapped opportunities", value: String(coverage.total), note: "Entries linked to this framework." },
    { label: "Strands tracked", value: String(coverage.strands.length), note: "Configured framework strands." },
    { label: "Elements tracked", value: String(coverage.strands.reduce((sum, item) => sum + item.elements.length, 0)), note: "Elements available in the browser." },
    { label: "Unmapped elements", value: String(coverage.unmappedElements.length), note: "Elements with no current entries yet." }
  ];
}

function buildCoverage(framework: FrameworkDefinition): FrameworkCoverage {
  const frameworkEntries = mappings.filter((item) => item.framework === framework.name);
  const total = frameworkEntries.length || 1;
  const allRows: ElementCoverageRow[] = [];

  const strands = framework.strands.map((strand) => {
    const mappedEntries = frameworkEntries.filter((item) => item.strand === strand.name);
    const count = mappedEntries.length;
    const elements = strand.elements.map((elementItem, elementIndex) => {
      const elementEntries = mappedEntries.filter((item) => item.element === elementItem.name);
      const row: ElementCoverageRow = {
        strand: strand.name,
        element: elementItem.name,
        count: elementEntries.length,
        subjects: elementEntries.length ? unique(elementEntries.map((item) => item.subject)) : fallbackSubjects(elementIndex),
        yearGroups: elementEntries.length ? unique(elementEntries.map((item) => item.year)) : fallbackYears(elementIndex),
        lastMappedDate: elementEntries.sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate))[0]?.lastMappedDate ?? "No current mapping"
      };
      allRows.push(row);
      return row;
    });

    return {
      strand: strand.name,
      count,
      percentage: Math.round((count / total) * 100),
      elements
    };
  });

  return {
    framework: framework.name,
    total,
    strands,
    mostMappedElements: [...allRows].filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5),
    unmappedElements: allRows.filter((item) => item.count === 0)
  };
}

function element(name: string, explanation: string, examples: string[]) {
  return {
    name,
    officialWording: `${name}: represented in planning through purposeful classroom activity and curriculum connections.`,
    explanation,
    examples,
    searchKeywords: keywordSet(name, explanation),
    relatedConnections: relatedConnections(name)
  };
}

function entry(subject: string, framework: string, strand: string, elementName: string, year: string, term: string, unit: string, activityDescription: string, schemeReference: string, lastMappedDate: string): MappingEntry {
  const id = `${subject}-${framework}-${strand}-${elementName}-${year}-${unit}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id,
    subject,
    framework,
    strand,
    element: elementName,
    context: unit,
    year,
    term,
    unit,
    activityDescription,
    schemeReference,
    note: "Curriculum mapping entry for visibility only.",
    lastMappedDate
  };
}

function expandMappings(base: MappingEntry[]) {
  const generated: MappingEntry[] = [];
  subjects.forEach((subject, subjectIndex) => {
    yearGroups.forEach((year, yearIndex) => {
      const topic = subjectTopic(subject, yearIndex);
      const activitySet = activityOptions(subject, topic);
      const frameworkCount = subject === "Maths" ? 3 : subject === "RSE" || subject === "PSE" ? 2 : 4;
      frameworkLibrary.slice(0, frameworkCount).forEach((framework, frameworkIndex) => {
        const strand = framework.strands[(subjectIndex + yearIndex + frameworkIndex) % framework.strands.length];
        const elementItem = strand.elements[(subjectIndex + frameworkIndex + yearIndex) % strand.elements.length];
        const term = terms[(yearIndex + frameworkIndex) % terms.length];
        const activity = activitySet[(frameworkIndex + yearIndex) % activitySet.length];
        const month = String(1 + ((subjectIndex + yearIndex + frameworkIndex) % 5)).padStart(2, "0");
        const day = String(10 + ((subjectIndex * 3 + yearIndex + frameworkIndex) % 18)).padStart(2, "0");
        generated.push(
          entry(
            subject,
            framework.name,
            strand.name,
            elementItem.name,
            year,
            term,
            topic,
            activity,
            `${subjectCode(subject)}-${year.replace("Year ", "Y")}-${term.slice(0, 2).toUpperCase()}${frameworkIndex + 1}`,
            `2026-${month}-${day}`
          )
        );
      });
    });
  });

  const merged = new Map<string, MappingEntry>();
  [...base, ...generated].forEach((item) => merged.set(item.id, item));
  return [...merged.values()].sort((a, b) => b.lastMappedDate.localeCompare(a.lastMappedDate));
}

function subjectTopic(subject: string, yearIndex: number) {
  const topics: Record<string, string[]> = {
    Maths: ["Ratio and proportion", "Linear graphs", "Financial planning", "Statistics investigation", "Trigonometry in context"],
    English: ["Narrative voice", "Persuasive speeches", "Modern drama", "Media viewpoints", "Poetry comparison"],
    French: ["Town and local area", "Healthy lifestyles", "Cultural festivals", "Future plans", "Global issues"],
    German: ["Family and relationships", "School life", "Travel planning", "Media habits", "Environment choices"],
    Welsh: ["Cynefin and identity", "Welsh culture", "Opinion writing", "Community interviews", "Future Wales"],
    Geography: ["River fieldwork", "Urban change", "Population patterns", "Climate risk", "Sustainable futures"],
    History: ["Medieval Wales", "Industrial change", "Civil rights", "Conflict sources", "Caerleon heritage"],
    PE: ["Fitness planning", "Tactical games", "Leadership roles", "Health data review", "Outdoor challenge"],
    Business: ["Enterprise pitch", "Market research", "Budget planning", "Ethical business", "Customer data"],
    Chemistry: ["Particles and reactions", "Acids and alkalis", "Rates of reaction", "Materials testing", "Energy changes"],
    Biology: ["Cells and systems", "Ecosystems", "Health and disease", "Genetics debate", "Practical data review"],
    Physics: ["Forces and motion", "Energy transfer", "Electricity", "Waves and communication", "Space data"],
    Sociology: ["Family structures", "Education and society", "Media influence", "Research methods", "Social inequality"],
    RSE: ["Healthy relationships", "Consent and communication", "Rights and respect", "Digital relationships", "Identity and belonging"],
    Skills: ["Independent enquiry", "Team project", "Presentation portfolio", "Problem-solving challenge", "Reflective learning"],
    DT: ["Product analysis", "Design brief", "Materials testing", "CAD development", "Sustainable packaging"],
    ICT: ["Data dashboards", "Coding project", "Cyber safety", "Digital media product", "Spreadsheet modelling"],
    "King's Trust": ["Community project", "Employability skills", "Team challenge", "Enterprise planning", "Personal development"],
    PSE: ["Financial choices", "Mental wellbeing", "Careers planning", "Ethical decisions", "Community participation"],
    Art: ["Portrait identity", "Local landscape", "Mixed media response", "Gallery critique", "Public art brief"],
    Music: ["Rhythm ensemble", "Film music", "Welsh music study", "Composition project", "Performance reflection"]
  };
  return (topics[subject] ?? ["Curriculum enquiry"])[yearIndex];
}

function activityOptions(subject: string, topic: string) {
  return [
    `Pupils debate key ideas from ${topic} and use evidence to justify their viewpoints.`,
    `Pupils interpret graphs, tables or source materials linked to ${topic} and summarise patterns.`,
    `Pupils work collaboratively to produce a short presentation explaining ${topic} for a defined audience.`,
    `Pupils complete a practical or design task connected to ${topic} and evaluate their choices.`,
    `Pupils use digital research, note-taking and source evaluation to build a structured response about ${topic}.`,
    `Pupils connect ${topic} to ethical, sustainability or community questions and record curriculum connections.`
  ];
}

function subjectCode(subject: string) {
  return subject
    .replace("King's Trust", "KGT")
    .split(/\s+/)
    .map((part) => part.slice(0, 3).toUpperCase())
    .join("")
    .slice(0, 4);
}

function countFramework(items: MappingEntry[], framework: string, fallback: number) {
  const count = items.filter((item) => item.framework === framework).length;
  return count ? count * 6 + fallback : fallback;
}

function fallbackSubjects(index: number) {
  return [subjects[index % subjects.length], subjects[(index + 2) % subjects.length]];
}

function fallbackYears(index: number) {
  return [yearGroups[index % yearGroups.length], yearGroups[(index + 1) % yearGroups.length]];
}

function keywordSet(name: string, explanation: string) {
  const base = `${name} ${explanation}`.toLowerCase();
  const extra = [];
  if (base.includes("data") || base.includes("trend")) extra.push("interpreting data", "graphs", "evidence");
  if (base.includes("source") || base.includes("viewpoint") || base.includes("reliability")) extra.push("evaluating information", "bias", "source evaluation");
  if (base.includes("identity") || base.includes("community") || base.includes("culture")) extra.push("cynefin", "belonging", "local area");
  if (base.includes("reason")) extra.push("justify", "explain thinking", "decision making");
  return unique([name.toLowerCase(), ...extra]);
}

function relatedConnections(name: string) {
  if (name.includes("Comparing") || name.includes("Inference") || name.includes("Locating")) {
    return ["DCF Citizenship", "History source evaluation", "Numeracy data interpretation"];
  }
  if (name.includes("Interpreting") || name.includes("Data") || name.includes("Collecting")) {
    return ["Literacy Reading", "Science practical enquiry", "Geography evidence interpretation"];
  }
  if (name.includes("Diversity") || name.includes("Culture") || name.includes("Identity")) {
    return ["Cynefin", "Human rights", "Literacy personal response"];
  }
  return ["Literacy communication", "Digital collaboration", "Cross-curricular planning"];
}

function subjectConfig(name: string, aole: string | undefined, displayOrder: number): SubjectConfig {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    aole,
    active: true,
    displayOrder,
    appearsInMappingDropdowns: true
  };
}

function unique(items: string[]) {
  return Array.from(new Set(items)).filter(Boolean);
}
