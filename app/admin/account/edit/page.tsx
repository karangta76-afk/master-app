"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type Admin = {
  id: string;
  name: string;
  email: string;
  role: string;
  mobile?: string;
};
export default function AdminAccountEditPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveButtonSuccess, setSaveButtonSuccess] = useState(false);
  const [originalEmail, setOriginalEmail] = useState("");
  const [originalMobile, setOriginalMobile] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [mobileVerified, setMobileVerified] = useState(true);
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtpLoading, setMobileOtpLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    const loadAdminProfile = () => {
      const loggedIn =
        window.localStorage.getItem("masterAdminLoggedIn");
      const savedAdmin =
        window.localStorage.getItem("masterAdmin");
      if (loggedIn !== "true" || !savedAdmin) {
        if (mounted) {
          router.replace("/admin/login");
        }
        return;
      }
      try {
        const saved = JSON.parse(savedAdmin);
        const authenticatedEmail =
          saved?.email?.trim().toLowerCase() || "";
        if (
          authenticatedEmail !== "admin@masterapp.com" ||
          saved?.role !== "admin"
        ) {
          window.localStorage.removeItem(
            "masterAdminLoggedIn"
          );
          window.localStorage.removeItem("masterAdmin");
          if (mounted) {
            router.replace("/admin/login");
          }
          return;
        }
        const metadataMobile = String(saved.mobile || "")
          .replace(/\D/g, "")
          .slice(0, 10);
        const currentAdmin: Admin = {
          id: String(saved.id || "admin"),
          name: String(saved.name || "Admin"),
          email: "admin@masterapp.com",
          role: "admin",
          mobile: metadataMobile,
        };
        if (!mounted) return;
        setAdmin(currentAdmin);
        setName(currentAdmin.name);
        setEmail(currentAdmin.email);
        setMobile(currentAdmin.mobile || "");
        setOriginalEmail(currentAdmin.email);
        setOriginalMobile(currentAdmin.mobile || "");
        setEmailVerified(true);
        setMobileVerified(true);
      } catch (error) {
        console.error(
          "ADMIN ACCOUNT LOCAL AUTH ERROR:",
          error
        );
        window.localStorage.removeItem(
          "masterAdminLoggedIn"
        );
        window.localStorage.removeItem("masterAdmin");
        if (mounted) {
          router.replace("/admin/login");
        }
      }
    };
    loadAdminProfile();
    const handleAuthUpdate = () => {
      loadAdminProfile();
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
      mounted = false;
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
  const handleMobileChange = (value: string) => {
    const cleanValue = value
      .replace(/\D/g, "")
      .slice(0, 10);
    setMobile(cleanValue);
    setError("");
    setSuccess("");
    if (cleanValue === originalMobile) {
      setMobileVerified(true);
      setMobileOtpSent(false);
      setMobileOtp("");
    } else {
      setMobileVerified(false);
      setMobileOtpSent(false);
      setMobileOtp("");
    }
  };
  const sendMobileOtp = () => {
    const cleanMobile = mobile.trim();
    setError("");
    setSuccess("");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError(
        "Please enter a valid 10-digit Indian mobile number first."
      );
      return;
    }
    setMobileOtpLoading(true);
    window.setTimeout(() => {
      setMobileOtp("");
      setMobileOtpSent(true);
      setMobileVerified(false);
      setSuccess(
        "Demo OTP sent. Use OTP 123456."
      );
      setMobileOtpLoading(false);
    }, 300);
  };
  const verifyMobileOtp = () => {
    const cleanOtp = mobileOtp
      .replace(/\D/g, "")
      .slice(0, 6);
    const cleanMobile = mobile.trim();
    setError("");
    setSuccess("");
    if (!mobileOtpSent) {
      setError(
        "Please send OTP to the new mobile number first."
      );
      return;
    }
    if (cleanOtp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }
    if (cleanOtp !== "123456") {
      setMobileVerified(false);
      setError("Invalid OTP. Use demo OTP 123456.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }
    setMobileOtpLoading(true);
    window.setTimeout(() => {
      setMobileVerified(true);
      setMobileOtpSent(false);
      setMobileOtp("");
      setOriginalMobile(cleanMobile);
      setSuccess(
        "New mobile number verified successfully."
      );
      setMobileOtpLoading(false);
    }, 300);
  };
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const loggedIn =
      window.localStorage.getItem(
        "masterAdminLoggedIn"
      );
    const savedAdmin =
      window.localStorage.getItem("masterAdmin");
    if (loggedIn !== "true" || !savedAdmin) {
      router.replace("/admin/login");
      return;
    }
    let savedProfile: Admin;
    try {
      savedProfile = JSON.parse(savedAdmin);
    } catch {
      window.localStorage.removeItem(
        "masterAdminLoggedIn"
      );
      window.localStorage.removeItem("masterAdmin");
      router.replace("/admin/login");
      return;
    }
    if (
      savedProfile?.email
        ?.trim()
        .toLowerCase() !== "admin@masterapp.com" ||
      savedProfile?.role !== "admin"
    ) {
      window.localStorage.removeItem(
        "masterAdminLoggedIn"
      );
      window.localStorage.removeItem("masterAdmin");
      router.replace("/admin/login");
      return;
    }
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile
      .replace(/\D/g, "")
      .slice(0, 10);
    if (!cleanName) {
      setError("Please enter admin name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (cleanEmail !== originalEmail) {
      setError(
        "Admin login email cannot be changed."
      );
      return;
    }
    if (
      cleanMobile &&
      !/^[6-9]\d{9}$/.test(cleanMobile)
    ) {
      setError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }
    if (
      cleanMobile !== originalMobile &&
      !mobileVerified
    ) {
      setError(
        "Please verify the new mobile number with OTP before saving."
      );
      return;
    }
    if (
      newPassword &&
      newPassword.length < 6
    ) {
      setError(
        "New password must contain at least 6 characters."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(
        "New password and confirm password do not match."
      );
      return;
    }
    setSaving(true);
    try {
      const updatedAdmin: Admin = {
        id: String(
          savedProfile.id || "admin"
        ),
        name: cleanName,
        email: "admin@masterapp.com",
        role: "admin",
        mobile: cleanMobile,
      };
      /*
       * Save admin profile in localStorage.
       */
      window.localStorage.setItem(
        "masterAdmin",
        JSON.stringify(updatedAdmin)
      );
      window.localStorage.setItem(
        "masterAdminLoggedIn",
        "true"
      );
      /*
       * Demo password storage.
       * This is only for testing.
       */
      if (newPassword) {
        window.localStorage.setItem(
          "masterAdminPassword",
          newPassword
        );
      }
      window.localStorage.removeItem(
        "masterAdminCredentials"
      );
      setAdmin(updatedAdmin);
      setName(updatedAdmin.name);
      setEmail(updatedAdmin.email);
      setMobile(updatedAdmin.mobile || "");
      setOriginalEmail(updatedAdmin.email);
      setOriginalMobile(
        updatedAdmin.mobile || ""
      );
      setEmailVerified(true);
      setMobileVerified(true);
      setMobileOtpSent(false);
      setMobileOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(
        newPassword
          ? "Admin profile and password updated successfully."
          : "Admin profile updated successfully."
      );
      setSaveButtonSuccess(true);
      window.dispatchEvent(
        new Event("master-auth-updated")
      );
      window.setTimeout(() => {
        setSaveButtonSuccess(false);
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 1000);
    } catch (saveError) {
      console.error(
        "ADMIN ACCOUNT SAVE ERROR:",
        saveError
      );
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Something went wrong while saving your admin profile."
      );
    } finally {
      setSaving(false);
    }
  };
  if (!admin) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="text-3xl mb-2">
            ⏳
          </div>
          <h1 className="text-lg font-bold text-gray-900">
            Loading admin profile...
          </h1>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-gray-100 px-3 py-5 sm:px-5">
      <div className="mx-auto max-w-3xl">
        {/* HEADER */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() =>
              router.push("/admin/dashboard")
            }
            className="text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Account
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your admin profile and login credentials
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-xl">
              🛡️
            </div>
          </div>
        </div>
        {/* SUCCESS */}
        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            <div className="text-sm font-bold">
              ✓ Profile Updated
            </div>
            <div className="mt-0.5 text-xs">
              {success}
            </div>
          </div>
        )}
        {/* ERROR */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            ❌ {error}
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* PERSONAL DETAILS */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">
                👤
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Personal Details
                </h2>
                <p className="text-xs text-gray-500">
                  Update your admin profile information
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* NAME */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Admin Name
                </label>
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter admin name"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                />
              </div>
              {/* MOBILE */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Mobile Number
                </label>
                <input
                  value={mobile}
                  onChange={(e) =>
                    handleMobileChange(
                      e.target.value
                    )
                  }
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                />
                {mobile === originalMobile ? (
                  <p className="mt-1 text-xs font-semibold text-green-600">
                    ✓ Verified
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    <button
                      type="button"
                      onClick={sendMobileOtp}
                      disabled={mobileOtpLoading}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {mobileOtpLoading
                        ? "Sending..."
                        : "Send Mobile OTP"}
                    </button>
                    {mobileOtpSent && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="mb-2 text-xs font-semibold text-blue-700">
                          Demo OTP: 123456
                        </p>
                        <div className="flex gap-2">
                          <input
                            value={mobileOtp}
                            onChange={(e) =>
                              setMobileOtp(
                                e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6)
                              )
                            }
                            maxLength={6}
                            inputMode="numeric"
                            placeholder="Enter 6-digit OTP"
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={
                              verifyMobileOtp
                            }
                            disabled={
                              mobileOtpLoading
                            }
                            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {mobileOtpLoading
                              ? "Verifying..."
                              : "Verify"}
                          </button>
                        </div>
                      </div>
                    )}
                    {mobileVerified && (
                      <p className="text-xs font-semibold text-green-600">
                        ✓ New mobile number verified
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* EMAIL */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  aria-readonly="true"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none"
                />
                <p className="mt-1 text-xs font-semibold text-green-600">
                  ✓ Verified Admin Email
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Admin login email is fixed to
                  admin@masterapp.com.
                </p>
              </div>
            </div>
          </section>
          {/* PASSWORD */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">
                🔐
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Change Password
                </h2>
                <p className="text-xs text-gray-500">
                  Leave blank if you do not want to change the password
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter new password"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                />
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-xs font-semibold text-yellow-800">
                ⚠️ Demo Mode
              </p>
              <p className="mt-1 text-[11px] text-yellow-700">
                Password changes are stored locally for testing.
                Production password security will be connected later.
              </p>
            </div>
          </section>
          {/* ACCOUNT INFO */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">
                ℹ️
              </span>
              <h2 className="text-base font-bold text-gray-900">
                Account Information
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] text-gray-500">
                  Admin ID
                </p>
                <p className="mt-1 break-all text-sm font-bold text-gray-900">
                  {admin.id}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] text-gray-500">
                  Role
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900">
                  {admin.role}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-[11px] text-gray-500">
                  Status
                </p>
                <p className="mt-1 text-sm font-bold text-green-600">
                  ● Active
                </p>
              </div>
            </div>
          </section>
          {/* BUTTONS */}
          <div className="flex flex-col-reverse gap-2 pb-5 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/dashboard"
                )
              }
              className="sm:w-36 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving Changes..."
                : saveButtonSuccess
                  ? "Saved Successfully"
                  : "✓ Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}