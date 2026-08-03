"use client";

import { create } from "zustand";
import {
  CURRENT_USER_ID,
  demoDocuments,
  demoExpenses,
  demoExplorePlaces,
  demoItinerary,
  demoMessages,
  demoNotifications,
  demoPolls,
  demoProfile,
  demoSavedPlaces,
  demoTripMembers,
  demoTrips,
} from "./demoData";
import {
  AIChatEntry,
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
import { answerTripAI, TripAIContext } from "./tripAI";
import { appBaseUrl, newId, todayISO, uid } from "./utils";
import { isSupabaseConfigured, supabase } from "./supabase/client";
import * as db from "./db";

export type AuthStatus = "checking" | "signed_out" | "signed_in";
export const backendConfigured = isSupabaseConfigured;

interface TriplyState {
  hydrated: boolean;
  currentUserId: string;
  profile: Profile;
  trips: Trip[];
  members: TripMember[];
  itinerary: ItineraryItem[];
  expenses: Expense[];
  polls: Poll[];
  messages: Message[];
  documents: TripDocument[];
  notifications: AppNotification[];
  savedPlaces: SavedPlace[];
  explorePlaces: ExplorePlace[];
  aiConversations: Record<string, AIChatEntry[]>;
  aiPlannerTripId: string | null;
  chatTripId: string | null;

  authStatus: AuthStatus;
  authUserId: string | null;
  authEmail: string | null;
  authError: string | null;
  authInfo: string | null;
  authBusy: boolean;
  dataLoading: boolean;

  setHydrated: () => void;
  openAIPlanner: (tripId: string) => void;
  closeAIPlanner: () => void;
  openChat: (tripId: string) => void;
  closeChat: () => void;

  initAuth: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: "apple" | "google") => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;

  createTrip: (input: {
    name: string;
    countryFlag: string;
    cities: string[];
    startDate: string;
    endDate: string;
    coverGradient: string;
    coverEmoji: string;
    budget?: number;
    currency: string;
    interests: string[];
    foodPreferences: string[];
    travelStyle: Trip["travelStyle"];
  }) => Trip;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  joinTripByCode: (code: string) => Trip | null;

  inviteMember: (tripId: string, input: { name: string; email?: string }) => TripMember;
  removeMember: (memberId: string) => void;
  updateMemberRole: (memberId: string, role: TripMember["role"]) => void;
  setResponsibility: (memberId: string, responsibility: string) => void;

  addItineraryItem: (item: Omit<ItineraryItem, "id">) => ItineraryItem;
  updateItineraryItem: (id: string, patch: Partial<ItineraryItem>) => void;
  deleteItineraryItem: (id: string) => void;
  duplicateItineraryItem: (id: string) => void;
  moveItineraryItem: (id: string, date: string) => void;
  reorderItineraryItem: (id: string, direction: "up" | "down") => void;

  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  deleteExpense: (id: string) => void;

  createPoll: (tripId: string, question: string, options: { text: string; emoji?: string }[]) => Poll;
  voteOnPoll: (pollId: string, optionId: string, memberId: string) => void;
  closePoll: (pollId: string) => void;
  addPollResultToItinerary: (pollId: string, item: Omit<ItineraryItem, "id">) => void;

  sendMessage: (tripId: string, content: string, senderId: string) => void;

  addDocument: (tripId: string, doc: Omit<TripDocument, "id" | "tripId" | "uploadedAt" | "addedToItinerary">) => TripDocument;
  applyDocumentToItinerary: (docId: string, item: Omit<ItineraryItem, "id">) => void;

  markNotificationRead: (id: string) => void;
  addNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;

  toggleSavedPlace: (place: ExplorePlace) => void;

  askTripAI: (tripId: string, query: string) => void;
  acceptPreview: (tripId: string, entryId: string) => void;
  rejectPreview: (tripId: string, entryId: string) => void;

  updateProfile: (patch: Partial<Profile>) => void;
}

function reportSyncError(context: string, err: unknown) {
  console.error(`[Triply sync] ${context} failed:`, err);
}

