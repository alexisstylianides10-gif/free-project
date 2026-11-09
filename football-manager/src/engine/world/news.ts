import type { ID, NewsItem, World } from "../core/types";
import { newId } from "../core/ids";

const MAX_NEWS = 600;

export function addNews(world: World, n: { category: NewsItem["category"]; title: string; body: string; clubIds?: ID[]; playerIds?: ID[]; important?: boolean }): NewsItem {
  const item: NewsItem = { id: newId(world, "news"), date: world.meta.currentDate, category: n.category, title: n.title, body: n.body, clubIds: n.clubIds ?? [], playerIds: n.playerIds ?? [], read: false, important: !!n.important };
  world.news.push(item);
  if (world.news.length > MAX_NEWS) world.news.splice(0, world.news.length - MAX_NEWS);
  return item;
}

/** News relevant to the user's club (or flagged important / world headlines). */
export function userNews(world: World): NewsItem[] {
  const uc = world.meta.userClubId;
  return world.news.filter((n) => n.clubIds.includes(uc) || n.important).slice().reverse();
}
