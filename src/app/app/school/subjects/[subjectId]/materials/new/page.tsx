"use client";

import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddNoteFlow } from "@/components/study/AddNoteFlow";

export default function NewMaterialPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTextbook = searchParams.get("type") === "book";

  return (
    <AddNoteFlow
      subjectId={subjectId}
      isTextbook={isTextbook}
      onDone={(materialId) => router.push(`/app/school/subjects/${subjectId}/materials/${materialId}`)}
    />
  );
}
