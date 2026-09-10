// Exact option lists from the FutureOS product spec's 9-question onboarding
// questionnaire. Every option carries a stable `key` (used for matching and
// storage) plus the display `label` and, where useful, an emoji.

export interface Option {
  key: string;
  label: string;
  emoji?: string;
}

export const YEAR_OPTIONS: Option[] = [
  { key: "year7", label: "Year 7" },
  { key: "year8", label: "Year 8" },
  { key: "year9", label: "Year 9" },
  { key: "year10", label: "Year 10" },
  { key: "year11", label: "Year 11" },
  { key: "year12", label: "Year 12" },
  { key: "year13", label: "Year 13" },
  { key: "other", label: "Other" },
];

export const SUBJECT_OPTIONS: Option[] = [
  { key: "mathematics", label: "Mathematics" },
  { key: "science", label: "Science" },
  { key: "computer_science", label: "Computer Science" },
  { key: "business", label: "Business" },
  { key: "economics", label: "Economics" },
  { key: "english", label: "English" },
  { key: "languages", label: "Languages" },
  { key: "history", label: "History" },
  { key: "geography", label: "Geography" },
  { key: "art", label: "Art" },
  { key: "design", label: "Design" },
  { key: "pe", label: "PE" },
  { key: "other", label: "Other" },
];

export const INTEREST_OPTIONS: Option[] = [
  { key: "technology", label: "Technology", emoji: "💻" },
  { key: "ai", label: "AI", emoji: "🤖" },
  { key: "gaming", label: "Gaming", emoji: "🎮" },
  { key: "business", label: "Business", emoji: "💼" },
  { key: "finance", label: "Money & Finance", emoji: "💰" },
  { key: "sports", label: "Sports", emoji: "🏅" },
  { key: "content_creation", label: "Content Creation", emoji: "🎬" },
  { key: "social_media", label: "Social Media", emoji: "📱" },
  { key: "science", label: "Science", emoji: "🔬" },
  { key: "design", label: "Design", emoji: "🎨" },
  { key: "fashion", label: "Fashion", emoji: "👗" },
  { key: "engineering", label: "Engineering", emoji: "⚙️" },
  { key: "medicine", label: "Medicine", emoji: "🩺" },
  { key: "law", label: "Law", emoji: "⚖️" },
  { key: "travel", label: "Travel", emoji: "✈️" },
  { key: "entertainment", label: "Entertainment", emoji: "🎭" },
  { key: "other", label: "Other", emoji: "✨" },
];

export const STRENGTH_OPTIONS: Option[] = [
  { key: "communication", label: "Communication" },
  { key: "creativity", label: "Creativity" },
  { key: "problem_solving", label: "Problem solving" },
  { key: "leadership", label: "Leadership" },
  { key: "coding", label: "Coding" },
  { key: "mathematics", label: "Mathematics" },
  { key: "writing", label: "Writing" },
  { key: "video_editing", label: "Video editing" },
  { key: "selling", label: "Selling" },
  { key: "organisation", label: "Organisation" },
  { key: "working_with_people", label: "Working with people" },
  { key: "building_things", label: "Building things" },
];

export const EXPLORE_OPTIONS: Option[] = [
  { key: "start_business", label: "Start a business" },
  { key: "become_creator", label: "Become a creator" },
  { key: "become_professional", label: "Become a professional" },
  { key: "build_software", label: "Build apps/software" },
  { key: "freelance", label: "Freelance" },
  { key: "sports_career", label: "Sports career" },
  { key: "creative_career", label: "Creative career" },
  { key: "technology_ai", label: "Technology/AI" },
  { key: "medicine", label: "Medicine" },
  { key: "law", label: "Law" },
  { key: "finance", label: "Finance" },
  { key: "engineering", label: "Engineering" },
  { key: "dont_know", label: "I don't know yet" },
];

export const FREE_TIME_OPTIONS: Option[] = [
  { key: "under_30", label: "Less than 30 minutes" },
  { key: "30_60", label: "30–60 minutes" },
  { key: "1_2h", label: "1–2 hours" },
  { key: "2_3h", label: "2–3 hours" },
  { key: "3h_plus", label: "3+ hours" },
];

export const GOAL_OPTIONS: Option[] = [
  { key: "improve_grades", label: "Improve my grades" },
  { key: "discover_career", label: "Discover my career" },
  { key: "learn_skills", label: "Learn valuable skills" },
  { key: "start_business", label: "Start a business" },
  { key: "build_something", label: "Build something" },
  { key: "become_creator", label: "Become a creator" },
  { key: "good_university", label: "Get into a good university" },
  { key: "more_productive", label: "Become more productive" },
  { key: "dont_know", label: "I don't know yet" },
];

export const PROBLEM_OPTIONS: Option[] = [
  { key: "procrastination", label: "Procrastination" },
  { key: "organisation", label: "Organisation" },
  { key: "studying", label: "Studying" },
  { key: "motivation", label: "Motivation" },
  { key: "finding_direction", label: "Finding what I want to do" },
  { key: "balancing_school_hobbies", label: "Managing school and hobbies" },
  { key: "learning_skills", label: "Learning new skills" },
  { key: "staying_consistent", label: "Staying consistent" },
];

export const BUSINESS_STAGE_OPTIONS: Option[] = [
  { key: "idea", label: "Just an idea so far" },
  { key: "validating", label: "Validating with real people" },
  { key: "building", label: "Building the product/service" },
  { key: "launched", label: "Already launched" },
];

export const BUSINESS_FOCUS_OPTIONS: Option[] = [
  { key: "product", label: "Product/service" },
  { key: "marketing", label: "Marketing" },
  { key: "sales", label: "Sales" },
  { key: "fundraising", label: "Fundraising" },
  { key: "operations", label: "Operations" },
];

export const BUSINESS_STRENGTH_OPTIONS: Option[] = [
  { key: "sales_persuasion", label: "Sales & persuasion" },
  { key: "marketing_branding", label: "Marketing & branding" },
  { key: "product_design", label: "Product/design thinking" },
  { key: "coding_building", label: "Coding & building" },
  { key: "financial_planning", label: "Financial planning" },
  { key: "leadership_hiring", label: "Leadership & hiring" },
  { key: "networking", label: "Networking" },
  { key: "content_creation", label: "Content creation" },
  { key: "operations_systems", label: "Operations & systems" },
  { key: "customer_service", label: "Customer service" },
  { key: "negotiation", label: "Negotiation" },
  { key: "public_speaking", label: "Public speaking" },
];

export const BUSINESS_GOAL_OPTIONS: Option[] = [
  { key: "first_customer", label: "Get my first paying customer" },
  { key: "grow_revenue", label: "Grow revenue" },
  { key: "product_market_fit", label: "Reach product-market fit" },
  { key: "build_team_process", label: "Build a reliable team/process" },
  { key: "raise_funding", label: "Raise funding" },
  { key: "personal_brand", label: "Build a personal brand around it" },
  { key: "replace_income", label: "Replace my current income" },
  { key: "dont_know", label: "I don't know yet" },
];

export const BUSINESS_PROBLEM_OPTIONS: Option[] = [
  { key: "finding_customers", label: "Finding customers" },
  { key: "pricing", label: "Pricing my product/service" },
  { key: "not_enough_time", label: "Not enough time" },
  { key: "unclear_what_to_build", label: "Not sure what to build" },
  { key: "marketing_visibility", label: "Marketing & getting noticed" },
  { key: "cash_flow", label: "Managing money/cash flow" },
  { key: "staying_consistent", label: "Staying motivated & consistent" },
  { key: "doing_it_alone", label: "Doing it all alone" },
];
