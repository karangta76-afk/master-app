"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  sendUniversalOtp,
  verifyUniversalOtp,
  normalizeMobile,
} from "@/lib/auth";
import {
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  XIcon,
  CheckCircleIcon,
  ArrowUpRightIcon,
  ShieldCheckIcon,
} from "@/app/components/Icons";

type Customer = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  state?: string;
  city?: string;
  area?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  account_status?: string;
  auth_user_id?: string | null;
};

function getSafeRedirect() {
  if (typeof window === "undefined") return "/services";
  const params = new URLSearchParams(window.location.search);
  const redirectFromUrl = params.get("redirect");
  const savedRedirect = localStorage.getItem("masterPostLoginRedirect");
  if (
    redirectFromUrl &&
    redirectFromUrl.startsWith("/") &&
    !redirectFromUrl.startsWith("//")
  ) {
    return redirectFromUrl;
  }
  if (
    savedRedirect &&
    savedRedirect.startsWith("/") &&
    !savedRedirect.startsWith("//")
  ) {
    return savedRedirect;
  }
  return "/services";
}

export default function CustomerLoginPage() {
  // Method: "password" or "otp"
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("password");

  // OTP State
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status State
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
        setLoginMethod("password");
      }
      if (isRegistered) {
        setSuccess("Email verified! Please enter your password to sign in.");
      }
    }
  }, []);

  // Listen for Auto-Fill from the floating SMS alert
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

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Send Dynamic OTP (Mobile SMS or Email)
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
      console.error("Send OTP error:", err);
      setError(err instanceof Error ? err.message : "Unable to send verification code.");
    } finally {
      setLoading(false);
    }
  }

  // Verify Dynamic OTP & Log In
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
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

      // Check for customer record in Supabase
      let query = supabase.from("customers").select("*");
      if (isEmail) {
        query = query.ilike("email", cleanInput.toLowerCase());
      } else {
        query = query.or(`mobile.eq.${normalizedMob},mobile.eq.${targetPhone}`);
      }
      const { data: dbProfile, error: dbErr } = await query.maybeSingle();

      if (dbErr) {
        console.warn("Customer lookup notice:", dbErr.message);
      }

      if (dbProfile) {
        if (dbProfile.account_status === "Blocked") {
          throw new Error("Your Customer account is blocked. Please contact support.");
        }

        const customerProfile: Customer = {
          ...dbProfile,
          mobile: dbProfile.mobile || targetPhone,
          email: dbProfile.email || (isEmail ? cleanInput.toLowerCase() : ""),
        };

        localStorage.setItem("masterUser", JSON.stringify(customerProfile));
        if (customerProfile.mobile) {
          localStorage.setItem("masterUserMobile", customerProfile.mobile);
        }
        localStorage.setItem("masterActiveRole", "customer");
        localStorage.setItem("masterOtpVerified", "true");
        localStorage.setItem("masterVerifiedMobile", isEmail ? cleanInput.toLowerCase() : normalizedMob);

        window.dispatchEvent(new Event("master-auth-updated"));
        window.dispatchEvent(new Event("master-customer-updated"));

        setSuccess("Verification successful! Redirecting...");
        const redirectPath = getSafeRedirect();
        localStorage.removeItem("masterPostLoginRedirect");

        setTimeout(() => {
          window.location.href = redirectPath;
        }, 350);
      } else {
        // First-time user, redirect to complete registration with verified contact
        setSuccess("Verified! Completing your profile...");
        setTimeout(() => {
          const param = isEmail
            ? `email=${encodeURIComponent(cleanInput.toLowerCase())}`
            : `mobile=${targetPhone}`;
          window.location.href = `/login/register?${param}`;
        }, 400);
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Password Login Fallback
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setError("Please enter your registered email or mobile.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      let loginEmail = cleanInput.toLowerCase();
      const isMobile = /^[6-9]\d{9}$/.test(cleanInput.replace(/\D/g, ""));

      if (isMobile) {
        const cleanMobile = cleanInput.replace(/\D/g, "");
        const normalizedMob = normalizeMobile(cleanMobile);
        const { data: customerRecord } = await supabase
          .from("customers")
          .select("*")
          .or(`mobile.eq.${normalizedMob},mobile.eq.${cleanMobile}`)
          .maybeSingle();

        if (customerRecord && customerRecord.email) {
          loginEmail = customerRecord.email.toLowerCase();
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) {
        throw new Error("Invalid email/mobile or password. Please verify your credentials.");
      }

      if (!authData.user) {
        throw new Error("Login failed. No user record returned.");
      }

      // Fetch profile
      const { data: dbProfile } = await supabase
        .from("customers")
        .select("*")
        .or(`auth_user_id.eq.${authData.user.id},email.eq.${loginEmail}`)
        .maybeSingle();

      const metadata = authData.user.user_metadata || {};
      const customerProfile: Customer = dbProfile
        ? { ...dbProfile, auth_user_id: authData.user.id }
        : {
            id: `CUST-${authData.user.id.slice(0, 8)}`,
            name: metadata.name || "Customer",
            email: loginEmail,
            mobile: metadata.mobile || "",
            account_status: "Active",
            auth_user_id: authData.user.id,
          };

      localStorage.setItem("masterUser", JSON.stringify(customerProfile));
      localStorage.setItem("masterActiveRole", "customer");
      localStorage.setItem("masterOtpVerified", "true");

      window.dispatchEvent(new Event("master-auth-updated"));
      window.dispatchEvent(new Event("master-customer-updated"));

      setSuccess("Authentication successful! Redirecting...");
      const redirectPath = getSafeRedirect();
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 350);
    } catch (err) {
      console.error("Password login error:", err);
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.12),rgba(255,255,255,0))] px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Role Segment Switcher */}
        <div className="mb-5 flex rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xs ring-1 ring-slate-900/5">
          <div className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-2 text-center text-xs font-bold text-white shadow-xs">
            Customer
          </div>
          <Link
            href="/provider/login"
            className="flex-1 rounded-xl py-2 text-center text-xs font-semibold text-slate-600 transition hover:text-slate-900 hover:bg-slate-50"
          >
            Service Provider
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl ring-1 ring-slate-900/5 sm:p-9">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-700 text-xl font-bold text-white shadow-md shadow-blue-600/25">
              M
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Customer Sign In
            </h1>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Instant access with free dynamic OTP or password
            </p>
          </div>

          {/* Login Method Tabs */}
          <div className="mt-6 flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => {
                setLoginMethod("password");
                setError("");
              }}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                loginMethod === "password"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🔒 Password
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod("otp");
                setError("");
              }}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                loginMethod === "otp"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ⚡ Instant OTP
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs font-semibold text-red-700 sm:text-sm">
              <XIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs font-semibold text-emerald-700 sm:text-sm">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* METHOD 1: REAL DYNAMIC OTP */}
          {loginMethod === "otp" && (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mobile Number or Email
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
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    required
                  />
                </div>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
                          setError("");
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
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
                      className="w-full rounded-2xl border border-blue-300 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.35em] text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-center text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-500">Didn&apos;t receive code?</span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || resendCooldown > 0}
                      className="font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* METHOD 2: PASSWORD */}
          {loginMethod === "password" && (
            <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email Address or Mobile
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError("");
                    }}
                    placeholder="user@example.com or 9876543210"
                    className="w-full rounded-2xl border border-slate-300 pl-11 pr-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  <Link
                    href="/login/forgot-password"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Authenticating..." : "Sign In with Password"}
              </button>
            </form>
          )}

          {/* Registration Footer */}
          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/login/register"
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Create Account
              </Link>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Want to offer services?{" "}
              <Link
                href="/provider/register"
                className="font-semibold text-slate-600 hover:text-slate-900 hover:underline"
              >
                Join as Service Provider
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
