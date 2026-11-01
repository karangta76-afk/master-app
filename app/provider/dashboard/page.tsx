"use client";
import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "../../../lib/supabase";
import {
  StarIcon,
  BriefcaseIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  CheckCircleIcon,
  CameraIcon,
  TradeServiceIcon,
  OnlineStatusDot,
  VerifiedBadge,
} from "../../components/Icons";
type Provider = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  service: string;
  city: string;
  state?: string;
  address: string;
  area?: string;
  experience: string;
  price: string;
  availability:
    | "Available"
    | "Not Available"
    | "Temporarily Unavailable";
  accountStatus: "Pending" | "Approved" | "Blocked";
  createdAt?: string;
  avatar_url?: string;
  profile_image?: string;
  service_radius?: number;
};
type Booking = {
  id: string;
  customer_id: string;
  provider_id: string;
  service: string;
  date: string;
  time: string;
  address: string;
  status:
    | "Pending"
    | "Accepted"
    | "Rejected"
    | "Completed"
    | "Cancelled";
  created_at?: string;
};
type Customer = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
};
type ProviderSkill = {
  id: string;
  provider_id: string;
  skill_name: string;
  experience: string;
  charges: string;
  charge_unit: string;
  description: string;
  city: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};
type Review = {
  id: string;
  provider_id: string;
  customer_id?: string;
  rating: number;
  comment?: string;
  created_at?: string;
};
type ServiceCategory = {
  id: string;
  name: string;
  icon?: string;
};
function mapProviderRow(row: Record<string, unknown>): Provider {
  const availability =
    row.availability === "Available" ||
    row.availability === "Not Available" ||
    row.availability === "Temporarily Unavailable"
      ? row.availability
      : "Not Available";
  const accountStatus =
    row.account_status === "Pending" ||
    row.account_status === "Approved" ||
    row.account_status === "Blocked"
      ? row.account_status
      : "Pending";
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    mobile: String(row.mobile ?? ""),
    email: String(row.email ?? ""),
    service: String(row.service ?? ""),
    city: String(row.city ?? ""),
    state: row.state == null ? "" : String(row.state),
    address: String(row.address ?? ""),
    area: row.area == null ? "" : String(row.area),
    experience: String(row.experience ?? ""),
    price: String(row.price ?? ""),
    availability,
    accountStatus,
    createdAt: row.created_at == null ? undefined : String(row.created_at),
    avatar_url: row.avatar_url == null ? "" : String(row.avatar_url),
    profile_image: row.profile_image == null ? "" : String(row.profile_image),
    service_radius:
      typeof row.service_radius === "number"
        ? row.service_radius
        : Number(row.service_radius ?? 10) || 10,
  };
}
const fallbackServices: ServiceCategory[] = [
  { id: "electrician", name: "Electrician", icon: "⚡" },
  { id: "plumber", name: "Plumber", icon: "🔧" },
  { id: "carpenter", name: "Carpenter", icon: "🪚" },
  { id: "painter", name: "Painter", icon: "🎨" },
  { id: "ac-repair", name: "AC Repair", icon: "❄️" },
  { id: "appliance-repair", name: "Appliance Repair", icon: "🔌" },
  { id: "cleaning", name: "Cleaning", icon: "🧹" },
  { id: "other", name: "Other", icon: "🛠️" },
];
const fallbackCities = [
  "Dhanbad",
  "Ranchi",
  "Bokaro",
  "Jamshedpur",
  "Deoghar",
  "Giridih",
  "Hazaribagh",
  "Ramgarh",
  "Delhi",
  "Kolkata",
  "Mumbai",
  "Bengaluru",
  "Other",
];
function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
function formatDate(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function statusClass(status: Booking["status"]) {
  if (status === "Pending") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (status === "Accepted") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (status === "Completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (status === "Rejected") {
    return "bg-red-50 text-red-700 border-red-200";
  }
  return "bg-gray-50 text-gray-700 border-gray-200";
}
export default function ProviderDashboardPage() {
  const [provider, setProvider] =
    useState<Provider | null>(null);
  const [bookings, setBookings] =
    useState<Booking[]>([]);
  const [customers, setCustomers] =
    useState<Customer[]>([]);
  const [skills, setSkills] =
    useState<ProviderSkill[]>([]);
  const [reviews, setReviews] =
    useState<Review[]>([]);
  const [serviceCategories, setServiceCategories] =
    useState<ServiceCategory[]>(fallbackServices);
  const [cities, setCities] =
    useState<string[]>(fallbackCities);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [actionLoading, setActionLoading] =
    useState("");
  const [skillSaving, setSkillSaving] =
    useState(false);
  const [showSkillForm, setShowSkillForm] =
    useState(false);
  const [editingSkillId, setEditingSkillId] =
    useState("");
  const [skillForm, setSkillForm] = useState({
    skill_name: "",
    city: "",
    experience: "",
    charges: "",
    charge_unit: "Per Visit",
    description: "",
  });
  async function loadDashboard() {
    try {
      setError("");
      let currentProvider: Provider | null =
        null;
      try {
        const saved =
          window.localStorage.getItem(
            "masterProvider"
          );
        if (saved) {
          currentProvider =
            JSON.parse(saved) as Provider;
        }
      } catch {
        currentProvider = null;
      }
      if (!currentProvider) {
        window.location.href =
          "/provider/login";
        return;
      }
      if (
        currentProvider.accountStatus ===
        "Blocked"
      ) {
        setProvider(currentProvider);
        setLoading(false);
        return;
      }
      const {
        data: freshProvider,
        error: providerError,
      } = await supabase
        .from("providers")
        .select(
          "id,name,mobile,email,service,city,state,address,area,experience,price,availability,account_status,created_at,profile_image,service_radius"
        )
        .eq("id", currentProvider.id)
        .maybeSingle();
      if (!providerError && freshProvider) {
        currentProvider =
          mapProviderRow(freshProvider);
      }
      setProvider(currentProvider);
      window.localStorage.setItem(
        "masterProvider",
        JSON.stringify(currentProvider)
      );
      window.localStorage.setItem(
        "masterProviderLoggedIn",
        "true"
      );
      window.localStorage.setItem(
        "masterProviderId",
        currentProvider.id
      );
      window.localStorage.setItem(
        "masterProviderMobile",
        currentProvider.mobile
      );
      const {
        data: skillData,
      } = await supabase
        .from("provider_skills")
        .select("*")
        .eq(
          "provider_id",
          currentProvider.id
        )
        .order("created_at", {
          ascending: true,
        });
      setSkills(
        (skillData ||
          []) as ProviderSkill[]
      );
      const {
        data: bookingData,
        error: bookingError,
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
      if (bookingError) {
        console.error(
          "Booking loading error:",
          bookingError
        );
      }
      let loadedBookings = (bookingData || []) as Booking[];
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
                  customer_id: String(b.customerId || b.customer_id || ""),
                  provider_id: String(b.providerId || b.provider_id || ""),
                  service: String(b.service || ""),
                  date: String(b.date || b.booking_date || ""),
                  time: String(b.time || b.booking_time || ""),
                  address: String(b.address || ""),
                  status: (b.status || "Pending") as any,
                  created_at:
                    b.createdAt || b.created_at || new Date().toISOString(),
                }));
            }
          }
        } catch (_) {}
      }
      setBookings(loadedBookings);
      const customerIds =
        Array.from(
          new Set(
            loadedBookings
              .map(
                (booking) =>
                  booking.customer_id
              )
              .filter(Boolean)
          )
        );
      if (customerIds.length > 0) {
        const {
          data: customerData,
        } = await supabase
          .from("customers")
          .select(
            "id,name,mobile,email"
          )
          .in(
            "id",
            customerIds
          );
        setCustomers(
          (customerData ||
            []) as Customer[]
        );
      } else {
        setCustomers([]);
      }
      const {
        data: reviewData,
      } = await supabase
        .from("reviews")
        .select("*")
        .eq(
          "provider_id",
          currentProvider.id
        )
        .order("created_at", {
          ascending: false,
        });
      setReviews(
        (reviewData ||
          []) as Review[]
      );
    } catch (dashboardError) {
      console.error(
        "Provider dashboard error:",
        dashboardError
      );
      setError(
        "Unable to load Provider Dashboard."
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    // Always open the Provider Dashboard from the very top.
    // This prevents the browser from restoring a small previous
    // scroll position after Provider Login redirects here.
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
    const resetScroll = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    };
    resetScroll();
    const frame = window.requestAnimationFrame(() => {
      resetScroll();
    });
    let mounted = true;
    async function loadOptions() {
      const {
        data: categoryData,
      } = await supabase
        .from("service_categories")
        .select(
          "id,name,icon"
        )
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        });
      if (
        mounted &&
        categoryData &&
        categoryData.length > 0
      ) {
        setServiceCategories(
          categoryData as ServiceCategory[]
        );
      }
      if (mounted) {
        const providerCity = window.localStorage.getItem(
          "masterProviderCity"
        );
        setCities(
          Array.from(
            new Set([
              ...fallbackCities,
              ...(providerCity ? [providerCity.trim()] : []),
            ])
          )
            .filter(Boolean)
            .sort()
        );
      }
    }
    void loadOptions();
    void loadDashboard();
    const providerChannel =
      supabase
        .channel(
          "provider-dashboard-provider-new"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "providers",
          },
          () => {
            void loadDashboard();
          }
        )
        .subscribe();
    const bookingChannel =
      supabase
        .channel(
          "provider-dashboard-bookings-new"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
          },
          () => {
            void loadDashboard();
          }
        )
        .subscribe();
    const reviewChannel =
      supabase
        .channel(
          "provider-dashboard-reviews-new"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reviews",
          },
          () => {
            void loadDashboard();
          }
        )
        .subscribe();
    const skillChannel =
      supabase
        .channel(
          "provider-dashboard-skills-new"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "provider_skills",
          },
          () => {
            void loadDashboard();
          }
        )
        .subscribe();
    return () => {
      window.cancelAnimationFrame(frame);
      mounted = false;
      void supabase.removeChannel(
        providerChannel
      );
      void supabase.removeChannel(
        bookingChannel
      );
      void supabase.removeChannel(
        reviewChannel
      );
      void supabase.removeChannel(
        skillChannel
      );
    };
  }, []);
  const totalBookings =
    bookings.length;
  const pendingBookings =
    bookings.filter(
      (item) =>
        item.status === "Pending"
    ).length;
  const completedBookings =
    bookings.filter(
      (item) =>
        item.status === "Completed"
    ).length;
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (sum, review) =>
              sum +
              Number(
                review.rating || 0
              ),
            0
          ) / reviews.length
        ).toFixed(1)
      : "0.0";
  const completedForEarnings =
    completedBookings;
  const priceNumber =
    provider?.price
      ? Number(
          String(
            provider.price
          ).replace(
            /[^0-9.]/g,
            ""
          )
        ) || 0
      : 0;
  const estimatedEarnings =
    completedForEarnings *
    priceNumber;
  const activeSkills =
    skills.filter(
      (skill) =>
        skill.is_active
    );
  const recentBookings =
    bookings.slice(0, 5);
  const recentReviews =
    reviews.slice(0, 2);
  function getCustomer(
    customerId: string
  ) {
    return customers.find(
      (customer) =>
        customer.id ===
        customerId
    );
  }
  const [photoUploading, setPhotoUploading] = useState(false);
  async function handleProfilePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file || !provider) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Photo size should be less than 8 MB.");
      event.target.value = "";
      return;
    }
    setPhotoUploading(true);
    setError("");
    try {
      const compressedImage = await new Promise<string>((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
          try {
            const maxSize = 600;
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Could not process the image.");
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const result = canvas.toDataURL("image/jpeg", 0.72);
            URL.revokeObjectURL(objectUrl);
            resolve(result);
          } catch (error) {
            URL.revokeObjectURL(objectUrl);
            reject(error);
          }
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not read the selected photo."));
        };
        image.src = objectUrl;
      });
      // Save only the provider profile image.
      // The RLS policy created above allows this update.
      const { data: savedProvider, error: updateError } = await supabase
        .from("providers")
        .update({ profile_image: compressedImage })
        .eq("id", provider.id)
        .select(
          "id,name,mobile,email,service,city,state,address,area,experience,price,availability,account_status,created_at,profile_image,service_radius"
        )
        .maybeSingle();
      if (updateError) {
        console.error(
          "SUPABASE PROFILE PHOTO ERROR:",
          JSON.stringify(
            {
              message: updateError.message,
              code: updateError.code,
              details: updateError.details,
              hint: updateError.hint,
            },
            null,
            2
          )
        );
        throw new Error(
          updateError.message || "Supabase could not save the profile photo."
        );
      }
      if (!savedProvider) {
        throw new Error(
          "Photo was not saved. Provider record was not updated."
        );
      }
      const updatedProvider = {
        ...provider,
        ...mapProviderRow(savedProvider),
        profile_image: compressedImage,
        avatar_url: compressedImage,
      } as Provider;
      setProvider(updatedProvider);
      window.localStorage.setItem(
        "masterProvider",
        JSON.stringify(updatedProvider)
      );
      window.dispatchEvent(new Event("master-provider-updated"));
    } catch (photoError) {
      console.error("PROFILE PHOTO UPDATE ERROR:", photoError);
      setError(
        photoError instanceof Error
          ? photoError.message
          : "Profile photo could not be updated."
      );
    } finally {
      setPhotoUploading(false);
      event.target.value = "";
    }
  }
  async function toggleAvailability() {
    if (!provider) {
      return;
    }
    if (actionLoading) {
      return;
    }
    const newAvailability =
      provider.availability ===
      "Available"
        ? "Not Available"
        : "Available";
    setActionLoading(
      "availability"
    );
    setError("");
    try {
      const {
        error: updateError,
      } = await supabase
        .from("providers")
        .update({
          availability:
            newAvailability,
        })
        .eq(
          "id",
          provider.id
        );
      if (updateError) {
        throw updateError;
      }
      const updatedProvider = {
        ...provider,
        availability:
          newAvailability,
      } as Provider;
      setProvider(
        updatedProvider
      );
      window.localStorage.setItem(
        "masterProvider",
        JSON.stringify(
          updatedProvider
        )
      );
      window.dispatchEvent(
        new Event(
          "master-provider-updated"
        )
      );
    } catch (availabilityError) {
      console.error(
        availabilityError
      );
      setError(
        "Unable to update availability."
      );
    } finally {
      setActionLoading("");
    }
  }
  async function updateBookingStatus(
    bookingId: string,
    status: Booking["status"]
  ) {
    if (!provider) {
      return;
    }
    setActionLoading(
      bookingId
    );
    setError("");
    try {
      const {
        error: updateError,
      } = await supabase
        .from("bookings")
        .update({
          status,
        })
        .eq(
          "id",
          bookingId
        )
        .eq(
          "provider_id",
          provider.id
        );
      if (updateError) {
        throw updateError;
      }
      setBookings(
        (previous) =>
          previous.map(
            (booking) =>
              booking.id ===
              bookingId
                ? {
                    ...booking,
                    status,
                  }
                : booking
          )
      );
      window.dispatchEvent(
        new Event(
          "master-bookings-updated"
        )
      );
    } catch (bookingError) {
      console.error(
        bookingError
      );
      setError(
        "Unable to update booking."
      );
    } finally {
      setActionLoading("");
    }
  }
  function resetSkillForm() {
    setSkillForm({
      skill_name: "",
      city: "",
      experience: "",
      charges: "",
      charge_unit:
        "Per Visit",
      description: "",
    });
    setEditingSkillId("");
  }
  function editSkill(
    skill: ProviderSkill
  ) {
    setSkillForm({
      skill_name:
        skill.skill_name ||
        "",
      city:
        skill.city || "",
      experience:
        skill.experience ||
        "",
      charges:
        skill.charges || "",
      charge_unit:
        skill.charge_unit ||
        "Per Visit",
      description:
        skill.description ||
        "",
    });
    setEditingSkillId(
      skill.id
    );
    setShowSkillForm(
      true
    );
    window.scrollTo({
      top: 700,
      behavior: "smooth",
    });
  }
  async function saveSkill() {
    if (!provider) {
      return;
    }
    if (
      !skillForm.skill_name.trim()
    ) {
      setError(
        "Please select a service."
      );
      return;
    }
    if (
      !skillForm.city.trim()
    ) {
      setError(
        "Please select a city."
      );
      return;
    }
    if (
      !skillForm.experience.trim()
    ) {
      setError(
        "Please enter experience."
      );
      return;
    }
    if (
      !skillForm.charges.trim()
    ) {
      setError(
        "Please enter charges."
      );
      return;
    }
    setSkillSaving(true);
    setError("");
    try {
      const payload = {
        provider_id:
          provider.id,
        skill_name:
          skillForm.skill_name.trim(),
        city:
          skillForm.city.trim(),
        experience:
          skillForm.experience.trim(),
        charges:
          skillForm.charges.trim(),
        charge_unit:
          skillForm.charge_unit,
        description:
          skillForm.description.trim(),
        is_active: true,
        updated_at:
          new Date().toISOString(),
      };
      if (editingSkillId) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("provider_skills")
          .update(payload)
          .eq(
            "id",
            editingSkillId
          )
          .eq(
            "provider_id",
            provider.id
          )
          .select("*")
          .single();
        if (updateError) {
          throw updateError;
        }
        setSkills(
          (previous) =>
            previous.map(
              (skill) =>
                skill.id ===
                editingSkillId
                  ? (data as ProviderSkill)
                  : skill
            )
        );
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("provider_skills")
          .insert({
            ...payload,
            created_at:
              new Date().toISOString(),
          })
          .select("*")
          .single();
        if (insertError) {
          throw insertError;
        }
        setSkills(
          (previous) => [
            ...previous,
            data as ProviderSkill,
          ]
        );
      }
      resetSkillForm();
      setShowSkillForm(false);
    } catch (skillError) {
      console.error(
        skillError
      );
      setError(
        "Unable to save skill set."
      );
    } finally {
      setSkillSaving(false);
    }
  }
  async function deleteSkill(
    skillId: string
  ) {
    if (!provider) {
      return;
    }
    if (
      !window.confirm(
        "Delete this skill?"
      )
    ) {
      return;
    }
    setSkillSaving(true);
    try {
      const {
        error: deleteError,
      } = await supabase
        .from("provider_skills")
        .delete()
        .eq(
          "id",
          skillId
        )
        .eq(
          "provider_id",
          provider.id
        );
      if (deleteError) {
        throw deleteError;
      }
      setSkills(
        (previous) =>
          previous.filter(
            (skill) =>
              skill.id !==
              skillId
          )
      );
    } catch (deleteError) {
      console.error(
        deleteError
      );
      setError(
        "Unable to delete skill."
      );
    } finally {
      setSkillSaving(false);
    }
  }
  async function toggleSkill(
    skill: ProviderSkill
  ) {
    if (!provider) {
      return;
    }
    setSkillSaving(true);
    try {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("provider_skills")
        .update({
          is_active:
            !skill.is_active,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          skill.id
        )
        .eq(
          "provider_id",
          provider.id
        )
        .select("*")
        .single();
      if (updateError) {
        throw updateError;
      }
      setSkills(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              skill.id
                ? (data as ProviderSkill)
                : item
          )
      );
    } catch (toggleError) {
      console.error(
        toggleError
      );
      setError(
        "Unable to update skill."
      );
    } finally {
      setSkillSaving(false);
    }
  }
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore logout auth errors.
    }
    window.localStorage.removeItem(
      "masterProvider"
    );
    window.localStorage.removeItem(
      "masterProviderLoggedIn"
    );
    window.localStorage.removeItem(
      "masterProviderId"
    );
    window.localStorage.removeItem(
      "masterProviderMobile"
    );
    window.localStorage.setItem(
      "masterActiveRole",
      ""
    );
    window.dispatchEvent(
      new Event(
        "master-auth-updated"
      )
    );
    window.location.href =
      "/provider/login";
  }
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc]">
        <div className="rounded-3xl bg-white px-10  py-3  text-center shadow-sm">
          <div className="text-4xl">
            ⏳
          </div>
          <h1 className="mt-2 text-sm font-bold text-slate-900">
            Loading Provider Panel...
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Please wait.
          </p>
        </div>
      </main>
    );
  }
  if (!provider) {
    return null;
  }
  if (
    provider.accountStatus ===
    "Blocked"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-md bg-white p-10 text-center shadow-lg">
          <div className="mx-auto flex  h-14  w-20 items-center justify-center rounded-full bg-red-50 text-4xl">
            🚫
          </div>
          <h1 className="mt-5 text-sm font-bold text-slate-900">
            Account Blocked
          </h1>
          <p className="mt-2 text-slate-500">
            Your Provider account is
            currently blocked.
          </p>
          <button
            onClick={
              handleLogout
            }
            className="mt-6 rounded-md bg-slate-900 px-6 py-3 font-semibold text-white"
          >
            Logout
          </button>
        </div>
      </main>
    );
  }
  const profileImage =
    provider.avatar_url ||
    provider.profile_image ||
    "";
  const availabilityOnline =
    provider.availability ===
    "Available";
  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
        {/* ================= MAIN ================= */}
        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1500px]  p-3   sm:p-3  lg:p-8">
            {error && (
              <div className="mb-2 rounded-md border border-red-200 bg-red-50  px-3 py-1.5  text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
            {/* ================= PROFILE + RIGHT ================= */}
            <div className="grid  gap-2  xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col  gap-2  md:flex-row">
                  {/* PHOTO */}
                  <div className="shrink-0">
                    <div className="relative h-24 w-24 overflow-hidden rounded-full bg-blue-50 ring-2 ring-white shadow-sm">
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt={provider.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-black text-blue-600">
                          {getInitials(provider.name)}
                        </div>
                      )}
                      <label
                        htmlFor="provider-profile-photo"
                        className="absolute bottom-1 right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md hover:bg-blue-700 transition"
                        title={profileImage ? "Edit photo" : "Add photo"}
                      >
                        <CameraIcon className="w-3.5 h-3.5 text-white" />
                      </label>
                      <input
                        id="provider-profile-photo"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoChange}
                        className="hidden"
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          availabilityOnline
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <span className="text-[11px] font-semibold text-slate-600">
                        {availabilityOnline
                          ? "Available"
                          : "Offline"}
                      </span>
                      <button
                        type="button"
                        onClick={toggleAvailability}
                        disabled={
                          actionLoading === "availability"
                        }
                        aria-label="Toggle availability"
                        className={`relative ml-1 h-5 w-9 rounded-full transition ${
                          availabilityOnline
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                            availabilityOnline
                              ? "left-4"
                              : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    <label
                      htmlFor="provider-profile-photo"
                      className="mt-1 block cursor-pointer text-center text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      {photoUploading
                        ? "Uploading..."
                        : profileImage
                        ? "Edit photo"
                        : "Add photo"}
                    </label>
                  </div>
                  {/* INFO */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-black tracking-tight text-slate-900">
                            {provider.name}
                          </h2>
                          <VerifiedBadge text="Verified Specialist" size="xs" />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {provider.service}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Professional Service Provider
                        </p>
                      </div>
                      <Link
                        href="/provider/account/edit"
                        className="inline-flex h-fit items-center justify-center rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 transition active:scale-[0.98]"
                      >
                        ✎ Edit Profile
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                        <StarIcon className="w-4 h-4 text-amber-400" filled />
                        <span>{averageRating}</span>
                        <span className="font-normal text-xs text-slate-500">
                          ({reviews.length} reviews)
                        </span>
                      </span>
                      <span className="h-4 w-px bg-slate-200" />
                      <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-slate-600">
                        <BriefcaseIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>{completedBookings} jobs completed</span>
                      </span>
                    </div>
                    <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
                        <BriefcaseIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {provider.experience ||
                            "Experience not added"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
                        <MapPinIcon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          {provider.city ||
                            "Location not added"}
                          {provider.state
                            ? `, ${provider.state}`
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
                        <ShieldCheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Identity Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
                        <CheckCircleIcon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          Professional Provider
                        </span>
                      </div>
                    </div>
                    <div className="mt-5 rounded-2xl bg-blue-50/70 border border-blue-100/80 p-3 text-xs leading-5 text-blue-900">
                      <span className="mr-1.5 font-bold text-blue-600">“</span>
                      Provide reliable and professional service through Master App.
                    </div>
                  </div>
                </div>
              </div>
              {/* EARNINGS */}
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
                    <CurrencyRupeeIcon className="w-6 h-6 text-emerald-700" />
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    This Month
                  </span>
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Estimated Earnings
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-700">
                  ₹
                  {estimatedEarnings.toLocaleString(
                    "en-IN"
                  )}
                </p>
                <div className="my-5 h-px bg-emerald-100/80" />
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">
                      Completed Jobs
                    </span>
                    <b className="text-slate-900">
                      {completedBookings}
                    </b>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">
                      Pending Jobs
                    </span>
                    <b className="text-slate-900">
                      {pendingBookings}
                    </b>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">
                      Total Bookings
                    </span>
                    <b className="text-slate-900">
                      {totalBookings}
                    </b>
                  </div>
                </div>
                <Link
                  href="/provider/earnings"
                  className="mt-5 flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-50 transition active:scale-[0.98]"
                >
                  View Full Earnings →
                </Link>
              </div>
            </div>
            {/* ================= STATS ================= */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <CalendarIcon className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    TOTAL
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black text-slate-900">
                  {totalBookings}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Total Bookings
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <ClockIcon className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    PENDING
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black text-slate-900">
                  {pendingBookings}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Pending Requests
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircleIcon className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    DONE
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black text-slate-900">
                  {completedBookings}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Completed Jobs
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <StarIcon className="w-5 h-5" filled />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                    RATING
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black text-slate-900">
                  {averageRating}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Average Rating
                </p>
              </div>
            </div>
            {/* ================= TWO COLUMN ================= */}
            <div className="mt-6 grid  gap-2  xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-2">
                {/* SERVICES */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        🛠️ My Services
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Manage the services you provide.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetSkillForm();
                        setShowSkillForm(
                          !showSkillForm
                        );
                      }}
                      className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      {showSkillForm
                        ? "Close"
                        : "+ Manage Services"}
                    </button>
                  </div>
                  {showSkillForm && (
                    <div className="mt-5  rounded-md  border border-blue-100 bg-blue-50/50 p-5">
                      <h3 className="font-bold text-slate-900">
                        {editingSkillId
                          ? "Edit Service"
                          : "Add New Service"}
                      </h3>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-bold text-slate-600">
                            Service Name
                          </label>
                          <select
                            value={
                              skillForm.skill_name
                            }
                            onChange={(event) =>
                              setSkillForm(
                                (previous) => ({
                                  ...previous,
                                  skill_name:
                                    event.target
                                      .value,
                                })
                              )
                            }
                            className="w-full rounded-md border border-slate-200 bg-white  px-3 py-1.5  text-sm outline-none focus:border-blue-500"
                          >
                            <option value="">
                              Select service
                            </option>
                            {serviceCategories.map(
                              (category) => (
                                <option
                                  key={
                                    category.id
                                  }
                                  value={
                                    category.name
                                  }
                                >
                                  {category.icon
                                    ? `${category.icon} `
                                    : ""}
                                  {
                                    category.name
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold text-slate-600">
                            City
                          </label>
                          <select
                            value={
                              skillForm.city
                            }
                            onChange={(event) =>
                              setSkillForm(
                                (previous) => ({
                                  ...previous,
                                  city:
                                    event.target
                                      .value,
                                })
                              )
                            }
                            className="w-full rounded-md border border-slate-200 bg-white  px-3 py-1.5  text-sm outline-none focus:border-blue-500"
                          >
                            <option value="">
                              Select city
                            </option>
                            {cities.map(
                              (city) => (
                                <option
                                  key={city}
                                  value={city}
                                >
                                  {city}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold text-slate-600">
                            Experience
                          </label>
                          <input
                            value={
                              skillForm.experience
                            }
                            onChange={(event) =>
                              setSkillForm(
                                (previous) => ({
                                  ...previous,
                                  experience:
                                    event.target
                                      .value,
                                })
                              )
                            }
                            placeholder="e.g. 5 years"
                            className="w-full rounded-md border border-slate-200 bg-white  px-3 py-1.5  text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold text-slate-600">
                            Charges
                          </label>
                          <input
                            value={
                              skillForm.charges
                            }
                            onChange={(event) =>
                              setSkillForm(
                                (previous) => ({
                                  ...previous,
                                  charges:
                                    event.target
                                      .value,
                                })
                              )
                            }
                            placeholder="e.g. 500"
                            className="w-full rounded-md border border-slate-200 bg-white  px-3 py-1.5  text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold text-slate-600">
                            Charge Type
                          </label>
                          <select
                            value={
                              skillForm.charge_unit
                            }
                            onChange={(event) =>
                              setSkillForm(
                                (previous) => ({
                                  ...previous,
                                  charge_unit:
                                    event.target
                                      .value,
                                })
                              )
                            }
                            className="w-full rounded-md border border-slate-200 bg-white  px-3 py-1.5  text-sm outline-none focus:border-blue-500"
                          >
                            <option>
                              Per Visit
                            </option>
                            <option>
                              Per Hour
                            </option>
                            <option>
                              Per Day
                            </option>
                            <option>
                              Per Job
                            </option>
                            <option>
                              Starting From
                            </option>
                            <option>
                              Negotiable
                            </option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-bold text-slate-600">
                            Description
                          </label>
                          <textarea
                            value={
                              skillForm.description
                            }
                            onChange={(event) =>
                              setSkillForm(
                                (previous) => ({
                                  ...previous,
                                  description:
                                    event.target
                                      .value,
                                })
                              )
                            }
                            rows={3}
                            placeholder="Describe your service..."
                            className="w-full resize-none rounded-md border border-slate-200 bg-white  px-3 py-1.5  text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void saveSkill()
                          }
                          disabled={
                            skillSaving
                          }
                          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                        >
                          {skillSaving
                            ? "Saving..."
                            : editingSkillId
                            ? "Update Service"
                            : "Save Service"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            resetSkillForm();
                            setShowSkillForm(
                              false
                            );
                          }}
                          className="rounded-md border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {activeSkills.length ===
                  0 ? (
                    <div className="mt-5  rounded-md  border border-dashed border-slate-300  py-3  text-center">
                      <div className="text-4xl">
                        🛠️
                      </div>
                      <p className="mt-2 font-bold text-slate-800">
                        No services added
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Add your first service.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {activeSkills
                        .slice(0, 6)
                        .map(
                          (skill) => (
                            <div
                              key={
                                skill.id
                              }
                              className="overflow-hidden  rounded-md  border border-slate-200 bg-white"
                            >
                              <div className="flex  h-14  items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-5xl">
                                🛠️
                              </div>
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-bold text-slate-900">
                                    {
                                      skill.skill_name
                                    }
                                  </h3>
                                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
                                    Active
                                  </span>
                                </div>
                                <p className="mt-2 text-xl font-black text-slate-900">
                                  ₹
                                  {
                                    skill.charges
                                  }
                                </p>
                                <p className="text-xs text-slate-500">
                                  {
                                    skill.charge_unit
                                  }
                                </p>
                                <div className="mt-2 text-xs text-slate-500">
                                  📍{" "}
                                  {
                                    skill.city
                                  }
                                  {" • "}
                                  {
                                    skill.experience
                                  }
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      editSkill(
                                        skill
                                      )
                                    }
                                    className="flex-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void toggleSkill(
                                        skill
                                      )
                                    }
                                    disabled={
                                      skillSaving
                                    }
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                  >
                                    Hide
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void deleteSkill(
                                        skill.id
                                      )
                                    }
                                    disabled={
                                      skillSaving
                                    }
                                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  )}
                </section>
                {/* BOOKINGS */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black">
                        📅 Recent Bookings
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Latest customer requests
                      </p>
                    </div>
                    <Link
                      href="/provider/bookings"
                      className="text-sm font-bold text-blue-600 hover:text-blue-700"
                    >
                      View All →
                    </Link>
                  </div>
                  {recentBookings.length ===
                  0 ? (
                    <div className="mt-5  rounded-md  border border-dashed border-slate-300  py-3  text-center">
                      <div className="text-4xl">
                        📭
                      </div>
                      <p className="mt-2 font-bold">
                        No bookings yet
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        New customer requests will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                            <th className="px-3 py-3">
                              Customer
                            </th>
                            <th className="px-3 py-3">
                              Service
                            </th>
                            <th className="px-3 py-3">
                              Date & Time
                            </th>
                            <th className="px-3 py-3">
                              Status
                            </th>
                            <th className="px-3 py-3">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentBookings.map(
                            (booking) => {
                              const customer =
                                getCustomer(
                                  booking.customer_id
                                );
                              return (
                                <tr
                                  key={
                                    booking.id
                                  }
                                  className="border-b border-slate-50 last:border-0"
                                >
                                  <td className="px-3 py-4">
                                    <p className="font-bold text-slate-900">
                                      {customer?.name ||
                                        "Customer"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {
                                        customer?.mobile
                                      }
                                    </p>
                                  </td>
                                  <td className="px-3  py-3  text-sm font-semibold">
                                    {
                                      booking.service
                                    }
                                  </td>
                                  <td className="px-3  py-3  text-sm text-slate-600">
                                    <div>
                                      {
                                        booking.date
                                      }
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      {
                                        booking.time
                                      }
                                    </div>
                                  </td>
                                  <td className="px-3 py-4">
                                    <span
                                      className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                                        booking.status
                                      )}`}
                                    >
                                      {
                                        booking.status
                                      }
                                    </span>
                                  </td>
                                  <td className="px-3 py-4">
                                    <div className="flex gap-2">
                                      {booking.status ===
                                        "Pending" && (
                                        <>
                                          <button
                                            onClick={() =>
                                              void updateBookingStatus(
                                                booking.id,
                                                "Accepted"
                                              )
                                            }
                                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                                          >
                                            Accept
                                          </button>
                                          <button
                                            onClick={() =>
                                              void updateBookingStatus(
                                                booking.id,
                                                "Rejected"
                                              )
                                            }
                                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600"
                                          >
                                            Reject
                                          </button>
                                        </>
                                      )}
                                      {booking.status ===
                                        "Accepted" && (
                                        <button
                                          onClick={() =>
                                            void updateBookingStatus(
                                              booking.id,
                                              "Completed"
                                            )
                                          }
                                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
                                        >
                                          Complete
                                        </button>
                                      )}
                                      <Link
                                        href={`/provider/messages?customer=${encodeURIComponent(
                                          customer?.id ||
                                            ""
                                        )}`}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
                                      >
                                        Message
                                      </Link>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
              {/* ================= RIGHT COLUMN ================= */}
              <div className="space-y-2">
                {/* SERVICE AREA */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-xl">
                      📍
                    </div>
                    <div>
                      <h3 className="font-black">
                        Service Area
                      </h3>
                      <p className="text-xs text-slate-500">
                        Your current working area
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex h-24 items-center justify-center overflow-hidden  rounded-md  bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100">
                    <div className="text-center">
                      <div className="text-4xl">
                        📍
                      </div>
                      <p className="mt-2 font-black text-slate-800">
                        {provider.city ||
                          "City not added"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Within{" "}
                        {provider.service_radius ||
                          10}{" "}
                        km
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/provider/account/edit"
                    className="mt-2 flex w-full items-center justify-center rounded-md border border-slate-200  px-3 py-1.5  text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    📍 Update Service Area
                  </Link>
                </section>
                {/* REVIEWS */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black">
                        ⭐ Customer Reviews
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        What customers say
                      </p>
                    </div>
                    <Link
                      href="/provider/reviews"
                      className="text-xs font-bold text-blue-600"
                    >
                      View All →
                    </Link>
                  </div>
                  <div className="mt-2 flex items-center gap-2  rounded-md  bg-slate-50 p-3">
                    <div className="text-xl font-black">
                      {averageRating}
                    </div>
                    <div>
                      <div className="text-sm">
                        ⭐⭐⭐⭐⭐
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {reviews.length} reviews
                      </p>
                    </div>
                  </div>
                  {recentReviews.length >
                    0 && (
                    <div className="mt-2 space-y-2">
                      {recentReviews.map(
                        (review) => (
                          <div
                            key={
                              review.id
                            }
                            className="rounded-md border border-slate-100 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">
                                Customer
                              </span>
                              <span className="text-xs">
                                {"⭐".repeat(
                                  Math.min(
                                    5,
                                    Number(
                                      review.rating
                                    ) || 0
                                  )
                                )}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {review.comment ||
                                "Great service."}
                            </p>
                            <p className="mt-2 text-[10px] text-slate-400">
                              {formatDate(
                                review.created_at
                              )}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>
                {/* QUICK ACTIONS */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-black">
                    ⚡ Quick Actions
                  </h3>
                  <div className="mt-2 grid gap-2">
                    <Link
                      href="/provider/account/edit"
                      className="rounded-md border border-slate-200  px-3 py-1.5  text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      👤 Update Profile
                    </Link>
                    <button
                      type="button"
                      onClick={
                        toggleAvailability
                      }
                      className="rounded-md border border-slate-200  px-3 py-1.5  text-left text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      🕐 Set Availability
                    </button>
                    <Link
                      href="/provider/messages"
                      className="rounded-md border border-slate-200  px-3 py-1.5  text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      💬 Open Messages
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
    </main>
  );
}
