import { supabase } from "./supabase/client";
import {
  AppNotification,
  Expense,
  ItineraryItem,
  Message,
  Poll,
  Profile,
  SavedPlace,
  Trip,
  TripDocument,
  TripMember,
} from "./types";
import { newId } from "./utils";

function client() {
  if (!supabase) throw new Error("Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
  return supabase;
}

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  avatar_initials: string;
  plan: Profile["plan"];
  interests: string[];
  food_preferences: string[];
  travel_style: Profile["travelStyle"];
  home_city: string;
  theme: Profile["theme"];
  notification_prefs: Profile["notificationPrefs"];
}

function profileFromRow(r: ProfileRow): Profile {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    avatarInitials: r.avatar_initials,
    plan: r.plan,
    interests: r.interests ?? [],
    foodPreferences: r.food_preferences ?? [],
    travelStyle: r.travel_style,
    homeCity: r.home_city,
    theme: r.theme,
    notificationPrefs: r.notification_prefs,
  };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await client().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? profileFromRow(data as ProfileRow) : null;
}

export async function isAccountSeeded(userId: string): Promise<boolean> {
  const { data, error } = await client().from("profiles").select("seeded").eq("id", userId).maybeSingle();
  if (error) throw error;
  return (data as { seeded: boolean } | null)?.seeded ?? false;
}

export async function markAccountSeeded(userId: string): Promise<void> {
  const { error } = await client().from("profiles").update({ seeded: true }).eq("id", userId);
  if (error) throw error;
}

export async function updateProfileRow(userId: string, patch: Partial<Profile>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.avatarInitials !== undefined) row.avatar_initials = patch.avatarInitials;
  if (patch.plan !== undefined) row.plan = patch.plan;
  if (patch.interests !== undefined) row.interests = patch.interests;
  if (patch.foodPreferences !== undefined) row.food_preferences = patch.foodPreferences;
  if (patch.travelStyle !== undefined) row.travel_style = patch.travelStyle;
  if (patch.homeCity !== undefined) row.home_city = patch.homeCity;
  if (patch.theme !== undefined) row.theme = patch.theme;
  if (patch.notificationPrefs !== undefined) row.notification_prefs = patch.notificationPrefs;
  const { error } = await client().from("profiles").update(row).eq("id", userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// trips
// ---------------------------------------------------------------------------

interface TripRow {
  id: string;
  name: string;
  country_flag: string;
  cities: string[];
  start_date: string;
  end_date: string;
  cover_gradient: string;
  cover_emoji: string;
  budget: number | null;
  currency: string;
  interests: string[];
  food_preferences: string[];
  travel_style: Trip["travelStyle"];
  owner_id: string;
  archived: boolean;
  created_at: string;
}

function tripFromRow(r: TripRow): Trip {
  return {
    id: r.id,
    name: r.name,
    countryFlag: r.country_flag,
    cities: r.cities ?? [],
    startDate: r.start_date,
    endDate: r.end_date,
    coverGradient: r.cover_gradient,
    coverEmoji: r.cover_emoji,
    budget: r.budget ?? undefined,
    currency: r.currency,
    interests: r.interests ?? [],
    foodPreferences: r.food_preferences ?? [],
    travelStyle: r.travel_style,
    ownerId: r.owner_id,
    archived: r.archived,
    createdAt: r.created_at,
  };
}

function tripToRow(t: Trip): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    country_flag: t.countryFlag,
    cities: t.cities,
    start_date: t.startDate,
    end_date: t.endDate,
    cover_gradient: t.coverGradient,
    cover_emoji: t.coverEmoji,
    budget: t.budget ?? null,
    currency: t.currency,
    interests: t.interests,
    food_preferences: t.foodPreferences,
    travel_style: t.travelStyle,
    owner_id: t.ownerId,
    archived: t.archived ?? false,
    created_at: t.createdAt,
  };
}

export async function fetchTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await client().from("trips").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  void userId;
  return (data as TripRow[]).map(tripFromRow);
}

export async function insertTrip(trip: Trip): Promise<void> {
  const { error } = await client().from("trips").insert(tripToRow(trip));
  if (error) throw error;
}

