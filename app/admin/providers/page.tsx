"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
type Provider = {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  service: string;
  city: string;
  address: string | null;
  experience: string | null;
  price: string | null;
  description: string | null;
  availability: string;
  accountStatus: string;
  createdAt: string | null;
  deletionRequestedAt: string | null;
  previousAccountStatus: string | null;
};
export default function AdminProvidersPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedProvider, setSelectedProvider] =
    useState<Provider | null>(null);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  function syncLocalProviders(updatedList: Provider[]) {
    try {
      window.localStorage.setItem("masterProviders", JSON.stringify(updatedList));
      window.localStorage.setItem("master-providers", JSON.stringify(updatedList));
      window.dispatchEvent(new Event("master-providers-updated"));
      window.dispatchEvent(new Event("master-provider-updated"));
    } catch (err) {
      console.error("Local provider sync error:", err);
    }
  }

  /*
   * =========================================================
   * SECURE ADMIN SESSION
   * =========================================================
   *
   * localStorage is a compatibility cache only.
   * Supabase Auth is the source of truth.
   */
  async function requireAdminSession() {
    try {
      const adminLoggedIn = window.localStorage.getItem("masterAdminLoggedIn");
      const savedAdmin = window.localStorage.getItem("masterAdmin");
      if (adminLoggedIn !== "true" || !savedAdmin) {
        router.replace("/admin/login");
        return null;
      }
      const adminProfile = JSON.parse(savedAdmin);
      if (
        adminProfile?.email?.trim().toLowerCase() !== "admin@masterapp.com" ||
        adminProfile?.role !== "admin"
      ) {
        window.localStorage.removeItem("masterAdminLoggedIn");
        window.localStorage.removeItem("masterAdmin");
        router.replace("/admin/login");
        return null;
      }
      return adminProfile;
    } catch (error) {
      console.error("ADMIN PROVIDERS AUTH ERROR:", error);
      router.replace("/admin/login");
      return null;
    }
  }
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const loadProviders = async () => {
    const authUser = await requireAdminSession();
    if (!authUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await supabase
        .from("providers")
        .select(
          "id,name,mobile,email,service,city,address,experience,price,description,availability,account_status,created_at,deletion_requested_at,previous_account_status"
        );
      
      let rows = response.data || [];
      if (response.error || rows.length === 0) {
        if (response.error) {
          console.warn("Supabase providers query notice:", response.error);
        }
        try {
          const raw = window.localStorage.getItem("masterProviders");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setProviders(parsed);
              setLoading(false);
              return;
            }
          }
        } catch {}
      }

      // A provider is soft-deleted first. The admin gets a 24-hour
      // undo window. Expired deletion requests are permanently deleted
      // the next time this admin page loads.
      const deletionCutoff =
        Date.now() - 24 * 60 * 60 * 1000;
      const activeRows: any[] = [];
      for (const item of rows) {
        if (
          item.account_status === "Pending Deletion" &&
          item.deletion_requested_at &&
          new Date(item.deletion_requested_at).getTime() <=
            deletionCutoff
        ) {
          const { error: permanentDeleteError } = await supabase
            .from("providers")
            .delete()
            .eq("id", item.id);
          if (permanentDeleteError) {
            console.error(
              "PERMANENT PROVIDER DELETE ERROR:",
              permanentDeleteError
            );
            activeRows.push(item);
          }
          continue;
        }
        activeRows.push(item);
      }
      const formattedProviders: Provider[] =
        activeRows.map((item: any) => ({
          id: item.id || "",
          name: item.name || "",
          mobile: item.mobile || "",
          email: item.email || null,
          service: item.service || "",
          city: item.city || "",
          address: item.address || null,
          experience: item.experience || null,
          price: item.price || null,
          description:
            item.description || null,
          availability:
            item.availability ||
            "Available",
          accountStatus:
            item.account_status ||
            "Pending",
          createdAt:
            item.created_at || null,
          deletionRequestedAt:
            item.deletion_requested_at || null,
          previousAccountStatus:
            item.previous_account_status || null,
        }));
      setProviders(
        formattedProviders
      );
      syncLocalProviders(formattedProviders);
    } catch (error) {
      console.error(
        "MASTER APP PROVIDER LOAD ERROR:",
        error
      );
      try {
        const raw = window.localStorage.getItem("masterProviders");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProviders(parsed);
          }
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    const initializeAdminProviders = async () => {
      const authUser = await requireAdminSession();
      if (!active || !authUser) {
        return;
      }
      void loadProviders();
      cleanup = () => {
        // No Supabase Auth subscription is used for admin authentication.
      };
    };
    void initializeAdminProviders();
    return () => {
      active = false;
      cleanup?.();
    };
  }, [router]);
  const updateStatus = async (
    id: string,
    status: string
  ) => {
    const authUser = await requireAdminSession();
    if (!authUser) {
      return;
    }
    try {
      const { error } =
        await supabase
          .from("providers")
          .update({
            account_status: status,
          })
          .eq("id", id);
      if (error) {
        console.warn("Status update Supabase notice:", error);
      }
      setProviders((current) => {
        const updated = current.map((provider) =>
          provider.id === id
            ? {
                ...provider,
                accountStatus: status,
              }
            : provider
        );
        syncLocalProviders(updated);
        return updated;
      });
      setNotice({ type: "success", text: `Provider status updated to ${status}.` });
    } catch (error) {
      console.error(
        "STATUS UPDATE CRASH:",
        error
      );
      setNotice({ type: "error", text: "Failed to update provider status." });
    }
  };
  const deleteProvider = async (
    id: string
  ) => {
    const authUser = await requireAdminSession();
    if (!authUser) {
      return;
    }
    const provider = providers.find(
      (item) => item.id === id
    );
    if (!provider) {
      return;
    }
    const deletionRequestedAt =
      new Date().toISOString();
    try {
      const { error } = await supabase
        .from("providers")
        .update({
          account_status: "Pending Deletion",
          deletion_requested_at: deletionRequestedAt,
          previous_account_status:
            provider.accountStatus,
        })
        .eq("id", id);
      if (error) {
        console.warn(
          "DELETE REQUEST NOTICE:",
          error
        );
      }
      setProviders((current) => {
        const updated = current.map((item) =>
          item.id === id
            ? {
                ...item,
                accountStatus:
                  "Pending Deletion",
                deletionRequestedAt,
                previousAccountStatus:
                  provider.accountStatus,
              }
            : item
        );
        syncLocalProviders(updated);
        return updated;
      });
      setSelectedProvider(null);
      setProviderToDelete(null);
      setNotice({
        type: "info",
        text: `Provider "${provider.name}" scheduled for deletion. A 24-hour undo window is active.`,
      });
    } catch (error) {
      console.error(
        "DELETE PROVIDER CRASH:",
        error
      );
      setNotice({ type: "error", text: "Failed to schedule provider deletion." });
    }
  };
  const cancelDeletion = async (
    provider: Provider
  ) => {
    const authUser = await requireAdminSession();
    if (!authUser) {
      return;
    }
    if (!provider.deletionRequestedAt) {
      return;
    }
    const elapsed =
      Date.now() -
      new Date(
        provider.deletionRequestedAt
      ).getTime();
    if (elapsed >= 24 * 60 * 60 * 1000) {
      setNotice({
        type: "error",
        text: "The 24-hour undo window has expired.",
      });
      await loadProviders();
      return;
    }
    const restoreStatus =
      provider.previousAccountStatus ||
      "Pending";
    try {
      const { error } = await supabase
        .from("providers")
        .update({
          account_status: restoreStatus,
          deletion_requested_at: null,
          previous_account_status: null,
        })
        .eq("id", provider.id);
      if (error) {
        console.warn("Cancel deletion notice:", error);
      }
      setProviders((current) => {
        const updated = current.map((item) =>
          item.id === provider.id
            ? {
                ...item,
                accountStatus:
                  restoreStatus,
                deletionRequestedAt:
                  null,
                previousAccountStatus:
                  null,
              }
            : item
        );
        syncLocalProviders(updated);
        return updated;
      });
      setNotice({
        type: "success",
        text: `Deletion cancelled. Provider restored to "${restoreStatus}".`,
      });
    } catch (error) {
      console.error(
        "CANCEL DELETION ERROR:",
        error
      );
      setNotice({
        type: "error",
        text: "Could not cancel deletion. Please try again.",
      });
    }
  };
  const getDeletionRemaining = (
    provider: Provider
  ) => {
    if (!provider.deletionRequestedAt) {
      return "";
    }
    const remaining =
      24 * 60 * 60 * 1000 -
      (now -
        new Date(
          provider.deletionRequestedAt
        ).getTime());
    if (remaining <= 0) {
      return "Expired";
    }
    const hours = Math.floor(
      remaining / (60 * 60 * 1000)
    );
    const minutes = Math.floor(
      (remaining % (60 * 60 * 1000)) /
        (60 * 1000)
    );
    const seconds = Math.floor(
      (remaining % (60 * 1000)) / 1000
    );
    return `${hours}h ${minutes}m ${seconds}s`;
  };
  const filteredProviders =
    providers.filter((provider) => {
      const searchText =
        `${provider.name} ${provider.mobile} ${provider.email || ""} ${provider.service} ${provider.city}`
          .toLowerCase();
      const matchesSearch =
        searchText.includes(
          search.toLowerCase()
        );
      const matchesStatus =
        statusFilter === "All" ||
        provider.accountStatus ===
          statusFilter;
      return (
        matchesSearch &&
        matchesStatus
      );
    });
  const total =
    providers.length;
  const pending =
    providers.filter(
      (p) =>
        p.accountStatus ===
        "Pending"
    ).length;
  const approved =
    providers.filter(
      (p) =>
        p.accountStatus ===
        "Approved"
    ).length;
  const rejected =
    providers.filter(
      (p) =>
        p.accountStatus ===
        "Rejected"
    ).length;
  const logout = async () => {
    await supabase.auth.signOut();
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
  };
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">
            ⏳
          </div>
          <p className="text-gray-600">
            Loading providers...
          </p>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              👷 Provider Management
            </h1>
            <p className="text-sm text-gray-500">
              Master App providers
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                router.push(
                  "/admin/dashboard"
                )
              }
              className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50"
            >
              Dashboard
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8">
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
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-gray-500 text-sm">
              Total
            </p>
            <p className="text-3xl font-bold mt-2">
              {total}
            </p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-gray-500 text-sm">
              Pending
            </p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {pending}
            </p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-gray-500 text-sm">
              Approved
            </p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {approved}
            </p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-gray-500 text-sm">
              Rejected
            </p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {rejected}
            </p>
          </div>
        </div>
        {/* SEARCH */}
        <div className="bg-white border rounded-2xl p-5 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Search
              </label>
              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Name, mobile, service, city..."
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="All">
                  All
                </option>
                <option value="Pending">
                  Pending
                </option>
                <option value="Approved">
                  Approved
                </option>
                <option value="Rejected">
                  Rejected
                </option>
                <option value="Blocked">
                  Blocked
                </option>
                <option value="Pending Deletion">
                  Pending Deletion
                </option>
              </select>
            </div>
          </div>
        </div>
        {/* PROVIDER LIST */}
        <div className="space-y-4">
          {filteredProviders.length ===
          0 ? (
            <div className="bg-white border rounded-2xl p-10 text-center">
              <div className="text-5xl mb-3">
                👷
              </div>
              <h2 className="text-xl font-bold">
                No providers found
              </h2>
              <p className="text-gray-500 mt-2">
                No providers match the current search or status filter.
              </p>
            </div>
          ) : (
            filteredProviders.map(
              (provider) => (
                <div
                  key={provider.id}
                  className="bg-white border rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:justify-between gap-5">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <h2 className="text-xl font-bold">
                          {provider.name ||
                            "Unnamed Provider"}
                        </h2>
                        <span className="px-3 py-1 rounded-full text-xs bg-gray-100">
                          {
                            provider.accountStatus
                          }
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            provider.availability === "Available"
                              ? "bg-green-100 text-green-700"
                              : provider.availability === "Busy"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {provider.availability === "Available"
                            ? "🟢 Online"
                            : provider.availability === "Busy"
                            ? "🟠 Busy"
                            : "⚫ Offline"}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">
                            Mobile
                          </p>
                          <p className="font-medium">
                            {
                              provider.mobile
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Service
                          </p>
                          <p className="font-medium">
                            {
                              provider.service
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            City
                          </p>
                          <p className="font-medium">
                            {
                              provider.city
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Email
                          </p>
                          <p className="font-medium break-all">
                            {
                              provider.email ||
                              "—"
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Experience
                          </p>
                          <p className="font-medium">
                            {
                              provider.experience ||
                              "—"
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Price
                          </p>
                          <p className="font-medium">
                            {
                              provider.price ||
                              "—"
                            }
                          </p>
                        </div>
                      </div>
                      {provider.address && (
                        <div className="mt-4">
                          <p className="text-xs text-gray-500">
                            Address
                          </p>
                          <p className="text-sm">
                            {
                              provider.address
                            }
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap lg:flex-col gap-2">
                      <button
                        onClick={() =>
                          setSelectedProvider(
                            provider
                          )
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        View
                      </button>
                      {provider.mobile && (
                        <a
                          href={`tel:${provider.mobile}`}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center"
                        >
                          📞 Call Provider
                        </a>
                      )}
                      {provider.email && (
                        <a
                          href={`mailto:${provider.email}`}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-center"
                        >
                          ✉️ Mail Provider
                        </a>
                      )}
                      {provider.accountStatus !== "Approved" &&
                        provider.accountStatus !== "Rejected" &&
                        provider.accountStatus !== "Blocked" && (
                        <>
                          <button
                            onClick={() =>
                              updateStatus(
                                provider.id,
                                "Approved"
                              )
                            }
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              updateStatus(
                                provider.id,
                                "Rejected"
                              )
                            }
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {provider.accountStatus === "Approved" && (
                        <button
                          onClick={() =>
                            updateStatus(
                              provider.id,
                              "Blocked"
                            )
                          }
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          🚫 Block
                        </button>
                      )}
                      {provider.accountStatus === "Pending Deletion" && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                          <p className="font-semibold text-red-700">
                            🗑️ Deletion scheduled
                          </p>
                          <p className="text-red-600 mt-1">
                            Undo available for: {getDeletionRemaining(provider)}
                          </p>
                          <button
                            onClick={() => cancelDeletion(provider)}
                            className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            ↩️ Cancel Deletion / Undo
                          </button>
                        </div>
                      )}
                      {provider.accountStatus !== "Pending Deletion" && (
                        <button
                          onClick={() =>
                            setProviderToDelete(
                              provider.id
                            )
                          }
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>
      {/* DELETE CONFIRMATION MODAL */}
      {providerToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setProviderToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">Schedule Provider Deletion</h3>
            <p className="text-sm text-slate-600 mb-6">
              This provider will be moved to &quot;Pending Deletion&quot;. A 24-hour undo window will remain active before permanent removal.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setProviderToDelete(null)}
                className="px-4 py-2 border rounded-xl text-slate-700 hover:bg-slate-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProvider(providerToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium text-sm shadow-sm"
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DETAILS MODAL */}
      {selectedProvider && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() =>
            setSelectedProvider(
              null
            )
          }
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">
                  Provider Details
                </h2>
                <p className="text-sm text-gray-500">
                  {
                    selectedProvider.id
                  }
                </p>
              </div>
              <button
                onClick={() =>
                  setSelectedProvider(
                    null
                  )
                }
                className="w-9 h-9 rounded-full bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-5">
              <h3 className="text-2xl font-bold">
                {
                  selectedProvider.name
                }
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4">
                  <p className="text-xs text-gray-500">
                    Availability
                  </p>
                  <p className="font-semibold mt-1">
                    {selectedProvider.availability === "Available"
                      ? "🟢 Online"
                      : selectedProvider.availability === "Busy"
                      ? "🟠 Busy"
                      : "⚫ Offline"}
                  </p>
                </div>
                <div className="border rounded-xl p-4">
                  <p className="text-xs text-gray-500">
                    Mobile
                  </p>
                  <p className="font-semibold">
                    {
                      selectedProvider.mobile
                    }
                  </p>
                </div>
                <div className="border rounded-xl p-4">
                  <p className="text-xs text-gray-500">
                    Email
                  </p>
                  <p className="font-semibold break-all">
                    {
                      selectedProvider.email ||
                      "—"
                    }
                  </p>
                </div>
                <div className="border rounded-xl p-4">
                  <p className="text-xs text-gray-500">
                    Service
                  </p>
                  <p className="font-semibold">
                    {
                      selectedProvider.service
                    }
                  </p>
                </div>
                <div className="border rounded-xl p-4">
                  <p className="text-xs text-gray-500">
                    City
                  </p>
                  <p className="font-semibold">
                    {
                      selectedProvider.city
                    }
                  </p>
                </div>
                <div className="border rounded-xl p-4">
                  <p className="text-xs text-gray-500">
                    Experience
                  </p>
                  <p className="font-semibold">
                    {
                      selectedProvider.experience ||
                      "—"
                    }
                  </p>
                </div>
                <div className="border rounded-xl p-4">
                  <p className="text-xs text-gray-500">
                    Price
                  </p>
                  <p className="font-semibold">
                    {
                      selectedProvider.price ||
                      "—"
                    }
                  </p>
                </div>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-xs text-gray-500">
                  Address
                </p>
                <p>
                  {
                    selectedProvider.address ||
                    "—"
                  }
                </p>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-xs text-gray-500">
                  Description
                </p>
                <p>
                  {
                    selectedProvider.description ||
                    "—"
                  }
                </p>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end">
              <button
                onClick={() =>
                  setSelectedProvider(
                    null
                  )
                }
                className="px-5 py-2 bg-gray-900 text-white rounded-lg"
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
