"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
type NotificationItem = {
  id: string;
  title: string;
  text: string;
  time: string;
  href: string;
  read: boolean;
};
type User = {
  id: string;
};
type Provider = {
  id: string;
};
type Booking = {
  id: string;
  customerId: string;
  providerId: string;
  provider?: string;
  service?: string;
  status: string;
  createdAt: string;
};
type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  receiverType: string;
  senderType: string;
  text: string;
  createdAt: string;
  read?: boolean;
};
type SupabaseNotification = {
  id: string;
  user_id: string;
  user_type: "customer" | "provider";
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  booking_id: string | null;
  type: string | null;
};
type Review = {
  id: string;
  providerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
};
function formatTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  async function loadNotifications() {
    if (typeof window === "undefined") return;
    try {
      const userData = localStorage.getItem("masterUser");
      const providerData = localStorage.getItem("masterProvider");
      const user: User | null = userData ? JSON.parse(userData) : null;
      const provider: Provider | null = providerData
        ? JSON.parse(providerData)
        : null;
      const bookings: Booking[] = JSON.parse(
        localStorage.getItem("masterBookings") || "[]"
      );
      const messages: Message[] = JSON.parse(
        localStorage.getItem("masterMessages") || "[]"
      );
      const reviews: Review[] = JSON.parse(
        localStorage.getItem("masterReviews") || "[]"
      );
      const readIds: string[] = JSON.parse(
        localStorage.getItem("masterReadNotifications") || "[]"
      );
      const list: NotificationItem[] = [];
      // CUSTOMER NOTIFICATIONS
      if (user) {
        const customerMessages = messages.filter(
          (message) =>
            message.receiverId === user.id &&
            message.receiverType === "customer" &&
            message.read !== true
        );
        customerMessages.forEach((message) => {
          list.push({
            id: `message-${message.id}`,
            title: "New Message",
            text: message.text || "You have a new message.",
            time: message.createdAt,
            href: "/messages",
            read: readIds.includes(`message-${message.id}`),
          });
        });
        const customerBookings = bookings.filter(
          (booking) => booking.customerId === user.id
        );
        customerBookings.forEach((booking) => {
          let title = "";
          let text = "";
          if (booking.status === "Pending") {
            title = "Booking Submitted";
            text = `Your booking with ${booking.provider || "provider"} is pending.`;
          }
          if (booking.status === "Accepted") {
            title = "Booking Accepted";
            text = `Your booking with ${booking.provider || "provider"} has been accepted.`;
          }
          if (booking.status === "Rejected") {
            title = "Booking Rejected";
            text = `Your booking with ${booking.provider || "provider"} was rejected.`;
          }
          if (booking.status === "Cancelled") {
            title = "Booking Cancelled";
            text = `Your booking with ${booking.provider || "provider"} was cancelled.`;
          }
          if (booking.status === "Completed") {
            title = "Booking Completed";
            text = `Your booking with ${booking.provider || "provider"} is completed.`;
          }
          if (title) {
            const notificationId = `booking-${booking.id}-${booking.status}`;
            list.push({
              id: notificationId,
              title,
              text,
              time: booking.createdAt,
              href: "/bookings",
              read: readIds.includes(notificationId),
            });
          }
        });
      }
      // PROVIDER NOTIFICATIONS
      if (provider) {
        const providerMessages = messages.filter(
          (message) =>
            message.receiverId === provider.id &&
            message.receiverType === "provider" &&
            message.read !== true
        );
        providerMessages.forEach((message) => {
          list.push({
            id: `provider-message-${message.id}`,
            title: "New Customer Message",
            text: message.text || "You have a new customer message.",
            time: message.createdAt,
            href: "/provider/messages",
            read: readIds.includes(`provider-message-${message.id}`),
          });
        });
        const providerBookings = bookings.filter(
          (booking) => booking.providerId === provider.id
        );
        providerBookings.forEach((booking) => {
          let title = "";
          let text = "";
          if (booking.status === "Pending") {
            title = "New Booking Request";
            text = `You have a new booking request from a customer.`;
          }
          if (booking.status === "Completed") {
            title = "Booking Completed";
            text = `Booking ${booking.id} has been completed.`;
          }
          if (booking.status === "Cancelled") {
            title = "Booking Cancelled";
            text = `Booking ${booking.id} has been cancelled.`;
          }
          if (title) {
            const notificationId = `provider-booking-${booking.id}-${booking.status}`;
            list.push({
              id: notificationId,
              title,
              text,
              time: booking.createdAt,
              href: "/provider/dashboard",
              read: readIds.includes(notificationId),
            });
          }
        });
        const providerReviews = reviews.filter(
          (review) => review.providerId === provider.id
        );
        providerReviews.forEach((review) => {
          const notificationId = `review-${review.id}`;
          list.push({
            id: notificationId,
            title: "New Review",
            text: `You received a ${review.rating}/5 rating.`,
            time: review.createdAt,
            href: "/provider/dashboard",
            read: readIds.includes(notificationId),
          });
        });
      }
      // SUPABASE NOTIFICATIONS
      // Keep the existing localStorage notifications above, and merge
      // the new database notifications into the same bell.
      const dbTargets: Array<{ id: string; userType: "customer" | "provider" }> = [];
      if (user?.id) {
        dbTargets.push({
          id: String(user.id),
          userType: "customer",
        });
      }
      if (provider?.id) {
        dbTargets.push({
          id: String(provider.id),
          userType: "provider",
        });
      }
      for (const target of dbTargets) {
        const notificationQuery = await supabase
          .from("notifications")
          .select(
            "id,user_id,user_type,title,message,link,read,created_at,booking_id,type"
          )
          .eq("user_id", target.id)
          .eq("user_type", target.userType)
          .order("created_at", { ascending: false })
          .limit(30);
        let dbNotifications: SupabaseNotification[] = [];
        if (!notificationQuery.error) {
          dbNotifications =
            (notificationQuery.data || []) as SupabaseNotification[];
        } else {
          // Retry with only the core columns. This handles databases where
          // optional booking_id/type columns have not been added yet.
          const coreQuery = await supabase
            .from("notifications")
            .select(
              "id,user_id,user_type,title,message,link,read,created_at"
            )
            .eq("user_id", target.id)
            .eq("user_type", target.userType)
            .order("created_at", { ascending: false })
            .limit(30);
          if (!coreQuery.error) {
            dbNotifications = (coreQuery.data || []).map((row) => ({
              ...(row as SupabaseNotification),
              booking_id: null,
              type: null,
            }));
          } else {
            // The existing localStorage notifications remain usable even if
            // Supabase notifications are unavailable because of RLS/table
            // configuration. Do not crash or spam the console with an empty
            // Supabase error object.
            console.warn(
              "Supabase notifications unavailable; using local notifications.",
              {
                message: notificationQuery.error?.message || "",
                code: notificationQuery.error?.code || "",
                details: notificationQuery.error?.details || "",
                hint: notificationQuery.error?.hint || "",
                coreMessage: coreQuery.error?.message || "",
                coreCode: coreQuery.error?.code || "",
              }
            );
            continue;
          }
        }
        dbNotifications.forEach(
          (notification) => {
            list.push({
              id: `db-${notification.id}`,
              title: notification.title || "Notification",
              text: notification.message || "You have a new notification.",
              time: notification.created_at,
              href:
                notification.link ||
                (notification.user_type === "provider"
                  ? "/provider/bookings"
                  : "/bookings"),
              read: notification.read === true,
            });
          }
        );
      }
      list.sort((a, b) => {
        return (
          new Date(b.time).getTime() -
          new Date(a.time).getTime()
        );
      });
      setNotifications(list.slice(0, 30));
    } catch (error) {
      console.error("Notification error:", error);
      setNotifications([]);
    }
  }
  async function markAsRead(id: string) {
    // Database notification
    if (id.startsWith("db-")) {
      const notificationId = id.slice(3);
      const { data, error } = await supabase.rpc(
        "mark_notification_as_read",
        { p_notification_id: String(notificationId) }
      );
      if (error || data !== true) {
        console.error("Supabase mark-read error:", error || "Notification was not updated");
        return;
      }
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read: true } : item
        )
      );
      window.dispatchEvent(new Event("master-notifications-updated"));
      return;
    }
    // Existing localStorage notification
    const existing: string[] = JSON.parse(
      localStorage.getItem("masterReadNotifications") || "[]"
    );
    if (!existing.includes(id)) {
      existing.push(id);
    }
    localStorage.setItem(
      "masterReadNotifications",
      JSON.stringify(existing)
    );
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: true } : item
      )
    );
  }
  async function markAllRead() {
    const ids = notifications.map((item) => item.id);
    const dbIds = ids
      .filter((id) => id.startsWith("db-"))
      .map((id) => id.slice(3));
    if (dbIds.length > 0) {
      for (const notificationId of dbIds) {
        const { data, error } = await supabase.rpc(
          "mark_notification_as_read",
          { p_notification_id: String(notificationId) }
        );
        if (error || data !== true) {
          console.error(
            "Supabase mark-all-read error:",
            error || `Notification ${notificationId} was not updated`
          );
        }
      }
    }
    const localIds = ids.filter((id) => !id.startsWith("db-"));
    if (localIds.length > 0) {
      const existing: string[] = JSON.parse(
        localStorage.getItem("masterReadNotifications") || "[]"
      );
      const merged = Array.from(
        new Set([...existing, ...localIds])
      );
      localStorage.setItem(
        "masterReadNotifications",
        JSON.stringify(merged)
      );
    }
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
      }))
    );
    window.dispatchEvent(new Event("master-notifications-updated"));
  }
  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => {
      loadNotifications();
    };
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("master-bookings-updated", handleUpdate);
    window.addEventListener("master-messages-updated", handleUpdate);
    window.addEventListener("master-reviews-updated", handleUpdate);
    window.addEventListener("master-auth-updated", handleUpdate);
    window.addEventListener("master-provider-updated", handleUpdate);
    window.addEventListener("master-notifications-updated", handleUpdate);
    const channels: ReturnType<typeof supabase.channel>[] = [];
    try {
      const userData = localStorage.getItem("masterUser");
      const providerData = localStorage.getItem("masterProvider");
      const user: User | null = userData ? JSON.parse(userData) : null;
      const provider: Provider | null = providerData
        ? JSON.parse(providerData)
        : null;
      if (user?.id) {
        const customerChannel = supabase
          .channel(`notification-bell-customer-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            handleUpdate
          )
          .subscribe();
        channels.push(customerChannel);
      }
      if (provider?.id) {
        const providerChannel = supabase
          .channel(`notification-bell-provider-${provider.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${provider.id}`,
            },
            handleUpdate
          )
          .subscribe();
        channels.push(providerChannel);
      }
    } catch (error) {
      console.error("Notification realtime setup error:", error);
    }
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("master-bookings-updated", handleUpdate);
      window.removeEventListener("master-messages-updated", handleUpdate);
      window.removeEventListener("master-reviews-updated", handleUpdate);
      window.removeEventListener("master-auth-updated", handleUpdate);
      window.removeEventListener("master-provider-updated", handleUpdate);
      window.removeEventListener("master-notifications-updated", handleUpdate);
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, []);
  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-xl shadow-sm hover:bg-gray-50"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-[350px] max-w-[90vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="font-bold text-gray-900">
                  Notifications
                </h3>
                <p className="text-xs text-gray-500">
                  {unreadCount} unread
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="mb-2 text-3xl">🔔</div>
                  <p className="font-medium text-gray-700">
                    No notifications
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    You are all caught up.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    onClick={() => {
                      void markAsRead(notification.id);
                      setOpen(false);
                    }}
                    className={`block border-b px-4 py-3 transition hover:bg-gray-50 ${
                      notification.read ? "bg-white" : "bg-blue-50"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                          notification.read
                            ? "bg-gray-300"
                            : "bg-blue-600"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="text-[10px] font-bold text-blue-600">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {notification.text}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {formatTime(notification.time)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}