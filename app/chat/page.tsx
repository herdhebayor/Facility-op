"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, MessageSquareText, Send, Users, Trash, RotateCcw, Pencil, Forward } from "lucide-react";
import { ChatSkeleton } from "@/components/PageSkeleton";
import {useRouter} from "next/navigation";
import { decryptChatMessage, importChatPrivateKey } from "@/lib/chatCrypto";

type Contact = {
  _id: string;
  name: string;
  role: "admin" | "manager" | "staff";
  locationId?: string;
};

type Conversation = {
  _id: string;
  name: string;
  type: "direct" | "group";
  participants: (Contact | string)[];
  lastMessageAt: string;
};

type ChatMessage = {
  _id: string;
  conversationId?: string | { _id: string };
  senderId: string | { _id: string; name?: string };
  recipientId?: string;
  text?: string;
  ciphertext?: string;
  iv?: string;
  keyEnvelopes?: { userId: string | { _id: string }; wrappedKey: string }[];
  seenBy?: string[];
  reactions?: { userId: string; emoji: string }[];
  deletedForEveryone?: boolean;
  createdAt: string;
  editedAt?: string;
};

type ChatData = {
  me: {
    _id: string;
    role: Contact["role"];
    sessionExpiresAt: number | null;
  };
  contacts: Contact[];
  conversations: Conversation[];
  messages: ChatMessage[];
};

const CACHE_PREFIX = "facility-chat-encrypted-cache:";
const SESSION_KEY_PREFIX = "facility-chat-session-key:";
const reactions = ["👍", "❤️", "😂", "👏"];

function idOf(value: string | { _id: string } | null | undefined) {
  return String(typeof value === "object" && value !== null ? value._id : value || "");
}

