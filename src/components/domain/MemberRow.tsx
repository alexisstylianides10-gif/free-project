"use client";

import { MoreHorizontal, Shield, UserMinus } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { TripMember } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export function MemberRow({
  member,
  isCurrentUser,
  canManage,
  onMakeOrganizer,
  onRemove,
}: {
  member: TripMember;
  isCurrentUser: boolean;
  canManage: boolean;
  onMakeOrganizer: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
      <Avatar initials={member.avatarInitials} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {member.name}
            {isCurrentUser && <span className="font-normal text-muted-foreground"> (You)</span>}
          </p>
          {member.role === "Organizer" && <Badge tone="accent">Organizer</Badge>}
        </div>
        {member.responsibility ? (
          <p className="text-[12.5px] text-muted-foreground">Handling: {member.responsibility}</p>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">Traveler</p>
        )}
      </div>

      {canManage && !isCurrentUser && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" className="z-50 w-48 rounded-xl border border-border bg-surface p-1.5 shadow-pop animate-scale-in">
              {member.role !== "Organizer" && (
                <DropdownMenu.Item
                  onSelect={onMakeOrganizer}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-foreground outline-none hover:bg-muted"
                >
                  <Shield className="h-3.5 w-3.5" /> Make organizer
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Item
                onSelect={onRemove}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-danger outline-none hover:bg-danger-soft"
              >
                <UserMinus className="h-3.5 w-3.5" /> Remove from trip
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
}
