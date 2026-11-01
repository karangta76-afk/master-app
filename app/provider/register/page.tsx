"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveProvider } from "../../../lib/db";
import { supabase } from "../../../lib/supabase";
import {
  sendUniversalOtp,
  verifyUniversalOtp,
  normalizeMobile,
} from "../../../lib/auth";
import ProviderLocationPicker from "../../components/ProviderLocationPicker";
import {
  WrenchIcon,
  UserIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  XIcon,
} from "@/app/components/Icons";

type Provider = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  service: string;
  city: string;
  address: string;
  experience: string;
  price: string;
  availability: "Available" | "Not Available" | "Temporarily Unavailable";
  accountStatus: "Pending" | "Approved" | "Blocked";
  createdAt: string;
  customServiceName?: string;
  customServiceDescription?: string;
  serviceCategoryId?: string;
  categoryRequestStatus?: string;
  state?: string;
  area?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  auth_user_id?: string | null;
};

type ServiceCategory = {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  is_active: boolean;
};

const fallbackServices: ServiceCategory[] = [
  { id: "electrician", name: "Electrician", icon: "⚡", description: "Electrical repair & installation", is_active: true },
  { id: "plumber", name: "Plumber", icon: "🔧", description: "Pipes, taps & water repair", is_active: true },
  { id: "ac-repair", name: "AC Repair", icon: "❄️", description: "AC service & repair", is_active: true },
  { id: "carpenter", name: "Carpenter", icon: "🪚", description: "Furniture & wood work", is_active: true },
  { id: "painter", name: "Painter", icon: "🎨", description: "Home & office painting", is_active: true },
  { id: "appliance-repair", name: "Appliance Repair", icon: "🔌", description: "Home appliance repair", is_active: true },
  { id: "cleaning", name: "Cleaning", icon: "🧹", description: "Home & office cleaning", is_active: true },
  { id: "other", name: "Other", icon: "🛠️", description: "Other local services", is_active: true },
];

