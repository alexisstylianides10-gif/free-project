import {
  AppNotification,
  Expense,
  ExplorePlace,
  ItineraryItem,
  Message,
  Poll,
  Profile,
  SavedPlace,
  Trip,
  TripDocument,
  TripMember,
} from "./types";
import { addDaysISO, nextCalendarDate } from "./utils";

// Deterministic ids (not Math.random-based) so server-rendered and
// client-hydrated demo data always match exactly — avoids hydration mismatches.
let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36).padStart(4, "0")}`;
}

export const CURRENT_USER_ID = "user_alex";

export const demoProfile: Profile = {
  id: CURRENT_USER_ID,
  name: "Alex",
  email: "alexis.stylianides10@gmail.com",
  avatarInitials: "A",
  plan: "Free",
  interests: ["Gaming", "Food", "History"],
  foodPreferences: ["No seafood", "Loves ramen"],
  travelStyle: "Balanced",
  homeCity: "Limassol, Cyprus",
  theme: "system",
  notificationPrefs: { flights: true, polls: true, conflicts: true, tripUpdates: true, chat: true },
};

// ---------------------------------------------------------------------------
// Trip 1 — Japan (the flagship demo trip, upcoming)
// ---------------------------------------------------------------------------

const JP_START = nextCalendarDate(4, 12);
const JP_END = nextCalendarDate(4, 20);

export const japanTrip: Trip = {
  id: "trip_japan",
  name: "Japan",
  countryFlag: "🇯🇵",
  cities: ["Tokyo", "Kyoto", "Osaka"],
  startDate: JP_START,
  endDate: JP_END,
  coverGradient: "from-rose-400 via-fuchsia-400 to-indigo-500",
  coverEmoji: "🗼",
  budget: 2000,
  currency: "EUR",
  interests: ["Gaming", "Food", "Shopping", "History"],
  foodPreferences: ["Ramen", "Sushi", "Street food"],
  travelStyle: "Balanced",
  ownerId: CURRENT_USER_ID,
  createdAt: addDaysISO(JP_START, -60),
};

export const japanMembers: TripMember[] = [
  { id: "mem_alex", tripId: japanTrip.id, userId: CURRENT_USER_ID, name: "Alex", avatarInitials: "A", role: "Organizer", responsibility: "Hotel", joinedAt: addDaysISO(JP_START, -60) },
  { id: "mem_john", tripId: japanTrip.id, userId: "user_john", name: "John", avatarInitials: "J", role: "Traveler", responsibility: "Airport transfer", joinedAt: addDaysISO(JP_START, -55) },
  { id: "mem_sarah", tripId: japanTrip.id, userId: "user_sarah", name: "Sarah", avatarInitials: "S", role: "Traveler", responsibility: "Tickets", joinedAt: addDaysISO(JP_START, -54) },
  { id: "mem_mike", tripId: japanTrip.id, userId: "user_mike", name: "Mike", avatarInitials: "M", role: "Traveler", joinedAt: addDaysISO(JP_START, -50) },
  { id: "mem_emma", tripId: japanTrip.id, userId: "user_emma", name: "Emma", avatarInitials: "E", role: "Traveler", joinedAt: addDaysISO(JP_START, -48) },
];

const ALL_JP = japanMembers.map((m) => m.id);

function it(
  day: number,
  startTime: string,
  endTime: string,
  type: ItineraryItem["type"],
  name: string,
  emoji: string,
  opts: Partial<ItineraryItem> = {}
): ItineraryItem {
  return {
    id: uid("it"),
    tripId: japanTrip.id,
    date: addDaysISO(JP_START, day),
    startTime,
    endTime,
    type,
    name,
    emoji,
    participantIds: ALL_JP,
    order: 0,
    ...opts,
  };
}

export const japanItinerary: ItineraryItem[] = [
  // Day 1 — arrival in Tokyo
  it(0, "09:30", "11:00", "flight", "Arrive — Tokyo Narita", "✈️", { location: "Narita Airport (NRT)", description: "Emirates EK318 from Dubai.", bookingRef: "EK318", mapX: 46, mapY: 22 }),
  it(0, "11:00", "12:30", "transport", "Airport → Hotel", "🚕", { location: "Narita Express + taxi", cost: 45, mapX: 44, mapY: 24 }),
  it(0, "12:30", "14:00", "hotel", "Hotel check-in", "🏨", { location: "Shibuya Sky Hotel", cost: 0, mapX: 40, mapY: 30 }),
  it(0, "14:00", "15:30", "restaurant", "Lunch — Ichiran Ramen", "🍜", { location: "Shibuya", cost: 12, mapX: 41, mapY: 31 }),
  it(0, "16:00", "18:00", "activity", "Senso-ji Temple", "🏯", { location: "Asakusa", description: "Tokyo's oldest temple, plus Nakamise shopping street.", cost: 0, mapX: 50, mapY: 26 }),
  it(0, "19:00", "20:30", "restaurant", "Dinner — Sushi House", "🍣", { location: "Shibuya", cost: 35, mapX: 41, mapY: 30 }),

  // Day 2 — Tokyo
  it(1, "10:00", "12:00", "activity", "Senso-ji sunrise revisit", "🏯", { location: "Asakusa", cost: 0, mapX: 50, mapY: 26 }),
  it(1, "12:30", "13:30", "restaurant", "Lunch — Curry spot", "🍜", { location: "Akihabara", cost: 10, mapX: 52, mapY: 27 }),
  it(1, "14:00", "18:00", "activity", "Akihabara", "🎮", { location: "Akihabara", description: "Retro arcades, gaming stores, anime shops.", cost: 40, mapX: 52, mapY: 27 }),
  it(1, "19:30", "21:00", "restaurant", "Dinner — Yakiniku Grill", "🍖", { location: "Akihabara", cost: 30, mapX: 52, mapY: 28 }),

  // Day 3 — Tokyo
  it(2, "10:00", "13:00", "activity", "teamLab Planets", "🎨", { location: "Toyosu", cost: 28, mapX: 58, mapY: 34 }),
  it(2, "13:30", "14:30", "restaurant", "Lunch — Conveyor sushi", "🍣", { location: "Toyosu", cost: 18, mapX: 58, mapY: 34 }),
  it(2, "15:00", "18:30", "activity", "Shibuya + Harajuku shopping", "🛍️", { location: "Harajuku", cost: 60, mapX: 39, mapY: 29 }),
  it(2, "19:00", "20:30", "restaurant", "Dinner — Izakaya", "🍢", { location: "Shibuya", cost: 32, mapX: 40, mapY: 30 }),

  // Day 4 — travel to Kyoto
  it(3, "09:00", "09:30", "hotel", "Hotel check-out", "🏨", { location: "Shibuya Sky Hotel", cost: 0, mapX: 40, mapY: 30 }),
  it(3, "10:15", "12:45", "transport", "Shinkansen to Kyoto", "🚄", { location: "Tokyo Station → Kyoto Station", cost: 130, bookingRef: "NOZOMI 223", mapX: 65, mapY: 45 }),
  it(3, "13:30", "14:30", "hotel", "Hotel check-in", "🏨", { location: "Kyoto Riverside Inn", cost: 0, mapX: 66, mapY: 52 }),
  it(3, "15:00", "18:00", "activity", "Fushimi Inari Shrine", "⛩️", { location: "Fushimi", description: "Thousands of torii gates up the mountain.", cost: 0, mapX: 70, mapY: 55 }),
  it(3, "19:00", "20:30", "restaurant", "Dinner — Kyoto Kaiseki", "🍱", { location: "Gion", cost: 55, mapX: 67, mapY: 53 }),

  // Day 5 — Kyoto
  it(4, "09:00", "12:00", "activity", "Arashiyama Bamboo Grove", "🎋", { location: "Arashiyama", cost: 5, mapX: 60, mapY: 50 }),
  it(4, "12:30", "13:30", "restaurant", "Lunch — Soba noodles", "🍜", { location: "Arashiyama", cost: 14, mapX: 60, mapY: 50 }),
  it(4, "14:00", "17:00", "activity", "Kinkaku-ji (Golden Pavilion)", "🏯", { location: "Kita-ku", cost: 5, mapX: 62, mapY: 47 }),
  it(4, "19:00", "20:30", "restaurant", "Dinner — Ramen alley", "🍜", { location: "Kyoto Station", cost: 15, mapX: 66, mapY: 52 }),

  // Day 6 — travel to Osaka
  it(5, "10:00", "10:45", "transport", "Train to Osaka", "🚆", { location: "Kyoto → Osaka", cost: 15, mapX: 78, mapY: 66 }),
  it(5, "11:30", "12:30", "hotel", "Hotel check-in", "🏨", { location: "Dotonbori Central Hotel", cost: 0, mapX: 80, mapY: 70 }),
  it(5, "13:00", "14:00", "restaurant", "Lunch — Takoyaki stalls", "🐙", { location: "Dotonbori", cost: 12, mapX: 80, mapY: 70 }),
  it(5, "15:00", "18:00", "activity", "Osaka Castle", "🏯", { location: "Osaka Castle Park", cost: 6, mapX: 82, mapY: 65 }),
  it(5, "19:30", "22:00", "activity", "Dotonbori nightlife walk", "🌃", { location: "Dotonbori", cost: 20, mapX: 80, mapY: 70 }),

  // Day 7 — Osaka
  it(6, "09:00", "17:00", "activity", "Universal Studios Japan", "🎢", { location: "Universal City", cost: 85, mapX: 76, mapY: 68 }),
  it(6, "19:00", "20:30", "restaurant", "Dinner — Okonomiyaki", "🥞", { location: "Dotonbori", cost: 20, mapX: 80, mapY: 70 }),

  // Day 8 — free day / Disneyland option
  it(7, "10:00", "13:00", "free_time", "Free morning — shopping or rest", "☕", { location: "Shinsaibashi", cost: 0, mapX: 79, mapY: 69 }),
  it(7, "14:00", "17:00", "activity", "Nara day trip — deer park", "🦌", { location: "Nara", cost: 15, mapX: 74, mapY: 60 }),
  it(7, "19:00", "20:30", "restaurant", "Farewell dinner", "🍶", { location: "Dotonbori", cost: 45, mapX: 80, mapY: 70 }),

  // Day 9 — departure
  it(8, "08:00", "08:30", "hotel", "Hotel check-out", "🏨", { location: "Dotonbori Central Hotel", cost: 0, mapX: 80, mapY: 70 }),
  it(8, "09:15", "10:00", "transport", "Airport transfer", "🚕", { location: "Kansai Airport Limousine Bus", cost: 25, mapX: 85, mapY: 78 }),
  it(8, "13:10", "19:45", "flight", "Depart — Osaka → Dubai", "✈️", { location: "Kansai Airport (KIX)", bookingRef: "EK317", mapX: 88, mapY: 80 }),
].map((item, i) => ({ ...item, order: i }));

export const japanExpenses: Expense[] = [
  { id: uid("exp"), tripId: japanTrip.id, name: "Hotel — Shibuya + Kyoto + Osaka", amount: 1200, currency: "EUR", paidBy: "mem_alex", participantIds: ALL_JP, category: "Hotel", date: addDaysISO(JP_START, -30), createdAt: addDaysISO(JP_START, -30) },
  { id: uid("exp"), tripId: japanTrip.id, name: "Round-trip flights (Emirates)", amount: 900, currency: "EUR", paidBy: "mem_sarah", participantIds: ALL_JP, category: "Flights", date: addDaysISO(JP_START, -45), createdAt: addDaysISO(JP_START, -45) },
  { id: uid("exp"), tripId: japanTrip.id, name: "Dinner — Sushi House", amount: 120, currency: "EUR", paidBy: "mem_alex", participantIds: ["mem_alex", "mem_john", "mem_sarah", "mem_mike"], category: "Food", date: addDaysISO(JP_START, 0), createdAt: addDaysISO(JP_START, 0) },
  { id: uid("exp"), tripId: japanTrip.id, name: "Ramen + street food", amount: 180, currency: "EUR", paidBy: "mem_john", participantIds: ALL_JP, category: "Food", date: addDaysISO(JP_START, 1), createdAt: addDaysISO(JP_START, 1) },
  { id: uid("exp"), tripId: japanTrip.id, name: "Izakaya + okonomiyaki", amount: 120, currency: "EUR", paidBy: "mem_emma", participantIds: ALL_JP, category: "Food", date: addDaysISO(JP_START, 5), createdAt: addDaysISO(JP_START, 5) },
  { id: uid("exp"), tripId: japanTrip.id, name: "Akihabara arcades + shopping", amount: 100, currency: "EUR", paidBy: "mem_mike", participantIds: ALL_JP, category: "Activities", date: addDaysISO(JP_START, 1), createdAt: addDaysISO(JP_START, 1) },
  { id: uid("exp"), tripId: japanTrip.id, name: "Universal Studios tickets", amount: 120, currency: "EUR", paidBy: "mem_alex", participantIds: ALL_JP, category: "Activities", date: addDaysISO(JP_START, 6), createdAt: addDaysISO(JP_START, 6) },
  { id: uid("exp"), tripId: japanTrip.id, name: "Shinkansen tickets", amount: 70, currency: "EUR", paidBy: "mem_sarah", participantIds: ALL_JP, category: "Transport", date: addDaysISO(JP_START, 3), createdAt: addDaysISO(JP_START, 3) },
  { id: uid("exp"), tripId: japanTrip.id, name: "Local trains + taxis", amount: 30, currency: "EUR", paidBy: "mem_john", participantIds: ALL_JP, category: "Transport", date: addDaysISO(JP_START, 5), createdAt: addDaysISO(JP_START, 5) },
];

export const japanPolls: Poll[] = [
  {
    id: uid("poll"),
    tripId: japanTrip.id,
    question: "Where should we eat Friday?",
    status: "open",
    options: [
      { id: uid("opt"), text: "Sushi House", emoji: "🍣" },
      { id: uid("opt"), text: "Pizza Place", emoji: "🍕" },
      { id: uid("opt"), text: "Steakhouse", emoji: "🥩" },
    ],
    votes: [],
    createdBy: "mem_alex",
    createdAt: addDaysISO(JP_START, -2),
  },
];
japanPolls[0].votes = [
  { pollId: japanPolls[0].id, optionId: japanPolls[0].options[0].id, memberId: "mem_alex" },
  { pollId: japanPolls[0].id, optionId: japanPolls[0].options[0].id, memberId: "mem_john" },
  { pollId: japanPolls[0].id, optionId: japanPolls[0].options[1].id, memberId: "mem_sarah" },
  { pollId: japanPolls[0].id, optionId: japanPolls[0].options[0].id, memberId: "mem_mike" },
];

export const japanMessages: Message[] = [
  { id: uid("msg"), tripId: japanTrip.id, senderId: "mem_sarah", content: "Just booked the flights! Emirates EK318, arriving 09:30 on day 1.", kind: "text", createdAt: addDaysISO(JP_START, -45) },
  { id: uid("msg"), tripId: japanTrip.id, senderId: "mem_john", content: "What are we doing tomorrow?", kind: "text", createdAt: addDaysISO(JP_START, -1) },
  {
    id: uid("msg"),
    tripId: japanTrip.id,
    senderId: "ai",
    content: "Tomorrow (Day 1 in Tokyo) you have:\n09:30 Arrive — Tokyo Narita\n12:30 Hotel check-in\n14:00 Lunch — Ichiran Ramen\n16:00 Senso-ji Temple\n19:00 Dinner — Sushi House",
    kind: "ai",
    createdAt: addDaysISO(JP_START, -1),
  },
  { id: uid("msg"), tripId: japanTrip.id, senderId: "mem_mike", content: "Can't wait for Akihabara 🎮", kind: "text", createdAt: addDaysISO(JP_START, -1) },
];

export const japanDocuments: TripDocument[] = [
  {
    id: uid("doc"),
    tripId: japanTrip.id,
    fileName: "Emirates_Flight_Confirmation.pdf",
    kind: "flight",
    extractedData: {
      Airline: "Emirates",
      Flight: "EK318",
      Departure: `${JP_START} — 03:15`,
      Arrival: `${JP_START} — 09:30`,
      Airport: "Dubai (DXB) → Tokyo Narita (NRT)",
    },
    addedToItinerary: true,
    uploadedAt: addDaysISO(JP_START, -45),
  },
];

export const japanAlerts = [
  { id: uid("alert"), tripId: japanTrip.id, severity: "warning" as const, message: "Your flight arrives 45 minutes later than originally planned." },
];

// ---------------------------------------------------------------------------
// Trip 2 — Italy (upcoming, less-planned, for the Home/Trips list variety)
// ---------------------------------------------------------------------------

const IT_START = nextCalendarDate(9, 5);
const IT_END = nextCalendarDate(9, 12);

export const italyTrip: Trip = {
  id: "trip_italy",
  name: "Italy",
  countryFlag: "🇮🇹",
  cities: ["Rome", "Florence"],
  startDate: IT_START,
  endDate: IT_END,
  coverGradient: "from-amber-400 via-orange-400 to-rose-500",
  coverEmoji: "🍝",
  budget: 1500,
  currency: "EUR",
  interests: ["Food", "History"],
  foodPreferences: ["Pasta", "Wine"],
  travelStyle: "Relaxed",
  ownerId: CURRENT_USER_ID,
  createdAt: addDaysISO(IT_START, -10),
};

export const italyMembers: TripMember[] = [
  { id: "mem_alex_it", tripId: italyTrip.id, userId: CURRENT_USER_ID, name: "Alex", avatarInitials: "A", role: "Organizer", joinedAt: addDaysISO(IT_START, -10) },
  { id: "mem_emma_it", tripId: italyTrip.id, userId: "user_emma", name: "Emma", avatarInitials: "E", role: "Traveler", joinedAt: addDaysISO(IT_START, -8) },
];

export const italyItinerary: ItineraryItem[] = [
  {
    id: uid("it"),
    tripId: italyTrip.id,
    date: IT_START,
    startTime: "14:00",
    endTime: "16:00",
    type: "flight",
    name: "Arrive — Rome Fiumicino",
    emoji: "✈️",
    location: "Fiumicino Airport (FCO)",
    participantIds: italyMembers.map((m) => m.id),
    order: 0,
    mapX: 45,
    mapY: 40,
  },
];

export const italyExpenses: Expense[] = [];
export const italyPolls: Poll[] = [];
export const italyMessages: Message[] = [];
export const italyDocuments: TripDocument[] = [];

// ---------------------------------------------------------------------------
// Trip 3 — Greece (past trip, for Profile / "Past trips")
// ---------------------------------------------------------------------------

export const greeceTrip: Trip = {
  id: "trip_greece",
  name: "Greece",
  countryFlag: "🇬🇷",
  cities: ["Santorini", "Athens"],
  startDate: addDaysISO(new Date().toISOString().slice(0, 10), -120),
  endDate: addDaysISO(new Date().toISOString().slice(0, 10), -113),
  coverGradient: "from-sky-400 via-blue-400 to-indigo-500",
  coverEmoji: "🏛️",
  currency: "EUR",
  interests: ["Food", "History"],
  foodPreferences: [],
  travelStyle: "Relaxed",
  ownerId: CURRENT_USER_ID,
  createdAt: addDaysISO(new Date().toISOString().slice(0, 10), -160),
};

export const greeceMembers: TripMember[] = [
  { id: "mem_alex_gr", tripId: greeceTrip.id, userId: CURRENT_USER_ID, name: "Alex", avatarInitials: "A", role: "Organizer", joinedAt: addDaysISO(greeceTrip.startDate, -30) },
  { id: "mem_john_gr", tripId: greeceTrip.id, userId: "user_john", name: "John", avatarInitials: "J", role: "Traveler", joinedAt: addDaysISO(greeceTrip.startDate, -28) },
];

export const greeceItinerary: ItineraryItem[] = [];
export const greeceExpenses: Expense[] = [];
export const greecePolls: Poll[] = [];
export const greeceMessages: Message[] = [];
export const greeceDocuments: TripDocument[] = [];

// ---------------------------------------------------------------------------
// Aggregate demo collections
// ---------------------------------------------------------------------------

export const demoTrips: Trip[] = [japanTrip, italyTrip, greeceTrip];
export const demoTripMembers: TripMember[] = [...japanMembers, ...italyMembers, ...greeceMembers];
export const demoItinerary: ItineraryItem[] = [...japanItinerary, ...italyItinerary, ...greeceItinerary];
export const demoExpenses: Expense[] = [...japanExpenses, ...italyExpenses, ...greeceExpenses];
export const demoPolls: Poll[] = [...japanPolls, ...italyPolls, ...greecePolls];
export const demoMessages: Message[] = [...japanMessages, ...italyMessages, ...greeceMessages];
export const demoDocuments: TripDocument[] = [...japanDocuments, ...italyDocuments, ...greeceDocuments];
export const demoAlerts = [...japanAlerts];

export const demoNotifications: AppNotification[] = [
  { id: uid("notif"), tripId: japanTrip.id, title: "✈️ Your flight leaves in a few weeks", body: "Emirates EK318 departs at 03:15 local time from Dubai.", kind: "flight", createdAt: addDaysISO(JP_START, -45), read: false },
  { id: uid("notif"), tripId: japanTrip.id, title: "🗳️ New poll: choose Friday's restaurant", body: "Sarah started a poll for where to eat Friday night.", kind: "poll", createdAt: addDaysISO(JP_START, -2), read: false },
  { id: uid("notif"), tripId: japanTrip.id, title: "⚠️ Your itinerary has a conflict", body: "Dinner on Day 6 overlaps with the Dotonbori nightlife walk.", kind: "conflict", createdAt: addDaysISO(JP_START, -1), read: false },
  { id: uid("notif"), tripId: japanTrip.id, title: "👥 Emma joined your trip", body: "Emma accepted your invite to Japan.", kind: "member", createdAt: addDaysISO(JP_START, -48), read: true },
  { id: uid("notif"), tripId: japanTrip.id, title: "🔄 Your flight time changed", body: "Arrival moved from 08:45 to 09:30.", kind: "flight", createdAt: addDaysISO(JP_START, -20), read: true },
];

export const demoSavedPlaces: SavedPlace[] = [
  { id: uid("saved"), userId: CURRENT_USER_ID, name: "teamLab Planets", category: "Attractions", city: "Tokyo", emoji: "🎨" },
  { id: uid("saved"), userId: CURRENT_USER_ID, name: "Ichiran Ramen", category: "Food", city: "Tokyo", emoji: "🍜" },
];

export const demoExplorePlaces: ExplorePlace[] = [
  { id: uid("place"), city: "Tokyo", category: "Food", name: "Ichiran Ramen", emoji: "🍜", gradient: "from-orange-300 to-rose-400", rating: 4.7, price: "€", distanceKm: 0.6, description: "Solo-booth tonkotsu ramen, a Tokyo classic.", location: "Shibuya" },
  { id: uid("place"), city: "Tokyo", category: "Food", name: "Sushi House", emoji: "🍣", gradient: "from-sky-300 to-indigo-400", rating: 4.6, price: "€€", distanceKm: 0.9, description: "Fresh nigiri omakase near Shibuya crossing.", location: "Shibuya" },
  { id: uid("place"), city: "Tokyo", category: "Gaming", name: "Akihabara Arcades", emoji: "🎮", gradient: "from-fuchsia-400 to-purple-500", rating: 4.8, price: "€", distanceKm: 3.2, description: "Retro arcades, gacha, and anime stores.", location: "Akihabara" },
  { id: uid("place"), city: "Tokyo", category: "Attractions", name: "Senso-ji Temple", emoji: "🏯", gradient: "from-red-400 to-orange-400", rating: 4.7, price: "€", distanceKm: 4.1, description: "Tokyo's oldest and most iconic temple.", location: "Asakusa" },
  { id: uid("place"), city: "Tokyo", category: "Attractions", name: "teamLab Planets", emoji: "🎨", gradient: "from-cyan-400 to-blue-500", rating: 4.9, price: "€€", distanceKm: 6.5, description: "Immersive digital art you walk through barefoot.", location: "Toyosu" },
  { id: uid("place"), city: "Tokyo", category: "Shopping", name: "Harajuku / Takeshita St", emoji: "🛍️", gradient: "from-pink-400 to-rose-400", rating: 4.5, price: "€€", distanceKm: 1.4, description: "Streetwear, crepes, and pop culture shopping.", location: "Harajuku" },
  { id: uid("place"), city: "Tokyo", category: "Nightlife", name: "Golden Gai", emoji: "🌃", gradient: "from-indigo-500 to-violet-600", rating: 4.6, price: "€€", distanceKm: 5.0, description: "Tiny bars packed into narrow alleyways.", location: "Shinjuku" },
  { id: uid("place"), city: "Kyoto", category: "Attractions", name: "Fushimi Inari Shrine", emoji: "⛩️", gradient: "from-red-500 to-orange-500", rating: 4.9, price: "€", distanceKm: 2.1, description: "Thousands of vermillion torii gates.", location: "Fushimi" },
  { id: uid("place"), city: "Kyoto", category: "Attractions", name: "Arashiyama Bamboo Grove", emoji: "🎋", gradient: "from-emerald-400 to-teal-500", rating: 4.6, price: "€", distanceKm: 8.0, description: "A towering, otherworldly bamboo path.", location: "Arashiyama" },
  { id: uid("place"), city: "Kyoto", category: "Food", name: "Nishiki Market", emoji: "🍡", gradient: "from-amber-400 to-orange-500", rating: 4.5, price: "€", distanceKm: 1.0, description: "Kyoto's kitchen — 400m of food stalls.", location: "Nakagyo" },
  { id: uid("place"), city: "Osaka", category: "Food", name: "Dotonbori Street Food", emoji: "🐙", gradient: "from-yellow-400 to-orange-500", rating: 4.7, price: "€", distanceKm: 0.4, description: "Takoyaki, okonomiyaki, and neon everywhere.", location: "Dotonbori" },
  { id: uid("place"), city: "Osaka", category: "Activities", name: "Universal Studios Japan", emoji: "🎢", gradient: "from-blue-400 to-indigo-500", rating: 4.8, price: "€€€", distanceKm: 7.0, description: "Super Nintendo World and more.", location: "Universal City" },
  { id: uid("place"), city: "Osaka", category: "Attractions", name: "Osaka Castle", emoji: "🏯", gradient: "from-slate-400 to-slate-600", rating: 4.6, price: "€", distanceKm: 3.5, description: "Iconic castle with a museum inside.", location: "Osaka Castle Park" },
  { id: uid("place"), city: "Osaka", category: "Nightlife", name: "Shinsaibashi Bars", emoji: "🍹", gradient: "from-purple-400 to-fuchsia-500", rating: 4.4, price: "€€", distanceKm: 1.2, description: "Shopping arcade by day, bar-hopping by night.", location: "Shinsaibashi" },
];
