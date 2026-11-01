import { supabase } from "./supabase";
/* =========================================================
   CUSTOMERS
========================================================= */
export async function getCustomers() {
  let list: any[] = [];
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      list = data;
    }
  } catch (err) {
    console.warn("Error loading customers from Supabase:", err);
  }
  // Merge with localStorage if in browser
  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterCustomers") || "[]"
      );
      if (Array.isArray(local)) {
        local.forEach((lc: any) => {
          const cleanMobile = String(lc.mobile || "")
            .replace(/\D/g, "")
            .slice(-10);
          const already = list.some(
            (c: any) =>
              String(c.mobile || "")
                .replace(/\D/g, "")
                .slice(-10) === cleanMobile
          );
          if (!already) {
            list.push(lc);
          }
        });
      }
    } catch {
      // Ignore
    }
  }
  return list;
}
export async function saveCustomer(customer: {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  account_status?: string;
}) {
  let data: any = null;
  try {
    const res = await supabase
      .from("customers")
      .upsert(
        {
          id: customer.id,
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email || null,
          address: customer.address || null,
          account_status: customer.account_status || "Active",
        },
        {
          onConflict: "id",
        }
      )
      .select()
      .single();
    if (!res.error) {
      data = res.data;
    }
  } catch (err) {
    console.warn("Supabase customer save notice:", err);
  }
  // Always persist to local storage as well
  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterCustomers") || "[]"
      );
      const index = local.findIndex(
        (c: any) => c.id === customer.id || c.mobile === customer.mobile
      );
      if (index >= 0) {
        local[index] = { ...local[index], ...customer };
      } else {
        local.push(customer);
      }
      localStorage.setItem("masterCustomers", JSON.stringify(local));
    } catch {
      // Ignore
    }
  }
  return data || customer;
}
/* =========================================================
   PROVIDERS
========================================================= */
export async function getProviders() {
  let list: any[] = [];
  try {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      list = data;
    } else if (error) {
      console.warn("Supabase providers load notice:", error.message);
    }
  } catch (err) {
    console.warn("Error loading providers from Supabase:", err);
  }

  // Merge with localStorage if in browser
  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterProviders") || "[]"
      );
      if (Array.isArray(local)) {
        local.forEach((lp: any) => {
          const already = list.some(
            (p: any) => p.id === lp.id || (p.mobile && lp.mobile && p.mobile === lp.mobile)
          );
          if (!already) {
            list.push(lp);
          }
        });
      }
    } catch {
      // Ignore
    }
  }

  return list;
}

export async function saveProvider(provider: {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  service: string;
  city: string;
  address?: string;
  experience?: string;
  price?: string;
  description?: string;
  availability?: string;
  account_status?: string;
}) {
  const providerData = {
    id: provider.id,
    name: provider.name,
    mobile: provider.mobile,
    email: provider.email || null,
    service: provider.service,
    city: provider.city,
    address: provider.address || null,
    experience: provider.experience || null,
    price: provider.price || null,
    description: provider.description || null,
    availability: provider.availability || "Available",
    account_status: provider.account_status || "Pending",
  };

  let data: any = null;
  try {
    const res = await supabase
      .from("providers")
      .upsert(providerData, {
        onConflict: "id",
      })
      .select()
      .single();

    if (!res.error) {
      data = res.data;
    } else {
      console.warn("Supabase provider save notice:", res.error.message);
    }
  } catch (err) {
    console.warn("Supabase provider save notice:", err);
  }

  // Always persist to local storage as well
  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterProviders") || "[]"
      );
      const index = Array.isArray(local)
        ? local.findIndex(
            (p: any) => p.id === provider.id || (p.mobile && provider.mobile && p.mobile === provider.mobile)
          )
        : -1;
      if (index >= 0) {
        local[index] = { ...local[index], ...providerData };
      } else {
        local.push(providerData);
      }
      localStorage.setItem("masterProviders", JSON.stringify(local));
      window.dispatchEvent(new Event("master-providers-updated"));
    } catch {
      // Ignore
    }
  }

  return data || providerData;
}

