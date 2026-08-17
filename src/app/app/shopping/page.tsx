"use client";

import { useMemo, useState } from "react";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { Modal } from "@/components/ui/Modal";
import { useAlxioum } from "@/lib/store";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export default function ShoppingPage() {
  const shoppingLists = useAlxioum((s) => s.shoppingLists);
  const shoppingItems = useAlxioum((s) => s.shoppingItems);
  const addShoppingList = useAlxioum((s) => s.addShoppingList);
  const addShoppingItem = useAlxioum((s) => s.addShoppingItem);
  const toggleShoppingItem = useAlxioum((s) => s.toggleShoppingItem);
  const deleteShoppingItem = useAlxioum((s) => s.deleteShoppingItem);
  const deleteShoppingList = useAlxioum((s) => s.deleteShoppingList);

  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [newListName, setNewListName] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteListOpen, setDeleteListOpen] = useState(false);

  const currentListId = activeListId ?? shoppingLists[0]?.id ?? null;
  const currentList = shoppingLists.find((l) => l.id === currentListId) ?? null;
  const items = shoppingItems.filter((i) => i.listId === currentListId);
  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, typeof open>();
    for (const item of open) {
      const key = item.category?.trim() || "Other";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(item);
    }
    return Array.from(byCategory.entries()).sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
  }, [open]);

  async function submitItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim() || busy) return;
    setBusy(true);
    let listId: string | null = currentListId;
    if (!listId) {
      const created = await addShoppingList({ name: "Shopping list" });
      listId = created?.id ?? null;
    }
    if (listId) await addShoppingItem({ listId, name: itemName.trim() });
    setItemName("");
    setBusy(false);
  }

  async function submitList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim() || busy) return;
    setBusy(true);
    const created = await addShoppingList({ name: newListName.trim() });
    if (created) setActiveListId(created.id);
    setNewListName("");
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Shopping</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{open.length ? `${open.length} to buy` : "All caught up"}</p>
      </div>

      {shoppingLists.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {shoppingLists.map((list) => (
            <button
              key={list.id}
              onClick={() => setActiveListId(list.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                list.id === currentListId ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {list.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submitList} className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        <input className={`${inputClass} flex-1 min-w-[180px]`} placeholder="New list name…" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={!newListName.trim() || busy}>
          <Plus className="h-4 w-4" /> New list
        </Button>
      </form>

      {shoppingLists.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No lists yet" body="Create one above, or ask Alxioum in Chat — e.g. 'make a grocery list for tacos.'" />
      ) : (
        <>
          <form onSubmit={submitItem} className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
            <input className={`${inputClass} flex-1 min-w-[220px]`} placeholder={`Add to ${currentList?.name ?? "list"}…`} value={itemName} onChange={(e) => setItemName(e.target.value)} />
            <Button type="submit" disabled={!itemName.trim() || busy}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>

          {open.length === 0 && done.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Nothing here yet" body="Add an item above, or ask Alxioum — e.g. 'add milk and eggs to my shopping list.'" />
          ) : (
            <div className="space-y-6">
              {grouped.map(([category, categoryItems]) => (
                <div key={category} className="space-y-2">
                  <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {category} · {categoryItems.length}
                  </h2>
                  <div className="space-y-2">
                    {categoryItems.map((item, i) => (
                      <FadeIn key={item.id} index={i}>
                        <Card>
                          <CardContent className="flex items-center gap-3 p-3.5">
                            <button
                              onClick={() => toggleShoppingItem(item.id)}
                              className="h-4 w-4 shrink-0 rounded border border-border hover:border-accent"
                              aria-label="Mark bought"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13.5px] text-foreground">{item.name}</p>
                              {item.quantity && <p className="text-[12px] text-muted-foreground">{item.quantity}</p>}
                            </div>
                            <button onClick={() => deleteShoppingItem(item.id)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Remove">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </CardContent>
                        </Card>
                      </FadeIn>
                    ))}
                  </div>
                </div>
              ))}

              {done.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Bought · {done.length}</h2>
                  <div className="space-y-2">
                    {done.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="flex items-center gap-3 p-3.5">
                          <button onClick={() => toggleShoppingItem(item.id)} className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-accent text-accent-foreground" aria-label="Mark not bought">
                            ✓
                          </button>
                          <p className="min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground line-through">{item.name}</p>
                          <button onClick={() => deleteShoppingItem(item.id)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentList && (
            <button onClick={() => setDeleteListOpen(true)} className="text-[12px] text-muted-foreground hover:text-danger">
              Delete &ldquo;{currentList.name}&rdquo;
            </button>
          )}
        </>
      )}

      <Modal
        open={deleteListOpen}
        onOpenChange={setDeleteListOpen}
        title={`Delete "${currentList?.name ?? ""}"?`}
        description={`This permanently deletes the list and all ${items.length} item${items.length === 1 ? "" : "s"} in it. This cannot be undone.`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDeleteListOpen(false)} className="flex-1 justify-center">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (currentList) deleteShoppingList(currentList.id);
              setActiveListId(null);
              setDeleteListOpen(false);
            }}
            className="flex-1 justify-center"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
