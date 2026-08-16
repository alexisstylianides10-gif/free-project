import { FileText, Image as ImageIcon, File, FileSpreadsheet, LucideIcon, Loader2, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { DocumentProcessingStatus } from "@/lib/types";

export function iconForMimeType(mimeType: string): LucideIcon {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return FileSpreadsheet;
  return File;
}

export function labelForMimeType(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
  if (mimeType === "text/markdown") return "Markdown";
  if (mimeType === "text/plain") return "Text";
  return "File";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DOCUMENT_CATEGORY_SUGGESTIONS = ["School", "Work", "Personal", "Finance", "Travel", "Legal", "Receipts", "Projects", "Other"];

export interface ProcessingStatusMeta {
  label: string;
  tone: "success" | "warning" | "danger" | "accent" | "neutral";
  icon: LucideIcon;
  spinning?: boolean;
}

export const PROCESSING_STATUS_META: Record<DocumentProcessingStatus, ProcessingStatusMeta> = {
  uploading: { label: "Uploading…", tone: "neutral", icon: Loader2, spinning: true },
  processing: { label: "Processing…", tone: "neutral", icon: Loader2, spinning: true },
  analyzing: { label: "Analyzing…", tone: "accent", icon: Loader2, spinning: true },
  ready: { label: "Analyzed", tone: "success", icon: CheckCircle2 },
  needs_review: { label: "Needs review", tone: "warning", icon: Eye },
  error: { label: "Couldn't analyze", tone: "danger", icon: AlertTriangle },
};