/* =========================================================
   BOOKINGS
========================================================= */
export async function getBookings() {
  let list: any[] = [];
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      list = data;
    } else if (error) {
      console.warn("Supabase bookings load notice:", error.message);
    }
  } catch (err) {
    console.warn("Error loading bookings from Supabase:", err);
  }

  // Merge with localStorage if in browser
  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterBookings") || "[]"
      );
      if (Array.isArray(local)) {
        local.forEach((lb: any) => {
          const already = list.some((b: any) => b.id === lb.id);
          if (!already) {
            list.push({
              id: lb.id,
              customer_id: lb.customerId || lb.customer_id,
              provider_id: lb.providerId || lb.provider_id,
              provider_name: lb.provider || lb.provider_name,
              provider_service: lb.providerService || lb.provider_service,
              service: lb.service,
              booking_date: lb.date || lb.booking_date,
              booking_time: lb.time || lb.booking_time,
              customer_name: lb.name || lb.customer_name,
              customer_mobile: lb.mobile || lb.customer_mobile,
              address: lb.address,
              requirement: lb.requirement,
              status: lb.status || "Pending",
              cancellation_reason: lb.cancelReason || lb.cancellation_reason,
              created_at: lb.createdAt || lb.created_at || new Date().toISOString(),
            });
          }
        });
      }
    } catch {
      // Ignore
    }
  }

  return list;
}

export async function saveBooking(booking: {
  id: string;
  customer_id: string;
  provider_id: string;
  provider_name?: string;
  provider_service?: string;
  service?: string;
  booking_date: string;
  booking_time?: string;
  customer_name?: string;
  customer_mobile?: string;
  address?: string;
  requirement?: string;
  status?: string;
  cancellation_reason?: string;
}) {
  const bookingData = {
    id: booking.id,
    customer_id: booking.customer_id,
    provider_id: booking.provider_id,
    provider_name: booking.provider_name || null,
    provider_service: booking.provider_service || null,
    service: booking.service || null,
    booking_date: booking.booking_date,
    booking_time: booking.booking_time || null,
    customer_name: booking.customer_name || null,
    customer_mobile: booking.customer_mobile || null,
    address: booking.address || null,
    requirement: booking.requirement || null,
    status: booking.status || "Pending",
    cancellation_reason: booking.cancellation_reason || null,
  };

  let data: any = null;
  try {
    const res = await supabase
      .from("bookings")
      .upsert(bookingData, {
        onConflict: "id",
      })
      .select()
      .single();

    if (!res.error) {
      data = res.data;
    } else {
      console.warn("Supabase booking save notice:", res.error.message);
    }
  } catch (err) {
    console.warn("Supabase booking save notice:", err);
  }

  // Always persist to local storage as well
  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterBookings") || "[]"
      );
      const localBookingRecord = {
        id: booking.id,
        customerId: booking.customer_id,
        providerId: booking.provider_id,
        provider: booking.provider_name || "",
        providerService: booking.provider_service || "",
        service: booking.service || "",
        date: booking.booking_date,
        time: booking.booking_time || "",
        name: booking.customer_name || "",
        mobile: booking.customer_mobile || "",
        address: booking.address || "",
        requirement: booking.requirement || "",
        status: booking.status || "Pending",
        cancelReason: booking.cancellation_reason || "",
        createdAt: new Date().toISOString(),
      };

      const index = Array.isArray(local)
        ? local.findIndex((b: any) => b.id === booking.id)
        : -1;

      if (index >= 0) {
        local[index] = { ...local[index], ...localBookingRecord };
      } else {
        local.unshift(localBookingRecord);
      }
      localStorage.setItem("masterBookings", JSON.stringify(local));
      window.dispatchEvent(new Event("master-bookings-updated"));
    } catch (e) {
      console.warn("LocalStorage booking save notice:", e);
    }
  }

  return data || bookingData;
}

/* =========================================================
   MESSAGES
========================================================= */
export async function getMessages() {
  let list: any[] = [];
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      list = data;
    } else if (error) {
      console.warn("Supabase messages load notice:", error.message);
    }
  } catch (err) {
    console.warn("Error loading messages from Supabase:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterMessages") || "[]"
      );
      if (Array.isArray(local)) {
        local.forEach((lm: any) => {
          const already = list.some((m: any) => m.id === lm.id);
          if (!already) {
            list.push(lm);
          }
        });
      }
    } catch {
      // Ignore
    }
  }

  return list;
}

