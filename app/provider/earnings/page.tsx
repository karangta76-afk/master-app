"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
type Provider = {
  id: string;
  name: string;
  price?: string;
};
type Booking = {
  id: string;
  provider_id: string;
  service: string;
  date: string;
  time: string;
  status: string;
  created_at?: string;
  // Other booking fields from Supabase
  [key: string]: unknown;
};
export default function ProviderEarningsPage() {
  const [provider, setProvider] =
    useState<Provider | null>(null);
  const [bookings, setBookings] =
    useState<Booking[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);
  useEffect(() => {
    async function loadEarnings() {
      try {
        const storedProvider =
          localStorage.getItem(
            "masterProvider"
          );
        if (!storedProvider) {
          window.location.href =
            "/provider/login";
          return;
        }
        const currentProvider =
          JSON.parse(
            storedProvider
          ) as Provider;
        setProvider(currentProvider);
        const {
          data,
          error,
        } = await supabase
          .from("bookings")
          .select("*")
          .eq(
            "provider_id",
            currentProvider.id
          )
          .order("created_at", {
            ascending: false,
          });
        if (error) {
          console.error(
            "Earnings booking error:",
            error
          );
        }
        let loadedBookings = (data || []) as Booking[];
        if (loadedBookings.length === 0) {
          try {
            const cached = localStorage.getItem("masterBookings");
            if (cached) {
              const list = JSON.parse(cached);
              if (Array.isArray(list)) {
                loadedBookings = list
                  .filter(
                    (b: any) =>
                      String(b.providerId || b.provider_id) ===
                      String(currentProvider.id)
                  )
                  .map((b: any) => ({
                    id: String(b.id),
                    provider_id: String(b.providerId || b.provider_id || ""),
                    service: String(b.service || ""),
                    date: String(b.date || b.booking_date || ""),
                    time: String(b.time || b.booking_time || ""),
                    status: String(b.status || "Pending"),
                    created_at:
                      b.createdAt || b.created_at || new Date().toISOString(),
                    amount: b.amount || b.price,
                  }));
              }
            }
          } catch (_) {}
        }
        setBookings(loadedBookings);
      } catch (error) {
        console.error(
          "Provider earnings error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }
    void loadEarnings();
  }, []);
  const completedBookings =
    bookings.filter(
      (booking) =>
        booking.status === "Completed"
    );
  const pendingBookings =
    bookings.filter(
      (booking) =>
        booking.status === "Pending"
    );
  const acceptedBookings =
    bookings.filter(
      (booking) =>
        booking.status === "Accepted"
    );
  const price =
    Number(
      String(
        provider?.price || "0"
      ).replace(
        /[^0-9.]/g,
        ""
      )
    ) || 0;
  const estimatedEarnings =
    completedBookings.length *
    price;
  function formatLabel(
    key: string
  ) {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }
  function formatValue(
    value: unknown
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }
    if (
      typeof value === "object"
    ) {
      return JSON.stringify(
        value
      );
    }
    return String(value);
  }
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc]">
        <div className="rounded-xl bg-white px-6 py-7 text-center shadow-sm">
          <div className="text-2xl">
            💰
          </div>
          <p className="mt-2 text-sm font-bold text-slate-800">
            Loading Earnings...
          </p>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#f6f8fc]">
      {/* ================= HEADER ================= */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-[11px] font-bold text-blue-600">
              Master App
            </p>
            <h1 className="text-xl font-black text-slate-900">
              Earnings
            </h1>
            <p className="text-[11px] text-slate-500">
              Provider earnings overview
            </p>
          </div>
          <Link
            href="/provider/dashboard"
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            ← Dashboard
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-4">
        {/* ================= MAIN EARNING CARD ================= */}
        <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 px-5 py-4 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-100">
                Estimated Total Earnings
              </p>
              <p className="mt-1 text-3xl font-black">
                ₹
                {estimatedEarnings.toLocaleString(
                  "en-IN"
                )}
              </p>
              <p className="mt-1 text-[10px] text-emerald-100">
                Based on completed bookings
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-2xl">
              💰
            </div>
          </div>
        </div>
        {/* ================= STATS ================= */}
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">
              Total Bookings
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {bookings.length}
            </p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">
              Pending
            </p>
            <p className="mt-1 text-xl font-black text-amber-600">
              {pendingBookings.length}
            </p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">
              Accepted
            </p>
            <p className="mt-1 text-xl font-black text-blue-600">
              {acceptedBookings.length}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">
              Completed
            </p>
            <p className="mt-1 text-xl font-black text-emerald-600">
              {completedBookings.length}
            </p>
          </div>
        </div>
        {/* ================= COMPLETED JOBS ================= */}
        <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Completed Jobs
              </h2>
              <p className="text-[10px] text-slate-500">
                Jobs included in your estimated earnings
              </p>
            </div>
            <span className="whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
              {completedBookings.length} Completed
            </span>
          </div>
          {/* NO JOBS */}
          {completedBookings.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 py-8 text-center">
              <div className="text-3xl">
                💼
              </div>
              <h3 className="mt-2 text-sm font-black text-slate-900">
                No completed jobs yet
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">
                Your earnings will appear here after completing jobs.
              </p>
            </div>
          ) : (
            /* COMPLETED JOB LIST */
            <div className="mt-3 space-y-2">
              {completedBookings.map(
                (booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    {/* JOB INFO */}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {booking.service}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {booking.date} •{" "}
                        {booking.time}
                      </p>
                    </div>
                    {/* RIGHT SIDE */}
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-600">
                          ₹
                          {price.toLocaleString(
                            "en-IN"
                          )}
                        </p>
                        <span className="text-[9px] font-bold text-emerald-600">
                          Completed
                        </span>
                      </div>
                      {/* VIEW DETAILS */}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBooking(
                            booking
                          )
                        }
                        className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-100"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
      {/* =====================================================
          BOOKING DETAILS MODAL
      ====================================================== */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() =>
            setSelectedBooking(null)
          }
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                  Booking Details
                </p>
                <h2 className="mt-0.5 text-lg font-black text-slate-900">
                  {selectedBooking.service}
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedBooking(null)
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200"
              >
                ×
              </button>
            </div>
            {/* MODAL CONTENT */}
            <div className="max-h-[65vh] overflow-y-auto p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(
                  selectedBooking
                ).map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        {formatLabel(key)}
                      </p>
                      <p className="mt-1 break-words text-xs font-semibold text-slate-800">
                        {formatValue(value)}
                      </p>
                    </div>
                  )
                )}
              </div>
              {/* EARNING */}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold text-emerald-700">
                    Provider Earnings
                  </p>
                  <p className="text-[9px] text-emerald-600">
                    Amount calculated from provider service price
                  </p>
                </div>
                <p className="text-xl font-black text-emerald-700">
                  ₹
                  {price.toLocaleString(
                    "en-IN"
                  )}
                </p>
              </div>
            </div>
            {/* MODAL FOOTER */}
            <div className="border-t border-slate-200 px-5 py-3 text-right">
              <button
                type="button"
                onClick={() =>
                  setSelectedBooking(null)
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}