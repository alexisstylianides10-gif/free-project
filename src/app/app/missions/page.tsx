"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useUserMissions } from "@/lib/hooks/domain";
import { useRouter } from "next/navigation";
import { MISSIONS, type MissionCategory } from "@/lib/catalog/missions";
import { MissionListItem } from "@/components/shared/MissionCard";
import { ScreenHeader } from "@/components/shared/ScreenHeader";

const CATEGORY_TITLES: Record<MissionCategory, string> = {
  school: "School Missions",
  skill: "Skill Missions",
  career: "Career Missions",
  business: "Business Missions",
  creative: "Creative Missions",
};

const ORDER: MissionCategory[] = ["school", "skill", "career", "business", "creative"];

export default function MissionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: userMissions } = useUserMissions(user?.id);

  const statusByMissionId = useMemo(() => {
    const map = new Map<string, "completed" | "active">();
    for (const m of userMissions) map.set(m.mission_id, m.status === "completed" ? "completed" : "active");
    return map;
  }, [userMissions]);

  return (
    <div className="space-y-7 animate-fade-in">
      <ScreenHeader
        title="Missions"
        subtitle="Real accomplishments, not app-usage streaks. Each one moves your future forward."
      />

      {ORDER.map((category) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-bold text-foreground">{CATEGORY_TITLES[category]}</h2>
          <div className="space-y-2">
            {MISSIONS.filter((m) => m.category === category).map((mission) => (
              <MissionListItem
                key={mission.id}
                mission={mission}
                status={statusByMissionId.get(mission.id) ?? "available"}
                onClick={() => router.push(`/app/missions/${mission.id}`)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