export async function saveMessage(message: {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  sender_type: "customer" | "provider";
  message: string;
  read?: boolean;
}) {
  const messageData = {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: message.sender_id,
    receiver_id: message.receiver_id,
    sender_type: message.sender_type,
    message: message.message,
    read: message.read ?? false,
  };

  let data: any = null;
  try {
    const res = await supabase
      .from("messages")
      .upsert(messageData, {
        onConflict: "id",
      })
      .select()
      .single();

    if (!res.error) {
      data = res.data;
    } else {
      console.warn("Supabase message save notice:", res.error.message);
    }
  } catch (err) {
    console.warn("Supabase message save notice:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterMessages") || "[]"
      );
      if (Array.isArray(local)) {
        const index = local.findIndex((m: any) => m.id === message.id);
        if (index >= 0) {
          local[index] = { ...local[index], ...messageData };
        } else {
          local.push(messageData);
        }
        localStorage.setItem("masterMessages", JSON.stringify(local));
      }
    } catch {
      // Ignore
    }
  }

  return data || messageData;
}

/* =========================================================
   REVIEWS
========================================================= */
export async function getReviews() {
  let list: any[] = [];
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      list = data;
    } else if (error) {
      console.warn("Supabase reviews load notice:", error.message);
    }
  } catch (err) {
    console.warn("Error loading reviews from Supabase:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterReviews") || "[]"
      );
      if (Array.isArray(local)) {
        local.forEach((lr: any) => {
          const already = list.some((r: any) => r.id === lr.id);
          if (!already) {
            list.push({
              id: lr.id,
              booking_id: lr.bookingId || lr.booking_id,
              customer_id: lr.customerId || lr.customer_id,
              provider_id: lr.providerId || lr.provider_id,
              rating: lr.rating,
              comment: lr.comment,
              created_at: lr.createdAt || lr.created_at || new Date().toISOString(),
            });
          }
        });
      }
    } catch {
      // Ignore
    }
  }

  return list;
}

export async function saveReview(review: {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  comment?: string;
  status?: string;
}) {
  const reviewData = {
    id: review.id,
    booking_id: review.booking_id,
    customer_id: review.customer_id,
    provider_id: review.provider_id,
    rating: Number(review.rating),
    comment: review.comment?.trim() || null,
    status: review.status || "Published",
  };

  let data: any = null;
  try {
    const res = await supabase
      .from("reviews")
      .insert(reviewData)
      .select("*")
      .single();

    if (!res.error) {
      data = res.data;
    } else {
      console.warn("Supabase review save notice:", res.error.message);
    }
  } catch (err) {
    console.warn("Supabase review save notice:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterReviews") || "[]"
      );
      const localReview = {
        id: review.id,
        bookingId: review.booking_id,
        customerId: review.customer_id,
        providerId: review.provider_id,
        rating: Number(review.rating),
        comment: review.comment?.trim() || "",
        createdAt: new Date().toISOString(),
      };
      if (Array.isArray(local)) {
        local.unshift(localReview);
        localStorage.setItem("masterReviews", JSON.stringify(local));
      }
    } catch {
      // Ignore
    }
  }

  return data || reviewData;
}

/* =========================================================
   NOTIFICATIONS
========================================================= */
export async function getNotifications(userId: string) {
  let list: any[] = [];
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      list = data;
    } else if (error) {
      console.warn("Supabase notifications load notice:", error.message);
    }
  } catch (err) {
    console.warn("Error loading notifications from Supabase:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterNotifications") || "[]"
      );
      if (Array.isArray(local)) {
        local.forEach((ln: any) => {
          if (ln.user_id === userId) {
            const already = list.some((n: any) => n.id === ln.id);
            if (!already) {
              list.push(ln);
            }
          }
        });
      }
    } catch {
      // Ignore
    }
  }

  return list;
}

export async function saveNotification(notification: {
  id: string;
  user_id: string;
  user_type: string;
  title: string;
  message: string;
  link?: string;
  read?: boolean;
}) {
  const notificationData = {
    id: notification.id,
    user_id: notification.user_id,
    user_type: notification.user_type,
    title: notification.title,
    message: notification.message,
    link: notification.link || null,
    read: notification.read ?? false,
  };

  let data: any = null;
  try {
    const res = await supabase
      .from("notifications")
      .upsert(notificationData, {
        onConflict: "id",
      })
      .select()
      .single();

    if (!res.error) {
      data = res.data;
    } else {
      console.warn("Supabase notification save notice:", res.error.message);
    }
  } catch (err) {
    console.warn("Supabase notification save notice:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(
        localStorage.getItem("masterNotifications") || "[]"
      );
      if (Array.isArray(local)) {
        local.unshift(notificationData);
        localStorage.setItem("masterNotifications", JSON.stringify(local));
      }
    } catch {
      // Ignore
    }
  }

  return data || notificationData;
}