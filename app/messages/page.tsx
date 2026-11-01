"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

const CHAT_ATTACHMENT_BUCKET = "chat-attachments";
const EMOJIS = [
  "😀", "😂", "😍", "😊", "🥰", "😘", "👍", "👏", "🙏", "❤️",
  "🔥", "🎉", "😎", "🤝", "💯", "😢", "😡", "🤔", "😮", "🙌"
];

type AttachmentPayload = {
  kind: "attachment";
  path?: string;
  url?: string;
  name: string;
  type: string;
  size: number;
};

const getAttachmentPath = (attachment: AttachmentPayload) => {
  if (attachment.path) return attachment.path;
  if (attachment.url) {
    try {
      const marker = "/object/public/" + CHAT_ATTACHMENT_BUCKET + "/";
      const index = attachment.url.indexOf(marker);
      if (index >= 0) {
        return decodeURIComponent(attachment.url.slice(index + marker.length));
      }
    } catch {}
  }
  return "";
};

const parseMessageText = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    if (
      parsed?.kind === "attachment" &&
      parsed.name &&
      (parsed.path || parsed.url)
    ) {
      return { text: "", attachment: parsed as AttachmentPayload };
    }
  } catch {}
  return { text: value, attachment: null as AttachmentPayload | null };
};

type User = {
  id: string;
  name: string;
  mobile: string;
};

type Provider = {
  id: string;
  name: string;
  service: string;
  city: string;
  mobile: string;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: "customer" | "provider";
  senderName: string;
  receiverId: string;
  receiverType: "customer" | "provider";
  text: string;
  createdAt: string;
  read: boolean;
};

type Conversation = {
  provider: Provider;
  messages: Message[];
  lastMessage: Message;
};

const getMessagePreview = (value: string) => {
  const parsed = parseMessageText(value);
  if (parsed.attachment) return `📎 ${parsed.attachment.name}`;
  return parsed.text || "Message";
};

