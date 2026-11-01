"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  BriefcaseIcon,
  UsersIcon,
  CalendarIcon,
  StarIcon,
  WrenchIcon,
  ShieldCheckIcon,
  ClipboardListIcon,
  BoltIcon,
  PhoneIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@/app/components/Icons";
type Provider = {
  id: string;
  name: string;
  mobile: string;
  service: string;
  city: string;
  account_status: string;
  availability: string;
};
type Customer = {
  id: string;
  name: string;
  mobile: string;
  account_status: string;
};
type Booking = {
  id: string;
  customer_id?: string;
  provider_id?: string;
  customer_name: string;
  provider_name: string;
  provider_mobile?: string;
  service: string;
  booking_date: string;
  booking_time: string;
  status: string;
};
type Review = {
  id: string;
  rating: number;
  status: string;
};
export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const loadDashboard = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        /*
         * DEMO ADMIN AUTH CHECK
         *
         * Admin login uses the localStorage demo session.
         */
        const adminLoggedIn =
          window.localStorage.getItem("masterAdminLoggedIn");
        const savedAdmin =
          window.localStorage.getItem("masterAdmin");
        if (adminLoggedIn !== "true" || !savedAdmin) {
          window.localStorage.removeItem(
            "masterAdminLoggedIn"
          );
          window.localStorage.removeItem(
            "masterAdmin"
          );
          router.replace("/admin/login");
          return;
        }
        let adminProfile: {
          id: string;
          name: string;
          email: string;
          role: string;
        };
        try {
          adminProfile = JSON.parse(savedAdmin);
        } catch {
          window.localStorage.removeItem(
            "masterAdminLoggedIn"
          );
          window.localStorage.removeItem(
            "masterAdmin"
          );
          router.replace("/admin/login");
          return;
        }
        if (
          adminProfile.email?.trim().toLowerCase() !==
            "admin@masterapp.com" ||
          adminProfile.role !== "admin"
        ) {
          window.localStorage.removeItem(
            "masterAdminLoggedIn"
          );
          window.localStorage.removeItem(
            "masterAdmin"
          );
          router.replace("/admin/login");
          return;
        }
        const [
          providersResult,
          customersResult,
          bookingsResult,
          reviewsResult,
        ] = await Promise.all([
          supabase
            .from("providers")
            .select(
              "id,name,mobile,service,city,account_status,availability"
            )
            .order("created_at", {
              ascending: false,
            }),
          supabase
            .from("customers")
            .select(
              "id,name,mobile,account_status"
            )
            .order("created_at", {
              ascending: false,
            }),
          supabase
            .from("bookings")
            .select(
              "id,customer_id,provider_id,customer_name,provider_name,service,booking_date,booking_time,status"
            )
            .order("created_at", {
              ascending: false,
            }),
          supabase
            .from("reviews")
            .select("id,rating,status")
            .order("created_at", {
              ascending: false,
            }),
        ]);
        if (providersResult.error) {
          console.error(
            "DASHBOARD PROVIDERS ERROR:",
            providersResult.error
          );
        }
        if (customersResult.error) {
          console.error(
            "DASHBOARD CUSTOMERS ERROR:",
            customersResult.error
          );
        }
        if (bookingsResult.error) {
          console.error(
            "DASHBOARD BOOKINGS ERROR:",
            bookingsResult.error
          );
        }
        if (reviewsResult.error) {
          console.error(
            "DASHBOARD REVIEWS ERROR:",
            reviewsResult.error
          );
        }
        let providerRows = providersResult.data || [];
        if (providerRows.length === 0) {
          try {
            const raw = window.localStorage.getItem("masterProviders");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) providerRows = parsed;
            }
          } catch {}
        }

        let customerRows = customersResult.data || [];
        if (customerRows.length === 0) {
          try {
            const raw = window.localStorage.getItem("masterUser");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.id) {
                customerRows = [{ id: parsed.id, name: parsed.name || "Customer", mobile: parsed.mobile || "", account_status: "Active" }];
              }
            }
          } catch {}
        }

        let bookingRows = bookingsResult.data || [];
        if (bookingRows.length === 0) {
          try {
            const raw = window.localStorage.getItem("masterBookings");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) bookingRows = parsed;
            }
          } catch {}
        }

        let reviewRows = reviewsResult.data || [];
        if (reviewRows.length === 0) {
          try {
            const raw = window.localStorage.getItem("masterReviews");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) reviewRows = parsed;
            }
          } catch {}
        }

        const providerMap = new Map(
          providerRows.map((provider) => [
            String(provider.id),
            provider,
          ])
        );
        const customerMap = new Map(
          customerRows.map((customer) => [
            String(customer.id),
            customer,
          ])
        );
        const currentBookings: Booking[] =
          bookingRows.map((booking) => {
            const currentProvider =
              booking.provider_id
                ? providerMap.get(
                    String(booking.provider_id)
                  )
                : undefined;
            const currentCustomer =
              booking.customer_id
                ? customerMap.get(
                    String(booking.customer_id)
                  )
                : undefined;
            return {
              ...booking,
              customer_id: booking.customer_id
                ? String(booking.customer_id)
                : undefined,
              provider_id: booking.provider_id
                ? String(booking.provider_id)
                : undefined,
              customer_name:
                currentCustomer?.name ||
                booking.customer_name ||
                "—",
              provider_name:
                currentProvider?.name ||
                booking.provider_name ||
                "—",
              provider_mobile:
                currentProvider?.mobile ||
                undefined,
            };
          });
        setProviders(
          providerRows as Provider[]
        );
        setCustomers(
          customerRows as Customer[]
        );
        setBookings(currentBookings);
        setReviews(
          reviewRows as Review[]
        );
      } catch (error) {
        console.error(
          "MASTER APP DASHBOARD ERROR:",
          error
        );
        // Do not wipe admin credentials or redirect on general data query failure
        try {
          const rawP = window.localStorage.getItem("masterProviders");
          if (rawP) setProviders(JSON.parse(rawP));
          const rawB = window.localStorage.getItem("masterBookings");
          if (rawB) setBookings(JSON.parse(rawB));
          const rawR = window.localStorage.getItem("masterReviews");
          if (rawR) setReviews(JSON.parse(rawR));
        } catch {}
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );
  useEffect(() => {
    let active = true;
    let channel:
      | ReturnType<typeof supabase.channel>
      | null = null;
    const refreshEvents = [
      "storage",
      "master-provider-updated",
      "master-customer-updated",
      "master-bookings-updated",
      "master-reviews-updated",
      "master-services-updated",
      "master-auth-updated",
    ];
    const handleLocalUpdate = () => {
      void loadDashboard(false);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadDashboard(false);
      }
    };
    async function initializeAdminDashboard() {
      try {
        const adminLoggedIn =
          window.localStorage.getItem("masterAdminLoggedIn");
        const savedAdmin =
          window.localStorage.getItem("masterAdmin");
        if (!active) return;
        if (adminLoggedIn !== "true" || !savedAdmin) {
          window.localStorage.removeItem(
            "masterAdminLoggedIn"
          );
          window.localStorage.removeItem(
            "masterAdmin"
          );
          router.replace("/admin/login");
          return;
        }
        try {
          const adminProfile = JSON.parse(savedAdmin);
          if (
            adminProfile.email?.trim().toLowerCase() !==
              "admin@masterapp.com" ||
            adminProfile.role !== "admin"
          ) {
            throw new Error("Invalid admin profile.");
          }
        } catch {
          window.localStorage.removeItem(
            "masterAdminLoggedIn"
          );
          window.localStorage.removeItem(
            "masterAdmin"
          );
          router.replace("/admin/login");
          return;
        }
        void loadDashboard(true);
        channel = supabase
          .channel("admin-dashboard-live")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "providers",
            },
            () => {
              void loadDashboard(false);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "customers",
            },
            () => {
              void loadDashboard(false);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bookings",
            },
            () => {
              void loadDashboard(false);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "reviews",
            },
            () => {
              void loadDashboard(false);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "service_categories",
            },
            () => {
              void loadDashboard(false);
            }
          )
          .subscribe();
        refreshEvents.forEach((eventName) => {
          window.addEventListener(
            eventName,
            handleLocalUpdate
          );
        });
        document.addEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      } catch (error) {
        console.error(
          "ADMIN DASHBOARD AUTH ERROR:",
          error
        );
        if (active) {
          window.localStorage.removeItem(
            "masterAdminLoggedIn"
          );
          window.localStorage.removeItem(
            "masterAdmin"
          );
          router.replace("/admin/login");
        }
      }
    }
    void initializeAdminDashboard();
    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
      refreshEvents.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          handleLocalUpdate
        );
      });
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadDashboard, router]);
  const providerStats = useMemo(() => {
    return {
      total: providers.length,
      pending: providers.filter(
        (item) =>
          item.account_status === "Pending"
      ).length,
      approved: providers.filter(
        (item) =>
          item.account_status === "Approved"
      ).length,
      available: providers.filter(
        (item) =>
          item.availability === "Available"
      ).length,
    };
  }, [providers]);
  const customerStats = useMemo(() => {
    return {
      total: customers.length,
      active: customers.filter(
        (item) =>
          item.account_status === "Active"
      ).length,
    };
  }, [customers]);
  const bookingStats = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter(
        (item) =>
          item.status === "Pending"
      ).length,
      accepted: bookings.filter(
        (item) =>
          item.status === "Accepted"
      ).length,
      completed: bookings.filter(
        (item) =>
          item.status === "Completed"
      ).length,
      cancelled: bookings.filter(
        (item) =>
          item.status === "Cancelled"
      ).length,
    };
  }, [bookings]);
  const reviewStats = useMemo(() => {
    const published = reviews.filter(
      (item) =>
        item.status === "Published"
    );
    const average =
      reviews.length > 0
        ? (
            reviews.reduce(
              (sum, item) =>
                sum + Number(item.rating || 0),
              0
            ) / reviews.length
          ).toFixed(1)
        : "0.0";
    return {
      total: reviews.length,
      published: published.length,
      average,
    };
  }, [reviews]);
  const recentBookings = bookings.slice(0, 5);
  const logout = async () => {
    setRefreshing(true);
    try {
      await supabase.auth.signOut();
    } catch (logoutError) {
      console.error(
        "Admin logout error:",
        logoutError
      );
    } finally {
      window.localStorage.removeItem(
        "masterAdminLoggedIn"
      );
      window.localStorage.removeItem(
        "masterAdmin"
      );
      window.dispatchEvent(
        new Event("master-auth-updated")
      );
      router.replace("/admin/login");
      setRefreshing(false);
    }
  };
  const formatDate = (date: string) => {
    if (!date) {
      return "—";
    }
    try {
      return new Date(
        date
      ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return date;
    }
  };
  const getStatusClass = (status: string) => {
    if (status === "Completed") {
      return "bg-green-100 text-green-700";
    }
    if (status === "Accepted") {
      return "bg-blue-100 text-blue-700";
    }
    if (status === "Cancelled") {
      return "bg-red-100 text-red-700";
    }
    if (status === "Rejected") {
      return "bg-red-100 text-red-700";
    }
    return "bg-yellow-100 text-yellow-700";
  };
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-25" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              <ShieldCheckIcon className="h-6 w-6" />
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-700">
            Loading Admin Command Center...
          </p>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-slate-50/70">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/25">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
                    Master App Admin
                  </h1>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-700/10">
                    Live Operations
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Complete platform governance & telemetry
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push("/")}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                Public Site
              </button>
              <button
                onClick={() => router.push("/admin/services")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition"
              >
                <WrenchIcon className="w-3.5 h-3.5" />
                <span>Services</span>
              </button>
              <button
                onClick={() => void loadDashboard()}
                disabled={refreshing}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition shadow-2xs"
              >
                {refreshing ? "Refreshing..." : "↻ Refresh"}
              </button>
              <button
                onClick={logout}
                className="px-3.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* MAIN STATS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => router.push("/admin/providers")}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-xs transition hover:border-blue-400 hover:shadow-md ring-1 ring-slate-900/5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
              <BriefcaseIcon className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-500">
              Total Providers
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">
              {providerStats.total}
            </p>
          </button>
          <button
            onClick={() => router.push("/admin/customers")}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-xs transition hover:border-indigo-400 hover:shadow-md ring-1 ring-slate-900/5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
              <UsersIcon className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-500">
              Total Customers
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">
              {customerStats.total}
            </p>
          </button>
          <button
            onClick={() => router.push("/admin/bookings")}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-xs transition hover:border-emerald-400 hover:shadow-md ring-1 ring-slate-900/5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3 group-hover:bg-emerald-600 group-hover:text-white transition">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-500">
              Total Bookings
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">
              {bookingStats.total}
            </p>
          </button>
          <button
            onClick={() => router.push("/admin/reviews")}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-xs transition hover:border-amber-400 hover:shadow-md ring-1 ring-slate-900/5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3 group-hover:bg-amber-600 group-hover:text-white transition">
              <StarIcon className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <p className="text-xs font-medium text-slate-500">
              Total Reviews
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">
              {reviewStats.total}
            </p>
          </button>
        </section>

        {/* QUICK ACTIONS */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs ring-1 ring-slate-900/5 mb-8">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <BoltIcon className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              Quick Governance Actions
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button
              onClick={() => router.push("/admin/providers")}
              className="group p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-blue-300 hover:shadow-xs transition text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100/70 text-blue-700 mb-2.5 group-hover:bg-blue-600 group-hover:text-white transition">
                <BriefcaseIcon className="w-4 h-4" />
              </div>
              <p className="font-bold text-sm text-slate-900">
                Providers
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Manage accounts & verification
              </p>
            </button>
            <button
              onClick={() => router.push("/admin/customers")}
              className="group p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100/70 text-indigo-700 mb-2.5 group-hover:bg-indigo-600 group-hover:text-white transition">
                <UsersIcon className="w-4 h-4" />
              </div>
              <p className="font-bold text-sm text-slate-900">
                Customers
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Profiles & access control
              </p>
            </button>
            <button
              onClick={() => router.push("/admin/bookings")}
              className="group p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100/70 text-emerald-700 mb-2.5 group-hover:bg-emerald-600 group-hover:text-white transition">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <p className="font-bold text-sm text-slate-900">
                Bookings
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Schedules & assignments
              </p>
            </button>
            <button
              onClick={() => router.push("/admin/reviews")}
              className="group p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-amber-300 hover:shadow-xs transition text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100/70 text-amber-700 mb-2.5 group-hover:bg-amber-600 group-hover:text-white transition">
                <StarIcon className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
              <p className="font-bold text-sm text-slate-900">
                Reviews
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Moderation & feedback
              </p>
            </button>
            <button
              onClick={() => router.push("/admin/services")}
              className="group p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-blue-300 hover:shadow-xs transition text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100/70 text-blue-700 mb-2.5 group-hover:bg-blue-600 group-hover:text-white transition">
                <WrenchIcon className="w-4 h-4" />
              </div>
              <p className="font-bold text-sm text-slate-900">
                Services
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Trade taxonomy & pricing
              </p>
            </button>
          </div>
        </section>

        {/* PLATFORM OVERVIEW */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* PROVIDER OVERVIEW */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <BriefcaseIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Provider Operations
                  </h2>
                  <p className="text-xs text-slate-500">
                    Verification pipeline and live capacity
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/admin/providers")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                View Ledger →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5">
                <p className="text-xs font-medium text-amber-800">
                  Pending
                </p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  {providerStats.pending}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                <p className="text-xs font-medium text-emerald-800">
                  Approved
                </p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {providerStats.approved}
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
                <p className="text-xs font-medium text-blue-800">
                  Available Now
                </p>
                <p className="text-2xl font-black text-blue-600 mt-1">
                  {providerStats.available}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-medium text-slate-600">
                  Total Active
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {providerStats.total}
                </p>
              </div>
            </div>
          </div>

          {/* BOOKING OVERVIEW */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Booking Fulfillment
                  </h2>
                  <p className="text-xs text-slate-500">
                    SLA tracking and appointment lifecycle
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/admin/bookings")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                View All →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5">
                <p className="text-xs font-medium text-amber-800">
                  Pending
                </p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  {bookingStats.pending}
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
                <p className="text-xs font-medium text-blue-800">
                  Accepted
                </p>
                <p className="text-2xl font-black text-blue-600 mt-1">
                  {bookingStats.accepted}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                <p className="text-xs font-medium text-emerald-800">
                  Completed
                </p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {bookingStats.completed}
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5">
                <p className="text-xs font-medium text-rose-800">
                  Cancelled
                </p>
                <p className="text-2xl font-black text-rose-600 mt-1">
                  {bookingStats.cancelled}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CUSTOMER + REVIEW */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <UsersIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Customer Base
                  </h2>
                  <p className="text-xs text-slate-500">
                    Active registered consumers
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/admin/customers")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Directory →
              </button>
            </div>
            <div className="mt-5 flex items-baseline gap-3">
              <p className="text-3xl font-extrabold text-slate-900">
                {customerStats.active}
              </p>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                Active & Verified
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <StarIcon className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Reputation & Ratings
                  </h2>
                  <p className="text-xs text-slate-500">
                    Client satisfaction benchmark
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/admin/reviews")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Moderation →
              </button>
            </div>
            <div className="mt-5 flex items-center gap-6">
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-extrabold text-slate-900">
                  {reviewStats.average}
                </p>
                <span className="text-xs text-slate-500">/ 5.0</span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <p className="text-lg font-bold text-slate-900">
                  {reviewStats.published}
                </p>
                <p className="text-xs text-slate-500">
                  Published Reviews
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* RECENT BOOKINGS */}
        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/5 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <ClipboardListIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Live Dispatch Stream
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time transaction activity
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/admin/bookings")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              View Full Booking Ledger →
            </button>
          </div>
          {recentBookings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-800">
                No bookings recorded yet
              </p>
              <p className="text-xs text-slate-500 mt-1">
                New appointments will immediately stream into this feed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-sm font-semibold">
                      Customer
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-semibold">
                      Provider
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-semibold">
                      Service
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-semibold">
                      Date
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map(
                    (booking) => (
                      <tr
                        key={booking.id}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {booking.customer_name ||
                              "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {booking.provider_name ||
                              "—"}
                          </p>
                          {booking.provider_mobile ? (
                            <a
                              href={`tel:${booking.provider_mobile}`}
                              className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              <PhoneIcon className="w-3 h-3 text-emerald-600" />
                              <span>Call Provider</span>
                            </a>
                          ) : (
                            <span className="mt-1 block text-xs text-gray-400">
                              Mobile not available
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {booking.service ||
                            "—"}
                        </td>
                        <td className="px-5 py-4">
                          <p>
                            {formatDate(
                              booking.booking_date
                            )}
                          </p>
                          {booking.booking_time && (
                            <p className="text-xs text-gray-500">
                              {booking.booking_time}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(
                              booking.status
                            )}`}
                          >
                            {booking.status ||
                              "Pending"}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* FOOTER */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Master App Admin Control Center
          </p>
          <p className="mt-1">
            Supabase connected • Live data • Auto Sync Enabled
          </p>
        </div>
      </div>
    </main>
  );
}