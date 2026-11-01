"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SparklesIcon,
  TradeBadgeContainer,
  VerifiedBadge,
  ArrowUpRightIcon,
  WrenchIcon,
  SnowflakeIcon,
  BoltIcon,
  SparkleBroomIcon,
  HammerIcon,
  ShieldCheckIcon,
} from "../components/Icons";
const serviceRules = [
  {
    service: "Plumber",
    keywords: [
      "nal", "tap", "pipe", "pani", "water", "leak", "leakage",
      "toilet", "washbasin", "basin", "flush", "tank",
      "पानी", "नल", "पाइप", "लीक", "टंकी", "टॉयलेट",
    ],
  },
  {
    service: "Electrician",
    keywords: [
      "fan", "pankha", "light", "bulb", "switch", "socket",
      "wire", "wiring", "electric", "electricity", "bijli",
      "power", "current", "पंखा", "बिजली", "बल्ब", "स्विच", "तार",
    ],
  },
  {
    service: "AC Repair",
    keywords: [
      "ac", "air conditioner", "cooling", "cool", "thanda",
      "garmi", "compressor", "gas", "split ac", "window ac",
      "एसी", "ठंडा", "गर्मी",
    ],
  },
  {
    service: "Carpenter",
    keywords: [
      "door", "darwaza", "wood", "lakdi", "furniture", "bed",
      "table", "chair", "almirah", "drawer", "carpenter",
      "दरवाजा", "लकड़ी", "फर्नीचर", "पलंग",
    ],
  },
  {
    service: "Painter",
    keywords: [
      "paint", "painting", "colour", "color", "wall",
      "दीवार", "पेंट", "रंग",
    ],
  },
  {
    service: "Appliance Repair",
    keywords: [
      "fridge", "refrigerator", "washing machine", "microwave",
      "oven", "tv", "television", "cooler", "geyser", "mixer",
      "appliance", "फ्रिज", "टीवी", "कूलर", "गीजर",
    ],
  },
  {
    service: "Cleaning",
    keywords: [
      "clean", "cleaning", "safai", "house cleaning",
      "deep cleaning", "floor cleaning", "सफाई", "घर की सफाई",
    ],
  },
];
export default function AIAssistantPage() {
  const router = useRouter();
  const [problem, setProblem] = useState("");
  const [service, setService] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  function findService() {
    const text = problem.trim().toLowerCase();
    if (!text) {
      setService("");
      setAnswer("Pehle apni problem likhiye.");
      return;
    }
    setLoading(true);
    setService("");
    setAnswer("");
    setTimeout(() => {
      let detectedService = "";
      for (const rule of serviceRules) {
        const matched = rule.keywords.some((keyword) =>
          text.includes(keyword.toLowerCase())
        );
        if (matched) {
          detectedService = rule.service;
          break;
        }
      }
      if (detectedService) {
        setService(detectedService);
        setAnswer(
          `Aapki problem ke liye ${detectedService} service provider ko book karna chahiye.`
        );
      } else {
        setAnswer(
          "Mujhe service clearly identify nahi ho paayi. Problem ko thoda aur detail mein likhiye."
        );
      }
      setLoading(false);
    }, 500);
  }
  function findProviders() {
    if (!service) return;
    router.push(
      `/services?search=${encodeURIComponent(service)}`
    );
  }
  function useExample(text: string) {
    setProblem(text);
    setService("");
    setAnswer("");
  }
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* HEADER */}
      <section className="relative overflow-hidden bg-slate-950 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[380px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-600/30 via-indigo-600/20 to-cyan-500/20 blur-[130px]" />
        
        <div className="relative mx-auto max-w-5xl">
          <button
            onClick={() => router.back()}
            className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-200 transition hover:text-white"
          >
            ← Back to Marketplace
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/30 ring-1 ring-white/20">
              <SparklesIcon className="h-8 w-8 text-cyan-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  Smart AI Service Diagnostician
                </h1>
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
                  Instant Analysis
                </span>
              </div>
              <p className="mt-2 text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
                Describe your issue in plain words (Hindi, English, or Hinglish). Master App identifies the exact specialist and guides you to verified providers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN DIAGNOSTIC WORKSPACE */}
      <section className="mx-auto max-w-5xl px-4 -mt-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl shadow-slate-200/50 sm:p-8">
          {/* PROBLEM + RESULT DUAL COLUMN */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* LEFT - PROBLEM INPUT */}
            <div className="flex flex-col justify-between">
              <div>
                <label className="block text-base font-bold text-slate-900">
                  What issue are you facing? <span className="text-xs font-normal text-slate-500">(समस्या बताएं)</span>
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  E.g. &ldquo;Kitchen tap leaking constantly&rdquo; or &ldquo;AC thanda nahi kar raha hai&rdquo;
                </p>
                <textarea
                  value={problem}
                  onChange={(event) =>
                    setProblem(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      findService();
                    }
                  }}
                  placeholder="Describe your issue here in your own words..."
                  rows={6}
                  className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400 font-medium"
                />
              </div>

              <button
                onClick={findService}
                disabled={loading || !problem.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Analyzing Symptoms...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" />
                    <span>Diagnose Required Service →</span>
                  </>
                )}
              </button>
            </div>

            {/* RIGHT - AI DIAGNOSTIC REPORT */}
            <div className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-white p-6 shadow-xs">
              <div>
                <div className="flex items-center justify-between border-b border-blue-100/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-sm">
                      AI
                    </span>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Diagnosis Result
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600">
                    Real-time
                  </span>
                </div>

                {!answer ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100">
                      <SparklesIcon className="h-7 w-7 text-blue-600" />
                    </div>
                    <p className="mt-4 font-bold text-slate-800 text-sm">
                      Ready for Diagnosis
                    </p>
                    <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Type your problem on the left and click &ldquo;Diagnose&rdquo;, or select any quick sample below.
                    </p>
                  </div>
                ) : (
                  <div className="py-6 animate-in fade-in duration-300">
                    <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60 mb-3">
                      ✓ Specialist Identified
                    </span>
                    <p className="text-base font-semibold leading-relaxed text-slate-900">
                      {answer}
                    </p>
                    {service && (
                      <div className="mt-5 rounded-2xl bg-white p-4 border border-blue-200/80 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TradeBadgeContainer service={service} size="md" />
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recommended Specialty</p>
                            <p className="text-base font-bold text-blue-700">{service}</p>
                          </div>
                        </div>
                        <VerifiedBadge />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {service && (
                <button
                  onClick={findProviders}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:brightness-110 active:scale-[0.98]"
                >
                  <span>View Available {service} Providers</span>
                  <ArrowUpRightIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* QUICK EXAMPLES */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Try a Quick Scenario (क्विक उदाहरण):
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  useExample(
                    "Mera nal kharab hai aur pani lagatar leak ho raha hai"
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:border-cyan-400 hover:bg-cyan-50/60 hover:text-cyan-800"
              >
                <WrenchIcon className="h-3.5 w-3.5 text-cyan-600" />
                <span>Water tap leaking</span>
              </button>
              <button
                onClick={() =>
                  useExample("Mera AC thanda nahi kar raha hai, fan chal raha hai")
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:border-sky-400 hover:bg-sky-50/60 hover:text-sky-800"
              >
                <SnowflakeIcon className="h-3.5 w-3.5 text-sky-600" />
                <span>AC not cooling</span>
              </button>
              <button
                onClick={() =>
                  useExample("Pankha switch on karne par nahi chal raha hai")
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:border-amber-400 hover:bg-amber-50/60 hover:text-amber-800"
              >
                <BoltIcon className="h-3.5 w-3.5 text-amber-600" />
                <span>Ceiling fan stopped working</span>
              </button>
              <button
                onClick={() =>
                  useExample("Kitchen aur bathroom ki deep cleaning karwani hai")
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:border-teal-400 hover:bg-teal-50/60 hover:text-teal-800"
              >
                <SparkleBroomIcon className="h-3.5 w-3.5 text-teal-600" />
                <span>Home deep cleaning</span>
              </button>
              <button
                onClick={() =>
                  useExample("Main door ka wooden lock aur hinge toot gaya hai")
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800"
              >
                <HammerIcon className="h-3.5 w-3.5 text-emerald-600" />
                <span>Door lock & hinge repair</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 VALUE HIGHLIGHTS */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-bold text-slate-900 text-sm">
              Multilingual NLP
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Understands Hindi, English, and conversational Hinglish expressions.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <BoltIcon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-bold text-slate-900 text-sm">
              Direct Provider Matching
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              One click takes you to verified professionals mapped to your location.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheckIcon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-bold text-slate-900 text-sm">
              Zero Upcharges
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Free diagnosis for all customers and visitors without mandatory login.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}