"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { saveReview } from "../../lib/db";
import {
  CalendarIcon,
  ClockIcon,
  StarIcon,
  CheckCircleIcon,
  UserIcon,
  TradeBadgeContainer,
  TradeServiceIcon,
  MapPinIcon,
  PhoneIcon,
  XIcon,
} from "../components/Icons";
type User = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  userType?: "customer" | "provider" | "admin";
  accountStatus?: string;
};
type BookingStatus =
  | "Pending"
  | "Accepted"
  | "Completed"
  | "Rejected"
  | "Cancelled";
type Booking = {
  id: string;
  customerId: string;
  providerId: string;
  provider: string;
  providerService: string;
  service: string;
  date: string;
  time: string;
  name: string;
  mobile: string;
  address: string;
  requirement: string;
  status: BookingStatus;
  cancelReason?: string;
  createdAt?: string;
};
type Review = {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  providerId: string;
  rating: number;
  comment: string;
  createdAt: string;
};
type Provider = {
  id: string;
  name: string;
  service: string;
  mobile: string;
};
type FilterType =
  | "All"
  | "Pending"
  | "Accepted"
  | "Completed"
  | "Rejected"
  | "Cancelled";
const filters: FilterType[] = [
  "All",
  "Pending",
  "Accepted",
  "Completed",
  "Rejected",
  "Cancelled",
];
function formatDate(dateString: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
export default function BookingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filter, setFilter] = useState<FilterType>("All");
  const [loading, setLoading] = useState(true);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  async function loadData() {
    try {
      setLoading(true);
      const storedUser = localStorage.getItem("masterUser");
      if (!storedUser) {
        setUser(null);
        setBookings([]);
        setReviews([]);
        setProviders([]);
        return;
      }
      let currentUser: User;
      try {
        currentUser = JSON.parse(storedUser) as User;
      } catch {
        localStorage.removeItem("masterUser");
        setUser(null);
        setBookings([]);
        setReviews([]);
        setProviders([]);
        return;
      }
      /*
       * CUSTOMER SESSION
       * =================
       *
       * Master App customer login is maintained in localStorage
       * using the "masterUser" session. The Account page uses the
       * same session. Do NOT require a separate Supabase Auth
       * session here, otherwise the customer appears logged out
       * on My Bookings even though Account is already logged in.
       */
      const customerId = String(currentUser.id || "").trim();
      if (!customerId) {
        console.error("Customer session error: masterUser has no id.");
        setUser(null);
        setBookings([]);
        setReviews([]);
        setProviders([]);
        return;
      }
      const authenticatedUser: User = {
        ...currentUser,
        id: customerId,
        userType: currentUser.userType || "customer",
      };
      setUser(authenticatedUser);
      /*
       * ==============================
       * BOOKINGS
       * ==============================
       */
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(
          "id,customer_id,provider_id,provider_name,provider_service,service,booking_date,booking_time,customer_name,customer_mobile,address,requirement,status,cancellation_reason,created_at"
        )
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (bookingError) {
        const supabaseBookingError = {
          message: bookingError.message || "Unknown booking error",
          details: bookingError.details || "",
          hint: bookingError.hint || "",
          code: bookingError.code || "",
          status: (bookingError as any).status || "",
          statusText: (bookingError as any).statusText || "",
        };
        console.error(
          "Booking load error:",
          JSON.stringify(supabaseBookingError, null, 2)
        );
      }
      /*
       * ==============================
       * PROVIDERS
       * ==============================
       *
       * IMPORTANT:
       * We load the current provider profile from the providers table.
       * Old bookings may contain an old provider_name snapshot, so the
       * customer booking history should always prefer the CURRENT name
       * from providers using provider_id.
       */
      const { data: providerData, error: providerError } = await supabase
        .from("providers")
        .select("id,name,service,mobile");
      if (providerError) {
        console.error("Provider load error:", providerError);
      }
      const mappedProviders: Provider[] = (providerData ?? []).map(
        (provider) => ({
          id: String(provider.id),
          name: provider.name ?? "",
          service: provider.service ?? "",
          mobile: provider.mobile ?? "",
        })
      );
      setProviders(mappedProviders);
      /*
       * ==============================
       * BOOKINGS
       * ==============================
       *
       * provider_name is only a historical snapshot.
       * For display we use provider_id -> current providers record.
       * Therefore, when a provider changes their profile name, the
       * updated name is automatically shown in OLD as well as NEW
       * customer bookings.
       */
      const mappedBookings: Booking[] = (bookingData ?? []).map(
        (booking) => {
          const providerId = String(booking.provider_id);
          const currentProvider = mappedProviders.find(
            (provider) => provider.id === providerId
          );
          return {
            id: String(booking.id),
            customerId: String(booking.customer_id),
            providerId,
            provider:
              currentProvider?.name ||
              booking.provider_name ||
              "",
            providerService:
              currentProvider?.service ||
              booking.provider_service ||
              "",
            service: booking.service ?? "",
            date: booking.booking_date ?? "",
            time: booking.booking_time ?? "",
            name: booking.customer_name ?? "",
            mobile: booking.customer_mobile ?? "",
            address: booking.address ?? "",
            requirement: booking.requirement ?? "",
            status: (booking.status ?? "Pending") as BookingStatus,
            cancelReason: booking.cancellation_reason ?? "",
            createdAt: booking.created_at ?? "",
          };
        }
      );
      // Merge with localStorage bookings for this customer so offline/local bookings are never lost
      const combinedBookings = [...mappedBookings];
      try {
        const storedLocal = localStorage.getItem("masterBookings");
        if (storedLocal) {
          const parsedLocal = JSON.parse(storedLocal);
          if (Array.isArray(parsedLocal)) {
            parsedLocal.forEach((lb: any) => {
              const matchesCust = String(lb.customerId || lb.customer_id) === customerId;
              const exists = combinedBookings.some((b) => b.id === lb.id);
              if (matchesCust && !exists) {
                combinedBookings.push({
                  id: String(lb.id),
                  customerId: String(lb.customerId || lb.customer_id),
                  providerId: String(lb.providerId || lb.provider_id),
                  provider: lb.provider || lb.provider_name || "",
                  providerService: lb.providerService || lb.provider_service || "",
                  service: lb.service || "",
                  date: lb.date || lb.booking_date || "",
                  time: lb.time || lb.booking_time || "",
                  name: lb.name || lb.customer_name || "",
                  mobile: lb.mobile || lb.customer_mobile || "",
                  address: lb.address || "",
                  requirement: lb.requirement || "",
                  status: (lb.status || "Pending") as BookingStatus,
                  cancelReason: lb.cancelReason || lb.cancellation_reason || "",
                  createdAt: lb.createdAt || lb.created_at || "",
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn("Could not merge local bookings:", err);
      }

      setBookings(combinedBookings);
      localStorage.setItem(
        "masterBookings",
        JSON.stringify(combinedBookings)
      );
      /*
       * ==============================
       * REVIEWS
       * ==============================
       */
      const { data: reviewData, error: reviewError } = await supabase
        .from("reviews")
        .select("id,booking_id,customer_id,provider_id,rating,comment,created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (reviewError) {
        console.error("Review load error:", reviewError);
      }
      const mappedReviews: Review[] = (reviewData ?? []).map((review) => ({
        id: String(review.id),
        bookingId: String(review.booking_id),
        customerId: String(review.customer_id),
        customerName: authenticatedUser.name,
        providerId: String(review.provider_id),
        rating: Number(review.rating) || 0,
        comment: review.comment ?? "",
        createdAt: review.created_at ?? "",
      }));
      setReviews(mappedReviews);
      localStorage.setItem(
        "masterReviews",
        JSON.stringify(mappedReviews)
      );
    } catch (error) {
      console.error("Bookings page error:", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadData();
    const handleBookingsUpdate = () => {
      void loadData();
    };
    const handleReviewsUpdate = () => {
      void loadData();
    };
    window.addEventListener(
      "master-bookings-updated",
      handleBookingsUpdate
    );
    window.addEventListener(
      "master-reviews-updated",
      handleReviewsUpdate
    );
    /*
     * ==============================
     * SUPABASE REALTIME
     * ==============================
     */
    const bookingChannel = supabase
      .channel("customer-bookings-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          void loadData();
        }
      )
      .subscribe();
    const reviewChannel = supabase
      .channel("customer-reviews-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
        },
        () => {
          void loadData();
        }
      )
      .subscribe();
    return () => {
      window.removeEventListener(
        "master-bookings-updated",
        handleBookingsUpdate
      );
      window.removeEventListener(
        "master-reviews-updated",
        handleReviewsUpdate
      );
      void supabase.removeChannel(bookingChannel);
      void supabase.removeChannel(reviewChannel);
    };
  }, []);
  const filteredBookings = useMemo(() => {
    if (filter === "All") {
      return bookings;
    }
    return bookings.filter(
      (booking) => booking.status === filter
    );
  }, [bookings, filter]);
  function getProvider(providerId: string) {
    return providers.find(
      (provider) => provider.id === providerId
    );
  }
  function hasReview(bookingId: string) {
    return reviews.some(
      (review) => review.bookingId === bookingId
    );
  }
  async function handleCancelBooking() {
    if (!cancelBooking) return;
    const reason = cancelReason.trim();
    if (!reason) {
      alert("Please enter cancellation reason.");
      return;
    }
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "Cancelled",
          cancellation_reason: reason,
        })
        .eq("id", cancelBooking.id)
        .eq("customer_id", user?.id);
      if (error) {
        console.error("Cancel booking error:", error);
        alert("Booking cancel nahi ho payi.");
        return;
      }
      const { error: notificationError } = await supabase.rpc(
        "create_customer_cancellation_notification",
        {
          p_booking_id: String(cancelBooking.id),
        }
      );
      if (notificationError) {
        console.error(
          "Cancellation notification error:",
          notificationError
        );
      }
      window.dispatchEvent(
        new Event("master-notifications-updated")
      );
      const updatedBookings = bookings.map((booking) =>
        booking.id === cancelBooking.id
          ? {
              ...booking,
              status: "Cancelled" as const,
              cancelReason: reason,
            }
          : booking
      );
      setBookings(updatedBookings);
      localStorage.setItem(
        "masterBookings",
        JSON.stringify(updatedBookings)
      );
      window.dispatchEvent(
        new Event("master-bookings-updated")
      );
      setCancelBooking(null);
      setCancelReason("");
      alert("Booking cancelled successfully.");
    } catch (error) {
      console.error("Cancel booking error:", error);
      alert("Something went wrong.");
    }
  }
  async function handleSubmitReview() {
    if (!reviewBooking || !user) return;
    const comment = reviewComment.trim();
    if (!comment) {
      alert("Please write a review.");
      return;
    }
    if (hasReview(reviewBooking.id)) {
      alert("You have already reviewed this booking.");
      return;
    }
    if (reviewBooking.status !== "Completed") {
      alert("Only completed bookings can be reviewed.");
      return;
    }
    if (reviewBooking.customerId !== user.id) {
      alert("You are not allowed to review this booking.");
      return;
    }
    const newReview = {
      id: `review-${Date.now()}`,
      booking_id: reviewBooking.id,
      customer_id: user.id,
      provider_id: reviewBooking.providerId,
      rating: reviewRating,
      comment,
      status: "Published",
    };
    try {
      const savedReview = await saveReview(newReview);
      const review: Review = {
        id: savedReview.id,
        bookingId: savedReview.booking_id,
        customerId: savedReview.customer_id,
        customerName: user.name,
        providerId: savedReview.provider_id,
        rating: Number(savedReview.rating) || reviewRating,
        comment: savedReview.comment || "",
        createdAt:
          savedReview.created_at ||
          new Date().toISOString(),
      };
      const updatedReviews = [review, ...reviews];
      setReviews(updatedReviews);
      localStorage.setItem(
        "masterReviews",
        JSON.stringify(updatedReviews)
      );
      window.dispatchEvent(
        new Event("master-reviews-updated")
      );
      setReviewBooking(null);
      setReviewRating(5);
      setReviewComment("");
      alert("Review submitted successfully.");
    } catch (error) {
      console.error("Review save error:", error);
      alert("Review save nahi ho paya.");
    }
  }
  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-gray-900">
            My Bookings
          </h1>
          <p className="mt-3 text-gray-600">
            Please login to view your bookings.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-700">
              Customer Portal
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              My Service Bookings
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Live updates, booking status tracking, and provider communication
            </p>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:from-blue-500 hover:to-indigo-500 active:scale-98 self-start sm:self-auto"
          >
            <span>+ Book New Service</span>
          </Link>
        </div>

        {/* FILTERS */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition ${
                filter === item
                  ? "bg-slate-900 text-white shadow-xs"
                  : "border border-slate-200/90 bg-white text-slate-600 shadow-2xs hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
            <p className="text-sm font-semibold text-slate-600">
              Loading your bookings...
            </p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && filteredBookings.length === 0 && (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-4 ring-blue-100/50">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900">
              No bookings found
            </h2>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              You don&apos;t have any{" "}
              {filter !== "All"
                ? filter.toLowerCase()
                : ""}{" "}
              bookings recorded yet.
            </p>
            <Link
              href="/services"
              className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-xs transition hover:from-blue-500 hover:to-indigo-500"
            >
              Explore Services →
            </Link>
          </div>
        )}

        {/* BOOKINGS */}
        {!loading && filteredBookings.length > 0 && (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const provider = getProvider(
                booking.providerId
              );
              const reviewed = hasReview(booking.id);
              return (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs ring-1 ring-slate-900/5 transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    {/* LEFT */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                          {booking.service}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            booking.status === "Pending"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60"
                              : booking.status === "Accepted"
                              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60"
                              : booking.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                              : booking.status === "Rejected"
                              ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60"
                              : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 sm:text-sm">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900">
                            Provider:
                          </span>{" "}
                          <span>{provider?.name || booking.provider || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TradeServiceIcon service={booking.service} className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-semibold text-slate-900">
                            Service:
                          </span>{" "}
                          <span>
                            {booking.providerService ||
                              provider?.service ||
                              "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900">
                            Date:
                          </span>{" "}
                          <span>{formatDate(booking.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900">
                            Time:
                          </span>{" "}
                          <span>{booking.time || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900">
                            Provider Mobile:
                          </span>{" "}
                          <span>{provider?.mobile || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">#</span>
                          <span className="font-semibold text-slate-900">
                            Booking ID:
                          </span>{" "}
                          <span className="font-mono text-xs">{booking.id}</span>
                        </div>
                      </div>
                      {booking.address && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-start gap-2.5">
                          <MapPinIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                              Service Address
                            </p>
                            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                              {booking.address}
                            </p>
                          </div>
                        </div>
                      )}
                      {booking.requirement && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
                          <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Requirement
                          </p>
                          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                            {booking.requirement}
                          </p>
                        </div>
                      )}
                      {booking.status === "Cancelled" &&
                        booking.cancelReason && (
                          <div className="mt-3 rounded-xl bg-rose-50 p-4 border border-rose-100">
                            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                              Cancellation Reason
                            </p>
                            <p className="mt-1 text-xs text-rose-700 sm:text-sm">
                              {booking.cancelReason}
                            </p>
                          </div>
                        )}
                    </div>
                    {/* ACTIONS */}
                    <div className="flex w-full flex-col gap-2 md:w-44 shrink-0">
                      {booking.status === "Pending" && (
                        <button
                          onClick={() =>
                            setCancelBooking(booking)
                          }
                          className="rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                        >
                          Cancel Booking
                        </button>
                      )}
                      {booking.status === "Accepted" && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-center text-xs font-bold text-blue-700">
                          Provider accepted your booking.
                        </div>
                      )}
                      {booking.status === "Rejected" && (
                        <div className="rounded-xl border border-rose-100 bg-rose-50/80 p-3 text-center text-xs font-bold text-rose-700">
                          Provider rejected this booking.
                        </div>
                      )}
                      {booking.status === "Cancelled" && (
                        <div className="rounded-xl bg-slate-100 p-3 text-center text-xs font-medium text-slate-500">
                          Booking cancelled
                        </div>
                      )}
                      {booking.status === "Completed" && (
                        <>
                          {reviewed ? (
                            <div className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-center text-xs font-bold text-emerald-700">
                              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                              <span>Review Submitted</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReviewBooking(booking);
                                setReviewRating(5);
                                setReviewComment("");
                              }}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:from-amber-400 hover:to-amber-500 transition active:scale-[0.98]"
                            >
                              <StarIcon className="w-4 h-4" filled />
                              <span>Rate & Review</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* CANCEL MODAL */}
      {cancelBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">
              Cancel Booking
            </h2>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Please tell us why you want to cancel this
              booking.
            </p>
            <textarea
              value={cancelReason}
              onChange={(event) =>
                setCancelReason(event.target.value)
              }
              placeholder="Enter cancellation reason..."
              rows={4}
              className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setCancelBooking(null);
                  setCancelReason("");
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleCancelBooking}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-xs hover:bg-rose-700 transition"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* REVIEW MODAL */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">
              Rate & Review
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              How was your experience with{" "}
              <span className="font-semibold text-slate-800">
                {getProvider(reviewBooking.providerId)?.name ||
                  reviewBooking.provider}
              </span>?
            </p>
            <div className="mt-6 text-center">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 transition transform hover:scale-110 active:scale-95"
                    aria-label={`Rate ${star} out of 5`}
                  >
                    <StarIcon
                      className={`w-8 h-8 ${
                        star <= reviewRating
                          ? "text-amber-400 drop-shadow-sm"
                          : "text-slate-200"
                      }`}
                      filled={star <= reviewRating}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-bold text-slate-600">
                {reviewRating} out of 5 stars
              </p>
            </div>
            <textarea
              value={reviewComment}
              onChange={(event) =>
                setReviewComment(event.target.value)
              }
              placeholder="Write your experience..."
              rows={4}
              className="mt-5 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setReviewBooking(null);
                  setReviewRating(5);
                  setReviewComment("");
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-xs hover:from-blue-500 hover:to-indigo-500 transition"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}