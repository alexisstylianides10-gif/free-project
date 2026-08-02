import {
  AIPreview,
  Expense,
  ExplorePlace,
  ItineraryItem,
  ItineraryPreviewChange,
  Trip,
  TripMember,
} from "./types";
import { addDaysISO, daysBetween, formatMoney, todayISO, uid } from "./utils";

export interface TripAIContext {
  trip: Trip;
  members: TripMember[];
  items: ItineraryItem[];
  expenses: Expense[];
  catalog: ExplorePlace[];
}

export interface AIReply {
  content: string;
  preview?: AIPreview;
}

// ---------------------------------------------------------------------------
// time helpers
// ---------------------------------------------------------------------------

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function clampToTrip(trip: Trip, date: string): string {
  if (date < trip.startDate) return trip.startDate;
  if (date > trip.endDate) return trip.endDate;
  return date;
}

/** The date "today" refers to for this trip's planning purposes: real today if the
 * trip is underway, otherwise the first day that has no itinerary items yet. */
function anchorDate(ctx: TripAIContext): string {
  const today = todayISO();
  if (today >= ctx.trip.startDate && today <= ctx.trip.endDate) return today;
  const byDate = new Map<string, number>();
  for (const item of ctx.items) byDate.set(item.date, (byDate.get(item.date) ?? 0) + 1);
  let d = ctx.trip.startDate;
  while (d <= ctx.trip.endDate) {
    if (!byDate.get(d)) return d;
    d = addDaysISO(d, 1);
  }
  return ctx.trip.startDate;
}

function resolveDateFromQuery(q: string, ctx: TripAIContext): string {
  const anchor = anchorDate(ctx);
  if (/\btomorrow\b/.test(q)) return clampToTrip(ctx.trip, addDaysISO(anchor, 1));
  if (/\btoday\b/.test(q)) return anchor;
  const dayMatch = q.match(/day\s*(\d+)/);
  if (dayMatch) return clampToTrip(ctx.trip, addDaysISO(ctx.trip.startDate, Number(dayMatch[1]) - 1));
  for (const city of ctx.trip.cities) {
    if (q.includes(city.toLowerCase())) {
      const item = ctx.items.find((i) => i.location?.toLowerCase().includes(city.toLowerCase()));
      if (item) return item.date;
    }
  }
  return anchor;
}

function dayLabel(trip: Trip, date: string): string {
  const dayNum = daysBetween(trip.startDate, date) + 1;
  return `Day ${dayNum}`;
}

function cityForDate(ctx: TripAIContext, date: string): string {
  const item = ctx.items.find((i) => i.date === date && i.location);
  if (item?.location) {
    for (const city of ctx.trip.cities) {
      if (item.location.toLowerCase().includes(city.toLowerCase())) return city;
    }
  }
  // Fall back to proportional position in the trip's city order.
  const totalDays = daysBetween(ctx.trip.startDate, ctx.trip.endDate) + 1;
  const dayIndex = daysBetween(ctx.trip.startDate, date);
  const cityIndex = Math.min(ctx.trip.cities.length - 1, Math.floor((dayIndex / Math.max(1, totalDays - 1)) * ctx.trip.cities.length));
  return ctx.trip.cities[cityIndex] ?? ctx.trip.cities[0];
}

const DENSITY: Record<Trip["travelStyle"], number> = { Relaxed: 3, Balanced: 4, Packed: 6 };

// ---------------------------------------------------------------------------
// 1 & 6. Generate / regenerate a day's itinerary
// ---------------------------------------------------------------------------

