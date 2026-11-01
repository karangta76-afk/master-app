"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ShieldCheckIcon,
  UsersIcon,
  BriefcaseIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  XIcon,
} from "@/app/components/Icons";

const ADMIN_EMAIL = "admin@masterapp.com";

type AdminProfile = {
  id: string;
  name: string;
  email: string;
  role: "admin";
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [rememberLogin, setRememberLogin] = useState(false);

  useEffect(() => {
    setCheckingSession(false);

    const savedCredentials = window.localStorage.getItem("masterAdminCredentials");
    if (savedCredentials) {
      try {
        const credentials = JSON.parse(savedCredentials);
        if (credentials?.email) setEmail(credentials.email);
        if (credentials?.password) {
          setPassword(credentials.password);
          setRememberLogin(true);
        }
      } catch {
        window.localStorage.removeItem("masterAdminCredentials");
      }
    }

    const loggedIn = window.localStorage.getItem("masterAdminLoggedIn");
    if (loggedIn === "true") {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Attempt Supabase Auth signInWithPassword
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      let isAuthenticated = false;

      if (!authError && authData.user) {
        isAuthenticated = true;
      } else if (cleanEmail === ADMIN_EMAIL && password === "Admin@123") {
        // Fallback for bootstrap when Supabase email provider is pending toggle
        isAuthenticated = true;
      }

      if (!isAuthenticated) {
        if (authError?.message?.includes("email_provider_disabled")) {
          setError(
            "Supabase Email Auth is disabled in your project. Please enable Email Provider in Supabase Dashboard > Authentication > Providers > Email."
          );
        } else {
          setError("Invalid admin email or password.");
        }
        setLoading(false);
        return;
      }

      const adminProfile: AdminProfile = {
        id: "ADMIN-001",
        name: "Master App Admin",
        email: cleanEmail,
        role: "admin",
      };

      window.localStorage.setItem("masterAdmin", JSON.stringify(adminProfile));
      window.localStorage.setItem("masterAdminLoggedIn", "true");

      if (rememberLogin) {
        window.localStorage.setItem(
          "masterAdminCredentials",
          JSON.stringify({
            email: cleanEmail,
            password,
          })
        );
      } else {
        window.localStorage.removeItem("masterAdminCredentials");
      }

      window.dispatchEvent(new Event("master-auth-updated"));
      router.replace("/admin/dashboard");
    } catch (err) {
      console.error("Admin login error:", err);
      if (cleanEmail === ADMIN_EMAIL && password === "Admin@123") {
        const adminProfile: AdminProfile = {
          id: "ADMIN-001",
          name: "Master App Admin",
          email: cleanEmail,
          role: "admin",
        };
        window.localStorage.setItem("masterAdmin", JSON.stringify(adminProfile));
        window.localStorage.setItem("masterAdminLoggedIn", "true");
        window.dispatchEvent(new Event("master-auth-updated"));
        router.replace("/admin/dashboard");
      } else {
        setError("Unable to authenticate admin session. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.12),rgba(255,255,255,0))] px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl ring-1 ring-slate-900/5 sm:p-9">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white shadow-md shadow-slate-900/25">
              <ShieldCheckIcon className="w-7 h-7" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Admin Gateway
            </h1>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Platform administration & security control center
            </p>
          </div>

          {/* Session check */}
          {checkingSession && (
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs font-semibold text-blue-700 sm:text-sm">
              Checking secure admin session...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs font-semibold text-red-700 sm:text-sm">
              <XIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@masterapp.com"
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-slate-300 pl-4 pr-11 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOffIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || checkingSession}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-slate-900/25 transition hover:bg-slate-800 active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheckIcon className="w-4 h-4" />
              <span>{loading ? "Authenticating..." : "Sign In to Admin Console"}</span>
            </button>
          </form>

          {/* Credentials Helper */}
          <div className="mt-6 rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Admin Access:
            </p>
            <div className="mt-2 space-y-1 text-xs text-blue-800">
              <p><span className="font-semibold text-blue-950">Email:</span> admin@masterapp.com</p>
              <p><span className="font-semibold text-blue-950">Password:</span> Admin@123</p>
            </div>
          </div>

          {/* Alternate Portals */}
          <div className="mt-7 border-t border-slate-100 pt-5">
            <p className="mb-3 text-center text-xs text-slate-500">
              Alternate Account Portals
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30"
              >
                <UsersIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Customer</span>
              </Link>
              <Link
                href="/provider/login"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30"
              >
                <BriefcaseIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Provider</span>
              </Link>
            </div>
          </div>

          {/* Home */}
          <div className="mt-5 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <span>←</span>
              <span>Return to Master App Marketplace</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
