"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  provider?: string;
  providerService?: string;
  service?: string;
  date?: string;
  time?: string;
  name?: string;
  mobile?: string;
  address?: string;
  requirement?: string;
  status?: BookingStatus;
  rejectionReason?: string;
  cancellationReason?: string;
  createdAt?: string;
};
type Customer = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
};
type Provider = {
  id: string;
  name: string;
  mobile: string;
  service?: string;
  city?: string;
};
function getSupabaseErrorDetails(error: unknown) {
  const value = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
    status?: number;
    statusText?: string;
  } | null;
  return {
    message: value?.message || "Unknown Supabase error",
    details: value?.details || "",
    hint: value?.hint || "",
    code: value?.code || "",
    status: value?.status || "",
    statusText: value?.statusText || "",
  };
}
function isMissingRejectionReasonColumn(error: unknown) {
  const details = getSupabaseErrorDetails(error);
  const message = `${details.message} ${details.details} ${details.hint}`.toLowerCase();
  return message.includes("rejection_reason") &&
    (message.includes("column") || message.includes("schema cache"));
}
export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | BookingStatus
  >("All");
  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);
  const [reason, setReason] = useState("");
  const [reasonType, setReasonType] = useState<
    "rejection" | "cancellation" | null
  >(null);
  const [reasonError, setReasonError] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  async function requireAdminSession() {
    try {
      const adminLoggedIn =
        window.localStorage.getItem("masterAdminLoggedIn");
      const savedAdmin =
        window.localStorage.getItem("masterAdmin");
      if (adminLoggedIn !== "true" || !savedAdmin) {
        router.replace("/admin/login");
        return null;
      }
      const adminProfile = JSON.parse(savedAdmin);
      if (
        adminProfile?.email?.trim().toLowerCase() !==
          "admin@masterapp.com" ||
        adminProfile?.role !== "admin"
      ) {
        window.localStorage.removeItem("masterAdminLoggedIn");
        window.localStorage.removeItem("masterAdmin");
        window.localStorage.removeItem("masterAdminCredentials");
        router.replace("/admin/login");
        return null;
      }
      return adminProfile;
    } catch (authError) {
      console.error("ADMIN BOOKINGS AUTH ERROR:", authError);
      window.localStorage.removeItem("masterAdminLoggedIn");
      window.localStorage.removeItem("masterAdmin");
      window.localStorage.removeItem("masterAdminCredentials");
      router.replace("/admin/login");
      return null;
    }
  }
  useEffect(() => {
    let active = true;
    let bookingsChannel: ReturnType<typeof supabase.channel> | null = null;
    let customersChannel: ReturnType<typeof supabase.channel> | null = null;
    let providersChannel: ReturnType<typeof supabase.channel> | null = null;
    async function initializeAdminBookings() {
      const authUser = await requireAdminSession();
      if (!active) return;
      if (!authUser) {
        setLoading(false);
        return;
      }
      void loadData();
      bookingsChannel = supabase
        .channel("admin-bookings-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings" },
          () => { void loadBookings(); }
        )
        .subscribe();
      customersChannel = supabase
        .channel("admin-customers-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "customers" },
          () => { void loadCustomers(); }
        )
        .subscribe();
      providersChannel = supabase
        .channel("admin-providers-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "providers" },
          () => { void loadProviders(); }
        )
        .subscribe();
    }
    void initializeAdminBookings();
    return () => {
      active = false;
      if (bookingsChannel) void supabase.removeChannel(bookingsChannel);
      if (customersChannel) void supabase.removeChannel(customersChannel);
      if (providersChannel) void supabase.removeChannel(providersChannel);
    };
  }, [router]);
  const mapBooking = (item: any): Booking => {
    return {
      id: item.id,
      customerId: item.customer_id,
      providerId: item.provider_id,
      provider: item.provider_name,
      providerService: item.provider_service,
      service: item.service,
      date: item.booking_date,
      time: item.booking_time,
      name: item.customer_name,
      mobile: item.customer_mobile,
      address: item.address,
      requirement: item.requirement,
      status: item.status || "Pending",
      rejectionReason: item.rejection_reason,
      cancellationReason: item.cancellation_reason,
      createdAt: item.created_at,
    };
  };
  const loadBookings = async () => {
    try {
      const result = await supabase
        .from("bookings")
        .select("id,customer_id,provider_id,provider_name,provider_service,service,booking_date,booking_time,customer_name,customer_mobile,address,requirement,status,rejection_reason,cancellation_reason,created_at")
        .order("created_at", { ascending: false });
      type QueryBookingRow = Omit<NonNullable<typeof result.data>[number], "rejection_reason"> & {
        rejection_reason?: string | null;
      };
      let data: QueryBookingRow[] | null = result.data;
      let error = result.error;
      if (error && isMissingRejectionReasonColumn(error)) {
        const retry = await supabase
          .from("bookings")
          .select("id,customer_id,provider_id,provider_name,provider_service,service,booking_date,booking_time,customer_name,customer_mobile,address,requirement,status,cancellation_reason,created_at")
          .order("created_at", { ascending: false });
        data = retry.data;
        error = retry.error;
      }
      let list = (data || []).map(mapBooking);
      if (error || list.length === 0) {
        if (error) {
          console.warn("Supabase bookings notice:", error);
        }
        try {
          const raw = window.localStorage.getItem("masterBookings");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              list = parsed.map((item: any) => ({
                id: String(item.id || item.booking_id || ""),
                customerId: String(item.customerId || item.customer_id || ""),
                providerId: String(item.providerId || item.provider_id || ""),
                provider: item.provider || item.provider_name || "",
                providerService: item.providerService || item.provider_service || "",
                service: item.service || "",
                date: item.date || item.booking_date || "",
                time: item.time || item.booking_time || "",
                name: item.name || item.customer_name || "",
                mobile: item.mobile || item.customer_mobile || "",
                address: item.address || "",
                requirement: item.requirement || "",
                status: (item.status || "Pending") as BookingStatus,
                rejectionReason: item.rejectionReason || item.rejection_reason || "",
                cancellationReason: item.cancellationReason || item.cancellation_reason || "",
                createdAt: item.createdAt || item.created_at || "",
              }));
            }
          }
        } catch {}
      }
      setBookings(list);
    } catch (error) {
      console.error("MASTER APP BOOKINGS EXCEPTION:", error);
      try {
        const raw = window.localStorage.getItem("masterBookings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setBookings(parsed.map(mapBooking));
        }
      } catch {}
    }
  };
  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id,name,mobile,email,address")
        .order("created_at", { ascending: false });
      let mapped: Customer[] = (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        mobile: item.mobile,
        email: item.email,
        address: item.address,
      }));
      if (mapped.length === 0) {
        try {
          const raw = window.localStorage.getItem("masterUser");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.id) {
              mapped = [{
                id: parsed.id,
                name: parsed.name || "Customer",
                mobile: parsed.mobile || "",
                email: parsed.email || "",
                address: parsed.address || "",
              }];
            }
          }
        } catch {}
      }
      setCustomers(mapped);
    } catch (error) {
      console.error("MASTER APP CUSTOMERS EXCEPTION:", error);
    }
  };
  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("providers")
        .select("id,name,mobile,service,city")
        .order("created_at", { ascending: false });
      let mapped: Provider[] = (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        mobile: item.mobile,
        service: item.service,
        city: item.city,
      }));
      if (mapped.length === 0) {
        try {
          const raw = window.localStorage.getItem("masterProviders");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              mapped = parsed.map((item: any) => ({
                id: item.id,
                name: item.name,
                mobile: item.mobile,
                service: item.service,
                city: item.city,
              }));
            }
          }
        } catch {}
      }
      setProviders(mapped);
    } catch (error) {
      console.error("MASTER APP PROVIDERS EXCEPTION:", error);
    }
  };
  const loadData = async () => {
    const authUser = await requireAdminSession();
    if (!authUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await Promise.all([loadBookings(), loadCustomers(), loadProviders()]);
    } finally {
      setLoading(false);
    }
  };
  const getStatus = (booking: Booking): BookingStatus => {
    return booking.status || "Pending";
  };
  const totalCount = bookings.length;
  const pendingCount = bookings.filter(
    (booking) => getStatus(booking) === "Pending"
  ).length;
  const acceptedCount = bookings.filter(
    (booking) => getStatus(booking) === "Accepted"
  ).length;
  const completedCount = bookings.filter(
    (booking) => getStatus(booking) === "Completed"
  ).length;
  const rejectedCount = bookings.filter(
    (booking) => getStatus(booking) === "Rejected"
  ).length;
  const cancelledCount = bookings.filter(
    (booking) => getStatus(booking) === "Cancelled"
  ).length;
  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesSearch =
        !query ||
        booking.id.toLowerCase().includes(query) ||
        (booking.name || "")
          .toLowerCase()
          .includes(query) ||
        (booking.mobile || "")
          .toLowerCase()
          .includes(query) ||
        (booking.provider || "")
          .toLowerCase()
          .includes(query) ||
        (booking.service || "")
          .toLowerCase()
          .includes(query) ||
        (booking.providerService || "")
          .toLowerCase()
          .includes(query) ||
        (booking.customerId || "")
          .toLowerCase()
          .includes(query) ||
        (booking.providerId || "")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === "All" ||
        getStatus(booking) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);
  const findCustomer = (customerId: string) => {
    return customers.find(
      (customer) => customer.id === customerId
    );
  };
  const findProvider = (providerId: string) => {
    return providers.find(
      (provider) => provider.id === providerId
    );
  };
  const updateBooking = async (
    bookingId: string,
    newStatus: BookingStatus,
    updateReason?: string
  ) => {
    const authUser = await requireAdminSession();
    if (!authUser) return;
    const currentBooking = bookings.find(
      (booking) => booking.id === bookingId
    );
    if (!currentBooking) {
      return;
    }
    const updatedBooking: Booking = {
      ...currentBooking,
      status: newStatus,
    };
    if (newStatus === "Rejected") {
      updatedBooking.rejectionReason =
        updateReason || "";
      delete updatedBooking.cancellationReason;
    }
    if (newStatus === "Cancelled") {
      updatedBooking.cancellationReason =
        updateReason || "";
      delete updatedBooking.rejectionReason;
    }
    if (
      newStatus !== "Rejected" &&
      newStatus !== "Cancelled"
    ) {
      delete updatedBooking.rejectionReason;
      delete updatedBooking.cancellationReason;
    }
    const supabasePayload = {
      id: updatedBooking.id,
      customer_id: updatedBooking.customerId,
      provider_id: updatedBooking.providerId,
      provider_name: updatedBooking.provider || null,
      provider_service:
        updatedBooking.providerService || null,
      service: updatedBooking.service || null,
      booking_date:
        updatedBooking.date ||
        new Date().toISOString().split("T")[0],
      booking_time: updatedBooking.time || null,
      customer_name: updatedBooking.name || null,
      customer_mobile: updatedBooking.mobile || null,
      address: updatedBooking.address || null,
      requirement: updatedBooking.requirement || null,
      status: newStatus,
      rejection_reason:
        newStatus === "Rejected"
          ? updateReason || ""
          : null,
      cancellation_reason:
        newStatus === "Cancelled"
          ? updateReason || ""
          : null,
    };
    let { error } = await supabase
      .from("bookings")
      .update(supabasePayload)
      .eq("id", bookingId);
    if (error && isMissingRejectionReasonColumn(error)) {
      const { rejection_reason, ...compatiblePayload } = supabasePayload;
      void rejection_reason;
      const retry = await supabase
        .from("bookings")
        .update(compatiblePayload)
        .eq("id", bookingId);
      error = retry.error;
    }
    if (error) {
      console.warn("Booking update Supabase notice:", error);
    }
    const updatedBookings = bookings.map(
      (booking) =>
        booking.id === bookingId
          ? updatedBooking
          : booking
    );
    setBookings(updatedBookings);
    try {
      localStorage.setItem(
        "masterBookings",
        JSON.stringify(updatedBookings)
      );
      window.dispatchEvent(
        new Event("master-bookings-updated")
      );
    } catch {}
    const updatedSelected = updatedBookings.find(
      (booking) => booking.id === bookingId
    );
    if (updatedSelected) {
      setSelectedBooking(updatedSelected);
    }
    setReason("");
    setReasonType(null);
    setReasonError("");
    setNotice({
      type: "success",
      text: `Booking #${bookingId.slice(0, 8)} updated to ${newStatus}.`,
    });
  };
  const requestStatusChange = (
    booking: Booking,
    newStatus: BookingStatus
  ) => {
    if (
      newStatus === "Rejected" ||
      newStatus === "Cancelled"
    ) {
      setSelectedBooking(booking);
      setReasonType(
        newStatus === "Rejected"
          ? "rejection"
          : "cancellation"
      );
      setReason("");
      return;
    }
    updateBooking(booking.id, newStatus);
  };
  const confirmReasonAction = () => {
    if (!selectedBooking || !reasonType) {
      return;
    }
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setReasonError("Please enter a reason.");
      return;
    }
    setReasonError("");
    updateBooking(
      selectedBooking.id,
      reasonType === "rejection"
        ? "Rejected"
        : "Cancelled",
      cleanReason
    );
  };
  const getStatusBadge = (
    status: BookingStatus
  ) => {
    if (status === "Pending") {
      return (
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
          🟠 Pending
        </span>
      );
    }
    if (status === "Accepted") {
      return (
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          🔵 Accepted
        </span>
      );
    }
    if (status === "Completed") {
      return (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          🟢 Completed
        </span>
      );
    }
    if (status === "Rejected") {
      return (
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
          🔴 Rejected
        </span>
      );
    }
    return (
      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
        ⚫ Cancelled
      </span>
    );
  };
  const logout = async () => {
    await supabase.auth.signOut();
    window.localStorage.removeItem("masterAdminLoggedIn");
    window.localStorage.removeItem("masterAdmin");
    window.localStorage.removeItem("masterAdminCredentials");
    router.replace("/admin/login");
  };
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Booking Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor and control all Master App bookings.
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {notice && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center justify-between border shadow-xs ${
              notice.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : notice.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <p className="text-sm font-medium">{notice.text}</p>
            <button
              onClick={() => setNotice(null)}
              className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* Back */}
        <button
          onClick={() =>
            router.push("/admin/dashboard")
          }
          className="mb-5 text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </button>
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Total
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Pending
            </p>
            <p className="mt-2 text-2xl font-bold text-orange-500">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Accepted
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {acceptedCount}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Completed
            </p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {completedCount}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Rejected
            </p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {rejectedCount}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              Cancelled
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-600">
              {cancelledCount}
            </p>
          </div>
        </div>
        {/* Search + Filters */}
        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search booking ID, customer, provider, mobile or service..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "All",
                  "Pending",
                  "Accepted",
                  "Completed",
                  "Rejected",
                  "Cancelled",
                ] as const
              ).map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    setStatusFilter(status)
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    statusFilter === status
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Booking List */}
        <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-bold text-slate-900">
              Bookings ({filteredBookings.length})
            </h2>
          </div>
          {loading ? (
            <div className="p-10 text-center">
              <div className="text-4xl">⏳</div>
              <h3 className="mt-3 font-semibold text-slate-900">
                Loading bookings...
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Fetching latest booking data.
              </p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl">📋</div>
              <h3 className="mt-3 font-semibold text-slate-900">
                No bookings found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try another search or status filter.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredBookings.map((booking) => {
                const status = getStatus(booking);
                const customer = findCustomer(
                  booking.customerId
                );
                const provider = findProvider(
                  booking.providerId
                );
                return (
                  <div
                    key={booking.id}
                    className="p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">
                            {booking.service ||
                              booking.providerService ||
                              "Service Booking"}
                          </h3>
                          {getStatusBadge(status)}
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          👤{" "}
                          {customer?.name ||
                            booking.name ||
                            "Customer"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          🧑‍🔧{" "}
                          {provider?.name ||
                            booking.provider ||
                            "Provider"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          📅 {booking.date || "-"}
                          {booking.time
                            ? ` • ${booking.time}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Booking ID: {booking.id}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            setSelectedBooking(
                              booking
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          👁️ View
                        </button>
                        {customer && (
                          <a
                            href={`tel:${customer.mobile}`}
                            className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                          >
                            📞 Customer
                          </a>
                        )}
                        {provider && (
                          <a
                            href={`tel:${provider.mobile}`}
                            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            📞 Provider
                          </a>
                        )}
                        {status === "Pending" && (
                          <>
                            <button
                              onClick={() =>
                                requestStatusChange(
                                  booking,
                                  "Accepted"
                                )
                              }
                              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() =>
                                requestStatusChange(
                                  booking,
                                  "Rejected"
                                )
                              }
                              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {status === "Accepted" && (
                          <>
                            <button
                              onClick={() =>
                                requestStatusChange(
                                  booking,
                                  "Completed"
                                )
                              }
                              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                            >
                              ✓ Completed
                            </button>
                            <button
                              onClick={() =>
                                requestStatusChange(
                                  booking,
                                  "Cancelled"
                                )
                              }
                              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                              Cancel
                            </button>
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
      </div>
      {/* Booking Details Modal */}
      {selectedBooking && !reasonType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Booking Details
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedBooking.id}
                </p>
              </div>
              <button
                onClick={() =>
                  setSelectedBooking(null)
                }
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-5 p-5">
              {/* Status */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Current Status
                  </p>
                  <div className="mt-2">
                    {getStatusBadge(
                      getStatus(selectedBooking)
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">
                    Booking ID
                  </p>
                  <p className="font-semibold text-slate-800">
                    {selectedBooking.id}
                  </p>
                </div>
              </div>
              {/* Customer */}
              <div className="rounded-2xl border p-4">
                <h3 className="font-bold text-slate-900">
                  👤 Customer
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">
                      Name
                    </p>
                    <p className="font-medium text-slate-800">
                      {findCustomer(
                        selectedBooking.customerId
                      )?.name ||
                        selectedBooking.name ||
                        "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      Mobile
                    </p>
                    <p className="font-medium text-slate-800">
                      {findCustomer(
                        selectedBooking.customerId
                      )?.mobile ||
                        selectedBooking.mobile ||
                        "Not available"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400">
                      Customer ID
                    </p>
                    <p className="font-medium text-slate-800">
                      {selectedBooking.customerId}
                    </p>
                  </div>
                </div>
              </div>
              {/* Provider */}
              <div className="rounded-2xl border p-4">
                <h3 className="font-bold text-slate-900">
                  🧑‍🔧 Provider
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">
                      Name
                    </p>
                    <p className="font-medium text-slate-800">
                      {findProvider(
                        selectedBooking.providerId
                      )?.name ||
                        selectedBooking.provider ||
                        "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      Mobile
                    </p>
                    <p className="font-medium text-slate-800">
                      {findProvider(
                        selectedBooking.providerId
                      )?.mobile ||
                        "Not available"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      Provider ID
                    </p>
                    <p className="font-medium text-slate-800">
                      {selectedBooking.providerId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      City
                    </p>
                    <p className="font-medium text-slate-800">
                      {findProvider(
                        selectedBooking.providerId
                      )?.city || "-"}
                    </p>
                  </div>
                </div>
              </div>
              {/* Service */}
              <div className="rounded-2xl border p-4">
                <h3 className="font-bold text-slate-900">
                  🛠️ Service Details
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">
                      Service
                    </p>
                    <p className="font-medium text-slate-800">
                      {selectedBooking.service ||
                        selectedBooking.providerService ||
                        "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      Date & Time
                    </p>
                    <p className="font-medium text-slate-800">
                      {selectedBooking.date || "-"}
                      {selectedBooking.time
                        ? ` • ${selectedBooking.time}`
                        : ""}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400">
                      Service Address
                    </p>
                    <p className="mt-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      {selectedBooking.address ||
                        "Not provided"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-400">
                      Requirement
                    </p>
                    <p className="mt-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      {selectedBooking.requirement ||
                        "No additional requirement"}
                    </p>
                  </div>
                </div>
              </div>
              {/* Reason */}
              {selectedBooking.rejectionReason && (
                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-700">
                    Rejection Reason
                  </p>
                  <p className="mt-1 text-sm text-red-600">
                    {selectedBooking.rejectionReason}
                  </p>
                </div>
              )}
              {selectedBooking.cancellationReason && (
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm font-bold text-slate-700">
                    Cancellation Reason
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedBooking.cancellationReason}
                  </p>
                </div>
              )}
              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {findCustomer(
                  selectedBooking.customerId
                ) && (
                  <a
                    href={`tel:${
                      findCustomer(
                        selectedBooking.customerId
                      )?.mobile
                    }`}
                    className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700"
                  >
                    📞 Call Customer
                  </a>
                )}
                {findProvider(
                  selectedBooking.providerId
                ) && (
                  <a
                    href={`tel:${
                      findProvider(
                        selectedBooking.providerId
                      )?.mobile
                    }`}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    📞 Call Provider
                  </a>
                )}
                {getStatus(selectedBooking) ===
                  "Pending" && (
                  <>
                    <button
                      onClick={() =>
                        requestStatusChange(
                          selectedBooking,
                          "Accepted"
                        )
                      }
                      className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white"
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() =>
                        requestStatusChange(
                          selectedBooking,
                          "Rejected"
                        )
                      }
                      className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white"
                    >
                      ✕ Reject
                    </button>
                  </>
                )}
                {getStatus(selectedBooking) ===
                  "Accepted" && (
                  <>
                    <button
                      onClick={() =>
                        requestStatusChange(
                          selectedBooking,
                          "Completed"
                        )
                      }
                      className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white"
                    >
                      ✓ Mark Completed
                    </button>
                    <button
                      onClick={() =>
                        requestStatusChange(
                          selectedBooking,
                          "Cancelled"
                        )
                      }
                      className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white"
                    >
                      Cancel Booking
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Reason Modal */}
      {selectedBooking && reasonType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">
              {reasonType === "rejection"
                ? "Reject Booking"
                : "Cancel Booking"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Please provide a reason for this action.
            </p>
            <textarea
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              rows={5}
              placeholder={
                reasonType === "rejection"
                  ? "Enter rejection reason..."
                  : "Enter cancellation reason..."
              }
              className="mt-4 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-blue-500"
            />
            {reasonError && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                {reasonError}
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setReason("");
                  setReasonType(null);
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={confirmReasonAction}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold text-white ${
                  reasonType === "rejection"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-slate-700 hover:bg-slate-800"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
