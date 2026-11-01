"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  sendUniversalOtp,
  verifyUniversalOtp,
  normalizeMobile,
} from "../../../lib/auth";
import ProviderLocationPicker from "../../components/ProviderLocationPicker";
import { supabase } from "../../../lib/supabase";
import {
  UserIcon,
  LockIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  XIcon,
} from "@/app/components/Icons";

type Customer = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  state?: string;
  city?: string;
  area?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  auth_user_id?: string | null;
};

export default function CustomerRegisterPage() {
  const router = useRouter();

  // Step 1: Form details & Password | Step 2: OTP Verification
  const [step, setStep] = useState<1 | 2>(1);

  // Profile Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Verification Channel: Email (Gmail direct SMTP) or SMS (Textbee Android Gateway)
  const [verificationChannel, setVerificationChannel] = useState<"sms" | "email">("email");

  // OTP Verification State
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpMessage, setOtpMessage] = useState("");

  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Pre-fill from URL params
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

  // STEP 1: SUBMIT DETAILS & DISPATCH REAL OTP (SMS OR EMAIL)
  async function handleStartVerification(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setOtpMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.replace(/\D/g, "");
    const cleanPassword = password;
    const cleanAddress = address.trim();

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
    if (cleanAddress.length < 5) {
      setError("Please enter your complete address (minimum 5 characters).");
      return;
    }

    setLoading(true);

    try {
      // Check if email or mobile is already registered
      const normalizedMob = normalizeMobile(cleanMobile.slice(-10));
      const { data: existing } = await supabase
        .from("customers")
        .select("id, email, mobile")
        .or(`email.ilike.${cleanEmail},mobile.eq.${normalizedMob},mobile.eq.${cleanMobile.slice(-10)}`)
        .limit(1);

      if (existing && existing.length > 0) {
        setError("An account with this email or mobile already exists. Please sign in instead.");
        setLoading(false);
        return;
      }

      // Dispatch genuine verification code via chosen channel
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
      console.error("Signup dispatch error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not send verification code. Please check your configuration."
      );
    } finally {
      setLoading(false);
    }
  }

  // STEP 2: VERIFY OTP & CREATE ACCOUNT
  async function handleCompleteSignup(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");

    const cleanOtp = otp.trim().replace(/\D/g, "");
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
    const cleanName = name.trim();
    const cleanAddress = address.trim();

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

      const accountId = `CUST-${Date.now()}`;
      const createdAt = new Date().toISOString();

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
              role: "customer",
            },
          },
        });
        if (!authError && authData.user) {
          authUserId = authData.user.id;
        }
      } catch (authErr) {
        console.warn("Supabase auth signup notice:", authErr);
      }

      const newCustomer: Customer = {
        id: accountId,
        name: cleanName,
        mobile: cleanMobile,
        email: cleanEmail,
        address: cleanAddress,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        area: area.trim() || undefined,
        pincode: pincode.trim() || undefined,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        createdAt,
        auth_user_id: authUserId,
      };

      // 3. Save to Supabase public.customers table
      try {
        await supabase.from("customers").insert({
          id: newCustomer.id,
          name: newCustomer.name,
          mobile: newCustomer.mobile,
          email: newCustomer.email,
          address: newCustomer.address,
          state: newCustomer.state,
          city: newCustomer.city,
          area: newCustomer.area,
          pincode: newCustomer.pincode,
          latitude: newCustomer.latitude,
          longitude: newCustomer.longitude,
          account_status: "Active",
          auth_user_id: authUserId,
        });
      } catch (insertErr) {
        console.warn("Customer database insert note:", insertErr);
      }

      // 4. Update local storage for seamless immediate access
      let existingList: Customer[] = [];
      try {
        existingList = JSON.parse(
          localStorage.getItem("masterCustomers") || "[]"
        ) as Customer[];
      } catch {
        existingList = [];
      }
      localStorage.setItem("masterCustomers", JSON.stringify([...existingList, newCustomer]));
      localStorage.setItem("masterUser", JSON.stringify(newCustomer));
      localStorage.setItem("masterUserMobile", cleanMobile);
      localStorage.setItem("masterActiveRole", "customer");
      localStorage.setItem("masterOtpVerified", "true");
      localStorage.setItem("masterVerifiedMobile", cleanEmail);

      window.dispatchEvent(new Event("master-auth-updated"));
      window.dispatchEvent(new Event("master-customer-updated"));

      // Redirect to login page where password signin is open
      router.push(`/login?registered=true&email=${encodeURIComponent(cleanEmail)}`);
    } catch (err) {
      console.error("Verification and signup error:", err);
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
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
    <main className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.08),rgba(255,255,255,0))] px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-xl">
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl ring-1 ring-slate-900/5 sm:p-9">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-700 text-xl font-bold text-white shadow-md shadow-blue-600/25">
              M
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {step === 1 ? "Create Customer Account" : "Verify Your Account"}
            </h1>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              {step === 1
                ? "Step 1 of 2 • Enter profile details & password"
                : `Step 2 of 2 • Enter the 6-digit code sent to ${
                    verificationChannel === "email" ? email : `+91 ${mobile}`
                  }`}
            </p>
          </div>

          {/* Progress Indicators */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className={`h-1.5 w-16 rounded-full transition-all ${step >= 1 ? "bg-blue-600" : "bg-slate-200"}`} />
            <div className={`h-1.5 w-16 rounded-full transition-all ${step >= 2 ? "bg-blue-600" : "bg-slate-200"}`} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs font-semibold text-red-700 sm:text-sm">
              <XIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: REGISTRATION DETAILS FORM */}
          {step === 1 && (
            <form onSubmit={handleStartVerification} className="mt-6 space-y-4">
              {/* Full Name */}
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
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-2xl border border-slate-300 pl-11 pr-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              {/* Email & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      placeholder="yourname@gmail.com"
                      className="w-full rounded-2xl border border-slate-300 pl-11 pr-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Mobile Number *
                  </label>
                  <div className="flex">
                    <div className="flex items-center rounded-l-2xl border border-r-0 border-slate-300 bg-slate-50 px-3.5 font-bold text-slate-600 text-xs">
                      +91
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value.replace(/\D/g, ""));
                        setError("");
                      }}
                      placeholder="9876543210"
                      className="w-full rounded-r-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      required
                    />
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
                        ? "border-blue-600 bg-blue-50/80 text-blue-700 ring-2 ring-blue-500/20"
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
                        ? "border-blue-600 bg-blue-50/80 text-blue-700 ring-2 ring-blue-500/20"
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

              {/* Create Password */}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="At least 6 characters"
                    className="w-full rounded-2xl border border-slate-300 pl-11 pr-11 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  You will use this password to sign in after verification
                </p>
              </div>

              {/* Location Picker */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      📍 Service Location
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Pick your location on the map.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationPickerOpen(true)}
                    className="shrink-0 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-700 shadow-sm"
                  >
                    Pick Location
                  </button>
                </div>

                {locationMessage ? (
                  <p className="mt-2.5 text-xs font-semibold text-emerald-700">
                    🟢 {locationMessage}
                  </p>
                ) : latitude !== null && longitude !== null ? (
                  <p className="mt-2 text-[11px] font-mono text-slate-600">
                    Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </p>
                ) : null}

                <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-slate-600">
                      Area
                    </label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="Area"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Complete Address */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Complete Address *
                </label>
                <textarea
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setError("");
                  }}
                  placeholder="House/Flat number, building, street, locality"
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm">
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
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full rounded-2xl border border-blue-300 bg-white px-4 py-3.5 text-center text-3xl font-black tracking-[0.35em] text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
                    className="font-semibold text-blue-600 hover:underline disabled:text-slate-400"
                  >
                    Switch to {verificationChannel === "sms" ? "Email OTP" : "SMS OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResendOrSwitch(verificationChannel)}
                    disabled={resendCooldown > 0 || loading}
                    className="font-bold text-blue-700 hover:text-blue-900 disabled:text-slate-400"
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
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Sign In with Password
              </Link>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Want to offer services?{" "}
              <Link
                href="/provider/register"
                className="font-semibold text-slate-600 hover:text-slate-900 hover:underline"
              >
                Register as Provider
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
