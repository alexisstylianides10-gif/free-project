import type { ToolSpec } from "./types";

interface ShoppingListRow {
  id: string;
  name: string;
  kind: string;
}

interface ShoppingItemRow {
  id: string;
  list_id: string;
  name: string;
  quantity: string;
  category: string;
  done: boolean;
}

function itemLabel(i: ShoppingItemRow): string {
  const qty = i.quantity ? ` (${i.quantity})` : "";
  return `"${i.name}"${qty} (id: ${i.id})`;
}

async function findOrCreateList(ctx: { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string }, listName?: string) {
  if (listName) {
    const { data: existing } = await ctx.supabase
      .from("shopping_lists")
      .select("id,name,kind")
      .eq("user_id", ctx.userId)
      .ilike("name", listName)
      .maybeSingle();
    if (existing) return existing as ShoppingListRow;
  }
  const { data: created, error } = await ctx.supabase
    .from("shopping_lists")
    .insert({ user_id: ctx.userId, name: listName ?? "Shopping list", kind: "general" })
    .select("id,name,kind")
    .single();
  if (error) throw new Error(error.message);
  return created as ShoppingListRow;
}

export const shoppingSearch: ToolSpec<{ listName?: string; done?: boolean }> = {
  name: "shopping_search",
  statusLabel: "Checking your shopping list…",
  description:
    "List the user's shopping lists and items, optionally filtered by list name or done state. Use this to answer 'what do I still need to buy' (done: false) and ALWAYS call it before shopping_complete_item or shopping_remove_item to resolve the exact itemId.",
  inputSchema: {
    type: "object",
    properties: {
      listName: { type: "string", description: "Filter to a specific list by name (partial match)." },
      done: { type: "boolean" },
    },
  },
  consequential: false,
  execute: async (ctx, input) => {
    const { data: lists, error: listErr } = await ctx.supabase.from("shopping_lists").select("id,name,kind").eq("user_id", ctx.userId);
    if (listErr) return { ok: false, error: listErr.message };
    let listIds = (lists as ShoppingListRow[]).map((l) => l.id);
    if (input.listName) {
      const filtered = (lists as ShoppingListRow[]).filter((l) => l.name.toLowerCase().includes(input.listName!.toLowerCase()));
      listIds = filtered.map((l) => l.id);
    }
    let q = ctx.supabase.from("shopping_items").select("*").eq("user_id", ctx.userId).in("list_id", listIds.length ? listIds : ["00000000-0000-0000-0000-000000000000"]);
    if (input.done !== undefined) q = q.eq("done", input.done);
    const { data: items, error } = await q.order("category", { ascending: true }).order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    const rows = items as ShoppingItemRow[];
    return {
      ok: true,
      result: {
        lists: (lists as ShoppingListRow[]).map((l) => ({ id: l.id, name: l.name, kind: l.kind })),
        items: rows.map((i) => ({ id: i.id, listId: i.list_id, name: i.name, quantity: i.quantity, category: i.category, done: i.done })),
      },
    };
  },
};

export const shoppingAddItem: ToolSpec<{
  items: { name: string; quantity?: string; category?: string }[];
  listName?: string;
  listKind?: "grocery" | "general" | "wishlist";
}> = {
  name: "shopping_add_item",
  statusLabel: "Adding to your shopping list…",
  description:
    "Propose adding one or more items to a shopping list. If listName isn't given or doesn't match an existing list, a new list is created (e.g. 'grocery list for tacos'). Always infer a sensible category for each item when the user doesn't give one (e.g. Dairy, Produce, Meat, Bakery, Household, Other) so the list groups naturally.",
  inputSchema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            quantity: { type: "string" },
            category: { type: "string" },
          },
          required: ["name"],
        },
      },
      listName: { type: "string" },
      listKind: { type: "string", enum: ["grocery", "general", "wishlist"] },
    },
    required: ["items"],
  },
  consequential: true,
  action: "create",
  describe: async (_ctx, input) => {
    const names = input.items.map((i) => i.name).join(", ");
    const list = input.listName ? ` to "${input.listName}"` : "";
    return { summary: `Add ${input.items.length === 1 ? names : `${input.items.length} items (${names})`}${list}?` };
  },
  execute: async (ctx, input) => {
    try {
      const list = await findOrCreateList(ctx, input.listName ?? undefined);
      if (input.listKind && list.kind !== input.listKind) {
        await ctx.supabase.from("shopping_lists").update({ kind: input.listKind }).eq("id", list.id);
      }
      const { data, error } = await ctx.supabase
        .from("shopping_items")
        .insert(input.items.map((i) => ({ user_id: ctx.userId, list_id: list.id, name: i.name, quantity: i.quantity ?? "", category: i.category ?? "" })))
        .select("*");
      if (error) return { ok: false, error: error.message };
      return { ok: true, result: { list, items: data } };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Couldn't add those items." };
    }
  },
};

export const shoppingCompleteItem: ToolSpec<{ itemId: string }> = {
  name: "shopping_complete_item",
  statusLabel: "Updating your shopping list…",
  description: "Propose marking a shopping item as bought/done. Requires the exact itemId from shopping_search.",
  inputSchema: { type: "object", properties: { itemId: { type: "string" } }, required: ["itemId"] },
  consequential: true,
  action: "complete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("shopping_items").select("*").eq("id", input.itemId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that item." };
    if ((data as ShoppingItemRow).done) return { error: "That item is already marked done." };
    return { summary: `Mark ${itemLabel(data as ShoppingItemRow)} as bought?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("shopping_items").update({ done: true }).eq("id", input.itemId).eq("user_id", ctx.userId).select("*").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Item no longer exists." };
    return { ok: true, result: { item: data } };
  },
};

export const shoppingRemoveItem: ToolSpec<{ itemId: string }> = {
  name: "shopping_remove_item",
  statusLabel: "Updating your shopping list…",
  description: "Propose removing an item from a shopping list. Requires the exact itemId from shopping_search.",
  inputSchema: { type: "object", properties: { itemId: { type: "string" } }, required: ["itemId"] },
  consequential: true,
  action: "delete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("shopping_items").select("*").eq("id", input.itemId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that item — it may already be removed." };
    return { summary: `Remove ${itemLabel(data as ShoppingItemRow)}?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("shopping_items").delete().eq("id", input.itemId).eq("user_id", ctx.userId).select("id,name").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Item no longer exists." };
    return { ok: true, result: { deleted: data } };
  },
};

export const shoppingTools = [shoppingSearch, shoppingAddItem, shoppingCompleteItem, shoppingRemoveItem];
