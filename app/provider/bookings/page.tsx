"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import { supabase } from "../../../lib/supabase";

type Provider = {

  id: string;

  name?: string;

  mobile?: string;

  service?: string;

};

type Booking = {

  id: string;

  customer_id: string;

  provider_id: string;

  customer_name: string;

  customer_mobile: string;

  service: string;

  provider_service: string;

  booking_date: string;

  booking_time: string;

  address: string;

  customer_area: string;

  customer_city: string;

  customer_pincode: string;

  requirement: string;

  status: string;

  cancellation_reason?: string;

  created_at: string;

  amount?: number;

  price?: number;

  total_amount?: number;

  booking_amount?: number;

  estimated_amount?: number;

};

type FilterType =

  | "All"

  | "Pending"

  | "Accepted"

  | "Completed"

  | "Rejected"

  | "Cancelled";

export default function ProviderBookingsPage() {

  const [provider, setProvider] = useState<Provider | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");

  const [filter, setFilter] = useState<FilterType>("All");

  const [selectedBooking, setSelectedBooking] =

    useState<Booking | null>(null);

  useEffect(() => {

    loadProvider();

    const handleUpdate = () => {

      loadProvider();

    };

    window.addEventListener("storage", handleUpdate);

    window.addEventListener(

      "master-provider-updated",

      handleUpdate

    );

    window.addEventListener(

      "master-auth-updated",

      handleUpdate

    );

    return () => {

      window.removeEventListener("storage", handleUpdate);

      window.removeEventListener(

        "master-provider-updated",

        handleUpdate

      );

      window.removeEventListener(

        "master-auth-updated",

        handleUpdate

      );

    };

  }, []);

  async function loadProvider() {

    try {

      const saved =

        localStorage.getItem("masterProvider");

      const loggedIn =

        localStorage.getItem(

          "masterProviderLoggedIn"

        ) === "true";

      if (!saved || !loggedIn) {

        window.location.href = "/provider/login";

        return;

      }

      const parsed =

        JSON.parse(saved) as Provider;

      setProvider(parsed);

      await loadBookings(parsed.id);

    } catch (err) {

      console.error(err);

      setError(

        "Unable to load provider information."

      );

      setLoading(false);

    }

  }

  async function loadBookings(providerId: string) {

    try {

      setLoading(true);

      setError("");

      const { data, error } =

        await supabase

          .from("bookings")

          .select("id,customer_id,provider_id,customer_name,customer_mobile,service,provider_service,booking_date,booking_time,address,requirement,status,created_at")

          .eq("provider_id", providerId)

          .order("created_at", {

            ascending: false,
          });

      let rows = (data ?? []) as Record<string, unknown>[];

      if (error || rows.length === 0) {
        if (error) console.warn("Supabase provider bookings notice:", error.message);
        try {
          const cached = localStorage.getItem("masterBookings");
          if (cached) {
            const list = JSON.parse(cached);
            if (Array.isArray(list)) {
              const matched = list.filter(
                (b: any) => String(b.providerId || b.provider_id) === String(providerId)
              );
              if (matched.length > 0) {
                rows = matched.map((b: any) => ({
                  id: b.id,
                  customer_id: b.customerId || b.customer_id,
                  provider_id: b.providerId || b.provider_id,
                  customer_name: b.name || b.customerName || b.customer_name,
                  customer_mobile: b.mobile || b.customerMobile || b.customer_mobile,
                  service: b.service,
                  provider_service: b.service,
                  booking_date: b.date || b.booking_date,
                  booking_time: b.time || b.booking_time,
                  address: b.address,
                  customer_area: b.area || b.customer_area,
                  customer_city: b.city || b.customer_city,
                  customer_pincode: b.pincode || b.customer_pincode,
                  requirement: b.requirement || b.notes,
                  status: b.status || "Pending",
                  created_at: b.createdAt || b.created_at,
                  amount: b.amount || b.price,
                }));
              }
            }
          }
        } catch (_) {}
      }

      const mapped: Booking[] =

        rows.map((row) => ({

          id: String(row.id ?? ""),

          customer_id: String(

            row.customer_id ?? ""

          ),

          provider_id: String(

            row.provider_id ?? ""

          ),

          customer_name: String(

            row.customer_name ?? ""

          ),

          customer_mobile: String(

            row.customer_mobile ?? ""

          ),

          service: String(

            row.service ?? ""

          ),

          provider_service: String(

            row.provider_service ?? ""

          ),

          booking_date: String(

            row.booking_date ?? ""

          ),

          booking_time: String(

            row.booking_time ?? ""

          ),

          address: String(

            row.address ??

              row.customer_address ??

              ""

          ),

          customer_area: String(

            row.customer_area ?? ""

          ),

          customer_city: String(

            row.customer_city ?? ""

          ),

          customer_pincode: String(

            row.customer_pincode ?? ""

          ),

          requirement: String(

            row.requirement ?? ""

          ),

          status: String(

            row.status ?? "Pending"

          ),

          cancellation_reason:

            row.cancellation_reason

              ? String(

                  row.cancellation_reason

                )

              : "",

          created_at: String(

            row.created_at ?? ""

          ),

          amount:

            typeof row.amount === "number"

              ? row.amount

              : undefined,

          price:

            typeof row.price === "number"

              ? row.price

              : undefined,

          total_amount:

            typeof row.total_amount === "number"

              ? row.total_amount

              : undefined,

          booking_amount:

            typeof row.booking_amount === "number"

              ? row.booking_amount

              : undefined,

          estimated_amount:

            typeof row.estimated_amount === "number"

              ? row.estimated_amount

              : undefined,

        }));

      setBookings(mapped);

    } catch (err) {

      console.error(

        "Provider bookings error:",

        err

      );

      setError(

        err instanceof Error

          ? err.message

          : "Unable to load bookings."

      );

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    if (!provider?.id) {

      return;

    }

    const channel =

      supabase

        .channel(

          `provider-bookings-${provider.id}`

        )

        .on(

          "postgres_changes",

          {

            event: "*",

            schema: "public",

            table: "bookings",

            filter: `provider_id=eq.${provider.id}`,

          },

          () => {

            void loadBookings(provider.id);

          }

        )

        .subscribe();

    return () => {

      void supabase.removeChannel(

        channel

      );

    };

  }, [provider?.id]);

  async function createCustomerNotification(

    booking: Booking,

    status: string

  ) {

    if (!booking.customer_id) {

      return;

    }

    const allowedStatuses = [

      "Accepted",

      "Rejected",

      "Completed",

      "Cancelled",

    ];

    if (!allowedStatuses.includes(status)) {

      return;

    }

    try {

      const { error } = await supabase.rpc(

        "create_booking_status_notification",

        {

          p_booking_id: String(booking.id),

          p_status: status,

        }

      );

      if (error) {

        console.error(

          "Customer notification RPC error:",

          error

        );

      }

    } catch (notificationError) {

      console.error(

        "Customer notification exception:",

        notificationError

      );

    }

  }

  async function updateStatus(

    bookingId: string,

    status: string

  ) {

    if (!provider) {

      return;

    }

    setActionLoading(bookingId);

    setError("");

    try {

      let savedStatus = status;

      try {
        const { data: updatedRow, error: updateError } =
          await supabase
            .from("bookings")
            .update({ status })
            .eq("id", bookingId)
            .eq("provider_id", provider.id)
            .select("id, status")
            .maybeSingle();

        if (updatedRow?.status) {
          savedStatus = String(updatedRow.status);
        } else if (updateError) {
          console.warn("Supabase booking status update notice:", updateError.message);
        }
      } catch (sbErr) {
        console.warn("Booking update network notice:", sbErr);
      }

      // Sync local storage masterBookings
      try {
        const local = localStorage.getItem("masterBookings");
        if (local) {
          const list = JSON.parse(local);
          if (Array.isArray(list)) {
            const updated = list.map((b: any) =>
              String(b.id) === String(bookingId) ? { ...b, status: savedStatus } : b
            );
            localStorage.setItem("masterBookings", JSON.stringify(updated));
          }
        }
      } catch (storageErr) {
        console.warn("Could not sync local masterBookings:", storageErr);
      }

      setBookings((current) =>

        current.map((booking) =>

          booking.id === bookingId

            ? {

                ...booking,

                status: savedStatus,

              }

            : booking

        )

      );

      setSelectedBooking((current) =>

        current?.id === bookingId

          ? {

              ...current,

              status: savedStatus,

            }

          : current

      );

      const updatedBooking =

        bookings.find(

          (booking) =>

            booking.id === bookingId

        );

      if (updatedBooking) {

        await createCustomerNotification(

          { ...updatedBooking, status: savedStatus },

          savedStatus

        );

      }

      window.dispatchEvent(

        new Event(

          "master-bookings-updated"

        )

      );

      window.dispatchEvent(

        new Event(

          "master-notifications-updated"

        )

      );

    } catch (err) {

      console.error(err);

      setError(

        err instanceof Error

          ? err.message

          : "Unable to update booking."

      );

    } finally {

      setActionLoading("");

    }

  }

  function formatDate(value: string) {

    if (!value) {

      return "—";

    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {

      return value;

    }

    return date.toLocaleDateString(

      "en-IN",

      {

        day: "2-digit",

        month: "short",

        year: "numeric",

      }

    );

  }

  function formatDateTime(value: string) {

    if (!value) {

      return "—";

    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {

      return value;

    }

    return date.toLocaleString(

      "en-IN",

      {

        day: "2-digit",

        month: "short",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit",

      }

    );

  }

  function getStatusClass(status: string) {

    switch (status) {

      case "Pending":

        return "bg-yellow-100 text-yellow-800";

      case "Accepted":

        return "bg-blue-100 text-blue-800";

      case "Completed":

        return "bg-green-100 text-green-800";

      case "Rejected":

        return "bg-red-100 text-red-800";

      case "Cancelled":

        return "bg-gray-200 text-gray-700";

      default:

        return "bg-gray-100 text-gray-700";

    }

  }

  function getBookingAmount(

    booking: Booking

  ) {

    return (

      booking.amount ??

      booking.total_amount ??

      booking.booking_amount ??

      booking.price ??

      booking.estimated_amount ??

      0

    );

  }

  const filtered =

    filter === "All"

      ? bookings

      : bookings.filter(

          (booking) =>

            booking.status === filter

        );

  const pending =

    bookings.filter(

      (b) => b.status === "Pending"

    ).length;

  const accepted =

    bookings.filter(

      (b) => b.status === "Accepted"

    ).length;

  const completed =

    bookings.filter(

      (b) => b.status === "Completed"

    ).length;

  if (loading && !provider) {

    return (

      <main className="min-h-screen bg-gray-50 p-6">

        <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 text-center text-sm shadow-sm">

          Loading bookings...

        </div>

      </main>

    );

  }

  if (!provider) {

    return null;

  }

  return (

    <main className="min-h-screen bg-gray-50">

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">

        {/* HEADER */}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

          <div>

            <p className="text-xs font-semibold text-blue-600">

              Provider Panel

            </p>

            <h1 className="mt-0.5 text-xl font-black text-gray-900">

              My Bookings

            </h1>

            <p className="mt-0.5 text-xs text-gray-500">

              Manage your customer booking requests.

            </p>

          </div>

          <Link

            href="/provider/dashboard"

            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"

          >

            ← Dashboard

          </Link>

        </div>

        {/* ERROR */}

        {error && (

          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">

            {error}

          </div>

        )}

        {/* SUMMARY */}

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">

          <button

            onClick={() => setFilter("All")}

            className={`rounded-xl border bg-white p-3 text-left shadow-sm ${

              filter === "All"

                ? "border-blue-300 ring-1 ring-blue-200"

                : "border-transparent"

            }`}

          >

            <p className="text-[11px] text-gray-500">

              Total

            </p>

            <p className="mt-1 text-xl font-black text-gray-900">

              {bookings.length}

            </p>

          </button>

          <button

            onClick={() => setFilter("Pending")}

            className={`rounded-xl border bg-white p-3 text-left shadow-sm ${

              filter === "Pending"

                ? "border-yellow-300 ring-1 ring-yellow-200"

                : "border-transparent"

            }`}

          >

            <p className="text-[11px] text-gray-500">

              Pending

            </p>

            <p className="mt-1 text-xl font-black text-yellow-600">

              {pending}

            </p>

          </button>

          <button

            onClick={() => setFilter("Accepted")}

            className={`rounded-xl border bg-white p-3 text-left shadow-sm ${

              filter === "Accepted"

                ? "border-blue-300 ring-1 ring-blue-200"

                : "border-transparent"

            }`}

          >

            <p className="text-[11px] text-gray-500">

              Accepted

            </p>

            <p className="mt-1 text-xl font-black text-blue-600">

              {accepted}

            </p>

          </button>

          <button

            onClick={() => setFilter("Completed")}

            className={`rounded-xl border bg-white p-3 text-left shadow-sm ${

              filter === "Completed"

                ? "border-green-300 ring-1 ring-green-200"

                : "border-transparent"

            }`}

          >

            <p className="text-[11px] text-gray-500">

              Completed

            </p>

            <p className="mt-1 text-xl font-black text-green-600">

              {completed}

            </p>

          </button>

        </div>

        {/* FILTERS */}

        <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-xl bg-white p-2 shadow-sm">

          {[

            "All",

            "Pending",

            "Accepted",

            "Completed",

            "Rejected",

            "Cancelled",

          ].map((item) => (

            <button

              key={item}

              onClick={() =>

                setFilter(

                  item as FilterType

                )

              }

              className={

                filter === item

                  ? "whitespace-nowrap rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white"

                  : "whitespace-nowrap rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-200"

              }

            >

              {item}

            </button>

          ))}

        </div>

        {/* BOOKINGS */}

        {filtered.length === 0 ? (

          <div className="rounded-xl bg-white p-8 text-center shadow-sm">

            <div className="text-4xl">

              📅

            </div>

            <h2 className="mt-3 text-base font-bold">

              No bookings found

            </h2>

            <p className="mt-1 text-xs text-gray-500">

              No {filter.toLowerCase()} booking

              requests are available.

            </p>

          </div>

        ) : (

          <div className="space-y-3">

            {filtered.map((booking) => (

              <div

                key={booking.id}

                className="overflow-hidden rounded-xl border bg-white shadow-sm"

              >

                {/* TOP */}

                <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2.5">

                  <div className="min-w-0">

                    <p className="text-[9px] uppercase text-gray-400">

                      Booking ID

                    </p>

                    <p className="truncate text-xs font-bold text-gray-800">

                      {booking.id}

                    </p>

                  </div>

                  <span

                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusClass(

                      booking.status

                    )}`}

                  >

                    {booking.status}

                  </span>

                </div>

                {/* COMPACT SUMMARY */}

                <div className="grid gap-3 px-3 py-3 sm:grid-cols-4">

                  <div>

                    <p className="text-[10px] text-gray-400">

                      Customer

                    </p>

                    <p className="truncate text-xs font-bold text-gray-900">

                      {booking.customer_name ||

                        "Customer"}

                    </p>

                    <a

                      href={`tel:${booking.customer_mobile}`}

                      className="text-[10px] text-blue-600"

                    >

                      {booking.customer_mobile ||

                        "Not available"}

                    </a>

                  </div>

                  <div>

                    <p className="text-[10px] text-gray-400">

                      Service

                    </p>

                    <p className="truncate text-xs font-bold text-gray-900">

                      {booking.service ||

                        booking.provider_service ||

                        "Service"}

                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] text-gray-400">

                      Date & Time

                    </p>

                    <p className="text-xs font-semibold text-gray-900">

                      {formatDate(

                        booking.booking_date

                      )}

                    </p>

                    <p className="text-[10px] text-gray-500">

                      {booking.booking_time || "—"}

                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] text-gray-400">

                      Amount

                    </p>

                    <p className="text-sm font-black text-green-600">

                      ₹

                      {getBookingAmount(

                        booking

                      ).toLocaleString("en-IN")}

                    </p>

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2.5">

                  <button

                    onClick={() =>

                      setSelectedBooking(booking)

                    }

                    className="rounded-lg bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-100"

                  >

                    👁 View Details

                  </button>

                  {booking.status ===

                    "Pending" && (

                    <>

                      <button

                        onClick={() =>

                          updateStatus(

                            booking.id,

                            "Accepted"

                          )

                        }

                        disabled={

                          actionLoading ===

                          booking.id

                        }

                        className="rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-green-700 disabled:opacity-50"

                      >

                        ✓ Accept

                      </button>

                      <button

                        onClick={() =>

                          updateStatus(

                            booking.id,

                            "Rejected"

                          )

                        }

                        disabled={

                          actionLoading ===

                          booking.id

                        }

                        className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50"

                      >

                        ✕ Reject

                      </button>

                    </>

                  )}

                  {booking.status ===

                    "Accepted" && (

                    <>

                      <Link

                        href="/provider/messages"

                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white"

                      >

                        💬 Message

                      </Link>

                      <button

                        onClick={() =>

                          updateStatus(

                            booking.id,

                            "Completed"

                          )

                        }

                        disabled={

                          actionLoading ===

                          booking.id

                        }

                        className="rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"

                      >

                        ✓ Complete

                      </button>

                    </>

                  )}

                  {booking.status ===

                    "Completed" && (

                    <span className="rounded-lg bg-green-50 px-3 py-1.5 text-[11px] font-semibold text-green-700">

                      ✓ Booking completed

                    </span>

                  )}

                  {booking.status ===

                    "Rejected" && (

                    <span className="rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700">

                      Booking request rejected

                    </span>

                  )}

                  {booking.status ===

                    "Cancelled" && (

                    <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-700">

                      Booking cancelled

                    </span>

                  )}

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* VIEW DETAILS MODAL */}

      {selectedBooking && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"

          onClick={() =>

            setSelectedBooking(null)

          }

        >

          <div

            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"

            onClick={(event) =>

              event.stopPropagation()

            }

          >

            {/* MODAL HEADER */}

            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-3">

              <div>

                <h2 className="text-base font-bold text-gray-900">

                  Booking Details

                </h2>

                <p className="text-[10px] text-gray-500">

                  {selectedBooking.id}

                </p>

              </div>

              <button

                onClick={() =>

                  setSelectedBooking(null)

                }

                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"

              >

                ✕

              </button>

            </div>

            <div className="space-y-3 p-4">

              {/* STATUS */}

              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">

                <span className="text-xs font-semibold text-gray-500">

                  Status

                </span>

                <span

                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusClass(

                    selectedBooking.status

                  )}`}

                >

                  {selectedBooking.status}

                </span>

              </div>

              {/* CUSTOMER */}

              <div className="rounded-lg border p-3">

                <h3 className="mb-2 text-xs font-bold text-gray-900">

                  👤 Customer Information

                </h3>

                <div className="grid grid-cols-2 gap-3">

                  <div>

                    <p className="text-[10px] text-gray-400">

                      Name

                    </p>

                    <p className="text-xs font-semibold">

                      {selectedBooking.customer_name ||

                        "Customer"}

                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] text-gray-400">

                      Mobile

                    </p>

                    <a

                      href={`tel:${selectedBooking.customer_mobile}`}

                      className="text-xs font-semibold text-blue-600"

                    >

                      {selectedBooking.customer_mobile ||

                        "Not available"}

                    </a>

                  </div>

                </div>

              </div>

              {/* SERVICE */}

              <div className="rounded-lg border p-3">

                <h3 className="mb-2 text-xs font-bold text-gray-900">

                  🛠 Service Information

                </h3>

                <div className="space-y-2">

                  <div>

                    <p className="text-[10px] text-gray-400">

                      Service

                    </p>

                    <p className="text-xs font-semibold">

                      {selectedBooking.service ||

                        selectedBooking.provider_service ||

                        "Service"}

                    </p>

                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <p className="text-[10px] text-gray-400">

                        Booking Date

                      </p>

                      <p className="text-xs font-semibold">

                        {formatDate(

                          selectedBooking.booking_date

                        )}

                      </p>

                    </div>

                    <div>

                      <p className="text-[10px] text-gray-400">

                        Booking Time

                      </p>

                      <p className="text-xs font-semibold">

                        {selectedBooking.booking_time ||

                          "—"}

                      </p>

                    </div>

                  </div>

                  <div>

                    <p className="text-[10px] text-gray-400">

                      Amount

                    </p>

                    <p className="text-base font-black text-green-600">

                      ₹

                      {getBookingAmount(

                        selectedBooking

                      ).toLocaleString("en-IN")}

                    </p>

                  </div>

                </div>

              </div>

              {/* LOCATION */}

              <div className="rounded-lg border p-3">

                <h3 className="mb-2 text-xs font-bold text-gray-900">

                  📍 Customer Location

                </h3>

                <p className="text-xs leading-5 text-gray-700">

                  {[

                    selectedBooking.address,

                    selectedBooking.customer_area,

                    selectedBooking.customer_city,

                    selectedBooking.customer_pincode,

                  ]

                    .filter(Boolean)

                    .join(", ") ||

                    "Location not provided"}

                </p>

              </div>

              {/* REQUIREMENT */}

              <div className="rounded-lg border p-3">

                <h3 className="mb-2 text-xs font-bold text-gray-900">

                  📝 Customer Requirement

                </h3>

                <p className="rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-700">

                  {selectedBooking.requirement ||

                    "No additional requirement."}

                </p>

              </div>

              {/* CANCELLATION */}

              {selectedBooking.cancellation_reason && (

                <div className="rounded-lg border border-red-100 bg-red-50 p-3">

                  <h3 className="mb-1 text-xs font-bold text-red-700">

                    Cancellation Reason

                  </h3>

                  <p className="text-xs text-red-700">

                    {

                      selectedBooking.cancellation_reason

                    }

                  </p>

                </div>

              )}

              {/* CREATED */}

              <div className="rounded-lg bg-gray-50 p-3">

                <p className="text-[10px] text-gray-400">

                  Booking Created

                </p>

                <p className="mt-0.5 text-xs font-semibold text-gray-700">

                  {formatDateTime(

                    selectedBooking.created_at

                  )}

                </p>

              </div>

              {/* MODAL ACTIONS */}

              <div className="flex flex-wrap gap-2 pt-1">

                {selectedBooking.status ===

                  "Pending" && (

                  <>

                    <button

                      onClick={() =>

                        updateStatus(

                          selectedBooking.id,

                          "Accepted"

                        )

                      }

                      disabled={

                        actionLoading ===

                        selectedBooking.id

                      }

                      className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"

                    >

                      ✓ Accept Booking

                    </button>

                    <button

                      onClick={() =>

                        updateStatus(

                          selectedBooking.id,

                          "Rejected"

                        )

                      }

                      disabled={

                        actionLoading ===

                        selectedBooking.id

                      }

                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"

                    >

                      ✕ Reject

                    </button>

                  </>

                )}

                {selectedBooking.status ===

                  "Accepted" && (

                  <>

                    <Link

                      href="/provider/messages"

                      className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-bold text-white"

                    >

                      💬 Message Customer

                    </Link>

                    <button

                      onClick={() =>

                        updateStatus(

                          selectedBooking.id,

                          "Completed"

                        )

                      }

                      disabled={

                        actionLoading ===

                        selectedBooking.id

                      }

                      className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"

                    >

                      ✓ Mark Completed

                    </button>

                  </>

                )}

              </div>

            </div>

            <div className="border-t bg-gray-50 p-3">

              <button

                onClick={() =>

                  setSelectedBooking(null)

                }

                className="w-full rounded-lg bg-gray-900 py-2 text-xs font-bold text-white hover:bg-black"

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
