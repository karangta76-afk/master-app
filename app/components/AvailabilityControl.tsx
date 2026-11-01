"use client";
import { useEffect, useState } from "react";
type AvailabilityStatus =
  | "Available"
  | "Not Available"
  | "Temporarily Unavailable";
type Provider = {
  id: string;
  availability?: AvailabilityStatus;
  [key: string]: unknown;
};
export default function AvailabilityControl() {
  const [status, setStatus] =
    useState<AvailabilityStatus>("Available");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const savedProvider = localStorage.getItem("masterProvider");
    if (!savedProvider) {
      return;
    }
    try {
      const provider: Provider = JSON.parse(savedProvider);
      if (provider.availability) {
        setStatus(provider.availability);
      }
    } catch {
      setStatus("Available");
    }
  }, []);
  const changeStatus = (newStatus: AvailabilityStatus) => {
    setSaving(true);
    try {
      const savedProvider = localStorage.getItem("masterProvider");
      if (!savedProvider) {
        setSaving(false);
        return;
      }
      const currentProvider: Provider = JSON.parse(savedProvider);
      const updatedProvider: Provider = {
        ...currentProvider,
        availability: newStatus,
      };
      // Update current provider
      localStorage.setItem(
        "masterProvider",
        JSON.stringify(updatedProvider)
      );
      // Update provider inside all providers
      const savedProviders =
        localStorage.getItem("masterProviders");
      if (savedProviders) {
        try {
          const providers: Provider[] = JSON.parse(savedProviders);
          const updatedProviders = providers.map((provider) =>
            provider.id === currentProvider.id
              ? {
                  ...provider,
                  availability: newStatus,
                }
              : provider
          );
          localStorage.setItem(
            "masterProviders",
            JSON.stringify(updatedProviders)
          );
        } catch {
          // Ignore invalid provider data
        }
      }
      setStatus(newStatus);
      window.dispatchEvent(
        new Event("master-provider-updated")
      );
    } catch {
      // Ignore storage errors
    }
    setSaving(false);
  };
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Service Availability
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Let customers know whether you are currently accepting bookings.
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
          Current:{" "}
          <span
            className={
              status === "Available"
                ? "text-green-600"
                : status === "Not Available"
                ? "text-red-600"
                : "text-orange-600"
            }
          >
            {status === "Available" && "🟢 "}
            {status === "Not Available" && "🔴 "}
            {status === "Temporarily Unavailable" && "🟠 "}
            {status}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mt-5">
        <button
          type="button"
          disabled={saving}
          onClick={() => changeStatus("Available")}
          className={`rounded-xl border px-4 py-3 font-semibold transition ${
            status === "Available"
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          🟢 Available
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => changeStatus("Temporarily Unavailable")}
          className={`rounded-xl border px-4 py-3 font-semibold transition ${
            status === "Temporarily Unavailable"
              ? "border-orange-500 bg-orange-50 text-orange-700"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          🟠 Temporarily Unavailable
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => changeStatus("Not Available")}
          className={`rounded-xl border px-4 py-3 font-semibold transition ${
            status === "Not Available"
              ? "border-red-500 bg-red-50 text-red-700"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          🔴 Not Available
        </button>
      </div>
      {saving && (
        <p className="mt-3 text-center text-sm text-gray-500">
          Saving status...
        </p>
      )}
      <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
        💡 Customers will see your latest availability status on your
        provider profile.
      </div>
    </div>
  );
}