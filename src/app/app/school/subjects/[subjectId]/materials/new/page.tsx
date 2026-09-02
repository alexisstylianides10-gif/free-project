"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { AddNoteFlow } from "@/components/study/AddNoteFlow";

export default function NewMaterialPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const router = useRouter();

  return (
    <AddNoteFlow
      subjectId={subjectId}
      onDone={(materialId) => router.push(`/app/school/subjects/${subjectId}/materials/${materialId}`)}
    />
  );
}
