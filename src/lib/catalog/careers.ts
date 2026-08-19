export interface SubjectRating {
  subject: string;
  stars: 1 | 2 | 3 | 4 | 5;
}

export interface Career {
  slug: string;
  name: string;
  icon: string;
  tagline: string;
  whyItMatches: string;
  subjects: SubjectRating[];
  skills: string[];
  projects: string[];
  tryNow: string[];
  educationRoutes: string[];
  progression: string[];
  // Matching tags — keys from src/lib/catalog/onboarding-options.ts.
  interestTags: string[];
  exploreTags: string[];
  strengthTags: string[];
  subjectTags: string[];
}

export const CAREERS: Career[] = [
  {
    slug: "software-engineer",
    name: "Software Engineer",
    icon: "💻",
    tagline: "Build the apps and systems people use every day.",
    whyItMatches: "You're drawn to technology and problem solving, and you like building things that actually work.",
    subjects: [
      { subject: "Mathematics", stars: 5 },
      { subject: "Computer Science", stars: 5 },
    ],
    skills: ["Python", "Problem solving", "Web development", "Git & version control"],
    projects: ["Build a personal website", "Build a simple to-do app", "Create an AI chatbot"],
    tryNow: ["Try a free intro-to-Python tutorial", "Rebuild a simple website you like", "Join a beginner coding community"],
    educationRoutes: ["Computer Science degree", "Coding bootcamp", "Self-taught + portfolio", "Apprenticeship"],
    progression: ["Junior developer", "Mid-level engineer", "Senior engineer", "Tech lead / Staff engineer"],
    interestTags: ["technology", "ai", "gaming"],
    exploreTags: ["build_software", "technology_ai", "freelance"],
    strengthTags: ["coding", "problem_solving", "mathematics", "building_things"],
    subjectTags: ["computer_science", "mathematics"],
  },
  {
    slug: "entrepreneur",
    name: "Entrepreneur",
    icon: "🚀",
    tagline: "Spot real problems and build something that solves them.",
    whyItMatches: "You're interested in business and money, and you like the idea of building something of your own.",
    subjects: [
      { subject: "Business", stars: 5 },
      { subject: "Economics", stars: 4 },
      { subject: "Mathematics", stars: 3 },
    ],
    skills: ["Selling", "Communication", "Leadership", "Basic finance"],
    projects: ["Run a small online shop", "Sell a service to 3 real customers", "Write a one-page business plan"],
    tryNow: ["Find 3 problems people around you actually complain about", "Interview a local small business owner", "Read one book on starting a business"],
    educationRoutes: ["Business/Economics degree (optional)", "Start while still in school, learn by doing", "Business incubator or young-entrepreneur programme"],
    progression: ["First small side project", "First paying customer", "Sustainable small business", "Scaling a real company"],
    interestTags: ["business", "finance", "technology"],
    exploreTags: ["start_business", "freelance"],
    strengthTags: ["selling", "leadership", "communication", "organisation"],
    subjectTags: ["business", "economics"],
  },
  {
    slug: "ai-engineer",
    name: "AI Engineer",
    icon: "🤖",
    tagline: "Design and train the models behind modern AI products.",
    whyItMatches: "You're curious about AI and enjoy math and computer science — the two subjects that matter most here.",
    subjects: [
      { subject: "Mathematics", stars: 5 },
      { subject: "Computer Science", stars: 5 },
      { subject: "Science", stars: 3 },
    ],
    skills: ["Python", "Statistics", "Machine learning basics", "Problem solving"],
    projects: ["Train a simple image classifier", "Build a chatbot with an AI API", "Analyse a public dataset"],
    tryNow: ["Play with a free AI playground tool", "Watch an intro-to-machine-learning video", "Learn basic Python if you haven't yet"],
    educationRoutes: ["Computer Science / Maths degree", "Online ML specialisations", "Research internship"],
    progression: ["ML/AI intern", "Junior AI engineer", "AI engineer", "AI research lead"],
    interestTags: ["ai", "technology", "science"],
    exploreTags: ["technology_ai", "build_software"],
    strengthTags: ["coding", "mathematics", "problem_solving"],
    subjectTags: ["computer_science", "mathematics", "science"],
  },
  {
    slug: "data-scientist",
    name: "Data Scientist",
    icon: "📊",
    tagline: "Turn messy data into decisions people actually act on.",
    whyItMatches: "You like maths and problem solving, and you're interested in how data drives technology and business.",
    subjects: [
      { subject: "Mathematics", stars: 5 },
      { subject: "Computer Science", stars: 4 },
      { subject: "Economics", stars: 2 },
    ],
    skills: ["Statistics", "Python or R", "Data visualisation", "Problem solving"],
    projects: ["Analyse a dataset and present 3 findings", "Build a simple dashboard", "Predict something from public data"],
    tryNow: ["Explore a free public dataset", "Try a beginner spreadsheet data-analysis exercise", "Learn basic statistics"],
    educationRoutes: ["Maths, Statistics, or CS degree", "Online data science courses", "Internship with a real dataset"],
    progression: ["Data analyst", "Junior data scientist", "Data scientist", "Lead data scientist"],
    interestTags: ["technology", "ai", "science", "finance"],
    exploreTags: ["technology_ai", "build_software"],
    strengthTags: ["mathematics", "problem_solving", "coding"],
    subjectTags: ["mathematics", "computer_science", "economics"],
  },
  {
    slug: "digital-creator",
    name: "Digital Creator",
    icon: "🎬",
    tagline: "Build an audience and tell stories people want to watch.",
    whyItMatches: "You enjoy content creation and social media, and you like expressing ideas creatively.",
    subjects: [
      { subject: "English", stars: 3 },
      { subject: "Art", stars: 3 },
      { subject: "Design", stars: 3 },
    ],
    skills: ["Video editing", "Storytelling", "Consistency", "Basic design"],
    projects: ["Post 5 short videos on one topic", "Design a simple brand for your channel", "Edit a 60-second highlight reel"],
    tryNow: ["Film one short video this week", "Learn a free video-editing tool", "Study 3 creators you admire and note what works"],
    educationRoutes: ["No formal requirement — built through practice", "Media/Design courses (optional)", "Marketing or Communications degree (optional)"],
    progression: ["First posts", "Small consistent audience", "Monetised channel", "Full creative brand/business"],
    interestTags: ["content_creation", "social_media", "entertainment", "design"],
    exploreTags: ["become_creator", "creative_career", "freelance"],
    strengthTags: ["creativity", "video_editing", "communication", "writing"],
    subjectTags: ["english", "art", "design"],
  },
  {
    slug: "doctor",
    name: "Doctor",
    icon: "🩺",
    tagline: "Diagnose, treat, and care for people through science.",
    whyItMatches: "You're interested in medicine and science, and you like working with and helping people.",
    subjects: [
      { subject: "Science", stars: 5 },
      { subject: "Mathematics", stars: 3 },
    ],
    skills: ["Scientific reasoning", "Communication", "Resilience", "Attention to detail"],
    projects: ["Volunteer or shadow in a healthcare setting (age-appropriate)", "Research one area of medicine in depth", "Present a health-science topic to your class"],
    tryNow: ["Read about a medical breakthrough", "Ask your school about work-experience options", "Strengthen your Biology and Chemistry foundations"],
    educationRoutes: ["Biology/Chemistry through school", "Medical degree (long, competitive path)", "Work experience in healthcare"],
    progression: ["Pre-med study", "Medical school", "Junior doctor", "Specialist consultant"],
    interestTags: ["medicine", "science"],
    exploreTags: ["medicine", "become_professional"],
    strengthTags: ["working_with_people", "problem_solving", "communication"],
    subjectTags: ["science", "mathematics"],
  },
  {
    slug: "lawyer",
    name: "Lawyer",
    icon: "⚖️",
    tagline: "Argue, negotiate, and use the law to solve real disputes.",
    whyItMatches: "You're interested in law, and you're strong at communication and structured argument.",
    subjects: [
      { subject: "English", stars: 5 },
      { subject: "History", stars: 3 },
      { subject: "Economics", stars: 2 },
    ],
    skills: ["Communication", "Writing", "Critical thinking", "Research"],
    projects: ["Join a debate or mock-trial club", "Write a persuasive essay on a real issue", "Research how a real case was decided"],
    tryNow: ["Watch or read about a real court case", "Join your school debate club", "Practice writing a persuasive argument"],
    educationRoutes: ["Law degree", "Legal apprenticeship (where available)", "Work experience at a law firm"],
    progression: ["Law student", "Trainee solicitor / pupil barrister", "Qualified lawyer", "Partner / senior counsel"],
    interestTags: ["law"],
    exploreTags: ["law", "become_professional"],
    strengthTags: ["communication", "writing", "problem_solving", "leadership"],
    subjectTags: ["english", "history"],
  },
  {
    slug: "product-designer",
    name: "Product Designer",
    icon: "🎨",
    tagline: "Design the look and feel of the products people use.",
    whyItMatches: "You're interested in design and creativity, and you like making things that look and feel good to use.",
    subjects: [
      { subject: "Art", stars: 4 },
      { subject: "Design", stars: 5 },
      { subject: "Computer Science", stars: 2 },
    ],
    skills: ["Visual design", "Creativity", "Problem solving", "Feedback & iteration"],
    projects: ["Redesign an app screen you use daily", "Design a logo and mini brand kit", "Create a simple prototype in a free design tool"],
    tryNow: ["Try a free design tool for an hour", "Study the design of 3 apps you use", "Sketch 5 icon ideas for a made-up app"],
    educationRoutes: ["Design/UX degree", "Self-taught + strong portfolio", "Design bootcamp"],
    progression: ["Design student / junior designer", "Product designer", "Senior designer", "Design lead"],
    interestTags: ["design", "technology", "fashion"],
    exploreTags: ["creative_career", "become_creator", "build_software"],
    strengthTags: ["creativity", "problem_solving"],
    subjectTags: ["art", "design"],
  },
  {
    slug: "mechanical-engineer",
    name: "Mechanical Engineer",
    icon: "⚙️",
    tagline: "Design and build the machines and systems that power the world.",
    whyItMatches: "You're interested in engineering, and you like understanding how things work and building them.",
    subjects: [
      { subject: "Mathematics", stars: 5 },
      { subject: "Science", stars: 5 },
    ],
    skills: ["Problem solving", "Maths & physics", "CAD basics", "Hands-on building"],
    projects: ["Build a small mechanical model", "Take something apart and rebuild it", "Enter a school engineering/robotics challenge"],
    tryNow: ["Watch how a real machine works and sketch the parts", "Try a free beginner CAD tool", "Build something with your hands this week"],
    educationRoutes: ["Engineering degree", "Engineering apprenticeship", "Technical college pathway"],
    progression: ["Engineering student", "Graduate engineer", "Design/project engineer", "Senior/chief engineer"],
    interestTags: ["engineering", "technology"],
    exploreTags: ["engineering", "build_software"],
    strengthTags: ["problem_solving", "building_things", "mathematics"],
    subjectTags: ["mathematics", "science"],
  },
  {
    slug: "finance-analyst",
    name: "Finance Analyst",
    icon: "💰",
    tagline: "Understand money, markets, and how businesses make decisions.",
    whyItMatches: "You're interested in money and business, and you're comfortable with numbers.",
    subjects: [
      { subject: "Mathematics", stars: 5 },
      { subject: "Economics", stars: 5 },
      { subject: "Business", stars: 3 },
    ],
    skills: ["Numeracy", "Analysis", "Attention to detail", "Communication"],
    projects: ["Track and analyse a mock investment portfolio", "Build a simple budget spreadsheet", "Research how a real company makes money"],
    tryNow: ["Read one beginner-friendly finance article a week", "Learn how compound interest works", "Try a free budgeting spreadsheet template"],
    educationRoutes: ["Finance/Economics degree", "Professional finance qualifications", "Internship at a bank or firm"],
    progression: ["Finance intern", "Junior analyst", "Analyst", "Senior analyst / portfolio manager"],
    interestTags: ["finance", "business"],
    exploreTags: ["finance", "become_professional"],
    strengthTags: ["mathematics", "problem_solving", "organisation"],
    subjectTags: ["mathematics", "economics", "business"],
  },
  {
    slug: "sports-professional",
    name: "Sports Professional",
    icon: "🏅",
    tagline: "Turn discipline and performance into a career in sport.",
    whyItMatches: "You're interested in sport, and you already put in the discipline it takes to compete and improve.",
    subjects: [
      { subject: "PE", stars: 5 },
      { subject: "Science", stars: 3 },
    ],
    skills: ["Discipline", "Physical fitness", "Resilience", "Teamwork"],
    projects: ["Build a structured 4-week training plan", "Track your performance stats over a season", "Join a competitive league or trial"],
    tryNow: ["Set one measurable fitness goal for this month", "Ask a coach for honest feedback", "Study the training routine of a pro in your sport"],
    educationRoutes: ["Sports academy / talent pathway", "Sports Science degree (backup route)", "Coaching qualifications"],
    progression: ["Youth/academy level", "Competitive amateur", "Professional contract", "Elite / national level"],
    interestTags: ["sports"],
    exploreTags: ["sports_career"],
    strengthTags: ["leadership", "organisation"],
    subjectTags: ["pe"],
  },
];

export function getCareer(slug: string): Career | undefined {
  return CAREERS.find((c) => c.slug === slug);
}