const getTime = (date: string) => {
  try {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

function MessagesContent() {
  const searchParams = useSearchParams();
  const urlProviderId = searchParams.get("providerId") || "";

  const [user, setUser] = useState<User | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState(urlProviderId);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [chatNotice, setChatNotice] = useState<{ type: "error" | "info" | "success"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [lastSeenByUser, setLastSeenByUser] = useState<Record<string, string>>({});
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = (text: string, type: "error" | "info" | "success" = "error") => {
    setChatNotice({ type, text });
    window.setTimeout(() => setChatNotice(null), 4000);
  };

  const loadData = async () => {
    if (typeof window === "undefined") return;
    try {
      const savedUser = localStorage.getItem("masterUser");
      const savedProviders = localStorage.getItem("masterProviders");

      if (!savedUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUser: User = JSON.parse(savedUser);
      let providerList: Provider[] = [];

      try {
        if (savedProviders) {
          providerList = JSON.parse(savedProviders);
        }
      } catch (_) {}

      // Fallback/enrich providers from Supabase if local cache is missing or empty
      if (providerList.length === 0) {
        try {
          const { data: pData } = await supabase
            .from("providers")
            .select("id,name,service,city,mobile");
          if (pData && pData.length > 0) {
            providerList = pData.map((p: any) => ({
              id: String(p.id),
              name: p.name || "Specialist",
              service: p.service || "Home Services",
              city: p.city || "",
              mobile: p.mobile || "",
            }));
            localStorage.setItem("masterProviders", JSON.stringify(providerList));
          }
        } catch (pErr) {
          console.warn("Could not load provider directory:", pErr);
        }
      }

      setUser(currentUser);
      setProviders(providerList);

      // Fetch messages from Supabase
      const { data, error } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,receiver_id,sender_type,message,read,created_at")
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: true });

      let messageList: Message[] = [];

      if (!error && data) {
        messageList = data.map((row: any) => ({
          id: String(row.id),
          conversationId: String(row.conversation_id),
          senderId: String(row.sender_id),
          senderType: row.sender_type === "provider" ? "provider" : "customer",
          senderName: "",
          receiverId: String(row.receiver_id),
          receiverType: row.sender_type === "customer" ? "provider" : "customer",
          text: String(row.message || ""),
          createdAt: row.created_at || new Date().toISOString(),
          read: Boolean(row.read),
        }));
      } else {
        // Fallback to local storage messages
        try {
          const localSaved = localStorage.getItem("masterMessages");
          if (localSaved) {
            messageList = JSON.parse(localSaved);
          }
        } catch (_) {}
      }

      setMessages(messageList);
      setLoading(false);

      // Determine initial active conversation
      if (urlProviderId) {
        setSelectedProviderId(urlProviderId);
      } else if (messageList.length > 0 && !selectedProviderId) {
        const latest = messageList[messageList.length - 1];
        const providerId =
          latest.senderType === "provider" ? latest.senderId : latest.receiverId;
        setSelectedProviderId(providerId);
      }
    } catch (error) {
      console.error("Messages load error:", error);
      setUser(null);
      setProviders([]);
      setMessages([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    const refresh = () => {
      void loadData();
    };

    window.addEventListener("storage", refresh);
    window.addEventListener("master-messages-updated", refresh);
    window.addEventListener("master-bookings-updated", refresh);
    window.addEventListener("master-auth-updated", refresh);

    const channel = supabase
      .channel("customer-messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void loadData();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("master-messages-updated", refresh);
      window.removeEventListener("master-bookings-updated", refresh);
      window.removeEventListener("master-auth-updated", refresh);
      void supabase.removeChannel(channel);
    };
  }, []);

  // Sync selected provider if query param changes
  useEffect(() => {
    if (urlProviderId) {
      setSelectedProviderId(urlProviderId);
    }
  }, [urlProviderId]);

  // Realtime Presence & Typing
  useEffect(() => {
    if (!user) return;
    const identityId = String(user.id);
    const channel = supabase.channel("master-chat-presence", {
      config: { presence: { key: identityId } },
    });

    const syncPresence = () => {
      const state = channel.presenceState() as Record<string, any[]>;
      const ids = Object.values(state)
        .flat()
        .map((item: any) => String(item?.userId || ""))
        .filter(Boolean);
      setOnlineIds(new Set(ids));
    };

    channel
      .on("presence", { event: "sync" }, () => {
        syncPresence();
      })
      .on("presence", { event: "join" }, ({ newPresences }: any) => {
        const joined = (newPresences || [])
          .map((item: any) => String(item?.userId || ""))
          .filter(Boolean);
        if (joined.length > 0) {
          setLastSeenByUser((current) => {
            const next = { ...current };
            joined.forEach((id: string) => delete next[id]);
            return next;
          });
        }
        syncPresence();
      })
      .on("presence", { event: "leave" }, ({ leftPresences }: any) => {
        const leftIds = (leftPresences || [])
          .map((item: any) => String(item?.userId || ""))
          .filter(Boolean);
        if (leftIds.length > 0) {
          const now = new Date().toISOString();
          setLastSeenByUser((current) => {
            const next = { ...current };
            leftIds.forEach((id: string) => {
              next[id] = now;
            });
            return next;
          });
        }
        syncPresence();
      })
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (!payload || payload?.receiverId === user.id) {
          if (payload?.isTyping) {
            setTypingUserId(String(payload.senderId));
            if (remoteTypingTimeoutRef.current) {
              clearTimeout(remoteTypingTimeoutRef.current);
            }
            remoteTypingTimeoutRef.current = setTimeout(() => {
              setTypingUserId(null);
            }, 2500);
          } else {
            setTypingUserId(null);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: identityId,
            userType: "customer",
            lastSeen: new Date().toISOString(),
          });
          syncPresence();
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (remoteTypingTimeoutRef.current) {
        clearTimeout(remoteTypingTimeoutRef.current);
        remoteTypingTimeoutRef.current = null;
      }
      setTypingUserId(null);
      presenceChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const sendTypingStatus = async (isTyping: boolean) => {
    const channel = presenceChannelRef.current;
    const currentIdentity = user;
    const receiverId = selectedProviderId;
    if (!channel || !currentIdentity || !receiverId) return;
    try {
      await channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          senderId: String(currentIdentity.id),
          receiverId: String(receiverId),
          isTyping,
        },
      });
    } catch (_) {}
  };

  const getPresenceLabel = (id: string) => {
    if (onlineIds.has(String(id))) return "Online";
    const lastSeen = lastSeenByUser[String(id)];
    if (!lastSeen) return "Offline";
    return `Last seen ${new Date(lastSeen).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  // Group messages into conversations
  const conversations = useMemo<Conversation[]>(() => {
    if (!user) return [];
    const grouped = new Map<string, Message[]>();

    messages
      .filter(
        (message) =>
          message.senderId === user.id ||
          message.receiverId === user.id
      )
      .forEach((message) => {
        const providerId =
          message.senderType === "provider"
            ? message.senderId
            : message.receiverId;
        const existing = grouped.get(providerId) || [];
        existing.push(message);
        grouped.set(providerId, existing);
      });

    const list = Array.from(grouped.entries())
      .map(([providerId, providerMessages]) => {
        const provider = providers.find(
          (item) => String(item.id) === String(providerId)
        );
        if (!provider) return null;
        const sorted = [...providerMessages].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );
        return {
          provider,
          messages: sorted,
          lastMessage: sorted[sorted.length - 1],
        };
      })
      .filter(Boolean) as Conversation[];

    // If an active provider is selected (e.g. from provider profile page) but no messages exist yet,
    // inject them so they appear at the top of the conversation list.
    if (selectedProviderId && !list.some((c) => c.provider.id === selectedProviderId)) {
      const targetProvider = providers.find((p) => String(p.id) === String(selectedProviderId));
      if (targetProvider) {
        list.unshift({
          provider: targetProvider,
          messages: [],
          lastMessage: {
            id: `init-${targetProvider.id}`,
            conversationId: `${user.id}_${targetProvider.id}`,
            senderId: targetProvider.id,
            senderType: "provider",
            senderName: targetProvider.name,
            receiverId: user.id,
            receiverType: "customer",
            text: "Tap to begin conversation",
            createdAt: new Date().toISOString(),
            read: true,
          },
        });
      }
    }

    return list;
  }, [messages, providers, user, selectedProviderId]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      return (
        conversation.provider.name.toLowerCase().includes(query) ||
        conversation.provider.service.toLowerCase().includes(query) ||
        conversation.provider.city.toLowerCase().includes(query)
      );
    });
  }, [conversations, search]);

  const selectedConversation = useMemo(() => {
    const found = conversations.find(
      (conversation) => String(conversation.provider.id) === String(selectedProviderId)
    );
    if (found) return found;

    if (selectedProviderId && user) {
      const p = providers.find((item) => String(item.id) === String(selectedProviderId));
      if (p) {
        return {
          provider: p,
          messages: messages.filter(
            (m) =>
              (m.senderId === user.id && m.receiverId === p.id) ||
              (m.receiverId === user.id && m.senderId === p.id)
          ),
          lastMessage: {
            id: "draft",
            conversationId: `${user.id}_${p.id}`,
            senderId: p.id,
            senderType: "provider" as const,
            senderName: p.name,
            receiverId: user.id,
            receiverType: "customer" as const,
            text: "New Conversation",
            createdAt: new Date().toISOString(),
            read: true,
          },
        };
      }
    }
    return null;
  }, [conversations, selectedProviderId, user, providers, messages]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  const markConversationRead = async (providerId: string) => {
    if (!user) return;
    const conversationId = `${user.id}_${providerId}`;
    const unreadMessages = messages.filter(
      (message) =>
        message.conversationId === conversationId &&
        message.receiverId === String(user.id) &&
        !message.read
    );

    if (unreadMessages.length === 0) return;

    // Optimistically update local state
    setMessages((current) =>
      current.map((message) =>
        message.conversationId === conversationId &&
        message.receiverId === String(user.id)
          ? { ...message, read: true }
          : message
      )
    );

    try {
      await Promise.all(
        unreadMessages.map((message) =>
          supabase.rpc("mark_message_as_read", {
            p_message_id: String(message.id),
          })
        )
      );
    } catch (e) {
      console.warn("Could not mark messages read on server:", e);
    }
  };

  useEffect(() => {
    if (selectedProviderId && user) {
      void markConversationRead(selectedProviderId);
    }
  }, [selectedProviderId, user]);

  // Resolve signed URLs for attachments
  useEffect(() => {
    let cancelled = false;
    const resolveAttachmentUrls = async () => {
      if (!user) {
        setAttachmentUrls({});
        return;
      }
      const paths = Array.from(
        new Set(
          messages
            .map((message) => parseMessageText(message.text).attachment)
            .filter(Boolean)
            .map((attachment) => getAttachmentPath(attachment as AttachmentPayload))
            .filter(Boolean)
        )
      );
      if (paths.length === 0) {
        setAttachmentUrls({});
        return;
      }
      const next: Record<string, string> = {};
      await Promise.all(
        paths.map(async (path) => {
          try {
            const { data, error } = await supabase.storage
              .from(CHAT_ATTACHMENT_BUCKET)
              .createSignedUrl(path, 3600);
            if (!error && data?.signedUrl) {
              next[path] = data.signedUrl;
            }
          } catch (_) {}
        })
      );
      if (!cancelled) setAttachmentUrls(next);
    };
    void resolveAttachmentUrls();
    return () => {
      cancelled = true;
    };
  }, [messages, user]);

  const uploadAttachment = async (file: File) => {
    if (!user) return;
    if (uploadingAttachment) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification("File size must be 10 MB or less.", "error");
      return;
    }
    setUploadingAttachment(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const authUser = authData?.user;

      if (authError || !authUser) {
        showNotification("Please ensure your session is active before uploading attachments.", "error");
        return;
      }

      const conversationId = `${user.id}_${selectedProviderId}`;
      const path = `${conversationId}/${authUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(CHAT_ATTACHMENT_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });

      if (uploadError) {
        console.error("Chat attachment upload error:", uploadError);
        showNotification("Attachment upload failed. Please try again.", "error");
        return;
      }

      const payload: AttachmentPayload = {
        kind: "attachment",
        path,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
      };
      await sendAttachmentMessage(payload);
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendAttachmentMessage = async (attachment: AttachmentPayload) => {
    if (!user || !selectedProviderId) return;
    const provider = providers.find((item) => String(item.id) === String(selectedProviderId));
    if (!provider) return;

    const conversationId = `${user.id}_${provider.id}`;
    const messageId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();

    const newMessage: Message = {
      id: messageId,
      conversationId,
      senderId: String(user.id),
      senderType: "customer",
      senderName: user.name,
      receiverId: String(provider.id),
      receiverType: "provider",
      text: JSON.stringify(attachment),
      createdAt,
      read: false,
    };

    // Optimistic local update
    setMessages((current) => [...current, newMessage]);
    void sendTypingStatus(false);

    try {
      const { data, error } = await supabase.from("messages").insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: String(user.id),
        receiver_id: String(provider.id),
        sender_type: "customer",
        message: JSON.stringify(attachment),
        read: false,
        created_at: createdAt,
      }).select("id,conversation_id,sender_id,receiver_id,sender_type,message,read,created_at").single();

      if (error) {
        console.warn("Server message sync error, preserved in local session:", error);
      } else if (data) {
        newMessage.id = String(data.id);
      }
    } catch (e) {
      console.warn("Offline message stored locally:", e);
    }

    try {
      const currentStored = localStorage.getItem("masterMessages");
      const list = currentStored ? JSON.parse(currentStored) : [];
      list.push(newMessage);
      localStorage.setItem("masterMessages", JSON.stringify(list));
    } catch (_) {}

    window.dispatchEvent(new Event("master-messages-updated"));
  };

  const sendMessage = async () => {
    if (!user || !selectedProviderId) return;
    const cleanText = text.trim();
    if (!cleanText) return;

    const provider = providers.find(
      (item) => String(item.id) === String(selectedProviderId)
    );
    if (!provider) return;

    const conversationId = `${user.id}_${provider.id}`;
    const messageId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();

    const newMessage: Message = {
      id: messageId,
      conversationId,
      senderId: String(user.id),
      senderType: "customer",
      senderName: user.name,
      receiverId: String(provider.id),
      receiverType: "provider",
      text: cleanText,
      createdAt,
      read: false,
    };

    setMessages((current) => [...current, newMessage]);
    setText("");
    void sendTypingStatus(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Persist to Supabase
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          id: messageId,
          conversation_id: conversationId,
          sender_id: String(user.id),
          receiver_id: String(provider.id),
          sender_type: "customer",
          message: cleanText,
          read: false,
          created_at: createdAt,
        })
        .select("id,conversation_id,sender_id,receiver_id,sender_type,message,read,created_at")
        .single();

      if (error) {
        console.warn("Supabase message insert fallback to local session:", error);
      } else if (data) {
        newMessage.id = String(data.id);
      }
    } catch (err) {
      console.warn("Message saved locally:", err);
    }

    // Persist to localStorage
    try {
      const currentStored = localStorage.getItem("masterMessages");
      const list = currentStored ? JSON.parse(currentStored) : [];
      list.push(newMessage);
      localStorage.setItem("masterMessages", JSON.stringify(list));
    } catch (_) {}

    window.dispatchEvent(new Event("master-messages-updated"));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50/60 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm font-semibold text-slate-700">Loading your conversations...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-120px)] bg-slate-50/60 px-4 py-16">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
            💬
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Sign in to chat
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Login with your mobile number to message verified local technicians and track your inquiries.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xs transition hover:from-blue-700 hover:to-indigo-700"
          >
            Customer Login →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-70px)] bg-slate-50/60 py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* HEADER */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Messages
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Direct, encrypted chat with your assigned and verified specialists.
            </p>
          </div>
          <Link
            href="/services"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            + Find New Specialist
          </Link>
        </div>

        {/* CHAT CONTAINER */}
        <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm md:grid-cols-[320px_1fr]">
          {/* CONVERSATION LIST (SIDEBAR) */}
          <aside className="border-b border-slate-100 md:border-b-0 md:border-r">
            <div className="border-b border-slate-100 p-3.5">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-2.5 text-xs text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search contacts..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pr-3 pl-8 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-sm"
                />
              </div>
            </div>

            <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="text-3xl">💬</div>
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    No active chats yet
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Browse services and tap &ldquo;Chat&rdquo; on any provider profile.
                  </p>
                  <Link
                    href="/services"
                    className="mt-4 inline-block rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    Browse Services
                  </Link>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const unread = conversation.messages.filter(
                    (message) =>
                      message.receiverId === user.id && !message.read
                  ).length;
                  const isSelected = selectedProviderId === conversation.provider.id;

                  return (
                    <button
                      key={conversation.provider.id}
                      onClick={() => setSelectedProviderId(conversation.provider.id)}
                      className={`w-full p-4 text-left transition ${
                        isSelected
                          ? "bg-blue-50/80 border-l-4 border-l-blue-600"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-2xs">
                            {conversation.provider.name.charAt(0).toUpperCase()}
                            {onlineIds.has(conversation.provider.id) && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-slate-900">
                              {conversation.provider.name}
                            </h3>
                            <p className="truncate text-xs text-slate-500">
                              {conversation.provider.service}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-600">
                              {getMessagePreview(conversation.lastMessage.text)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="text-[10px] font-medium text-slate-400">
                            {getTime(conversation.lastMessage.createdAt)}
                          </span>
                          {unread > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-xs">
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ACTIVE CHAT MAIN AREA */}
          <section className="flex min-h-[580px] flex-col bg-slate-50/30">
            {!selectedConversation ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                    💬
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-slate-900">
                    Select a conversation
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Choose a provider from the left or search for your booked technician.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* ACTIVE CHAT HEADER */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 font-bold text-white shadow-2xs">
                      {selectedConversation.provider.name.charAt(0).toUpperCase()}
                      {onlineIds.has(selectedConversation.provider.id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                        {selectedConversation.provider.name}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{selectedConversation.provider.service}</span>
                        {selectedConversation.provider.city && (
                          <>
                            <span>•</span>
                            <span>{selectedConversation.provider.city}</span>
                          </>
                        )}
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            onlineIds.has(selectedConversation.provider.id)
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }`}
                        >
                          {getPresenceLabel(selectedConversation.provider.id)}
                        </span>
                      </div>
                      {typingUserId === selectedConversation.provider.id && (
                        <p className="text-[10px] font-semibold text-blue-600 animate-pulse">
                          typing...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedConversation.provider.mobile && (
                      <a
                        href={`tel:${selectedConversation.provider.mobile}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs transition hover:bg-emerald-100"
                      >
                        📞 Call
                      </a>
                    )}
                    <Link
                      href={`/provider/${selectedConversation.provider.id}`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                    >
                      Profile
                    </Link>
                  </div>
                </div>

                {/* NOTIFICATION TOAST IN CHAT */}
                {chatNotice && (
                  <div
                    className={`mx-4 mt-3 rounded-xl p-3 text-xs font-medium shadow-sm transition ${
                      chatNotice.type === "error"
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {chatNotice.text}
                  </div>
                )}

                {/* CHAT MESSAGES STREAM */}
                <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                  {selectedConversation.messages.length === 0 ? (
                    <div className="my-10 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-6 text-center">
                      <div className="text-3xl">👋</div>
                      <h4 className="mt-2 text-sm font-bold text-slate-800">
                        Start your conversation with {selectedConversation.provider.name}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Feel free to discuss service scope, timing, or share pictures of the work required.
                      </p>
                    </div>
                  ) : (
                    selectedConversation.messages.map((message) => {
                      const isMine = message.senderId === user.id;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-2xs sm:max-w-[75%] ${
                              isMine
                                ? "rounded-br-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                                : "rounded-bl-xs border border-slate-200/90 bg-white text-slate-900"
                            }`}
                          >
                            {(() => {
                              const parsed = parseMessageText(message.text);
                              if (parsed.attachment) {
                                const attachment = parsed.attachment;
                                const attachmentPath = getAttachmentPath(attachment);
                                const attachmentUrl = attachmentPath
                                  ? attachmentUrls[attachmentPath]
                                  : attachment.url || "";
                                const isImage = attachment.type.startsWith("image/");

                                if (!attachmentUrl) {
                                  return (
                                    <div className="rounded-lg bg-black/10 px-3 py-2 text-xs font-semibold">
                                      ⏳ Loading attachment...
                                    </div>
                                  );
                                }
                                return (
                                  <div className="space-y-1">
                                    {isImage ? (
                                      <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-xl border border-black/10"
                                      >
                                        <img
                                          src={attachmentUrl}
                                          alt={attachment.name}
                                          className="max-h-56 max-w-full rounded-lg object-cover"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-black/10 px-3 py-1.5 text-xs font-semibold underline"
                                      >
                                        📎 {attachment.name}
                                      </a>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <p className="text-xs leading-relaxed sm:text-sm break-words whitespace-pre-wrap">
                                  {parsed.text}
                                </p>
                              );
                            })()}

                            <div
                              className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                                isMine ? "text-blue-200" : "text-slate-400"
                              }`}
                            >
                              <span>{getTime(message.createdAt)}</span>
                              {isMine && (
                                <span className="font-bold">
                                  {message.read ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* COMPOSER INPUT BAR */}
                <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
                  <div className="relative flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadAttachment(file);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((current) => !current)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg hover:bg-slate-50"
                      title="Insert emoji"
                    >
                      😊
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAttachment}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg hover:bg-slate-50 disabled:opacity-50"
                      title="Attach photo or document"
                    >
                      {uploadingAttachment ? "⏳" : "📎"}
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute bottom-14 left-0 z-30 grid w-64 grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setText((current) => `${current}${emoji}`);
                              setShowEmojiPicker(false);
                            }}
                            className="rounded-lg p-2 text-xl hover:bg-slate-100"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <input
                      type="text"
                      value={text}
                      onChange={(event) => {
                        const value = event.target.value;
                        setText(value);
                        void sendTypingStatus(Boolean(value.trim()));
                        if (typingTimeoutRef.current) {
                          clearTimeout(typingTimeoutRef.current);
                        }
                        if (value.trim()) {
                          typingTimeoutRef.current = setTimeout(() => {
                            void sendTypingStatus(false);
                          }, 1200);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void sendMessage();
                        }
                      }}
                      onBlur={() => {
                        void sendTypingStatus(false);
                      }}
                      placeholder="Type your message..."
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-sm"
                    />

                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={!text.trim()}
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50/60 py-12">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
            <p className="mt-3 text-xs text-slate-500">Loading messages...</p>
          </div>
        </main>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}