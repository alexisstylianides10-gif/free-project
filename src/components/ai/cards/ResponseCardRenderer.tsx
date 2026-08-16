import type { ResponseCard } from "@/lib/ai/cards";
import { EventCard } from "./EventCard";
import { TaskListCard } from "./TaskListCard";
import { GoalProgressCard } from "./GoalProgressCard";
import { DocumentCard } from "./DocumentCard";
import { ShoppingListCard } from "./ShoppingListCard";
import { DailyBriefingCard } from "./DailyBriefingCard";

export function ResponseCardRenderer({ card }: { card: ResponseCard }) {
  switch (card.type) {
    case "event":
      return <EventCard events={card.events} heading={card.heading} />;
    case "taskList":
      return <TaskListCard tasks={card.tasks} heading={card.heading} />;
    case "goalProgress":
      return <GoalProgressCard goals={card.goals} />;
    case "document":
      return <DocumentCard documents={card.documents} />;
    case "shoppingList":
      return <ShoppingListCard items={card.items} heading={card.heading} />;
    case "dailyBriefing":
      return <DailyBriefingCard briefing={card.briefing} />;
    default:
      return null;
  }
}
