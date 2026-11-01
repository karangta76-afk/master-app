"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
type Provider = {
  id: string;
  name: string;
};
type Review = {
  id: string;
  provider_id: string;
  customer_id?: string;
  rating: number;
  comment?: string;
  created_at?: string;
};
type Customer = {
  id: string;
  name: string;
};
export default function ProviderReviewsPage() {
  const [provider, setProvider] =
    useState<Provider | null>(null);
  const [reviews, setReviews] =
    useState<Review[]>([]);
  const [customers, setCustomers] =
    useState<Customer[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [selectedReview, setSelectedReview] =
    useState<Review | null>(null);
  useEffect(() => {
    async function loadReviews() {
      try {
        const storedProvider =
          localStorage.getItem(
            "masterProvider"
          );
        if (!storedProvider) {
          window.location.href =
            "/provider/login";
          return;
        }
        const currentProvider =
          JSON.parse(
            storedProvider
          ) as Provider;
        setProvider(currentProvider);
        const {
          data: reviewData,
          error: reviewError,
        } = await supabase
          .from("reviews")
          .select("*")
          .eq(
            "provider_id",
            currentProvider.id
          )
          .order("created_at", {
            ascending: false,
          });
        if (reviewError) {
          console.error(
            "Reviews loading error:",
            reviewError
          );
        }
        let loadedReviews = (reviewData || []) as Review[];
        if (loadedReviews.length === 0) {
          try {
            const cached = localStorage.getItem("masterReviews");
            if (cached) {
              const list = JSON.parse(cached);
              if (Array.isArray(list)) {
                loadedReviews = list
                  .filter(
                    (r: any) =>
                      String(r.providerId || r.provider_id) ===
                      String(currentProvider.id)
                  )
                  .map((r: any) => ({
                    id: String(r.id),
                    provider_id: String(r.providerId || r.provider_id),
                    customer_id: r.customerId || r.customer_id,
                    rating: Number(r.rating) || 5,
                    comment: r.comment || "",
                    created_at:
                      r.createdAt || r.created_at || new Date().toISOString(),
                  }));
              }
            }
          } catch (_) {}
        }
        setReviews(loadedReviews);
        const customerIds =
          Array.from(
            new Set(
              loadedReviews
                .map(
                  (review) =>
                    review.customer_id
                )
                .filter(Boolean)
            )
          );
        if (customerIds.length > 0) {
          const {
            data: customerData,
          } = await supabase
            .from("customers")
            .select("id,name")
            .in(
              "id",
              customerIds
            );
          setCustomers(
            (customerData ||
              []) as Customer[]
          );
        }
      } catch (error) {
        console.error(
          "Provider reviews error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }
    void loadReviews();
  }, []);
  function getCustomerName(
    customerId?: string
  ) {
    if (!customerId) {
      return "Customer";
    }
    return (
      customers.find(
        (customer) =>
          customer.id === customerId
      )?.name ||
      "Customer"
    );
  }
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (sum, review) =>
              sum +
              Number(
                review.rating || 0
              ),
            0
          ) / reviews.length
        ).toFixed(1)
      : "0.0";
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc]">
        <div className="rounded-xl bg-white px-6 py-7 text-center shadow-sm">
          <div className="text-2xl">
            ⭐
          </div>
          <p className="mt-2 text-sm font-bold text-slate-800">
            Loading Reviews...
          </p>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#f6f8fc]">
      {/* ================= HEADER ================= */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-[11px] font-bold text-blue-600">
              Master App
            </p>
            <h1 className="text-xl font-black text-slate-900">
              Customer Reviews
            </h1>
            <p className="text-[11px] text-slate-500">
              Reviews received by{" "}
              {provider?.name || "Provider"}
            </p>
          </div>
          <Link
            href="/provider/dashboard"
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            ← Dashboard
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-4">
        {/* ================= SUMMARY ================= */}
        <div className="grid grid-cols-3 gap-2">
          {/* AVERAGE */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-500">
              Average Rating
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xl font-black text-slate-900">
                {averageRating}
              </span>
              <span className="text-base">
                ⭐
              </span>
            </div>
          </div>
          {/* TOTAL */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-500">
              Total Reviews
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {reviews.length}
            </p>
          </div>
          {/* PROVIDER */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-500">
              Provider
            </p>
            <p className="mt-1 truncate text-sm font-black text-slate-900">
              {provider?.name}
            </p>
          </div>
        </div>
        {/* ================= REVIEWS ================= */}
        <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                All Reviews
              </h2>
              <p className="text-[10px] text-slate-500">
                Customer feedback about your services
              </p>
            </div>
            <span className="whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">
              {reviews.length} Reviews
            </span>
          </div>
          {/* NO REVIEWS */}
          {reviews.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 py-8 text-center">
              <div className="text-3xl">
                ⭐
              </div>
              <h3 className="mt-2 text-sm font-black text-slate-900">
                No reviews yet
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">
                Customer reviews will appear here.
              </p>
            </div>
          ) : (
            /* REVIEW LIST */
            <div className="mt-3 space-y-2">
              {reviews.map(
                (review) => (
                  <div
                    key={review.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    {/* CUSTOMER */}
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {getCustomerName(
                          review.customer_id
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {getCustomerName(
                            review.customer_id
                          )}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {review.created_at
                            ? new Date(
                                review.created_at
                              ).toLocaleDateString(
                                "en-IN"
                              )
                            : ""}
                        </p>
                      </div>
                    </div>
                    {/* RIGHT SIDE */}
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-xs">
                        {"⭐".repeat(
                          Math.max(
                            0,
                            Math.min(
                              5,
                              Number(
                                review.rating || 0
                              )
                            )
                          )
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedReview(
                            review
                          )
                        }
                        className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-100"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
      {/* =====================================================
          REVIEW DETAILS MODAL
      ====================================================== */}
      {selectedReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() =>
            setSelectedReview(null)
          }
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                  Review Details
                </p>
                <h2 className="mt-0.5 text-lg font-black text-slate-900">
                  Customer Review
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedReview(null)
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200"
              >
                ×
              </button>
            </div>
            {/* MODAL CONTENT */}
            <div className="p-5">
              {/* CUSTOMER */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  {getCustomerName(
                    selectedReview.customer_id
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {getCustomerName(
                      selectedReview.customer_id
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {selectedReview.created_at
                      ? new Date(
                          selectedReview.created_at
                        ).toLocaleString(
                          "en-IN"
                        )
                      : "Date unavailable"}
                  </p>
                </div>
              </div>
              {/* RATING */}
              <div className="mt-4 rounded-lg bg-amber-50 p-3">
                <p className="text-[10px] font-bold text-slate-500">
                  Rating
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xl">
                    {"⭐".repeat(
                      Math.max(
                        0,
                        Math.min(
                          5,
                          Number(
                            selectedReview.rating ||
                              0
                          )
                        )
                      )
                    )}
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    {selectedReview.rating}/5
                  </span>
                </div>
              </div>
              {/* COMMENT */}
              <div className="mt-3 rounded-lg bg-slate-50 p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  Customer Comment
                </p>
                <p className="mt-2 text-sm leading-5 text-slate-700">
                  {selectedReview.comment ||
                    "Customer did not leave a comment."}
                </p>
              </div>
            </div>
            {/* FOOTER */}
            <div className="border-t border-slate-200 px-5 py-3 text-right">
              <button
                type="button"
                onClick={() =>
                  setSelectedReview(null)
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}