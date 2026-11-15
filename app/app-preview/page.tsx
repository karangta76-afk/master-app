"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HomeIcon,
  BoltIcon,
  SparklesIcon,
  UserIcon,
  BriefcaseIcon,
  DownloadIcon,
} from "../components/Icons";

export default function AppPreviewPage() {
  const [currentUrl, setCurrentUrl] = useState("/");
  const [deviceScale, setDeviceScale] = useState(1);
  const [isRotating, setIsRotating] = useState(false);

  const screens = [
    { name: "Home / Search", path: "/", icon: HomeIcon },
    { name: "Services", path: "/services", icon: BoltIcon },
    { name: "AI Assistant", path: "/ai-assistant", icon: SparklesIcon },
    { name: "Customer Sign In", path: "/login", icon: UserIcon },
    { name: "Provider Portal", path: "/provider/login", icon: BriefcaseIcon },
  ];

  return (
    <main className="min-h-screen bg-slate-950 py-10 px-4 text-white">
      <div className="mx-auto max-w-7xl">
        {/* TOP HEADER */}
        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1 shadow-md border border-slate-700">
              <Image
                src="/logo-icon.png"
                alt="Master App Logo"
                width={44}
                height={44}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Master App Android Simulator
                </h1>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/30">
                  LIVE SIMULATOR
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Interactive native Android mobile preview & APK installation hub
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/MasterApp.apk"
              download="MasterApp.apk"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110 active:scale-95"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Download MasterApp.apk (6.3 MB)</span>
            </a>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Back to Web
            </Link>
          </div>
        </div>

        {/* MAIN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: INTERACTIVE SMARTPHONE SHELL */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            {/* Quick Screen Switcher Tabs */}
            <div className="mb-5 flex flex-wrap justify-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 backdrop-blur-xl">
              {screens.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.path}
                    type="button"
                    onClick={() => setCurrentUrl(s.path)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      currentUrl === s.path
                        ? "bg-[#0052cc] text-white shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>

            {/* REALISTIC ANDROID HARDWARE CASING */}
            <div className="relative mx-auto rounded-[48px] border-[10px] border-slate-800 bg-black p-2 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-slate-700/50">
              {/* Outer Antenna Band Accent */}
              <div className="pointer-events-none absolute -top-1 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-slate-600" />
              
              {/* Screen Bezel Frame */}
              <div className="relative overflow-hidden rounded-[38px] bg-slate-900 w-[360px] h-[740px] sm:w-[380px] sm:h-[780px] flex flex-col">
                {/* Android Top Status Bar */}
                <div className="relative z-20 flex h-7 w-full shrink-0 items-center justify-between bg-black px-6 text-[11px] font-semibold text-slate-300 select-none">
                  <span>9:41</span>
                  {/* Camera Punch Hole */}
                  <div className="absolute left-1/2 top-1.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-slate-900 ring-2 ring-black" />
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span>5G</span>
                    <span>📶</span>
                    <span>🔋 98%</span>
                  </div>
                </div>

                {/* In-App Native App Title Header Simulation */}
                <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-200/40 bg-white/95 px-4 backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black tracking-tight text-slate-900">
                      Master <span className="text-[#0052cc]">App</span>
                    </span>
                    <span className="rounded bg-blue-50 px-1 py-0.2 text-[8px] font-bold text-blue-700 border border-blue-200">
                      Android Native
                    </span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#0052cc]">
                    ONE APP. ALL SERVICES.
                  </span>
                </div>

                {/* Web Content Iframe */}
                <div className="relative flex-1 w-full bg-white">
                  <iframe
                    src={currentUrl}
                    title="Master App Live Android View"
                    className="h-full w-full border-none"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  />
                </div>

                {/* Android Bottom Navigation Bar */}
                <div className="flex h-9 shrink-0 items-center justify-around bg-black text-slate-500 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      const iframe = document.querySelector("iframe");
                      if (iframe?.contentWindow) {
                        try {
                          iframe.contentWindow.history.back();
                        } catch (_) {}
                      }
                    }}
                    title="Android Back Button"
                    className="flex h-7 w-12 items-center justify-center rounded-lg hover:bg-slate-800 hover:text-white active:scale-95 text-xs font-bold"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentUrl("/")}
                    title="Android Home Button"
                    className="flex h-7 w-12 items-center justify-center rounded-lg hover:bg-slate-800 hover:text-white active:scale-95 text-xs font-bold"
                  >
                    ●
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const iframe = document.querySelector("iframe");
                      if (iframe) iframe.src = iframe.src;
                    }}
                    title="Android Refresh / Switcher"
                    className="flex h-7 w-12 items-center justify-center rounded-lg hover:bg-slate-800 hover:text-white active:scale-95 text-xs font-bold"
                  >
                    ■
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              Interactive View: You can click, search, book, and test all functions directly inside this mobile screen!
            </p>
          </div>

          {/* RIGHT: REAL MOBILE TESTING & QR CODE CARD */}
          <div className="lg:col-span-5 space-y-6">
            {/* CARD 1: SCAN QR CODE TO INSTALL ON YOUR PHONE */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-sm">
                  1
                </span>
                <h2 className="text-lg font-bold text-white">
                  Scan QR Code on Your Mobile
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-slate-800 bg-black/60 p-4">
                <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-xl bg-white p-2 shadow-inner">
                  <Image
                    src="/apk-qr.png"
                    alt="Scan QR Code to download MasterApp.apk"
                    width={160}
                    height={160}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Open your phone camera (Google Lens or Camera app) and point it at this QR code to download <strong className="text-white">MasterApp.apk</strong> immediately.
                  </p>
                  <div className="pt-2">
                    <a
                      href="/MasterApp.apk"
                      download="MasterApp.apk"
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-[#0052cc] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#003e99] active:scale-95"
                    >
                      <span>Direct Download (.apk)</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: STEP-BY-STEP PHONE INSTALL GUIDE */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 font-bold text-sm">
                  2
                </span>
                <h2 className="text-lg font-bold text-white">
                  3 Simple Steps to Install on Android
                </h2>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                  <span className="text-base">📥</span>
                  <div>
                    <strong className="text-white block font-semibold mb-0.5">Step 1: Download File</strong>
                    Download <code>MasterApp.apk</code> from the link or QR code above.
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                  <span className="text-base">⚙️</span>
                  <div>
                    <strong className="text-white block font-semibold mb-0.5">Step 2: Allow Unknown Sources</strong>
                    If Android prompts <em>&quot;File might be harmful&quot;</em> or <em>&quot;Install unknown apps&quot;</em>, tap <strong>&quot;Download anyway&quot;</strong> and allow your browser (Chrome/Edge) to install.
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                  <span className="text-base">🚀</span>
                  <div>
                    <strong className="text-white block font-semibold mb-0.5">Step 3: Open & Enjoy</strong>
                    Tap <strong>Install</strong>. Master App will appear on your phone home screen with the official yellow & blue logo!
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: FEATURES YOU CAN TEST */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                Key Native Features to Test
              </h3>
              <ul className="grid grid-cols-1 gap-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Call Provider:</strong> Tap any &quot;Call&quot; button — it triggers native mobile dialer.</span>
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>GPS Auto-Detect:</strong> Tap crosshair button to auto-detect location and calculate distance.</span>
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Photo Upload:</strong> Upload service pictures directly from device gallery or camera.</span>
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/60">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Pull to Refresh:</strong> Drag screen downwards to refresh latest live services.</span>
                </li>
              </ul>
            </div>

            {/* CARD 4: GITHUB REPO & SOURCE */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl shadow-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400">Android Source Code</p>
                <p className="text-sm font-bold text-white">karangta76-afk/master-app-android</p>
              </div>
              <a
                href="https://github.com/karangta76-afk/master-app-android"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
              >
                View on GitHub ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
