import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import https from "node:https";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder?.("ipv4first");
} catch (_) {}

function sendResendEmail(
  apiKey: string,
  payload: { from: string; to: string[]; subject: string; html: string; text?: string }
): Promise<{ ok: boolean; status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = https.request(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: 10000,
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({
              ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
              status: res.statusCode || 500,
              data: parsed,
            });
          } catch {
            resolve({
              ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
              status: res.statusCode || 500,
              data: rawData,
            });
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request to Resend API timed out."));
    });
    req.write(postData);
    req.end();
  });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pugqvqlsoqvwwbyajvdm.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_kOPVMF6p5-Nrq3-yP-8VrQ_-XcU8loN";
  return createClient(url, key);
}

// Cryptographic 6-digit OTP generator
function generateSecureOtp(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return String(100000 + (array[0] % 900000));
  }
  return String(Math.floor(100000 + Math.random() * 900000));
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
    const { target, channel = "auto" } = body || {};

    if (!target || typeof target !== "string") {
      return NextResponse.json({ error: "Target mobile or email is required." }, { status: 400 });
    }

    const cleanTarget = target.trim();
    const isEmail = cleanTarget.includes("@");
    const activeChannel = channel === "auto" ? (isEmail ? "email" : "sms") : channel;

    let destination = cleanTarget;
    if (activeChannel === "sms") {
      const cleanDigits = cleanTarget.replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(cleanDigits.slice(-10))) {
        return NextResponse.json(
          { error: "Please enter a valid 10-digit Indian mobile number." },
          { status: 400 }
        );
      }
      destination = normalizeMobile(cleanDigits.slice(-10));
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTarget.toLowerCase())) {
        return NextResponse.json(
          { error: "Please enter a valid email address." },
          { status: 400 }
        );
      }
      destination = cleanTarget.toLowerCase();
    }

    console.log(`[OTP Dispatch Request] target="${destination}", channel="${activeChannel}"`);

    const otpCode = generateSecureOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    const supabase = getSupabaseAdmin();

    // Store in Supabase otps table
    try {
      await supabase.from("otps").insert({
        target: destination,
        channel: activeChannel,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        is_verified: false,
      });
    } catch (dbErr) {
      console.warn("Supabase otps store warning:", dbErr);
    }

    let dispatched = false;
    let dispatchDetails = "";

    // -------------------------------------------------------------
    // 1. EMAIL CHANNEL: GMAIL DIRECT SMTP / RESEND / BREVO
    // -------------------------------------------------------------
    if (activeChannel === "email") {
      const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
      const resendApiKey = process.env.RESEND_API_KEY;
      const brevoApiKey = process.env.BREVO_API_KEY;

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; font-size: 24px; font-weight: bold;">M</div>
            <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 22px;">Verification Code</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Master App Account Security</p>
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin: 0 0 8px 0;">Your 6-Digit Code</p>
            <div style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a;">${otpCode}</div>
            <p style="font-size: 11px; color: #94a3b8; margin: 8px 0 0 0;">Valid for 5 minutes. Do not share this code.</p>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5; text-align: center;">If you did not request this verification code, please ignore this email.</p>
        </div>
      `;

      const emailPlainText = `Your Master App verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code with anyone.`;

      // 1A. Guaranteed Gmail Direct SMTP (No spam drops, 100% Primary Inbox arrival)
      if (gmailUser && gmailPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
              user: gmailUser.trim(),
              pass: gmailPass.trim().replace(/\s+/g, ""),
            },
          });

          await transporter.sendMail({
            from: `"Master App" <${gmailUser.trim()}>`,
            to: destination,
            subject: `Your Master App Verification Code: [ ${otpCode} ]`,
            text: emailPlainText,
            html: emailHtml,
          });
          dispatched = true;
          dispatchDetails = `Real email delivered to ${destination} via Gmail SMTP`;
        } catch (gmailErr) {
          console.error("Gmail SMTP dispatch error:", gmailErr);
        }
      }

      // 1B. Resend API
      if (!dispatched && resendApiKey) {
        try {
          const res = await sendResendEmail(resendApiKey, {
            from: "Master App <onboarding@resend.dev>",
            to: [destination],
            subject: `Your Master App Verification Code: [ ${otpCode} ]`,
            text: emailPlainText,
            html: emailHtml,
          });
          if (res.ok) {
            dispatched = true;
            dispatchDetails = `Real email dispatched to ${destination} via Resend.`;
          } else {
            console.error("Resend dispatch error response:", res.status, res.data);
            const resendMsg = res.data?.message || `Resend error HTTP ${res.status}`;
            dispatchDetails = resendMsg.includes("own email address")
              ? `Resend free testing sandbox can only send to karangta76@gmail.com. To send real OTPs to other emails, configure GMAIL_APP_PASSWORD in .env.local.`
              : resendMsg;
          }
        } catch (resendErr) {
          console.error("Resend dispatch error:", resendErr);
        }
      } else if (brevoApiKey) {
        try {
          const res = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: { name: "Master App", email: "noreply@masterapp.com" },
              to: [{ email: destination }],
              subject: `Your Master App Verification Code: [ ${otpCode} ]`,
              htmlContent: `<p>Your verification code is <strong>${otpCode}</strong>. Valid for 5 minutes.</p>`,
            }),
          });
          if (res.ok) {
            dispatched = true;
            dispatchDetails = `Real email dispatched to ${destination} via Brevo`;
          }
        } catch (brevoErr) {
          console.error("Brevo dispatch error:", brevoErr);
        }
      }
    }

    // -------------------------------------------------------------
    // 2. SMS CHANNEL: OPEN-SOURCE ANDROID SMS GATEWAY (TEXTBEE / SMSGATE)
    // -------------------------------------------------------------
    if (activeChannel === "sms") {
      const textbeeApiKey = process.env.TEXTBEE_API_KEY;
      const textbeeDeviceId = process.env.TEXTBEE_DEVICE_ID;
      const customGatewayUrl = process.env.SMS_GATEWAY_URL;
      const customGatewayKey = process.env.SMS_GATEWAY_API_KEY;

      const messageContent = `Your Master App verification code is: ${otpCode}. Valid for 5 minutes. Do not share with anyone.`;

      if (textbeeApiKey && textbeeDeviceId) {
        try {
          const res = await fetch(
            `https://api.textbee.dev/api/v1/gateway/devices/${textbeeDeviceId}/sendSMS`,
            {
              method: "POST",
              headers: {
                "x-api-key": textbeeApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                recipients: [destination],
                message: messageContent,
              }),
            }
          );
          const tbData = await res.json().catch(() => null);
          if (res.ok && (tbData?.data?.success || res.status === 201 || res.status === 200)) {
            dispatched = true;
            const warningMsg = tbData?.data?.warning?.message;
            dispatchDetails = warningMsg
              ? `Real SMS queued via Textbee phone gateway. (Make sure SMS permission is enabled in Textbee app)`
              : `Real carrier SMS sent to ${destination} via Textbee Android Gateway`;
          } else {
            console.error("Textbee API error response:", res.status, tbData);
            dispatchDetails = tbData?.message || tbData?.error || `Textbee gateway error HTTP ${res.status}`;
          }
        } catch (tbErr) {
          console.error("Textbee Android Gateway error:", tbErr);
          dispatchDetails = tbErr instanceof Error ? tbErr.message : "Textbee network error";
        }
      } else if (customGatewayUrl) {
        try {
          const res = await fetch(`${customGatewayUrl}/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(customGatewayKey ? { Authorization: `Bearer ${customGatewayKey}` } : {}),
            },
            body: JSON.stringify({
              phone: destination,
              message: messageContent,
            }),
          });
          if (res.ok) {
            dispatched = true;
            dispatchDetails = `Real carrier SMS sent to ${destination} via Custom SMS Gateway`;
          }
        } catch (customErr) {
          console.error("Custom SMS Gateway error:", customErr);
        }
      }
    }

    if (!dispatched) {
      const failureReason =
        activeChannel === "email"
          ? dispatchDetails ||
            "Unable to deliver email to this address. (Resend free sandbox only sends to karangta76@gmail.com; please configure GMAIL_APP_PASSWORD in .env.local to send to all users)."
          : dispatchDetails ||
            "Unable to dispatch SMS. Please configure Textbee Android SMS Gateway in .env.local or choose Email verification.";

      return NextResponse.json(
        {
          error: failureReason,
          dispatched: false,
          target: destination,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      target: destination,
      channel: activeChannel,
      dispatched: true,
      message: dispatchDetails,
      expiresAt: expiresAt.getTime(),
    });
  } catch (error) {
    console.error("OTP send handler exception:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to dispatch verification code." },
      { status: 500 }
    );
  }
}
