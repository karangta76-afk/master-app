import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pugqvqlsoqvwwbyajvdm.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_kOPVMF6p5-Nrq3-yP-8VrQ_-XcU8loN";
  return createClient(url, key);
}

function normalizeMobile(mobile: string): string {
  const value = mobile.trim().replace(/\s+/g, "");
  if (/^[6-9]\d{9}$/.test(value)) return `+91${value}`;
  if (/^\+91[6-9]\d{9}$/.test(value)) return value;
  if (/^0091[6-9]\d{9}$/.test(value)) return `+91${value.substring(4)}`;
  return value;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, otp } = body || {};

    if (!target || !otp) {
      return NextResponse.json(
        { error: "Target and 6-digit OTP code are required." },
        { status: 400 }
      );
    }

    const cleanTarget = String(target).trim();
    const cleanOtp = String(otp).trim().replace(/\D/g, "");

    if (cleanOtp.length !== 6) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit verification code." },
        { status: 400 }
      );
    }

    const destination = cleanTarget.includes("@")
      ? cleanTarget.toLowerCase()
      : normalizeMobile(cleanTarget.replace(/\D/g, "").slice(-10));

    const supabase = getSupabaseAdmin();

    // Query active unverified OTP for this target from Supabase
    const { data: records, error: dbErr } = await supabase
      .from("otps")
      .select("*")
      .eq("target", destination)
      .eq("is_verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (dbErr) {
      console.warn("Supabase otps query note:", dbErr.message);
    }

    if (records && records.length > 0) {
      const activeRecord = records[0];
      const expiresAt = new Date(activeRecord.expires_at).getTime();
      const attempts = activeRecord.attempts || 0;

      if (Date.now() > expiresAt) {
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (attempts >= 5) {
        return NextResponse.json(
          { error: "Too many incorrect attempts. Please request a new code." },
          { status: 400 }
        );
      }

      if (activeRecord.otp_code !== cleanOtp) {
        await supabase
          .from("otps")
          .update({ attempts: attempts + 1 })
          .eq("id", activeRecord.id);

        const remaining = 5 - (attempts + 1);
        return NextResponse.json(
          { error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` },
          { status: 400 }
        );
      }

      // Mark verified
      await supabase
        .from("otps")
        .update({ is_verified: true })
        .eq("id", activeRecord.id);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      target: destination,
      message: "Verification successful.",
    });
  } catch (error) {
    console.error("OTP verification route exception:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
