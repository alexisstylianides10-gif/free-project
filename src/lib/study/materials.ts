import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { StudyAIError } from "@/lib/study/ai";
import type { StudyMaterial } from "@/lib/study/types";

/** Downloads a pdf/image material's file from Storage and returns it as a
 * base64 document ready for callStudyAIForJSON's `document` param. Extracted
 * from analyze-material's own download logic (identical behavior) so
 * generate-quiz's past-paper-grounded path can reuse it instead of
 * duplicating the download+base64 code. */
export async function downloadMaterialDocument(
  client: SupabaseClient,
  material: Pick<StudyMaterial, "kind" | "storage_path">
): Promise<{ mediaType: string; base64: string }> {
  if (!material.storage_path) throw new StudyAIError("This material has no file attached.");
  const { data: blob, error } = await client.storage.from("study-materials").download(material.storage_path);
  if (error || !blob) throw new StudyAIError("Couldn't download the uploaded file.");
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  const mediaType = material.kind === "pdf" ? "application/pdf" : blob.type || "image/jpeg";
  return { mediaType, base64 };
}
