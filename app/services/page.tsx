"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  SparklesIcon,
  SearchIcon,
  CrosshairIcon,
  MapPinIcon,
  TradeBadgeContainer,
  TradeServiceIcon,
  VerifiedBadge,
  OnlineStatusDot,
  StarIcon,
  BriefcaseIcon,
  CurrencyRupeeIcon,
  ArrowUpRightIcon,
  ShieldCheckIcon,
  PhoneIcon,
} from "../components/Icons";
type Provider = {
  id: string;
  name: string;
  mobile?: string;
  service: string;
  city: string;
  area?: string;
  pincode?: string;
  experience?: string;
  price?: string;
  description?: string;
  availability?: string;
  accountStatus?: string;
  latitude?: number;
  longitude?: number;
};
type ProviderRow = {
  id: string | number;
  name?: string | null;
  mobile?: string | null;
  service?: string | null;
  city?: string | null;
  area?: string | null;
  pincode?: string | null;
  experience?: string | null;
  price?: string | null;
  description?: string | null;
  availability?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};
type ServiceCategoryRow = {
  id: string | number;
  name?: string | null;
  icon?: string | null;
  description?: string | null;
  is_active?: boolean | null;
};
type ProviderReview = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
};
type SortOption =
  | "recommended"
  | "distance"
  | "rating"
  | "experience"
  | "priceLow"
  | "priceHigh";
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
function formatDistanceAway(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}
type ServiceCategory = {
  id?: string;
  name: string;
  count: number;
  icon?: string;
  description?: string;
};
const fallbackServices: ServiceCategory[] = [
  {
    name: "Electrician",
    count: 0,
    icon: "⚡",
    description: "Electrical repair & installation",
  },
  {
    name: "Plumber",
    count: 0,
    icon: "🔧",
    description: "Pipes, taps & water repair",
  },
  {
    name: "AC Repair",
    count: 0,
    icon: "❄️",
    description: "AC service & repair",
  },
  {
    name: "Carpenter",
    count: 0,
    icon: "🪚",
    description: "Furniture & wood work",
  },
  {
    name: "Painter",
    count: 0,
    icon: "🎨",
    description: "Home & office painting",
  },
  {
    name: "Appliance Repair",
    count: 0,
    icon: "🔌",
    description: "Home appliance repair",
  },
  {
    name: "Cleaning",
    count: 0,
    icon: "🧹",
    description: "Home & office cleaning",
  },
  {
    name: "Other",
    count: 0,
    icon: "🛠️",
    description: "Find other local services",
  },
];
const serviceIcons: Record<string, string> = {
  Barber: "💈",
  Plumber: "🔧",
  Electrician: "⚡",
  Painter: "🎨",
  Carpenter: "🪚",
  Driver: "🚗",
  Mechanic: "🔩",
  Cleaner: "🧹",
  Cleaning: "🧹",
  "AC Repair": "❄️",
  "Washing Machine Repair": "🧺",
  "Mobile Repair": "📱",
  "Computer Repair": "💻",
  Doctor: "👨‍⚕️",
  Tutor: "📚",
  "Home Cook": "👨‍🍳",
  Cook: "🍳",
  Maid: "🧹",
  "Pest Control": "🐜",
  "RO Repair": "💧",
  "Beauty Parlour": "💇‍♀️",
  "Makeup Artist": "💄",
  "Appliance Repair": "🔌",
  Other: "🛠️",
};
function getIcon(service: string) {
  const exact = serviceIcons[service];
  if (exact) {
    return exact;
  }
  const lower = service.toLowerCase();
  if (
    lower.includes("barber") ||
    lower.includes("salon")
  ) {
    return "💈";
  }
  if (lower.includes("plumb")) {
    return "🔧";
  }
  if (lower.includes("electric")) {
    return "⚡";
  }
  if (lower.includes("paint")) {
    return "🎨";
  }
  if (lower.includes("carpent")) {
    return "🪚";
  }
  if (lower.includes("driver")) {
    return "🚗";
  }
  if (lower.includes("clean")) {
    return "🧹";
  }
  if (lower.includes("doctor")) {
    return "👨‍⚕️";
  }
  if (
    lower.includes("repair") ||
    lower.includes("mechanic")
  ) {
    return "🔧";
  }
  if (lower.includes("cook")) {
    return "🍳";
  }
  if (lower.includes("beauty")) {
    return "💇‍♀️";
  }
  if (lower.includes("makeup")) {
    return "💄";
  }
  if (lower.includes("ac")) {
    return "❄️";
  }
  return "🛠️";
}
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
function findSuggestedService(
  problem: string,
  services: ServiceCategory[]
) {
  const lower = problem.toLowerCase().trim();
  if (!lower) {
    return "";
  }
  const keywordMap: {
    keywords: string[];
    service: string;
  }[] = [
    {
      keywords: [
        "fan",
        "switch",
        "wire",
        "wiring",
        "light",
        "electric",
        "meter",
        "socket",
        "mcb",
        "current",
        "voltage",
        "bijli",
        "bulb",
      ],
      service: "Electrician",
    },
    {
      keywords: [
        "pipe",
        "tap",
        "water",
        "leak",
        "leakage",
        "toilet",
        "basin",
        "tank",
        "drain",
        "nal",
        "paani",
      ],
      service: "Plumber",
    },
    {
      keywords: [
        "ac",
        "air conditioner",
        "cooling",
        "cool nahi",
        "cooling nahi",
        "gas",
        "split ac",
        "window ac",
      ],
      service: "AC Repair",
    },
    {
      keywords: [
        "wood",
        "furniture",
        "door",
        "bed",
        "chair",
        "table",
        "almirah",
        "carpenter",
        "lakdi",
      ],
      service: "Carpenter",
    },
    {
      keywords: [
        "paint",
        "painting",
        "colour",
        "color",
        "wall",
        "putty",
        "rang",
        "painter",
      ],
      service: "Painter",
    },
    {
      keywords: [
        "fridge",
        "refrigerator",
        "washing machine",
        "microwave",
        "cooler",
        "tv",
        "television",
        "appliance",
      ],
      service: "Appliance Repair",
    },
    {
      keywords: [
        "clean",
        "cleaning",
        "dust",
        "deep cleaning",
        "bathroom cleaning",
        "house cleaning",
        "safai",
      ],
      service: "Cleaning",
    },
    {
      keywords: [
        "barber",
        "hair",
        "haircut",
        "salon",
        "baal",
        "shave",
      ],
      service: "Barber",
    },
    {
      keywords: [
        "car",
        "bike",
        "vehicle",
        "engine",
        "mechanic",
        "puncture",
        "service",
      ],
      service: "Mechanic",
    },
  ];
  for (const item of keywordMap) {
    const found = item.keywords.some((keyword) =>
      lower.includes(keyword)
    );
    if (!found) {
      continue;
    }
    const exactService = services.find(
      (service) =>
        service.name.toLowerCase() ===
        item.service.toLowerCase()
    );
    if (exactService) {
      return exactService.name;
    }
    const partialService = services.find(
      (service) => {
        const serviceName =
          service.name.toLowerCase();
        const target =
          item.service.toLowerCase();
        return (
          serviceName.includes(target) ||
          target.includes(serviceName)
        );
      }
    );
    if (partialService) {
      return partialService.name;
    }
    return item.service;
  }
  const directMatch = services.find(
    (service) =>
      lower.includes(
        service.name.toLowerCase()
      )
  );
  if (directMatch) {
    return directMatch.name;
  }
  return "Other";
}
function ServicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchFromUrl =
    searchParams.get("search") || "";
  const locationFromUrl =
    searchParams.get("location") || "";
  const [providers, setProviders] =
    useState<Provider[]>([]);
  const [providerRatings, setProviderRatings] =
    useState<
      Record<
        string,
        {
          average: number;
          total: number;
        }
      >
    >({});
  const [reviewModal, setReviewModal] =
    useState<{
      provider: Provider;
      reviews: ProviderReview[];
      loading: boolean;
    } | null>(null);
  const [sortBy, setSortBy] =
    useState<SortOption>("recommended");
  const [providerViewMode, setProviderViewMode] =
    useState<"list" | "map">("list");
  const [serviceCategories, setServiceCategories] =
    useState<ServiceCategory[]>(
      fallbackServices
    );
  const [search, setSearch] =
    useState(searchFromUrl);
  const [location, setLocation] =
    useState(locationFromUrl);
  const [locationSuggestions, setLocationSuggestions] =
    useState<
      {
        displayName: string;
        shortName: string;
        latitude: number;
        longitude: number;
        city: string;
        pincode: string;
      }[]
    >([]);
  const [locationSuggestionsLoading, setLocationSuggestionsLoading] =
    useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
  const [showAllServices, setShowAllServices] =
    useState(false);
  const [aiProblem, setAiProblem] =
    useState("");
  const [aiSuggestion, setAiSuggestion] =
    useState("");
  const [aiLoading, setAiLoading] =
    useState(false);
  const [locationModalOpen, setLocationModalOpen] =
    useState(false);
  const [locationLoading, setLocationLoading] =
    useState(false);
  const [locationError, setLocationError] =
    useState("");
  const [detectedLocation, setDetectedLocation] =
    useState<{
      latitude: number;
      longitude: number;
      address: string;
      city: string;
      pincode: string;
    } | null>(null);
  const [selectedMapLocation, setSelectedMapLocation] =
    useState<{
      latitude: number;
      longitude: number;
      address: string;
      city: string;
      pincode: string;
    } | null>(null);
  // Human-readable location label. Coordinates are never used
  // as the visible location value.
  const [selectedLocationLabel, setSelectedLocationLabel] =
    useState("");
  // Keeps the location input + suggestion dropdown together so
  // suggestions can be closed when the user clicks outside.
  const locationSearchRef =
    useRef<HTMLDivElement | null>(null);
  // Prevents older location-search requests from overwriting
  // newer results when the user types quickly.
  const locationSuggestionRequestRef =
    useRef(0);
  const mapContainerRef =
    useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  // Separate Leaflet map refs for the provider Map/List results view.
  // These must stay independent from the location-picker map above.
  const resultsMapContainerRef =
    useRef<HTMLDivElement | null>(null);
  const resultsMapRef = useRef<any>(null);
  const resultsMarkersRef =
    useRef<any[]>([]);
  const accuracyCircleRef = useRef<any>(null);
  useEffect(() => {
    setSearch(searchFromUrl);
    setLocation(locationFromUrl);
  }, [
    searchFromUrl,
    locationFromUrl,
  ]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        "masterUserLocationCoordinates"
      );
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const latitude = Number(parsed?.latitude);
      const longitude = Number(parsed?.longitude);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        const savedLocation = {
          latitude,
          longitude,
          address: "Selected Location",
          city: "",
          pincode: "",
        };
        setDetectedLocation(savedLocation);
        setSelectedMapLocation(savedLocation);
      }
    } catch (error) {
      console.error("Saved location coordinates could not be loaded:", error);
    }
  }, []);
  // Close location suggestions when clicking anywhere outside
  // the location input + suggestion dropdown.
  useEffect(() => {
    const handleLocationOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        locationSearchRef.current &&
        !locationSearchRef.current.contains(target)
      ) {
        setShowLocationSuggestions(false);
        setLocationSuggestions([]);
      }
    };
    document.addEventListener(
      "mousedown",
      handleLocationOutsideClick
    );
    return () => {
      document.removeEventListener(
        "mousedown",
        handleLocationOutsideClick
      );
    };
  }, []);
  /*
   * ==========================================
   * PROVIDER RATINGS + REVIEWS
   * ==========================================
   */
  async function loadProviderRatings(
    providerIds: string[]
  ) {
    const ids = Array.from(
      new Set(
        providerIds
          .map((id) => String(id).trim())
          .filter(Boolean)
      )
    );
    if (ids.length === 0) {
      setProviderRatings({});
      return;
    }
    try {
      const { data, error } =
        await supabase
          .from("reviews")
          .select("provider_id,rating")
          .eq("status", "Published")
          .in("provider_id", ids);
      if (error) {
        console.error(
          "Provider ratings load error:",
          error
        );
        setProviderRatings({});
        return;
      }
      const totals: Record<
        string,
        { sum: number; total: number }
      > = {};
      (data ?? []).forEach((row: any) => {
        const providerId = String(
          row.provider_id ?? ""
        ).trim();
        const rating = Number(row.rating);
        if (
          !providerId ||
          !Number.isFinite(rating) ||
          rating < 1 ||
          rating > 5
        ) {
          return;
        }
        if (!totals[providerId]) {
          totals[providerId] = {
            sum: 0,
            total: 0,
          };
        }
        totals[providerId].sum += rating;
        totals[providerId].total += 1;
      });
      const nextRatings: Record<
        string,
        { average: number; total: number }
      > = {};
      ids.forEach((providerId) => {
        const stats = totals[providerId];
        if (!stats) {
          nextRatings[providerId] = {
            average: 0,
            total: 0,
          };
          return;
        }
        nextRatings[providerId] = {
          average:
            Math.round(
              (stats.sum / stats.total) * 10
            ) / 10,
          total: stats.total,
        };
      });
      setProviderRatings(nextRatings);
    } catch (error) {
      console.error(
        "Provider ratings crash:",
        error
      );
      setProviderRatings({});
    }
  }
  async function openProviderReviews(
    provider: Provider
  ) {
    setReviewModal({
      provider,
      reviews: [],
      loading: true,
    });
    try {
      const { data, error } =
        await supabase
          .from("reviews")
          .select(
            "id,rating,comment,created_at"
          )
          .eq(
            "provider_id",
            String(provider.id)
          )
          .eq("status", "Published")
          .order("created_at", {
            ascending: false,
          });
      if (error) {
        console.error(
          "Provider reviews load error:",
          error
        );
        setReviewModal({
          provider,
          reviews: [],
          loading: false,
        });
        return;
      }
      const reviews: ProviderReview[] =
        (data ?? []).map((row: any) => ({
          id: String(row.id),
          rating: Number(row.rating) || 0,
          comment: String(
            row.comment ?? ""
          ).trim(),
          created_at: String(
            row.created_at ?? ""
          ),
        }));
      setReviewModal({
        provider,
        reviews,
        loading: false,
      });
    } catch (error) {
      console.error(
        "Provider reviews crash:",
        error
      );
      setReviewModal({
        provider,
        reviews: [],
        loading: false,
      });
    }
  }
  /*
   * ==========================================
   * LOAD PROVIDERS
   * ==========================================
   */
  async function loadProviders() {
    try {
      const { data, error } =
        await supabase
          .from("providers")
            .select(
              "id,name,mobile,service,city,area,pincode,experience,price,description,availability,latitude,longitude,created_at"
            )
          .order("created_at", {
            ascending: false,
          });
      if (error) {
        console.error(
          "Services provider load error:",
          error
        );
        setProviders([]);
        return;
      }
      const mappedProviders: Provider[] =
        (data ?? []).map(
          (provider) => ({
            id: String(provider.id),
            name:
                provider.name ?? "",
              mobile:
                provider.mobile ?? "",
            service:
              provider.service ?? "",
            city:
              provider.city ?? "",
            area:
              provider.area ?? "",
            pincode:
              provider.pincode ?? "",
            experience:
              provider.experience ?? "",
            price:
              provider.price ?? "",
            description:
              provider.description ?? "",
            availability:
              provider.availability ??
              "Available",
            latitude:
              provider.latitude == null
                ? undefined
                : Number(provider.latitude),
            longitude:
              provider.longitude == null
                ? undefined
                : Number(provider.longitude),
          })
        );
      setProviders(mappedProviders);
      await loadProviderRatings(
        mappedProviders.map(
          (provider) => provider.id
        )
      );
      localStorage.setItem(
        "masterProviders",
        JSON.stringify(
          mappedProviders
        )
      );
    } catch (error) {
      console.error(
        "Services page provider error:",
        error
      );
      setProviders([]);
    }
  }
  /*
   * ==========================================
   * LOAD SERVICE CATEGORIES
   * ==========================================
   */
  async function loadServiceCategories(
    currentProviders: Provider[]
  ) {
    try {
      const { data, error } =
        await supabase
          .from("service_categories")
          .select(
            "id,name,icon,description,is_active"
          )
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          });
      if (error) {
        console.error(
          "Service categories error:",
          error
        );
        buildCategoriesFromProviders(
          currentProviders
        );
        return;
      }
      const providerCount =
        new Map<string, number>();
      currentProviders.forEach(
        (provider) => {
          const service =
            provider.service?.trim();
          if (!service) {
            return;
          }
          const key =
            service.toLowerCase();
          providerCount.set(
            key,
            (providerCount.get(key) ||
              0) + 1
          );
        }
      );
      if (data && data.length > 0) {
        const categories =
          data.map((category: ServiceCategoryRow) => ({
            id: String(category.id),
            name:
              category.name ||
              "Other",
            count:
              providerCount.get(
                String(
                  category.name || ""
                ).toLowerCase()
              ) || 0,
            icon:
              category.icon ||
              getIcon(
                category.name || ""
              ),
            description:
              category.description ||
              `Find and book ${
                category.name ||
                "local"
              } services.`,
          }));
        setServiceCategories(
          categories
        );
        return;
      }
      buildCategoriesFromProviders(
        currentProviders
      );
    } catch (error) {
      console.error(
        "Service category crash:",
        error
      );
      buildCategoriesFromProviders(
        currentProviders
      );
    }
  }
  function buildCategoriesFromProviders(
    currentProviders: Provider[]
  ) {
    const map = new Map<
      string,
      ServiceCategory
    >();
    fallbackServices.forEach(
      (service) => {
        map.set(
          service.name.toLowerCase(),
          {
            ...service,
            count: 0,
          }
        );
      }
    );
    currentProviders.forEach(
      (provider) => {
        const service =
          provider.service?.trim();
        if (!service) {
          return;
        }
        const key =
          service.toLowerCase();
        const existing =
          map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, {
            name: service,
            count: 1,
            icon: getIcon(service),
            description:
              `Find and book ${service.toLowerCase()} services.`,
          });
        }
      }
    );
    setServiceCategories(
      Array.from(map.values())
    );
  }
  /*
   * ==========================================
   * INITIAL LOAD + REALTIME
   * ==========================================
   */
  useEffect(() => {
    let mounted = true;
    async function initialize() {
      setLoading(true);
      try {
        const { data, error } =
          await supabase
            .from("providers")
            .select(
              "id,name,mobile,service,city,area,pincode,experience,price,description,availability,latitude,longitude,created_at"
            )
            .order("created_at", {
              ascending: false,
            });
        if (error) {
          console.error(
            "Initial provider load error:",
            error
          );
          if (mounted) {
            setProviders([]);
            setServiceCategories(
              fallbackServices
            );
          }
          return;
        }
        const mappedProviders: Provider[] =
          (data ?? []).map(
            (provider) => ({
              id: String(provider.id),
              name:
                provider.name ?? "",
              mobile:
                provider.mobile ?? "",
              service:
                provider.service ?? "",
              city:
                provider.city ?? "",
              area:
                provider.area ?? "",
              pincode:
                provider.pincode ?? "",
              experience:
                provider.experience ?? "",
              price:
                provider.price ?? "",
              description:
                provider.description ??
                "",
              availability:
                provider.availability ??
                "Available",
              latitude:
                provider.latitude == null
                  ? undefined
                  : Number(provider.latitude),
              longitude:
                provider.longitude == null
                  ? undefined
                  : Number(provider.longitude),
            })
          );
        if (!mounted) {
          return;
        }
        setProviders(
          mappedProviders
        );
        await loadProviderRatings(
          mappedProviders.map(
            (provider) => provider.id
          )
        );
        localStorage.setItem(
          "masterProviders",
          JSON.stringify(
            mappedProviders
          )
        );
        await loadServiceCategories(
          mappedProviders
        );
      } catch (error) {
        console.error(
          "Services initialization error:",
          error
        );
        if (mounted) {
          setProviders([]);
          setServiceCategories(
            fallbackServices
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    void initialize();
    const handleProvidersUpdate =
      () => {
        void initialize();
      };
    window.addEventListener(
      "master-providers-updated",
      handleProvidersUpdate
    );
    const providerChannel =
      supabase
        .channel(
          "services-providers-live"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "providers",
          },
          () => {
            void initialize();
          }
        )
        .subscribe();
    const categoryChannel =
      supabase
        .channel(
          "services-categories-live"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "service_categories",
          },
          () => {
            void initialize();
          }
        )
        .subscribe();
    return () => {
      mounted = false;
      window.removeEventListener(
        "master-providers-updated",
        handleProvidersUpdate
      );
      void supabase.removeChannel(
        providerChannel
      );
      void supabase.removeChannel(
        categoryChannel
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /*
   * ==========================================
   * MY LOCATION / MAP LOCATION PICKER
   * ==========================================
   */
  /*
   * ==========================================
   * BILLING-FREE LOCATION / MAP PICKER
   * Uses browser GPS + OpenStreetMap/Leaflet +
   * Nominatim reverse geocoding.
   * No Google Maps billing is required for this flow.
   * ==========================================
   */
  const reverseGeocodeOpenStreetMap = async (
    latitude: number,
    longitude: number
  ) => {
    const fallback = {
      latitude,
      longitude,
      address: "Current Location",
      city: "",
      pincode: "",
    };
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          latitude
        )}&lon=${encodeURIComponent(
          longitude
        )}&zoom=18&addressdetails=1`,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );
      if (!response.ok) {
        return fallback;
      }
      const data = await response.json();
      const address = data?.address || {};
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state_district ||
        "";
      const pincode = address.postcode || "";
      return {
        latitude,
        longitude,
        address: data?.display_name || fallback.address,
        city,
        pincode,
      };
    } catch (error) {
      console.error("OpenStreetMap reverse geocoding error:", error);
      return fallback;
    }
  };
  const searchOpenStreetMap = async (query: string) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=in&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
    if (!response.ok) {
      throw new Error("Location search failed");
    }
    const results = await response.json();
    if (!Array.isArray(results) || !results[0]) {
      throw new Error("Location not found");
    }
    const item = results[0];
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    const address = item.address || {};
    return {
      latitude,
      longitude,
      address: item.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      city:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state_district ||
        "",
      pincode: address.postcode || "",
    };
  };
  const searchLocationSuggestions = async (
    query: string
  ) => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setLocationSuggestions([]);
      setLocationSuggestionsLoading(false);
      return;
    }
    const requestId =
      ++locationSuggestionRequestRef.current;
    setLocationSuggestionsLoading(true);
    try {
      // Adding "India" makes PIN-code and Indian place searches
      // more reliable with Nominatim.
      const searchUrl =
        `https://nominatim.openstreetmap.org/search?` +
        `format=jsonv2&addressdetails=1&limit=8&countrycodes=in` +
        `&q=${encodeURIComponent(`${cleanQuery}, India`)}`;
      const response = await fetch(searchUrl, {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Location suggestions failed");
      }
      const results = await response.json();
      // Ignore stale responses from previous keystrokes.
      if (
        requestId !== locationSuggestionRequestRef.current
      ) {
        return;
      }
      if (!Array.isArray(results)) {
        setLocationSuggestions([]);
        return;
      }
      const suggestions = results
        .map((item: any) => {
          const address = item?.address || {};
          const city =
            address.city ||
            address.town ||
            address.municipality ||
            address.village ||
            address.county ||
            address.state_district ||
            "";
          const area =
            address.suburb ||
            address.neighbourhood ||
            address.quarter ||
            address.residential ||
            address.hamlet ||
            "";
          const pincode =
            address.postcode || "";
          const shortName =
            area && city
              ? `${area}, ${city}`
              : city ||
                area ||
                pincode ||
                item?.display_name ||
                cleanQuery;
          return {
            displayName:
              item?.display_name ||
              shortName,
            shortName,
            latitude: Number(item?.lat),
            longitude: Number(item?.lon),
            city,
            pincode,
          };
        })
        .filter(
          (item: {
            displayName: string;
            shortName: string;
            latitude: number;
            longitude: number;
            city: string;
            pincode: string;
          }) =>
            Number.isFinite(item.latitude) &&
            Number.isFinite(item.longitude)
        );
      setLocationSuggestions(suggestions);
    } catch (error) {
      console.error(
        "Location suggestion error:",
        error
      );
      if (
        requestId === locationSuggestionRequestRef.current
      ) {
        setLocationSuggestions([]);
      }
    } finally {
      if (
        requestId === locationSuggestionRequestRef.current
      ) {
        setLocationSuggestionsLoading(false);
      }
    }
  };
  useEffect(() => {
    const cleanLocation = location.trim();
    if (cleanLocation.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setLocationSuggestionsLoading(false);
      return;
    }
    setShowLocationSuggestions(true);
    const timer = window.setTimeout(() => {
      void searchLocationSuggestions(cleanLocation);
    }, 700);
    return () => {
      window.clearTimeout(timer);
    };
  }, [location]);
  const selectLocationSuggestion = (
    suggestion: {
      displayName: string;
      shortName: string;
      latitude: number;
      longitude: number;
      city: string;
      pincode: string;
    }
  ) => {
    const displayValue =
      suggestion.shortName ||
      suggestion.displayName;
    const selected = {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      address: suggestion.displayName,
      city: suggestion.city,
      pincode: suggestion.pincode,
    };
    // Put the selected place name/PIN into the location field.
    setLocation(displayValue);
    setSelectedLocationLabel(displayValue);
    // Close the suggestion list immediately.
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    // Open the map immediately at the selected location.
    // The fixed centre pin will stay in the middle while
    // the map moves underneath it, just like Swiggy-style
    // location selection.
    setDetectedLocation(selected);
    setSelectedMapLocation(selected);
    setLocationError("");
    setLocationModalOpen(true);
    // If the map is already open, move it there immediately.
    if (mapRef.current) {
      mapRef.current.setView(
        [
          suggestion.latitude,
          suggestion.longitude,
        ],
        16,
        {
          animate: true,
        }
      );
    }
  };
  const loadLeaflet = () => {
    return new Promise<any>((resolve, reject) => {
      if ((window as any).L) {
        resolve((window as any).L);
        return;
      }
      const existingScript = document.querySelector(
        'script[data-master-leaflet="true"]'
      ) as HTMLScriptElement | null;
      const finish = () => {
        if ((window as any).L) {
          resolve((window as any).L);
        } else {
          reject(new Error("Map library could not be loaded"));
        }
      };
      if (existingScript) {
        existingScript.addEventListener("load", finish, { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Map library could not be loaded")),
          { once: true }
        );
        return;
      }
      if (!document.querySelector('link[data-master-leaflet="true"]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        css.dataset.masterLeaflet = "true";
        document.head.appendChild(css);
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.defer = true;
      script.dataset.masterLeaflet = "true";
      script.onload = finish;
      script.onerror = () =>
        reject(new Error("Map library could not be loaded"));
      document.head.appendChild(script);
    });
  };
  const detectMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Your browser does not support location detection."
      );
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const selected = await reverseGeocodeOpenStreetMap(
          latitude,
          longitude
        );
        const humanValue = getHumanLocationValue(
          selected,
          "Current Location"
        );
        setDetectedLocation({
          ...selected,
          address: humanValue,
        });
        setSelectedMapLocation({
          ...selected,
          address: humanValue,
        });
        setSelectedLocationLabel(humanValue);
        // If the location picker map is already open, move the map
        // to the freshly detected GPS position. The red centre pin
        // stays fixed while the map moves underneath it.
        if (mapRef.current) {
          mapRef.current.flyTo(
            [latitude, longitude],
            17,
            {
              animate: true,
              duration: 0.8,
            }
          );
        }
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Location permission was denied. Please allow location access in your browser."
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError(
            "Your current location is unavailable. Please try again."
          );
        } else {
          setLocationError(
            "Location detection timed out. Please try again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };
  const openLocationPicker = () => {
    setLocationError("");
    setLocationModalOpen(true);
    detectMyLocation();
  };
  const getHumanLocationValue = (
    selected: {
      city?: string;
      pincode?: string;
      address?: string;
    },
    fallback = ""
  ) => {
    const pincode = String(selected.pincode || "").trim();
    if (pincode) {
      return pincode;
    }
    const city = String(selected.city || "").trim();
    if (city) {
      return city;
    }
    const address = String(selected.address || "").trim();
    const isCoordinates =
      /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(
        address
      ) ||
      /^Current location\s*\(/i.test(address) ||
      /^Selected location\s*\(/i.test(address);
    if (address && !isCoordinates) {
      return address;
    }
    return fallback.trim();
  };
  const useDetectedLocation = () => {
    const selected = selectedMapLocation || detectedLocation;
    if (!selected) return;
    const value = getHumanLocationValue(
      selected,
      selectedLocationLabel || "Selected Location"
    );
    // Keep coordinates separately for real distance sorting.
    localStorage.setItem(
      "masterUserLocationCoordinates",
      JSON.stringify({
        latitude: selected.latitude,
        longitude: selected.longitude,
      })
    );
    // Never put latitude/longitude into the search bar or URL.
    setLocation(value);
    setLocationModalOpen(false);
    setLocationError("");
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (value.trim()) params.set("location", value.trim());
    const queryString = params.toString();
    router.push(
      queryString ? `/?${queryString}` : "/",
      { scroll: false }
    );
    window.setTimeout(() => {
      document
        .getElementById("search-results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };
  const updateSelectedMapLocation = async (
    latitude: number,
    longitude: number
  ) => {
    const selected = await reverseGeocodeOpenStreetMap(
      latitude,
      longitude
    );
    const humanValue = getHumanLocationValue(
      selected,
      selectedLocationLabel || "Selected Location"
    );
    setSelectedMapLocation({
      ...selected,
      address:
        humanValue || selected.address,
    });
    if (humanValue) {
      setSelectedLocationLabel(humanValue);
    }
  };
  useEffect(() => {
    if (
      !locationModalOpen ||
      !detectedLocation ||
      !mapContainerRef.current
    ) {
      return;
    }
    let cancelled = false;
    const initializeMap = async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapContainerRef.current) return;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
          accuracyCircleRef.current = null;
        }
        const center: [number, number] = [
          detectedLocation.latitude,
          detectedLocation.longitude,
        ];
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView(center, 16);
        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }
        ).addTo(map);
        /*
         * SWIGGY-STYLE LOCATION PICKER
         *
         * The pin is NOT draggable.
         * The map moves underneath a fixed centre pin.
         *
         * The selected location is always the map centre.
         * Reverse geocoding runs only after the map stops moving.
         */
        map.on("movestart", () => {
          setLocationError("");
        });
        map.on("moveend", async () => {
          const position = map.getCenter();
          setSelectedMapLocation({
            latitude: position.lat,
            longitude: position.lng,
            address: `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`,
            city: "",
            pincode: "",
          });
          await updateSelectedMapLocation(
            position.lat,
            position.lng
          );
        });
        // Clicking the map smoothly recentres it on the clicked point.
        map.on("click", (event: any) => {
          map.panTo(event.latlng, {
            animate: true,
            duration: 0.35,
          });
        });
        mapRef.current = map;
        markerRef.current = null;
        accuracyCircleRef.current = null;
        setSelectedMapLocation(detectedLocation);
        window.setTimeout(() => {
          map.invalidateSize();
          map.setView(center, 16);
        }, 150);
      } catch (error) {
        console.error("Map initialization error:", error);
        if (!cancelled) {
          setLocationError(
            "Map could not be loaded. Please check your internet connection and try again."
          );
        }
      }
    };
    void initializeMap();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      accuracyCircleRef.current = null;
    };
  }, [
    locationModalOpen,
    detectedLocation?.latitude,
    detectedLocation?.longitude,
  ]);
  /*
   * ==========================================
   * FILTER SERVICES
   * ==========================================
   */
  const filteredCategories =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();
      if (!query) {
        return serviceCategories;
      }
      return serviceCategories.filter(
        (category) => {
          const serviceMatches =
            category.name
              .toLowerCase()
              .includes(query);
          const descriptionMatches =
            category.description
              ?.toLowerCase()
              .includes(query);
          const providerMatches =
            providers.some(
              (provider) => {
                const providerName =
                  provider.name
                    ?.toLowerCase() ||
                  "";
                const providerService =
                  provider.service
                    ?.toLowerCase() ||
                  "";
                const providerCity =
                  provider.city
                    ?.toLowerCase() ||
                  "";
                const providerArea =
                  provider.area
                    ?.toLowerCase() ||
                  "";
                const providerPin =
                  provider.pincode
                    ?.toLowerCase() ||
                  "";
                return (
                  providerService.includes(
                    query
                  ) ||
                  providerName.includes(
                    query
                  ) ||
                  providerCity.includes(
                    query
                  ) ||
                  providerArea.includes(
                    query
                  ) ||
                  providerPin.includes(
                    query
                  )
                );
              }
            );
          return (
            serviceMatches ||
            descriptionMatches ||
            providerMatches
          );
        }
      );
    }, [
      serviceCategories,
      providers,
      search,
    ]);
  /*
   * ==========================================
   * PROVIDER SEARCH RESULTS
   * ==========================================
   */
  const userCoordinates =
    selectedMapLocation || detectedLocation;
  const matchingProviders =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();
      const locationQuery =
        location.trim().toLowerCase();
      const filtered = providers.filter(
        (provider) => {
          const name =
            provider.name
              ?.toLowerCase() || "";
          const service =
            provider.service
              ?.toLowerCase() || "";
          const city =
            provider.city
              ?.toLowerCase() || "";
          const area =
            provider.area
              ?.toLowerCase() || "";
          const pincode =
            provider.pincode
              ?.toLowerCase() || "";
          const matchesSearch =
            !query ||
            name.includes(query) ||
            service.includes(query) ||
            city.includes(query) ||
            area.includes(query) ||
            pincode.includes(query);
          const hasUserCoordinates =
            Boolean(
              userCoordinates &&
                Number.isFinite(userCoordinates.latitude) &&
                Number.isFinite(userCoordinates.longitude)
            );
          const matchesLocation =
            !locationQuery ||
            (sortBy === "distance" && hasUserCoordinates) ||
            city.includes(locationQuery) ||
            area.includes(locationQuery) ||
            pincode.includes(locationQuery);
          return (
            matchesSearch &&
            matchesLocation
          );
        }
      );
      const parseNumber = (
        value?: string
      ) => {
        const match = String(value || "")
          .replace(/,/g, "")
          .match(/(\d+(?:\.\d+)?)/);
        return match
          ? Number(match[1])
          : 0;
      };
      const parseExperience = (
        value?: string
      ) => {
        return parseNumber(value);
      };
      const parsePrice = (
        value?: string
      ) => {
        return parseNumber(value);
      };
      const getRating = (
        provider: Provider
      ) => {
        return (
          providerRatings[
            String(provider.id)
          ]?.average || 0
        );
      };
      const getReviewCount = (
        provider: Provider
      ) => {
        return (
          providerRatings[
            String(provider.id)
          ]?.total || 0
        );
      };
      const getLocationMatchScore = (
        provider: Provider
      ) => {
        if (!locationQuery) return 0;
        const city =
          provider.city
            ?.toLowerCase() || "";
        const area =
          provider.area
            ?.toLowerCase() || "";
        const pincode =
          provider.pincode
            ?.toLowerCase() || "";
        if (
          area === locationQuery ||
          pincode === locationQuery
        ) {
          return 3;
        }
        if (area.includes(locationQuery)) {
          return 2;
        }
        if (city.includes(locationQuery)) {
          return 1;
        }
        return 0;
      };
      const sorted = [...filtered].sort(
        (a, b) => {
          if (sortBy === "rating") {
            const ratingDifference =
              getRating(b) - getRating(a);
            if (
              Math.abs(ratingDifference) >
              0.001
            ) {
              return ratingDifference;
            }
            return (
              getReviewCount(b) -
              getReviewCount(a)
            );
          }
          if (
            sortBy === "experience"
          ) {
            return (
              parseExperience(
                b.experience
              ) -
              parseExperience(
                a.experience
              )
            );
          }
          if (sortBy === "priceLow") {
            const aPrice =
              parsePrice(a.price);
            const bPrice =
              parsePrice(b.price);
            if (aPrice === 0 && bPrice !== 0)
              return 1;
            if (bPrice === 0 && aPrice !== 0)
              return -1;
            return aPrice - bPrice;
          }
          if (sortBy === "priceHigh") {
            const aPrice =
              parsePrice(a.price);
            const bPrice =
              parsePrice(b.price);
            if (aPrice === 0 && bPrice !== 0)
              return 1;
            if (bPrice === 0 && aPrice !== 0)
              return -1;
            return bPrice - aPrice;
          }
          if (sortBy === "distance") {
            if (
              !userCoordinates ||
              !Number.isFinite(userCoordinates.latitude) ||
              !Number.isFinite(userCoordinates.longitude)
            ) {
              return (
                getLocationMatchScore(b) -
                getLocationMatchScore(a)
              );
            }
            const distanceA =
              a.latitude == null || a.longitude == null
                ? Number.POSITIVE_INFINITY
                : calculateDistanceKm(
                    userCoordinates.latitude,
                    userCoordinates.longitude,
                    a.latitude,
                    a.longitude
                  );
            const distanceB =
              b.latitude == null || b.longitude == null
                ? Number.POSITIVE_INFINITY
                : calculateDistanceKm(
                    userCoordinates.latitude,
                    userCoordinates.longitude,
                    b.latitude,
                    b.longitude
                  );
            return distanceA - distanceB;
          }
          return 0;
        }
      );
      return sorted.slice(0, 6);
    }, [
      providers,
      search,
      location,
      providerRatings,
      sortBy,
      selectedMapLocation,
      detectedLocation,
      userCoordinates,
    ]);
  /*
   * ==========================================
   * PROVIDER RESULTS MAP
   * ==========================================
   * The existing location picker map above is kept
   * completely separate. This map is only for
   * browsing provider results.
   */
  useEffect(() => {
    if (
      providerViewMode !== "map" ||
      loading ||
      !resultsMapContainerRef.current
    ) {
      return;
    }
    let cancelled = false;
    const initializeResultsMap = async () => {
      try {
        const L = await loadLeaflet();
        if (
          cancelled ||
          !resultsMapContainerRef.current
        ) {
          return;
        }
        if (resultsMapRef.current) {
          resultsMapRef.current.remove();
          resultsMapRef.current = null;
        }
        resultsMarkersRef.current = [];
        const providersWithCoordinates =
          matchingProviders.filter(
            (provider) =>
              provider.latitude != null &&
              provider.longitude != null &&
              Number.isFinite(
                Number(provider.latitude)
              ) &&
              Number.isFinite(
                Number(provider.longitude)
              )
          );
        const hasUserCoordinates =
          Boolean(
            userCoordinates &&
              Number.isFinite(
                userCoordinates.latitude
              ) &&
              Number.isFinite(
                userCoordinates.longitude
              )
          );
        const firstProvider =
          providersWithCoordinates[0];
        const center: [number, number] =
          hasUserCoordinates
            ? [
                userCoordinates!.latitude,
                userCoordinates!.longitude,
              ]
            : firstProvider
              ? [
                  Number(firstProvider.latitude),
                  Number(firstProvider.longitude),
                ]
              : [23.7957, 86.4304];
        const map = L.map(
          resultsMapContainerRef.current,
          {
            zoomControl: true,
            attributionControl: true,
          }
        ).setView(center, hasUserCoordinates ? 13 : 12);
        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              "&copy; OpenStreetMap contributors",
          }
        ).addTo(map);
        if (hasUserCoordinates) {
          const userMarker =
            L.circleMarker(
              [
                userCoordinates!.latitude,
                userCoordinates!.longitude,
              ],
              {
                radius: 9,
                color: "#2563eb",
                weight: 3,
                fillColor: "#60a5fa",
                fillOpacity: 0.95,
              }
            ).addTo(map);
          userMarker.bindPopup(
            "<strong>Your selected location</strong>"
          );
          resultsMarkersRef.current.push(
            userMarker
          );
        }
        providersWithCoordinates.forEach(
          (provider) => {
            const marker = L.marker([
              Number(provider.latitude),
              Number(provider.longitude),
            ]).addTo(map);
            const safeName =
              String(
                provider.name ||
                  "Service Provider"
              ).replace(
                /[&<>"']/g,
                (character) =>
                  ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                  })[character] || character
              );
            const safeService =
              String(
                provider.service || "Service"
              ).replace(
                /[&<>"']/g,
                (character) =>
                  ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                  })[character] || character
              );
            let distanceText = "";
            if (
              hasUserCoordinates &&
              provider.latitude != null &&
              provider.longitude != null
            ) {
              distanceText =
                formatDistanceAway(
                  calculateDistanceKm(
                    userCoordinates!.latitude,
                    userCoordinates!.longitude,
                    Number(provider.latitude),
                    Number(provider.longitude)
                  )
                );
            }
            const safeMobile = String(provider.mobile || "").replace(/[^\d+]/g, "");
            const safeId = encodeURIComponent(String(provider.id || ""));
            marker.bindPopup(
              `<div style="min-width:190px;padding:4px">
                <strong style="font-size:13px;color:#0f172a">${safeName}</strong>
                <div style="margin-top:2px;color:#475569;font-size:12px">${safeService}</div>
                ${
                  distanceText
                    ? `<div style="margin-top:3px;color:#2563eb;font-weight:600;font-size:11px">${distanceText}</div>`
                    : ""
                }
                <div style="margin-top:8px;display:flex;gap:6px;align-items:center">
                  ${
                    safeMobile
                      ? `<a href="tel:${safeMobile}" style="display:inline-flex;align-items:center;gap:4px;padding:4px 9px;background:#059669;color:#ffffff;border-radius:6px;font-size:11px;font-weight:bold;text-decoration:none">📞 Call</a>`
                      : ""
                  }
                  <a href="/provider/${safeId}" style="display:inline-block;padding:4px 9px;background:#2563eb;color:#ffffff;border-radius:6px;font-size:11px;font-weight:bold;text-decoration:none">View Profile</a>
                </div>
              </div>`
            );
            resultsMarkersRef.current.push(
              marker
            );
          }
        );
        if (
          providersWithCoordinates.length > 1
        ) {
          const bounds =
            L.latLngBounds(
              providersWithCoordinates.map(
                (provider) => [
                  Number(provider.latitude),
                  Number(provider.longitude),
                ]
              )
            );
          if (hasUserCoordinates) {
            bounds.extend([
              userCoordinates!.latitude,
              userCoordinates!.longitude,
            ]);
          }
          map.fitBounds(bounds, {
            padding: [35, 35],
            maxZoom: 15,
          });
        }
        resultsMapRef.current = map;
        window.setTimeout(() => {
          if (!cancelled) {
            map.invalidateSize();
          }
        }, 150);
      } catch (error) {
        console.error(
          "Provider results map initialization error:",
          error
        );
      }
    };
    void initializeResultsMap();
    return () => {
      cancelled = true;
      if (resultsMapRef.current) {
        resultsMapRef.current.remove();
        resultsMapRef.current = null;
      }
      resultsMarkersRef.current = [];
    };
  }, [
    providerViewMode,
    loading,
    matchingProviders,
    userCoordinates?.latitude,
    userCoordinates?.longitude,
  ]);
  const searchLocationOnMap = async () => {
    const query = location.trim();
    if (!query) {
      detectMyLocation();
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    try {
      const selected = await searchOpenStreetMap(query);
      setDetectedLocation(selected);
      setSelectedMapLocation(selected);
      if (mapRef.current) {
        mapRef.current.setView(
          [selected.latitude, selected.longitude],
          16
        );
      }
    } catch (error) {
      console.error("OpenStreetMap location search error:", error);
      setLocationError(
        "Location not found. Please try another area, landmark or PIN code."
      );
    } finally {
      setLocationLoading(false);
    }
  };
  /*
   * ==========================================
   * SEARCH
   * ==========================================
   */
  const runSearch = () => {
    setShowLocationSuggestions(false);
    const cleanSearch =
      search.trim();
    const cleanLocation =
      location.trim();
    const params =
      new URLSearchParams();
    if (cleanSearch) {
      params.set(
        "search",
        cleanSearch
      );
    }
    if (cleanLocation) {
      params.set(
        "location",
        cleanLocation
      );
    }
    const queryString =
      params.toString();
    const targetUrl = queryString
      ? `/?${queryString}`
      : "/";
    router.push(targetUrl, { scroll: false });
    window.setTimeout(() => {
      document
        .getElementById("search-results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
  const clearSearch = () => {
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
    setSearch("");
    setLocation("");
    setAiProblem("");
    setAiSuggestion("");
    setShowAllServices(false);
    setSortBy("recommended");
    router.push("/", { scroll: false });
  };
  /*
   * ==========================================
   * AI ASSISTANT
   * ==========================================
   */
  const askAiAssistant = () => {
    const problem =
      aiProblem.trim();
    if (!problem) {
      setAiSuggestion("");
      return;
    }
    setAiLoading(true);
    setTimeout(() => {
      const suggestion =
        findSuggestedService(
          problem,
          serviceCategories
        );
      setAiSuggestion(
        suggestion || "Other"
      );
      setAiLoading(false);
    }, 300);
  };
  /*
   * ==========================================
   * SHOW SERVICES
   * ==========================================
   */
  const visibleCategories =
    showAllServices
      ? filteredCategories
      : filteredCategories.slice(
          0,
          4
        );
  const hiddenServiceCount =
    Math.max(
      filteredCategories.length - 4,
      0
    );
  return (
    <main className="min-h-screen bg-gray-50">
      {/* =========================================
          HERO (AGENCY-GRADE AMBIENT LIGHTING)
      ========================================= */}
      <section className="relative overflow-hidden bg-slate-950 px-4 py-14 text-white sm:py-20">
        {/* AMBIENT RADIAL LIGHTING */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[450px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-600/25 via-indigo-600/20 to-cyan-500/20 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-6xl text-center">
          {/* MICRO-EYEBROW PILL */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-300 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <SparklesIcon className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span>Master App Marketplace</span>
          </div>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-balance">
            Find the Right{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              Verified Specialist
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base font-normal">
            Search verified local tradespeople, compare transparent pricing, and book on-demand experts near you.
          </p>

          {/* SEARCH CONSOLE (DOUBLE-BEZEL HARDWARE AESTHETIC) */}
          <div className="mx-auto mt-9 max-w-4xl rounded-2xl bg-gradient-to-b from-white/20 to-white/5 p-1 shadow-2xl backdrop-blur-xl ring-1 ring-white/20">
            <div className="flex flex-col gap-2 rounded-xl bg-white p-2 shadow-inner md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center px-3">
                <SearchIcon className="h-5 w-5 text-slate-400 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      runSearch();
                    }
                  }}
                  placeholder="Search plumber, electrician, carpenter..."
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium sm:text-base"
                />
              </div>

              <div className="hidden h-8 w-px bg-slate-200 md:block" />

              <div className="flex min-w-0 flex-1 items-center border-t border-slate-100 pt-2 px-1 md:border-t-0 md:pt-0">
                <button
                  type="button"
                  onClick={openLocationPicker}
                  aria-label="Use my location"
                  title="Detect my current GPS location"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 active:scale-95"
                >
                  <CrosshairIcon className="h-5 w-5 text-blue-600" />
                </button>
                <div
                  ref={locationSearchRef}
                  className="relative min-w-0 flex-1"
                >
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onFocus={() => {
                      if (location.trim().length >= 2) {
                        setShowLocationSuggestions(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setShowLocationSuggestions(false);
                        runSearch();
                      }
                      if (e.key === "Escape") {
                        setShowLocationSuggestions(false);
                      }
                    }}
                    placeholder="Area, Landmark or PIN"
                    className="w-full bg-transparent px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium sm:text-base"
                  />
                  {showLocationSuggestions &&
                    location.trim().length >= 2 && (
                      <div className="absolute left-0 right-0 top-full z-[1000] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl ring-1 ring-slate-900/10">
                        {locationSuggestionsLoading ? (
                          <div className="flex items-center gap-2 px-4 py-3.5 text-xs text-slate-500 font-medium">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            Searching verified locations...
                          </div>
                        ) : locationSuggestions.length > 0 ? (
                          <div className="max-h-72 overflow-y-auto py-1">
                            {locationSuggestions.map(
                              (suggestion, index) => (
                                <button
                                  key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => selectLocationSuggestion(suggestion)}
                                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-blue-50/70"
                                >
                                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-slate-900">
                                      {suggestion.shortName}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                                      {suggestion.displayName}
                                    </span>
                                  </span>
                                </button>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-xs text-slate-500">
                            No location matches found
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>

              <button
                type="button"
                onClick={runSearch}
                className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:brightness-110 active:scale-98"
              >
                Search
              </button>
            </div>
          </div>

          {/* POPULAR CHIPS */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-slate-400">Popular:</span>
            {[
              "Electrician",
              "Plumber",
              "AC Repair",
              "Carpenter",
              "Painter",
            ].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSearch(item);
                  router.push(
                    `/?search=${encodeURIComponent(item)}`,
                    { scroll: false }
                  );
                  window.setTimeout(() => {
                    document
                      .getElementById("search-results")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                  }, 50);
                }}
                className="rounded-full border border-slate-700/80 bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-md transition hover:border-cyan-400/50 hover:bg-slate-800 hover:text-white"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
          COMPACT AI ASSISTANT
      ========================================= */}
      <section className="mx-auto max-w-6xl px-4 pt-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md">
          {/* AI HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                    Smart AI Service Assistant
                  </h2>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                    Instant
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Describe what went wrong in plain English or Hindi to instantly find the right verified specialist.
                </p>
              </div>
            </div>
            <Link
              href="/ai-assistant"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-xs transition hover:bg-blue-50 hover:text-blue-800"
            >
              <span>Open Full AI Copilot</span>
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          {/* AI BODY */}
          <div className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr]">
            {/* INPUT */}
            <div className="flex flex-col justify-between">
              <div>
                <textarea
                  value={aiProblem}
                  onChange={(e) => setAiProblem(e.target.value)}
                  placeholder="e.g., Tap leaking under the sink, circuit breaker tripping when AC starts, door lock jammed..."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                {/* QUICK CHIPS */}
                <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
                  <span className="mr-1 self-center text-[11px] text-slate-400">Try:</span>
                  {[
                    "Tap leaking water",
                    "AC warm air",
                    "Switch sparking",
                  ].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setAiProblem(quick)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={askAiAssistant}
                disabled={aiLoading || !aiProblem.trim()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Diagnosing Service...</span>
                  </>
                ) : (
                  <>
                    <span>Diagnose Problem with AI</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
            {/* RESULT */}
            <div className="flex min-h-[110px] items-center justify-center rounded-xl border border-dashed border-blue-200/80 bg-blue-50/40 p-4">
              {!aiSuggestion ? (
                <div className="text-center">
                  <div className="flex justify-center text-blue-600">
                    <SparklesIcon className="h-6 w-6 text-blue-600 opacity-80" />
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-800">
                    Instant Diagnostic Ready
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Type a problem above or pick a sample chip to see immediate results.
                  </p>
                </div>
              ) : (
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TradeBadgeContainer serviceName={aiSuggestion} size="md" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                        Recommended Specialist
                      </p>
                      <h3 className="truncate font-bold text-slate-900 sm:text-lg">
                        {aiSuggestion}
                      </h3>
                    </div>
                  </div>
                  <Link
                    href={`/services/${slugify(aiSuggestion)}`}
                    className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
                  >
                    View Providers →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {/* =========================================
          LOADING
      ========================================= */}
      {loading && (
        <section className="mx-auto max-w-6xl px-4 pt-6">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="text-3xl">
              ⏳
            </div>
            <p className="mt-2 font-medium text-gray-600">
              Loading services...
            </p>
          </div>
        </section>
      )}
      {/* =========================================
          SEARCH RESULTS
      ========================================= */}
      {!loading &&
        (search.trim() ||
          location.trim()) && (
          <section
            id="search-results"
            className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-7"
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Search Results
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {search.trim()
                    ? `Results for "${search.trim()}"`
                    : "Providers near you"}
                  {location.trim()
                    ? ` in ${location.trim()}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="provider-sort"
                  className="text-sm font-semibold text-gray-600"
                >
                  Sort by:
                </label>
                <select
                  id="provider-sort"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as SortOption
                    )
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="recommended">
                    Recommended
                  </option>
                  <option value="distance">
                    Nearest
                  </option>
                  <option value="rating">
                    Highest Rated
                  </option>
                  <option value="experience">
                    Most Experienced
                  </option>
                  <option value="priceLow">
                    Price: Low to High
                  </option>
                  <option value="priceHigh">
                    Price: High to Low
                  </option>
                </select>
                {/* MAP / LIST TOGGLE */}
                <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setProviderViewMode("list")
                    }
                    aria-pressed={
                      providerViewMode === "list"
                    }
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                      providerViewMode === "list"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    ☰ List
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setProviderViewMode("map")
                    }
                    aria-pressed={
                      providerViewMode === "map"
                    }
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                      providerViewMode === "map"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    📍 Map
                  </button>
                </div>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white"
                >
                  Clear Search
                </button>
              </div>
            </div>
            {matchingProviders.length >
            0 ? (
              providerViewMode === "map" ? (
                <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        Providers on Map
                      </p>
                      <p className="text-xs text-gray-500">
                        Tap a marker to see provider details.
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {matchingProviders.filter(
                        (provider) =>
                          provider.latitude != null &&
                          provider.longitude != null
                      ).length}{" "}
                      mapped
                    </span>
                  </div>
                  <div className="relative h-[420px] w-full sm:h-[520px]">
                    <div
                      ref={resultsMapContainerRef}
                      className="absolute inset-0 h-full w-full"
                    />
                    {matchingProviders.every(
                      (provider) =>
                        provider.latitude == null ||
                        provider.longitude == null
                    ) && (
                      <div className="absolute inset-0 z-[600] flex items-center justify-center bg-white/90 p-6 text-center backdrop-blur-[2px]">
                        <div className="max-w-sm">
                          <div className="text-4xl">
                            📍
                          </div>
                          <p className="mt-3 font-bold text-gray-900">
                            Map location is not available
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            These providers do not have latitude/longitude saved yet.
                            Switch to List view to see all providers.
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setProviderViewMode("list")
                            }
                            className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            View List
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
              <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matchingProviders.map(
                  (provider) => (
                    <div
                      key={provider.id}
                      className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
                    >
                      {/* CARD HEADER */}
                      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-white p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <TradeBadgeContainer serviceName={provider.service} size="md" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="truncate text-base font-bold text-slate-900 transition-colors group-hover:text-blue-600">
                                  {provider.name || "Service Provider"}
                                </h3>
                                <VerifiedBadge />
                              </div>
                              <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200/60">
                                <span className="truncate">{provider.service}</span>
                              </span>
                            </div>
                          </div>
                          <OnlineStatusDot online={provider.availability === "Available"} />
                        </div>
                      </div>
                      {/* CARD DETAILS */}
                      <div className="p-5">
                        {provider.city && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="min-w-0 truncate font-medium">
                              {provider.area ? `${provider.area}, ` : ""}
                              {provider.city}
                              {provider.pincode ? ` - ${provider.pincode}` : ""}
                            </span>
                          </div>
                        )}
                        {userCoordinates &&
                          provider.latitude != null &&
                          provider.longitude != null && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200/50">
                              <MapPinIcon className="h-3 w-3" />
                              <span>
                                {formatDistanceAway(
                                  calculateDistanceKm(
                                    userCoordinates.latitude,
                                    userCoordinates.longitude,
                                    provider.latitude,
                                    provider.longitude
                                  )
                                )}
                              </span>
                            </div>
                          )}
                        {(() => {
                          const rating =
                            providerRatings[String(provider.id)];
                          if (!rating || rating.total === 0) {
                            return (
                              <button
                                type="button"
                                onClick={() => void openProviderReviews(provider)}
                                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-blue-600"
                              >
                                <StarIcon className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                                <span>New · Verified Partner</span>
                              </button>
                            );
                          }
                          return (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <StarIcon
                                    key={i}
                                    className={`h-3.5 w-3.5 ${
                                      i < Math.round(rating.average)
                                        ? "text-amber-400 fill-amber-400"
                                        : "text-slate-200 fill-slate-200"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-bold text-slate-900">
                                {rating.average.toFixed(1)}
                              </span>
                              <button
                                type="button"
                                onClick={() => void openProviderReviews(provider)}
                                className="cursor-pointer text-slate-500 underline decoration-slate-300 underline-offset-2 transition hover:text-blue-600 hover:decoration-blue-500"
                              >
                                ({rating.total}{" "}
                                {rating.total === 1 ? "review" : "reviews"})
                              </button>
                            </div>
                          );
                        })()}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {provider.experience && (
                            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Experience
                              </p>
                              <p className="mt-0.5 flex items-center truncate text-xs font-bold text-slate-800">
                                <BriefcaseIcon className="mr-1 h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {provider.experience}
                              </p>
                            </div>
                          )}
                          {provider.price && (
                            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Starting At
                              </p>
                              <p className="mt-0.5 flex items-center truncate text-xs font-bold text-slate-800">
                                <CurrencyRupeeIcon className="mr-0.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {provider.price}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex gap-2">
                          {provider.mobile && (
                            <a
                              href={`tel:${provider.mobile}`}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-center text-xs font-bold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 hover:border-emerald-400 active:scale-98"
                              title={`Call ${provider.name}: ${provider.mobile}`}
                            >
                              <PhoneIcon className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Call</span>
                            </a>
                          )}
                          <Link
                            href={`/provider/${provider.id}`}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700"
                          >
                            View Profile
                          </Link>
                          <Link
                            href={`/provider/${provider.id}/book`}
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-center text-xs font-bold text-white shadow-xs shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-98"
                          >
                            <span>Book Now</span>
                            <ArrowUpRightIcon className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
              )
            ) : (
              <div className="mb-8 rounded-2xl border bg-white p-6 text-center shadow-sm">
                <div className="text-3xl">
                  🔎
                </div>
                <p className="mt-2 font-semibold text-gray-800">
                  No matching providers found
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Try another service, provider
                  name, city, area or PIN code.
                </p>
              </div>
            )}
          </section>
        )}
      {/* =========================================
          SERVICES
      ========================================= */}
      {!loading && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Explore Services
              </p>
              <h2 className="mt-1 text-3xl font-bold text-gray-900">
                {search.trim()
                  ? "Matching Services"
                  : "All Services"}
              </h2>
              <p className="mt-1 text-gray-500">
                Choose a service and find
                professionals available near you.
              </p>
            </div>
            <span className="hidden rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 sm:block">
              {filteredCategories.length}{" "}
              Services
            </span>
          </div>
          {filteredCategories.length >
          0 ? (
            <>
              {/* SERVICE CARDS */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleCategories.map(
                  (category) => (
                    <Link
                      key={category.id || category.name}
                      href={`/services/${slugify(category.name)}`}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <TradeBadgeContainer serviceName={category.name} size="md" />
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              category.count > 0
                                ? "bg-slate-100 text-slate-700"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50"
                            }`}
                          >
                            {category.count}{" "}
                            {category.count === 1 ? "Expert" : "Experts"}
                          </span>
                        </div>
                        <h3 className="mt-5 text-base font-bold text-slate-900 transition-colors group-hover:text-blue-600">
                          {category.name}
                        </h3>
                        <p className="mt-1.5 min-h-[38px] text-xs leading-relaxed text-slate-500">
                          {category.description ||
                            `Find and book verified ${category.name.toLowerCase()} services.`}
                        </p>
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                        <span className="flex items-center gap-1 text-xs font-bold text-blue-600 transition-colors group-hover:text-blue-700">
                          <span>View Providers</span>
                          <span className="transition-transform group-hover:translate-x-1">→</span>
                        </span>
                        {category.count === 0 && (
                          <span className="text-[11px] font-medium text-slate-400">
                            Onboarding
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                )}
              </div>
              {/* SHOW MORE */}
              {filteredCategories.length > 4 && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAllServices(!showAllServices)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 active:scale-98"
                  >
                    {showAllServices
                      ? "Show Less Categories ↑"
                      : `Browse All Categories (${hiddenServiceCount} more) ↓`}
                  </button>
                  {!showAllServices && (
                    <p className="text-xs text-slate-400">
                      Showing primary 4 categories
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl border bg-white px-6 py-16 text-center shadow-sm">
              <div className="flex justify-center text-slate-400">
                <SearchIcon className="h-12 w-12 text-slate-300" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-gray-900">
                No services found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-gray-500">
                We could not find a service matching your search. Try another service, provider name, or city.
              </p>
              <button
                type="button"
                onClick={clearSearch}
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                View All Services
              </button>
            </div>
          )}
        </section>
      )}
      {/* =========================================
          HOW IT WORKS
      ========================================= */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
              Simple & Transparent
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              How Master App Works
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
              Effortlessly book verified local technicians with full transparent pricing and live booking tracking.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md">
              <span className="font-mono text-xs font-black uppercase tracking-widest text-blue-600">
                Step 01
              </span>
              <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <SearchIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                1. Select Service or Issue
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
                Browse popular categories or describe your repair problem to our smart AI assistant for an instant recommendation.
              </p>
            </div>
            <div className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md">
              <span className="font-mono text-xs font-black uppercase tracking-widest text-indigo-600">
                Step 02
              </span>
              <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <BriefcaseIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                2. Choose Verified Professional
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
                Compare ratings, reviews, proximity, and starting prices. Schedule a convenient service time slot.
              </p>
            </div>
            <div className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md">
              <span className="font-mono text-xs font-black uppercase tracking-widest text-emerald-600">
                Step 03
              </span>
              <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheckIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                3. Direct Service & Review
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
                Your professional arrives, performs high-quality work, and you pay directly with zero hidden middleman fees.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* =========================================
          PROVIDER CTA
      ========================================= */}
      <section className="border-t border-slate-200/80 bg-white px-4 py-16">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-6 py-12 text-center text-white shadow-xl ring-1 ring-white/10 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-300">
              <BriefcaseIcon className="h-3.5 w-3.5 text-blue-300" />
              <span>For Technicians & Contractors</span>
            </span>
            <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl lg:text-4xl">
              Are you a skilled service professional?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Join the fastest-growing local verified technician network. Get direct customer leads, build your reputation, and grow your independent business.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/provider/register"
                className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-400 hover:to-indigo-500 active:scale-98"
              >
                Register as a Provider →
              </Link>
              <Link
                href="/provider/login"
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-7 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
              >
                Provider Login
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* =========================================
          FOOTER
      ========================================= */}
      <footer className="bg-white px-4 py-7">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-gray-500 md:flex-row">
          <div>
            © {new Date().getFullYear()}{" "}
            Master App. All rights reserved.
          </div>
          <div className="flex gap-5">
            <Link
              href="/"
              className="hover:text-blue-600"
            >
              Home
            </Link>
            <Link
              href="/services"
              className="hover:text-blue-600"
            >
              Services
            </Link>
            <Link
              href="/provider/register"
              className="hover:text-blue-600"
            >
              Become a Provider
            </Link>
          </div>
        </div>
      </footer>
      {/* =========================================
          GOOGLE-MAPS STYLE LOCATION PICKER
      ========================================= */}
      {/* =========================================
          CUSTOMER REVIEWS MODAL
      ========================================= */}
      {reviewModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-reviews-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setReviewModal(null);
            }
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2
                  id="customer-reviews-title"
                  className="text-xl font-bold text-gray-900"
                >
                  Customer Reviews
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Reviews for{" "}
                  <span className="font-semibold text-gray-800">
                    {reviewModal.provider.name}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close reviews"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {reviewModal.loading ? (
                <div className="py-10 text-center text-gray-500">
                  Loading reviews...
                </div>
              ) : reviewModal.reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <div className="text-3xl">⭐</div>
                  <p className="mt-3 font-semibold text-gray-900">
                    No published reviews yet
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    This provider has not received a published customer review.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewModal.reviews.map(
                    (review) => {
                      const safeRating =
                        Math.max(
                          0,
                          Math.min(
                            5,
                            Math.round(
                              review.rating
                            )
                          )
                        );
                      return (
                        <div
                          key={review.id}
                          className="rounded-xl border bg-gray-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="tracking-tight text-yellow-400">
                                {"★".repeat(
                                  safeRating
                                )}
                                <span className="text-gray-300">
                                  {"★".repeat(
                                    5 -
                                      safeRating
                                  )}
                                </span>
                              </span>
                              <span className="font-semibold text-gray-800">
                                {review.rating}/5
                              </span>
                            </div>
                            {review.created_at && (
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  review.created_at
                                ).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-gray-700">
                            {review.comment ||
                              "Customer left a rating without a written comment."}
                          </p>
                          <p className="mt-3 text-xs font-medium text-green-700">
                            ✓ Published customer review
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {locationModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
                  <svg viewBox="0 0 24 24" className="h-7 w-7">
                    <path
                      fill="#4285F4"
                      d="M12 2.1c-4.05 0-7.34 3.27-7.34 7.3 0 5.48 7.34 12.5 7.34 12.5s7.34-7.02 7.34-12.5c0-4.03-3.29-7.3-7.34-7.3Z"
                    />
                    <circle cx="12" cy="9.35" r="2.75" fill="#EA4335" />
                    <circle cx="12" cy="9.35" r="1.35" fill="#fff" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                    Select Your Location
                  </h2>
                  <p className="text-xs text-gray-500 sm:text-sm">
                    Detect your location and confirm it before searching.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-gray-100"
                aria-label="Close location picker"
              >
                ×
              </button>
            </div>
            {/* SEARCH / CURRENT LOCATION BAR */}
            <div className="border-b bg-white p-3 sm:p-4">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                <span className="text-lg">🔎</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void searchLocationOnMap();
                    }
                  }}
                  placeholder="Search area, landmark or PIN code"
                  className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => void searchLocationOnMap()}
                  disabled={locationLoading}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                >
                  {locationLoading ? "Locating..." : "Search"}
                </button>
              </div>
            </div>
            {/* MAP */}
            <div className="relative h-[330px] overflow-hidden bg-gray-200 sm:h-[400px]">
              {detectedLocation ? (
                <>
                  <div
                    ref={mapContainerRef}
                    className="absolute inset-0 z-0 h-full w-full"
                  />
                  {/* Fixed centre pin — the map moves underneath it. */}
                  <div
                  className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-[100%]"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 48 64"
                    className="h-14 w-11 drop-shadow-lg"
                  >
                    <path
                      d="M24 2C12.4 2 3 11.2 3 22.5 3 38.2 24 62 24 62s21-23.8 21-39.5C45 11.2 35.6 2 24 2Z"
                      fill="#EA4335"
                    />
                    <circle
                      cx="24"
                      cy="22"
                      r="8"
                      fill="#fff"
                    />
                    <circle
                      cx="24"
                      cy="22"
                      r="4"
                      fill="#4285F4"
                    />
                  </svg>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-gray-100 to-green-50 px-6 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow">
                    📍
                  </div>
                  <p className="font-semibold text-gray-800">
                    {locationLoading
                      ? "Detecting your location..."
                      : "Tap My Location to find your current position"}
                  </p>
                </div>
              )}
              {/* MAP CONTROLS */}
              <button
                type="button"
                onClick={detectMyLocation}
                disabled={locationLoading}
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-lg hover:bg-gray-50 disabled:opacity-50"
                title="Detect my location"
              >
                ◎
              </button>
              <div className="absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-[10px] font-medium text-gray-600 shadow">
                OpenStreetMap • Move the map to adjust the pin • No billing required
              </div>
            </div>
            {/* LOCATION DETAILS */}
            <div className="border-t bg-white p-4 sm:p-5">
              {locationError && (
                <div className="mb-3 rounded-xl bg-orange-50 px-3 py-2.5 text-sm text-orange-700">
                  {locationError}
                </div>
              )}
              {(selectedMapLocation || detectedLocation) ? (
                <>
                  <div className="flex gap-3">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                      📍
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500">
                        Selected Location
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 sm:text-base">
                        {(selectedMapLocation || detectedLocation)!.address}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Lat: {(selectedMapLocation || detectedLocation)!.latitude.toFixed(6)} • Lng: {(selectedMapLocation || detectedLocation)!.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={useDetectedLocation}
                    className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99]"
                  >
                    Use This Location
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={detectMyLocation}
                  disabled={locationLoading}
                  className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {locationLoading
                    ? "Detecting Location..."
                    : "📍 Detect My Location"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
export default function HomePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-50" />}>
      <ServicesPageContent />
    </Suspense>
  );
}
