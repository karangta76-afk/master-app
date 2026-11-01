"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
type Category = {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};
type ProviderRequest = {
  id: string;
  name: string;
  mobile: string;
  service: string;
  custom_service_name: string | null;
  custom_service_description: string | null;
  category_request_status: string;
  account_status: string;
  city: string;
  created_at: string;
};
export default function AdminServicesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [requests, setRequests] = useState<ProviderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🛠️");
  const [newDescription, setNewDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("🛠️");
  const [editDescription, setEditDescription] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<ProviderRequest | null>(null);
  const [requestCategoryName, setRequestCategoryName] =
    useState("");
  const [requestCategoryIcon, setRequestCategoryIcon] =
    useState("🛠️");
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const defaultCategories: Category[] = [
    { id: "electrician", name: "Electrician", icon: "⚡", description: "Electrical repairs, wiring, and installations", is_active: true, created_at: "2026-01-01T00:00:00.000Z" },
    { id: "plumber", name: "Plumber", icon: "🔧", description: "Piping, leakages, and fixture fitting", is_active: true, created_at: "2026-01-01T00:00:00.000Z" },
    { id: "carpenter", name: "Carpenter", icon: "🪚", description: "Woodwork, furniture repair and assembly", is_active: true, created_at: "2026-01-01T00:00:00.000Z" },
    { id: "painter", name: "Painter", icon: "🎨", description: "Interior and exterior house painting", is_active: true, created_at: "2026-01-01T00:00:00.000Z" },
    { id: "ac-repair", name: "AC Repair", icon: "❄️", description: "AC service, cooling check and gas refill", is_active: true, created_at: "2026-01-01T00:00:00.000Z" },
    { id: "cleaning", name: "Cleaning", icon: "🧹", description: "Deep home cleaning and sanitation", is_active: true, created_at: "2026-01-01T00:00:00.000Z" },
    { id: "salon-women", name: "Salon for Women", icon: "💄", description: "Beauty treatments, waxing and styling", is_active: true, created_at: "2026-01-01T00:00:00.000Z" },
    { id: "barber-men", name: "Men's Barber", icon: "✂️", description: "Haircut, beard grooming and massages", is_active: true, created_at: "2026-01-01T00:00:00.000Z" },
  ];

  const getIconSuggestions = (serviceName: string) => {
    const name = serviceName.toLowerCase().trim();
    if (!name) return ["🛠️", "🔧", "⚙️", "🏠", "💼"];
    const groups = [
      [/(electric|electrical)/, ["⚡", "🔌", "💡", "🔧", "🛠️"]],
      [/(plumb|pipe|water)/, ["🔧", "🚰", "💧", "🪠", "🛠️"]],
      [/(ac|air condition|cool)/, ["❄️", "🌬️", "🧊", "🔧", "🛠️"]],
      [/(carpent|wood|furniture)/, ["🪚", "🪵", "🛠️", "🔨", "🪑"]],
      [/(paint|color)/, ["🎨", "🖌️", "🪣", "🏠", "✨"]],
      [/(clean|housekeep)/, ["🧹", "🧽", "🧼", "✨", "🏠"]],
      [/(beauty|salon|makeup)/, ["💄", "💇‍♀️", "💅", "🪞", "✨"]],
      [/(barber|hair)/, ["💈", "✂️", "💇", "🪒", "🧴"]],
      [/(repair|maintenance|service)/, ["🔧", "🛠️", "⚙️", "🔩", "🧰"]],
      [/(mobile|phone)/, ["📱", "🔧", "🔋", "💻", "🛠️"]],
      [/(computer|laptop|software)/, ["💻", "🖥️", "⌨️", "🖱️", "⚙️"]],
      [/(car|auto|vehicle|mechanic)/, ["🚗", "🔧", "🛞", "🔩", "🧰"]],
      [/(driver|transport)/, ["🚗", "🚕", "🚌", "🚚", "🛺"]],
      [/(cook|food|chef)/, ["👨‍🍳", "🍳", "🍽️", "🥘", "🧑‍🍳"]],
      [/(doctor|medical|health)/, ["🩺", "⚕️", "🏥", "💊", "👨‍⚕️"]],
      [/(tutor|teacher|education)/, ["📚", "👨‍🏫", "✏️", "🎓", "📝"]],
      [/(pest|insect)/, ["🐜", "🪳", "🦟", "🕷️", "🧴"]],
      [/(security|guard)/, ["🛡️", "🔐", "👮", "🚨", "🔒"]],
      [/(phot|video)/, ["📷", "📸", "🎥", "🎬", "📹"]],
      [/(event|decoration)/, ["🎉", "🎈", "✨", "🎊", "💐"]],
    ] as Array<[RegExp, string[]]>;
    const match = groups.find(([pattern]) => pattern.test(name));
    return match ? match[1] : ["🛠️", "🔧", "⚙️", "🏠", "💼"];
  };

  const requireAdminSession = async () => {
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
    } catch {
      window.localStorage.removeItem("masterAdminLoggedIn");
      window.localStorage.removeItem("masterAdmin");
      router.replace("/admin/login");
      return null;
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
      const [categoryResponse, providerResponse] =
        await Promise.all([
          supabase
            .from("service_categories")
            .select("id,name,icon,description,is_active,created_at")
            .order("created_at", {
              ascending: true,
            }),
          supabase
            .from("providers")
            .select(
              "id,name,mobile,service,custom_service_name,custom_service_description,category_request_status,account_status,city,created_at"
            )
            .eq("service", "Other")
            .order("created_at", {
              ascending: false,
            }),
        ]);

      let catData = categoryResponse.data || [];
      if (categoryResponse.error || catData.length === 0) {
        if (categoryResponse.error) {
          console.warn("Supabase categories notice:", categoryResponse.error);
        }
        try {
          const raw = window.localStorage.getItem("masterServices");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              catData = parsed;
            } else {
              catData = defaultCategories;
            }
          } else {
            catData = defaultCategories;
          }
        } catch {
          catData = defaultCategories;
        }
      }

      setCategories(catData as Category[]);
      setRequests((providerResponse.data || []) as ProviderRequest[]);
    } catch (error) {
      console.error(
        "ADMIN SERVICES LOAD ERROR:",
        error
      );
      setCategories(defaultCategories);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
  let active = true;
  const initialize = async () => {
    const authUser = await requireAdminSession();
    if (!active || !authUser) return;
    void loadData();
  };
  void initialize();
  const channel = supabase
      .channel("admin-service-management")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_categories",
        },
        () => {
          void loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "providers",
        },
        () => {
          void loadData();
        }
      )
      .subscribe();
    return () => {
    active = false;
    supabase.removeChannel(channel);
  };
  }, [router]);
  const syncLocalServices = (list: Category[]) => {
    try {
      window.localStorage.setItem("masterServices", JSON.stringify(list));
      window.dispatchEvent(new Event("master-services-updated"));
    } catch (err) {
      console.error("Local services sync error:", err);
    }
  };

  const createCategory = async () => {
    const authUser = await requireAdminSession();
    if (!authUser) return;
    const name = newName.trim();
    if (!name) {
      setNotice({ type: "error", text: "Please enter a category name." });
      return;
    }
    const duplicate = categories.some(
      (category) =>
        category.name.toLowerCase() ===
        name.toLowerCase()
    );
    if (duplicate) {
      setNotice({ type: "error", text: "This service category already exists." });
      return;
    }
    const id =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      `service-${Date.now()}`;
    const newCategory: Category = {
      id,
      name,
      icon: newIcon.trim() || "🛠️",
      description: newDescription.trim() || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabase
        .from("service_categories")
        .insert({
          id,
          name,
          icon: newCategory.icon,
          description: newCategory.description,
          is_active: true,
        });
      if (error) {
        console.warn("Category insert Supabase notice:", error);
      }
    } catch (err) {
      console.warn("Category insert Supabase exception:", err);
    }
    const updated = [...categories, newCategory];
    setCategories(updated);
    syncLocalServices(updated);
    setNewName("");
    setNewIcon("🛠️");
    setNewDescription("");
    setNotice({
      type: "success",
      text: `Service category "${name}" created successfully.`,
    });
  };

  const updateCategory = async () => {
    const authUser = await requireAdminSession();
    if (!authUser || !editingCategory) return;
    const name = editName.trim();
    const icon = editIcon.trim() || "🛠️";
    const description = editDescription.trim() || null;
    if (!name) {
      setNotice({ type: "error", text: "Please enter a category name." });
      return;
    }
    const duplicate = categories.some(
      (category) =>
        category.id !== editingCategory.id &&
        category.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      setNotice({ type: "error", text: "A category with this name already exists." });
      return;
    }
    try {
      const { error } = await supabase
        .from("service_categories")
        .update({ name, icon, description })
        .eq("id", editingCategory.id);
      if (error) {
        console.warn("Category update Supabase notice:", error);
      }
    } catch (err) {
      console.warn("Category update Supabase exception:", err);
    }
    const updated = categories.map((cat) =>
      cat.id === editingCategory.id
        ? { ...cat, name, icon, description }
        : cat
    );
    setCategories(updated);
    syncLocalServices(updated);
    setNotice({
      type: "success",
      text: `Service category "${name}" updated successfully.`,
    });
    setEditingCategory(null);
    setEditName("");
    setEditIcon("🛠️");
    setEditDescription("");
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditIcon(category.icon || "🛠️");
    setEditDescription(category.description || "");
  };

  const toggleCategory = async (
    category: Category
  ) => {
    const authUser = await requireAdminSession();
    if (!authUser) return;
    const nextStatus = !category.is_active;
    try {
      const { error } = await supabase
        .from("service_categories")
        .update({
          is_active: nextStatus,
        })
        .eq("id", category.id);
      if (error) {
        console.warn("Category status Supabase notice:", error);
      }
    } catch (err) {
      console.warn("Category status Supabase exception:", err);
    }
    const updated = categories.map((cat) =>
      cat.id === category.id ? { ...cat, is_active: nextStatus } : cat
    );
    setCategories(updated);
    syncLocalServices(updated);
    setNotice({
      type: "info",
      text: `Category "${category.name}" is now ${nextStatus ? "active" : "inactive"}.`,
    });
  };

  const createCategoryFromRequest = async () => {
    const authUser = await requireAdminSession();
    if (!authUser || !selectedRequest) return;
    const categoryName = requestCategoryName.trim();
    if (!categoryName) {
      setNotice({ type: "error", text: "Please enter a valid category name." });
      return;
    }
    const duplicate = categories.some(
      (category) =>
        category.name.toLowerCase() ===
        categoryName.toLowerCase()
    );
    if (duplicate) {
      setNotice({ type: "error", text: "This service category already exists." });
      return;
    }
    const categoryId =
      categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      `service-${Date.now()}`;
    const newCat: Category = {
      id: categoryId,
      name: categoryName,
      icon: requestCategoryIcon.trim() || "🛠️",
      description: selectedRequest.custom_service_description || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    try {
      await supabase
        .from("service_categories")
        .insert({
          id: categoryId,
          name: categoryName,
          icon: newCat.icon,
          description: newCat.description,
          is_active: true,
        });
      await supabase
        .from("providers")
        .update({
          service: categoryName,
          service_category_id: categoryId,
          category_request_status: "Approved",
          custom_service_name: null,
        })
        .eq("id", selectedRequest.id);
    } catch (err) {
      console.warn("Request category approval exception:", err);
    }
    const updated = [...categories, newCat];
    setCategories(updated);
    syncLocalServices(updated);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === selectedRequest.id
          ? { ...r, service: categoryName, category_request_status: "Approved" }
          : r
      )
    );
    setSelectedRequest(null);
    setRequestCategoryName("");
    setRequestCategoryIcon("🛠️");
    setNotice({
      type: "success",
      text: `Category "${categoryName}" approved and assigned to provider.`,
    });
  };

  const rejectRequest = async (
    providerId: string
  ) => {
    const authUser = await requireAdminSession();
    if (!authUser) return;
    try {
      await supabase
        .from("providers")
        .update({
          category_request_status: "Rejected",
        })
        .eq("id", providerId);
    } catch (err) {
      console.warn("Request reject notice:", err);
    }
    setRequests((prev) =>
      prev.map((r) =>
        r.id === providerId
          ? { ...r, category_request_status: "Rejected" }
          : r
      )
    );
    setSelectedRequest(null);
    setNotice({ type: "info", text: "Custom service request rejected." });
  };
  const logout = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("masterAdminLoggedIn");
    window.localStorage.removeItem("masterAdmin");
    window.localStorage.removeItem("masterAdminCredentials");
    window.localStorage.removeItem("masterActiveRole");
    window.dispatchEvent(new Event("master-auth-updated"));
  }
  router.replace("/admin/login");
};
  const pendingRequests = requests.filter(
    (request) =>
      request.category_request_status ===
      "Pending"
  );
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">
            ⏳
          </div>
          <p className="text-gray-600">
            Loading service management...
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
              🛠️ Service Categories
            </h1>
            <p className="text-sm text-gray-500">
              Manage Master App service categories
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-500">
              Total Categories
            </p>
            <p className="text-3xl font-bold mt-2">
              {categories.length}
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-500">
              Active Categories
            </p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {
                categories.filter(
                  (category) =>
                    category.is_active
                ).length
              }
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-sm text-gray-500">
              Other Service Requests
            </p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {pendingRequests.length}
            </p>
          </div>
        </div>
        {/* CREATE CATEGORY */}
        <section className="bg-white border rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold">
            ➕ Add New Service Category
          </h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Admin manually bhi koi new service category create kar sakta hai.
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Category Name
              </label>
              <input
                value={newName}
                onChange={(e) =>
                  setNewName(e.target.value)
                }
                placeholder="e.g. CCTV Installation"
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Icon
              </label>
              <input
                value={newIcon}
                onChange={(e) =>
                  setNewIcon(e.target.value)
                }
                placeholder="🛠️"
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {getIconSuggestions(newName).map((icon) => (
                  <button key={icon} type="button" onClick={() => setNewIcon(icon)} className={`w-10 h-10 rounded-lg border text-xl hover:bg-blue-50 ${newIcon === icon ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>{icon}</button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Service name ke according suggested icons</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <input
                value={newDescription}
                onChange={(e) =>
                  setNewDescription(
                    e.target.value
                  )
                }
                placeholder="Short description"
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={createCategory}
            className="mt-5 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            Create Category
          </button>
        </section>
        {/* OTHER SERVICE REQUESTS */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">
                📥 Other Service Requests
              </h2>
              <p className="text-sm text-gray-500">
                Providers ki new service category requests
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
              {pendingRequests.length} Pending
            </span>
          </div>
          {pendingRequests.length === 0 ? (
            <div className="bg-white border rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">
                ✅
              </div>
              <h3 className="font-bold text-lg">
                No pending requests
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Abhi koi new service request pending nahi hai.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(
                (request) => (
                  <div
                    key={request.id}
                    className="bg-white border rounded-2xl p-5 shadow-sm"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                      <div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <h3 className="text-xl font-bold">
                            {request.name}
                          </h3>
                          <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                            New Service
                          </span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500">
                              Requested Service
                            </p>
                            <p className="font-semibold">
                              {request.custom_service_name ||
                                "Not specified"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              Mobile
                            </p>
                            <p className="font-semibold">
                              {request.mobile}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              City
                            </p>
                            <p className="font-semibold">
                              {request.city}
                            </p>
                          </div>
                        </div>
                        {request.custom_service_description && (
                          <div className="mt-4 border rounded-xl p-4 bg-gray-50">
                            <p className="text-xs text-gray-500 mb-1">
                              Description
                            </p>
                            <p className="text-sm">
                              {
                                request.custom_service_description
                              }
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(
                              request
                            );
                            setRequestCategoryName(
                              request.custom_service_name ||
                                ""
                            );
                            setRequestCategoryIcon(
                              "🛠️"
                            );
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Create Category
                        </button>
                        <button
                          onClick={() =>
                            rejectRequest(
                              request.id
                            )
                          }
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
        {/* ALL CATEGORIES */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold">
              📋 All Service Categories
            </h2>
            <p className="text-sm text-gray-500">
              Website par available service categories
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(
              (category) => (
                <div
                  key={category.id}
                  className="bg-white border rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">
                        {category.icon ||
                          "🛠️"}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">
                          {category.name}
                        </h3>
                        <span
                          className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${
                            category.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {category.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditCategory(category)}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleCategory(category)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          category.is_active
                            ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                            : "bg-green-50 text-green-600 hover:bg-green-100"
                        }`}
                      >
                        {category.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-500 mt-4">
                      {category.description}
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        </section>
      </div>
      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setEditingCategory(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold">Edit Service Category</h2>
                <p className="text-sm text-gray-500">Name, icon aur description update karein</p>
              </div>
              <button onClick={() => setEditingCategory(null)} className="w-9 h-9 rounded-full bg-gray-100">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Category name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Icon</label>
                <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-2xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="🛠️" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {getIconSuggestions(editName).map((icon) => (
                    <button key={icon} type="button" onClick={() => setEditIcon(icon)} className={`w-10 h-10 rounded-lg border text-xl hover:bg-blue-50 ${editIcon === icon ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>{icon}</button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Service name ke according suggested icons</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Category description" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingCategory(null)} className="flex-1 px-4 py-3 rounded-xl border font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={updateCategory} className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CREATE CATEGORY FROM REQUEST MODAL */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() =>
            setSelectedRequest(null)
          }
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg p-6"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold">
                  Create New Category
                </h2>
                <p className="text-sm text-gray-500">
                  Provider request se category create karein
                </p>
              </div>
              <button
                onClick={() =>
                  setSelectedRequest(null)
                }
                className="w-9 h-9 rounded-full bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="bg-gray-50 border rounded-xl p-4 mb-5">
              <p className="text-xs text-gray-500">
                Provider
              </p>
              <p className="font-bold">
                {selectedRequest.name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Requested:{" "}
                {selectedRequest.custom_service_name ||
                  "Other Service"}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  New Category Name
                </label>
                <input
                  value={requestCategoryName}
                  onChange={(e) =>
                    setRequestCategoryName(
                      e.target.value
                    )
                  }
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category Icon
                </label>
                <input
                  value={requestCategoryIcon}
                  onChange={(e) =>
                    setRequestCategoryIcon(
                      e.target.value
                    )
                  }
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() =>
                  setSelectedRequest(null)
                }
                className="flex-1 px-4 py-3 border rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={
                  createCategoryFromRequest
                }
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
              >
                Create & Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
