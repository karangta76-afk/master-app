"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, XIcon, ShieldCheckIcon } from "./Icons";

type OtpDetails = {
  phone: string;
  otp: string;
  expiresAt: number;
};

export default function OtpNotificationBanner() {
  const [activeOtp, setActiveOtp] = useState<OtpDetails | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleOtpEvent(e: Event) {
      const customEvent = e as CustomEvent<OtpDetails>;
      if (customEvent.detail?.otp) {
        setActiveOtp(customEvent.detail);
        setCopied(false);
      }
    }

    window.addEventListener("master-otp-dispatched", handleOtpEvent);
    return () => {
      window.removeEventListener("master-otp-dispatched", handleOtpEvent);
    };
  }, []);

  if (!activeOtp) return null;

  function handleCopy() {
    if (!activeOtp) return;
    navigator.clipboard.writeText(activeOtp.otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleAutoFill() {
    if (!activeOtp) return;
    window.dispatchEvent(
      new CustomEvent("master-otp-autofill", {
        detail: { otp: activeOtp.otp },
      })
    );
    handleCopy();
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md animate-in fade-in slide-in-from-top-6 duration-300">
      <div className="overflow-hidden rounded-2xl border border-blue-200/90 bg-white/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl ring-1 ring-blue-900/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-600/30">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">
                  Master App Verification
                </span>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                  Live OTP
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                To: <span className="font-semibold text-slate-700">{activeOtp.phone}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveOtp(null)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* OTP DISPLAY BOX */}
        <div className="mt-3.5 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 p-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Your 6-Digit Code
            </p>
            <p className="mt-0.5 font-mono text-2xl font-black tracking-[0.25em] text-blue-950">
              {activeOtp.otp}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFill}
              className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              Auto-Fill
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <p className="mt-2 text-[11px] text-slate-400 text-center">
          Valid for 5 minutes. Real dynamic verification code.
        </p>
      </div>
    </div>
  );
}
