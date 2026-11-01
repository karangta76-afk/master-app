export type MasterAppLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  state: string;
  city: string;
  area: string;
  pincode: string;
  detectedAt: number;
};
const LOCATION_KEY = "masterAppLocation";
export function getSavedMasterAppLocation(): MasterAppLocation | null {
  try {
    const raw = window.localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MasterAppLocation;
    if (
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
export function saveMasterAppLocation(
  location: MasterAppLocation
) {
  window.localStorage.setItem(
    LOCATION_KEY,
    JSON.stringify(location)
  );
  window.dispatchEvent(
    new CustomEvent("master-location-updated", {
      detail: location,
    })
  );
}
async function reverseGeocode(
  latitude: number,
  longitude: number,
  accuracy: number
): Promise<MasterAppLocation> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      latitude
    )}&lon=${encodeURIComponent(
      longitude
    )}&zoom=18&addressdetails=1`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(
      "Address service could not identify this location."
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
  const pincode = String(
    address.postcode || ""
  )
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
    accuracy,
    address:
      data?.display_name ||
      shortAddress ||
      `Current location (${latitude.toFixed(
        6
      )}, ${longitude.toFixed(6)})`,
    state,
    city,
    area,
    pincode,
    detectedAt: Date.now(),
  };
}
export async function detectMasterAppLocation(): Promise<MasterAppLocation> {
  if (!navigator.geolocation) {
    throw new Error(
      "Your browser does not support location services."
    );
  }
  return new Promise((resolve, reject) => {
    let bestPosition: GeolocationPosition | null = null;
    let finished = false;
    let watchId: number | null = null;
    let timeoutId: number | null = null;
    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
    const finish = async (
      position: GeolocationPosition
    ) => {
      if (finished) return;
      finished = true;
      cleanup();
      const latitude =
        position.coords.latitude;
      const longitude =
        position.coords.longitude;
      const accuracy =
        position.coords.accuracy;
      /*
       * If Chrome/Windows only gives a very coarse
       * location, do NOT silently turn that coarse
       * coordinate into a wrong city such as Bihar.
       */
      if (
        !Number.isFinite(accuracy) ||
        accuracy > 3000
      ) {
        reject(
          new Error(
            `Your device returned an approximate location with about ${Math.round(
              accuracy || 0
            )} m accuracy. Please enable Precise Location for Chrome/Windows and try again.`
          )
        );
        return;
      }
      try {
        const location =
          await reverseGeocode(
            latitude,
            longitude,
            accuracy
          );
        saveMasterAppLocation(
          location
        );
        resolve(location);
      } catch (error) {
        reject(error);
      }
    };
    const onPosition = (
      position: GeolocationPosition
    ) => {
      if (
        !bestPosition ||
        position.coords.accuracy <
          bestPosition.coords.accuracy
      ) {
        bestPosition = position;
      }
      if (
        position.coords.accuracy <= 100
      ) {
        void finish(position);
      }
    };
    const onError = (
      error: GeolocationPositionError
    ) => {
      if (finished) return;
      if (error.code === 1) {
        finished = true;
        cleanup();
        reject(
          new Error(
            "Location permission is blocked. Please allow location access for localhost in Chrome."
          )
        );
        return;
      }
    };
    watchId =
      navigator.geolocation.watchPosition(
        onPosition,
        onError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    navigator.geolocation.getCurrentPosition(
      onPosition,
      onError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
    timeoutId = window.setTimeout(() => {
      if (finished) return;
      if (bestPosition) {
        void finish(bestPosition);
        return;
      }
      finished = true;
      cleanup();
      reject(
        new Error(
          "Your current location could not be detected. Please check device location settings and try again."
        )
      );
    }, 15000);
  });
}