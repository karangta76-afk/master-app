"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  MailIcon,
  CheckCircleIcon,
  XIcon,
} from "@/app/components/Icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/login/reset-password`
          : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        if (resetError.message.includes("email_provider_disabled")) {
          throw new Error(
            "Supabase Email Auth is disabled. In Supabase Dashboard, go to Authentication > Providers > Email and enable it."
          );
        }
        throw new Error(resetError.message || "Failed to send password reset email.");
      }

      setSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to request password reset. Please try again."
      );
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/25">
              <MailIcon className="w-7 h-7" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Reset Password
            </h1>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Enter your registered email address to receive a secure password reset link.
            </p>
          </div>

          {/* Success */}
          {success ? (
            <div className="mt-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                <CheckCircleIcon className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Check Your Inbox</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                We have dispatched a password reset link to <span className="font-semibold text-slate-900">{email}</span>. Click the link in your email to set a new password.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-block w-full rounded-2xl bg-slate-900 py-3.5 text-center text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs font-semibold text-red-700 sm:text-sm">
                  <XIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Registered Email Address
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
                      placeholder="name@example.com"
                      autoComplete="email"
                      className="w-full rounded-2xl border border-slate-300 pl-11 pr-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending Link...
                    </span>
                  ) : (
                    "Send Password Reset Link"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Links */}
          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
