"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
type Provider = {
  id: string;
  name?: string;
  availability?: "Available" | "Not Available" | "Temporarily Unavailable";
};
function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center text-sm">
      {children}
    </span>
  );
}
export default function ProviderLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const isLoginPage =
    pathname === "/provider/login" ||
    pathname === "/provider/register";
  // Public provider profile pages such as /provider/[id] and
  // /provider/[id]/book are customer-facing pages and must not
  // show the logged-in provider sidebar.
  const providerPathParts = pathname
    .split("/")
    .filter(Boolean);
  const providerInternalSections = new Set([
    "login",
    "register",
    "dashboard",
    "bookings",
    "messages",
    "reviews",
    "earnings",
    "account",
    "support",
  ]);
  const isPublicProviderPage =
    providerPathParts[0] === "provider" &&
    providerPathParts.length >= 2 &&
    !providerInternalSections.has(providerPathParts[1]);
  useEffect(() => {
    void loadProvider();
    const handleProviderUpdate = () => {
      void loadProvider();
    };
    window.addEventListener("storage", handleProviderUpdate);
    window.addEventListener(
      "master-provider-updated",
      handleProviderUpdate
    );
    window.addEventListener(
      "master-bookings-updated",
      handleProviderUpdate
    );
    return () => {
      window.removeEventListener("storage", handleProviderUpdate);
      window.removeEventListener(
        "master-provider-updated",
        handleProviderUpdate
      );
      window.removeEventListener(
        "master-bookings-updated",
        handleProviderUpdate
      );
    };
  }, []);
  async function loadProvider() {
    try {
      const saved = window.localStorage.getItem("masterProvider");
      if (!saved) {
        setProvider(null);
        setPendingBookings(0);
        return;
      }
      const currentProvider = JSON.parse(saved) as Provider;
      setProvider(currentProvider);
      if (!currentProvider.id) {
        setPendingBookings(0);
        return;
      }
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id")
        .eq("provider_id", currentProvider.id)
        .eq("status", "Pending");
      if (error) {
        console.error("Provider layout bookings error:", error);
        setPendingBookings(0);
        return;
      }
      setPendingBookings(bookings?.length ?? 0);
    } catch (error) {
      console.error("Provider layout load error:", error);
      setProvider(null);
      setPendingBookings(0);
    }
  }
  async function toggleAvailability() {
    if (!provider?.id || updatingAvailability) {
      return;
    }
    const nextAvailability =
      provider.availability === "Available"
        ? "Not Available"
        : "Available";
    setUpdatingAvailability(true);
    try {
      const { data, error } = await supabase
        .from("providers")
        .update({ availability: nextAvailability })
        .eq("id", provider.id)
        .select("*")
        .maybeSingle();
      if (error) {
        throw error;
      }
      const updatedProvider: Provider = {
        ...provider,
        ...(data || {}),
        availability: nextAvailability,
      } as Provider;
      setProvider(updatedProvider);
      window.localStorage.setItem(
        "masterProvider",
        JSON.stringify(updatedProvider)
      );
      window.dispatchEvent(
        new Event("master-provider-updated")
      );
    } catch (error) {
      console.error("Availability update failed:", error);
    } finally {
      setUpdatingAvailability(false);
    }
  }
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore auth logout errors.
    }
    window.localStorage.removeItem("masterProvider");
    window.localStorage.removeItem("masterProviderLoggedIn");
    window.localStorage.removeItem("masterProviderId");
    window.localStorage.removeItem("masterProviderMobile");
    window.localStorage.setItem("masterActiveRole", "");
    window.dispatchEvent(
      new Event("master-auth-updated")
    );
    window.location.href = "/provider/login";
  }
  function isActive(path: string) {
    return pathname === path;
  }
  function linkClass(path: string) {
    return `flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition ${
      isActive(path)
        ? "bg-blue-50 font-bold text-blue-700"
        : "font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600"
    }`;
  }
  if (isLoginPage || isPublicProviderPage) {
    return <>{children}</>;
  }
  const availabilityOnline =
    provider?.availability === "Available";
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f6f8fc]">
      <div className="flex min-h-[calc(100vh-64px)]">
        {/* PERSISTENT PROVIDER SIDEBAR */}
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
          <div className="flex h-full flex-col p-3">
            <nav className="space-y-1">
              <Link
                href="/provider/dashboard"
                className={linkClass("/provider/dashboard")}
              >
                <span className="flex items-center gap-2">
                  <Icon>🏠</Icon>
                  Dashboard
                </span>
              </Link>
              <Link
                href="/provider/bookings"
                className={linkClass("/provider/bookings")}
              >
                <span className="flex items-center gap-2">
                  <Icon>📋</Icon>
                  My Bookings
                </span>
                {pendingBookings > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {pendingBookings}
                  </span>
                )}
              </Link>
              <Link
                href="/provider/messages"
                className={linkClass("/provider/messages")}
              >
                <span className="flex items-center gap-2">
                  <Icon>💬</Icon>
                  Messages
                </span>
              </Link>
              <Link
                href="/provider/reviews"
                className={linkClass("/provider/reviews")}
              >
                <span className="flex items-center gap-2">
                  <Icon>⭐</Icon>
                  Reviews
                </span>
              </Link>
              <Link
                href="/provider/earnings"
                className={linkClass("/provider/earnings")}
              >
                <span className="flex items-center gap-2">
                  <Icon>💰</Icon>
                  Earnings
                </span>
              </Link>
              <Link
                href="/provider/account/edit"
                className={linkClass("/provider/account/edit")}
              >
                <span className="flex items-center gap-2">
                  <Icon>👤</Icon>
                  My Profile
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void toggleAvailability()}
                disabled={updatingAvailability}
                className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <Icon>🕐</Icon>
                  Availability
                </span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    availabilityOnline
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                />
              </button>
            </nav>
            <div className="mt-auto pt-3">
              <div className="rounded-xl bg-slate-50 p-2.5">
                <div className="text-base">🎧</div>
                <p className="mt-1 text-xs font-bold text-slate-900">
                  Need Help?
                </p>
                <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                  Contact Master App support.
                </p>
                <button
                  type="button"
                  className="mt-1.5 text-[10px] font-bold text-blue-600"
                >
                  Contact Support →
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Icon>🚪</Icon>
                Logout
              </button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          {/* MOBILE PROVIDER NAVIGATION */}
          <div className="border-b border-slate-200 bg-white p-1.5 lg:hidden">
            <div className="grid grid-cols-4 gap-1">
              <Link
                href="/provider/dashboard"
                className={`rounded-md p-1.5 text-center text-[10px] font-bold ${
                  isActive("/provider/dashboard")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600"
                }`}
              >
                🏠
                <div>Dashboard</div>
              </Link>
              <Link
                href="/provider/bookings"
                className={`rounded-md p-1.5 text-center text-[10px] font-bold ${
                  isActive("/provider/bookings")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600"
                }`}
              >
                📋
                <div>Bookings</div>
              </Link>
              <Link
                href="/provider/messages"
                className={`rounded-md p-1.5 text-center text-[10px] font-bold ${
                  isActive("/provider/messages")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600"
                }`}
              >
                💬
                <div>Messages</div>
              </Link>
              <Link
                href="/provider/account/edit"
                className={`rounded-md p-1.5 text-center text-[10px] font-bold ${
                  isActive("/provider/account/edit")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600"
                }`}
              >
                👤
                <div>Profile</div>
              </Link>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
