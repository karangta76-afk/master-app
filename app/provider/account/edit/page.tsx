"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import ProviderLocationPicker from "../../../components/ProviderLocationPicker";
type AvailabilityStatus =
  | "Available"
  | "Not Available"
  | "Temporarily Unavailable";
type Provider = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  service: string;
  state?: string;
  city: string;
  pincode?: string;
  address: string;
  experience: string;
  price: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  serviceRadius?: number;
  availability?: AvailabilityStatus;
  createdAt?: string;
};
type Booking = {
  id: string;
  providerId: string;
  provider?: string;
  providerService?: string;
  service?: string;
  [key: string]: unknown;
};
export default function ProviderAccountEditPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [experience, setExperience] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [serviceRadius, setServiceRadius] = useState("10");
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveButtonSuccess, setSaveButtonSuccess] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  // Contact-change OTP verification
  const [originalMobile, setOriginalMobile] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileOtpLoading, setMobileOtpLoading] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  useEffect(() => {
    const loadDropdownOptions = async () => {
      const fallbackServices = [
        "Electrician",
        "Plumber",
        "Carpenter",
        "Painter",
        "AC Repair",
        "Appliance Repair",
        "Cleaning",
        "Other",
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
        "Fatehpur",
        "Patna",
        "Delhi",
        "Kolkata",
        "Mumbai",
        "Bengaluru",
        "Other",
      ];
      let services = [...fallbackServices];
      let cities = [...fallbackCities];
      try {
        const { data: categoryData } = await supabase
          .from("service_categories")
          .select("name")
          .eq("is_active", true)
          .order("name", { ascending: true });
        if (categoryData && categoryData.length > 0) {
          services = Array.from(
            new Set([
              ...categoryData
                .map((item) => String(item.name || "").trim())
                .filter(Boolean),
              ...fallbackServices,
            ])
          );
        }
      } catch {
        // Keep fallback services.
      }
      try {
        const { data: providerData } = await supabase
          .from("providers")
          .select("city");
        if (providerData && providerData.length > 0) {
          cities = Array.from(
            new Set([
              ...providerData
                .map((item) => String(item.city || "").trim())
                .filter(Boolean),
              ...cities,
            ])
          );
        }
      } catch {
        // Keep existing city list.
      }
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json",
          {
            cache: "force-cache",
          }
        );
        if (response.ok) {
          const indiaCities = (await response.json()) as Array<{
            name?: string;
            state?: string;
          }>;
          const remoteCities = indiaCities
            .map((item) => String(item.name || "").trim())
            .filter(Boolean);
          cities = Array.from(
            new Set([...remoteCities, ...cities])
          ).sort((a, b) =>
            a.localeCompare(b, "en", {
              sensitivity: "base",
            })
          );
        }
      } catch {
        // Keep Supabase + fallback cities.
      }
      setServiceOptions(services);
      setCityOptions(cities);
    };
    void loadDropdownOptions();
    const loggedIn = localStorage.getItem("masterProviderLoggedIn");
    const savedProvider = localStorage.getItem("masterProvider");
    if (loggedIn !== "true" || !savedProvider) {
      router.push("/provider/login");
      return;
    }
    try {
      const currentProvider: Provider = JSON.parse(savedProvider);
      setProvider(currentProvider);
      setName(currentProvider.name || "");
      setMobile(currentProvider.mobile || "");
      setEmail(currentProvider.email || "");
      setOriginalMobile(currentProvider.mobile || "");
      setOriginalEmail((currentProvider.email || "").trim().toLowerCase());
      setMobileVerified(true);
      setEmailVerified(true);
      setService(currentProvider.service || "");
      setState(currentProvider.state || "");
      setCity(currentProvider.city || "");
      setPincode(currentProvider.pincode || "");
      setAddress(currentProvider.address || "");
      setExperience(currentProvider.experience || "");
      setPrice(currentProvider.price || "");
      setDescription(currentProvider.description || "");
      setLatitude(currentProvider.latitude ?? null);
      setLongitude(currentProvider.longitude ?? null);
      setServiceRadius(String(currentProvider.serviceRadius || 10));
      setServiceOptions((previous) =>
        Array.from(
          new Set([
            ...previous,
            currentProvider.service || "",
          ].filter(Boolean))
        )
      );
      setCityOptions((previous) =>
        Array.from(
          new Set([
            ...previous,
            currentProvider.city || "",
          ].filter(Boolean))
        )
      );
    } catch {
      localStorage.removeItem("masterProvider");
      localStorage.removeItem("masterProviderLoggedIn");
      router.push("/provider/login");
    }
  }, [router]);
  const lookupPincode = async (value: string) => {
    const cleanPin = value.replace(/\D/g, "").slice(0, 6);
    setPincode(cleanPin);
    setError("");
    if (cleanPin.length !== 6) {
      return;
    }
    setPincodeLoading(true);
    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${cleanPin}`
      );
      if (!response.ok) {
        throw new Error("PIN lookup failed");
      }
      const data = await response.json();
      const postOffice = data?.[0]?.PostOffice?.[0];
      if (!postOffice) {
        setError("No location found for this PIN code.");
        return;
      }
      const detectedCity =
        postOffice.District ||
        postOffice.Block ||
        postOffice.Division ||
        "";
      const detectedState = postOffice.State || "";
      setCity(detectedCity);
      setState(detectedState);
      if (detectedCity) {
        setCityOptions((previous) =>
          Array.from(new Set([...previous, detectedCity]))
        );
      }
    } catch {
      setError("Unable to find city from this PIN code.");
    } finally {
      setPincodeLoading(false);
    }
  };
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      return;
    }
    setError("");
    setSuccess("");
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
          );
          if (!response.ok) {
            throw new Error("Reverse geocoding failed");
          }
          const data = await response.json();
          const addressData = data?.address || {};
          const detectedCity =
            addressData.city ||
            addressData.town ||
            addressData.village ||
            addressData.municipality ||
            "";
          const detectedState = addressData.state || "";
          const detectedPin = addressData.postcode || "";
          if (detectedCity) {
            setCity(detectedCity);
            setCityOptions((previous) =>
              Array.from(
                new Set([...previous, detectedCity])
              )
            );
          }
          setState(detectedState);
          setPincode(detectedPin);
          setSuccess(
            "Current location detected successfully. Please check the location details and save changes."
          );
        } catch {
          setSuccess(
            "GPS location detected. Address details could not be loaded automatically."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        setError(
          "Unable to access your location. Please allow location permission."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };
  /*
   * =====================================================
   * CONTACT CHANGE OTP VERIFICATION
   * =====================================================
   * The current app uses the same demo OTP flow as login.
   * Demo OTP: 123456
   * Real SMS/email delivery can be connected later.
   */
  const handleMobileChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 10);
    setMobile(cleanValue);
    setError("");
    setSuccess("");
    if (cleanValue === originalMobile) {
      setMobileVerified(true);
      setMobileOtpSent(false);
      setMobileOtp("");
    } else {
      setMobileVerified(false);
      setMobileOtpSent(false);
      setMobileOtp("");
    }
  };
  const handleEmailChange = (value: string) => {
    const cleanValue = value.trimStart();
    setEmail(cleanValue);
    setError("");
    setSuccess("");
    if (cleanValue.trim().toLowerCase() === originalEmail) {
      setEmailVerified(true);
      setEmailOtpSent(false);
      setEmailOtp("");
    } else {
      setEmailVerified(false);
      setEmailOtpSent(false);
      setEmailOtp("");
    }
  };
  const sendMobileOtp = async () => {
    const cleanMobile = mobile.trim();
    setError("");
    setSuccess("");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError("Please enter a valid 10-digit Indian mobile number first.");
      return;
    }
    setMobileOtpLoading(true);
    try {
      setMobileOtp("");
      setMobileOtpSent(true);
      setMobileVerified(false);
      setSuccess("Demo OTP sent to the new mobile number. Use OTP: 123456");
    } finally {
      setMobileOtpLoading(false);
    }
  };
  const verifyMobileOtp = () => {
    const cleanOtp = mobileOtp.replace(/\D/g, "").slice(0, 6);
    setError("");
    setSuccess("");
    if (!mobileOtpSent) {
      setError("Please send OTP to the new mobile number first.");
      return;
    }
    if (cleanOtp !== "123456") {
      setMobileVerified(false);
      setError("Invalid OTP. Please enter 123456.");
      return;
    }
    setMobileVerified(true);
    setMobileOtpSent(false);
    setMobileOtp("");
    setSuccess("New mobile number verified successfully.");
  };
  const sendEmailOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setError("");
    setSuccess("");
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address first.");
      return;
    }
    setEmailOtpLoading(true);
    try {
      setEmailOtp("");
      setEmailOtpSent(true);
      setEmailVerified(false);
      setSuccess("Demo OTP sent to the new email address. Use OTP: 123456");
    } finally {
      setEmailOtpLoading(false);
    }
  };
  const verifyEmailOtp = () => {
    const cleanOtp = emailOtp.replace(/\D/g, "").slice(0, 6);
    setError("");
    setSuccess("");
    if (!emailOtpSent) {
      setError("Please send OTP to the new email address first.");
      return;
    }
    if (cleanOtp !== "123456") {
      setEmailVerified(false);
      setError("Invalid OTP. Please enter 123456.");
      return;
    }
    setEmailVerified(true);
    setEmailOtpSent(false);
    setEmailOtp("");
    setSuccess("New email address verified successfully.");
  };
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!provider) {
      setError("Provider details not found.");
      return;
    }
    const cleanName = name.trim();
    const cleanMobile = mobile.trim();
    const cleanEmail = email.trim();
    const cleanService = service.trim();
    const cleanState = state.trim();
    const cleanCity = city.trim();
    const cleanPincode = pincode.trim();
    const cleanAddress = address.trim();
    const cleanExperience = experience.trim();
    const cleanPrice = price.trim();
    const cleanDescription = description.trim();
    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }
    if (cleanMobile !== originalMobile && !mobileVerified) {
      setError("Please verify the new mobile number with OTP before saving.");
      return;
    }
    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (cleanEmail !== originalEmail && !emailVerified) {
      setError("Please verify the new email address with OTP before saving.");
      return;
    }
    if (!cleanService) {
      setError("Please enter your service.");
      return;
    }
    if (!cleanState) {
      setError("Please enter your state.");
      return;
    }
    if (!cleanCity) {
      setError("Please enter your city.");
      return;
    }
    if (cleanPincode && !/^\d{6}$/.test(cleanPincode)) {
      setError("Please enter a valid 6-digit PIN code.");
      return;
    }
    if (!cleanAddress) {
      setError("Please enter your address.");
      return;
    }
    setSaving(true);
    try {
      const radius = Number(serviceRadius) || 10;
      const { error: supabaseError } = await supabase
        .from("providers")
        .update({
          name: cleanName,
          mobile: cleanMobile,
          email: cleanEmail,
          service: cleanService,
          state: cleanState,
          city: cleanCity,
          pincode: cleanPincode,
          address: cleanAddress,
          experience: cleanExperience,
          price: cleanPrice,
          description: cleanDescription,
          latitude,
          longitude,
          service_radius: radius,
        })
        .eq("id", provider.id);
      if (supabaseError) {
        throw supabaseError;
      }
      const updatedProvider: Provider = {
        ...provider,
        name: cleanName,
        mobile: cleanMobile,
        email: cleanEmail,
        service: cleanService,
        state: cleanState,
        city: cleanCity,
        pincode: cleanPincode,
        address: cleanAddress,
        experience: cleanExperience,
        price: cleanPrice,
        description: cleanDescription,
        latitude,
        longitude,
        serviceRadius: radius,
        availability:
          provider.availability || "Available",
      };
      localStorage.setItem(
        "masterProvider",
        JSON.stringify(updatedProvider)
      );
      const savedProviders =
        localStorage.getItem("masterProviders");
      if (savedProviders) {
        try {
          const providers: Provider[] =
            JSON.parse(savedProviders);
          const updatedProviders = providers.map((item) =>
            item.id === provider.id
              ? {
                  ...item,
                  ...updatedProvider,
                }
              : item
          );
          localStorage.setItem(
            "masterProviders",
            JSON.stringify(updatedProviders)
          );
        } catch {
          // Ignore invalid provider list.
        }
      }
      const savedBookings =
        localStorage.getItem("masterBookings");
      if (savedBookings) {
        try {
          const bookings: Booking[] =
            JSON.parse(savedBookings);
          const updatedBookings = bookings.map((booking) => {
            if (booking.providerId !== provider.id) {
              return booking;
            }
            return {
              ...booking,
              provider: cleanName,
              providerService: cleanService,
              service: cleanService,
            };
          });
          localStorage.setItem(
            "masterBookings",
            JSON.stringify(updatedBookings)
          );
        } catch {
          // Ignore invalid booking data.
        }
      }
      setProvider(updatedProvider);
      setSuccess(
        "Profile updated successfully. Your provider profile, location and existing bookings have been synchronized."
      );
      window.dispatchEvent(
        new Event("master-provider-updated")
      );
      // Show "Saved Successfully" on the save button for 1 second.
      setSaveButtonSuccess(true);
      window.setTimeout(() => {
        setSaveButtonSuccess(false);
        // After the button feedback, smoothly bring the success
        // message at the top of the page into view.
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 1000);
    } catch (saveError) {
      console.error(saveError);
      setError(
        "Something went wrong while saving your profile."
      );
    } finally {
      setSaving(false);
    }
  };
  if (!provider) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
          <div className="text-3xl mb-2">⏳</div>
          <h1 className="text-lg font-bold text-slate-900">
            Loading profile...
          </h1>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-4">
          <button
            onClick={() =>
              router.push("/provider/dashboard")
            }
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center justify-between gap-3 mt-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                My Profile
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage your personal and service information
              </p>
            </div>
            <div className="hidden sm:flex h-10 w-10 rounded-full bg-blue-100 items-center justify-center text-lg">
              👤
            </div>
          </div>
        </div>
        {/* SUCCESS */}
        {success && (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-green-800">
            <div className="text-sm font-bold">
              ✓ Profile Updated
            </div>
            <div className="text-xs mt-0.5">
              {success}
            </div>
          </div>
        )}
        {/* ERROR */}
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          {/* PERSONAL DETAILS */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">👤</span>
              <h2 className="text-base font-bold text-slate-900">
                Personal Details
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mobile Number
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={mobile}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    maxLength={10}
                    inputMode="numeric"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="10-digit mobile"
                  />
                  {mobile.trim() === originalMobile ? (
                    <div className="flex items-center justify-center rounded-lg bg-green-50 px-4 py-2 text-xs font-bold text-green-700">
                      ✓ Verified
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void sendMobileOtp()}
                      disabled={mobileOtpLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {mobileOtpLoading ? "Sending..." : "Send OTP"}
                    </button>
                  )}
                </div>
                {mobile.trim() !== originalMobile && (
                  <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-[11px] font-semibold text-blue-800">
                      Verify new mobile number
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={mobileOtp}
                        onChange={(e) =>
                          setMobileOtp(
                            e.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        placeholder="Enter 6-digit OTP"
                        className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={verifyMobileOtp}
                        disabled={!mobileOtpSent}
                        className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Verify OTP
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-blue-600">
                      Demo OTP: 123456
                    </p>
                    {mobileVerified && (
                      <p className="mt-1 text-[11px] font-bold text-green-700">
                        ✓ New mobile number verified
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Email
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="Enter your email"
                  />
                  {email.trim().toLowerCase() === originalEmail ? (
                    <div className="flex items-center justify-center rounded-lg bg-green-50 px-4 py-2 text-xs font-bold text-green-700">
                      ✓ Verified
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void sendEmailOtp()}
                      disabled={emailOtpLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {emailOtpLoading ? "Sending..." : "Send OTP"}
                    </button>
                  )}
                </div>
                {email.trim().toLowerCase() !== originalEmail && (
                  <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-[11px] font-semibold text-blue-800">
                      Verify new email address
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) =>
                          setEmailOtp(
                            e.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        placeholder="Enter 6-digit OTP"
                        className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={verifyEmailOtp}
                        disabled={!emailOtpSent}
                        className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Verify OTP
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-blue-600">
                      Demo OTP: 123456
                    </p>
                    {emailVerified && (
                      <p className="mt-1 text-[11px] font-bold text-green-700">
                        ✓ New email address verified
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
          {/* SERVICE DETAILS */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🛠️</span>
              <h2 className="text-base font-bold text-slate-900">
                Service Details
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Service
                </label>
                <select
                  value={service}
                  onChange={(e) =>
                    setService(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select service
                  </option>
                  {serviceOptions.map((serviceName) => (
                    <option
                      key={serviceName}
                      value={serviceName}
                    >
                      {serviceName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Experience
                </label>
                <input
                  value={experience}
                  onChange={(e) =>
                    setExperience(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="e.g. 5 years"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Service Price
                </label>
                <input
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="e.g. ₹500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Service Radius
                </label>
                <select
                  value={serviceRadius}
                  onChange={(e) =>
                    setServiceRadius(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="20">20 km</option>
                  <option value="50">50 km</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  State
                </label>
                <input
                  value={state}
                  onChange={(e) =>
                    setState(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  City
                </label>
                <select
                  value={city}
                  onChange={(e) =>
                    setCity(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select city
                  </option>
                  {cityOptions.map((cityName) => (
                    <option
                      key={cityName}
                      value={cityName}
                    >
                      {cityName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  PIN Code
                </label>
                <input
                  value={pincode}
                  onChange={(e) =>
                    void lookupPincode(e.target.value)
                  }
                  maxLength={6}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="6-digit PIN code"
                />
                {pincodeLoading && (
                  <p className="text-[11px] text-blue-600 mt-1">
                    Finding city and state...
                  </p>
                )}
              </div>
            </div>
          </section>
          <ProviderLocationPicker
            open={locationPickerOpen}
            onClose={() => setLocationPickerOpen(false)}
            initialLocation={{
              latitude: latitude ?? undefined,
              longitude: longitude ?? undefined,
              state,
              city,
              pincode,
              address,
            }}
            onSelect={(selected) => {
              setLatitude(selected.latitude);
              setLongitude(selected.longitude);
              if (selected.state) setState(selected.state);
              if (selected.city) setCity(selected.city);
              if (selected.pincode) setPincode(selected.pincode);
              if (selected.address) setAddress(selected.address);
              setSuccess("Service location updated from the map.");
            }}
          />
          {/* LOCATION */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📍</span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Service Location
                </h2>
                <p className="text-xs text-slate-500">
                  Help customers find you nearby
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocationPickerOpen(true)}
              disabled={locationLoading}
              className="w-full rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold py-2.5 hover:bg-blue-100 disabled:opacity-60"
            >
              {locationLoading
                ? "📍 Detecting Location..."
                : "📍 Use My Current Location"}
            </button>
            {latitude !== null &&
              longitude !== null && (
                <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                  <p className="text-xs font-semibold text-green-700">
                    ✓ GPS location saved
                  </p>
                  <p className="text-[11px] text-green-700 mt-0.5">
                    {latitude.toFixed(6)},{" "}
                    {longitude.toFixed(6)}
                  </p>
                </div>
              )}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Complete Service Address
              </label>
              <textarea
                value={address}
                onChange={(e) =>
                  setAddress(e.target.value)
                }
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                placeholder="Enter your complete service address"
              />
            </div>
          </section>
          {/* ABOUT SERVICE */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📝</span>
              <h2 className="text-base font-bold text-slate-900">
                About Your Service
              </h2>
            </div>
            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
              placeholder="Describe your service, experience and what customers can expect..."
            />
          </section>
          {/* CURRENT STATUS */}
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-slate-500">
                Current Availability
              </p>
              <p className="text-sm font-bold text-green-600 mt-0.5">
                ● {provider.availability || "Available"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">
                Service Radius
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {serviceRadius} km
              </p>
            </div>
          </div>
          {/* BUTTONS */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1 pb-4">
            <button
              type="button"
              onClick={() =>
                router.push("/provider/dashboard")
              }
              className="sm:w-32 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold py-2.5 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 text-white text-sm font-bold py-2.5 hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? "Saving Changes..."
                : saveButtonSuccess
                  ? "Saved Successfully"
                  : "✓ Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}