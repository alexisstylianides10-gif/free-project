"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Send, Loader2, AlertCircle, ImagePlus, X, PanelLeft, CalendarPlus, ListChecks, Target, FileUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";
import { MessageBubble } from "@/components/ai/MessageBubble";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { VoiceButton } from "@/components/ai/VoiceButton";
import { ListeningAurora } from "@/components/ai/ListeningAurora";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { ChatMessage, Conversation } from "@/lib/types";
import { attachDocumentToChat, confirmPendingAction, sendChatMessage, undoResolvedAction } from "@/lib/ai/chatClient";
import { useVoiceInput } from "@/lib/useVoiceInput";
import { fileToCompressedDataUrl } from "@/lib/image";
import { ALLOWED_TYPES } from "@/lib/documents/constants";

const SUGGESTIONS = [
  "What's on my calendar tomorrow?",
  "What do I need to finish today?",
  "How's my running goal going?",
  "Organize my week",
];

export default function ChatPage() {
  const authUserId = useAlxioum((s) => s.authUserId);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const refreshAll = useAlxioum((s) => s.refreshAll);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ dataUrl: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [attachingDocument, setAttachingDocument] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { supported: voiceSupported, listening, toggle: toggleVoice } = useVoiceInput((text) => setInput((v) => (v ? `${v} ${text}` : text)));

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) {
      setInput(prefill);
      router.replace("/app/chat");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadConversations() {
    if (!authUserId) return;
    setConversationsError(null);
    try {
      const list = await db.fetchConversations(authUserId);
      if (list.length === 0) {
        const created = await db.createConversation(authUserId);
        setConversations([created]);
        setActiveId(created.id);
      } else {
        setConversations(list);
        setActiveId(list[0].id);
      }
    } catch (err) {
      setConversationsError(err instanceof Error ? err.message : "Couldn't load your conversations.");
    }
  }

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMessages(true);
    db.fetchMessages(activeId)
      .then(setMessages)
      .finally(() => setLoadingMessages(false));
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  async function newConversation() {
    if (!authUserId) return;
    const created = await db.createConversation(authUserId);
    setConversations((c) => [created, ...c]);
    setActiveId(created.id);
    setHistoryOpen(false);
  }

  async function deleteConversation(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await db.deleteConversation(id);
    setConversations((c) => c.filter((x) => x.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((x) => x.id !== id);
      if (remaining.length > 0) setActiveId(remaining[0].id);
      else newConversation();
    }
  }

  async function renameConversationTitle(id: string, title: string) {
    setConversations((c) => c.map((x) => (x.id === id ? { ...x, title } : x)));
    await db.renameConversation(id, title);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(null);
    if (!file.type.startsWith("image/")) {
      setImageError("That's not an image.");
      return;
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setAttachedImage({ dataUrl });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Couldn't attach that image.");
    }
  }

  async function handleDocumentSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeId) return;
    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      setError("This file type isn't supported yet — try a PDF, DOCX, image, or plain text file.");
      return;
    }
    setError(null);
    setAttachingDocument(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const { assistantMessage } = await attachDocumentToChat(token, activeId, file);
      setMessages((m) => [...m, assistantMessage]);
      refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't attach that file.");
    } finally {
      setAttachingDocument(false);
    }
  }

  function prefillAndFocus(starter: string) {
    setInput(starter);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  async function send(text?: string) {
    const messageText = (text ?? input).trim();
    const image = attachedImage;
    if ((!messageText && !image) || !activeId || sending) return;
    const isFirstMessage = messages.length === 0;
    setInput("");
    setAttachedImage(null);
    setError(null);
    setErrorCode(null);
    setSending(true);
    setStatus("Thinking…");

    const optimisticId = `optimistic_${Date.now()}`;
    setMessages((m) => [
      ...m,
      {
        id: optimisticId,
        conversationId: activeId,
        role: "user",
        content: messageText || "📷 Photo",
        toolCalls: [],
        pendingAction: null,
        resolvedAction: null,
        createdAt: new Date().toISOString(),
        imagePreviewUrl: image?.dataUrl,
      },
    ]);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const imagePayload = image ? { base64: image.dataUrl.split(",")[1], mediaType: "image/jpeg" } : undefined;
      const { userMessage, assistantMessage } = await sendChatMessage(token, activeId, messageText, imagePayload, setStatus);
      setMessages((m) => [...m.filter((x) => x.id !== optimisticId), { ...userMessage, imagePreviewUrl: image?.dataUrl }, assistantMessage]);

      const aiRenamed = assistantMessage.toolCalls.some((t) => t.tool === "conversation_rename" && t.status === "success");
      if (aiRenamed && authUserId) {
        // Alxioum renamed the conversation itself via the conversation_rename
        // tool — pull the fresh title rather than guessing it client-side.
        setConversations(await db.fetchConversations(authUserId));
      } else {
        // Give brand-new conversations a real title (from the first message)
        // instead of leaving every entry in the sidebar reading "New chat".
        const titleSource = messageText || "Photo";
        const autoTitle = isFirstMessage ? titleSource.slice(0, 48) + (titleSource.length > 48 ? "…" : "") : null;
        if (autoTitle) db.renameConversation(activeId, autoTitle).catch(() => {});

        setConversations((c) => {
          const rest = c.filter((x) => x.id !== activeId);
          const active = c.find((x) => x.id === activeId);
          return active ? [{ ...active, title: autoTitle ?? active.title, updatedAt: new Date().toISOString() }, ...rest] : c;
        });
      }
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== optimisticId));
      setInput(messageText);
      setAttachedImage(image);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setErrorCode((err as { code?: string })?.code ?? null);
    } finally {
      setSending(false);
      setStatus(null);
    }
  }

  async function handleChoice(value: string) {
    await send(value);
  }

  async function handleDecide(messageId: string, pendingActionId: string, decision: "confirm" | "cancel") {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired.");
      const { resolvedAction } = await confirmPendingAction(token, pendingActionId, decision);
      setMessages((m) => m.map((msg) => (msg.id === messageId ? { ...msg, resolvedAction } : msg)));
      if (decision === "confirm") refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't complete that action.");
    }
  }

  async function handleUndo(messageId: string) {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired.");
      const { resolvedAction } = await undoResolvedAction(token, messageId);
      setMessages((m) => m.map((msg) => (msg.id === messageId ? { ...msg, resolvedAction } : msg)));
      refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't undo that.");
    }
  }

  const activeTitle = conversations.find((c) => c.id === activeId)?.title ?? "Chat";

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden bg-surface">
      <aside className="hidden shrink-0 flex-col border-r border-border/70 p-3 md:flex md:w-64">
        {authUserId && (
          <ConversationSidebar
            userId={authUserId}
            conversations={conversations}
            activeId={activeId}
            onSelect={setActiveId}
            onNew={newConversation}
            onDelete={deleteConversation}
            onRename={renameConversationTitle}
          />
        )}
      </aside>

      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.div
              key="history-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setHistoryOpen(false)}
              className="absolute inset-0 z-30 bg-black/30 backdrop-blur-[2px] md:hidden"
            />
            <motion.aside
              key="history-panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              className="absolute inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface p-3 shadow-pop md:hidden"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[13px] font-semibold text-foreground">Chats</p>
                <button onClick={() => setHistoryOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close chat history">
                  <PanelLeft className="h-4 w-4" />
                </button>
              </div>
              {authUserId && (
                <ConversationSidebar
                  userId={authUserId}
                  conversations={conversations}
                  activeId={activeId}
                  onSelect={(id) => {
                    setActiveId(id);
                    setHistoryOpen(false);
                  }}
                  onNew={newConversation}
                  onDelete={deleteConversation}
                  onRename={renameConversationTitle}
                />
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden">
        <ListeningAurora active={listening} />
        <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5">
          <button onClick={() => setHistoryOpen(true)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted md:hidden" aria-label="Chat history">
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={activeTitle}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.14 }}
              className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-foreground"
            >
              {activeTitle}
            </motion.span>
          </AnimatePresence>
          <button onClick={newConversation} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden" aria-label="New chat">
            <Plus className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {loadingMessages ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
              <Logo className="h-14 w-14" />
              <div className="space-y-1.5">
                <p className="text-lg font-semibold text-foreground">What can I help you with?</p>
                <p className="text-[13px] text-muted-foreground">Plan it. Find it. Organize it. Get it done.</p>
              </div>
              <div className="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-left text-[12.5px] font-medium text-foreground transition-colors hover:border-accent/50 hover:bg-accent-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} onDecide={handleDecide} onUndo={handleUndo} onChoiceSelect={handleChoice} />)
          )}
          {sending && (
            <div className="flex items-center gap-2 py-2.5">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                  />
                ))}
              </div>
              <AnimatePresence mode="wait">
                {status && (
                  <motion.span
                    key={status}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-[12.5px] text-muted-foreground"
                  >
                    {status}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {error && errorCode === "USAGE_LIMIT_REACHED" && (
          <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </span>
            <Link href="/app/settings" className="shrink-0 font-semibold underline underline-offset-2">
              Upgrade
            </Link>
          </div>
        )}

        {error && errorCode !== "USAGE_LIMIT_REACHED" && (
          <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </span>
            <button onClick={() => send(input)} className="shrink-0 font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        )}

        {conversationsError && (
          <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Couldn&apos;t load your conversations — {conversationsError}
            </span>
            <button onClick={loadConversations} className="shrink-0 font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        )}

        {imageError && (
          <div className="mx-4 mb-2 flex items-center gap-1.5 rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {imageError}
          </div>
        )}

        {attachedImage && (
          <div className="mx-3 mb-2 flex items-center gap-2">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={attachedImage.dataUrl} alt="Attached preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="Remove photo"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <span className="text-[12.5px] text-muted-foreground">Photo attached</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-1.5">
          <button
            onClick={() => prefillAndFocus("Add a task to ")}
            className="flex shrink-0 items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
          >
            <ListChecks className="h-3 w-3" /> Task
          </button>
          <button
            onClick={() => prefillAndFocus("Schedule ")}
            className="flex shrink-0 items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
          >
            <CalendarPlus className="h-3 w-3" /> Event
          </button>
          <button
            onClick={() => prefillAndFocus("Create a goal to ")}
            className="flex shrink-0 items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
          >
            <Target className="h-3 w-3" /> Goal
          </button>
          <button
            onClick={() => docFileInputRef.current?.click()}
            disabled={attachingDocument}
            className="flex shrink-0 items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-60"
          >
            {attachingDocument ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />} Document
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 border-t border-border/70 p-3"
        >
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <input ref={docFileInputRef} type="file" accept={ALLOWED_TYPES.join(",")} onChange={handleDocumentSelect} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach photo"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={attachedImage ? "Add a caption (optional)…" : "What do you need?"}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {voiceSupported && <VoiceButton listening={listening} onClick={toggleVoice} />}
          <Button type="submit" size="icon" disabled={(!input.trim() && !attachedImage) || sending} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