export default function ProviderRegisterPage() {
  const router = useRouter();

  // Step 1: Details & Password | Step 2: OTP Verification
  const [step, setStep] = useState<1 | 2>(1);

  // Form Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [service, setService] = useState("");
  const [experience, setExperience] = useState("");
  const [price, setPrice] = useState("");
  const [customServiceName, setCustomServiceName] = useState("");
  const [customServiceDescription, setCustomServiceDescription] = useState("");

  // Verification Channel: Email (Gmail direct SMTP) or SMS (Textbee Android Gateway)
  const [verificationChannel, setVerificationChannel] = useState<"sms" | "email">("email");

  // Location Details
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  // OTP Verification
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpMessage, setOtpMessage] = useState("");

  // Status
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(fallbackServices);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Load service categories
  useEffect(() => {
    let mounted = true;
    async function loadServiceCategories() {
      try {
        const { data, error: catError } = await supabase
          .from("service_categories")
          .select("id, name, icon, description, is_active")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (!catError && mounted && data && data.length > 0) {
          setServiceCategories(data);
        }
      } catch (_) {
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    }
    void loadServiceCategories();
    return () => {
      mounted = false;
    };
  }, []);

  // Pre-fill from query parameters if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get("email");
      const urlMobile = params.get("mobile");
      if (urlEmail) {
        setEmail(urlEmail);
        setVerificationChannel("email");
      }
      if (urlMobile && /^[6-9]\d{9}$/.test(urlMobile)) {
        setMobile(urlMobile);
        setVerificationChannel("sms");
      }
    }
  }, []);

  // Auto-detect current GPS location
  async function detectMyLocation() {
    setError("");
    setLocationMessage("");
    if (!navigator.geolocation) return;

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { Accept: "application/json" } }
          );
          if (res.ok) {
            const data = await res.json();
            const loc = data?.address || {};
            const detectedState = loc.state || "";
            const detectedCity = loc.city || loc.town || loc.municipality || "";
            const detectedArea = loc.suburb || loc.neighbourhood || "";
            const detectedPincode = (loc.postcode || "").replace(/\D/g, "").slice(0, 6);

            if (detectedState) setState(detectedState);
            if (detectedCity) setCity(detectedCity);
            if (detectedArea) setArea(detectedArea);
            if (detectedPincode) setPincode(detectedPincode);

            setLocationMessage(`📍 Detected: ${[detectedArea, detectedCity, detectedState].filter(Boolean).join(", ")}`);
          }
        } catch (_) {
        } finally {
          setLocationLoading(false);
        }
      },
      () => setLocationLoading(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  // STEP 1: VALIDATE DETAILS & SEND OTP (SMS OR EMAIL)
  async function handleStartVerification(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setOtpMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.replace(/\D/g, "");
    const cleanPassword = password;
    const cleanService = service.trim();
    const cleanCity = city.trim();
    const cleanAddress = address.trim();
    const cleanExperience = experience.trim();
    const cleanPrice = price.trim();

    if (cleanName.length < 2) {
      setError("Please enter your full name (minimum 2 characters).");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanMobile.slice(-10))) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (cleanPassword.length < 6) {
      setError("Please create a password with at least 6 characters.");
      return;
    }
    if (!cleanService) {
      setError("Please select the service specialization you offer.");
      return;
    }
    if (cleanCity.length < 2) {
      setError("Please enter your city.");
      return;
    }
    if (cleanAddress.length < 5) {
      setError("Please enter your complete workshop / office address.");
      return;
    }
    if (!cleanExperience) {
      setError("Please enter your work experience (e.g. 5 years).");
      return;
    }
    if (!cleanPrice) {
      setError("Please enter your starting service price (e.g. ₹299).");
      return;
    }

    setLoading(true);

    try {
      const normalizedMob = normalizeMobile(cleanMobile.slice(-10));

      // Check if email or mobile is already in providers table
      const { data: existing } = await supabase
        .from("providers")
        .select("id, email, mobile")
        .or(`email.ilike.${cleanEmail},mobile.eq.${normalizedMob},mobile.eq.${cleanMobile.slice(-10)}`)
        .limit(1);

      if (existing && existing.length > 0) {
        setError("A provider account with this email or mobile already exists. Please log in.");
        setLoading(false);
        return;
      }

      // Dispatch genuine verification code
      const target = verificationChannel === "email" ? cleanEmail : normalizedMob;
      const res = await sendUniversalOtp(target, verificationChannel);
      setOtpMessage(
        res.message ||
          `Verification code sent to ${
            verificationChannel === "email" ? cleanEmail : `+91 ${cleanMobile.slice(-10)}`
          }`
      );
      setResendCooldown(30);
      setStep(2);
    } catch (err) {
      console.error("Provider signup dispatch error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not send verification code. Please check your configuration."
      );
    } finally {
      setLoading(false);
    }
  }

  // STEP 2: VERIFY OTP & CREATE PROVIDER ACCOUNT
  async function handleCompleteSignup(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");

    const cleanOtp = otp.trim().replace(/\D/g, "");
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
    const cleanName = name.trim();
    const cleanService = service.trim();
    const cleanCity = city.trim();
    const cleanAddress = address.trim();
    const cleanExperience = experience.trim();
    const cleanPrice = price.trim();

    if (cleanOtp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      // 1. Verify OTP code against the active target
      const normalizedMob = normalizeMobile(cleanMobile);
      const activeTarget = verificationChannel === "email" ? cleanEmail : normalizedMob;
      await verifyUniversalOtp(activeTarget, cleanOtp);

      const newProviderId = `PROV-${Date.now()}`;
      const isOther = cleanService.toLowerCase() === "other";
      const selectedCat = serviceCategories.find(
        (c) => c.name.toLowerCase() === cleanService.toLowerCase()
      );

      let authUserId: string | null = null;

      // 2. Register user in Supabase Auth with their password
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: cleanName,
              mobile: cleanMobile,
              role: "provider",
              service: cleanService,
            },
          },
        });
        if (!authError && authData.user) {
          authUserId = authData.user.id;
        }
      } catch (authErr) {
        console.warn("Supabase auth provider signup notice:", authErr);
      }

      const newProvider: Provider = {
        id: newProviderId,
        name: cleanName,
        mobile: cleanMobile,
        email: cleanEmail,
        service: cleanService,
        state: state.trim() || undefined,
        city: cleanCity,
        area: area.trim() || undefined,
        pincode: pincode.trim() || undefined,
        address: cleanAddress,
        latitude,
        longitude,
        experience: cleanExperience,
        price: cleanPrice,
        availability: "Available",
        accountStatus: "Approved",
        createdAt: new Date().toISOString(),
        customServiceName: isOther ? customServiceName : undefined,
        customServiceDescription: isOther ? customServiceDescription : undefined,
        serviceCategoryId: selectedCat?.id || undefined,
        categoryRequestStatus: isOther ? "Pending" : "None",
        auth_user_id: authUserId,
      };

      // 3. Save to Supabase public.providers table
      try {
        await saveProvider({
          id: newProvider.id,
          name: newProvider.name,
          mobile: newProvider.mobile,
          email: newProvider.email,
          service: newProvider.service,
          city: newProvider.city,
          address: newProvider.address,
          experience: newProvider.experience,
          price: newProvider.price,
          availability: newProvider.availability,
          account_status: newProvider.accountStatus,
        });

        await supabase
          .from("providers")
          .update({
            state: state.trim() || null,
            city: cleanCity,
            area: area.trim() || null,
            pincode: pincode.trim() || null,
            address: cleanAddress,
            latitude,
            longitude,
            custom_service_name: isOther ? customServiceName : null,
            custom_service_description: isOther ? customServiceDescription : null,
            service_category_id: selectedCat?.id || null,
            category_request_status: isOther ? "Pending" : "None",
            auth_user_id: authUserId,
          })
          .eq("id", newProviderId);
      } catch (saveErr) {
        console.warn("Provider database save notice:", saveErr);
      }

      // 4. Update local storage for seamless immediate access
      let existingProviders: Provider[] = [];
      try {
        existingProviders = JSON.parse(
          window.localStorage.getItem("masterProviders") || "[]"
        ) as Provider[];
      } catch {
        existingProviders = [];
      }
      window.localStorage.setItem(
        "masterProviders",
        JSON.stringify([...existingProviders, newProvider])
      );
      window.localStorage.setItem("masterProvider", JSON.stringify(newProvider));
      window.localStorage.setItem("masterProviderLoggedIn", "true");
      window.localStorage.setItem("masterProviderId", newProvider.id);
      window.localStorage.setItem("masterProviderMobile", newProvider.mobile);
      window.localStorage.setItem("masterActiveRole", "provider");
      window.localStorage.setItem("masterOtpVerified", "true");
      window.localStorage.setItem("masterVerifiedMobile", cleanEmail);

      window.dispatchEvent(new Event("master-provider-updated"));
      window.dispatchEvent(new Event("master-auth-updated"));

      // Redirect to provider login page with email prefilled
      router.push(`/provider/login?registered=true&email=${encodeURIComponent(cleanEmail)}`);
    } catch (err) {
      console.error("Provider registration error:", err);
      setError(err instanceof Error ? err.message : "Registration could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  // Resend or Switch Channel
  async function handleResendOrSwitch(targetChannel: "sms" | "email") {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
      const normalizedMob = normalizeMobile(cleanMobile);
      const target = targetChannel === "email" ? cleanEmail : normalizedMob;

      const res = await sendUniversalOtp(target, targetChannel);
      setVerificationChannel(targetChannel);
      setOtpMessage(
        res.message ||
          `New code sent to ${targetChannel === "email" ? cleanEmail : `+91 ${cleanMobile}`}`
      );
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.08),rgba(255,255,255,0))] px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl ring-1 ring-slate-900/5 sm:p-9">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 text-white shadow-md shadow-orange-600/25">
              <WrenchIcon className="w-7 h-7" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Become a Service Provider
            </h1>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              {step === 1
                ? "Step 1 of 2 • Enter profile details & password"
                : `Step 2 of 2 • Enter the 6-digit code sent to ${
                    verificationChannel === "sms" ? `+91 ${mobile}` : email
                  }`}
            </p>
          </div>

          {/* Progress Indicators */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className={`h-1.5 w-20 rounded-full transition-all ${step >= 1 ? "bg-orange-600" : "bg-slate-200"}`} />
            <div className={`h-1.5 w-20 rounded-full transition-all ${step >= 2 ? "bg-orange-600" : "bg-slate-200"}`} />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs font-semibold text-red-700 sm:text-sm">
              <XIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: COMPLETE PROVIDER PROFILE & PASSWORD */}
          {step === 1 && (
            <form onSubmit={handleStartVerification} className="mt-6 space-y-4">
              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full rounded-2xl border border-slate-300 pl-11 pr-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <MailIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rajesh@gmail.com"
                      className="w-full rounded-2xl border border-slate-300 pl-11 pr-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Number & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    10-Digit Mobile Number *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-2xl border border-r-0 border-slate-300 bg-slate-100 px-3.5 text-xs font-bold text-slate-600">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      className="w-full rounded-r-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Create Password *
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <LockIcon className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full rounded-2xl border border-slate-300 pl-11 pr-11 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Verification Channel Selector */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Verify Account Via *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVerificationChannel("sms")}
                    className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-bold transition ${
                      verificationChannel === "sms"
                        ? "border-orange-600 bg-orange-50/80 text-orange-700 ring-2 ring-orange-500/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>📱</span>
                    <span>SMS to Phone (+91)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationChannel("email")}
                    className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-bold transition ${
                      verificationChannel === "email"
                        ? "border-orange-600 bg-orange-50/80 text-orange-700 ring-2 ring-orange-500/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>✉️</span>
                    <span>Email to Gmail</span>
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {verificationChannel === "sms"
                    ? "Carrier SMS code will be sent to your mobile via your connected Textbee Android gateway."
                    : "6-digit code will be sent directly to your Gmail inbox."}
                </p>
              </div>

              {/* Service Specialization */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Service Specialization *
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  disabled={categoriesLoading}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  required
                >
                  <option value="">
                    {categoriesLoading ? "Loading services..." : "Select Your Trade / Service"}
                  </option>
                  {serviceCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Service Option */}
              {service.toLowerCase() === "other" && (
                <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-900">
                    🛠️ Custom Service Details
                  </p>
                  <div>
                    <input
                      type="text"
                      value={customServiceName}
                      onChange={(e) => setCustomServiceName(e.target.value)}
                      placeholder="Service Name (e.g. Solar Panel Cleaning)"
                      className="w-full rounded-xl border border-purple-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-600"
                      required
                    />
                  </div>
                  <div>
                    <textarea
                      value={customServiceDescription}
                      onChange={(e) => setCustomServiceDescription(e.target.value)}
                      placeholder="Brief description of the service you provide..."
                      rows={2}
                      className="w-full resize-none rounded-xl border border-purple-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-600"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Experience & Starting Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Experience *
                  </label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 5 years"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Starting Price *
                  </label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. ₹299"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    required
                  />
                </div>
              </div>

              {/* Service Location */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      📍 Service Operating Location
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Pin your workshop location so nearby customers can discover you.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={detectMyLocation}
                      disabled={locationLoading}
                      className="shrink-0 rounded-xl bg-slate-100 border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      {locationLoading ? "Detecting..." : "Auto-Detect"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationPickerOpen(true)}
                      className="shrink-0 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-700 shadow-sm"
                    >
                      Map Picker
                    </button>
                  </div>
                </div>

                {locationMessage ? (
                  <p className="mt-2.5 text-xs font-semibold text-emerald-700">
                    🟢 {locationMessage}
                  </p>
                ) : latitude !== null && longitude !== null ? (
                  <p className="mt-2 text-[11px] font-mono text-slate-600">
                    GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </p>
                ) : null}

                <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                      City *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                      Area / Locality
                    </label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="Area"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                      State
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                      Pincode
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Pincode"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Complete Address */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Complete Office / Workshop Address *
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shop/Office number, building, locality, city"
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  required
                />
              </div>

              <ProviderLocationPicker
                open={locationPickerOpen}
                onClose={() => setLocationPickerOpen(false)}
                initialLocation={{
                  latitude: latitude ?? undefined,
                  longitude: longitude ?? undefined,
                  state,
                  city,
                  area,
                  pincode,
                  address,
                }}
                onSelect={(selected) => {
                  setLatitude(selected.latitude);
                  setLongitude(selected.longitude);
                  if (selected.state) setState(selected.state);
                  if (selected.city) setCity(selected.city);
                  if (selected.area) setArea(selected.area);
                  if (selected.pincode) setPincode(selected.pincode);
                  if (selected.address) setAddress(selected.address);
                  setLocationMessage(
                    selected.address ||
                      [selected.area, selected.city, selected.state, selected.pincode].filter(Boolean).join(", ")
                  );
                  setLocationPickerOpen(false);
                }}
              />

              {/* Submit to Step 2 */}
              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-orange-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Sending Code..."
                  : `Continue to ${verificationChannel === "sms" ? "SMS" : "Email"} Verification →`}
              </button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === 2 && (
            <form onSubmit={handleCompleteSignup} className="mt-6 space-y-5">
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white font-bold text-sm">
                    {verificationChannel === "sms" ? "📱" : "✉️"}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Verification Code Dispatched
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-blue-800">
                      Code sent to{" "}
                      <span className="font-bold underline">
                        {verificationChannel === "sms" ? `+91 ${mobile}` : email}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-blue-600">
                      {verificationChannel === "sms"
                        ? "Check your phone SMS inbox. Carrier SMS sent via Textbee Android gateway."
                        : "Check your Gmail inbox (or spam folder) and enter the 6-digit code."}
                    </p>
                  </div>
                </div>
              </div>

              {otpMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{otpMessage}</span>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full rounded-2xl border border-orange-300 bg-white px-4 py-3.5 text-center text-3xl font-black tracking-[0.35em] text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 py-3.5 text-center text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying & Creating Account..." : "Verify Code & Complete Registration"}
              </button>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-800 font-medium"
                >
                  ← Edit Details
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleResendOrSwitch(verificationChannel === "sms" ? "email" : "sms")
                    }
                    disabled={resendCooldown > 0 || loading}
                    className="font-semibold text-orange-600 hover:underline disabled:text-slate-400"
                  >
                    Switch to {verificationChannel === "sms" ? "Email OTP" : "SMS OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResendOrSwitch(verificationChannel)}
                    disabled={resendCooldown > 0 || loading}
                    className="font-bold text-orange-700 hover:text-orange-900 disabled:text-slate-400"
                  >
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Links Footer */}
          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs text-slate-500">
              Already have a Provider account?{" "}
              <Link
                href="/provider/login"
                className="font-bold text-orange-600 hover:text-orange-700 hover:underline"
              >
                Sign In with Password
              </Link>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Looking for service booking?{" "}
              <Link
                href="/login"
                className="font-semibold text-slate-600 hover:text-slate-900 hover:underline"
              >
                Customer Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
