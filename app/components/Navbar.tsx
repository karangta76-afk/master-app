"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";
import { supabase } from "@/lib/supabase";
type User = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
};
type Provider = {
  id: string;
  name: string;
  service: string;
  city: string;
  accountStatus?: "Pending" | "Approved" | "Blocked";
};
type Booking = {
  id: string;
  customerId: string;
  providerId: string;
  status:
    | "Pending"
    | "Accepted"
    | "Completed"
    | "Rejected"
    | "Cancelled";
};
type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  senderType: "customer" | "provider";
  read?: boolean;
};
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [providerLoggedIn, setProviderLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const loadAuth = useCallback(() => {
    try {
      const savedUser = localStorage.getItem("masterUser");
      const savedProvider = localStorage.getItem("masterProvider");
      const savedProviderLogin =
        localStorage.getItem("masterProviderLoggedIn") === "true";
      const savedAdminLogin =
        localStorage.getItem("masterAdminLoggedIn") === "true";
      setUser(savedUser ? JSON.parse(savedUser) : null);
      setProvider(savedProvider ? JSON.parse(savedProvider) : null);
      setProviderLoggedIn(savedProviderLogin);
      setAdminLoggedIn(savedAdminLogin);
    } catch {
      setUser(null);
      setProvider(null);
      setProviderLoggedIn(false);
      setAdminLoggedIn(false);
    }
  }, []);
  const loadNotifications = useCallback(() => {
    try {
      const savedUser = localStorage.getItem("masterUser");
      const savedProvider = localStorage.getItem("masterProvider");
      const currentUser: User | null = savedUser
        ? JSON.parse(savedUser)
        : null;
      const currentProvider: Provider | null = savedProvider
        ? JSON.parse(savedProvider)
        : null;
      const messages: Message[] = JSON.parse(
        localStorage.getItem("masterMessages") || "[]"
      );
      const bookings: Booking[] = JSON.parse(
        localStorage.getItem("masterBookings") || "[]"
      );
      if (currentUser) {
        const unreadMessages = messages.filter(
          (message) =>
            message.receiverId === currentUser.id &&
            message.senderType === "provider" &&
            !message.read
        ).length;
        const bookingNotifications = bookings.filter(
          (booking) =>
            booking.customerId === currentUser.id &&
            (booking.status === "Accepted" ||
              booking.status === "Rejected" ||
              booking.status === "Cancelled")
        ).length;
        setMessageCount(unreadMessages);
        setBookingCount(bookingNotifications);
        return;
      }
      if (currentProvider) {
        const unreadMessages = messages.filter(
          (message) =>
            message.receiverId === currentProvider.id &&
            message.senderType === "customer" &&
            !message.read
        ).length;
        const pendingBookings = bookings.filter(
          (booking) =>
            booking.providerId === currentProvider.id &&
            booking.status === "Pending"
        ).length;
        setMessageCount(unreadMessages);
        setBookingCount(pendingBookings);
        return;
      }
      setMessageCount(0);
      setBookingCount(0);
    } catch {
      setMessageCount(0);
      setBookingCount(0);
    }
  }, []);
  useEffect(() => {
    const handleUpdate = () => {
      loadAuth();
      loadNotifications();
    };
    const initialSync = window.setTimeout(handleUpdate, 0);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("master-auth-updated", handleUpdate);
    window.addEventListener("master-provider-updated", handleUpdate);
    window.addEventListener("master-bookings-updated", handleUpdate);
    window.addEventListener("master-messages-updated", handleUpdate);
    window.addEventListener("master-reviews-updated", handleUpdate);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("master-auth-updated", handleUpdate);
      window.removeEventListener("master-provider-updated", handleUpdate);
      window.removeEventListener("master-bookings-updated", handleUpdate);
      window.removeEventListener("master-messages-updated", handleUpdate);
      window.removeEventListener("master-reviews-updated", handleUpdate);
    };
  }, [loadAuth, loadNotifications]);
  async function logoutCustomer() {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    localStorage.removeItem("masterUser");
    localStorage.removeItem("masterUserMobile");
    setUser(null);
    setMenuOpen(false);
    window.dispatchEvent(new Event("master-auth-updated"));
    router.push("/");
  }
  async function logoutProvider() {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    localStorage.removeItem("masterProvider");
    localStorage.removeItem("masterProviderLoggedIn");
    setProvider(null);
    setProviderLoggedIn(false);
    setMenuOpen(false);
    window.dispatchEvent(new Event("master-auth-updated"));
    window.dispatchEvent(new Event("master-provider-updated"));
    router.push("/");
  }
  async function logoutAdmin() {
    await supabase.auth.signOut();
    localStorage.removeItem("masterAdmin");
    localStorage.removeItem("masterAdminLoggedIn");
    setAdminLoggedIn(false);
    setMenuOpen(false);
    window.dispatchEvent(new Event("master-auth-updated"));
    router.push("/");
  }
  const isCustomer = !!user;
  const isProvider = providerLoggedIn && !!provider;
  const isAdmin = adminLoggedIn;
  function desktopLinkClass(path: string) {
    const active = pathname === path;
    return active
      ? "rounded-xl bg-blue-50/80 text-blue-700 font-semibold px-3.5 py-2 text-sm transition-all duration-200"
      : "rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium px-3.5 py-2 text-sm transition-all duration-200";
  }

  function mobileLinkClass(path: string) {
    const active = pathname === path;
    return active
      ? "flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"
      : "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50";
  }

  return (
    <header className="sticky top-2 sm:top-3.5 z-50 px-3 sm:px-6 transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl sm:px-6">
        {/* BRAND LOGO */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-95"
          onClick={() => setMenuOpen(false)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-700 text-xl font-bold text-white shadow-md shadow-blue-600/25 transition-transform duration-300 group-hover:scale-105">
            M
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold tracking-tight text-slate-900">
                Master App
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                PRO
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              Verified Local Services
            </div>
          </div>
        </Link>

        {/* DESKTOP NAVIGATION */}
        {!pathname.startsWith("/admin") && (
          <nav className="hidden items-center gap-1.5 md:flex">
            {/* ADMIN */}
            {isAdmin && (
              <>
                <Link
                  href="/admin/dashboard"
                  className={desktopLinkClass("/admin/dashboard")}
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/providers"
                  className={desktopLinkClass("/admin/providers")}
                >
                  Providers
                </Link>
                <Link
                  href="/admin/customers"
                  className={desktopLinkClass("/admin/customers")}
                >
                  Customers
                </Link>
                <Link
                  href="/admin/bookings"
                  className={desktopLinkClass("/admin/bookings")}
                >
                  Bookings
                </Link>
                <Link
                  href="/admin/reviews"
                  className={desktopLinkClass("/admin/reviews")}
                >
                  Reviews
                </Link>
                <Link
                  href="/admin/services"
                  className={desktopLinkClass("/admin/services")}
                >
                  Services
                </Link>
                <button
                  onClick={logoutAdmin}
                  className="ml-2 rounded-xl border border-red-200 bg-red-50/60 px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Logout
                </button>
              </>
            )}

            {/* CUSTOMER */}
            {!isAdmin && isCustomer && (
              <>
                <Link
                  href="/services"
                  className={desktopLinkClass("/services")}
                >
                  Services
                </Link>
                <Link
                  href="/ai-assistant"
                  className={`flex items-center gap-1.5 ${desktopLinkClass("/ai-assistant")}`}
                >
                  <span className="text-blue-600">✨</span>
                  <span>AI Assistant</span>
                </Link>
                <Link
                  href="/bookings"
                  className={`flex items-center ${desktopLinkClass("/bookings")}`}
                >
                  <span>My Bookings</span>
                  <Badge count={bookingCount} />
                </Link>
                <Link
                  href="/messages"
                  className={`flex items-center ${desktopLinkClass("/messages")}`}
                >
                  <span>Messages</span>
                  <Badge count={messageCount} />
                </Link>
                <Link
                  href="/account"
                  className={desktopLinkClass("/account")}
                >
                  Account
                </Link>
                <div className="mx-1">
                  <NotificationBell />
                </div>
                <button
                  onClick={logoutCustomer}
                  className="ml-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  Logout
                </button>
              </>
            )}

            {/* PROVIDER */}
            {!isAdmin && !isCustomer && isProvider && (
              <>
                <Link
                  href="/provider/dashboard"
                  className={`flex items-center ${desktopLinkClass("/provider/dashboard")}`}
                >
                  <span>Dashboard</span>
                  <Badge count={bookingCount} />
                </Link>
                <Link
                  href="/provider/messages"
                  className={`flex items-center ${desktopLinkClass("/provider/messages")}`}
                >
                  <span>Messages</span>
                  <Badge count={messageCount} />
                </Link>
                <div className="mx-1">
                  <NotificationBell />
                </div>
                <button
                  onClick={logoutProvider}
                  className="ml-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  Logout
                </button>
              </>
            )}

            {/* GUEST */}
            {!isAdmin && !isCustomer && !isProvider && (
              <>
                <Link
                  href="/services"
                  className={desktopLinkClass("/services")}
                >
                  Services
                </Link>
                <Link
                  href="/ai-assistant"
                  className={`flex items-center gap-1.5 ${desktopLinkClass("/ai-assistant")}`}
                >
                  <span className="text-blue-600">✨</span>
                  <span>AI Assistant</span>
                </Link>
                <Link
                  href="/provider/register"
                  className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Partner With Us
                </Link>
                <div className="ml-2 flex items-center gap-2">
                  <Link
                    href="/login"
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-[0.98]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/provider/login"
                    className="rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-2xs transition-all active:scale-[0.98]"
                  >
                    Provider Login
                  </Link>
                </div>
              </>
            )}
          </nav>
        )}

        {/* MOBILE MENU BUTTON */}
        {!pathname.startsWith("/admin") && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? (
              <span className="text-lg font-bold">✕</span>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* MOBILE NAVIGATION DRAWER */}
      {!pathname.startsWith("/admin") && menuOpen && (
        <div className="mt-2 mx-auto max-w-7xl rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur-xl shadow-xl md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1.5">
            {/* ADMIN MOBILE */}
            {isAdmin && (
              <>
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/admin/dashboard")}
                >
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/admin/providers"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/admin/providers")}
                >
                  <span>Providers</span>
                </Link>
                <Link
                  href="/admin/customers"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/admin/customers")}
                >
                  <span>Customers</span>
                </Link>
                <Link
                  href="/admin/bookings"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/admin/bookings")}
                >
                  <span>Bookings</span>
                </Link>
                <Link
                  href="/admin/reviews"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/admin/reviews")}
                >
                  <span>Reviews</span>
                </Link>
                <Link
                  href="/admin/services"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/admin/services")}
                >
                  <span>Services</span>
                </Link>
                <button
                  onClick={logoutAdmin}
                  className="mt-2 w-full rounded-xl bg-red-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-red-700"
                >
                  Logout
                </button>
              </>
            )}

            {/* CUSTOMER MOBILE */}
            {!isAdmin && isCustomer && (
              <>
                <Link
                  href="/services"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/services")}
                >
                  <span>Explore Services</span>
                </Link>
                <Link
                  href="/ai-assistant"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/ai-assistant")}
                >
                  <span className="flex items-center gap-2">
                    <span>✨</span>
                    <span>AI Assistant</span>
                  </span>
                </Link>
                <Link
                  href="/bookings"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/bookings")}
                >
                  <span>My Bookings</span>
                  <Badge count={bookingCount} />
                </Link>
                <Link
                  href="/messages"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/messages")}
                >
                  <span>Messages</span>
                  <Badge count={messageCount} />
                </Link>
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/account")}
                >
                  <span>Account Settings</span>
                </Link>
                <div className="flex items-center justify-between rounded-xl px-4 py-2">
                  <span className="text-sm font-medium text-slate-700">Notifications</span>
                  <NotificationBell />
                </div>
                <button
                  onClick={logoutCustomer}
                  className="mt-2 w-full rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-center font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Logout
                </button>
              </>
            )}

            {/* PROVIDER MOBILE */}
            {!isAdmin && !isCustomer && isProvider && (
              <>
                <Link
                  href="/provider/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/provider/dashboard")}
                >
                  <span>Provider Dashboard</span>
                  <Badge count={bookingCount} />
                </Link>
                <Link
                  href="/provider/messages"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/provider/messages")}
                >
                  <span>Messages</span>
                  <Badge count={messageCount} />
                </Link>
                <div className="flex items-center justify-between rounded-xl px-4 py-2">
                  <span className="text-sm font-medium text-slate-700">Notifications</span>
                  <NotificationBell />
                </div>
                <button
                  onClick={logoutProvider}
                  className="mt-2 w-full rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-center font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Logout
                </button>
              </>
            )}

            {/* GUEST MOBILE */}
            {!isAdmin && !isCustomer && !isProvider && (
              <>
                <Link
                  href="/services"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/services")}
                >
                  <span>Services Directory</span>
                </Link>
                <Link
                  href="/ai-assistant"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/ai-assistant")}
                >
                  <span className="flex items-center gap-2">
                    <span>✨</span>
                    <span>AI Assistant</span>
                  </span>
                </Link>
                <Link
                  href="/provider/register"
                  onClick={() => setMenuOpen(false)}
                  className={mobileLinkClass("/provider/register")}
                >
                  <span>Become a Provider Partner</span>
                </Link>
                <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-center font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Customer Sign In
                  </Link>
                  <Link
                    href="/provider/login"
                    onClick={() => setMenuOpen(false)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Provider Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