export async function updateTripRow(tripId: string, patch: Partial<Trip>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.cities !== undefined) row.cities = patch.cities;
  if (patch.startDate !== undefined) row.start_date = patch.startDate;
  if (patch.endDate !== undefined) row.end_date = patch.endDate;
  if (patch.budget !== undefined) row.budget = patch.budget;
  if (patch.interests !== undefined) row.interests = patch.interests;
  if (patch.foodPreferences !== undefined) row.food_preferences = patch.foodPreferences;
  if (patch.travelStyle !== undefined) row.travel_style = patch.travelStyle;
  if (patch.archived !== undefined) row.archived = patch.archived;
  const { error } = await client().from("trips").update(row).eq("id", tripId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// trip_members
// ---------------------------------------------------------------------------

interface MemberRow {
  id: string;
  trip_id: string;
  user_id: string | null;
  name: string;
  avatar_initials: string;
  role: TripMember["role"];
  responsibility: string | null;
  status: TripMember["status"];
  joined_at: string;
}

function memberFromRow(r: MemberRow): TripMember {
  return {
    id: r.id,
    tripId: r.trip_id,
    userId: r.user_id ?? "",
    name: r.name,
    avatarInitials: r.avatar_initials,
    role: r.role,
    responsibility: r.responsibility ?? undefined,
    status: r.status,
    joinedAt: r.joined_at,
  };
}

export async function fetchMembersForTrips(tripIds: string[]): Promise<TripMember[]> {
  if (tripIds.length === 0) return [];
  const { data, error } = await client().from("trip_members").select("*").in("trip_id", tripIds);
  if (error) throw error;
  return (data as MemberRow[]).map(memberFromRow);
}

export async function insertMember(member: TripMember): Promise<void> {
  const { error } = await client()
    .from("trip_members")
    .insert({
      id: member.id,
      trip_id: member.tripId,
      user_id: member.userId || null,
      name: member.name,
      avatar_initials: member.avatarInitials,
      role: member.role,
      responsibility: member.responsibility ?? null,
      status: member.status ?? "joined",
      joined_at: member.joinedAt,
    });
  if (error) throw error;
}

export async function updateMemberRow(memberId: string, patch: Partial<TripMember>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.role !== undefined) row.role = patch.role;
  if (patch.responsibility !== undefined) row.responsibility = patch.responsibility;
  if (patch.status !== undefined) row.status = patch.status;
  const { error } = await client().from("trip_members").update(row).eq("id", memberId);
  if (error) throw error;
}

