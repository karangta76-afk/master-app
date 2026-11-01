"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
const CHAT_ATTACHMENT_BUCKET = "chat-attachments";
const EMOJIS = ["😀","😂","😍","😊","🥰","😘","👍","👏","🙏","❤️","🔥","🎉","😎","🤝","💯","😢","😡","🤔","😮","🙌"];
type AttachmentPayload = {
  kind: "attachment";
  path?: string;
  // Kept only for backward compatibility with older messages that stored public URLs.
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
type Provider = {
  id: string;
  name: string;
  service: string;
  city: string;
  mobile: string;
};
type Customer = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
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
  customer: Customer;
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
const getDateTime = (date: string) => {
  try {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};
export default function ProviderMessagesPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [lastSeenByUser, setLastSeenByUser] = useState<Record<string, string>>({});
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const loadData = async () => {
    if (typeof window === "undefined") return;
    try {
      const savedProvider = localStorage.getItem("masterProvider");
      const savedCustomers = localStorage.getItem("masterCustomers");
      if (!savedProvider) {
        setProvider(null);
        setLoading(false);
        return;
      }
      const currentProvider: Provider = JSON.parse(savedProvider);
      const customerList: Customer[] = savedCustomers
        ? JSON.parse(savedCustomers)
        : [];
      setProvider(currentProvider);
      setCustomers(customerList);
      const { data, error } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,receiver_id,sender_type,message,read,created_at")
        .or(`sender_id.eq.${currentProvider.id},receiver_id.eq.${currentProvider.id}`)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Supabase provider messages loading error:", error);
        setMessages([]);
        setLoading(false);
        return;
      }
      const messageList: Message[] = (data || []).map((row: any) => ({
        id: String(row.id),
        conversationId: String(row.conversation_id),
        senderId: String(row.sender_id),
        senderType: row.sender_type === "provider" ? "provider" : "customer",
        senderName: "",
        receiverId: String(row.receiver_id),
        receiverType: row.sender_type === "provider" ? "customer" : "provider",
        text: String(row.message || ""),
        createdAt: row.created_at || new Date().toISOString(),
        read: Boolean(row.read),
      }));
      setMessages(messageList);
      setLoading(false);
      if (messageList.length > 0 && !selectedCustomerId) {
        const latest = messageList[messageList.length - 1];
        const customerId =
          latest.senderType === "customer" ? latest.senderId : latest.receiverId;
        setSelectedCustomerId(customerId);
      }
    } catch (error) {
      console.error("Provider messages load error:", error);
      setProvider(null);
      setCustomers([]);
      setMessages([]);
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
    const refresh = () => {
      loadData();
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("master-messages-updated", refresh);
    window.addEventListener("master-bookings-updated", refresh);
    window.addEventListener("master-provider-updated", refresh);
    window.addEventListener("master-auth-updated", refresh);
    const channel = supabase
      .channel("provider-messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          loadData();
        }
      )
      .subscribe();
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("master-messages-updated", refresh);
      window.removeEventListener("master-bookings-updated", refresh);
      window.removeEventListener("master-provider-updated", refresh);
      window.removeEventListener("master-auth-updated", refresh);
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (!provider) return;
    const identityId = String(provider.id);
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
        if (!payload || payload?.receiverId === provider.id) {
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
            userType: "provider",
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
  }, [provider]);
  const sendTypingStatus = async (isTyping: boolean) => {
    const channel = presenceChannelRef.current;
    const currentIdentity = provider;
    const receiverId = selectedCustomerId;
    if (!channel || !currentIdentity || !receiverId) return;
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        senderId: String(currentIdentity.id),
        receiverId: String(receiverId),
        isTyping,
      },
    });
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
  const conversations = useMemo<Conversation[]>(() => {
    if (!provider) return [];
    const grouped = new Map<string, Message[]>();
    messages
      .filter(
        (message) =>
          message.senderId === provider.id ||
          message.receiverId === provider.id
      )
      .forEach((message) => {
        const customerId =
          message.senderType === "customer"
            ? message.senderId
            : message.receiverId;
        const existing = grouped.get(customerId) || [];
        existing.push(message);
        grouped.set(customerId, existing);
      });
    return Array.from(grouped.entries())
      .map(([customerId, customerMessages]) => {
        const customer = customers.find(
          (item) => item.id === customerId
        );
        if (!customer) return null;
        const sorted = [...customerMessages].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );
        return {
          customer,
          messages: sorted,
          lastMessage: sorted[sorted.length - 1],
        };
      })
      .filter(Boolean) as Conversation[];
  }, [messages, customers, provider]);
  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      return (
        conversation.customer.name
          .toLowerCase()
          .includes(query) ||
        conversation.customer.mobile.includes(query) ||
        conversation.customer.email
          .toLowerCase()
          .includes(query)
      );
    });
  }, [conversations, search]);
  const selectedConversation = conversations.find(
    (conversation) =>
      conversation.customer.id === selectedCustomerId
  );
  const markConversationRead = async (customerId: string) => {
    if (!provider) return;
    const conversationId = `${customerId}_${provider.id}`;
    const unreadMessages = messages.filter(
      (message) =>
        message.conversationId === conversationId &&
        message.receiverId === String(provider.id) &&
        !message.read
    );
    if (unreadMessages.length === 0) return;
    const results = await Promise.all(
      unreadMessages.map((message) =>
        supabase.rpc("mark_message_as_read", {
          p_message_id: String(message.id),
        })
      )
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      console.error("Supabase provider mark read error:", failed.error);
      return;
    }
    setMessages((current) =>
      current.map((message) =>
        message.conversationId === conversationId &&
        message.receiverId === String(provider.id)
          ? { ...message, read: true }
          : message
      )
    );
  };
  useEffect(() => {
    if (selectedCustomerId && provider) {
      void markConversationRead(selectedCustomerId);
    }
  }, [selectedCustomerId, provider]);
  useEffect(() => {
    let cancelled = false;
    const resolveAttachmentUrls = async () => {
      if (!provider) {
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
          const { data, error } = await supabase.storage
            .from(CHAT_ATTACHMENT_BUCKET)
            .createSignedUrl(path, 3600);
          if (!error && data?.signedUrl) {
            next[path] = data.signedUrl;
          }
        })
      );
      if (!cancelled) setAttachmentUrls(next);
    };
    void resolveAttachmentUrls();
    return () => {
      cancelled = true;
    };
  }, [messages, provider]);
  const uploadAttachment = async (file: File) => {
    if (!provider) return;
    if (uploadingAttachment) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      window.alert("File size must be 10 MB or less.");
      return;
    }
    setUploadingAttachment(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const authUser = authData.user;
      if (authError || !authUser) {
        window.alert("Your secure login session has expired. Please login again.");
        return;
      }
      // Storage paths use the real Supabase Auth UUID, not the public
      // customer/provider record ID. This lets Storage RLS verify ownership.
      const conversationId = `${selectedCustomerId}_${provider.id}`;
      const path = `${conversationId}/${authUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(CHAT_ATTACHMENT_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (uploadError) {
        console.error("Chat attachment upload error:", uploadError);
        window.alert("Attachment upload failed. Please try again.");
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
    if (!provider || !selectedCustomerId) return;
    const customer = customers.find((item) => String(item.id) === String(selectedCustomerId));
    if (!customer) return;
    const conversationId = `${customer.id}_${provider.id}`;
    const messageId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const { data, error } = await supabase.from("messages").insert({
      id: messageId,
      conversation_id: conversationId,
      sender_id: String(provider.id),
      receiver_id: String(customer.id),
      sender_type: "provider",
      message: JSON.stringify(attachment),
      read: false,
      created_at: createdAt,
    }).select("id,conversation_id,sender_id,receiver_id,sender_type,message,read,created_at").single();
    if (error) {
      console.error("Supabase attachment message error:", error);
      window.alert("Attachment message could not be sent.");
      return;
    }
    const newMessage: Message = {
      id: String(data.id),
      conversationId: String(data.conversation_id),
      senderId: String(data.sender_id),
      senderType: "provider",
      senderName: provider.name,
      receiverId: String(data.receiver_id),
      receiverType: "customer",
      text: String(data.message || ""),
      createdAt: data.created_at || createdAt,
      read: Boolean(data.read),
    };
    setMessages((current) => [...current, newMessage]);
    void sendTypingStatus(false);
    window.dispatchEvent(new Event("master-messages-updated"));
  };
  const sendMessage = async () => {
    if (!provider || !selectedCustomerId) return;
    const cleanText = text.trim();
    if (!cleanText) return;
    const customer = customers.find(
      (item) => String(item.id) === String(selectedCustomerId)
    );
    if (!customer) return;
    const conversationId = `${customer.id}_${provider.id}`;
    const messageId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: String(provider.id),
        receiver_id: String(customer.id),
        sender_type: "provider",
        message: cleanText,
        read: false,
        created_at: createdAt,
      })
      .select("id,conversation_id,sender_id,receiver_id,sender_type,message,read,created_at")
      .single();
    if (error) {
      console.error("Supabase provider send message error:", error);
      return;
    }
    const newMessage: Message = {
      id: String(data.id),
      conversationId: String(data.conversation_id),
      senderId: String(data.sender_id),
      senderType: "provider",
      senderName: provider.name,
      receiverId: String(data.receiver_id),
      receiverType: "customer",
      text: String(data.message || cleanText),
      createdAt: data.created_at || createdAt,
      read: Boolean(data.read),
    };
    setMessages((current) => [...current, newMessage]);
    setText("");
    void sendTypingStatus(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    window.dispatchEvent(new Event("master-messages-updated"));
  };
  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl border bg-white p-6 text-center text-sm">
          Loading messages...
        </div>
      </main>
    );
  }
  if (!provider) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
          <div className="mb-3 text-4xl">🔐</div>
          <h1 className="text-xl font-bold text-gray-900">
            Provider Login Required
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Login to view and reply to customer messages.
          </p>
          <Link
            href="/provider/login"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Provider Login
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-[calc(100vh-70px)] bg-gray-50">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
        {/* HEADER */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Customer Messages
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Reply to customers who contacted you.
            </p>
          </div>
          <Link
            href="/provider/dashboard"
            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            Dashboard
          </Link>
        </div>
        {/* MAIN CHAT BOX */}
        <div className="grid min-h-[560px] overflow-hidden rounded-xl border bg-white shadow-sm md:grid-cols-[280px_1fr]">
          {/* CUSTOMER LIST */}
          <aside className="border-b md:border-b-0 md:border-r">
            <div className="border-b p-3">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search customer..."
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-5 text-center text-sm text-gray-500">
                  <div className="mb-2 text-3xl">👤</div>
                  <p className="font-medium">
                    No customer conversations yet
                  </p>
                  <Link
                    href="/provider/dashboard"
                    className="mt-2 inline-block text-xs font-semibold text-blue-600"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const unread =
                    conversation.messages.filter(
                      (message) =>
                        message.receiverId === provider.id &&
                        message.receiverType === "provider" &&
                        !message.read
                    ).length;
                  return (
                    <button
                      key={conversation.customer.id}
                      onClick={() =>
                        setSelectedCustomerId(
                          conversation.customer.id
                        )
                      }
                      className={`w-full border-b p-3 text-left transition ${
                        selectedCustomerId ===
                        conversation.customer.id
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {conversation.customer.name
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-gray-900">
                              {conversation.customer.name}
                            </h3>
                            <p className="truncate text-[11px] text-gray-500">
                              {conversation.customer.mobile}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[10px] text-gray-400">
                            {getTime(
                              conversation.lastMessage.createdAt
                            )}
                          </span>
                          {unread > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 truncate pl-10 text-xs text-gray-600">
                        {getMessagePreview(conversation.lastMessage.text)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
          {/* CHAT */}
          <section className="flex min-h-[560px] flex-col">
            {!selectedConversation ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center">
                <div>
                  <div className="mb-2 text-5xl">💬</div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Select a customer
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a customer to view the conversation.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* CHAT HEADER */}
                <div className="flex items-center justify-between border-b px-3 py-2.5">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-gray-900">
                      {selectedConversation.customer.name}
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      {selectedConversation.customer.mobile}
                      <span
                        className={`ml-2 font-semibold ${
                          onlineIds.has(selectedConversation.customer.id)
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      >
                        • {getPresenceLabel(selectedConversation.customer.id)}
                      </span>
                    </p>
                    {typingUserId === selectedConversation.customer.id && (
                      <p className="mt-0.5 text-[10px] font-semibold text-blue-600">
                        typing...
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setShowDetails(true)}
                      className="rounded-lg bg-purple-50 px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-100"
                    >
                      View Details
                    </button>
                    <a
                      href={`tel:${selectedConversation.customer.mobile}`}
                      className="rounded-lg bg-green-50 px-2.5 py-1.5 text-[11px] font-semibold text-green-700 hover:bg-green-100"
                    >
                      📞 Call
                    </a>
                  </div>
                </div>
                {/* MESSAGES */}
                <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
                  {selectedConversation.messages.map((message) => {
                    const isMine =
                      message.senderId === provider.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isMine
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-xl px-3 py-2 ${
                            isMine
                              ? "rounded-br-sm bg-blue-600 text-white"
                              : "rounded-bl-sm border bg-white text-gray-900"
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
                                    <a href={attachmentUrl} target="_blank" rel="noreferrer">
                                      <img src={attachmentUrl} alt={attachment.name} className="max-h-56 max-w-full rounded-lg object-cover" />
                                    </a>
                                  ) : (
                                    <a href={attachmentUrl} target="_blank" rel="noreferrer" className="block rounded-lg bg-black/10 px-3 py-2 font-semibold underline">
                                      📎 {attachment.name}
                                    </a>
                                  )}
                                </div>
                              );
                            }
                            return <p className="break-words text-xs">{parsed.text}</p>;
                          })()}
                          <div
                            className={`mt-1 text-[9px] ${
                              isMine
                                ? "text-blue-100"
                                : "text-gray-400"
                            }`}
                          >
                            {getTime(message.createdAt)}
                            {isMine && (
                              <span className="ml-1.5">
                                {message.read ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* INPUT */}
                <div className="border-t bg-white p-3">
                  <div className="relative flex gap-2">
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
                      className="rounded-lg border px-2.5 py-2 text-lg hover:bg-gray-50"
                      title="Emoji"
                    >
                      😊
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAttachment}
                      className="rounded-lg border px-2.5 py-2 text-lg hover:bg-gray-50 disabled:opacity-50"
                      title="Attach file"
                    >
                      {uploadingAttachment ? "⏳" : "📎"}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 left-0 z-30 grid w-64 grid-cols-5 gap-1 rounded-xl border bg-white p-2 shadow-xl">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setText((current) => `${current}${emoji}`);
                              setShowEmojiPicker(false);
                            }}
                            className="rounded-lg p-2 text-xl hover:bg-gray-100"
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
                          sendMessage();
                        }
                      }}
                      onBlur={() => {
                        void sendTypingStatus(false);
                      }}
                      placeholder="Reply to customer..."
                      className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!text.trim()}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
      {/* CUSTOMER DETAILS MODAL */}
      {showDetails && selectedConversation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Customer Details
                </h2>
                <p className="text-xs text-gray-500">
                  Complete customer information
                </p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-gray-400">
                  Name
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {selectedConversation.customer.name}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-gray-400">
                  Mobile
                </p>
                <a
                  href={`tel:${selectedConversation.customer.mobile}`}
                  className="mt-0.5 block text-sm font-semibold text-blue-600"
                >
                  {selectedConversation.customer.mobile}
                </a>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-gray-400">
                  Email
                </p>
                <a
                  href={`mailto:${selectedConversation.customer.email}`}
                  className="mt-0.5 block break-all text-sm font-semibold text-blue-600"
                >
                  {selectedConversation.customer.email || "Not available"}
                </a>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-gray-400">
                  Address
                </p>
                <p className="mt-0.5 text-sm text-gray-700">
                  {selectedConversation.customer.address ||
                    "Not available"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-gray-400">
                  Total Messages
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {selectedConversation.messages.length}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-gray-400">
                  Last Message
                </p>
                <p className="mt-0.5 text-sm text-gray-700">
                  {getDateTime(
                    selectedConversation.lastMessage.createdAt
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="mt-4 w-full rounded-lg bg-gray-900 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}