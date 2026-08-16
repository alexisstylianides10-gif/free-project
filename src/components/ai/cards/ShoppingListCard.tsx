import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import type { ShoppingItemCardData } from "@/lib/ai/cards";

export function ShoppingListCard({ items, heading }: { items: ShoppingItemCardData[]; heading?: string }) {
  return (
    <Card className="mt-2 max-w-sm">
      <CardContent className="space-y-2.5 p-4">
        {heading && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{heading}</p>}
        <div className="space-y-1.5">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 text-[13px]">
              <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-foreground">{i.name}</span>
              {i.quantity && <span className="text-[11px] text-muted-foreground">· {i.quantity}</span>}
            </div>
          ))}
        </div>
        <Link href="/app/shopping" className="inline-block text-[12px] font-medium text-accent hover:opacity-80">
          View Shopping List
        </Link>
      </CardContent>
    </Card>
  );
}
