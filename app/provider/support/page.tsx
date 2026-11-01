"use client";
export default function ProviderSupportPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* HEADER */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
            🎧
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-blue-600">
            Provider Panel
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Support
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Contact Master App Admin Support
          </p>
        </div>
        {/* CONTACT DETAILS */}
        <div className="mx-auto mt-7 max-w-xl space-y-3">
          {/* EMAIL */}
          <a
            href="mailto:support@masterapp.in"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg">
              ✉️
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Admin Email
              </p>
              <p className="mt-0.5 text-sm font-bold text-blue-600">
                support@masterapp.in
              </p>
            </div>
          </a>
          {/* MOBILE 1 */}
          <a
            href="tel:+919876543210"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg">
              📞
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Mobile Support 1
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-800">
                +91 98765 43210
              </p>
            </div>
          </a>
          {/* MOBILE 2 */}
          <a
            href="tel:+919876543211"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg">
              📞
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Mobile Support 2
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-800">
                +91 98765 43211
              </p>
            </div>
          </a>
          {/* TOLL FREE */}
          <a
            href="tel:18001234567"
            className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition hover:bg-emerald-100"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg">
              ☎️
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700">
                Toll Free Number
              </p>
              <p className="mt-0.5 text-sm font-black text-emerald-700">
                1800-123-4567
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}