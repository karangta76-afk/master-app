"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { saveBooking } from "../../../../lib/db";
import { supabase } from "../../../../lib/supabase";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  TradeBadgeContainer,
  OnlineStatusDot,
  VerifiedBadge,
} from "@/app/components/Icons";
type AvailabilityStatus =
  | "Available"
  | "Not Available"
  | "Temporarily Unavailable";
type Provider = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  service: string;
  city: string;
  experience?: string;
  price?: string;
  address?: string;
  description?: string;
  availability?: AvailabilityStatus;
};
type User = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  city?: string;
  pincode?: string;
  address?: string;
};
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
  status: "Pending" | "Accepted" | "Rejected" | "Cancelled";
  createdAt: string;
};
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export default function BookProviderPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;
  const [provider, setProvider] = useState<Provider | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [requirement, setRequirement] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  useEffect(() => {
    if (!providerId) {
      setLoading(false);
      return;
    }
    try {
      const storedUser = localStorage.getItem("masterUser");
      if (!storedUser) {
        router.replace("/login");
        return;
      }
      const parsedUser: User = JSON.parse(storedUser);
      if (!parsedUser?.id) {
        router.replace("/login");
        return;
      }
      setUser(parsedUser);
      setName(parsedUser.name || "");
      setMobile(parsedUser.mobile || "");
      const fullAddress = [
        parsedUser.address,
        parsedUser.city,
        parsedUser.pincode,
      ]
        .filter(Boolean)
        .join(", ");
      setAddress(fullAddress);
      const storedProviders =
        localStorage.getItem("masterProviders");
      if (!storedProviders) {
        setProvider(null);
        setLoading(false);
        return;
      }
      const providers: Provider[] =
        JSON.parse(storedProviders);
      if (!Array.isArray(providers)) {
        setProvider(null);
        setLoading(false);
        return;
      }
      const foundProvider = providers.find(
        (item) => item.id === providerId
      );
      if (foundProvider) {
        setProvider({
          ...foundProvider,
          availability:
            foundProvider.availability || "Available",
        });
      } else {
        setProvider(null);
      }
    } catch (error) {
      console.error("Booking page error:", error);
      router.replace("/login");
      return;
    }
    setLoading(false);
  }, [providerId, router]);
  const handleMobileChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setMobile(digits);
  };
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    if (!user) {
      router.push("/login");
      return;
    }
    if (!provider) {
      setError("Provider information is not available.");
      return;
    }
    const currentAvailability =
      provider.availability || "Available";
    if (currentAvailability !== "Available") {
      setError(
        currentAvailability ===
          "Temporarily Unavailable"
          ? "This provider is temporarily unavailable and is not accepting new bookings right now."
          : "This provider is currently not available and is not accepting bookings."
      );
      return;
    }
    if (!date) {
      setError("Please select a service date.");
      return;
    }
    if (date < getToday()) {
      setError("Please select today or a future date.");
      return;
    }
    if (!time) {
      setError("Please select a preferred time.");
      return;
    }
    if (date === getToday()) {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${currentHours}:${currentMinutes}`;
      if (time <= currentTime) {
        setError("For today's appointment, please select a future time slot.");
        return;
      }
    }
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      setError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }
    if (!address.trim()) {
      setError("Please enter the service address.");
      return;
    }
    setSubmitting(true);
    try {
      /*
       * Check latest provider availability
       */
      const storedProviders =
        localStorage.getItem("masterProviders");
      if (storedProviders) {
        try {
          const providers: Provider[] =
            JSON.parse(storedProviders);
          if (Array.isArray(providers)) {
            const latestProvider = providers.find(
              (item) => item.id === provider.id
            );
            const latestAvailability =
              latestProvider?.availability || "Available";
            if (latestAvailability !== "Available") {
              setError(
                latestAvailability ===
                  "Temporarily Unavailable"
                  ? "This provider has just become temporarily unavailable. Please try again later."
                  : "This provider has just become unavailable. Please choose another provider."
              );
              setSubmitting(false);
              return;
            }
          }
        } catch (error) {
          console.error(
            "Provider availability error:",
            error
          );
        }
      }
      /*
       * Create new booking
       */
      const newBookingId = `MA${Date.now()}`;
      const createdAt = new Date().toISOString();
      const newBooking: Booking = {
        id: newBookingId,
        customerId: user.id,
        providerId: provider.id,
        provider: provider.name,
        providerService: provider.service,
        service: provider.service,
        date,
        time,
        name: name.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        requirement: requirement.trim(),
        status: "Pending",
        createdAt,
      };
      /*
       * Save booking to Supabase
       *
       * created_at is intentionally not sent.
       * Supabase will create it automatically.
       */
      await saveBooking({
        id: newBooking.id,
        customer_id: newBooking.customerId,
        provider_id: newBooking.providerId,
        provider_name: newBooking.provider,
        provider_service: newBooking.providerService,
        service: newBooking.service,
        booking_date: newBooking.date,
        booking_time: newBooking.time,
        customer_name: newBooking.name,
        customer_mobile: newBooking.mobile,
        address: newBooking.address,
        requirement: newBooking.requirement,
        status: newBooking.status,
      });
      /*
       * Notify provider about the new booking.
       * Notification failure must not fail the booking itself.
       */
      try {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            user_id: provider.id,
            user_type: "provider",
            title: "New Booking Received",
            message: `${newBooking.name} has requested your ${newBooking.service} service.`,
            link: "/provider/bookings",
            read: false,
            booking_id: newBooking.id,
            type: "booking",
          });
        if (notificationError) {
          console.error(
            "Provider notification error:",
            notificationError
          );
        }
      } catch (notificationError) {
        console.error(
          "Provider notification error:",
          notificationError
        );
      }
      /*
       * Save to localStorage also.
       * This keeps the current app flow working.
       */
      const storedBookings =
        localStorage.getItem("masterBookings");
      let bookings: Booking[] = [];
      if (storedBookings) {
        try {
          const parsedBookings =
            JSON.parse(storedBookings);
          if (Array.isArray(parsedBookings)) {
            bookings = parsedBookings;
          }
        } catch (error) {
          console.error(
            "Booking localStorage error:",
            error
          );
          bookings = [];
        }
      }
      const existingIndex = bookings.findIndex((b) => b.id === newBooking.id);
      if (existingIndex >= 0) {
        bookings[existingIndex] = newBooking;
      } else {
        bookings.unshift(newBooking);
      }
      localStorage.setItem(
        "masterBookings",
        JSON.stringify(bookings)
      );
      /*
       * Notify other pages
       */
      window.dispatchEvent(
        new Event("master-bookings-updated")
      );
      window.dispatchEvent(
        new Event("storage")
      );
      /*
       * Show success screen
       */
      setBookingId(newBookingId);
    } catch (bookingError) {
      console.error(
        "Booking creation error:",
        bookingError
      );
      setError(
        "Something went wrong while creating your booking. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };
  /*
   * Loading screen
   */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-4 text-sm text-gray-500">
            Loading booking page...
          </p>
        </div>
      </main>
    );
  }
  /*
   * Provider not found
   */
  if (!provider) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-xl rounded-3xl border bg-white p-10 text-center shadow-sm">
          <div className="text-6xl">😕</div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Provider Not Found
          </h1>
          <p className="mt-3 text-gray-500">
            This provider is no longer available.
          </p>
          <Link
            href="/services"
            className="mt-7 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Browse Services
          </Link>
        </div>
      </main>
    );
  }
  const availability =
    provider.availability || "Available";
  /*
   * Provider unavailable
   */
  if (availability !== "Available") {
    const temporarilyUnavailable =
      availability === "Temporarily Unavailable";
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-xs sm:p-12">
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${
                temporarilyUnavailable
                  ? "bg-amber-50 text-amber-600 ring-4 ring-amber-100"
                  : "bg-rose-50 text-rose-600 ring-4 ring-rose-100"
              }`}
            >
              <ClockIcon className="w-10 h-10" />
            </div>
            <p
              className={`mt-6 text-xs font-bold uppercase tracking-wider ${
                temporarilyUnavailable
                  ? "text-amber-700"
                  : "text-rose-700"
              }`}
            >
              {availability}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {provider.name}
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">
              {temporarilyUnavailable
                ? "This provider is temporarily unavailable and is not accepting new bookings right now."
                : "This provider is currently not available and is not accepting new bookings."}
            </p>
            <div
              className={`mt-7 rounded-2xl p-5 text-left border ${
                temporarilyUnavailable
                  ? "border-amber-200/70 bg-amber-50/60"
                  : "border-rose-200/70 bg-rose-50/60"
              }`}
            >
              <p
                className={`font-bold ${
                  temporarilyUnavailable
                    ? "text-amber-950"
                    : "text-rose-950"
                }`}
              >
                {provider.service}
              </p>
              <p
                className={`mt-1.5 text-xs flex items-center gap-1.5 ${
                  temporarilyUnavailable
                    ? "text-amber-800"
                    : "text-rose-800"
                }`}
              >
                <MapPinIcon className="w-3.5 h-3.5" />
                <span>{provider.city || "Location not specified"}</span>
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/provider/${provider.id}`}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition active:scale-[0.98]"
              >
                ← Back to Profile
              </Link>
              <Link
                href="/services"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Find Another Provider
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }
  /*
   * Booking successful
   */
  if (bookingId) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-7 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100">
              <CheckCircleIcon className="w-10 h-10" />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-emerald-600">
              Booking Request Sent
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              Your booking request has been sent
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">
              Your request has been sent to the provider. You can track its
              status in real-time from My Bookings.
            </p>
            <div className="mt-8 rounded-2xl bg-blue-50/80 border border-blue-100 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Booking ID
              </p>
              <p className="mt-2 font-mono text-2xl font-black text-blue-900">
                {bookingId}
              </p>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 p-5 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Provider
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {provider.name}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-200/60">
                  {provider.service}
                </div>
              </div>
              <div className="grid gap-4 pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Appointment Date</span>
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {date}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Preferred Time</span>
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {time}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/bookings"
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition active:scale-[0.98]"
              >
                Track in My Bookings →
              </Link>
              <Link
                href="/services"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Browse Services
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }
  /*
   * Booking form
   */
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-white sm:py-12 border-b border-slate-800/80">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-5xl">
          <Link
            href={`/provider/${provider.id}`}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:text-white"
          >
            ← Back to Provider Profile
          </Link>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <TradeBadgeContainer service={provider.service} size="lg">
              <span className="text-2xl font-black text-white">
                {provider.name?.charAt(0)?.toUpperCase() || "P"}
              </span>
            </TradeBadgeContainer>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Direct Service Booking
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl text-white">
                {provider.name}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-300 sm:text-sm">
                <span className="font-semibold text-white">{provider.service}</span>
                {provider.city && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                      {provider.city}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 ring-1 ring-white/10 backdrop-blur-xs">
                <OnlineStatusDot available={true} label="Verified & Accepting Requests" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs ring-1 ring-slate-900/5 sm:p-8"
          >
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Service Details
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Tell the provider when and where you need the service.
              </p>
            </div>
            {error && (
              <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-700 sm:text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">✕</span>
                <span>{error}</span>
              </div>
            )}
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Service Date *
                </label>
                <input
                  type="date"
                  min={getToday()}
                  value={date}
                  onChange={(e) =>
                    setDate(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Preferred Time *
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) =>
                    setTime(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Contact Mobile Number *
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) =>
                    handleMobileChange(e.target.value)
                  }
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>
            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Service Address *
              </label>
              <textarea
                value={address}
                onChange={(e) =>
                  setAddress(e.target.value)
                }
                rows={3}
                placeholder="Enter complete address with landmark"
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div className="mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Specific Issue / Requirements
              </label>
              <textarea
                value={requirement}
                onChange={(e) =>
                  setRequirement(e.target.value)
                }
                rows={4}
                placeholder="Describe what repair or service you need in detail..."
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-2 text-xs text-slate-500">
                e.g., AC cooling low and making buzzing noise, kitchen sink pipe leaking, door hinge loose.
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-7 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Sending Booking..."
                : "Submit Booking Request →"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              Your request will be delivered directly to the technician with instant tracking.
            </p>
          </form>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/5">
              <div className="border-b border-slate-100 p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Booking Summary
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  {provider.name}
                </h2>
                <p className="mt-1 text-sm font-medium text-blue-600">
                  {provider.service}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200/60">
                  <OnlineStatusDot available={true} label="Available" />
                </div>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Location
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <MapPinIcon className="w-4 h-4 text-blue-600" />
                    <span>{provider.city || "Not specified"}</span>
                  </p>
                </div>
                {provider.experience && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Experience
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800 flex items-center gap-1.5">
                      <BriefcaseIcon className="w-4 h-4 text-slate-500" />
                      <span>{provider.experience}</span>
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Estimated Starting Fee
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {provider.price?.trim()
                      ? `₹${provider.price}`
                      : "Direct Estimate"}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <ShieldCheckIcon className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Master App Trust Guarantee</span>
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-blue-800">
                    Zero upfront cancellation fee. Pay directly to the technician once work is inspected and completed.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}