export function generateDay(ctx: TripAIContext, date: string): ItineraryItem[] {
  const city = cityForDate(ctx, date);
  const interests = new Set(ctx.trip.interests.map((i) => i.toLowerCase()));
  const places = ctx.catalog
    .filter((p) => p.city === city)
    .sort((a, b) => {
      const aMatch = interests.has(a.category.toLowerCase()) ? 1 : 0;
      const bMatch = interests.has(b.category.toLowerCase()) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.rating - a.rating;
    });

  const restaurants = places.filter((p) => p.category === "Food");
  const activities = places.filter((p) => p.category !== "Food");
  const slotCount = DENSITY[ctx.trip.travelStyle];

  const blocks = (
    [
      { start: "10:00", end: "12:00", kind: "activity" },
      { start: "12:30", end: "13:30", kind: "restaurant" },
      { start: "14:00", end: "16:30", kind: "activity" },
      { start: "16:30", end: "18:30", kind: "activity" },
      { start: "19:00", end: "20:30", kind: "restaurant" },
      { start: "21:00", end: "22:30", kind: "activity" },
    ] as const
  ).slice(0, slotCount);

  let restaurantIdx = 0;
  let activityIdx = 0;
  const generated: ItineraryItem[] = [];
  blocks.forEach((block, i) => {
    const place = block.kind === "restaurant" ? restaurants[restaurantIdx++] : activities[activityIdx++];
    if (!place) return;
    generated.push({
      id: uid("it"),
      tripId: ctx.trip.id,
      date,
      startTime: block.start,
      endTime: block.end,
      type: block.kind === "restaurant" ? "restaurant" : "activity",
      name: place.name,
      emoji: place.emoji,
      location: place.location,
      description: place.description,
      cost: place.price === "€" ? 15 : place.price === "€€" ? 35 : 70,
      participantIds: ctx.members.map((m) => m.id),
      aiGenerated: true,
      order: i,
      mapX: 30 + i * 8,
      mapY: 30 + (i % 3) * 10,
    });
  });

  return generated;
}

