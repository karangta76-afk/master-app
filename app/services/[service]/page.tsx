"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  SparklesIcon,
  SearchIcon,
  MapPinIcon,
  StarIcon,
  BriefcaseIcon,
  CurrencyRupeeIcon,
  ArrowUpRightIcon,
  VerifiedBadge,
  OnlineStatusDot,
  TradeBadgeContainer,
  PhoneCallIcon,
  CrosshairIcon,
  FilterIcon,
  SlidersIcon,
  CheckIcon,
} from "../../components/Icons";

type Provider = {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  service: string;
  city: string;
  address?: string;
  experience?: string;
  price?: string;
  description?: string;
  availability?: string;
  accountStatus?: string;
  rating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
};

// Fallback coordinates for prominent cities/districts so distance always computes smoothly
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  delhi: { lat: 28.6139, lng: 77.209 },
  "new delhi": { lat: 28.6139, lng: 77.209 },
  noida: { lat: 28.5355, lng: 77.391 },
  "greater noida": { lat: 28.4744, lng: 77.504 },
  ghaziabad: { lat: 28.6692, lng: 77.4538 },
  indirapuram: { lat: 28.6415, lng: 77.3714 },
  vaishali: { lat: 28.6482, lng: 77.34 },
  vasundhara: { lat: 28.6603, lng: 77.3572 },
  kaushambi: { lat: 28.6447, lng: 77.3235 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  faridabad: { lat: 28.4089, lng: 77.3178 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
};

function calculateDistanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadiusKm = 6371;
  const dLat = ((latitude2 - latitude1) * Math.PI) / 180;
  const dLon = ((longitude2 - longitude1) * Math.PI) / 180;
  const lat1 = (latitude1 * Math.PI) / 180;
  const lat2 = (latitude2 * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * earthRadiusKm;
}

function formatDistanceAway(distanceKm?: number) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return null;
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCompare(value: string) {
  return value.toLowerCase().trim().replace(/[-_\s]+/g, " ");
}

function formatTitle(slugOrName: string) {
  if (!slugOrName) return "Service Providers";
  return slugOrName
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusLabel(status?: string) {
  const norm = normalize(status || "");
  if (norm === "approved") return "Verified Partner";
  if (norm === "pending") return "Under Review";
  if (norm === "active") return "Active Specialist";
  return status || "Verified";
}

function getStatusClass(status?: string) {
  const norm = normalize(status || "");
  if (norm === "pending") {
    return "bg-amber-50 text-amber-700 border-amber-200/80";
  }
  if (norm === "approved") {
    return "bg-blue-50 text-blue-700 border-blue-200/80";
  }
  return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
}

export default function ServiceProvidersPage() {
  const params = useParams();
  const serviceParam = Array.isArray(params?.service)
    ? params.service[0]
    : params?.service;
  const rawServiceName = decodeURIComponent(serviceParam || "");
  const pageTitle = formatTitle(rawServiceName);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all"); // "all", "4.5", "4.0", "3.5", "3.0"
  const [distanceFilter, setDistanceFilter] = useState("all"); // "all", "5", "10", "25", "50"
  const [sortBy, setSortBy] = useState("recommended"); // "recommended", "rating", "distance", "experience"

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    label?: string;
  } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  // Restore saved coordinates from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("masterUserLocationCoordinates");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)) {
          setUserLocation({
            latitude: Number(parsed.latitude),
            longitude: Number(parsed.longitude),
            label: parsed.address || parsed.city || "Saved Location",
          });
        }
      }
    } catch (err) {
      console.warn("Could not parse saved location coordinates:", err);
    }
  }, []);

  function handleDetectLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: "Your Current Location",
        };
        setUserLocation(coords);
        setLocatingUser(false);
        try {
          localStorage.setItem("masterUserLocationCoordinates", JSON.stringify(coords));
        } catch (_) {}
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setLocatingUser(false);
        alert("Unable to retrieve GPS coordinates. Please check your browser location permission.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  async function loadProviders() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("providers")
        .select(
          "id,name,mobile,email,service,city,experience,price,address,description,availability,account_status,latitude,longitude"
        )
        .order("created_at", { ascending: false });

      let rawRows = data;

      if (error || !rawRows || rawRows.length === 0) {
        if (error) {
          console.warn("Supabase provider query error, checking local fallback:", error);
        }
        try {
          const cached =
            localStorage.getItem("masterProviders") ||
            localStorage.getItem("master-providers");
          if (cached) {
            rawRows = JSON.parse(cached);
          }
        } catch (storageErr) {
          console.warn("Could not load local cached providers:", storageErr);
        }
      }

      const visible = (rawRows || []).filter((item: any) => {
        const st = normalize(item.account_status || item.accountStatus || "");
        return st !== "blocked";
      });

      const mapped: Provider[] = visible.map((item: any) => {
        let lat = item.latitude != null ? Number(item.latitude) : undefined;
        let lng = item.longitude != null ? Number(item.longitude) : undefined;

        // Fallback coordinate by recognized city if coordinates were missing
        if ((lat == null || lng == null) && item.city) {
          const cityLower = normalize(item.city);
          const matchedCoord = CITY_COORDINATES[cityLower];
          if (matchedCoord) {
            lat = matchedCoord.lat;
            lng = matchedCoord.lng;
          }
        }

        return {
          id: String(item.id),
          name: item.name ?? "Independent Professional",
          mobile: item.mobile ?? "",
          email: item.email ?? "",
          service: item.service ?? "Home Services",
          city: item.city ?? "",
          address: item.address ?? "",
          experience: item.experience ?? "",
          price: item.price ?? "",
          description: item.description ?? "",
          availability: item.availability ?? "Available Today",
          accountStatus: item.account_status ?? item.accountStatus ?? "Active",
          latitude: lat,
          longitude: lng,
        };
      });

      // Enrich with ratings from reviews table if available
      try {
        const providerIds = mapped.map((p) => p.id);
        if (providerIds.length > 0) {
          const { data: reviewsData } = await supabase
            .from("reviews")
            .select("provider_id,rating")
            .eq("status", "Published")
            .in("provider_id", providerIds);

          if (reviewsData && reviewsData.length > 0) {
            const stats: Record<string, { sum: number; count: number }> = {};
            reviewsData.forEach((rev) => {
              const pid = String(rev.provider_id);
              if (!stats[pid]) stats[pid] = { sum: 0, count: 0 };
              stats[pid].sum += Number(rev.rating) || 0;
              stats[pid].count += 1;
            });
            mapped.forEach((p) => {
              if (stats[p.id] && stats[p.id].count > 0) {
                p.rating = Number((stats[p.id].sum / stats[p.id].count).toFixed(1));
                p.reviewCount = stats[p.id].count;
              }
            });
          }
        }
      } catch (ratingErr) {
        console.warn("Could not enrich ratings:", ratingErr);
      }

      setProviders(mapped);

      // Refresh local cache
      try {
        localStorage.setItem("masterProviders", JSON.stringify(mapped));
        localStorage.setItem("master-providers", JSON.stringify(mapped));
      } catch (_) {}
    } catch (error) {
      console.error("Service providers page error:", error);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProviders();

    const localHandler = () => {
      void loadProviders();
    };
    window.addEventListener("master-providers-updated", localHandler);

    const channel = supabase
      .channel("service-category-providers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "providers",
        },
        () => {
          void loadProviders();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("master-providers-updated", localHandler);
      void supabase.removeChannel(channel);
    };
  }, []);

  // Available unique cities for filtering
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    providers.forEach((p) => {
      if (p.city?.trim()) set.add(p.city.trim());
    });
    return Array.from(set).sort();
  }, [providers]);

  // Robust matching: handles "ac-repair" matching "AC Repair", "ac repair", etc.
  const filteredProviders = useMemo(() => {
    const rawTarget = rawServiceName.trim();
    const slugTarget = toSlug(rawTarget);
    const normalizedTarget = normalizeCompare(rawTarget);
    const searchText = normalize(search);

    const withDistances = providers.map((provider) => {
      let distanceKm: number | undefined = undefined;
      if (
        userLocation &&
        Number.isFinite(userLocation.latitude) &&
        Number.isFinite(userLocation.longitude) &&
        provider.latitude != null &&
        provider.longitude != null &&
        Number.isFinite(provider.latitude) &&
        Number.isFinite(provider.longitude)
      ) {
        distanceKm = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          provider.latitude,
          provider.longitude
        );
      }
      return {
        ...provider,
        distanceKm,
      };
    });

    const filtered = withDistances.filter((provider) => {
      const providerSlug = toSlug(provider.service);
      const providerNorm = normalizeCompare(provider.service);

      // Match category slug, normalized name, or full string
      const serviceMatch =
        !rawTarget ||
        providerSlug === slugTarget ||
        providerNorm === normalizedTarget ||
        providerNorm.includes(normalizedTarget) ||
        normalizedTarget.includes(providerNorm);

      const cityMatch =
        selectedCity === "all" ||
        normalize(provider.city) === normalize(selectedCity);

      const searchMatch =
        !searchText ||
        normalize(provider.name).includes(searchText) ||
        normalize(provider.city).includes(searchText) ||
        normalize(provider.service).includes(searchText) ||
        normalize(provider.description || "").includes(searchText);

      // Rating filter
      const minRating = ratingFilter === "all" ? 0 : parseFloat(ratingFilter);
      const ratingMatch = (provider.rating || 0) >= minRating;

      // Distance filter
      let distanceMatch = true;
      if (distanceFilter !== "all" && userLocation) {
        const maxDist = parseFloat(distanceFilter);
        distanceMatch =
          provider.distanceKm != null && provider.distanceKm <= maxDist;
      }

      return serviceMatch && cityMatch && searchMatch && ratingMatch && distanceMatch;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === "rating") {
        const diff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(diff) > 0.001) return diff;
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      if (sortBy === "distance") {
        const distA = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const distB = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return distA - distB;
      }
      if (sortBy === "experience") {
        const parseExp = (val?: string) => {
          const m = String(val || "").match(/(\d+)/);
          return m ? parseInt(m[1], 10) : 0;
        };
        return parseExp(b.experience) - parseExp(a.experience);
      }
      // "recommended" default: prioritized by active status + rating
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [
    providers,
    rawServiceName,
    search,
    selectedCity,
    ratingFilter,
    distanceFilter,
    sortBy,
    userLocation,
  ]);

  return (
    <main className="min-h-screen bg-slate-50/60 pb-20">
      {/* HERO HEADER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 px-4 text-white pt-28 sm:pt-36 pb-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl">
          {/* BREADCRUMB */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>
            <span>/</span>
            <Link href="/services" className="transition hover:text-white">
              Services
            </Link>
            <span>/</span>
            <span className="font-semibold text-blue-300">{pageTitle}</span>
          </nav>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-300 backdrop-blur-xs">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                Verified Specialist Network
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {pageTitle}
              </h1>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Connect directly with verified local experts offering upfront pricing and prompt doorstep service.
              </p>
            </div>

            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 backdrop-blur-xs transition hover:bg-slate-700 hover:text-white sm:text-sm"
            >
              ← Browse All Categories
            </Link>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-3.5 sm:p-4 backdrop-blur-md space-y-3">
            {/* TOP ROW: Search + City + Sort */}
            <div className="grid gap-2.5 sm:grid-cols-[1fr_auto_auto]">
              <div className="relative flex items-center">
                <SearchIcon className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by specialist name, landmark, or skill..."
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>

              {availableCities.length > 0 && (
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 sm:text-sm"
                >
                  <option value="all">📍 All Cities</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 sm:text-sm"
              >
                <option value="recommended">⚡ Sort: Recommended</option>
                <option value="rating">⭐ Sort: Highest Rated</option>
                <option value="distance">📍 Sort: Nearest Distance</option>
                <option value="experience">💼 Sort: Most Experienced</option>
              </select>
            </div>

            {/* BOTTOM ROW: Rating Filter + Distance Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs">
              {/* RATING FILTER PILLS */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1 mr-1">
                  <StarIcon className="w-3.5 h-3.5 text-amber-400" filled />
                  <span>Rating:</span>
                </span>
                {[
                  { id: "all", label: "All" },
                  { id: "4.5", label: "4.5+ ★" },
                  { id: "4.0", label: "4.0+ ★" },
                  { id: "3.5", label: "3.5+ ★" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRatingFilter(opt.id)}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                      ratingFilter === opt.id
                        ? "bg-amber-400 text-slate-950 shadow-xs"
                        : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* DISTANCE FILTER PILLS & GPS */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1 mr-1">
                  <MapPinIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Distance:</span>
                </span>
                {[
                  { id: "all", label: "Any" },
                  { id: "5", label: "< 5 km" },
                  { id: "10", label: "< 10 km" },
                  { id: "25", label: "< 25 km" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDistanceFilter(opt.id);
                      if (opt.id !== "all" && !userLocation) {
                        handleDetectLocation();
                      }
                    }}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                      distanceFilter === opt.id
                        ? "bg-blue-500 text-white shadow-xs"
                        : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locatingUser}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-medium transition ${
                    userLocation
                      ? "border-blue-400/40 bg-blue-500/20 text-blue-300"
                      : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                  title="Detect GPS location for exact distance"
                >
                  <CrosshairIcon className={`h-3 w-3 ${locatingUser ? "animate-spin text-blue-400" : "text-blue-300"}`} />
                  <span>
                    {locatingUser
                      ? "Locating..."
                      : userLocation
                      ? "📍 GPS Active"
                      : "Near Me"}
                  </span>
                </button>

                {(search || selectedCity !== "all" || ratingFilter !== "all" || distanceFilter !== "all" || sortBy !== "recommended") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSelectedCity("all");
                      setRatingFilter("all");
                      setDistanceFilter("all");
                      setSortBy("recommended");
                    }}
                    className="rounded-lg border border-red-500/30 bg-red-500/20 px-2.5 py-1 text-red-300 transition hover:bg-red-500/30"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROVIDERS GRID SECTION */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-xs">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm font-semibold text-slate-700">
              Locating top verified specialists...
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Searching database and nearby availability
            </p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs sm:p-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <SearchIcon className="w-7 h-7" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-900 sm:text-2xl">
              No specialists matching your criteria
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              We couldn&apos;t find verified providers under &ldquo;{pageTitle}&rdquo;
              {selectedCity !== "all" ? ` in ${selectedCity}` : ""}. Try resetting your search filters or browse other popular trades.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {(search || selectedCity !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCity("all");
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 sm:text-sm"
                >
                  Clear Filters
                </button>
              )}
              <Link
                href="/services"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 sm:text-sm"
              >
                <span>Browse All Services</span>
                <ArrowUpRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Available Verified Technicians
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Showing {filteredProviders.length} active specialist
                  {filteredProviders.length !== 1 ? "s" : ""} for {pageTitle}
                </p>
              </div>

              <div className="text-xs text-slate-400">
                100% verified KYC &amp; transparent pricing
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5"
                >
                  <div className="p-5 sm:p-6">
                    {/* TOP ROW: AVATAR + BADGE */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <TradeBadgeContainer service={provider.service} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                              {provider.name}
                            </h3>
                            <VerifiedBadge size="xs" />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-500">
                              {provider.service}
                            </span>
                            {provider.mobile && (
                              <a
                                href={`tel:${provider.mobile}`}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200/70 transition hover:bg-emerald-100"
                                title={`Call ${provider.name}: ${provider.mobile}`}
                              >
                                <PhoneCallIcon className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                                <span className="font-mono">{provider.mobile}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <OnlineStatusDot 
                        available={provider.availability === "Available"} 
                        label={provider.availability === "Available" ? "Online" : "Busy"} 
                      />
                    </div>

                    {/* RATING & EXPERIENCE */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                      {provider.rating ? (
                        <div className="flex items-center gap-1 font-bold text-amber-600">
                          <StarIcon className="w-3.5 h-3.5 text-amber-500" filled={true} />
                          <span>{provider.rating}</span>
                          <span className="text-slate-400 font-normal">
                            ({provider.reviewCount})
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700 text-[11px]">
                          <SparklesIcon className="w-3 h-3 text-blue-600" />
                          <span>New Specialist</span>
                        </span>
                      )}

                      {provider.experience && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <BriefcaseIcon className="w-3 h-3 text-slate-400" />
                          <span>{provider.experience}</span>
                        </span>
                      )}

                      {provider.city && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <MapPinIcon className="w-3 h-3 text-slate-400" />
                          <span>{provider.city}</span>
                        </span>
                      )}

                      {provider.distanceKm != null && Number.isFinite(provider.distanceKm) && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/80">
                          <MapPinIcon className="w-2.5 h-2.5 text-blue-600" />
                          <span>{formatDistanceAway(provider.distanceKm)}</span>
                        </span>
                      )}
                    </div>

                    {/* HIGHLIGHT DETAILS */}
                    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      {provider.mobile && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Direct Contact:</span>
                          <a
                            href={`tel:${provider.mobile}`}
                            className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-mono"
                          >
                            <PhoneCallIcon className="w-3 h-3 text-emerald-600" />
                            <span>{provider.mobile}</span>
                          </a>
                        </div>
                      )}
                      {provider.availability && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Availability:</span>
                          <span className="font-medium text-emerald-600">
                            {provider.availability}
                          </span>
                        </div>
                      )}
                    </div>

                    {provider.description && (
                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {provider.description}
                      </p>
                    )}
                  </div>

                  {/* ACTION FOOTER */}
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
                    {provider.mobile ? (
                      <a
                        href={`tel:${provider.mobile}`}
                        className="flex items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-center text-xs font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-100 hover:border-emerald-400 active:scale-98"
                        title={`Call ${provider.name}`}
                      >
                        <PhoneCallIcon className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Call</span>
                      </a>
                    ) : (
                      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-center text-xs font-semibold text-slate-400">
                        No Phone
                      </div>
                    )}
                    <Link
                      href={`/provider/${provider.id}`}
                      className="rounded-xl border border-slate-200 bg-white py-2.5 text-center text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Profile
                    </Link>
                    <Link
                      href={`/provider/${provider.id}/book`}
                      className="flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-center text-xs font-bold text-white shadow-xs shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700"
                    >
                      <span>Book</span>
                      <ArrowUpRightIcon className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}