export async function deleteMemberRow(memberId: string): Promise<void> {
  const { error } = await client().from("trip_members").delete().eq("id", memberId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// itinerary_items
// ---------------------------------------------------------------------------

interface ItineraryRow {
  id: string;
  trip_id: string;
  date: string;
  start_time: string;
  end_time: string;
  type: ItineraryItem["type"];
  name: string;
  emoji: string;
  location: string | null;
  description: string | null;
  cost: number | null;
  participant_ids: string[];
  notes: string | null;
  booking_ref: string | null;
  map_x: number | null;
  map_y: number | null;
  ai_generated: boolean;
  item_order: number;
}

function itineraryFromRow(r: ItineraryRow): ItineraryItem {
  return {
    id: r.id,
    tripId: r.trip_id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    type: r.type,
    name: r.name,
    emoji: r.emoji,
    location: r.location ?? undefined,
    description: r.description ?? undefined,
    cost: r.cost ?? undefined,
    participantIds: r.participant_ids ?? [],
    notes: r.notes ?? undefined,
    bookingRef: r.booking_ref ?? undefined,
    mapX: r.map_x ?? undefined,
    mapY: r.map_y ?? undefined,
    aiGenerated: r.ai_generated,
    order: r.item_order,
  };
}

function itineraryToRow(item: ItineraryItem): Record<string, unknown> {
  return {
    id: item.id,
    trip_id: item.tripId,
    date: item.date,
    start_time: item.startTime,
    end_time: item.endTime,
    type: item.type,
    name: item.name,
    emoji: item.emoji,
    location: item.location ?? null,
    description: item.description ?? null,
    cost: item.cost ?? null,
    participant_ids: item.participantIds,
    notes: item.notes ?? null,
    booking_ref: item.bookingRef ?? null,
    map_x: item.mapX ?? null,
    map_y: item.mapY ?? null,
    ai_generated: item.aiGenerated ?? false,
    item_order: item.order,
  };
}

export async function fetchItineraryForTrips(tripIds: string[]): Promise<ItineraryItem[]> {
  if (tripIds.length === 0) return [];
  const { data, error } = await client().from("itinerary_items").select("*").in("trip_id", tripIds);
  if (error) throw error;
  return (data as ItineraryRow[]).map(itineraryFromRow);
}

export async function insertItineraryItem(item: ItineraryItem): Promise<void> {
  const { error } = await client().from("itinerary_items").insert(itineraryToRow(item));
  if (error) throw error;
}

export async function updateItineraryRow(id: string, patch: Partial<ItineraryItem>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.startTime !== undefined) row.start_time = patch.startTime;
  if (patch.endTime !== undefined) row.end_time = patch.endTime;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.emoji !== undefined) row.emoji = patch.emoji;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.cost !== undefined) row.cost = patch.cost;
  if (patch.participantIds !== undefined) row.participant_ids = patch.participantIds;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.bookingRef !== undefined) row.booking_ref = patch.bookingRef;
  if (patch.order !== undefined) row.item_order = patch.order;
  const { error } = await client().from("itinerary_items").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteItineraryRow(id: string): Promise<void> {
  const { error } = await client().from("itinerary_items").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// expenses
// ---------------------------------------------------------------------------

interface ExpenseRow {
  id: string;
  trip_id: string;
  name: string;
  amount: number;
  currency: string;
  paid_by: string;
  participant_ids: string[];
  custom_split: Record<string, number> | null;
  category: Expense["category"];
  date: string;
  notes: string | null;
}

function expenseFromRow(r: ExpenseRow, createdAt: string): Expense {
  return {
    id: r.id,
    tripId: r.trip_id,
    name: r.name,
    amount: r.amount,
    currency: r.currency,
    paidBy: r.paid_by,
    participantIds: r.participant_ids ?? [],
    customSplit: r.custom_split ?? undefined,
    category: r.category,
    date: r.date,
    notes: r.notes ?? undefined,
    createdAt,
  };
}

export async function fetchExpensesForTrips(tripIds: string[]): Promise<Expense[]> {
  if (tripIds.length === 0) return [];
  const { data, error } = await client().from("expenses").select("*").in("trip_id", tripIds);
  if (error) throw error;
  return (data as (ExpenseRow & { created_at: string })[]).map((r) => expenseFromRow(r, r.created_at));
}

export async function insertExpenseRow(expense: Expense): Promise<void> {
  const { error } = await client()
    .from("expenses")
    .insert({
      id: expense.id,
      trip_id: expense.tripId,
      name: expense.name,
      amount: expense.amount,
      currency: expense.currency,
      paid_by: expense.paidBy,
      participant_ids: expense.participantIds,
      custom_split: expense.customSplit ?? null,
      category: expense.category,
      date: expense.date,
      notes: expense.notes ?? null,
      created_at: expense.createdAt,
    });
  if (error) throw error;
}

export async function deleteExpenseRow(id: string): Promise<void> {
  const { error } = await client().from("expenses").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// polls / poll_options / poll_votes
// ---------------------------------------------------------------------------

export async function fetchPollsForTrips(tripIds: string[]): Promise<Poll[]> {
  if (tripIds.length === 0) return [];
  const { data: pollRows, error } = await client().from("polls").select("*").in("trip_id", tripIds);
  if (error) throw error;
  const pollIds = (pollRows as { id: string }[]).map((p) => p.id);
  if (pollIds.length === 0) return [];

  const [{ data: optionRows, error: optErr }, { data: voteRows, error: voteErr }] = await Promise.all([
    client().from("poll_options").select("*").in("poll_id", pollIds),
    client().from("poll_votes").select("*").in("poll_id", pollIds),
  ]);
  if (optErr) throw optErr;
  if (voteErr) throw voteErr;

  return (pollRows as { id: string; trip_id: string; question: string; status: Poll["status"]; created_by: string; created_at: string; added_to_itinerary: boolean }[]).map((p) => ({
    id: p.id,
    tripId: p.trip_id,
    question: p.question,
    status: p.status,
    createdBy: p.created_by,
    createdAt: p.created_at,
    addedToItinerary: p.added_to_itinerary,
    options: (optionRows as { id: string; poll_id: string; text: string; emoji: string | null }[])
      .filter((o) => o.poll_id === p.id)
      .map((o) => ({ id: o.id, text: o.text, emoji: o.emoji ?? undefined })),
    votes: (voteRows as { poll_id: string; option_id: string; member_id: string }[])
      .filter((v) => v.poll_id === p.id)
      .map((v) => ({ pollId: v.poll_id, optionId: v.option_id, memberId: v.member_id })),
  }));
}

export async function insertPoll(poll: Poll): Promise<void> {
  const { error } = await client()
    .from("polls")
    .insert({ id: poll.id, trip_id: poll.tripId, question: poll.question, status: poll.status, created_by: poll.createdBy, created_at: poll.createdAt, added_to_itinerary: poll.addedToItinerary ?? false });
  if (error) throw error;
  if (poll.options.length) {
    const { error: optErr } = await client()
      .from("poll_options")
      .insert(poll.options.map((o) => ({ id: o.id, poll_id: poll.id, text: o.text, emoji: o.emoji ?? null })));
    if (optErr) throw optErr;
  }
}

export async function upsertVoteRow(pollId: string, optionId: string, memberId: string): Promise<void> {
  const { error } = await client().from("poll_votes").upsert({ poll_id: pollId, option_id: optionId, member_id: memberId }, { onConflict: "poll_id,member_id" });
  if (error) throw error;
}

export async function updatePollRow(pollId: string, patch: Partial<Poll>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.addedToItinerary !== undefined) row.added_to_itinerary = patch.addedToItinerary;
  const { error } = await client().from("polls").update(row).eq("id", pollId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------

export async function fetchMessagesForTrips(tripIds: string[]): Promise<Message[]> {
  if (tripIds.length === 0) return [];
  const { data, error } = await client().from("messages").select("*").in("trip_id", tripIds).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as { id: string; trip_id: string; sender_id: string; content: string; kind: Message["kind"]; created_at: string }[]).map((r) => ({
    id: r.id,
    tripId: r.trip_id,
    senderId: r.sender_id,
    content: r.content,
    kind: r.kind,
    createdAt: r.created_at,
  }));
}

export async function insertMessageRow(message: Message): Promise<void> {
  const { error } = await client()
    .from("messages")
    .insert({ id: message.id, trip_id: message.tripId, sender_id: message.senderId, content: message.content, kind: message.kind, created_at: message.createdAt });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// documents
// ---------------------------------------------------------------------------

export async function fetchDocumentsForTrips(tripIds: string[]): Promise<TripDocument[]> {
  if (tripIds.length === 0) return [];
  const { data, error } = await client().from("documents").select("*").in("trip_id", tripIds);
  if (error) throw error;
  return (data as { id: string; trip_id: string; file_name: string; kind: TripDocument["kind"]; extracted_data: Record<string, string>; added_to_itinerary: boolean; uploaded_at: string }[]).map((r) => ({
    id: r.id,
    tripId: r.trip_id,
    fileName: r.file_name,
    kind: r.kind,
    extractedData: r.extracted_data ?? {},
    addedToItinerary: r.added_to_itinerary,
    uploadedAt: r.uploaded_at,
  }));
}

export async function insertDocumentRow(doc: TripDocument): Promise<void> {
  const { error } = await client()
    .from("documents")
    .insert({ id: doc.id, trip_id: doc.tripId, file_name: doc.fileName, kind: doc.kind, extracted_data: doc.extractedData, added_to_itinerary: doc.addedToItinerary, uploaded_at: doc.uploadedAt });
  if (error) throw error;
}

export async function markDocumentAdded(id: string): Promise<void> {
  const { error } = await client().from("documents").update({ added_to_itinerary: true }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await client().from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as { id: string; trip_id: string | null; title: string; body: string; kind: AppNotification["kind"]; read: boolean; created_at: string }[]).map((r) => ({
    id: r.id,
    tripId: r.trip_id ?? undefined,
    title: r.title,
    body: r.body,
    kind: r.kind,
    read: r.read,
    createdAt: r.created_at,
  }));
}

export async function insertNotificationRow(userId: string, n: AppNotification): Promise<void> {
  const { error } = await client()
    .from("notifications")
    .insert({ id: n.id, user_id: userId, trip_id: n.tripId ?? null, title: n.title, body: n.body, kind: n.kind, read: n.read, created_at: n.createdAt });
  if (error) throw error;
}

export async function markNotificationReadRow(id: string): Promise<void> {
  const { error } = await client().from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// saved_places
// ---------------------------------------------------------------------------

export async function fetchSavedPlaces(userId: string): Promise<SavedPlace[]> {
  const { data, error } = await client().from("saved_places").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data as { id: string; user_id: string; name: string; category: string; city: string; emoji: string }[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    category: r.category,
    city: r.city,
    emoji: r.emoji,
  }));
}

export async function insertSavedPlaceRow(place: SavedPlace): Promise<void> {
  const { error } = await client()
    .from("saved_places")
    .insert({ id: place.id, user_id: place.userId, name: place.name, category: place.category, city: place.city, emoji: place.emoji });
  if (error) throw error;
}

export async function deleteSavedPlaceRow(id: string): Promise<void> {
  const { error } = await client().from("saved_places").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Seed a brand-new account with the realistic demo dataset so first-run
// still feels like a populated, "wow" trip instead of an empty shell.
// ---------------------------------------------------------------------------

export async function seedAccountWithDemoData(userId: string): Promise<void> {
  const { demoTrips, demoTripMembers, demoItinerary, demoExpenses, demoPolls, demoMessages, demoDocuments, demoNotifications, demoSavedPlaces, CURRENT_USER_ID } =
    await import("./demoData");

  const tripIdMap = new Map<string, string>();
  const trips = demoTrips.map((t) => {
    const id = newId();
    tripIdMap.set(t.id, id);
    return { ...t, id, ownerId: userId };
  });
  for (const t of trips) await insertTrip(t);

  const memberIdMap = new Map<string, string>();
  for (const m of demoTripMembers) {
    const newTripId = tripIdMap.get(m.tripId);
    if (!newTripId) continue;
    const id = newId();
    memberIdMap.set(m.id, id);
    await insertMember({ ...m, id, tripId: newTripId, userId: m.userId === CURRENT_USER_ID ? userId : "" });
  }

  for (const item of demoItinerary) {
    const newTripId = tripIdMap.get(item.tripId);
    if (!newTripId) continue;
    await insertItineraryItem({
      ...item,
      id: newId(),
      tripId: newTripId,
      participantIds: item.participantIds.map((id) => memberIdMap.get(id) ?? id),
    });
  }

  for (const e of demoExpenses) {
    const newTripId = tripIdMap.get(e.tripId);
    if (!newTripId) continue;
    await insertExpenseRow({
      ...e,
      id: newId(),
      tripId: newTripId,
      paidBy: memberIdMap.get(e.paidBy) ?? e.paidBy,
      participantIds: e.participantIds.map((id) => memberIdMap.get(id) ?? id),
    });
  }

  for (const p of demoPolls) {
    const newTripId = tripIdMap.get(p.tripId);
    if (!newTripId) continue;
    await insertPoll({ ...p, id: newId(), tripId: newTripId, createdBy: memberIdMap.get(p.createdBy) ?? p.createdBy });
  }

  for (const m of demoMessages) {
    const newTripId = tripIdMap.get(m.tripId);
    if (!newTripId) continue;
    await insertMessageRow({ ...m, id: newId(), tripId: newTripId, senderId: memberIdMap.get(m.senderId) ?? m.senderId });
  }

  for (const d of demoDocuments) {
    const newTripId = tripIdMap.get(d.tripId);
    if (!newTripId) continue;
    await insertDocumentRow({ ...d, id: newId(), tripId: newTripId });
  }

  for (const n of demoNotifications) {
    await insertNotificationRow(userId, { ...n, id: newId(), tripId: n.tripId ? tripIdMap.get(n.tripId) : undefined });
  }

  for (const s of demoSavedPlaces) {
    await insertSavedPlaceRow({ ...s, id: newId(), userId });
  }
}

// ---------------------------------------------------------------------------
// Load everything for a signed-in user in one go.
// ---------------------------------------------------------------------------

export async function loadAllUserData(userId: string) {
  const profile = await fetchProfile(userId);
  const trips = await fetchTrips(userId);
  const tripIds = trips.map((t) => t.id);

  const [members, itinerary, expenses, polls, messages, documents, notifications, savedPlaces] = await Promise.all([
    fetchMembersForTrips(tripIds),
    fetchItineraryForTrips(tripIds),
    fetchExpensesForTrips(tripIds),
    fetchPollsForTrips(tripIds),
    fetchMessagesForTrips(tripIds),
    fetchDocumentsForTrips(tripIds),
    fetchNotifications(userId),
    fetchSavedPlaces(userId),
  ]);

  return { profile, trips, members, itinerary, expenses, polls, messages, documents, notifications, savedPlaces };
}
