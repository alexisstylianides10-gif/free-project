export type TravelStyle = "Relaxed" | "Balanced" | "Packed";

export type TripRole = "Organizer" | "Traveler";

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  plan: "Free" | "Travel Pro";
  interests: string[];
  foodPreferences: string[];
  travelStyle: TravelStyle;
  homeCity: string;
  theme: "light" | "dark" | "system";
  notificationPrefs: {
    flights: boolean;
    polls: boolean;
    conflicts: boolean;
    tripUpdates: boolean;
    chat: boolean;
  };
}

export interface Trip {
  id: string;
  name: string; // e.g. "Japan"
  countryFlag: string; // emoji flag
  cities: string[]; // ["Tokyo", "Kyoto", "Osaka"]
  startDate: string; // ISO date
  endDate: string; // ISO date
  coverGradient: string; // tailwind gradient classes
  coverEmoji: string;
  budget?: number;
  currency: string;
  interests: string[];
  foodPreferences: string[];
  travelStyle: TravelStyle;
  ownerId: string;
  archived?: boolean;
  createdAt: string;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  name: string;
  avatarInitials: string;
  role: TripRole;
  responsibility?: string;
  status?: "invited" | "joined";
  joinedAt: string;
}

export type ItineraryType =
  | "activity"
  | "restaurant"
  | "hotel"
  | "flight"
  | "transport"
  | "free_time"
  | "other";

export interface ItineraryItem {
  id: string;
  tripId: string;
  date: string; // ISO date
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: ItineraryType;
  name: string;
  emoji: string;
  location?: string;
  description?: string;
  cost?: number;
  participantIds: string[]; // TripMember ids
  notes?: string;
  bookingRef?: string;
  mapX?: number; // 0-100, percentage position on the mock map
  mapY?: number;
  aiGenerated?: boolean;
  order: number; // manual ordering within the same start time
}

export type TxCategory = "Hotel" | "Flights" | "Food" | "Activities" | "Transport" | "Shopping" | "Other";

export interface Expense {
  id: string;
  tripId: string;
  name: string;
  amount: number;
  currency: string;
  paidBy: string; // TripMember id
  participantIds: string[]; // TripMember ids splitting the cost
  customSplit?: Record<string, number>; // memberId -> amount, overrides equal split
  category: TxCategory;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  emoji?: string;
}

export interface Poll {
  id: string;
  tripId: string;
  question: string;
  status: "open" | "closed";
  options: PollOption[];
  votes: { pollId: string; optionId: string; memberId: string }[];
  createdBy: string;
  createdAt: string;
  addedToItinerary?: boolean;
}

export interface Message {
  id: string;
  tripId: string;
  senderId: string; // TripMember id, or "ai"
  content: string;
  kind: "text" | "ai" | "system";
  createdAt: string;
}

export type DocumentKind = "flight" | "hotel" | "restaurant" | "car" | "activity" | "train" | "other";

export interface TripDocument {
  id: string;
  tripId: string;
  fileName: string;
  kind: DocumentKind;
  extractedData: Record<string, string>;
  addedToItinerary: boolean;
  uploadedAt: string;
}

export interface SavedPlace {
  id: string;
  userId: string;
  name: string;
  category: string;
  city: string;
  emoji: string;
}

export type NotificationKind = "flight" | "poll" | "conflict" | "checkin" | "member" | "chat" | "system";

export interface AppNotification {
  id: string;
  tripId?: string;
  title: string;
  body: string;
  kind: NotificationKind;
  createdAt: string;
  read: boolean;
}

export interface TripAlert {
  id: string;
  tripId: string;
  severity: "warning" | "critical";
  message: string;
  relatedItemIds?: string[];
}

export interface ExplorePlace {
  id: string;
  city: string;
  category: "Food" | "Gaming" | "Attractions" | "Shopping" | "Nightlife" | "Activities";
  name: string;
  emoji: string;
  gradient: string;
  rating: number;
  price: "€" | "€€" | "€€€";
  distanceKm: number;
  description: string;
  location: string;
}

export interface ItineraryPreviewChange {
  kind: "add" | "remove" | "edit";
  item: ItineraryItem;
  previousItem?: ItineraryItem;
}

export interface AIPreview {
  id: string;
  summary: string;
  changes: ItineraryPreviewChange[];
}

export interface AIChatEntry {
  id: string;
  role: "user" | "ai";
  content: string;
  createdAt: string;
  preview?: AIPreview;
}
