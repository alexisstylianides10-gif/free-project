"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { MessageCircle, Plus, Sparkles, UserPlus } from "lucide-react";
import { useTriply } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertCard } from "@/components/domain/AlertCard";
import { ItineraryItemRow } from "@/components/domain/ItineraryItemRow";
import { ItineraryItemModal, ItineraryItemDraft } from "@/components/domain/ItineraryItemModal";
import { MapView } from "@/components/domain/MapView";
import { MemberRow } from "@/components/domain/MemberRow";
import { InviteModal } from "@/components/domain/InviteModal";
import { ExpenseRow } from "@/components/domain/ExpenseRow";
import { AddExpenseModal } from "@/components/domain/AddExpenseModal";
import { BalanceCard } from "@/components/domain/BalanceCard";
import { PollCard } from "@/components/domain/PollCard";
import { CreatePollModal } from "@/components/domain/CreatePollModal";
import { BookingImportModal } from "@/components/domain/BookingImportModal";
import { ChatDrawer } from "@/components/domain/ChatDrawer";
import { AIPlannerDrawer } from "@/components/domain/AIPlannerDrawer";
import { ItineraryItem } from "@/lib/types";
import { computeBalances, totalByCategory, totalSpent } from "@/lib/expenses";
import { detectConflicts } from "@/lib/tripAI";
import { demoAlerts } from "@/lib/demoData";
import { tripDayDates } from "@/lib/trips";
import { formatDateRange, formatDayLabel, formatMoney, formatTime12, todayISO } from "@/lib/utils";

export default function TripPage() {
  return (
    <Suspense fallback={null}>
      <TripDashboard />
    </Suspense>
  );
}

function TripDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId");
  const autoOpenAI = searchParams.get("ai") === "1";

  const trips = useTriply((s) => s.trips);
  const members = useTriply((s) => s.members);
  const itinerary = useTriply((s) => s.itinerary);
  const expenses = useTriply((s) => s.expenses);
  const polls = useTriply((s) => s.polls);
  const messages = useTriply((s) => s.messages);
  const currentUserId = useTriply((s) => s.currentUserId);

  const addItineraryItem = useTriply((s) => s.addItineraryItem);
  const updateItineraryItem = useTriply((s) => s.updateItineraryItem);
  const deleteItineraryItem = useTriply((s) => s.deleteItineraryItem);
  const duplicateItineraryItem = useTriply((s) => s.duplicateItineraryItem);
  const reorderItineraryItem = useTriply((s) => s.reorderItineraryItem);
  const inviteMember = useTriply((s) => s.inviteMember);
  const removeMember = useTriply((s) => s.removeMember);
  const updateMemberRole = useTriply((s) => s.updateMemberRole);
  const addExpense = useTriply((s) => s.addExpense);
  const deleteExpense = useTriply((s) => s.deleteExpense);
  const createPoll = useTriply((s) => s.createPoll);
  const voteOnPoll = useTriply((s) => s.voteOnPoll);
  const closePoll = useTriply((s) => s.closePoll);
  const addPollResultToItinerary = useTriply((s) => s.addPollResultToItinerary);
  const sendMessage = useTriply((s) => s.sendMessage);
  const addDocument = useTriply((s) => s.addDocument);
  const applyDocumentToItinerary = useTriply((s) => s.applyDocumentToItinerary);
  const aiConversations = useTriply((s) => s.aiConversations);
  const aiPlannerTripId = useTriply((s) => s.aiPlannerTripId);
  const chatTripId = useTriply((s) => s.chatTripId);
  const openAIPlanner = useTriply((s) => s.openAIPlanner);
  const closeAIPlanner = useTriply((s) => s.closeAIPlanner);
  const openChat = useTriply((s) => s.openChat);
  const closeChat = useTriply((s) => s.closeChat);
  const askTripAI = useTriply((s) => s.askTripAI);
  const acceptPreview = useTriply((s) => s.acceptPreview);
  const rejectPreview = useTriply((s) => s.rejectPreview);

  const trip = trips.find((t) => t.id === tripId) ?? trips[0];
  const tripMembers = useMemo(() => members.filter((m) => m.tripId === trip?.id), [members, trip?.id]);
  const tripItems = useMemo(() => itinerary.filter((i) => i.tripId === trip?.id), [itinerary, trip?.id]);
  const tripExpenses = useMemo(() => expenses.filter((e) => e.tripId === trip?.id), [expenses, trip?.id]);
  const tripPolls = useMemo(() => polls.filter((p) => p.tripId === trip?.id), [polls, trip?.id]);
  const tripMessages = useMemo(() => messages.filter((m) => m.tripId === trip?.id), [messages, trip?.id]);
  const currentMemberId = tripMembers.find((m) => m.userId === currentUserId)?.id;
  const isOrganizer = tripMembers.find((m) => m.id === currentMemberId)?.role === "Organizer";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | undefined>(undefined);
  const [modalDate, setModalDate] = useState(todayISO());
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    if (autoOpenAI && trip) openAIPlanner(trip.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAI, trip?.id]);

  if (!trip) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-[14px] font-medium text-foreground">No trip found</p>
        <Button size="sm" onClick={() => router.push("/trips/create")}>
          Create a trip
        </Button>
      </Card>
    );
  }

  const conflicts = detectConflicts(tripItems);
  const staticAlerts = demoAlerts.filter((a) => a.tripId === trip.id);
  const alerts = [
    ...staticAlerts.map((a) => ({ message: a.message, severity: a.severity })),
    ...conflicts.map((c) => ({ message: c.message, severity: c.severity })),
  ];

  const sortedItems = [...tripItems].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.order - b.order);
  const today = todayISO();
  const upcomingItems = sortedItems.filter((i) => i.date >= today);
  const nextActivity = upcomingItems[0] ?? sortedItems[0];
  const restUpcoming = upcomingItems.filter((i) => i.id !== nextActivity?.id).slice(0, 3);
  const daysUntilStart = Math.max(0, Math.ceil((new Date(trip.startDate + "T00:00:00").getTime() - Date.now()) / 86400000));

  function openAddModal(date: string) {
    setEditingItem(undefined);
    setModalDate(date);
    setItemModalOpen(true);
  }
  function openEditModal(item: ItineraryItem) {
    setEditingItem(item);
    setModalDate(item.date);
    setItemModalOpen(true);
  }
  function submitItemModal(draft: ItineraryItemDraft) {
    const payload = {
      tripId: trip.id,
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      type: draft.type,
      name: draft.name,
      emoji: draft.emoji,
      location: draft.location || undefined,
      description: draft.description || undefined,
      cost: draft.cost ? Number(draft.cost) : undefined,
      notes: draft.notes || undefined,
      participantIds: draft.participantIds,
      order: editingItem?.order ?? tripItems.filter((i) => i.date === draft.date).length,
    };
    if (editingItem) updateItineraryItem(editingItem.id, payload);
    else addItineraryItem(payload);
  }

  const balances = computeBalances(tripExpenses, tripMembers, currentMemberId);
  const categoryTotals = totalByCategory(tripExpenses);
  const spent = totalSpent(tripExpenses);

  return (
    <div className="space-y-5 pb-16">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[20px] leading-none">{trip.countryFlag}</span>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{trip.name.toUpperCase()}</h1>
        </div>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {formatDateRange(trip.startDate, trip.endDate)} · {tripMembers.length} travelers
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-5">
          {daysUntilStart > 0 && today < trip.startDate && (
            <Card className="p-4 text-center">
              <p className="text-[13.5px] text-muted-foreground">
                <span className="text-[16px] font-semibold text-foreground">{daysUntilStart}</span> days until departure
              </p>
            </Card>
          )}

          {nextActivity && (
            <section>
              <SectionLabel>Next activity</SectionLabel>
              <Card className="mt-2 flex items-center gap-3 p-4">
                <span className="text-[22px] leading-none">{nextActivity.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-foreground">{nextActivity.name}</p>
                  <p className="text-[12.5px] text-muted-foreground">{formatTime12(nextActivity.startTime)}{nextActivity.location ? ` · ${nextActivity.location}` : ""}</p>
                </div>
              </Card>
            </section>
          )}

          {restUpcoming.length > 0 && (
            <section>
              <SectionLabel>Upcoming</SectionLabel>
              <Card className="mt-2 divide-y divide-border">
                {restUpcoming.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 p-3.5">
                    <span className="text-[16px] leading-none">{i.emoji}</span>
                    <span className="flex-1 truncate text-[13.5px] text-foreground">{i.name}</span>
                    <span className="text-[12.5px] text-muted-foreground">{formatTime12(i.startTime)}</span>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {alerts.length > 0 && (
            <section>
              <SectionLabel>Trip alerts</SectionLabel>
              <div className="mt-2 space-y-2">
                {alerts.map((a, i) => (
                  <AlertCard key={i} message={a.message} severity={a.severity} />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between">
              <SectionLabel>Polls</SectionLabel>
              <button onClick={() => setPollOpen(true)} className="text-[12.5px] font-medium text-accent hover:opacity-80">
                + New poll
              </button>
            </div>
            <div className="mt-2 space-y-2.5">
              {tripPolls.length === 0 && <p className="py-3 text-center text-[13px] text-muted-foreground">No polls yet — start one for your next group decision.</p>}
              {tripPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  currentMemberId={currentMemberId}
                  canClose={isOrganizer}
                  onVote={(optionId) => currentMemberId && voteOnPoll(poll.id, optionId, currentMemberId)}
                  onClose={() => closePoll(poll.id)}
                  onAddToItinerary={() => {
                    const winner = [...poll.options].sort(
                      (a, b) => poll.votes.filter((v) => v.optionId === b.id).length - poll.votes.filter((v) => v.optionId === a.id).length
                    )[0];
                    if (!winner) return;
                    addPollResultToItinerary(poll.id, {
                      tripId: trip.id,
                      date: today > trip.startDate ? today : trip.startDate,
                      startTime: "19:00",
                      endTime: "20:30",
                      type: "restaurant",
                      name: winner.text,
                      emoji: winner.emoji ?? "🎉",
                      participantIds: tripMembers.map((m) => m.id),
                      order: tripItems.length,
                    });
                  }}
                />
              ))}
            </div>
          </section>
        </TabsContent>

        {/* ITINERARY */}
        <TabsContent value="itinerary" className="mt-4 space-y-5">
          <div className="flex items-center justify-end">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setBookingOpen(true)}>
              Import booking
            </Button>
          </div>
          {tripDayDates(trip).map((date, dayIdx) => {
            const dayItems = sortedItems.filter((i) => i.date === date);
            return (
              <section key={date}>
                <div className="mb-2 flex items-center justify-between">
                  <SectionLabel>
                    Day {dayIdx + 1} — {formatDayLabel(date)}
                  </SectionLabel>
                  <button onClick={() => openAddModal(date)} className="flex items-center gap-1 text-[12.5px] font-medium text-accent hover:opacity-80">
                    <Plus className="h-3.5 w-3.5" /> Add activity
                  </button>
                </div>
                {dayItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border py-6 text-center text-[13px] text-muted-foreground">Nothing planned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {dayItems.map((item, idx) => (
                      <ItineraryItemRow
                        key={item.id}
                        item={item}
                        currency={trip.currency}
                        onEdit={() => openEditModal(item)}
                        onDelete={() => deleteItineraryItem(item.id)}
                        onDuplicate={() => duplicateItineraryItem(item.id)}
                        onReorder={(dir) => reorderItineraryItem(item.id, dir)}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < dayItems.length - 1}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </TabsContent>

        {/* MAP */}
        <TabsContent value="map" className="mt-4">
          <MapView items={tripItems} currency={trip.currency} />
        </TabsContent>

        {/* PEOPLE */}
        <TabsContent value="people" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel>{tripMembers.length} travelers</SectionLabel>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" /> Invite
            </Button>
          </div>
          <div className="space-y-2">
            {tripMembers.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isCurrentUser={m.id === currentMemberId}
                canManage={isOrganizer}
                onMakeOrganizer={() => updateMemberRole(m.id, "Organizer")}
                onRemove={() => removeMember(m.id)}
              />
            ))}
          </div>
        </TabsContent>

        {/* EXPENSES */}
        <TabsContent value="expenses" className="mt-4 space-y-5">
          <Card className="p-5 text-center">
            <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Total trip spending</p>
            <p className="mt-1 text-[28px] font-semibold tracking-tight text-foreground">{formatMoney(spent, trip.currency)}</p>
            {trip.budget && <p className="text-[12.5px] text-muted-foreground">Budget: {formatMoney(trip.budget, trip.currency)} per person</p>}
          </Card>

          {Object.keys(categoryTotals).length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {Object.entries(categoryTotals).map(([cat, amount]) => (
                <Card key={cat} className="p-3.5">
                  <p className="text-[12px] text-muted-foreground">{cat}</p>
                  <p className="text-[16px] font-semibold text-foreground">{formatMoney(amount, trip.currency)}</p>
                </Card>
              ))}
            </div>
          )}

          <section>
            <SectionLabel>Balances</SectionLabel>
            <div className="mt-2">
              <BalanceCard balances={balances} currency={trip.currency} />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <SectionLabel>All expenses</SectionLabel>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setExpenseOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add expense
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {tripExpenses.length === 0 && <p className="py-4 text-center text-[13px] text-muted-foreground">No expenses logged yet.</p>}
              {tripExpenses.map((e) => (
                <ExpenseRow key={e.id} expense={e} members={tripMembers} onDelete={() => deleteExpense(e.id)} />
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      {/* Floating actions */}
      <div className="fixed bottom-24 right-4 z-20 flex flex-col gap-2.5 md:bottom-8 md:right-8">
        <button
          onClick={() => openChat(trip.id)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-pop transition-transform hover:scale-105"
          aria-label="Trip chat"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <button
          onClick={() => openAIPlanner(trip.id)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-pop transition-transform hover:scale-105"
          aria-label="Trip AI"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      </div>

      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} trip={trip} onInvite={(input) => inviteMember(trip.id, input)} />

      <ItineraryItemModal
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
        members={tripMembers}
        defaultDate={modalDate}
        initial={editingItem}
        onSubmit={submitItemModal}
      />

      <AddExpenseModal
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        members={tripMembers}
        currency={trip.currency}
        onSubmit={(expense) => addExpense({ ...expense, tripId: trip.id })}
      />

      <CreatePollModal open={pollOpen} onOpenChange={setPollOpen} onSubmit={(question, options) => createPoll(trip.id, question, options)} />

      <BookingImportModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onAdd={(input, draft) => {
          const doc = addDocument(trip.id, input);
          applyDocumentToItinerary(doc.id, {
            tripId: trip.id,
            date: draft.date,
            startTime: draft.startTime,
            endTime: draft.endTime,
            type: draft.type,
            name: draft.name,
            emoji: draft.emoji,
            location: draft.location,
            bookingRef: draft.bookingRef,
            participantIds: tripMembers.map((m) => m.id),
            order: tripItems.length,
          });
        }}
      />

      <ChatDrawer
        open={chatTripId === trip.id}
        onOpenChange={(open) => (open ? openChat(trip.id) : closeChat())}
        messages={tripMessages}
        members={tripMembers}
        currentMemberId={currentMemberId}
        onSend={(content) => currentMemberId && sendMessage(trip.id, content, currentMemberId)}
      />

      <AIPlannerDrawer
        open={aiPlannerTripId === trip.id}
        onOpenChange={(open) => (open ? openAIPlanner(trip.id) : closeAIPlanner())}
        entries={aiConversations[trip.id] ?? []}
        currency={trip.currency}
        onAsk={(query) => askTripAI(trip.id, query)}
        onAccept={(entryId) => acceptPreview(trip.id, entryId)}
        onReject={(entryId) => rejectPreview(trip.id, entryId)}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}
