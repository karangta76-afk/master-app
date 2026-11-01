"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  sendUniversalOtp,
  verifyUniversalOtp,
  normalizeMobile,
} from "../../../lib/auth";
import {
  WrenchIcon,
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
  auth_user_id?: string | null;
};

function normalizeStatus(value: unknown): Provider["accountStatus"] {
  const status = String(value || "").toLowerCase();
  if (status === "blocked") return "Blocked";
  if (status === "approved") return "Approved";
  return "Pending";
}

export default function ProviderLoginPage() {
  const router = useRouter();

  // Method: "password" or "otp"
  const [method, setMethod] = useState<"otp" | "password">("password");

  // OTP State
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check URL params for registration redirect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get("email");
      const isRegistered = params.get("registered") === "true";
      if (urlEmail) {
        setIdentifier(urlEmail);
        setMethod("password");
      }
      if (isRegistered) {
        setSuccess("Email verified! Please enter your password to sign in.");
      }
    }
  }, []);

  // Listen for Auto-Fill from floating alert banner
  useEffect(() => {
    function handleAutoFill(e: Event) {
      const customEvent = e as CustomEvent<{ otp: string }>;
      if (customEvent.detail?.otp) {
        setOtp(customEvent.detail.otp);
      }
    }
    window.addEventListener("master-otp-autofill", handleAutoFill);
    return () => {
      window.removeEventListener("master-otp-autofill", handleAutoFill);
    };
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // SEND REAL DYNAMIC OTP (MOBILE SMS OR EMAIL)
  async function handleSendOtp() {
    setError("");
    setSuccess("");

    const cleanInput = mobile.trim();
    const isEmail = cleanInput.includes("@");
    const cleanDigits = cleanInput.replace(/\D/g, "");

    if (isEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanInput.toLowerCase())) {
        setError("Please enter a valid email address.");
        return;
      }
    } else {
      if (!/^[6-9]\d{9}$/.test(cleanDigits.slice(-10))) {
        setError("Please enter a valid 10-digit Indian mobile number or email.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await sendUniversalOtp(cleanInput, isEmail ? "email" : "sms");
      setOtpSent(true);
      setResendCooldown(30);
      setSuccess(
        res.dispatched
          ? res.message
          : `Verification code generated for ${isEmail ? cleanInput : "+91 " + cleanDigits.slice(-10)}!`
      );
    } catch (err) {
      console.error("Provider send OTP error:", err);
      setError(err instanceof Error ? err.message : "Unable to send verification code.");
    } finally {
      setLoading(false);
    }
  }

  // VERIFY REAL DYNAMIC OTP & LOGIN
  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    const cleanInput = mobile.trim();
    const isEmail = cleanInput.includes("@");
    const cleanDigits = cleanInput.replace(/\D/g, "");
    const cleanOtp = otp.trim().replace(/\D/g, "");

    if (isEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanInput.toLowerCase())) {
        setError("Please enter a valid email address.");
        return;
      }
    } else {
      if (!/^[6-9]\d{9}$/.test(cleanDigits.slice(-10))) {
        setError("Please enter a valid 10-digit Indian mobile number.");
        return;
      }
    }

    if (cleanOtp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      await verifyUniversalOtp(cleanInput, cleanOtp);

      const normalizedMob = isEmail ? "" : normalizeMobile(cleanDigits.slice(-10));
      const targetPhone = isEmail ? "" : cleanDigits.slice(-10);

      // Lookup provider in Supabase
      let query = supabase.from("providers").select("*");
      if (isEmail) {
        query = query.ilike("email", cleanInput.toLowerCase());
      } else {
        query = query.or(`mobile.eq.${normalizedMob},mobile.eq.${targetPhone}`);
      }
      const { data: provData, error: lookupErr } = await query.maybeSingle();

      if (lookupErr) {
        console.warn("Provider lookup notice:", lookupErr.message);
      }

      let matchedProvider: Provider | null = null;
      if (provData) {
        matchedProvider = {
          ...(provData as Provider),
          mobile: provData.mobile || targetPhone,
          email: provData.email || (isEmail ? cleanInput.toLowerCase() : ""),
          accountStatus: normalizeStatus(
            (provData as Record<string, unknown>).account_status ??
              (provData as Record<string, unknown>).accountStatus
          ),
        };
      } else {
        // Fallback local storage
        try {
          const savedProviders = JSON.parse(
            window.localStorage.getItem("masterProviders") || "[]"
          ) as Provider[];
          const found = savedProviders.find(
            (p) =>
              (isEmail && p.email?.toLowerCase() === cleanInput.toLowerCase()) ||
              (!isEmail && normalizeMobile(p.mobile || "") === normalizedMob)
          );
          if (found) {
            matchedProvider = {
              ...found,
              mobile: found.mobile || targetPhone,
              email: found.email || (isEmail ? cleanInput.toLowerCase() : ""),
              accountStatus: normalizeStatus(found.accountStatus),
            };
          }
        } catch (_) {}
      }

      if (!matchedProvider) {
        // Redirect to provider registration with verified mobile or email
        setSuccess("Verified! Completing provider profile...");
        setTimeout(() => {
          const param = isEmail
            ? `email=${encodeURIComponent(cleanInput.toLowerCase())}`
            : `mobile=${targetPhone}`;
          router.push(`/provider/register?${param}`);
        }, 400);
        return;
      }

      if (matchedProvider.accountStatus === "Blocked") {
        throw new Error("Your Provider account is blocked. Please contact Master App support.");
      }

      // Hydrate provider session
      window.localStorage.setItem("masterProvider", JSON.stringify(matchedProvider));
      window.localStorage.setItem("masterProviderLoggedIn", "true");
      window.localStorage.setItem("masterProviderId", matchedProvider.id);
      if (matchedProvider.mobile) {
        window.localStorage.setItem("masterProviderMobile", matchedProvider.mobile);
      }
      window.localStorage.setItem("masterActiveRole", "provider");

      window.dispatchEvent(new Event("master-provider-updated"));
      window.dispatchEvent(new Event("master-auth-updated"));

      setSuccess("Provider verified! Opening dashboard...");
      setTimeout(() => {
        router.push("/provider/dashboard");
      }, 350);
    } catch (err) {
      console.error("Provider OTP verify error:", err);
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  // PASSWORD LOGIN
  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setError("Please enter your registered email or 10-digit mobile number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      let emailToAuth = cleanInput;
      const isMobile = /^[6-9]\d{9}$/.test(cleanInput.replace(/\D/g, ""));

      let matchedProvider: Provider | null = null;
      if (isMobile) {
        const cleanMobile = cleanInput.replace(/\D/g, "").slice(-10);
        const { data: provData } = await supabase
          .from("providers")
          .select("*")
          .eq("mobile", cleanMobile)
          .maybeSingle();

        if (provData) {
          matchedProvider = {
            ...(provData as Provider),
            mobile: cleanMobile,
            accountStatus: normalizeStatus(
              (provData as Record<string, unknown>).account_status ??
                (provData as Record<string, unknown>).accountStatus
            ),
          };
          if (provData.email) emailToAuth = provData.email;
        }
      }

      if (matchedProvider?.accountStatus === "Blocked") {
        throw new Error("Your Provider account is blocked. Please contact support.");
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      });

      if (authError) {
        throw new Error("Invalid credentials. Please verify your email/mobile and password.");
      }

      if (!matchedProvider && authData.user) {
        const { data: fetchedProv } = await supabase
          .from("providers")
          .select("*")
          .or(`email.eq.${emailToAuth},auth_user_id.eq.${authData.user.id}`)
          .maybeSingle();

        if (fetchedProv) {
          matchedProvider = {
            ...(fetchedProv as Provider),
            accountStatus: normalizeStatus(
              (fetchedProv as Record<string, unknown>).account_status ??
                (fetchedProv as Record<string, unknown>).accountStatus
            ),
          };
        }
      }

      const activeProviderData = matchedProvider || {
        id: `PROV-${authData.user?.id?.slice(0, 8) || Date.now()}`,
        name: authData.user?.user_metadata?.name || "Service Provider",
        mobile: authData.user?.user_metadata?.mobile || "",
        email: authData.user?.email || emailToAuth,
        service: authData.user?.user_metadata?.service || "Local Services",
        city: "Local",
        address: "",
        experience: "1+ years",
        price: "₹299",
        availability: "Available",
        accountStatus: "Approved",
        createdAt: new Date().toISOString(),
        auth_user_id: authData.user?.id,
      };

      window.localStorage.setItem("masterProvider", JSON.stringify(activeProviderData));
      window.localStorage.setItem("masterProviderLoggedIn", "true");
      window.localStorage.setItem("masterProviderId", activeProviderData.id);
      window.localStorage.setItem("masterProviderMobile", activeProviderData.mobile);
      window.localStorage.setItem("masterActiveRole", "provider");

      window.dispatchEvent(new Event("master-provider-updated"));
      window.dispatchEvent(new Event("master-auth-updated"));

      setSuccess("Authentication verified! Redirecting to Provider Dashboard...");
      setTimeout(() => {
        router.push("/provider/dashboard");
      }, 350);
    } catch (err) {
      console.error("Provider login exception:", err);
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.1),rgba(255,255,255,0))] px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Role Switcher */}
        <div className="mb-5 flex rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xs ring-1 ring-slate-900/5">
          <Link
            href="/login"
            className="flex-1 rounded-xl py-2 text-center text-xs font-semibold text-slate-600 transition hover:text-slate-900 hover:bg-slate-50"
          >
            Customer
          </Link>
          <div className="flex-1 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-2 text-center text-xs font-bold text-white shadow-xs">
            Service Provider
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl ring-1 ring-slate-900/5 sm:p-9">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 text-white shadow-md shadow-orange-600/25">
              <WrenchIcon className="w-7 h-7" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Provider Portal
            </h1>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Sign in with free dynamic OTP or password
            </p>
          </div>

          {/* Login Method Tabs */}
          <div className="mt-6 flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => {
                setMethod("otp");
                setError("");
              }}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                method === "otp"
                  ? "bg-white text-orange-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ⚡ Instant OTP (Mobile / Email)
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("password");
                setError("");
              }}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                method === "password"
                  ? "bg-white text-orange-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🔒 Password
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs font-semibold text-red-700 sm:text-sm">
              <XIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs font-semibold text-emerald-700 sm:text-sm">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* METHOD 1: REAL DYNAMIC OTP */}
          {method === "otp" && (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Registered Mobile or Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      setError("");
                      setOtpSent(false);
                    }}
                    placeholder="Enter 10-digit mobile (+91) or email address"
                    disabled={otpSent}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                    required
                  />
                </div>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-orange-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Generating OTP..." : "Send Verification Code"}
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Enter 6-Digit OTP
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                        }}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-800"
                      >
                        Change Number
                      </button>
                    </div>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, ""));
                        setError("");
                      }}
                      placeholder="• • • • • •"
                      autoFocus
                      className="w-full rounded-2xl border border-orange-300 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.35em] text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-center text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Verify & Access Dashboard"}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-500">Didn&apos;t receive code?</span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || resendCooldown > 0}
                      className="font-bold text-orange-600 hover:text-orange-800 disabled:text-slate-400"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* METHOD 2: PASSWORD */}
          {method === "password" && (
            <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email Address or 10-Digit Mobile
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError("");
                  }}
                  placeholder="provider@service.com or 9876543210"
                  autoComplete="username"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  required
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  <Link
                    href="/login/forgot-password"
                    className="text-xs font-medium text-orange-600 hover:text-orange-700"
                  >
                    Forgot password?
                  </Link>
                </div>
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
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-300 pl-11 pr-11 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-orange-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying Credentials..." : "Sign In to Provider Portal"}
              </button>
            </form>
          )}

          {/* Links */}
          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs text-slate-500">
              New service provider?{" "}
              <Link
                href="/provider/register"
                className="font-bold text-orange-600 hover:text-orange-700 hover:underline"
              >
                Register Here
              </Link>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Looking for Customer Login?{" "}
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
