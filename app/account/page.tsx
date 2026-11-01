"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
normalizeMobile,
} from "@/lib/auth";
type Customer = {
  id: string;
  name?: string;
  mobile?: string;
  email?: string;
  city?: string;
  address?: string;
  accountStatus?: string;
};
export default function AccountPage() {
  const [customer, setCustomer] =
    useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] =
    useState(false);
  const [deleting, setDeleting] =
    useState(false);
  const [deleteError, setDeleteError] =
    useState("");
  useEffect(() => {
    void loadAccount();
    function handleAccountUpdate() {
      void loadAccount();
    }
    window.addEventListener(
      "master-customer-updated",
      handleAccountUpdate
    );
    window.addEventListener(
      "master-auth-updated",
      handleAccountUpdate
    );
    return () => {
      window.removeEventListener(
        "master-customer-updated",
        handleAccountUpdate
      );
      window.removeEventListener(
        "master-auth-updated",
        handleAccountUpdate
      );
    };
  }, []);
  /*
   * =========================================================
   * LOAD CUSTOMER ACCOUNT
   * =========================================================
   */
  async function loadAccount() {
    try {
      setLoading(true);
      /*
       * -------------------------------------------------------
       * OTP SESSION
       * -------------------------------------------------------
       */
      const verifiedMobile = localStorage.getItem("masterVerifiedMobile") || "";
/*
       * -------------------------------------------------------
       * CUSTOMER LOCAL SESSION
       * -------------------------------------------------------
       *
       * Customer authentication is handled by the
       * Master App local/demo OTP session.
       */
      const savedCustomer = localStorage.getItem("masterUser");
      const activeRole = localStorage.getItem("masterActiveRole");
      const localOtpVerified =
        localStorage.getItem("masterOtpVerified") === "true";
      if (
        !savedCustomer ||
        activeRole !== "customer" ||
        !localOtpVerified
      ) {
        setCustomer(null);
        return;
      }
      const user: { id?: string } | null = null;
/*
       * -------------------------------------------------------
       * FIND CUSTOMER
       * -------------------------------------------------------
       */
      let customerData: any = null;
      /*
       * IMPORTANT:
       * Edit Profile updates the active customer session in
       * localStorage. Read that first so the Account page shows
       * the latest edited details immediately.
       */
      if (savedCustomer) {
        try {
          customerData = JSON.parse(savedCustomer);
        } catch {
          customerData = null;
        }
      }
      /*
       * First database preference:
       * Customer ID.
       *
       * Only use it when the current local customer session
       * was not available.
       */
      /*
       * Second preference:
       * Verified mobile
       */
      if (
        !customerData &&
        verifiedMobile
      ) {
        const normalizedMobile =
          normalizeMobile(
            verifiedMobile
          );
        /*
         * New +91 format
         */
        const { data, error } =
          await supabase
            .from("customers")
            .select("*")
            .eq(
              "mobile",
              normalizedMobile
            )
            .maybeSingle();
        if (error) {
          console.error(
            "Customer mobile lookup error:",
            error
          );
        }
        customerData = data;
        /*
         * Old 10-digit format
         */
        if (!customerData) {
          const tenDigit =
            normalizedMobile.replace(
              "+91",
              ""
            );
          const {
            data: oldData,
            error: oldError,
          } = await supabase
            .from("customers")
            .select("*")
            .eq(
              "mobile",
              tenDigit
            )
            .maybeSingle();
          if (oldError) {
            console.error(
              "Old customer mobile lookup error:",
              oldError
            );
          }
          customerData = oldData;
        }
      }
      /*
       * -------------------------------------------------------
       * LOCAL STORAGE FALLBACK
       * -------------------------------------------------------
       *
       * Keep this fallback for older sessions.
       */
      if (!customerData) {
        const fallbackCustomer =
          localStorage.getItem("masterUser");
        if (fallbackCustomer) {
          try {
            customerData = JSON.parse(fallbackCustomer);
          } catch {
            customerData = null;
          }
        }
      }
      /*
       * -------------------------------------------------------
       * NO CUSTOMER
       * -------------------------------------------------------
       */
      if (!customerData) {
        setCustomer(null);
        return;
      }
      /*
       * -------------------------------------------------------
       * NORMALIZE CUSTOMER
       * -------------------------------------------------------
       */
      const normalizedCustomer: Customer =
        {
          id:
            customerData.id ||
            verifiedMobile ||
            "",
          name:
            customerData.name ||
            "",
          mobile:
            customerData.mobile ||
            verifiedMobile ||
            "",
          email:
            customerData.email ||
            "",
          city:
            customerData.city ||
            "",
          address:
            customerData.address ||
            "",
          accountStatus:
            customerData.account_status ||
            customerData.accountStatus ||
            "Active",
        };
      /*
       * -------------------------------------------------------
       * BLOCKED CUSTOMER
       * -------------------------------------------------------
       */
      if (
        normalizedCustomer.accountStatus?.toLowerCase() ===
        "blocked"
      ) {
        localStorage.removeItem(
          "masterOtpVerified"
        );
        localStorage.removeItem(
          "masterVerifiedMobile"
        );
        localStorage.removeItem(
          "masterUser"
        );
        localStorage.removeItem(
          "masterActiveRole"
        );
        setCustomer(null);
        return;
      }
      /*
       * -------------------------------------------------------
       * SAVE CUSTOMER SESSION
       * -------------------------------------------------------
       */
      setCustomer(
        normalizedCustomer
      );
      localStorage.setItem(
        "masterUser",
        JSON.stringify(
          normalizedCustomer
        )
      );
      /*
       * IMPORTANT:
       * Account page is always Customer mode.
       */
      localStorage.setItem(
        "masterActiveRole",
        "customer"
      );
    } catch (error) {
      console.error(
        "Account loading error:",
        error
      );
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }
  /*
   * =========================================================
   * BECOME PROVIDER
   * =========================================================
   *
   * Customer account ko Provider account me convert nahi
   * karna hai.
   *
   * Provider registration ek separate system hai.
   */
  function handleBecomeProvider() {
    localStorage.setItem(
      "masterActiveRole",
      "customer"
    );
    window.location.href =
      "/provider/register";
  }
  /*
   * =========================================================
   * CUSTOMER LOGOUT
   * =========================================================
   */
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
localStorage.removeItem(
      "masterUser"
    );
    localStorage.removeItem(
      "masterOtpVerified"
    );
    localStorage.removeItem(
      "masterVerifiedMobile"
    );
    localStorage.removeItem(
      "masterActiveRole"
    );
    window.dispatchEvent(
      new Event("master-auth-updated")
    );
    window.location.href =
      "/login";
  }
  /*
   * =========================================================
   * DELETE CUSTOMER ACCOUNT
   * =========================================================
   *
   * VERY IMPORTANT:
   *
   * Provider account is completely separate.
   *
   * Therefore deleting Customer account:
   *
   * ❌ does NOT delete provider
   * ❌ does NOT search providers
   * ❌ does NOT delete providers
   *
   * Only Customer profile is deleted.
   */
  async function handleDeleteAccount() {
    if (!customer) {
      return;
    }
    try {
      setDeleting(true);
      setDeleteError("");
      const accountId =
        customer.id;
      /*
       * -------------------------------------------------------
       * DELETE ONLY CUSTOMER PROFILE
       * -------------------------------------------------------
       */
      try {
        const { error: customerDeleteError } = await supabase
          .from("customers")
          .delete()
          .eq("id", accountId);
        if (customerDeleteError) {
          console.warn("Customer database deletion note:", customerDeleteError);
        }
      } catch (delErr) {
        console.warn("Supabase delete request exception:", delErr);
      }
      try {
        await supabase.auth.signOut();
      } catch (_) {
      }
      /*
       * -------------------------------------------------------
       * REMOVE CUSTOMER LOCAL SESSION
       * -------------------------------------------------------
       */
      localStorage.removeItem(
        "masterUser"
      );
      localStorage.removeItem(
        "masterOtpVerified"
      );
      localStorage.removeItem(
        "masterVerifiedMobile"
      );
      localStorage.removeItem(
        "masterActiveRole"
      );
      /*
       * -------------------------------------------------------
       * CLEAR CUSTOMER OTP SESSION
       * -------------------------------------------------------
       */
      sessionStorage.removeItem(
        "masterOtp"
      );
      sessionStorage.removeItem(
        "masterOtpMobile"
      );
      sessionStorage.removeItem(
        "masterOtpCreatedAt"
      );
/*
       * -------------------------------------------------------
       * EVENTS
       * -------------------------------------------------------
       */
      window.dispatchEvent(
        new Event(
          "master-auth-updated"
        )
      );
      window.dispatchEvent(
        new Event(
          "master-customer-updated"
        )
      );
      /*
       * -------------------------------------------------------
       * REDIRECT
       * -------------------------------------------------------
       */
      window.location.href =
        "/login";
    } catch (error: any) {
      console.error(
        "Customer account deletion error:",
        error
      );
      setDeleteError(
        error?.message ||
          "Customer account delete nahi ho paya. Please try again."
      );
      setDeleting(false);
    }
  }
  /*
   * =========================================================
   * LOADING
   * =========================================================
   */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-7 text-center shadow-sm">
          <div className="mb-3 text-3xl">
            ⏳
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Loading your account...
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Please wait a moment.
          </p>
        </div>
      </main>
    );
  }
  /*
   * =========================================================
   * NOT LOGGED IN
   * =========================================================
   */
  if (!customer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-4xl">
            🔐
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Please Login
          </h1>
          <p className="mt-2 text-slate-500">
            You need to login to view your
            Customer account.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }
  /*
   * =========================================================
   * CUSTOMER ACCOUNT
   * =========================================================
   */
  return (
    <main className="min-h-screen bg-slate-50">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                CUSTOMER ACCOUNT
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                Welcome,{" "}
                {customer.name ||
                  "Customer"}
              </h1>
              <p className="mt-1 text-slate-500">
                Manage your Master App
                customer account and
                services.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/account/edit"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Edit Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* ===================================================
            CUSTOMER PROFILE
        =================================================== */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl">
              👤
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Customer Profile
              </h2>
              <p className="text-sm text-slate-500">
                Your personal information
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* NAME */}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Name
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {customer.name ||
                  "Not provided"}
              </p>
            </div>
            {/* MOBILE */}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Mobile
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {customer.mobile ||
                  "Not provided"}
              </p>
            </div>
            {/* EMAIL */}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Email
              </p>
              <p className="mt-1 break-all font-medium text-slate-900">
                {customer.email ||
                  "Not provided"}
              </p>
            </div>
            {/* CITY */}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                City
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {customer.city ||
                  "Not provided"}
              </p>
            </div>
            {/* ADDRESS */}
            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Address
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {customer.address ||
                  "Not provided"}
              </p>
            </div>
            {/* ACCOUNT STATUS */}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Account Status
              </p>
              <span className="mt-2 inline-flex rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                {customer.accountStatus ||
                  "Active"}
              </span>
            </div>
            {/* CUSTOMER ID */}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Customer ID
              </p>
              <p className="mt-1 break-all font-medium text-slate-900">
                {customer.id ||
                  "Not available"}
              </p>
            </div>
          </div>
        </section>
        {/* ===================================================
            BECOME SERVICE PROVIDER
        =================================================== */}
        <section className="mt-8">
          <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white shadow-lg md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
                  🛠️ Service Provider
                </div>
                <h2 className="mt-3 text-2xl font-bold md:text-3xl">
                  Have a skill or service?
                </h2>
                <p className="mt-2 text-orange-50">
                  Want to earn by providing
                  services to Master App
                  customers? Register as a
                  Service Provider separately.
                </p>
              </div>
              <button
                type="button"
                onClick={
                  handleBecomeProvider
                }
                className="shrink-0 rounded-xl bg-white px-6 py-3.5 font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
              >
                Register as Provider →
              </button>
            </div>
          </div>
        </section>
        {/* ===================================================
            IMPORTANT ACCOUNT SEPARATION
        =================================================== */}
        <section className="mt-5">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex gap-4">
              <div className="text-2xl">
                ℹ️
              </div>
              <div>
                <h3 className="font-bold text-blue-900">
                  Customer & Provider are separate
                  accounts
                </h3>
                <p className="mt-2 text-sm leading-6 text-blue-800">
                  Your Customer account is used
                  for booking services. If you also
                  want to provide services, register
                  separately as a Provider.
                </p>
                <p className="mt-2 text-sm font-semibold text-blue-800">
                  The same mobile number can be
                  used for both Customer and
                  Provider accounts.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* ===================================================
            QUICK LINKS
        =================================================== */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/bookings"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md"
          >
            <div className="text-2xl">
              📅
            </div>
            <h3 className="mt-3 font-bold text-slate-900">
              My Bookings
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              View your service bookings.
            </p>
          </Link>
          <Link
            href="/messages"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md"
          >
            <div className="text-2xl">
              💬
            </div>
            <h3 className="mt-3 font-bold text-slate-900">
              Messages
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Chat with service providers.
            </p>
          </Link>
          <Link
            href="/services"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md"
          >
            <div className="text-2xl">
              🔎
            </div>
            <h3 className="mt-3 font-bold text-slate-900">
              Find Services
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Find providers near you.
            </p>
          </Link>
          <Link
            href="/account/edit"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md"
          >
            <div className="text-2xl">
              ⚙️
            </div>
            <h3 className="mt-3 font-bold text-slate-900">
              Edit Account
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Update your account details.
            </p>
          </Link>
        </section>
        {/* ===================================================
            PROVIDER LOGIN
        =================================================== */}
        <section className="mt-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Already a Service Provider?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Provider accounts have a separate
                  login and dashboard.
                </p>
              </div>
              <Link
                href="/provider/login"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-bold text-white hover:bg-slate-800"
              >
                Provider Login →
              </Link>
            </div>
          </div>
        </section>
        {/* ===================================================
            DELETE ACCOUNT
        =================================================== */}
        <section className="mt-8">
          <div className="rounded-2xl border border-red-200 bg-white p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-red-700">
                  Delete Customer Account
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Permanently delete your Customer
                  account and Customer profile.
                  Your separate Provider account,
                  if any, will not be affected.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteError("");
                  setShowDeleteModal(
                    true
                  );
                }}
                className="shrink-0 rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
              >
                Delete Customer Account
              </button>
            </div>
          </div>
        </section>
      </div>
      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ===================================================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
                ⚠️
              </div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">
                Delete Customer Account?
              </h2>
              <p className="mt-3 leading-6 text-slate-600">
                This action cannot be undone.
              </p>
              <p className="mt-2 text-sm font-medium text-red-600">
                Only your Customer account will
                be deleted.
              </p>
              <p className="mt-2 text-sm font-medium text-green-700">
                Your separate Provider account,
                if any, will remain unaffected.
              </p>
            </div>
            {deleteError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!deleting) {
                    setShowDeleteModal(
                      false
                    );
                    setDeleteError("");
                  }
                }}
                disabled={deleting}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={
                  handleDeleteAccount
                }
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting
                  ? "Deleting..."
                  : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}