export function planDay(ctx: TripAIContext, query: string): AIReply {
  const date = resolveDateFromQuery(query, ctx);
  const existing = ctx.items.filter((i) => i.date === date);
  const generated = generateDay(ctx, date);

  if (generated.length === 0) {
    return { content: `I don't have enough places catalogued for ${cityForDate(ctx, date)} yet to build ${dayLabel(ctx.trip, date)} — try adding a few favorites in Explore first.` };
  }

  const changes: ItineraryPreviewChange[] = [
    ...existing.filter((i) => i.type !== "flight" && i.type !== "hotel").map((i) => ({ kind: "remove" as const, item: i })),
    ...generated.map((i) => ({ kind: "add" as const, item: i })),
  ];

  return {
    content: `Here's what I'd plan for ${dayLabel(ctx.trip, date)} in ${cityForDate(ctx, date)}, based on your group's interest in ${ctx.trip.interests.join(", ") || "a bit of everything"}.`,
    preview: {
      id: uid("preview"),
      summary: `Rebuild ${dayLabel(ctx.trip, date)} (${date}) with ${generated.length} stops`,
      changes,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Modify itinerary — "make tomorrow cheaper"
// ---------------------------------------------------------------------------

export function makeCheaper(ctx: TripAIContext, query: string): AIReply {
  const date = resolveDateFromQuery(query, ctx);
  const dayItems = ctx.items.filter((i) => i.date === date && i.type !== "flight" && i.type !== "hotel" && (i.cost ?? 0) > 0);
  if (dayItems.length === 0) {
    return { content: `${dayLabel(ctx.trip, date)} doesn't have any paid activities I can trim — it's already budget-friendly.` };
  }

  const sorted = [...dayItems].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
  const target = sorted[0];
  const city = cityForDate(ctx, date);
  const wantsFood = target.type === "restaurant";
  const cheaperAlt = ctx.catalog
    .filter((p) => p.city === city && (p.category === "Food") === wantsFood && p.price === "€")
    .find((p) => p.name !== target.name);

  const savedAmount = Math.round((target.cost ?? 0) * 0.5);
  const edited: ItineraryItem = cheaperAlt
    ? { ...target, name: cheaperAlt.name, emoji: cheaperAlt.emoji, location: cheaperAlt.location, description: cheaperAlt.description, cost: 15, aiGenerated: true }
    : { ...target, cost: Math.max(0, (target.cost ?? 0) - savedAmount), aiGenerated: true };

  return {
    content: `To make ${dayLabel(ctx.trip, date)} cheaper, I'd swap "${target.name}" (${formatMoney(target.cost ?? 0, ctx.trip.currency)}) for something lighter on the budget — saving roughly ${formatMoney((target.cost ?? 0) - (edited.cost ?? 0), ctx.trip.currency)}.`,
    preview: {
      id: uid("preview"),
      summary: `Reduce cost on ${dayLabel(ctx.trip, date)}`,
      changes: [{ kind: "edit", item: edited, previousItem: target }],
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Add a specific place — "Add Disneyland"
// ---------------------------------------------------------------------------

export function addPlace(ctx: TripAIContext, query: string): AIReply {
  const match = query.match(/add\s+(.+)/i);
  const rawName = match ? match[1].trim().replace(/\.$/, "") : query.trim();
  if (!rawName) return { content: "Tell me what you'd like to add, e.g. \"Add Disneyland\"." };

  const cataloged = ctx.catalog.find((p) => p.name.toLowerCase().includes(rawName.toLowerCase()));
  const anchor = anchorDate(ctx);
  const targetDate = anchor;
  const dayItems = ctx.items.filter((i) => i.date === targetDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const lastEnd = dayItems.length ? toMinutes(dayItems[dayItems.length - 1].endTime) : toMinutes("10:00");
  const start = toHHMM(Math.min(lastEnd + 30, toMinutes("20:00")));
  const end = toHHMM(Math.min(toMinutes(start) + 120, toMinutes("22:30")));

  const newItem: ItineraryItem = {
    id: uid("it"),
    tripId: ctx.trip.id,
    date: targetDate,
    startTime: start,
    endTime: end,
    type: "activity",
    name: cataloged?.name ?? capitalize(rawName),
    emoji: cataloged?.emoji ?? "📍",
    location: cataloged?.location,
    description: cataloged?.description ?? "Added from your request — fill in details as you like.",
    cost: cataloged ? (cataloged.price === "€" ? 15 : cataloged.price === "€€" ? 35 : 70) : undefined,
    participantIds: ctx.members.map((m) => m.id),
    aiGenerated: true,
    order: dayItems.length,
  };

  return {
    content: `I'll add "${newItem.name}" to ${dayLabel(ctx.trip, targetDate)} at ${start}.`,
    preview: {
      id: uid("preview"),
      summary: `Add "${newItem.name}" to ${dayLabel(ctx.trip, targetDate)}`,
      changes: [{ kind: "add", item: newItem }],
    },
  };
}

// ---------------------------------------------------------------------------
// 4. Recommend activities / restaurants (no itinerary change, just a suggestion)
// ---------------------------------------------------------------------------

export function recommendNearby(ctx: TripAIContext, query: string): AIReply {
  const anchor = anchorDate(ctx);
  const city = cityForDate(ctx, anchor);
  const wantsFood = /food|eat|restaurant|hungry/.test(query);
  const interests = new Set(ctx.trip.interests.map((i) => i.toLowerCase()));

  const pool = ctx.catalog
    .filter((p) => p.city === city)
    .filter((p) => (wantsFood ? p.category === "Food" : true))
    .filter((p) => !ctx.items.some((i) => i.name === p.name))
    .sort((a, b) => {
      const aMatch = interests.has(a.category.toLowerCase()) ? 1 : 0;
      const bMatch = interests.has(b.category.toLowerCase()) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.rating - a.rating;
    });

  const picks = pool.slice(0, 3);
  if (picks.length === 0) {
    return { content: `I've already worked most of ${city}'s highlights into your itinerary — check Explore for more ideas.` };
  }

  const lines = picks.map((p) => `${p.emoji} ${p.name} — ${p.rating}★, ${p.price}, ${p.distanceKm.toFixed(1)}km away`).join("\n");
  return {
    content: `Here's what I'd recommend in ${city}:\n${lines}\n\nWant me to add one to your itinerary? Just say "Add ${picks[0].name}".`,
  };
}

// ---------------------------------------------------------------------------
// 5. Detect conflicts
// ---------------------------------------------------------------------------

export interface Conflict {
  id: string;
  message: string;
  itemIds: string[];
  severity: "warning" | "critical";
}

export function detectConflicts(items: ItineraryItem[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const byDate = new Map<string, ItineraryItem[]>();
  for (const item of items) {
    const list = byDate.get(item.date) ?? [];
    list.push(item);
    byDate.set(item.date, list);
  }

  for (const [, dayItems] of byDate) {
    const sorted = [...dayItems].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      const curEnd = toMinutes(cur.endTime);
      const nextStart = toMinutes(next.startTime);
      if (nextStart < curEnd) {
        conflicts.push({
          id: uid("conflict"),
          message: `"${cur.name}" overlaps with "${next.name}".`,
          itemIds: [cur.id, next.id],
          severity: "critical",
        });
      } else if (
        cur.location &&
        next.location &&
        cur.location !== next.location &&
        nextStart - curEnd < 30 &&
        cur.type !== "flight" &&
        next.type !== "flight" &&
        cur.type !== "transport" &&
        next.type !== "transport"
      ) {
        conflicts.push({
          id: uid("conflict"),
          message: `Only ${nextStart - curEnd} minutes between "${cur.name}" and "${next.name}" — you may not have enough travel time.`,
          itemIds: [cur.id, next.id],
          severity: "warning",
        });
      }
    }
  }
  return conflicts;
}

// ---------------------------------------------------------------------------
// 6. Optimize a day — compact schedule, add free time in big gaps
// ---------------------------------------------------------------------------

export function optimizeDay(ctx: TripAIContext, date: string): AIReply {
  const dayItems = ctx.items.filter((i) => i.date === date).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  if (dayItems.length < 2) return { content: `${dayLabel(ctx.trip, date)} is already light — nothing to optimize.` };

  const changes: ItineraryPreviewChange[] = [];
  for (let i = 0; i < dayItems.length - 1; i++) {
    const cur = dayItems[i];
    const next = dayItems[i + 1];
    const gap = toMinutes(next.startTime) - toMinutes(cur.endTime);
    if (gap >= 120) {
      changes.push({
        kind: "add",
        item: {
          id: uid("it"),
          tripId: ctx.trip.id,
          date,
          startTime: cur.endTime,
          endTime: next.startTime,
          type: "free_time",
          name: "Free time",
          emoji: "☕",
          participantIds: ctx.members.map((m) => m.id),
          aiGenerated: true,
          order: cur.order + 0.5,
        },
      });
    }
  }

  if (changes.length === 0) {
    return { content: `${dayLabel(ctx.trip, date)} is already well-paced — no big gaps or overlaps found.` };
  }

  return {
    content: `I found ${changes.length} gap${changes.length > 1 ? "s" : ""} of 2+ hours on ${dayLabel(ctx.trip, date)} and added free time blocks so the day doesn't feel rushed or empty.`,
    preview: { id: uid("preview"), summary: `Optimize ${dayLabel(ctx.trip, date)}`, changes },
  };
}

// ---------------------------------------------------------------------------
// 7. Answer trip questions (grounded in trip data unless recommendations are asked for)
// ---------------------------------------------------------------------------

function isRecommendationQuery(q: string): boolean {
  return /recommend|suggest|what should|find (me |us )?(something|somewhere)|fun near|any ideas|what.*fun/.test(q);
}

export function answerTripAI(query: string, ctx: TripAIContext): AIReply {
  const q = query.trim().toLowerCase();
  if (!q) return { content: "Ask me to plan a day, recommend something nearby, or make changes to your itinerary." };

  if (/^plan\s|plan (tomorrow|today|day)/.test(q)) return planDay(ctx, q);
  if (/cheaper|reduce (the )?cost|save money|lower budget/.test(q)) return makeCheaper(ctx, q);
  if (/^add\s+\w/.test(q)) return addPlace(ctx, q);
  if (/optimi[sz]e/.test(q)) return optimizeDay(ctx, resolveDateFromQuery(q, ctx));
  if (/conflict|overlap/.test(q)) {
    const conflicts = detectConflicts(ctx.items);
    if (conflicts.length === 0) return { content: "No conflicts found — your itinerary looks clean." };
    return { content: conflicts.map((c) => `⚠️ ${c.message}`).join("\n") };
  }
  if (isRecommendationQuery(q)) return recommendNearby(ctx, q);

  if (/travel.*(30|minute)|don.?t want to travel/.test(q)) {
    return { content: "Got it — I'll keep activities close together and flag anything with a longer gap as a possible conflict." };
  }

  if (/(we like|i like|into)\s+.+/.test(q)) {
    const likes = q.replace(/^(we|i)\s+(like|love|are into)\s+/, "");
    return { content: `Noted — I'll lean toward ${likes} when planning or recommending things for this trip. Try asking me to "plan tomorrow" to see it in action.` };
  }

  // Grounded Q&A over existing trip data.
  if (/tomorrow|today|what.*(doing|plan)/.test(q)) {
    const date = resolveDateFromQuery(q, ctx);
    const dayItems = ctx.items.filter((i) => i.date === date).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    if (dayItems.length === 0) return { content: `Nothing is planned for ${dayLabel(ctx.trip, date)} yet — want me to plan it?` };
    const lines = dayItems.map((i) => `${i.startTime} ${i.emoji} ${i.name}`).join("\n");
    return { content: `${dayLabel(ctx.trip, date)} you have:\n${lines}` };
  }

  if (/spen|expense|cost|budget/.test(q)) {
    const total = ctx.expenses.reduce((s, e) => s + e.amount, 0);
    const byCat = new Map<string, number>();
    for (const e of ctx.expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    const budgetLine = ctx.trip.budget ? ` Your budget is ${formatMoney(ctx.trip.budget, ctx.trip.currency)}.` : "";
    return { content: `You've spent ${formatMoney(total, ctx.trip.currency)} so far. The biggest category is ${top?.[0] ?? "—"} at ${formatMoney(top?.[1] ?? 0, ctx.trip.currency)}.${budgetLine}` };
  }

  if (/who|travelers|people|going/.test(q)) {
    const names = ctx.members.map((m) => `${m.name}${m.role === "Organizer" ? " (Organizer)" : ""}`).join(", ");
    return { content: `${ctx.members.length} travelers on this trip: ${names}.` };
  }

  return {
    content:
      "I looked through your itinerary, expenses, and group, but couldn't match that yet. Try \"plan tomorrow\", \"find something fun near our hotel\", or \"make tomorrow cheaper\".",
  };
}

function capitalize(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Booking import — simulated extraction (no OCR/LLM backend wired up yet;
// this deterministically fills realistic fields per document type so the
// import → review → add flow works end-to-end).
// ---------------------------------------------------------------------------

export type BookingKind = "flight" | "hotel" | "restaurant" | "car" | "activity" | "train" | "other";

export function extractBooking(kind: BookingKind, fileName: string): Record<string, string> {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
  switch (kind) {
    case "flight":
      return {
        Airline: "Emirates",
        Flight: "EK123",
        Departure: "Apr 12 — 10:30",
        Arrival: "Apr 12 — 21:15",
        Airport: "Dubai (DXB)",
      };
    case "hotel":
      return {
        Hotel: base || "Shibuya Sky Hotel",
        "Check-in": "Apr 12 — 15:00",
        "Check-out": "Apr 15 — 11:00",
        Address: "1-1 Shibuya, Tokyo",
        Confirmation: "HTL" + Math.floor(100000 + Math.random() * 900000),
      };
    case "restaurant":
      return {
        Restaurant: base || "Sushi House",
        Date: "Apr 12 — 19:00",
        Party: "5 people",
        Confirmation: "RES" + Math.floor(1000 + Math.random() * 9000),
      };
    case "car":
      return {
        Provider: "Toyota Rent-a-Car",
        "Pick-up": "Apr 15 — 10:00",
        "Drop-off": "Apr 18 — 10:00",
        Location: "Kyoto Station",
      };
    case "train":
      return {
        Line: "Nozomi Shinkansen",
        Train: "NOZOMI 223",
        Departure: "Apr 15 — 10:15",
        Arrival: "Apr 15 — 12:45",
        Route: "Tokyo → Kyoto",
      };
    case "activity":
      return {
        Activity: base || "Universal Studios Japan",
        Date: "Apr 18 — 09:00",
        Tickets: "5 tickets",
      };
    default:
      return { Document: base || fileName, Date: "Apr 12" };
  }
}
