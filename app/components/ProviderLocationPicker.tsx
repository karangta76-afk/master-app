"use client";
import { useEffect, useRef, useState } from "react";
type LocationValue = {
  latitude: number;
  longitude: number;
  address: string;
  state: string;
  city: string;
  area: string;
  pincode: string;
};
type Suggestion = LocationValue & {
  displayName: string;
  shortName: string;
};
type Props = {
  open: boolean;
  onClose: () => void;
  initialLocation?: Partial<LocationValue> | null;
  onSelect: (location: LocationValue) => void;
};
const DEFAULT: LocationValue = {
  latitude: 23.3441,
  longitude: 85.3096,
  address: "",
  state: "",
  city: "",
  area: "",
  pincode: "",
};
const num = (v: unknown, fallback: number) => {
  const n =
    typeof v === "number"
      ? v
      : Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
};
const normalize = (
  v?: Partial<LocationValue> | null
): LocationValue => ({
  latitude: num(v?.latitude, DEFAULT.latitude),
  longitude: num(v?.longitude, DEFAULT.longitude),
  address: String(v?.address ?? ""),
  state: String(v?.state ?? ""),
  city: String(v?.city ?? ""),
  area: String(v?.area ?? ""),
  pincode: String(v?.pincode ?? ""),
});
const validCoords = (
  v?: Partial<LocationValue> | null
) => {
  const lat = Number(v?.latitude);
  const lng = Number(v?.longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};
export default function ProviderLocationPicker({
  open,
  onClose,
  initialLocation,
  onSelect,
}: Props) {
  const mapContainerRef =
    useRef<HTMLDivElement | null>(null);
  const searchAreaRef =
    useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const suppressSuggestionsRef =
    useRef(false);
  const [location, setLocation] =
    useState<LocationValue>(
      normalize(initialLocation)
    );
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] =
    useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] =
    useState(false);
  const [suggestionsLoading, setSuggestionsLoading] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [mapReady, setMapReady] =
    useState(false);
  const [error, setError] =
    useState("");
  const loadLeaflet = async () => {
    if (typeof window === "undefined") {
      return null;
    }
    const win = window as any;
    if (win.L) {
      return win.L;
    }
    if (
      !document.getElementById(
        "master-provider-leaflet-css"
      )
    ) {
      const css =
        document.createElement("link");
      css.id =
        "master-provider-leaflet-css";
      css.rel = "stylesheet";
      css.href =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }
    return await new Promise<any>(
      (resolve, reject) => {
        const existing =
          document.getElementById(
            "master-provider-leaflet-js"
          );
        const finish = () =>
          win.L
            ? resolve(win.L)
            : reject(
                new Error(
                  "Leaflet could not be loaded"
                )
              );
        if (existing) {
          if (win.L) {
            return finish();
          }
          existing.addEventListener(
            "load",
            finish,
            { once: true }
          );
          existing.addEventListener(
            "error",
            () =>
              reject(
                new Error(
                  "Leaflet could not be loaded"
                )
              ),
            { once: true }
          );
          return;
        }
        const script =
          document.createElement(
            "script"
          );
        script.id =
          "master-provider-leaflet-js";
        script.src =
          "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.defer = true;
        script.onload = finish;
        script.onerror = () =>
          reject(
            new Error(
              "Leaflet could not be loaded"
            )
          );
        document.body.appendChild(
          script
        );
      }
    );
  };
  const reverseGeocode = async (
    latitude: number,
    longitude: number
  ): Promise<LocationValue> => {
    const fallback = {
      latitude,
      longitude,
      address: "",
      state: "",
      city: "",
      area: "",
      pincode: "",
    };
    try {
      const response = await fetch(
        `/api/location/reverse?lat=${encodeURIComponent(
          latitude
        )}&lon=${encodeURIComponent(
          longitude
        )}`,
        {
          cache: "no-store",
        }
      );
      if (!response.ok) {
        return fallback;
      }
      const data =
        await response.json();
      const a =
        data?.address || {};
      const state =
        a.state ||
        a.state_district ||
        "";
      const city =
        a.city ||
        a.town ||
        a.municipality ||
        a.city_district ||
        a.village ||
        a.county ||
        "";
      const area =
        a.suburb ||
        a.neighbourhood ||
        a.quarter ||
        a.residential ||
        a.hamlet ||
        "";
      const pincode =
        String(a.postcode || "")
          .replace(/\D/g, "")
          .slice(0, 6);
      const address =
        [
          a.house_number,
          a.road,
          area,
          city,
          state,
          pincode,
        ]
          .filter(Boolean)
          .join(", ") ||
        data?.display_name ||
        "";
      return {
        latitude,
        longitude,
        address,
        state,
        city,
        area,
        pincode,
      };
    } catch (e) {
      console.error(
        "Provider reverse geocoding error:",
        e
      );
      return fallback;
    }
  };
  const searchOSM = async (
    text: string,
    limit = 6
  ): Promise<Suggestion[]> => {
    const q = text.trim();
    if (q.length < 2) {
      return [];
    }
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&countrycodes=in&q=${encodeURIComponent(
        q
      )}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
    if (!response.ok) {
      throw new Error(
        "Location search failed"
      );
    }
    const results =
      await response.json();
    if (!Array.isArray(results)) {
      return [];
    }
    return results
      .map((item: any) => {
        const a =
          item?.address || {};
        const state =
          a.state ||
          a.state_district ||
          "";
        const city =
          a.city ||
          a.town ||
          a.municipality ||
          a.village ||
          a.county ||
          a.state_district ||
          "";
        const area =
          a.suburb ||
          a.neighbourhood ||
          a.quarter ||
          a.residential ||
          a.hamlet ||
          "";
        const pincode =
          String(a.postcode || "")
            .replace(/\D/g, "")
            .slice(0, 6);
        const latitude =
          Number(item?.lat);
        const longitude =
          Number(item?.lon);
        const shortName =
          area && city
            ? `${area}, ${city}`
            : city ||
              area ||
              pincode ||
              item?.display_name ||
              q;
        return {
          displayName:
            item?.display_name ||
            shortName,
          shortName,
          latitude,
          longitude,
          state,
          city,
          area,
          pincode,
          address:
            item?.display_name || "",
        };
      })
      .filter(
        (x: Suggestion) =>
          Number.isFinite(
            x.latitude
          ) &&
          Number.isFinite(
            x.longitude
          )
      );
  };
  const moveTo = (
    latitude: number,
    longitude: number,
    zoom = 16
  ) => {
    if (
      !mapRef.current ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }
    mapRef.current.setView(
      [latitude, longitude],
      zoom,
      {
        animate: true,
      }
    );
  };
  const detectMyLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location detection."
      );
      return;
    }
    setLoading(true);
    setError("");
    setShowSuggestions(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude =
          Number(
            position.coords.latitude
          );
        const longitude =
          Number(
            position.coords.longitude
          );
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          setLoading(false);
          setError(
            "Invalid location coordinates received."
          );
          return;
        }
        const selected =
          await reverseGeocode(
            latitude,
            longitude
          );
        setLocation(selected);
        setQuery(
          selected.pincode ||
            selected.city ||
            selected.area ||
            ""
        );
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
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        if (error.code === 1) {
          setError(
            "Location permission was denied. Please allow location access in your browser."
          );
        } else if (error.code === 2) {
          setError(
            "Your current location is unavailable. Please try again."
          );
        } else {
          setError(
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
  const searchLocationOnMap =
    async () => {
      const text = query.trim();
      if (!text) {
        return detectMyLocation();
      }
      setLoading(true);
      setError("");
      setShowSuggestions(false);
      try {
        const results =
          await searchOSM(text, 1);
        const s = results[0];
        if (!s) {
          setError(
            "Location not found. Try another area, landmark or PIN code."
          );
          return;
        }
        suppressSuggestionsRef.current =
          true;
        setLocation({
          latitude: s.latitude,
          longitude: s.longitude,
          address: s.displayName,
          state: s.state,
          city: s.city,
          area: s.area,
          pincode: s.pincode,
        });
        setQuery(
          s.shortName ||
            s.pincode ||
            s.city ||
            text
        );
        moveTo(
          s.latitude,
          s.longitude,
          16
        );
      } catch (e) {
        console.error(
          "Provider location search error:",
          e
        );
        setError(
          "Unable to search location right now. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };
  const selectSuggestion = (
    s: Suggestion
  ) => {
    suppressSuggestionsRef.current =
      true;
    setLocation({
      latitude: s.latitude,
      longitude: s.longitude,
      address: s.displayName,
      state: s.state,
      city: s.city,
      area: s.area,
      pincode: s.pincode,
    });
    setQuery(
      s.shortName ||
        s.pincode ||
        s.city ||
        s.displayName
    );
    setSuggestions([]);
    setShowSuggestions(false);
    setError("");
    moveTo(
      s.latitude,
      s.longitude,
      16
    );
  };
  useEffect(() => {
    if (!open) {
      return;
    }
    const start =
      normalize(initialLocation);
    setLocation(start);
    setQuery(
      start.pincode ||
        start.city ||
        start.area ||
        ""
    );
    setSuggestions([]);
    setShowSuggestions(false);
    setError("");
  }, [open]);
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleOutsidePointerDown = (
      event: PointerEvent
    ) => {
      if (!showSuggestions) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Node &&
        searchAreaRef.current?.contains(
          target
        )
      ) {
        return;
      }
      setShowSuggestions(false);
    };
    document.addEventListener(
      "pointerdown",
      handleOutsidePointerDown
    );
    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsidePointerDown
      );
    };
  }, [open, showSuggestions]);
  useEffect(() => {
    if (
      !open ||
      query.trim().length < 2
    ) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (
      suppressSuggestionsRef.current
    ) {
      suppressSuggestionsRef.current =
        false;
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setShowSuggestions(true);
    setSuggestionsLoading(true);
    const timer =
      window.setTimeout(
        async () => {
          try {
            setSuggestions(
              await searchOSM(
                query,
                6
              )
            );
          } catch (e) {
            console.error(
              "Provider location suggestions error:",
              e
            );
            setSuggestions([]);
          } finally {
            setSuggestionsLoading(
              false
            );
          }
        },
        500
      );
    return () =>
      window.clearTimeout(timer);
  }, [open, query]);
  useEffect(() => {
    if (
      !open ||
      !mapContainerRef.current
    ) {
      return;
    }
    let cancelled = false;
    const setup = async () => {
      try {
        const L =
          await loadLeaflet();
        if (
          cancelled ||
          !mapContainerRef.current
        ) {
          return;
        }
        if (mapRef.current) {
          mapRef.current.remove();
        }
        const start =
          normalize(initialLocation);
        const map = L.map(
          mapContainerRef.current,
          {
            zoomControl: true,
            attributionControl: true,
          }
        ).setView(
          [
            start.latitude,
            start.longitude,
          ],
          16
        );
        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              "&copy; OpenStreetMap contributors",
          }
        ).addTo(map);
        map.on(
          "movestart",
          () => {
            setError("");
          }
        );
        map.on(
          "moveend",
          async () => {
            const center =
              map.getCenter();
            const latitude =
              Number(center.lat);
            const longitude =
              Number(center.lng);
            if (
              !Number.isFinite(
                latitude
              ) ||
              !Number.isFinite(
                longitude
              )
            ) {
              return;
            }
            const selected =
              await reverseGeocode(
                latitude,
                longitude
              );
            if (!cancelled) {
              setLocation(selected);
            }
          }
        );
        map.on(
          "click",
          (event: any) => {
            const latitude =
              Number(
                event?.latlng?.lat
              );
            const longitude =
              Number(
                event?.latlng?.lng
              );
            if (
              Number.isFinite(
                latitude
              ) &&
              Number.isFinite(
                longitude
              )
            ) {
              map.panTo(
                [
                  latitude,
                  longitude,
                ],
                {
                  animate: true,
                  duration: 0.35,
                }
              );
            }
          }
        );
        mapRef.current = map;
        setMapReady(true);
        window.setTimeout(() => {
          if (!cancelled) {
            map.invalidateSize();
          }
        }, 150);
        if (
          !validCoords(
            initialLocation
          ) &&
          navigator.geolocation
        ) {
          window.setTimeout(() => {
            if (!cancelled) {
              detectMyLocation();
            }
          }, 250);
        }
      } catch (e) {
        console.error(
          "Provider map initialization error:",
          e
        );
        if (!cancelled) {
          setError(
            "Map could not be loaded. Please check your internet connection and try again."
          );
        }
      }
    };
    void setup();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
      }
      mapRef.current = null;
      setMapReady(false);
    };
  }, [open]);
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
              >
                <path
                  fill="#4285F4"
                  d="M12 2.1c-4.05 0-7.34 3.27-7.34 7.3 0 5.48 7.34 12.5 7.34 12.5s7.34-7.02 7.34-12.5c0-4.03-3.29-7.3-7.34-7.3Z"
                />
                <circle
                  cx="12"
                  cy="9.35"
                  r="2.75"
                  fill="#EA4335"
                />
                <circle
                  cx="12"
                  cy="9.35"
                  r="1.35"
                  fill="#fff"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                Select Your Service Location
              </h2>
              <p className="text-xs text-gray-500 sm:text-sm">
                Detect your location and confirm it before saving.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-gray-100"
            aria-label="Close location picker"
          >
            ×
          </button>
        </div>
        {/* SEARCH */}
        <div
          ref={searchAreaRef}
          className="relative border-b bg-white p-3 sm:p-4"
        >
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <span className="text-lg">
              🔎
            </span>
            <input
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
              onFocus={() => {
                if (
                  suggestions.length >
                  0
                ) {
                  setShowSuggestions(
                    true
                  );
                }
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  e.preventDefault();
                  void searchLocationOnMap();
                }
                if (
                  e.key === "Escape"
                ) {
                  setShowSuggestions(
                    false
                  );
                }
              }}
              placeholder="Search area, landmark or PIN code"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  setShowSuggestions(
                    false
                  );
                }}
                className="rounded-full px-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                void searchLocationOnMap()
              }
              disabled={loading}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              {loading
                ? "Locating..."
                : "Search"}
            </button>
          </div>
          {showSuggestions && (
            <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-[1000] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:left-4 sm:right-4">
              {suggestionsLoading ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Searching locations...
                </div>
              ) : suggestions.length ? (
                <div className="max-h-64 overflow-y-auto">
                  {suggestions.map(
                    (s, i) => (
                      <button
                        type="button"
                        key={`${s.latitude}-${s.longitude}-${i}`}
                        onClick={() =>
                          selectSuggestion(
                            s
                          )
                        }
                        className="flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-blue-50"
                      >
                        <span className="mt-0.5">
                          📍
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-800">
                            {s.shortName}
                          </span>
                          <span className="mt-0.5 block line-clamp-2 text-xs text-gray-500">
                            {s.displayName}
                          </span>
                        </span>
                      </button>
                    )
                  )}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No matching location found.
                </div>
              )}
            </div>
          )}
        </div>
        {/* MAP */}
        <div className="relative h-[330px] overflow-hidden bg-gray-200 sm:h-[400px]">
          <div
            ref={mapContainerRef}
            className="absolute inset-0 z-0 h-full w-full"
          />
          {/* FIXED RED PIN */}
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
          {/* CURRENT LOCATION */}
          <button
            type="button"
            onClick={
              detectMyLocation
            }
            disabled={
              loading ||
              !mapReady
            }
            className="absolute right-3 top-3 z-[600] flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl shadow-lg transition hover:bg-gray-50 active:scale-95 disabled:opacity-50"
            title="Go to my current location"
            aria-label="Go to my current location"
          >
            ◎
          </button>
          <div className="absolute bottom-3 left-3 z-[600] rounded bg-white/90 px-2 py-1 text-[10px] font-medium text-gray-600 shadow">
            OpenStreetMap • Move the map to adjust the pin • No billing required
          </div>
        </div>
        {/* BOTTOM */}
        <div className="border-t bg-white p-4 sm:p-5">
          {error && (
            <div className="mb-3 rounded-xl bg-orange-50 px-3 py-2.5 text-sm text-orange-700">
              {error}
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
              📍
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-500">
                Selected Location
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 sm:text-base">
                {location.pincode ||
                  location.area ||
                  location.city ||
                  location.address ||
                  "Move the map to select your location"}
              </p>
              {location.address && (
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                  {location.address}
                </p>
              )}
              <p className="mt-1 text-[11px] text-gray-500">
                Lat:{" "}
                {location.latitude.toFixed(
                  6
                )}{" "}
                • Lng:{" "}
                {location.longitude.toFixed(
                  6
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(location);
              onClose();
            }}
            className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99]"
          >
            Use This Location
          </button>
        </div>
      </div>
    </div>
  );
}