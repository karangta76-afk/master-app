"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
type AccountStatus = "Active" | "Blocked";
type Customer = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  createdAt?: string;
  accountStatus?: AccountStatus;
};
type Booking = {
  id: string;
  customerId: string;
  provider?: string;
  providerService?: string;
  service?: string;
  date?: string;
  time?: string;
  status?: string;
  requirement?: string;
  createdAt?: string;
};
export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | AccountStatus
  >("All");
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const requireAdminSession = useCallback(() => {
    const adminLoggedIn =
      window.localStorage.getItem("masterAdminLoggedIn");
    const savedAdmin =
      window.localStorage.getItem("masterAdmin");
    if (adminLoggedIn !== "true" || !savedAdmin) {
      router.replace("/admin/login");
      return null;
    }
    try {
      const adminProfile = JSON.parse(savedAdmin);
      if (
        adminProfile?.email?.trim().toLowerCase() !==
          "admin@masterapp.com" ||
        adminProfile?.role !== "admin"
      ) {
        window.localStorage.removeItem("masterAdminLoggedIn");
        window.localStorage.removeItem("masterAdmin");
        router.replace("/admin/login");
        return null;
      }
      return adminProfile;
    } catch {
      window.localStorage.removeItem("masterAdminLoggedIn");
      window.localStorage.removeItem("masterAdmin");
      router.replace("/admin/login");
      return null;
    }
  }, [router]);
  const loadCustomers = useCallback(async () => {
    const authUser = await requireAdminSession();
    if (!authUser) return;
    try {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id,name,mobile,email,address,created_at,account_status"
        )
        .order("created_at", {
          ascending: false,
        });
      let rows = data || [];
      if (error || rows.length === 0) {
        if (error) {
          console.warn("Supabase customers query notice:", error);
        }
        try {
          const raw = window.localStorage.getItem("masterUser");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.id) {
              rows = [{
                id: parsed.id,
                name: parsed.name || "Customer",
                mobile: parsed.mobile || "",
                email: parsed.email || "",
                address: parsed.address || "",
                created_at: new Date().toISOString(),
                account_status: "Active",
              }];
            }
          }
        } catch {}
      }
      const mappedCustomers: Customer[] = (rows || []).map(
        (customer: any) => ({
          id: customer.id,
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email || "",
          address: customer.address || "",
          createdAt: customer.created_at,
          accountStatus:
            customer.account_status === "Blocked"
              ? "Blocked"
              : "Active",
        })
      );
      setCustomers(mappedCustomers);
    } catch (error) {
      console.error("Customers load exception:", error);
    }
  }, [requireAdminSession]);
  const loadBookings = useCallback(async () => {
    const authUser = await requireAdminSession();
    if (!authUser) return;
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id,customer_id,provider_name,provider_service,service,booking_date,booking_time,status,requirement,created_at"
        )
        .order("created_at", {
          ascending: false,
        });
      let rows = data || [];
      if (error || rows.length === 0) {
        if (error) {
          console.warn("Supabase bookings notice in admin customers:", error);
        }
        try {
          const raw = window.localStorage.getItem("masterBookings");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              rows = parsed.map((item: any) => ({
                id: item.id || item.booking_id,
                customer_id: item.customerId || item.customer_id,
                provider_name: item.provider || item.provider_name,
                provider_service: item.providerService || item.provider_service,
                service: item.service,
                booking_date: item.date || item.booking_date,
                booking_time: item.time || item.booking_time,
                status: item.status || "Pending",
                requirement: item.requirement,
                created_at: item.createdAt || item.created_at,
              }));
            }
          }
        } catch {}
      }
      const mappedBookings: Booking[] = (rows || []).map(
        (booking: any) => ({
          id: booking.id,
          customerId: booking.customer_id,
          provider: booking.provider_name || "",
          providerService: booking.provider_service || "",
          service: booking.service || "",
          date: booking.booking_date || "",
          time: booking.booking_time || "",
          status: booking.status || "Pending",
          requirement: booking.requirement || "",
          createdAt: booking.created_at,
        })
      );
      setBookings(mappedBookings);
    } catch (error) {
      console.error("Bookings load exception:", error);
    }
  }, [requireAdminSession]);
  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadCustomers(),
      loadBookings(),
    ]);
    setLoading(false);
  }, [loadCustomers, loadBookings]);
  useEffect(() => {
    let active = true;
    async function initializeAdminCustomers() {
      const authUser = await requireAdminSession();
      if (!active || !authUser) {
        if (active) {
          setLoading(false);
        }
        return;
      }
      void loadData();
    }
    void initializeAdminCustomers();
    const customersChannel = supabase
      .channel("admin-customers-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
        },
        () => {
          void loadCustomers();
        }
      )
      .subscribe();
    const bookingsChannel = supabase
      .channel("admin-customers-bookings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          void loadBookings();
        }
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(customersChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [loadBookings, loadCustomers, loadData, requireAdminSession]);
  const activeCount = customers.filter(
    (customer) =>
      (customer.accountStatus || "Active") ===
      "Active"
  ).length;
  const blockedCount = customers.filter(
    (customer) =>
      (customer.accountStatus || "Active") ===
      "Blocked"
  ).length;
  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesSearch =
        !query ||
        customer.name
          .toLowerCase()
          .includes(query) ||
        customer.mobile
          .toLowerCase()
          .includes(query) ||
        (customer.email || "")
          .toLowerCase()
          .includes(query) ||
        customer.id
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === "All" ||
        (customer.accountStatus || "Active") ===
          statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);
  const getCustomerBookings = (
    customerId: string
  ) => {
    return bookings.filter(
      (booking) =>
        booking.customerId === customerId
    );
  };
  const updateCustomerStatus = async (
    customerId: string,
    status: AccountStatus
  ) => {
    const authUser = await requireAdminSession();
    if (!authUser) return;
    try {
      const { error } = await supabase
        .from("customers")
        .update({ account_status: status })
        .eq("id", customerId);
      if (error) {
        console.warn("Customer status update Supabase notice:", error);
      }
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === customerId
            ? { ...customer, accountStatus: status }
            : customer
        )
      );
      setSelectedCustomer((current) =>
        current && current.id === customerId
          ? { ...current, accountStatus: status }
          : current
      );
      try {
        const rawUser = window.localStorage.getItem("masterUser");
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed?.id === customerId) {
            parsed.accountStatus = status;
            window.localStorage.setItem("masterUser", JSON.stringify(parsed));
          }
        }
        window.dispatchEvent(new Event("master-customer-updated"));
      } catch {}
      setNotice({ type: "success", text: `Customer status updated to ${status}.` });
    } catch (error) {
      console.error("Customer status exception:", error);
      setNotice({ type: "error", text: "Failed to update customer status." });
    }
  };
  const deleteCustomer = async (
    customerId: string
  ) => {
    const authUser = await requireAdminSession();
    if (!authUser) return;
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) return;
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);
      if (error) {
        console.warn("Customer delete Supabase notice:", error);
      }
      setCustomers((current) =>
        current.filter((item) => item.id !== customerId)
      );
      setBookings((current) =>
        current.filter((booking) => booking.customerId !== customerId)
      );
      setSelectedCustomer(null);
      setCustomerToDelete(null);
      try {
        const rawUser = window.localStorage.getItem("masterUser");
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed?.id === customerId) {
            window.localStorage.removeItem("masterUser");
            window.localStorage.removeItem("masterUserLoggedIn");
          }
        }
        window.dispatchEvent(new Event("master-customer-updated"));
      } catch {}
      setNotice({ type: "info", text: `Customer "${customer.name}" removed.` });
    } catch (error) {
      console.error("Customer delete exception:", error);
      setNotice({ type: "error", text: "Failed to delete customer." });
    }
  };
  const getStatusBadge = (
    status?: AccountStatus
  ) => {
    const currentStatus =
      status || "Active";
    if (currentStatus === "Active") {
      return (
        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
        Blocked
      </span>
    );
  };
  const logout = async () => {
    await supabase.auth.signOut();
    window.localStorage.removeItem("masterAdminLoggedIn");
    window.localStorage.removeItem("masterAdmin");
    window.localStorage.removeItem("masterAdminCredentials");
    window.localStorage.removeItem("masterActiveRole");
    window.dispatchEvent(new Event("master-auth-updated"));
    router.replace("/admin/login");
  };
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Customer Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage customer accounts and booking history.
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
        <button
          onClick={() =>
            router.push("/admin/dashboard")
          }
          className="mb-5 text-sm font-semibold text-blue-600 hover:underline"
        >
          Back to Dashboard
        </button>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Customers
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {customers.length}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Active Customers
            </p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {activeCount}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Blocked Customers
            </p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {blockedCount}
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search name, mobile, email or customer ID..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 lg:max-w-xl"
            />
            <div className="flex gap-2">
              {(
                ["All", "Active", "Blocked"] as const
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
        <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-bold text-slate-900">
              Customers ({filteredCustomers.length})
            </h2>
          </div>
          {loading ? (
            <div className="p-10 text-center">
              <div className="text-4xl">Loading</div>
              <h3 className="mt-3 font-semibold text-slate-900">
                Loading customers...
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Please wait while customer data is loaded.
              </p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl">Customers</div>
              <h3 className="mt-3 font-semibold text-slate-900">
                No customers found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try another search or status filter.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredCustomers.map((customer) => {
                const customerBookings =
                  getCustomerBookings(
                    customer.id
                  );
                const status =
                  customer.accountStatus ||
                  "Active";
                return (
                  <div
                    key={customer.id}
                    className="p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                          {customer.name
                            .split(" ")
                            .map(
                              (word) =>
                                word[0]
                            )
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                              {customer.name}
                            </h3>
                            {getStatusBadge(
                              status
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            Mobile: {customer.mobile}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Email: {" "}
                            {customer.email ||
                              "Email not provided"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            ID: {customer.id}
                          </p>
                          <p className="mt-2 text-xs font-medium text-blue-600">
                            Bookings: {" "}
                            {customerBookings.length}{" "}
                            booking
                            {customerBookings.length !==
                            1
                              ? "s"
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            setSelectedCustomer(
                              customer
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          View
                        </button>
                        <a
                          href={`tel:${customer.mobile}`}
                          className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                        >
                          Call
                        </a>
                        {status === "Active" ? (
                          <button
                            onClick={() =>
                              updateCustomerStatus(
                                customer.id,
                                "Blocked"
                              )
                            }
                            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                          >
                            Block
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              updateCustomerStatus(
                                customer.id,
                                "Active"
                              )
                            }
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Unblock
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setCustomerToDelete(
                              customer.id
                            )
                          }
                          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* DELETE CONFIRMATION MODAL */}
      {customerToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCustomerToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Customer Account</h3>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to permanently delete this customer account and their associated records?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 border rounded-xl text-slate-700 hover:bg-slate-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteCustomer(customerToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium text-sm shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Customer Details
                </h2>
                <p className="text-sm text-slate-500">
                  Account and booking information
                </p>
              </div>
              <button
                onClick={() =>
                  setSelectedCustomer(null)
                }
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                  {selectedCustomer.name
                    .split(" ")
                    .map(
                      (word) =>
                        word[0]
                    )
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedCustomer.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Customer ID:{" "}
                    {selectedCustomer.id}
                  </p>
                  <div className="mt-2">
                    {getStatusBadge(
                      selectedCustomer.accountStatus
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Mobile
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedCustomer.mobile}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Email
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedCustomer.email ||
                      "Not provided"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Address
                  </p>
                  <p className="mt-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    {selectedCustomer.address ||
                      "Not provided"}
                  </p>
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">
                    Booking History
                  </h3>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {
                      getCustomerBookings(
                        selectedCustomer.id
                      ).length
                    }{" "}
                    bookings
                  </span>
                </div>
                {getCustomerBookings(
                  selectedCustomer.id
                ).length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No bookings found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getCustomerBookings(
                      selectedCustomer.id
                    ).map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-2xl border p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {booking.service ||
                                booking.providerService ||
                                "Service"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Provider:{" "}
                              {booking.provider ||
                                "Unknown"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Booking ID:{" "}
                              {booking.id}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {booking.status ||
                              "Pending"}
                          </span>
                        </div>
                        {(booking.date ||
                          booking.time) && (
                          <p className="mt-3 text-sm text-slate-600">
                            Date: {" "}
                            {booking.date || "-"}{" "}
                            {booking.time
                              ? `• ${booking.time}`
                              : ""}
                          </p>
                        )}
                        {booking.requirement && (
                          <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                            {booking.requirement}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <a
                  href={`tel:${selectedCustomer.mobile}`}
                  className="rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-green-700"
                >
                  Call Customer
                </a>
                {(
                  selectedCustomer.accountStatus ||
                  "Active"
                ) === "Active" ? (
                  <button
                    onClick={() =>
                      updateCustomerStatus(
                        selectedCustomer.id,
                        "Blocked"
                      )
                    }
                    className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600"
                  >
                    Block Customer
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      updateCustomerStatus(
                        selectedCustomer.id,
                        "Active"
                      )
                    }
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    Unblock Customer
                  </button>
                )}
                <button
                  onClick={() =>
                    deleteCustomer(
                      selectedCustomer.id
                    )
                  }
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
