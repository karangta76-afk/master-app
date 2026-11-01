"use client";
import { useEffect } from "react";
const LOCATION_KEY = "masterAppLocation";
type MasterAppLocation = {
  latitude: number;
  longitude: number;
  address: string;
  state: string;
  city: string;
  area: string;
  pincode: string;
  detectedAt: number;
};
function saveLocation(location: MasterAppLocation) {
  try {
    window.localStorage.setItem(
      LOCATION_KEY,
      JSON.stringify(location)
    );
    window.dispatchEvent(
      new CustomEvent("master-location-updated", {
        detail: location,
      })
    );
  } catch (error) {
    console.error("Master App location save error:", error);
  }
}
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<MasterAppLocation> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  const response = await fetch(`/api/location/reverse?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Reverse geocoding failed: ${response.status}`
    );
  }
  const data = await response.json();
  const address = data?.address || {};
  const state =
    address.state ||
    address.state_district ||
    "";
  const city =
    address.city ||
    address.town ||
    address.municipality ||
    address.city_district ||
    address.village ||
    "";
  const area =
    address.suburb ||
    address.neighbourhood ||
    address.hamlet ||
    address.quarter ||
    "";
  const pincode =
    String(address.postcode || "")
      .replace(/\D/g, "")
      .slice(0, 6);
  const shortAddress = [
    address.house_number,
    address.road,
    area,
    city,
    state,
    pincode,
  ]
    .filter(Boolean)
    .join(", ");
  return {
    latitude,
    longitude,
    address:
      data?.display_name ||
      shortAddress ||
      `Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
    state,
    city,
    area,
    pincode,
    detectedAt: Date.now(),
  };
}
function saveGpsOnly(
  latitude: number,
  longitude: number
) {
  saveLocation({
    latitude,
    longitude,
    address: `Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
    state: "",
    city: "",
    area: "",
    pincode: "",
    detectedAt: Date.now(),
  });
}
export default function LocationAutoDetect() {
  useEffect(() => {
    let cancelled = false;
    if (!navigator.geolocation) {
      console.warn(
        "Master App: browser geolocation is not supported."
      );
      return;
    }
    const detectLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          console.log(
            "Master App: fresh GPS location detected",
            latitude,
            longitude
          );
          try {
            const location = await reverseGeocode(
              latitude,
              longitude
            );
            if (!cancelled) {
              saveLocation(location);
            }
          } catch (error) {
            console.warn(
              "Master App could not resolve the address; keeping GPS coordinates only:",
              error
            );
            // GPS is still useful even when address lookup fails.
            if (!cancelled) {
              saveGpsOnly(latitude, longitude);
            }
          }
        },
        (error) => {
          if (cancelled) return;
          console.warn(
            "Master App location permission/status:",
            error.code,
            error.message
          );
          // IMPORTANT: do not overwrite an already saved location
          // when the browser refuses the GPS request.
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          // 0 = ask the browser for a fresh position, not a cached GPS fix.
          maximumAge: 0,
        }
      );
    };
    // Run once on every full page load/refresh.
    const timer = window.setTimeout(
      detectLocation,
      500
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}
