"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type UserType = "customer" | "provider";

type Notification = {
  id: string;
  user_id: string;
  user_type: UserType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  booking_id: string | null;
  type: string | null;
};

type ActiveIdentity = {
  id: string;
  userType: UserType;
};

function getActiveIdentity(): ActiveIdentity | null {
  if (typeof window === "undefined") return null;

  const activeRole = localStorage.getItem("masterActiveRole");
  const providerLoggedIn =
    localStorage.getItem("masterProviderLoggedIn") === "true";

  if (activeRole === "provider" && providerLoggedIn) {
    try {
      const providerRaw = localStorage.getItem("masterProvider");
      if (providerRaw) {
        const provider = JSON.parse(providerRaw);
        if (provider?.id) {
          return { id: String(provider.id), userType: "provider" };
        }
      }
    } catch {
      // Ignore invalid localStorage data.
    }
  }

  try {
    const userRaw = localStorage.getItem("masterUser");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user?.id) {
        return { id: String(user.id), userType: "customer" };
      }
    }
  } catch {
    // Ignore invalid localStorage data.
  }

  if (providerLoggedIn) {
    try {
      const providerRaw = localStorage.getItem("masterProvider");
      if (providerRaw) {
        const provider = JSON.parse(providerRaw);
        if (provider?.id) {
          return { id: String(provider.id), userType: "provider" };
        }
      }
    } catch {
      // Ignore invalid localStorage data.
    }
  }

  return null;
}

function getNotificationIcon(type: string | null) {
  switch (type) {
    case "booking":
      return "📅";
    case "status":
      return "🔔";
    case "message":
      return "💬";
    case "review":
      return "⭐";
    default:
      return "🔔";
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function NotificationsPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState<ActiveIdentity | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((notification) => !notification.read);
    }
    return notifications;
  }, [filter, notifications]);

  async function loadNotifications(showLoader = true) {
    const currentIdentity = getActiveIdentity();
    setIdentity(currentIdentity);

    if (!currentIdentity) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select(
          "id,user_id,user_type,title,message,link,read,created_at,booking_id,type"
        )
        .eq("user_id", currentIdentity.id)
        .order("created_at", { ascending: false });

      if (fetchError || !data || data.length === 0) {
        if (fetchError) {
          console.warn("Notification Supabase query error, checking local fallback:", fetchError);
        }
        try {
          const cached = localStorage.getItem("masterNotifications");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setNotifications(parsed);
              setLoading(false);
              return;
            }
          }
        } catch (_) {}

        if (fetchError) {
          setError("Could not sync notifications with server. Showing cached alerts.");
        }
        setNotifications((data || []) as Notification[]);
      } else {
        setNotifications(data as Notification[]);
        try {
          localStorage.setItem("masterNotifications", JSON.stringify(data));
        } catch (_) {}
      }
    } catch (err: any) {
      console.error("Notifications fetch error:", err);
      try {
        const cached = localStorage.getItem("masterNotifications");
        if (cached) {
          setNotifications(JSON.parse(cached));
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notification: Notification) {
    if (notification.read || !identity) return;

    // Optimistically update
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item
      )
    );

    try {
      const stored = localStorage.getItem("masterNotifications");
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.map((item: any) =>
          item.id === notification.id ? { ...item, read: true } : item
        );
        localStorage.setItem("masterNotifications", JSON.stringify(updated));
      }
    } catch (_) {}

    window.dispatchEvent(new CustomEvent("master-notifications-updated"));

    try {
      await supabase.rpc("mark_notification_as_read", {
        p_notification_id: String(notification.id),
      });
    } catch (err) {
      console.warn("Server mark read fallback:", err);
    }
  }

  async function markAllAsRead() {
    if (!identity || unreadCount === 0) return;
    setActionLoading(true);
    setError("");

    const unreadIds = notifications
      .filter((item) => !item.read)
      .map((item) => item.id);

    // Optimistic update
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true }))
    );

    try {
      const stored = localStorage.getItem("masterNotifications");
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.map((item: any) => ({ ...item, read: true }));
        localStorage.setItem("masterNotifications", JSON.stringify(updated));
      }
    } catch (_) {}

    window.dispatchEvent(new CustomEvent("master-notifications-updated"));

    for (const notificationId of unreadIds) {
      try {
        await supabase.rpc("mark_notification_as_read", {
          p_notification_id: String(notificationId),
        });
      } catch (e) {
        console.warn("Could not mark all on server:", e);
      }
    }

    setActionLoading(false);
  }

  async function openNotification(notification: Notification) {
    await markAsRead(notification);
    const fallback =
      identity?.userType === "provider" ? "/provider/bookings" : "/bookings";
    router.push(notification.link || fallback);
  }

  useEffect(() => {
    void loadNotifications();

    const handleStorage = () => {
      void loadNotifications(false);
    };
    const handleCustomUpdate = () => {
      void loadNotifications(false);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("master-notifications-updated", handleCustomUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("master-notifications-updated", handleCustomUpdate);
    };
  }, []);

  useEffect(() => {
    if (!identity) return;

    const channel = supabase
      .channel(`notifications-${identity.userType}-${identity.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${identity.id}`,
        },
        () => {
          void loadNotifications(false);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [identity?.id, identity?.userType]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50/60 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm font-semibold text-slate-700">Loading your notifications...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!identity) {
    return (
      <main className="min-h-[calc(100vh-120px)] bg-slate-50/60 px-4 py-16">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
            🔔
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Please log in to your account to view your booking updates and messages.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:from-blue-700 hover:to-indigo-700"
            >
              Customer Login →
            </Link>
            <Link
              href="/provider/login"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Provider Portal Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/60 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* HEADER BAR */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${
                    unreadCount === 1 ? "" : "s"
                  }.`
                : "You are all caught up!"}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={actionLoading}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
            >
              {actionLoading ? "Updating..." : "Mark all as read"}
            </button>
          )}
        </div>

        {/* FILTER TABS */}
        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
              filter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Notifications
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
              filter === "unread"
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-medium text-amber-800">
            {error}
          </div>
        )}

        {/* NOTIFICATIONS LIST */}
        {visibleNotifications.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🔔
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              {filter === "unread"
                ? "You have acknowledged all your current alerts."
                : "Booking confirmations, status changes, and technician replies will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification)}
                className={`w-full rounded-2xl border p-4 text-left transition duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                  notification.read
                    ? "border-slate-200/80 bg-white shadow-2xs"
                    : "border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 shadow-xs"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg shadow-2xs ${
                      notification.read
                        ? "border border-slate-100 bg-slate-100 text-slate-700"
                        : "border border-blue-200 bg-white text-blue-600"
                    }`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-sm ${
                              notification.read
                                ? "font-semibold text-slate-800"
                                : "font-bold text-slate-900"
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                      {notification.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                      {notification.booking_id ? (
                        <span className="font-mono text-slate-400">
                          ID: {notification.booking_id}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="font-semibold text-blue-600">
                        {notification.read ? "View details →" : "Tap to open →"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}