"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
const serviceRules = [
  {
    service: "Plumber",
    keywords: [
      "nal",
      "tap",
      "pipe",
      "pani",
      "water",
      "leak",
      "leakage",
      "toilet",
      "washbasin",
      "basin",
      "flush",
      "tank",
      "पानी",
      "नल",
      "पाइप",
      "लीक",
      "टंकी",
      "टॉयलेट",
    ],
  },
  {
    service: "Electrician",
    keywords: [
      "fan",
      "pankha",
      "light",
      "bulb",
      "switch",
      "socket",
      "wire",
      "wiring",
      "electric",
      "electricity",
      "bijli",
      "power",
      "current",
      "पंखा",
      "बिजली",
      "बल्ब",
      "स्विच",
      "तार",
    ],
  },
  {
    service: "AC Repair",
    keywords: [
      "ac",
      "air conditioner",
      "cooling",
      "cool",
      "thanda",
      "garmi",
      "compressor",
      "gas",
      "split ac",
      "window ac",
      "एसी",
      "ठंडा",
      "गर्मी",
    ],
  },
  {
    service: "Carpenter",
    keywords: [
      "door",
      "darwaza",
      "wood",
      "lakdi",
      "furniture",
      "bed",
      "table",
      "chair",
      "almirah",
      "drawer",
      "carpenter",
      "दरवाजा",
      "लकड़ी",
      "फर्नीचर",
      "पलंग",
    ],
  },
  {
    service: "Painter",
    keywords: [
      "paint",
      "painting",
      "colour",
      "color",
      "wall",
      "दीवार",
      "पेंट",
      "रंग",
    ],
  },
  {
    service: "Appliance Repair",
    keywords: [
      "fridge",
      "refrigerator",
      "washing machine",
      "microwave",
      "oven",
      "tv",
      "television",
      "cooler",
      "geyser",
      "mixer",
      "appliance",
      "फ्रिज",
      "टीवी",
      "कूलर",
      "गीजर",
    ],
  },
  {
    service: "Cleaning",
    keywords: [
      "clean",
      "cleaning",
      "safai",
      "house cleaning",
      "deep cleaning",
      "floor cleaning",
      "सफाई",
      "घर की सफाई",
    ],
  },
];
export default function AIAssistantPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [problem, setProblem] = useState("");
  const [service, setService] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    const checkAdminSession = () => {
      if (!active) return;
      const adminLoggedIn =
        window.localStorage.getItem("masterAdminLoggedIn");
      const savedAdmin =
        window.localStorage.getItem("masterAdmin");
      if (adminLoggedIn !== "true" || !savedAdmin) {
        setAuthorized(false);
        setCheckingAuth(false);
        router.replace("/admin/login");
        return;
      }
      try {
        const adminProfile = JSON.parse(savedAdmin);
        const validAdmin =
          adminProfile?.email?.trim().toLowerCase() ===
            "admin@masterapp.com" &&
          adminProfile?.role === "admin";
        if (!validAdmin) {
          window.localStorage.removeItem("masterAdminLoggedIn");
          window.localStorage.removeItem("masterAdmin");
          setAuthorized(false);
          setCheckingAuth(false);
          router.replace("/admin/login");
          return;
        }
        setAuthorized(true);
        setCheckingAuth(false);
      } catch (error) {
        console.error(
          "ADMIN AI ASSISTANT LOCAL AUTH ERROR:",
          error
        );
        window.localStorage.removeItem(
          "masterAdminLoggedIn"
        );
        window.localStorage.removeItem("masterAdmin");
        setAuthorized(false);
        setCheckingAuth(false);
        router.replace("/admin/login");
      }
    };
    checkAdminSession();
    const handleAuthUpdate = () => {
      checkAdminSession();
    };
    window.addEventListener(
      "storage",
      handleAuthUpdate
    );
    window.addEventListener(
      "master-auth-updated",
      handleAuthUpdate
    );
    return () => {
      active = false;
      window.removeEventListener(
        "storage",
        handleAuthUpdate
      );
      window.removeEventListener(
        "master-auth-updated",
        handleAuthUpdate
      );
    };
  }, [router]);
  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="text-4xl">🛡️</div>
          <p className="mt-3 font-semibold text-gray-800">
            Checking admin session...
          </p>
        </div>
      </main>
    );
  }
  if (!authorized) {
    return null;
  }
  function findService() {
    const text = problem.trim().toLowerCase();
    if (!text) {
      setService("");
      setAnswer("Please enter your problem description first.");
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
          `Recommended Service: ${detectedService}. We recommend booking a certified ${detectedService} professional for this issue.`
        );
      } else {
        setAnswer(
          "We could not clearly determine the exact service category. Please provide additional details or browse all categories directly."
        );
      }
      setLoading(false);
    }, 400);
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
    <main className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="mb-5 text-sm font-semibold text-blue-100 hover:text-white"
          >
            ← Back
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl">
              🤖
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                Ask AI Assistant
              </h1>
              <p className="mt-1 text-sm text-blue-100 sm:text-base">
                Describe the issue in English, Hindi, or Hinglish.
                Master App will diagnose the matching service category and providers.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* MAIN */}
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-lg sm:p-7">
          {/* PROBLEM + RESULT */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* LEFT - PROBLEM */}
            <div>
              <label className="block text-lg font-bold text-gray-900">
                What issue are you experiencing?
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Example: &quot;my tap is leaking&quot; or &quot;AC not cooling properly&quot;
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
                placeholder="Describe the issue here in detail..."
                rows={7}
                className="mt-4 w-full rounded-2xl border border-gray-300 p-4 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <button
                onClick={findService}
                disabled={loading}
                className="mt-3 w-full rounded-2xl bg-blue-600 px-6 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "AI Assistant is analyzing..."
                  : "🤖 Diagnose with AI"}
              </button>
            </div>
            {/* RIGHT - AI RESULT */}
            <div className="min-h-[280px] rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                  🤖
                </div>
                <div>
                  <p className="font-bold text-blue-700">
                    Diagnosis Result
                  </p>
                  <p className="text-xs text-gray-500">
                    Recommended service & provider match
                  </p>
                </div>
              </div>
              {!answer && (
                <div className="mt-10 text-center">
                  <div className="text-4xl">
                    💬
                  </div>
                  <p className="mt-3 font-semibold text-gray-700">
                    AI diagnosis will appear here
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter the issue on the left and click Diagnose with AI.
                  </p>
                </div>
              )}
              {answer && (
                <div className="mt-7">
                  <p className="text-lg font-bold leading-relaxed text-gray-900">
                    {answer}
                  </p>
                  {service && (
                    <button
                      onClick={findProviders}
                      className="mt-5 w-full rounded-xl bg-green-600 px-5 py-3.5 font-bold text-white transition hover:bg-green-700"
                    >
                      🔎 Find {service} Providers →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* EXAMPLES */}
          <div className="mt-7 border-t pt-6">
            <p className="text-sm font-semibold text-gray-700">
              Try an example
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  useExample(
                    "Mera nal kharab hai aur pani leak ho raha hai"
                  )
                }
                className="rounded-full border bg-gray-50 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                🔧 Mera nal kharab hai
              </button>
              <button
                onClick={() =>
                  useExample("Mera AC thanda nahi kar raha")
                }
                className="rounded-full border bg-gray-50 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                ❄️ AC thanda nahi kar raha
              </button>
              <button
                onClick={() =>
                  useExample("Pankha nahi chal raha hai")
                }
                className="rounded-full border bg-gray-50 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                ⚡ Pankha nahi chal raha
              </button>
              <button
                onClick={() =>
                  useExample("Mere ghar ki safai karwani hai")
                }
                className="rounded-full border bg-gray-50 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                🧹 Ghar ki safai
              </button>
            </div>
          </div>
          {/* DIRECT SEARCH */}
          <div className="mt-7 border-t pt-6 text-center">
            <p className="text-sm text-gray-500">
              AI Assistant use nahi karna?
            </p>
            <button
              onClick={() => router.push("/services")}
              className="mt-3 rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              🔎 Direct Search Services
            </button>
          </div>
        </div>
        {/* FEATURES */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
            <div className="text-3xl">
              🌐
            </div>
            <h3 className="mt-3 font-bold text-gray-900">
              Multiple Languages
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Hindi, English & Hinglish
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
            <div className="text-3xl">
              🧠
            </div>
            <h3 className="mt-3 font-bold text-gray-900">
              Problem Based
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Problem batao, service identify karo
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
            <div className="text-3xl">
              📍
            </div>
            <h3 className="mt-3 font-bold text-gray-900">
              Find Providers
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Relevant professionals dekho
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}