function participantsOf(conversation: Conversation | null) {
  return conversation?.participants.filter((participant): participant is Contact => typeof participant === "object") || [];
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((today.getTime() - messageDay.getTime()) / 86_400_000);

  if (dayDifference === 0) return `Today, ${time}`;
  if (dayDifference === 1) return `Yesterday, ${time}`;
  if (dayDifference < 7 && dayDifference > 1) {
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
    return `${weekday}, ${time}`;
  }
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function readEncryptedCache(): {
  messages: ChatMessage[];
  conversations: Conversation[];
  me: ChatData["me"] | null;
  error: string;
} {
  if (typeof window === "undefined") return { messages: [], conversations: [], me: null, error: "" };
  try {
    const cachedUserId = localStorage.getItem("facility-chat-cache-user");
    if (!cachedUserId) return { messages: [], conversations: [], me: null, error: "" };
    const cached = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${cachedUserId}`) || "{}");
    const cachedMessages = Array.isArray(cached) ? cached : cached.messages;
    return {
      messages: Array.isArray(cachedMessages) ? cachedMessages.filter((message) => typeof message.ciphertext === "string") : [],
      conversations: Array.isArray(cached.conversations) ? cached.conversations : [],
      me: cached.me || null,
      error: "",
    };
  } catch {
    return { messages: [], conversations: [], me: null, error: "The local encrypted chat cache could not be read." };
  }
}

function writeEncryptedCache(userId: string, cache: Partial<Pick<ChatData, "me" | "conversations">> & { messages?: ChatMessage[] }) {
  const key = `${CACHE_PREFIX}${userId}`;
  const stored = JSON.parse(localStorage.getItem(key) || "{}");
  const existing = Array.isArray(stored) ? { messages: stored } : stored;
  localStorage.setItem(key, JSON.stringify({ ...existing, ...cache }));
  localStorage.setItem("facility-chat-cache-user", userId);
}

export default function ChatPage() {
  const [initialCache] = useState(readEncryptedCache);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(initialCache.conversations);
  const [messages, setMessages] = useState<ChatMessage[]>(initialCache.messages);
  const [me, setMe] = useState<ChatData["me"] | null>(initialCache.me);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const currentUserIdRef = useRef(initialCache.me?._id || "");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [decryptedText, setDecryptedText] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [editMessageId, setEditMessageId] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(initialCache.error);
  const [notice, setNotice] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const router = useRouter();

  const updatePrivateKey = useCallback((key: CryptoKey | null) => {
    privateKeyRef.current = key;
    setPrivateKey(key);
  }, []);

  const loadChat = useCallback(async () => {
    try {
      const response = await fetch("/api/chat", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          const currentUserId = currentUserIdRef.current;
          if (currentUserId) localStorage.removeItem(`${SESSION_KEY_PREFIX}${currentUserId}`);
          privateKeyRef.current = null;
          updatePrivateKey(null);
          setMe(null);
        }
        throw new Error(data.error || "Unable to load chat.");
      }
      setError("");

      const nextMessages: ChatMessage[] = Array.isArray(data.messages) ? data.messages : [];
      if (currentUserIdRef.current && currentUserIdRef.current !== data.me?._id) {
        localStorage.removeItem(`${SESSION_KEY_PREFIX}${currentUserIdRef.current}`);
        updatePrivateKey(null);
      }
      currentUserIdRef.current = data.me?._id || "";
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
      setMessages(nextMessages);
      setMe(data.me || null);
      if (data.me?._id) {
        const sessionKeyStorageKey = `${SESSION_KEY_PREFIX}${data.me._id}`;
        try {
          const sessionKeyCache = JSON.parse(localStorage.getItem(sessionKeyStorageKey) || "null");
          if (!data.me.sessionExpiresAt || Number(data.me.sessionExpiresAt) <= Date.now()) {
            localStorage.removeItem(sessionKeyStorageKey);
            updatePrivateKey(null);
          } else if (
            !privateKeyRef.current
            && sessionKeyCache?.expiresAt === data.me.sessionExpiresAt
            && typeof sessionKeyCache.privateKey === "string"
          ) {
            const restoredKey = await importChatPrivateKey(sessionKeyCache.privateKey);
            privateKeyRef.current = restoredKey;
            updatePrivateKey(restoredKey);
          }
        } catch {
          localStorage.removeItem(sessionKeyStorageKey);
          updatePrivateKey(null);
          setNotice("Some older encrypted messages cannot be displayed in this sign-in session.");
        }
        try {
          const encryptedOnly = nextMessages.filter((message) => message.ciphertext);
          writeEncryptedCache(data.me._id, {
            messages: encryptedOnly,
            conversations: Array.isArray(data.conversations) ? data.conversations : [],
            me: data.me,
          });
        } catch {
          setError("Chat loaded, but this browser could not save its local cache.");
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load chat. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [updatePrivateKey]);

  useEffect(() => {
    // Initial fetch synchronizes the conversation view with server state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadChat();
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
      void loadChat();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [loadChat]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation._id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );
  const conversationParticipants = useMemo(
    () => participantsOf(selectedConversation),
    [selectedConversation],
  );
  const conversationMessages = useMemo(() => {
    if (!selectedConversation || !me) return [];
    const participantIds = conversationParticipants.map((participant) => participant._id);
    return messages.filter((message) => {
      if (idOf(message.conversationId) === selectedConversation._id) return true;
      if (message.conversationId || selectedConversation.type !== "direct" || participantIds.length !== 2) return false;
      const senderId = idOf(message.senderId);
      const recipientId = idOf(message.recipientId);
      return participantIds.includes(senderId) && participantIds.includes(recipientId);
    });
  }, [conversationParticipants, me, messages, selectedConversation]);
  const unreadContactIds = useMemo(() => {
    if (!me) return new Set<string>();
    const unread = contacts.filter((contact) => messages.some((message) => (
      idOf(message.senderId) === contact._id
      && !(message.seenBy || []).some((userId) => idOf(userId) === me._id)
      && (
        idOf(message.recipientId) === me._id
        || (!message.recipientId && conversations.some((conversation) => (
          idOf(message.conversationId) === conversation._id
          && participantsOf(conversation).some((participant) => participant._id === me._id)
          && participantsOf(conversation).some((participant) => participant._id === contact._id)
        )))
      )
    )));
    return new Set(unread.map((contact) => contact._id));
  }, [contacts, conversations, me, messages]);

  useEffect(() => {
    if (!privateKey || !me) return;
    let active = true;
    async function decryptLegacyMessages() {
      const encryptedMessages = messages.filter((message) => message.ciphertext);
      const result = await Promise.all(encryptedMessages.map(async (message) => {
        try {
          return [message._id, await decryptChatMessage(message, me!._id, privateKey!)] as const;
        } catch {
          return [message._id, "This older encrypted message cannot be read in this session."] as const;
        }
      }));
      if (active) setDecryptedText(Object.fromEntries(result));
    }
    void decryptLegacyMessages();
    return () => { active = false; };
  }, [me, messages, privateKey]);

  useEffect(() => {
    if (!selectedConversationId) return;
    async function markRead() {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-seen", conversationId: selectedConversationId }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error || "Unable to update read status.");
    }
    void markRead();
  }, [selectedConversationId]);

  async function selectContact(contact: Contact) {
    const existing = conversations.find((conversation) => (
      conversation.type === "direct"
      && conversationParticipantsFor(conversation).length === 2
      && conversationParticipantsFor(conversation).some((participant) => participant._id === contact._id)
      && conversationParticipantsFor(conversation).some((participant) => participant._id === me?._id)
    ));
    if (existing) {
      setSelectedConversationId(existing._id);
      return;
    }
    await startConversation({ recipientIds: [contact._id] });
  }

  function conversationParticipantsFor(conversation: Conversation) {
    return participantsOf(conversation);
  }

  async function startConversation(body: { recipientIds?: string[]; groupType?: string }) {
    try {
      setError("");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", ...body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to open chat.");
      const conversation: Conversation = data.conversation;
      setConversations((current) => [conversation, ...current.filter((item) => item._id !== conversation._id)]);
      setSelectedConversationId(conversation._id);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to open chat.");
    }
  }

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = draft.trim();
    if (!selectedConversation || !me || !text || working) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", conversationId: selectedConversation._id, text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send the message.");
      setNotice("Message sent.");
      setDraft("");
      await loadChat();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send the message.");
    } finally {
      setWorking(false);
    }
  }

  async function updateMessage(action: string, message: ChatMessage, extra: Record<string, unknown> = {}) {
    if (working) return;
    setWorking(true);
    setError("");
    try {
      let payload: Record<string, unknown> = { action, messageId: message._id, ...extra };
      if (action === "edit") {
        payload = { ...payload, text: editDraft.trim() };
      }
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update this message.");
      if (data.message) setMessages((current) => current.map((item) => item._id === message._id ? data.message : item));
      if (action === "delete-for-me" || action === "delete-for-everyone") {
        const nextMessages = messages.filter((item) => item._id !== message._id);
        setMessages(nextMessages);
        if (me) {
          try {
            writeEncryptedCache(me._id, { messages: nextMessages.filter((item) => item.ciphertext) });
          } catch {
            setError("Message removed from the chat, but this browser could not update its encrypted cache.");
          }
        }
        if (action === "delete-for-everyone") await loadChat();
      }
      if (action === "react") await loadChat();
      setEditMessageId("");
      setEditDraft("");
      setOpenMenuId("");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update this message.");
    } finally {
      setWorking(false);
    }
  }

  async function shareMessage(message: ChatMessage) {
    const text = decryptedText[message._id] || "";
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setNotice("Message copied. You can now share it.");
      }
      setOpenMenuId("");
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") return;
      setError("Unable to share this message from the browser.");
    }
  }

  if (loading && !me) return <ChatSkeleton />;

  const isAdmin = me?.role === "admin";
  const selectedTitle = selectedConversation
    ? selectedConversation.type === "group"
      ? selectedConversation.name
      : conversationParticipants.find((participant) => participant._id !== me?._id)?.name || "Direct chat"
    : "Choose a contact";

    const selectedContactId = selectedConversation && selectedConversation.type === "direct"
      ? conversationParticipants.find((participant) => participant._id !== me?._id)?._id || ""
      : "";

  return (
    <main className="h-[calc(100vh-8.5rem)] w-full bg-slate-50 px-3 py-2 md:pb-6 text-slate-700 sm:px-5 ">
      <div className="mx-auto w-full md:mt-0 flex flex-col gap-4 h-full overflow-y-hidden lg:flex-row">
        {error && <div role="alert" className="fixed left-1/2 top-24 z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-lg">{error}</div>}
        {notice && <div role="status" className="fixed left-1/2 top-24 z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg">{notice}<button type="button" onClick={() => setNotice("")} className="ml-3 font-semibold underline cursor-pointer">Dismiss</button></div>}
        <aside className={`w-full shrink-0 rounded-3xl min-h-full overflow -hidden border border-slate-200 bg-white p-4 shadow-sm lg:block lg:w-80 lg:overflow-y-auto ${selectedConversationId ? "hidden" : "block"}`}>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Private messages</p>
              <h1 className="text-xl font-bold text-slate-900">Chat</h1>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-indigo-50 p-3 text-xs leading-5 text-indigo-800">
            Messages are saved to your account and available whenever you are signed in. Message content is stored by the service and is not end-to-end encrypted.
          </div>

          {isAdmin && <button type="button" onClick={() => void startConversation({ groupType: "all-managers" })} className="mt-4 flex w-full items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"><Users className="h-4 w-4" />Broadcast to all managers</button>}

          <div className="mt-5 ">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Your conversations</p>
            <div className="space-y-1 max-h-50 overflow-y-scroll">
              {conversations.map((conversation) => {
                const participants = participantsOf(conversation);
                const title = conversation.type === "group" ? conversation.name : participants.find((participant) => participant._id !== me?._id)?.name || "Direct chat";
                return <button key={conversation._id} type="button" onClick={() => setSelectedConversationId(conversation._id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${selectedConversationId === conversation._id ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-50"}`}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><MessageSquareText className="h-4 w-4" /></span><span className="min-w-0 flex-1 truncate font-medium">{title}</span></button>;
              })}
              {!conversations.length && <p className="px-2 py-2 text-xs text-slate-400">Your conversations will appear here.</p>}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 h-full">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Available contacts</p>
            <div className="space-y-1 overflow-y-auto">
              {contacts.map((contact) => {
                const hasNewMessage = unreadContactIds.has(contact._id);
                return (
                  <button key={contact._id} type="button" onClick={() => void selectContact(contact)} className="flex w-full items-center gap-3 rounded-xl px-3 cursor-pointer py-2.5 text-left transition hover:bg-slate-50">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${contact.role === "admin" ? "bg-amber-50 text-amber-700" : contact.role === "manager" ? "bg-violet-50 text-violet-700" : "bg-indigo-50 text-indigo-700"}`}>{contact.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">{contact.name}</span>
                      <span className="block text-[11px] capitalize text-slate-400">{contact.role}</span>
                    </span>
                    {hasNewMessage && <span aria-label="New message" className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700"><span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />New</span>}
                  </button>
                );
              })}
              {!contacts.length && <p className="px-2 py-2 text-xs text-slate-400">No chat contacts are available.</p>}
            </div>
          </div>
        </aside>

        <section className={`h-full min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:flex lg:min-h-0 ${selectedConversationId ? "flex" : "hidden lg:flex"}`}>
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {selectedConversationId && <button type="button" onClick={() => setSelectedConversationId("")} title="Back to contacts" aria-label="Back to contacts" className="rounded-xl p-2 text-slate-500 transition cursor-pointer hover:bg-slate-100 lg:hidden"><ArrowLeft className="h-5 w-5" /></button>}
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">
                  {selectedConversation?.type === "group" ? `${conversationParticipants.length} participants` : "Available while signed in"}
                </p>
                {selectedConversation?.type === "group" && <p className="mt-0.5 truncate text-[10px] text-slate-400">{selectedTitle}</p>}
                <button onClick={()=>router.push(`/staff/${selectedContactId}`)} className="truncate text-lg curosr-pointer font-semibold text-slate-900">
                  {selectedTitle}
                </button>
                </div>
            </div>
            <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">Saved chat</span>
          </header>

          <div className="flex-1 space-y-4 overflow-y-scroll bg-slate-50/70 p-4 sm:p-6">
            {!selectedConversation && <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm"><MessageSquareText className="h-6 w-6" /></span>
              <h3 className="mt-4 font-semibold text-slate-800">Your conversations, kept private</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">Choose an eligible contact or select one of your existing conversations to get started.</p>
            </div>}
            {selectedConversation && conversationMessages.map((message) => {
              const mine = idOf(message.senderId) === me?._id;
              const withinEditWindow = currentTime - new Date(message.createdAt).getTime() <= 60 * 60 * 1000;
              const messageReactions = message.reactions || [];
              const seenByOthers = message.seenBy?.some((userId) => idOf(userId) !== me?._id) || false;
              return <article  key={message._id} className={`flex relative cursor-pointer ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%]  sm:max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div title="Click to show message actions" onClick={() => setOpenMenuId((current) => current === message._id ? "" : message._id)} className={`rounded-2xl min-w-35 px-3.5 py-2.5 shadow-sm ${mine ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                    {editMessageId === message._id ? <form onSubmit={(event) => { event.preventDefault(); void updateMessage("edit", message); }} className="flex gap-2">
                      <input autoFocus value={editDraft} onChange={(event) => setEditDraft(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/30 bg-white/10 px-2 py-1 text-sm text-inherit outline-none" />
                      <button type="submit" disabled={working || !editDraft.trim()} className="rounded-lg bg-white/20 p-1.5 disabled:opacity-50" aria-label="Save edited message"><Check className="h-4 w-4" /></button>
                    </form> : <p className="whitespace-pre-wrap wrap-break-word text-sm">{message.deletedForEveryone ? "This message was deleted." : message.text || decryptedText[message._id] || (message.ciphertext ? "This older encrypted message cannot be read in this session." : "")}</p>}
                    <p title={new Date(message.createdAt).toLocaleString("en-US")} className={`mt-1 text-[10px] ${mine ? "text-indigo-200" : "text-slate-400"}`}>{formatMessageTime(message.createdAt)}{message.editedAt ? " · edited" : ""}{mine && seenByOthers ? " · Seen" : ""}</p>
                  </div>
                  {messageReactions.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{reactions.map((emoji) => {
                    const matching = messageReactions.filter((reaction) => reaction.emoji === emoji);
                    return matching.length ? <span key={emoji} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">{emoji} {matching.length}</span> : null;
                  })}</div>}
                  {openMenuId === message._id && <div className={`mt-1 absolute top-full flex max-w-full flex-col-reverse items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm ${mine ? "justify-end right-0" : "justify-start left-0"}`}>
                    <div className="flex gap-1">
                      {reactions.map((emoji) => <button key={emoji} type="button" title={`React with ${emoji}`} onClick={() => void updateMessage("react", message, { emoji })} className="cursor-pointer text-sm hover:bg-slate-100" aria-label={`React ${emoji}`}>{emoji}</button>)}
                    </div>
                    <div className="flex gap-2">
                      {mine && withinEditWindow && <button type="button" title="Edit message" onClick={() => { setEditDraft(decryptedText[message._id] || ""); setEditMessageId(message._id); setOpenMenuId(""); }} className="text-xs hover:text-emerald-400"><Pencil className="h-4 w-4" /></button>}
                    <button type="button" title="Delete for me" onClick={() => void updateMessage("delete-for-me", message)} className="cursor-pointer text-xs text-slate-700 hover:text-rose-700"><Trash className="h-4 w-4" /></button>
                    {mine && withinEditWindow && <button type="button" title="Unsend for everyone" onClick={() => void updateMessage("delete-for-everyone", message)} className="cursor-pointer text-xs hover:text-slate-700"><RotateCcw className="h-4 w-4" /></button>}
                    <button type="button" title="Share message" onClick={() => void shareMessage(message)} className="cursor-pointer text-xs hover:text-indigo-700"><Forward className="h-4 w-4" /></button>
                    </div>
                  </div>}
                </div>
              </article>;
            })}
          </div>

          <form onSubmit={(event) => void sendMessage(event)} className="border-t-2 border-slate-100 bg-slate-50/70 p-3 sm:p-4">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 shadow-sm bg-slate-50 p-2">
              <input value={draft} autoComplete="off" autoFocus autoCorrect="true" autoCapitalize="true" onChange={(event) => setDraft(event.target.value)} maxLength={8000} disabled={!selectedConversation || working} placeholder={selectedConversation ? `Message ${selectedTitle}…` : "Select a conversation to start"} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed" />
              <button type="submit" disabled={!draft.trim() || !selectedConversation || working} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /><span className="hidden sm:inline">Send</span></button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-slate-400">Messages are saved to your account · polling for new messages every 5 seconds</p>
          </form>
        </section>
      </div>
    </main>
  );
}
