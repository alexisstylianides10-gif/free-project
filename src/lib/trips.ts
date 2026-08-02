import { Expense, ItineraryItem, Trip, TripDocument } from "./types";
import { addDaysISO, daysBetween } from "./utils";

export function tripDayDates(trip: Trip): string[] {
  const days: string[] = [];
  let d = trip.startDate;
  while (d <= trip.endDate) {
    days.push(d);
    d = addDaysISO(d, 1);
  }
  return days;
}

export function tripDurationLabel(trip: Trip): string {
  const nights = daysBetween(trip.startDate, trip.endDate);
  return `${nights + 1} day${nights === 0 ? "" : "s"}`;
}

/** A rough "how ready is this trip" score, used for the progress bar on trip cards. */
export function planningProgress(trip: Trip, items: ItineraryItem[], memberCount: number, documents: TripDocument[], expenses: Expense[]): number {
  let score = 0;
  if (memberCount > 1) score += 15;
  const days = tripDayDates(trip);
  const plannedDays = days.filter((d) => items.some((i) => i.date === d)).length;
  score += Math.round((plannedDays / Math.max(1, days.length)) * 60);
  if (documents.length > 0) score += 15;
  if (expenses.length > 0) score += 10;
  return Math.min(100, score);
}

export function inviteCode(trip: Trip): string {
  return trip.id.slice(-6).toUpperCase();
}
