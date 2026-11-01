"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
const ADMIN_EMAIL = "admin@masterapp.com";
type Review = {
  id: string;
  bookingId: string;
  customerId: string;
  providerId: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerMobile: string;
  providerName: string;
  providerService: string;
  bookingDate: string;
  bookingStatus: string;
};
export default function AdminReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [selectedReview, setSelectedReview] =
    useState<Review | null>(null);
  const [actionLoading, setActionLoading] =
    useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  function syncLocalReviews(list: any[]) {
    try {
      window.localStorage.setItem("masterReviews", JSON.stringify(list));
      window.dispatchEvent(new Event("master-reviews-updated"));
    } catch (err) {
      console.error("Local reviews sync error:", err);
    }
  }
  const requireAdminSession = useCallback(async () => {
    try {
      const adminLoggedIn =
        window.localStorage.getItem("masterAdminLoggedIn");
      const savedAdmin =
        window.localStorage.getItem("masterAdmin");
      if (
        adminLoggedIn !== "true" ||
        !savedAdmin
      ) {
        router.replace("/admin/login");
        return null;
      }
      const adminProfile = JSON.parse(savedAdmin);
      if (
        adminProfile?.email?.trim().toLowerCase() !==
          ADMIN_EMAIL ||
        adminProfile?.role !== "admin"
      ) {
        window.localStorage.removeItem("masterAdminLoggedIn");
        window.localStorage.removeItem("masterAdmin");
        router.replace("/admin/login");
        return null;
      }
      return adminProfile;
    } catch (authError) {
      console.error(
        "ADMIN REVIEWS AUTH ERROR:",
        authError
      );
      window.localStorage.removeItem("masterAdminLoggedIn");
      window.localStorage.removeItem("masterAdmin");
      router.replace("/admin/login");
      return null;
    }
  }, [router]);
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    const initializeAdminReviews = async () => {
      const authUser =
        await requireAdminSession();
      if (!active || !authUser) {
        if (active) {
          setLoading(false);
        }
        return;
      }
      void loadReviews();
      const reviewChannel = supabase
        .channel("admin-reviews")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reviews",
          },
          () => {
            void loadReviews();
          }
        )
        .subscribe();
      const bookingChannel = supabase
        .channel("admin-reviews-bookings")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
          },
          () => {
            void loadReviews();
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(
          reviewChannel
        );
        supabase.removeChannel(
          bookingChannel
        );
      };
    };
    void initializeAdminReviews().then(
      (cleanupFn) => {
        if (!active) {
          cleanupFn?.();
          return;
        }
        cleanup = cleanupFn;
      }
    );
    return () => {
      active = false;
      cleanup?.();
    };
  }, [requireAdminSession, router]);
  async function loadReviews() {
    setLoading(true);
    try {
      console.log(
        "MASTER APP: Loading reviews..."
      );
      const reviewsResult = await supabase
        .from("reviews")
        .select(
          "id,booking_id,customer_id,provider_id,rating,comment,status,created_at"
        )
        .order("created_at", {
          ascending: false,
        });
      console.log(
        "MASTER APP: Reviews response:",
        reviewsResult
      );
      let reviewRows = reviewsResult.data || [];
      if (reviewsResult.error || reviewRows.length === 0) {
        if (reviewsResult.error) {
          console.warn("Supabase reviews notice:", reviewsResult.error);
        }
        try {
          const raw = window.localStorage.getItem("masterReviews");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setReviews(parsed);
              setLoading(false);
              return;
            }
          }
        } catch {}
      }
      if (reviewRows.length === 0) {
        setReviews([]);
        return;
      }
      const customerIds =
        Array.from(
          new Set(
            reviewRows
              .map(
                (item: any) =>
                  item.customer_id
              )
              .filter(Boolean)
          )
        );
      const providerIds =
        Array.from(
          new Set(
            reviewRows
              .map(
                (item: any) =>
                  item.provider_id
              )
              .filter(Boolean)
          )
        );
      const bookingIds =
        Array.from(
          new Set(
            reviewRows
              .map(
                (item: any) =>
                  item.booking_id
              )
              .filter(Boolean)
          )
        );
      let customers: any[] = [];
      let providers: any[] = [];
      let bookings: any[] = [];
      if (customerIds.length > 0) {
        const customerResult =
          await supabase
            .from("customers")
            .select(
              "id,name,mobile"
            )
            .in(
              "id",
              customerIds
            );
        if (customerResult.error) {
          console.error(
            "MASTER APP CUSTOMERS FOR REVIEWS ERROR:",
            customerResult.error
          );
        } else {
          customers =
            customerResult.data || [];
        }
      }
      if (providerIds.length > 0) {
        const providerResult =
          await supabase
            .from("providers")
            .select(
              "id,name,mobile,service"
            )
            .in(
              "id",
              providerIds
            );
        if (providerResult.error) {
          console.error(
            "MASTER APP PROVIDERS FOR REVIEWS ERROR:",
            providerResult.error
          );
        } else {
          providers =
            providerResult.data || [];
        }
      }
      if (bookingIds.length > 0) {
        const bookingResult =
          await supabase
            .from("bookings")
            .select(
              "id,customer_id,provider_id,customer_name,customer_mobile,provider_name,provider_service,service,booking_date,status"
            )
            .in(
              "id",
              bookingIds
            );
        if (bookingResult.error) {
          console.error(
            "MASTER APP BOOKINGS FOR REVIEWS ERROR:",
            bookingResult.error
          );
        } else {
          bookings =
            bookingResult.data || [];
        }
      }
      const mappedReviews: Review[] =
        reviewRows.map(
          (item: any) => {
            const customer =
              customers.find(
                (customerItem) =>
                  customerItem.id ===
                  item.customer_id
              );
            const provider =
              providers.find(
                (providerItem) =>
                  providerItem.id ===
                  item.provider_id
              );
            const booking =
              bookings.find(
                (bookingItem) =>
                  bookingItem.id ===
                  item.booking_id
              );
            return {
              id: item.id || "",
              bookingId:
                item.booking_id || "",
              customerId:
                item.customer_id || "",
              providerId:
                item.provider_id || "",
              rating: Number(
                item.rating || 0
              ),
              comment:
                item.comment || "",
              status:
                item.status ||
                "Published",
              createdAt:
                item.created_at || "",
              customerName:
                customer?.name ||
                booking?.customer_name ||
                "Unknown Customer",
              customerMobile:
                customer?.mobile ||
                booking?.customer_mobile ||
                "",
              providerName:
                provider?.name ||
                booking?.provider_name ||
                "Unknown Provider",
              providerService:
                provider?.service ||
                booking?.provider_service ||
                booking?.service ||
                "",
              bookingDate:
                booking?.booking_date ||
                "",
              bookingStatus:
                booking?.status ||
                "",
            };
          }
        );
      setReviews(
        mappedReviews
      );
      console.log(
        "MASTER APP: Reviews loaded:",
        mappedReviews.length
      );
    } catch (error) {
      console.error(
        "MASTER APP REVIEWS CRITICAL ERROR:",
        error
      );
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }
  const updateReviewStatus = async (
    reviewId: string,
    newStatus: string
  ) => {
    const authUser = await requireAdminSession();
    if (!authUser) return;
    setActionLoading(reviewId);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          status: newStatus,
        })
        .eq("id", reviewId);
      if (error) {
        console.warn("Update review Supabase notice:", error);
      }
      const updatedReviews = reviews.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              status: newStatus,
            }
          : review
      );
      setReviews(updatedReviews);
      syncLocalReviews(updatedReviews);
      if (selectedReview && selectedReview.id === reviewId) {
        setSelectedReview({
          ...selectedReview,
          status: newStatus,
        });
      }
      setNotice({
        type: "success",
        text: `Review status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error("REVIEW STATUS CRASH:", error);
      setNotice({ type: "error", text: "Failed to update review status." });
    } finally {
      setActionLoading(null);
    }
  };
  const deleteReview = async (
    reviewId: string
  ) => {
    const authUser = await requireAdminSession();
    if (!authUser) return;
    setActionLoading(reviewId);
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);
      if (error) {
        console.warn("Delete review Supabase notice:", error);
      }
      const updatedReviews = reviews.filter(
        (review) => review.id !== reviewId
      );
      setReviews(updatedReviews);
      syncLocalReviews(updatedReviews);
      setSelectedReview(null);
      setReviewToDelete(null);
      setNotice({ type: "info", text: "Review deleted successfully." });
    } catch (error) {
      console.error("DELETE REVIEW CRASH:", error);
      setNotice({ type: "error", text: "Failed to delete review." });
    } finally {
      setActionLoading(null);
    }
  };
  const filteredReviews =
    useMemo(() => {
      return reviews.filter(
        (review) => {
          const searchableText =
            `${review.customerName} ${review.customerMobile} ${review.providerName} ${review.providerService} ${review.comment} ${review.bookingId}`
              .toLowerCase();
          const matchesSearch =
            !search ||
            searchableText.includes(
              search.toLowerCase()
            );
          const matchesStatus =
            statusFilter === "All" ||
            review.status ===
              statusFilter;
          const matchesRating =
            ratingFilter === "All" ||
            review.rating ===
              Number(
                ratingFilter
              );
          return (
            matchesSearch &&
            matchesStatus &&
            matchesRating
          );
        }
      );
    }, [
      reviews,
      search,
      statusFilter,
      ratingFilter,
    ]);
  const totalReviews =
    reviews.length;
  const publishedReviews =
    reviews.filter(
      (review) =>
        review.status ===
        "Published"
    ).length;
  const pendingReviews =
    reviews.filter(
      (review) =>
        review.status ===
        "Pending"
    ).length;
  const rejectedReviews =
    reviews.filter(
      (review) =>
        review.status ===
        "Rejected"
    ).length;
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (sum, review) =>
              sum + review.rating,
            0
          ) /
          reviews.length
        ).toFixed(1)
      : "0.0";
  const formatDate = (
    date?: string
  ) => {
    if (!date) {
      return "—";
    }
    try {
      return new Date(
        date
      ).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return date;
    }
  };
  const formatDateTime = (
    date?: string
  ) => {
    if (!date) {
      return "—";
    }
    try {
      return new Date(
        date
      ).toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return date;
    }
  };
  const statusClass = (
    status: string
  ) => {
    if (
      status ===
      "Published"
    ) {
      return "bg-green-100 text-green-700";
    }
    if (
      status ===
      "Pending"
    ) {
      return "bg-yellow-100 text-yellow-700";
    }
    if (
      status ===
      "Rejected"
    ) {
      return "bg-red-100 text-red-700";
    }
    return "bg-gray-100 text-gray-700";
  };
  const renderStars = (
    rating: number
  ) => {
    return (
      <span className="text-yellow-400">
        {Array.from(
          { length: 5 },
          (_, index) =>
            index < rating
              ? "★"
              : "☆"
        ).join("")}
      </span>
    );
  };
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">
            ⏳
          </div>
          <p className="text-lg font-semibold text-gray-700">
            Loading Reviews...
          </p>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                ⭐ Admin Reviews
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage customer reviews and ratings
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  router.push(
                    "/admin/dashboard"
                  )
                }
                className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                Dashboard
              </button>
              <button
                onClick={() =>
                  void loadReviews()
                }
                className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                ↻ Refresh
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.localStorage.removeItem(
                    "masterAdminLoggedIn"
                  );
                  window.localStorage.removeItem(
                    "masterAdmin"
                  );
                  window.dispatchEvent(
                    new Event(
                      "master-auth-updated"
                    )
                  );
                  router.replace(
                    "/admin/login"
                  );
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {notice && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center justify-between border shadow-xs ${
              notice.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : notice.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <p className="text-sm font-medium">{notice.text}</p>
            <button
              onClick={() => setNotice(null)}
              className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* STATS */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="text-3xl mb-3">
              ⭐
            </div>
            <p className="text-sm text-gray-500">
              Total Reviews
            </p>
            <p className="text-3xl font-bold mt-1">
              {totalReviews}
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="text-3xl mb-3">
              ✅
            </div>
            <p className="text-sm text-gray-500">
              Published
            </p>
            <p className="text-3xl font-bold mt-1">
              {publishedReviews}
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="text-3xl mb-3">
              ⏳
            </div>
            <p className="text-sm text-gray-500">
              Pending
            </p>
            <p className="text-3xl font-bold mt-1">
              {pendingReviews}
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="text-3xl mb-3">
              ❌
            </div>
            <p className="text-sm text-gray-500">
              Rejected
            </p>
            <p className="text-3xl font-bold mt-1">
              {rejectedReviews}
            </p>
          </div>
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="text-3xl mb-3">
              🌟
            </div>
            <p className="text-sm text-gray-500">
              Average Rating
            </p>
            <p className="text-3xl font-bold mt-1">
              {averageRating}
            </p>
          </div>
        </section>
        {/* FILTERS */}
        <section className="bg-white border rounded-2xl p-5 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Customer, provider, service, comment..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="All">
                  All
                </option>
                <option value="Published">
                  Published
                </option>
                <option value="Pending">
                  Pending
                </option>
                <option value="Rejected">
                  Rejected
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rating
              </label>
              <select
                value={ratingFilter}
                onChange={(event) =>
                  setRatingFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="All">
                  All Ratings
                </option>
                <option value="5">
                  ⭐⭐⭐⭐⭐ 5
                </option>
                <option value="4">
                  ⭐⭐⭐⭐ 4
                </option>
                <option value="3">
                  ⭐⭐⭐ 3
                </option>
                <option value="2">
                  ⭐⭐ 2
                </option>
                <option value="1">
                  ⭐ 1
                </option>
              </select>
            </div>
          </div>
        </section>
        {/* RESULTS */}
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {filteredReviews.length}
            </span>{" "}
            reviews
          </p>
        </div>
        {filteredReviews.length ===
        0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
            <div className="text-5xl mb-4">
              ⭐
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              No reviews found
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              There are no reviews matching your current filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map(
              (review) => (
                <div
                  key={review.id}
                  className="bg-white border rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">
                          {review.customerName}
                        </h2>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            review.status
                          )}`}
                        >
                          {review.status}
                        </span>
                        {renderStars(
                          review.rating
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                        <div>
                          <p className="text-xs text-gray-500">
                            Customer Mobile
                          </p>
                          <p className="font-medium">
                            {review.customerMobile ||
                              "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Provider
                          </p>
                          <p className="font-medium">
                            {review.providerName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Service
                          </p>
                          <p className="font-medium">
                            {review.providerService ||
                              "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Rating
                          </p>
                          <p className="font-medium">
                            {review.rating}/5
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Booking Date
                          </p>
                          <p className="font-medium">
                            {formatDate(
                              review.bookingDate
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Review Date
                          </p>
                          <p className="font-medium">
                            {formatDate(
                              review.createdAt
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">
                          Customer Comment
                        </p>
                        <p className="text-gray-800">
                          {review.comment ||
                            "No comment provided."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
                        <span>
                          Review ID:{" "}
                          {review.id}
                        </span>
                        <span>
                          Booking ID:{" "}
                          {review.bookingId ||
                            "—"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap lg:flex-col gap-2 min-w-[150px]">
                      <button
                        onClick={() =>
                          setSelectedReview(
                            review
                          )
                        }
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        View Details
                      </button>
                      {review.status !==
                        "Published" && (
                        <button
                          disabled={
                            actionLoading ===
                            review.id
                          }
                          onClick={() =>
                            updateReviewStatus(
                              review.id,
                              "Published"
                            )
                          }
                          className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading ===
                          review.id
                            ? "Updating..."
                            : "Publish"}
                        </button>
                      )}
                      {review.status !==
                        "Pending" && (
                        <button
                          disabled={
                            actionLoading ===
                            review.id
                          }
                          onClick={() =>
                            updateReviewStatus(
                              review.id,
                              "Pending"
                            )
                          }
                          className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
                        >
                          Pending
                        </button>
                      )}
                      {review.status !==
                        "Rejected" && (
                        <button
                          disabled={
                            actionLoading ===
                            review.id
                          }
                          onClick={() =>
                            updateReviewStatus(
                              review.id,
                              "Rejected"
                            )
                          }
                          className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        disabled={
                          actionLoading ===
                          review.id
                        }
                        onClick={() =>
                          setReviewToDelete(
                            review.id
                          )
                        }
                        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
      {/* DELETE CONFIRMATION MODAL */}
      {reviewToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setReviewToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Review</h3>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to permanently delete this customer review? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setReviewToDelete(null)}
                className="px-4 py-2 border rounded-xl text-slate-700 hover:bg-slate-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteReview(reviewToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium text-sm shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DETAILS MODAL */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Review Details
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedReview.id}
                </p>
              </div>
              <button
                onClick={() =>
                  setSelectedReview(
                    null
                  )
                }
                className="rounded-full bg-gray-100 px-3 py-2 text-gray-600 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="rounded-2xl bg-gray-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedReview.customerName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedReview.customerMobile ||
                        "Mobile not available"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl">
                      {renderStars(
                        selectedReview.rating
                      )}
                    </div>
                    <span
                      className={`inline-block mt-2 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                        selectedReview.status
                      )}`}
                    >
                      {selectedReview.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">
                    Provider
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {selectedReview.providerName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">
                    Service
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {selectedReview.providerService ||
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">
                    Booking Date
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {formatDate(
                      selectedReview.bookingDate
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">
                    Booking Status
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {selectedReview.bookingStatus ||
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">
                    Review Date
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {formatDateTime(
                      selectedReview.createdAt
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-400">
                    Rating
                  </p>
                  <p className="mt-1 font-medium text-gray-900">
                    {selectedReview.rating}/5
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase text-gray-400">
                  Customer Comment
                </p>
                <p className="mt-2 text-gray-800 whitespace-pre-wrap">
                  {selectedReview.comment ||
                    "No comment provided."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedReview.status !==
                  "Published" && (
                  <button
                    onClick={() => {
                      void updateReviewStatus(
                        selectedReview.id,
                        "Published"
                      );
                    }}
                    className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
                  >
                    ✓ Publish Review
                  </button>
                )}
                {selectedReview.status !==
                  "Rejected" && (
                  <button
                    onClick={() => {
                      void updateReviewStatus(
                        selectedReview.id,
                        "Rejected"
                      );
                    }}
                    className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
                  >
                    ✕ Reject Review
                  </button>
                )}
                <button
                  onClick={() => {
                    void deleteReview(
                      selectedReview.id
                    );
                  }}
                  className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
                >
                  🗑 Delete Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
