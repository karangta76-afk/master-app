"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
type AvailabilityStatus =
  | "Available"
  | "Not Available"
  | "Temporarily Unavailable";
type Provider = {
  id: string;
  name: string;
  mobile?: string;
  area?: string;
  pincode?: string;
  address?: string;
  service: string;
  city: string;
  experience?: string;
  price?: string;
  description?: string;
  availability?: AvailabilityStatus;
  createdAt?: string;
};
type Review = {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  providerId: string;
  rating: number;
  comment: string;
  createdAt: string;
};
type Booking = {
  id: string;
  providerId: string;
  status: string;
};
type Customer = {
  id: string;
  name: string;
  mobile: string;
};
type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: "customer" | "provider";
  senderName: string;
  receiverId: string;
  receiverType: "customer" | "provider";
  text: string;
  createdAt: string;
  read: boolean;
};
import {
  StarIcon,
  MapPinIcon,
  BriefcaseIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  ShieldCheckIcon,
  VerifiedBadge,
  OnlineStatusDot,
  TradeBadgeContainer,
  TradeServiceIcon,
  MessageSquareIcon,
  SparklesIcon,
  CheckCircleIcon,
  PhoneIcon,
  XIcon,
} from "../../components/Icons";

function formatSinceDate(dateString?: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function renderStars(rating: number) {
  return [1, 2, 3, 4, 5].map((star) => (
    <StarIcon
      key={star}
      className={`h-4 w-4 ${
        star <= Math.round(rating)
          ? "text-amber-400"
          : "text-slate-200"
      }`}
      filled={star <= Math.round(rating)}
    />
  ));
}
export default function ProviderProfilePage() {
  const params = useParams();
  const router = useRouter();
  const providerId = String(params.id ?? "");
  const [provider, setProvider] =
    useState<Provider | null>(null);
  const [reviews, setReviews] =
    useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageLoading, setMessageLoading] =
    useState(false);
  const [completionInfo, setCompletionInfo] =
    useState({
      completed: 0,
      total: 0,
    });

  // Review & Rating Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerMobile, setReviewerMobile] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewError, setReviewError] = useState("");

  const handleOpenReviewModal = () => {
    try {
      const savedUserStr = localStorage.getItem("masterUser");
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed?.name && !reviewerName) setReviewerName(parsed.name);
        if (parsed?.mobile && !reviewerMobile) setReviewerMobile(parsed.mobile);
      }
    } catch (_) {}
    setReviewError("");
    setReviewSuccess("");
    setShowReviewModal(true);
  };
  /*
   * ============================================================
   * LOAD PROVIDER PROFILE
   * ============================================================
   */
  async function loadProviderProfile() {
    try {
      setLoading(true);
      setError("");
      /*
       * --------------------------------------------------------
       * LOAD PROVIDER FROM SUPABASE
       * --------------------------------------------------------
       */
      const {
        data: providerData,
        error: providerError,
      } = await supabase
        .from("providers")
        .select(
          "id,name,mobile,service,city,area,pincode,address,experience,price,description,availability,created_at"
        )
        .eq("id", providerId)
        .maybeSingle();
      if (providerError) {
        console.error(
          "Supabase provider loading error:",
          providerError
        );
      }
      let foundProvider: Provider | null = null;
      if (providerData) {
        foundProvider = {
          id: String(providerData.id),
          name: String(providerData.name ?? ""),
          mobile: String(providerData.mobile ?? ""),
          address: String(providerData.address ?? ""),
          service: String(providerData.service ?? ""),
          city: String(providerData.city ?? ""),
          experience: String(
            providerData.experience ?? ""
          ),
          price: String(providerData.price ?? ""),
          description: String(
            providerData.description ?? ""
          ),
          availability:
            providerData.availability ||
            "Available",
          createdAt: providerData.created_at
            ? String(providerData.created_at)
            : "",
        };
      }
      /*
       * --------------------------------------------------------
       * LOCAL STORAGE FALLBACK
       * --------------------------------------------------------
       */
      if (!foundProvider) {
        try {
          const storedProviders =
            localStorage.getItem(
              "masterProviders"
            );
          if (storedProviders) {
            const providers: Provider[] =
              JSON.parse(storedProviders);
            if (Array.isArray(providers)) {
              const localProvider = providers.find(
                (item) =>
                  String(item.id) ===
                  String(providerId)
              );
              if (localProvider) {
                foundProvider = {
                  id: String(localProvider.id),
                  name: String(localProvider.name ?? ""),
                  mobile: String(localProvider.mobile ?? ""),
                  address: String(localProvider.address ?? ""),
                  service: String(localProvider.service ?? ""),
                  city: String(localProvider.city ?? ""),
                  experience: String(
                    localProvider.experience ?? ""
                  ),
                  price: String(localProvider.price ?? ""),
                  description: String(
                    localProvider.description ?? ""
                  ),
                  availability:
                    localProvider.availability ||
                    "Available",
                  createdAt: localProvider.createdAt
                    ? String(localProvider.createdAt)
                    : "",
                };
              }
            }
          }
        } catch (localError) {
          console.error(
            "Local provider loading error:",
            localError
          );
        }
      }
      if (!foundProvider) {
        setError("Provider not found.");
        return;
      }
      setProvider(foundProvider);
      /*
       * --------------------------------------------------------
       * UPDATE PROVIDER CACHE
       * --------------------------------------------------------
       */
      try {
        const storedProviders =
          localStorage.getItem(
            "masterProviders"
          );
        const providers: Provider[] =
          storedProviders
            ? JSON.parse(storedProviders)
            : [];
        const exists = providers.some(
          (item) =>
            String(item.id) ===
            String(foundProvider!.id)
        );
        if (exists) {
          const updatedProviders =
            providers.map((item) =>
              String(item.id) ===
              String(foundProvider!.id)
                ? foundProvider!
                : item
            );
          localStorage.setItem(
            "masterProviders",
            JSON.stringify(updatedProviders)
          );
        } else {
          localStorage.setItem(
            "masterProviders",
            JSON.stringify([
              ...providers,
              foundProvider,
            ])
          );
        }
      } catch (cacheError) {
        console.error(
          "Provider cache error:",
          cacheError
        );
      }
      /*
       * --------------------------------------------------------
       * LOAD REVIEWS
       * --------------------------------------------------------
       */
      const {
        data: reviewData,
        error: reviewError,
      } = await supabase
        .from("reviews")
        .select("*")
        .eq("provider_id", providerId)
        .eq("status", "Published")
        .order("created_at", {
          ascending: false,
        });
      if (reviewError) {
        console.error(
          "Supabase reviews loading error:",
          reviewError
        );
      }
      const rawReviews: any[] = reviewData || [];
      /*
       * --------------------------------------------------------
       * LOAD CUSTOMER NAMES
       * --------------------------------------------------------
       */
      const customerIds = rawReviews
        .map((review: any) => review.customer_id)
        .filter(
          (id): id is string =>
            typeof id === "string" && id.length > 0
        );
      const customerMap: Record<string, string> =
        {};
      if (customerIds.length > 0) {
        const {
          data: customerData,
          error: customerError,
        } = await supabase
          .from("customers")
          .select("id,name")
          .in("id", customerIds);
        if (customerError) {
          console.error(
            "Customer loading error:",
            customerError
          );
        }
        if (customerData) {
          customerData.forEach(
            (customer: any) => {
              customerMap[String(customer.id)] =
                String(
                  customer.name ||
                    "Customer"
                );
            }
          );
        }
      }
      let mappedReviews: Review[] =
        rawReviews.map(
          (review: any) => ({
            id: String(review.id),
            bookingId: String(
              review.booking_id ?? ""
            ),
            customerId: String(
              review.customer_id ?? ""
            ),
            customerName:
              customerMap[
                String(review.customer_id)
              ] || "Customer",
            providerId: String(
              review.provider_id ?? ""
            ),
            rating:
              Number(review.rating) || 0,
            comment: String(
              review.comment ?? ""
            ),
            createdAt:
              review.created_at ||
              new Date().toISOString(),
          })
        );
      /*
       * --------------------------------------------------------
       * LOCAL REVIEW FALLBACK
       * --------------------------------------------------------
       */
      if (mappedReviews.length === 0) {
        try {
          const storedReviews =
            localStorage.getItem(
              "masterReviews"
            );
          if (storedReviews) {
            const localReviews: Review[] =
              JSON.parse(storedReviews);
            if (Array.isArray(localReviews)) {
              mappedReviews =
                localReviews.filter(
                  (review) =>
                    String(
                      review.providerId
                    ) ===
                    String(providerId)
                );
            }
          }
        } catch (localReviewError) {
          console.error(
            "Local review loading error:",
            localReviewError
          );
        }
      }
      setReviews(mappedReviews);
      /*
       * --------------------------------------------------------
       * REVIEW CACHE
       * --------------------------------------------------------
       */
      try {
        const storedReviews =
          localStorage.getItem(
            "masterReviews"
          );
        const allReviews: Review[] =
          storedReviews
            ? JSON.parse(storedReviews)
            : [];
        const otherReviews =
          allReviews.filter(
            (review) =>
              String(review.providerId) !==
              String(providerId)
          );
        localStorage.setItem(
          "masterReviews",
          JSON.stringify([
            ...otherReviews,
            ...mappedReviews,
          ])
        );
      } catch (cacheError) {
        console.error(
          "Review cache error:",
          cacheError
        );
      }
    } catch (loadError) {
      console.error(
        "Provider profile loading error:",
        loadError
      );
      setError(
        "Unable to load provider profile."
      );
    } finally {
      setLoading(false);
    }
  }
  /*
   * ============================================================
   * INITIAL LOAD + LIVE LOCAL EVENTS
   * ============================================================
   */
  useEffect(() => {
    loadProviderProfile();
    const handleUpdate = () => {
      loadProviderProfile();
    };
    // Supabase realtime: keep this profile page live when the provider,
    // reviews, or bookings are changed from another page/device.
    const realtimeChannel = supabase
      .channel(`provider-profile-${providerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "providers",
          filter: `id=eq.${providerId}`,
        },
        () => {
          loadProviderProfile();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          loadProviderProfile();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          loadProviderProfile();
        }
      )
      .subscribe();
    window.addEventListener(
      "storage",
      handleUpdate
    );
    window.addEventListener(
      "master-provider-updated",
      handleUpdate
    );
    window.addEventListener(
      "master-providers-updated",
      handleUpdate
    );
    window.addEventListener(
      "master-reviews-updated",
      handleUpdate
    );
    window.addEventListener(
      "master-bookings-updated",
      handleUpdate
    );
    return () => {
      window.removeEventListener(
        "storage",
        handleUpdate
      );
      window.removeEventListener(
        "master-provider-updated",
        handleUpdate
      );
      window.removeEventListener(
        "master-providers-updated",
        handleUpdate
      );
      window.removeEventListener(
        "master-reviews-updated",
        handleUpdate
      );
      window.removeEventListener(
        "master-bookings-updated",
        handleUpdate
      );
      supabase.removeChannel(realtimeChannel);
    };
  }, [providerId]);
  /*
   * ============================================================
   * START CUSTOMER -> PROVIDER CONVERSATION
   * ============================================================
   */
  const startConversation = async () => {
    if (!provider) {
      return;
    }
    setMessageLoading(true);
    try {
      /*
       * --------------------------------------------------------
       * GET LOGGED-IN CUSTOMER
       * --------------------------------------------------------
       */
      const savedUser =
        localStorage.getItem("masterUser");
      if (!savedUser) {
        router.push("/login");
        return;
      }
      const user: Customer =
        JSON.parse(savedUser);
      if (!user || !user.id) {
        router.push("/login");
        return;
      }
      /*
       * --------------------------------------------------------
       * GET LOCAL MESSAGES
       * --------------------------------------------------------
       */
      const savedMessages =
        localStorage.getItem(
          "masterMessages"
        );
      let messages: Message[] = [];
      if (savedMessages) {
        try {
          const parsedMessages: Message[] =
            JSON.parse(savedMessages);
          if (Array.isArray(parsedMessages)) {
            messages = parsedMessages;
          }
        } catch {
          messages = [];
        }
      }
      /*
       * --------------------------------------------------------
       * CONVERSATION ID
       * --------------------------------------------------------
       */
      const conversationId =
        `${user.id}_${provider.id}`;
      /*
       * --------------------------------------------------------
       * CHECK EXISTING CONVERSATION
       * --------------------------------------------------------
       */
      const conversationExists =
        messages.some(
          (message) =>
            message.conversationId ===
            conversationId
        );
      /*
       * --------------------------------------------------------
       * CREATE FIRST MESSAGE
       * --------------------------------------------------------
       */
      if (!conversationExists) {
        const messageId =
          `MSG-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
        const createdAt =
          new Date().toISOString();
        const messageText =
          `Hello ${provider.name}, I found your ${provider.service} service on Master App. I would like to discuss my service requirement.`;
        /*
         * ------------------------------------------------------
         * SAVE TO SUPABASE
         * ------------------------------------------------------
         */
        const {
          data: savedMessage,
          error: saveError,
        } = await supabase
          .from("messages")
          .insert({
            id: messageId,
            conversation_id:
              conversationId,
            sender_id: String(user.id),
            receiver_id: String(provider.id),
            sender_type: "customer",
            message: messageText,
            read: false,
            created_at: createdAt,
          })
          .select("*")
          .single();
        if (saveError) {
          console.error(
            "Supabase message save error:",
            saveError
          );
        }
        /*
         * ------------------------------------------------------
         * CREATE FRONTEND MESSAGE
         * ------------------------------------------------------
         */
        const newMessage: Message = {
          id:
            savedMessage?.id ||
            messageId,
          conversationId:
            savedMessage?.conversation_id ||
            conversationId,
          senderId:
            savedMessage?.sender_id ||
            String(user.id),
          senderType: "customer",
          senderName:
            user.name || "Customer",
          receiverId:
            savedMessage?.receiver_id ||
            String(provider.id),
          receiverType: "provider",
          text:
            savedMessage?.message ||
            messageText,
          createdAt:
            savedMessage?.created_at ||
            createdAt,
          read:
            savedMessage?.read ?? false,
        };
        /*
         * ------------------------------------------------------
         * SAVE TO LOCAL STORAGE
         * ------------------------------------------------------
         */
        const updatedMessages = [
          ...messages,
          newMessage,
        ];
        localStorage.setItem(
          "masterMessages",
          JSON.stringify(updatedMessages)
        );
        /*
         * ------------------------------------------------------
         * NOTIFY OTHER COMPONENTS
         * ------------------------------------------------------
         */
        window.dispatchEvent(
          new Event(
            "master-messages-updated"
          )
        );
      }
      /*
       * --------------------------------------------------------
       * OPEN CUSTOMER MESSAGES
       * --------------------------------------------------------
       */
      router.push("/messages");
    } catch (messageError) {
      console.error(
        "Start conversation error:",
        messageError
      );
      /*
       * Even if Supabase fails, keep the old
       * localStorage messaging functionality.
       */
      try {
        const savedUser =
          localStorage.getItem(
            "masterUser"
          );
        if (!savedUser || !provider) {
          router.push("/login");
          return;
        }
        const user: Customer =
          JSON.parse(savedUser);
        const savedMessages =
          localStorage.getItem(
            "masterMessages"
          );
        const messages: Message[] =
          savedMessages
            ? JSON.parse(savedMessages)
            : [];
        const conversationId =
          `${user.id}_${provider.id}`;
        const exists = messages.some(
          (message) =>
            message.conversationId ===
            conversationId
        );
        if (!exists) {
          const fallbackMessage: Message = {
            id: `MSG-${Date.now()}`,
            conversationId,
            senderId: user.id,
            senderType: "customer",
            senderName:
              user.name || "Customer",
            receiverId: provider.id,
            receiverType: "provider",
            text: `Hello ${provider.name}, I found your ${provider.service} service on Master App. I would like to discuss my service requirement.`,
            createdAt:
              new Date().toISOString(),
            read: false,
          };
          localStorage.setItem(
            "masterMessages",
            JSON.stringify([
              ...messages,
              fallbackMessage,
            ])
          );
          window.dispatchEvent(
            new Event(
              "master-messages-updated"
            )
          );
        }
        router.push("/messages");
      } catch (fallbackError) {
        console.error(
          "Message fallback error:",
          fallbackError
        );
        router.push("/login");
      }
    } finally {
      setMessageLoading(false);
    }
  };
  /*
   * ============================================================
   * BOOK PROVIDER
   * ============================================================
   */
  const handleBookProvider = () => {
    if (!provider) {
      return;
    }
    const savedUser =
      localStorage.getItem("masterUser");
    const otpVerified =
      localStorage.getItem("masterOtpVerified") === "true";
    const activeRole =
      localStorage.getItem("masterActiveRole");
    const isLoggedInCustomer =
      !!savedUser &&
      otpVerified &&
      activeRole === "customer";
    const providerProfilePath =
      `/provider/${provider.id}`;
    if (!isLoggedInCustomer) {
      localStorage.setItem(
        "masterPostLoginRedirect",
        providerProfilePath
      );
      router.push(
        `/login?redirect=${encodeURIComponent(
          providerProfilePath
        )}`
      );
      return;
    }
    router.push(providerProfilePath);
  };

  /*
   * ============================================================
   * SUBMIT CUSTOMER REVIEW & RATING (ANY CUSTOMER CAN RATE)
   * ============================================================
   */
  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!provider || reviewSubmitting) return;

    setReviewError("");
    setReviewSuccess("");

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please select a rating between 1 and 5 stars.");
      return;
    }

    if (!reviewComment.trim()) {
      setReviewError("Please write your feedback or experience with this provider.");
      return;
    }

    // Determine customer info (logged in or guest)
    let customerId = "";
    let customerName = reviewerName.trim();
    let customerMobile = reviewerMobile.trim();

    try {
      const savedUserStr = localStorage.getItem("masterUser");
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed?.id) {
          customerId = parsed.id;
          if (!customerName && parsed.name) customerName = parsed.name;
          if (!customerMobile && parsed.mobile) customerMobile = parsed.mobile;
        }
      }
    } catch (_) {}

    if (!customerId) {
      if (!customerName) {
        setReviewError("Please enter your name to post this rating.");
        return;
      }
      customerId = `CUST-REV-${Date.now()}`;
      try {
        await supabase.from("customers").upsert({
          id: customerId,
          name: customerName,
          mobile: customerMobile || `+9199999${String(Date.now()).slice(-5)}`,
          account_status: "Active",
        });
      } catch (custErr) {
        console.warn("Guest customer profile notice:", custErr);
      }
    }

    setReviewSubmitting(true);

    try {
      // Find existing booking or create direct anchor booking
      let bookingId = "";
      try {
        const { data: existingBooking } = await supabase
          .from("bookings")
          .select("id")
          .eq("customer_id", customerId)
          .eq("provider_id", provider.id)
          .limit(1)
          .maybeSingle();

        if (existingBooking?.id) {
          bookingId = existingBooking.id;
        }
      } catch (_) {}

      if (!bookingId) {
        bookingId = `BOOK-DIR-${Date.now()}`;
        const todayDate = new Date().toISOString().split("T")[0];
        const currentTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

        const { error: anchorErr } = await supabase.from("bookings").insert({
          id: bookingId,
          customer_id: customerId,
          provider_id: provider.id,
          service: provider.service || "Customer Rating",
          booking_date: todayDate,
          booking_time: currentTime,
          customer_name: customerName || "Customer",
          customer_mobile: customerMobile || "",
          status: "Completed",
        });

        if (anchorErr) {
          console.warn("Anchor booking notice:", anchorErr);
        }
      }

      // Insert review in Supabase reviews table
      const newReviewId = `REV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const createdAt = new Date().toISOString();

      const { error: revErr } = await supabase.from("reviews").insert({
        id: newReviewId,
        booking_id: bookingId,
        customer_id: customerId,
        provider_id: provider.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
        status: "Published",
      });

      if (revErr) {
        throw new Error(revErr.message || "Failed to submit review.");
      }

      const newReviewItem: Review = {
        id: newReviewId,
        bookingId,
        customerId,
        customerName: customerName || "Customer",
        providerId: provider.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt,
      };

      setReviews((prev) => [newReviewItem, ...prev]);

      try {
        const storedReviews = localStorage.getItem("masterReviews");
        const list: Review[] = storedReviews ? JSON.parse(storedReviews) : [];
        localStorage.setItem("masterReviews", JSON.stringify([newReviewItem, ...list]));
        window.dispatchEvent(new Event("master-reviews-updated"));
      } catch (_) {}

      setReviewSuccess("Thank you! Your rating and review have been published.");
      setReviewComment("");
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewSuccess("");
      }, 2000);
    } catch (err: any) {
      console.error("Submit review error:", err);
      setReviewError(err?.message || "Failed to submit your rating. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  }
  /*
   * ============================================================
   * RATING STATISTICS
   * ============================================================
   */
  const ratingStats = useMemo(() => {
    const total = reviews.length;
    let average = 0;
    if (total > 0) {
      const ratingTotal =
        reviews.reduce(
          (sum, review) =>
            sum +
            (Number(review.rating) || 0),
          0
        );
      average = ratingTotal / total;
    }
    const breakdown: Record<
      1 | 2 | 3 | 4 | 5,
      number
    > = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    reviews.forEach((review) => {
      const rating =
        Number(review.rating);
      if (
        rating === 5 ||
        rating === 4 ||
        rating === 3 ||
        rating === 2 ||
        rating === 1
      ) {
        breakdown[
          rating as 1 | 2 | 3 | 4 | 5
        ] += 1;
      }
    });
    return {
      average,
      total,
      breakdown,
    };
  }, [reviews]);
  /*
   * ============================================================
   * LOAD COMPLETED BOOKINGS
   * ============================================================
   */
  useEffect(() => {
    async function loadCompletionInfo() {
      if (!provider) {
        return;
      }
      try {
        const {
          data,
          error: bookingError,
        } = await supabase
          .from("bookings")
          .select("id,status")
          .eq(
            "provider_id",
            provider.id
          );
        if (bookingError) {
          console.error(
            "Supabase completion loading error:",
            bookingError
          );
        }
        if (
          !bookingError &&
          data
        ) {
          const completed =
            data.filter(
              (booking) =>
                booking.status ===
                "Completed"
            ).length;
          setCompletionInfo({
            completed,
            total: data.length,
          });
          return;
        }
      } catch (bookingLoadError) {
        console.error(
          "Completion loading error:",
          bookingLoadError
        );
      }
      /*
       * LOCAL STORAGE FALLBACK
       */
      try {
        const storedBookings =
          localStorage.getItem(
            "masterBookings"
          );
        if (!storedBookings) {
          return;
        }
        const bookings: Booking[] =
          JSON.parse(
            storedBookings
          );
        if (!Array.isArray(bookings)) {
          return;
        }
        const providerBookings =
          bookings.filter(
            (booking) =>
              String(
                booking.providerId
              ) ===
              String(provider.id)
          );
        const completed =
          providerBookings.filter(
            (booking) =>
              booking.status ===
              "Completed"
          ).length;
        setCompletionInfo({
          completed,
          total:
            providerBookings.length,
        });
      } catch (localError) {
        console.error(
          "Local completion loading error:",
          localError
        );
      }
    }
    loadCompletionInfo();
  }, [provider]);
  /*
   * ============================================================
   * LOADING SCREEN
   * ============================================================
   */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-4 text-sm text-gray-500">
            Loading provider profile...
          </p>
        </div>
      </main>
    );
  }
  /*
   * ============================================================
   * ERROR SCREEN
   * ============================================================
   */
  if (error || !provider) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">
            😕
          </div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Provider Not Found
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {error ||
              "This provider profile is no longer available."}
          </p>
          <Link
            href="/services"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Browse Services
          </Link>
        </div>
      </main>
    );
  }
  /*
   * ============================================================
   * DISPLAY DATA
   * ============================================================
   */
  const availability =
    provider.availability ||
    "Available";
  const isAvailable =
    availability === "Available";
  const isTemporarilyUnavailable =
    availability ===
    "Temporarily Unavailable";
  const ratingPercentage =
    ratingStats.total > 0
      ? Math.round(
          (ratingStats.average / 5) *
            100
        )
      : 0;
  const serviceSlug =
    provider.service
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");
  const sortedReviews = [
    ...reviews,
  ].sort(
    (a, b) =>
      new Date(
        b.createdAt
      ).getTime() -
      new Date(
        a.createdAt
      ).getTime()
  );
  /*
   * ============================================================
   * PAGE
   * ============================================================
   */
  return (
    <main className="min-h-screen bg-slate-50">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-white sm:py-12 border-b border-slate-800/80">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl">
          <Link
            href={`/services/${serviceSlug}`}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:text-white"
          >
            ← Back to {provider.service}
          </Link>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <TradeBadgeContainer service={provider.service} size="lg">
                <span className="text-2xl font-black text-white">
                  {getInitials(provider.name)}
                </span>
              </TradeBadgeContainer>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl text-white">
                    {provider.name}
                  </h1>
                  <VerifiedBadge text="Verified Specialist" size="sm" />
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-300">
                  <span className="font-semibold text-white">{provider.service}</span>
                  {provider.city && (
                    <>
                      <span className="text-slate-500">•</span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                        {provider.city}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 ring-1 ring-white/10 backdrop-blur-xs">
                    <OnlineStatusDot available={isAvailable} label={isAvailable ? "Available for Booking" : isTemporarilyUnavailable ? "Temporarily Unavailable" : "Not Available"} />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold rounded-full bg-slate-900/80 px-3 py-1 ring-1 ring-white/10 backdrop-blur-xs">
                    <StarIcon className="w-4 h-4 text-amber-400" filled />
                    <span className="text-white font-bold">
                      {ratingStats.total > 0
                        ? ratingStats.average.toFixed(1)
                        : "New"}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({ratingStats.total}{" "}
                      {ratingStats.total === 1
                        ? "review"
                        : "reviews"})
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 sm:min-w-[240px]">
              {provider.mobile && (
                <a
                  href={`tel:${provider.mobile}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-7 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:from-emerald-500 hover:to-green-500 active:scale-[0.98]"
                >
                  <PhoneIcon className="w-4 h-4 text-white animate-pulse" />
                  <span>Call Provider: {provider.mobile}</span>
                </a>
              )}
              {isAvailable ? (
                <button
                  type="button"
                  onClick={handleBookProvider}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98]"
                >
                  Book This Provider →
                </button>
              ) : (
                <div
                  className={`rounded-xl px-7 py-3 text-center text-sm font-bold text-white ${
                    isTemporarilyUnavailable
                      ? "bg-amber-500/80"
                      : "bg-rose-500/80"
                  }`}
                >
                  {isTemporarilyUnavailable
                    ? "Currently Unavailable"
                    : "Not Available"}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startConversation}
                  disabled={messageLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-center text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageSquareIcon className="w-4 h-4 text-blue-400" />
                  <span>{messageLoading ? "Opening..." : "Message"}</span>
                </button>
                {isAvailable ? (
                  <Link
                    href={`/provider/${provider.id}/book`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-400/40 bg-blue-500/20 px-4 py-2.5 text-center text-xs font-bold text-blue-200 transition hover:bg-blue-500/30"
                  >
                    <CalendarIcon className="w-4 h-4 text-blue-300" />
                    <span>Schedule</span>
                  </Link>
                ) : (
                  <div className="rounded-xl bg-slate-800/50 px-4 py-2.5 text-center text-xs font-medium text-slate-500">
                    Paused
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* MAIN */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        {!isAvailable && (
          <div
            className={`mb-6 rounded-2xl border p-5 ${
              isTemporarilyUnavailable
                ? "border-amber-200 bg-amber-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">
                {isTemporarilyUnavailable ? "🟠" : "🔴"}
              </div>
              <div>
                <h2
                  className={`font-bold ${
                    isTemporarilyUnavailable
                      ? "text-amber-900"
                      : "text-red-900"
                  }`}
                >
                  {isTemporarilyUnavailable
                    ? "Provider is temporarily unavailable"
                    : "Provider is currently not available"}
                </h2>
                <p
                  className={`mt-1 text-sm ${
                    isTemporarilyUnavailable
                      ? "text-amber-800"
                      : "text-red-800"
                  }`}
                >
                  {isTemporarilyUnavailable
                    ? "This provider is not accepting new bookings right now. Please check again later."
                    : "This provider is not accepting new bookings currently. You can contact the provider or choose another provider."}
                </p>
              </div>
            </div>
          </div>
        )}
        {/* QUICK STATS */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-xs transition hover:border-blue-200">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <StarIcon className="w-5 h-5" filled />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {ratingStats.total > 0
                ? ratingStats.average.toFixed(1)
                : "—"}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Rating
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-xs transition hover:border-blue-200">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <MessageSquareIcon className="w-5 h-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {ratingStats.total}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Reviews
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-xs transition hover:border-blue-200">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <BriefcaseIcon className="w-5 h-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {completionInfo.completed}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Services Completed
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-xs transition hover:border-blue-200">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <MapPinIcon className="w-5 h-5" />
            </div>
            <p className="mt-3 truncate text-lg font-bold text-slate-900">
              {provider.city || "Available"}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              Service Location
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* LEFT */}
          <div className="space-y-6 lg:col-span-2">
            {/* ABOUT */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7">
              <h2 className="text-xl font-bold text-slate-900">
                About This Provider
              </h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                {provider.description ||
                  `${provider.name} provides ${provider.service} services in ${
                    provider.city ||
                    "your area"
                  }. Contact the provider to discuss your exact requirement.`}
              </p>
            </section>
            {/* SERVICE DETAILS */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7">
              <h2 className="text-xl font-bold text-slate-900">
                Service Details
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Service
                  </p>
                  <p className="mt-2 font-semibold text-slate-900 flex items-center gap-2">
                    <TradeServiceIcon service={provider.service} className="w-4 h-4 text-blue-600" />
                    <span>{provider.service}</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Experience
                  </p>
                  <p className="mt-2 font-semibold text-slate-900 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-amber-500" />
                    <span>{provider.experience || "Not specified"}</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Starting Price
                  </p>
                  <p className="mt-2 font-semibold text-slate-900 flex items-center gap-2">
                    <CurrencyRupeeIcon className="w-4 h-4 text-emerald-600" />
                    <span>{provider.price || "Contact for price"}</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </p>
                  <p className="mt-2 font-semibold text-slate-900 flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-blue-600" />
                    <span>{provider.city || "Not specified"}</span>
                  </p>
                </div>
              </div>
            </section>
            {/* REVIEWS */}
            <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Customer Reviews & Ratings
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Feedback and ratings from customers. Anyone can rate this provider.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenReviewModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 transition active:scale-98"
                  >
                    <StarIcon className="w-4 h-4 fill-white" />
                    <span>Rate Provider</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {ratingStats.total >
                    0
                      ? ratingStats.average.toFixed(
                          1
                        )
                      : "—"}
                  </div>
                  <div>
                    <div className="flex text-lg">
                      {renderStars(
                        ratingStats.average
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {ratingStats.total}{" "}
                      reviews
                    </p>
                  </div>
                </div>
              </div>
              {/* RATING BREAKDOWN */}
              <div className="mt-7 rounded-2xl bg-gray-50 p-5">
                <div className="flex items-center justify-between gap-6">
                  <div className="hidden text-center sm:block">
                    <p className="text-4xl font-bold text-gray-900">
                      {ratingStats.total >
                      0
                        ? ratingStats.average.toFixed(
                            1
                          )
                        : "—"}
                    </p>
                    <div className="mt-1 flex justify-center text-lg">
                      {renderStars(
                        ratingStats.average
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Overall Rating
                    </p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map(
                      (star) => {
                        const count =
                          ratingStats
                            .breakdown[
                            star as
                              | 1
                              | 2
                              | 3
                              | 4
                              | 5
                          ];
                        const percentage =
                          ratingStats.total >
                          0
                            ? Math.round(
                                (count /
                                  ratingStats.total) *
                                  100
                              )
                            : 0;
                        return (
                          <div
                            key={star}
                            className="flex items-center gap-2"
                          >
                            <span className="w-8 text-sm font-semibold text-gray-600">
                              {star}★
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-yellow-400"
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                            <span className="w-8 text-right text-xs text-gray-500">
                              {count}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{
                        width: `${ratingPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* REVIEW LIST */}
              <div className="mt-7 space-y-4">
                {reviews.length > 0 ? (
                  sortedReviews.map(
                    (review) => (
                      <article
                        key={review.id}
                        className="rounded-2xl border p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                              {getInitials(
                                review.customerName
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {review.customerName ||
                                  "Customer"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(
                                  review.createdAt
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex text-lg">
                            {renderStars(
                              review.rating
                            )}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="mt-4 text-sm leading-6 text-gray-700">
                            {review.comment}
                          </p>
                        )}
                      </article>
                    )
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed px-5 py-10 text-center">
                    <div className="text-4xl">
                      ⭐
                    </div>
                    <h3 className="mt-3 font-bold text-gray-900">
                      No reviews yet
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Be the first to rate or review this provider!
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenReviewModal}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 transition active:scale-98"
                    >
                      <StarIcon className="w-4 h-4 fill-white" />
                      <span>Write First Review</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
          {/* RIGHT SIDEBAR */}
          <aside className="space-y-6">
            {/* BOOKING CARD */}
            <div className="sticky top-24 rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">
                SERVICE PRICE
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {provider.price ||
                  "Contact for price"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Final price may depend on your requirement.
              </p>
              <div className="mt-5">
                {isAvailable && (
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4">
                    <div className="flex items-center gap-2 font-semibold text-emerald-800">
                      <OnlineStatusDot available={true} />
                      <span>Available for Booking</span>
                    </div>
                    <p className="mt-1 text-xs text-emerald-700">
                      This provider is currently accepting new service requests.
                    </p>
                  </div>
                )}
                {isTemporarilyUnavailable && (
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4">
                    <div className="flex items-center gap-2 font-semibold text-amber-800">
                      <OnlineStatusDot available={false} />
                      <span>Temporarily Unavailable</span>
                    </div>
                    <p className="mt-1 text-xs text-amber-700">
                      New bookings are currently paused.
                    </p>
                  </div>
                )}
                {!isAvailable && !isTemporarilyUnavailable && (
                  <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 p-4">
                    <div className="flex items-center gap-2 font-semibold text-rose-800">
                      <OnlineStatusDot available={false} />
                      <span>Not Available</span>
                    </div>
                    <p className="mt-1 text-xs text-rose-700">
                      This provider is currently not accepting bookings.
                    </p>
                  </div>
                )}
              </div>
              {isAvailable ? (
                <Link
                  href={`/provider/${provider.id}/book`}
                  className="mt-4 block rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-center font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition active:scale-[0.98]"
                >
                  Book Now →
                </Link>
              ) : (
                <div
                  className={`mt-4 rounded-xl px-5 py-3.5 text-center font-bold ${
                    isTemporarilyUnavailable
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {isTemporarilyUnavailable
                    ? "Booking Unavailable"
                    : "Booking Unavailable"}
                </div>
              )}
              <button
                type="button"
                onClick={startConversation}
                disabled={messageLoading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-center font-bold text-slate-700 hover:bg-slate-50 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MessageSquareIcon className="w-4 h-4 text-blue-600" />
                <span>{messageLoading ? "Opening Messages..." : "Message Provider"}</span>
              </button>
              {provider.mobile && (
                <a
                  href={`tel:${provider.mobile}`}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-center font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition active:scale-[0.98]"
                >
                  <PhoneIcon className="w-4 h-4 text-white" />
                  <span>Call Provider: {provider.mobile}</span>
                </a>
              )}
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-center text-xs text-emerald-800 flex items-center justify-center gap-2">
                <PhoneIcon className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Direct phone call available. You can also message or book through Master App.</span>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ShieldCheckIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Verified Provider
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatSinceDate(provider.createdAt)
                        ? `Since ${formatSinceDate(provider.createdAt)}`
                        : "Listed on Master App"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircleIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Direct Booking
                    </p>
                    <p className="text-xs text-slate-500">
                      Request service through Master App
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* PROVIDER INFORMATION */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <h3 className="font-bold text-slate-900">
                Provider Information
              </h3>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Provider ID
                  </p>
                  <p className="mt-1 break-all font-mono text-sm text-slate-700">
                    {provider.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Location
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {provider.city || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Direct Contact / Phone
                  </p>
                  {provider.mobile ? (
                    <a
                      href={`tel:${provider.mobile}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      <PhoneIcon className="w-4 h-4 text-emerald-600" />
                      <span>{provider.mobile} (Tap to Call)</span>
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-slate-700">Contact securely through Master App messaging.</p>
                  )}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={startConversation}
                  disabled={messageLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-blue-100 transition disabled:opacity-60"
                >
                  <MessageSquareIcon className="w-4 h-4" />
                  <span>{messageLoading ? "Opening..." : "Message"}</span>
                </button>
                {isAvailable ? (
                  <Link
                    href={`/provider/${provider.id}/book`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span>Book Now</span>
                  </Link>
                ) : (
                  <div className="rounded-xl bg-slate-100 px-2 py-3 text-center text-sm font-semibold text-slate-500">
                    Unavailable
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
        {/* BOTTOM CTA */}
        <section className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                {isAvailable ? "READY TO BOOK?" : "CURRENT AVAILABILITY"}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl text-white">
                {isAvailable
                  ? `Book ${provider.name}`
                  : isTemporarilyUnavailable
                  ? `${provider.name} is temporarily unavailable`
                  : `${provider.name} is currently unavailable`}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-blue-100">
                {isAvailable
                  ? "Select your preferred date and time and send your service request."
                  : "Please check back later or find another provider for your service."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={startConversation}
                disabled={messageLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-7 py-3.5 font-bold text-white backdrop-blur-xs hover:bg-white/20 transition active:scale-[0.98] disabled:opacity-60"
              >
                <MessageSquareIcon className="w-4 h-4 text-white" />
                <span>{messageLoading ? "Opening..." : "Message"}</span>
              </button>
              {isAvailable ? (
                <button
                  type="button"
                  onClick={() => router.push(`/provider/${provider.id}/book`)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 font-bold text-blue-700 shadow-md hover:bg-blue-50 transition active:scale-[0.98]"
                >
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <span>Book Service →</span>
                </button>
              ) : (
                <Link
                  href={`/services/${serviceSlug}`}
                  className="rounded-xl bg-white px-7 py-3.5 text-center font-bold text-blue-700 hover:bg-blue-50 transition"
                >
                  Find Another Provider →
                </Link>
              )}
            </div>
          </div>
        </section>
      </section>
    
      {/* REVIEW & RATING MODAL (ANY CUSTOMER CAN RATE) */}
      {showReviewModal && provider && (
        <div
          id="customer-review-modal"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
            >
              <XIcon className="w-4 h-4" />
            </button>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-200">
                <StarIcon className="w-6 h-6 fill-amber-400" />
              </div>
              <h3 className="mt-3 text-xl font-extrabold text-slate-900">
                Rate & Review {provider.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Share your rating or feedback for {provider.service} service
              </p>
            </div>

            {reviewSuccess ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <CheckCircleIcon className="mx-auto w-10 h-10 text-emerald-600" />
                <p className="mt-2 font-bold text-emerald-900 text-sm">{reviewSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="mt-6 space-y-4">
                {reviewError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
                    <XIcon className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {/* Star Rating Picker */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Select Your Rating
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setReviewRating(star)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <StarIcon
                          className={`w-8 h-8 transition-colors ${
                            star <= (hoverRating || reviewRating)
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-300"
                          }`}
                          filled={star <= (hoverRating || reviewRating)}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    {reviewRating === 5 && "⭐⭐⭐⭐⭐ Outstanding"}
                    {reviewRating === 4 && "⭐⭐⭐⭐ Very Good"}
                    {reviewRating === 3 && "⭐⭐⭐ Good"}
                    {reviewRating === 2 && "⭐⭐ Fair"}
                    {reviewRating === 1 && "⭐ Poor"}
                  </p>
                </div>

                {/* Name & Phone if not logged in */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. Ramesh"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mobile Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={reviewerMobile}
                      onChange={(e) => setReviewerMobile(e.target.value)}
                      placeholder="9876543210"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Your Review / Feedback *
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Write about your experience, response time, quality of work or general feedback..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="flex-1 rounded-xl bg-amber-500 py-3 text-xs font-bold text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 transition active:scale-98 disabled:opacity-60"
                  >
                    {reviewSubmitting ? "Publishing Review..." : "Submit Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}