export const useTriply = create<TriplyState>((set, get) => {
  function synced(): string | null {
    const s = get();
    return backendConfigured && s.authStatus === "signed_in" ? s.authUserId : null;
  }

  function currentMemberId(tripId: string): string | undefined {
    const s = get();
    return s.members.find((m) => m.tripId === tripId && m.userId === s.currentUserId)?.id;
  }

  return {
    hydrated: false,
    currentUserId: CURRENT_USER_ID,
    profile: demoProfile,
    trips: demoTrips,
    members: demoTripMembers,
    itinerary: demoItinerary,
    expenses: demoExpenses,
    polls: demoPolls,
    messages: demoMessages,
    documents: demoDocuments,
    notifications: demoNotifications,
    savedPlaces: demoSavedPlaces,
    explorePlaces: demoExplorePlaces,
    aiConversations: {},
    aiPlannerTripId: null,
    chatTripId: null,

    authStatus: backendConfigured ? "checking" : "signed_out",
    authUserId: null,
    authEmail: null,
    authError: null,
    authInfo: null,
    authBusy: false,
    dataLoading: false,

    setHydrated: () => set({ hydrated: true }),
    openAIPlanner: (tripId) => set({ aiPlannerTripId: tripId }),
    closeAIPlanner: () => set({ aiPlannerTripId: null }),
    openChat: (tripId) => set({ chatTripId: tripId }),
    closeChat: () => set({ chatTripId: null }),

    initAuth: async () => {
      if (!backendConfigured || !supabase) {
        set({ authStatus: "signed_out" });
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await handleSignedIn(session.user.id, session.user.email ?? "");
      } else {
        set({ authStatus: "signed_out" });
      }

      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          set({ authStatus: "signed_out", authUserId: null, authEmail: null, hydrated: false });
        }
      });

      async function handleSignedIn(userId: string, email: string) {
        set({ authStatus: "signed_in", authUserId: userId, authEmail: email, dataLoading: true, authError: null, currentUserId: userId });
        try {
          const seeded = await db.isAccountSeeded(userId);
          if (!seeded) {
            await db.seedAccountWithDemoData(userId);
            await db.markAccountSeeded(userId);
          }
          const all = await db.loadAllUserData(userId);
          set({
            profile: all.profile ?? { ...demoProfile, id: userId, name: email.split("@")[0] || "You", email, avatarInitials: (email[0] ?? "U").toUpperCase() },
            trips: all.trips,
            members: all.members,
            itinerary: all.itinerary,
            expenses: all.expenses,
            polls: all.polls,
            messages: all.messages,
            documents: all.documents,
            notifications: all.notifications,
            savedPlaces: all.savedPlaces,
            dataLoading: false,
            hydrated: true,
          });
        } catch (err) {
          reportSyncError("load account data", err);
          set({ dataLoading: false, authError: err instanceof Error ? err.message : "Couldn't load your data." });
        }
      }

      handleSignedInRef.current = handleSignedIn;
    },

    signUp: async (email, password, name) => {
      if (!supabase) return;
      set({ authBusy: true, authError: null });
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) {
        set({ authBusy: false, authError: error.message });
        return;
      }
      if (data.session) {
        await handleSignedInRef.current?.(data.session.user.id, data.session.user.email ?? email);
      } else {
        set({ authInfo: "Check your email to confirm your account, then sign in." });
      }
      set({ authBusy: false });
    },

    signIn: async (email, password) => {
      if (!supabase) return;
      set({ authBusy: true, authError: null });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ authBusy: false, authError: error.message });
        return;
      }
      await handleSignedInRef.current?.(data.user.id, data.user.email ?? email);
      set({ authBusy: false });
    },

    signInWithProvider: async (provider) => {
      if (!supabase) {
        set({ authError: "Connect a Supabase project with this provider enabled to use social sign-in." });
        return;
      }
      set({ authBusy: true, authError: null });
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: appBaseUrl() } });
      if (error) set({ authError: error.message });
      set({ authBusy: false });
    },

    resetPassword: async (email) => {
      if (!supabase) {
        set({ authError: "Connect a Supabase project to enable password resets." });
        return;
      }
      set({ authBusy: true, authError: null, authInfo: null });
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appBaseUrl() });
      if (error) set({ authError: error.message });
      else set({ authInfo: "Password reset email sent — check your inbox." });
      set({ authBusy: false });
    },

    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
      set({ authStatus: "signed_out", authUserId: null, authEmail: null, hydrated: false, currentUserId: CURRENT_USER_ID });
    },

    createTrip: (input) => {
      const trip: Trip = {
        id: newId(),
        ...input,
        ownerId: get().currentUserId,
        createdAt: new Date().toISOString(),
      };
      const organizer: TripMember = {
        id: newId(),
        tripId: trip.id,
        userId: get().currentUserId,
        name: get().profile.name,
        avatarInitials: get().profile.avatarInitials,
        role: "Organizer",
        status: "joined",
        joinedAt: new Date().toISOString(),
      };
      set((s) => ({ trips: [trip, ...s.trips], members: [...s.members, organizer] }));
      const uidVal = synced();
      if (uidVal) {
        db.insertTrip(trip).catch((e) => reportSyncError("create trip", e));
        db.insertMember(organizer).catch((e) => reportSyncError("add organizer", e));
      }
      return trip;
    },

    updateTrip: (id, patch) => {
      set((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      if (synced()) db.updateTripRow(id, patch).catch((e) => reportSyncError("update trip", e));
    },

    joinTripByCode: (code) => {
      const normalized = code.trim().toUpperCase();
      const trip = get().trips.find((t) => t.id.slice(-6).toUpperCase() === normalized || t.name.toUpperCase() === normalized);
      if (!trip) return null;
      const already = get().members.some((m) => m.tripId === trip.id && m.userId === get().currentUserId);
      if (!already) {
        const member: TripMember = {
          id: newId(),
          tripId: trip.id,
          userId: get().currentUserId,
          name: get().profile.name,
          avatarInitials: get().profile.avatarInitials,
          role: "Traveler",
          status: "joined",
          joinedAt: new Date().toISOString(),
        };
        set((s) => ({ members: [...s.members, member] }));
        if (synced()) db.insertMember(member).catch((e) => reportSyncError("join trip", e));
      }
      return trip;
    },

    inviteMember: (tripId, input) => {
      const member: TripMember = {
        id: newId(),
        tripId,
        userId: newId(),
        name: input.name,
        avatarInitials: input.name.slice(0, 2).toUpperCase(),
        role: "Traveler",
        status: "joined",
        joinedAt: new Date().toISOString(),
      };
      set((s) => ({ members: [...s.members, member] }));
      const uidVal = synced();
      if (uidVal) db.insertMember(member).catch((e) => reportSyncError("invite member", e));
      get().addNotification({ tripId, title: `👥 ${input.name} joined your trip`, body: `${input.name} was added to your trip.`, kind: "member" });
      return member;
    },

    removeMember: (memberId) => {
      set((s) => ({ members: s.members.filter((m) => m.id !== memberId) }));
      if (synced()) db.deleteMemberRow(memberId).catch((e) => reportSyncError("remove member", e));
    },

    updateMemberRole: (memberId, role) => {
      set((s) => ({ members: s.members.map((m) => (m.id === memberId ? { ...m, role } : m)) }));
      if (synced()) db.updateMemberRow(memberId, { role }).catch((e) => reportSyncError("update role", e));
    },

    setResponsibility: (memberId, responsibility) => {
      set((s) => ({ members: s.members.map((m) => (m.id === memberId ? { ...m, responsibility } : m)) }));
      if (synced()) db.updateMemberRow(memberId, { responsibility }).catch((e) => reportSyncError("set responsibility", e));
    },

    addItineraryItem: (item) => {
      const newItem: ItineraryItem = { ...item, id: newId() };
      set((s) => ({ itinerary: [...s.itinerary, newItem] }));
      const uidVal = synced();
      if (uidVal) db.insertItineraryItem(newItem).catch((e) => reportSyncError("add itinerary item", e));
      return newItem;
    },

    updateItineraryItem: (id, patch) => {
      set((s) => ({ itinerary: s.itinerary.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
      if (synced()) db.updateItineraryRow(id, patch).catch((e) => reportSyncError("update itinerary item", e));
    },

    deleteItineraryItem: (id) => {
      set((s) => ({ itinerary: s.itinerary.filter((i) => i.id !== id) }));
      if (synced()) db.deleteItineraryRow(id).catch((e) => reportSyncError("delete itinerary item", e));
    },

    duplicateItineraryItem: (id) => {
      const existing = get().itinerary.find((i) => i.id === id);
      if (!existing) return;
      const copy: ItineraryItem = { ...existing, id: newId(), name: `${existing.name} (copy)` };
      set((s) => ({ itinerary: [...s.itinerary, copy] }));
      if (synced()) db.insertItineraryItem(copy).catch((e) => reportSyncError("duplicate itinerary item", e));
    },

    moveItineraryItem: (id, date) => {
      set((s) => ({ itinerary: s.itinerary.map((i) => (i.id === id ? { ...i, date } : i)) }));
      if (synced()) db.updateItineraryRow(id, { date }).catch((e) => reportSyncError("move itinerary item", e));
    },

    reorderItineraryItem: (id, direction) => {
      const item = get().itinerary.find((i) => i.id === id);
      if (!item) return;
      const sameDay = get()
        .itinerary.filter((i) => i.tripId === item.tripId && i.date === item.date)
        .sort((a, b) => a.order - b.order);
      const idx = sameDay.findIndex((i) => i.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sameDay.length) return;
      const other = sameDay[swapIdx];
      const aOrder = item.order;
      const bOrder = other.order;
      set((s) => ({
        itinerary: s.itinerary.map((i) => {
          if (i.id === item.id) return { ...i, order: bOrder };
          if (i.id === other.id) return { ...i, order: aOrder };
          return i;
        }),
      }));
      if (synced()) {
        db.updateItineraryRow(item.id, { order: bOrder }).catch((e) => reportSyncError("reorder item", e));
        db.updateItineraryRow(other.id, { order: aOrder }).catch((e) => reportSyncError("reorder item", e));
      }
    },

    addExpense: (expense) => {
      const newExpense: Expense = { ...expense, id: newId(), createdAt: new Date().toISOString() };
      set((s) => ({ expenses: [newExpense, ...s.expenses] }));
      if (synced()) db.insertExpenseRow(newExpense).catch((e) => reportSyncError("add expense", e));
    },

    deleteExpense: (id) => {
      set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
      if (synced()) db.deleteExpenseRow(id).catch((e) => reportSyncError("delete expense", e));
    },

    createPoll: (tripId, question, options) => {
      const poll: Poll = {
        id: newId(),
        tripId,
        question,
        status: "open",
        options: options.map((o) => ({ id: newId(), text: o.text, emoji: o.emoji })),
        votes: [],
        createdBy: currentMemberId(tripId) ?? get().currentUserId,
        createdAt: new Date().toISOString(),
      };
      set((s) => ({ polls: [poll, ...s.polls] }));
      if (synced()) db.insertPoll(poll).catch((e) => reportSyncError("create poll", e));
      get().addNotification({ tripId, title: `🗳️ New poll: ${question}`, body: "Cast your vote in the trip.", kind: "poll" });
      return poll;
    },

    voteOnPoll: (pollId, optionId, memberId) => {
      set((s) => ({
        polls: s.polls.map((p) => {
          if (p.id !== pollId) return p;
          const votes = p.votes.filter((v) => v.memberId !== memberId);
          votes.push({ pollId, optionId, memberId });
          return { ...p, votes };
        }),
      }));
      if (synced()) db.upsertVoteRow(pollId, optionId, memberId).catch((e) => reportSyncError("vote on poll", e));
    },

    closePoll: (pollId) => {
      set((s) => ({ polls: s.polls.map((p) => (p.id === pollId ? { ...p, status: "closed" } : p)) }));
      if (synced()) db.updatePollRow(pollId, { status: "closed" }).catch((e) => reportSyncError("close poll", e));
    },

    addPollResultToItinerary: (pollId, item) => {
      get().addItineraryItem(item);
      set((s) => ({ polls: s.polls.map((p) => (p.id === pollId ? { ...p, addedToItinerary: true } : p)) }));
      if (synced()) db.updatePollRow(pollId, { addedToItinerary: true }).catch((e) => reportSyncError("update poll", e));
    },

    sendMessage: (tripId, content, senderId) => {
      const message: Message = { id: newId(), tripId, senderId, content, kind: "text", createdAt: new Date().toISOString() };
      set((s) => ({ messages: [...s.messages, message] }));
      const uidVal = synced();
      if (uidVal) db.insertMessageRow(message).catch((e) => reportSyncError("send message", e));

      const looksLikeQuestion = /\?|^(what|who|when|where|how much|how many)\b/i.test(content.trim());
      if (looksLikeQuestion) {
        const s = get();
        const ctx: TripAIContext = {
          trip: s.trips.find((t) => t.id === tripId)!,
          members: s.members.filter((m) => m.tripId === tripId),
          items: s.itinerary.filter((i) => i.tripId === tripId),
          expenses: s.expenses.filter((e) => e.tripId === tripId),
          catalog: s.explorePlaces,
        };
        if (ctx.trip) {
          const reply = answerTripAI(content, ctx);
          const aiMessage: Message = { id: newId(), tripId, senderId: "ai", content: reply.content, kind: "ai", createdAt: new Date().toISOString() };
          set((st) => ({ messages: [...st.messages, aiMessage] }));
          if (uidVal) db.insertMessageRow(aiMessage).catch((e) => reportSyncError("save AI reply", e));
        }
      }
    },

    addDocument: (tripId, doc) => {
      const newDoc: TripDocument = { ...doc, id: newId(), tripId, addedToItinerary: false, uploadedAt: new Date().toISOString() };
      set((s) => ({ documents: [newDoc, ...s.documents] }));
      const uidVal = synced();
      if (uidVal) db.insertDocumentRow(newDoc).catch((e) => reportSyncError("add document", e));
      return newDoc;
    },

    applyDocumentToItinerary: (docId, item) => {
      get().addItineraryItem(item);
      set((s) => ({ documents: s.documents.map((d) => (d.id === docId ? { ...d, addedToItinerary: true } : d)) }));
      if (synced()) db.markDocumentAdded(docId).catch((e) => reportSyncError("mark document added", e));
    },

    markNotificationRead: (id) => {
      set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
      if (synced()) db.markNotificationReadRow(id).catch((e) => reportSyncError("mark notification read", e));
    },

    addNotification: (n) => {
      const newNotif: AppNotification = { ...n, id: newId(), createdAt: new Date().toISOString(), read: false };
      set((s) => ({ notifications: [newNotif, ...s.notifications] }));
      const uidVal = synced();
      if (uidVal) db.insertNotificationRow(uidVal, newNotif).catch((e) => reportSyncError("add notification", e));
    },

    toggleSavedPlace: (place) => {
      const existing = get().savedPlaces.find((p) => p.name === place.name);
      if (existing) {
        set((s) => ({ savedPlaces: s.savedPlaces.filter((p) => p.id !== existing.id) }));
        if (synced()) db.deleteSavedPlaceRow(existing.id).catch((e) => reportSyncError("unsave place", e));
        return;
      }
      const saved: SavedPlace = { id: newId(), userId: get().currentUserId, name: place.name, category: place.category, city: place.city, emoji: place.emoji };
      set((s) => ({ savedPlaces: [...s.savedPlaces, saved] }));
      if (synced()) db.insertSavedPlaceRow(saved).catch((e) => reportSyncError("save place", e));
    },

    askTripAI: (tripId, query) => {
      const userEntry: AIChatEntry = { id: uid("ai"), role: "user", content: query, createdAt: new Date().toISOString() };
      set((s) => ({ aiConversations: { ...s.aiConversations, [tripId]: [...(s.aiConversations[tripId] ?? []), userEntry] } }));

      const s = get();
      const ctx: TripAIContext = {
        trip: s.trips.find((t) => t.id === tripId)!,
        members: s.members.filter((m) => m.tripId === tripId),
        items: s.itinerary.filter((i) => i.tripId === tripId),
        expenses: s.expenses.filter((e) => e.tripId === tripId),
        catalog: s.explorePlaces,
      };
      const reply = answerTripAI(query, ctx);
      const aiEntry: AIChatEntry = { id: uid("ai"), role: "ai", content: reply.content, createdAt: new Date().toISOString(), preview: reply.preview };
      set((st) => ({ aiConversations: { ...st.aiConversations, [tripId]: [...(st.aiConversations[tripId] ?? []), aiEntry] } }));
    },

    acceptPreview: (tripId, entryId) => {
      const entry = get().aiConversations[tripId]?.find((e) => e.id === entryId);
      if (!entry?.preview) return;
      for (const change of entry.preview.changes) {
        if (change.kind === "add") get().addItineraryItem(change.item);
        else if (change.kind === "remove") get().deleteItineraryItem(change.item.id);
        else if (change.kind === "edit" && change.previousItem) get().updateItineraryItem(change.previousItem.id, change.item);
      }
      set((s) => ({
        aiConversations: {
          ...s.aiConversations,
          [tripId]: s.aiConversations[tripId].map((e) => (e.id === entryId ? { ...e, preview: undefined } : e)),
        },
      }));
    },

    rejectPreview: (tripId, entryId) => {
      set((s) => ({
        aiConversations: {
          ...s.aiConversations,
          [tripId]: s.aiConversations[tripId].map((e) => (e.id === entryId ? { ...e, preview: undefined } : e)),
        },
      }));
    },

    updateProfile: (patch) => {
      set((s) => ({ profile: { ...s.profile, ...patch } }));
      const uidVal = synced();
      if (uidVal) db.updateProfileRow(uidVal, patch).catch((e) => reportSyncError("update profile", e));
    },
  };
});

const handleSignedInRef: { current: ((userId: string, email: string) => Promise<void>) | null } = { current: null };

export function todayWithinTrip(startDate: string, endDate: string): boolean {
  const today = todayISO();
  return today >= startDate && today <= endDate;
}
