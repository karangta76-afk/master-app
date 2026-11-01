import { supabase } from "./supabase";

/*
  MASTER APP
  Real Free OTP Verification System
  Supports:
  1. Free Real Email OTP (Resend / Brevo) -> Real email sent to inbox
  2. Open-Source Android SMS Gateway (Textbee / SMSGate) -> Real carrier SMS
  3. Interactive Screen Fallback for Instant Local Testing
*/

export function generateSecureOtp(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return String(100000 + (array[0] % 900000));
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function getPhoneOtpErrorMessage(error: unknown): string {
  const authError =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; message?: unknown })
      : null;
  const message =
    typeof authError?.message === "string" ? authError.message : "";
  return message || "Unable to send verification code. Please try again.";
}

export function normalizeMobile(mobile: string): string {
  const value = mobile.trim().replace(/\s+/g, "");
  if (/^[6-9]\d{9}$/.test(value)) {
    return `+91${value}`;
  }
  if (/^\+91[6-9]\d{9}$/.test(value)) {
    return value;
  }
  if (/^0091[6-9]\d{9}$/.test(value)) {
    return `+91${value.substring(4)}`;
  }
  return value;
}

export function isValidMobile(mobile: string): boolean {
  const normalized = normalizeMobile(mobile);
  return /^\+91[6-9]\d{9}$/.test(normalized);
}

// --------------------------------------------------
// UNIVERSAL OTP SENDER (SMS + EMAIL)
// --------------------------------------------------
export async function sendUniversalOtp(
  target: string,
  channel: "sms" | "email" | "auto" = "auto"
) {
  const cleanTarget = target.trim();
  const isEmail = cleanTarget.includes("@");

  if (!isEmail && !isValidMobile(cleanTarget)) {
    throw new Error("Please enter a valid 10-digit Indian mobile number or email address.");
  }

  // Hit the backend dispatch API
  const res = await fetch("/api/auth/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target: cleanTarget, channel }),
  });

  const data = await res.json();
  if (!res.ok || data.error || !data.dispatched) {
    throw new Error(data.error || "Failed to dispatch verification code.");
  }

  // If local fallback OTP is provided (when live SMS/Email API keys are pending setup)
  if (data.testOtp && typeof window !== "undefined") {
    sessionStorage.setItem("masterOtp", data.testOtp);
    sessionStorage.setItem("masterOtpMobile", data.target);
    sessionStorage.setItem("masterOtpExpiresAt", String(data.expiresAt));
    sessionStorage.setItem("masterOtpAttempts", "0");

    window.dispatchEvent(
      new CustomEvent("master-otp-dispatched", {
        detail: {
          phone: data.target,
          otp: data.testOtp,
          expiresAt: data.expiresAt,
        },
      })
    );
  }

  return {
    success: true,
    target: data.target,
    channel: data.channel,
    dispatched: data.dispatched,
    message: data.message,
    testOtp: data.testOtp,
  };
}

// --------------------------------------------------
// UNIVERSAL OTP VERIFIER (SMS + EMAIL)
// --------------------------------------------------
export async function verifyUniversalOtp(target: string, otp: string) {
  const cleanTarget = target.trim();
  const cleanOtp = otp.trim().replace(/\D/g, "");

  if (cleanOtp.length !== 6) {
    throw new Error("Please enter a valid 6-digit verification code.");
  }

  // 1. First attempt verification against server/database API
  const res = await fetch("/api/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target: cleanTarget, otp: cleanOtp }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    // 2. Fallback to client session storage check if server table is unpopulated
    if (typeof window !== "undefined") {
      const savedOtp = sessionStorage.getItem("masterOtp");
      const savedMobile = sessionStorage.getItem("masterOtpMobile");
      const normalizedTarget = cleanTarget.includes("@")
        ? cleanTarget.toLowerCase()
        : normalizeMobile(cleanTarget);

      if (savedOtp && savedMobile === normalizedTarget) {
        if (savedOtp === cleanOtp) {
          sessionStorage.removeItem("masterOtp");
          sessionStorage.removeItem("masterOtpMobile");
          localStorage.setItem("masterOtpVerified", "true");
          localStorage.setItem("masterVerifiedMobile", normalizedTarget);
          window.dispatchEvent(new Event("master-auth-updated"));
          return { success: true, target: normalizedTarget };
        }
      }
    }
    throw new Error(data.error || "Invalid verification code.");
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("masterOtpVerified", "true");
    localStorage.setItem("masterVerifiedMobile", data.target);
    window.dispatchEvent(new Event("master-auth-updated"));
  }

  return {
    success: true,
    target: data.target,
  };
}

// Mobile-specific aliases for backward compatibility
export async function sendMobileOtp(mobile: string) {
  return sendUniversalOtp(mobile, "sms");
}

export async function verifyMobileOtp(mobile: string, otp: string) {
  return verifyUniversalOtp(mobile, otp);
}

export function isMobileOtpVerified(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("masterOtpVerified") === "true";
}

export function getVerifiedMobile(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("masterVerifiedMobile");
}

export async function signOutUser() {
  try {
    await supabase.auth.signOut();
  } catch (_) {}
  if (typeof window !== "undefined") {
    localStorage.removeItem("masterOtpVerified");
    localStorage.removeItem("masterVerifiedMobile");
    localStorage.removeItem("masterActiveRole");
    localStorage.removeItem("masterUser");
    localStorage.removeItem("masterProvider");
    localStorage.removeItem("masterProviderLoggedIn");
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("master-auth-changed"));
  }
}

export async function signUpUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) return null;
  return session;
}

export function onAuthStateChange(callback: (user: any) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return subscription;
}
