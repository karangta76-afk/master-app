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
};

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

  async function loadProviders() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("providers")
        .select(
          "id,name,mobile,email,service,city,experience,price,address,description,availability,account_status"
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

      const mapped: Provider[] = visible.map((item: any) => ({
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
      }));

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

    return providers.filter((provider) => {
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

      return serviceMatch && cityMatch && searchMatch;
    });
  }, [providers, rawServiceName, search, selectedCity]);

  return (
    <main className="min-h-screen bg-slate-50/60 pb-20">
      {/* HERO HEADER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 px-4 pt-12 pb-16 text-white sm:px-6 lg:px-8">
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
          <div className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:grid-cols-[1fr_auto_auto]">
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
                <option value="all">All Cities</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {(search || selectedCity !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCity("all");
                }}
                className="rounded-xl border border-slate-700/80 bg-slate-800/90 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                Reset
              </button>
            )}
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
                          <p className="text-xs font-medium text-slate-500">
                            {provider.service}
                          </p>
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
                    </div>

                    {/* HIGHLIGHT DETAILS */}
                    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      {provider.price && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Starting Price:</span>
                          <span className="font-bold text-slate-900 flex items-center">
                            <CurrencyRupeeIcon className="w-3.5 h-3.5 text-slate-700" />
                            <span>{provider.price}</span>
                          </span>
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
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
                    <Link
                      href={`/provider/${provider.id}`}
                      className="rounded-xl border border-slate-200 bg-white py-2.5 text-center text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/provider/${provider.id}/book`}
                      className="flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-center text-xs font-bold text-white shadow-xs shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700"
                    >
                      <span>Book Doorstep</span>
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