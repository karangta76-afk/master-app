/**
 * Master App - Common Back Button
 *
 * Back button is hidden on the Home page (/).
 * It is shown on inner pages.
 */
"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [hasSidebar, setHasSidebar] = useState(false);
  useEffect(() => {
    // Home page is the entry page, so there is no Back button here.
    setVisible(pathname !== "/");
    const checkSidebar = () => {
      const customer =
        localStorage.getItem("masterUser");
      const admin =
        localStorage.getItem("masterAdminLoggedIn") === "true";
      const activeRole =
        localStorage.getItem("masterActiveRole");
      const customerPages =
        pathname === "/account" ||
        pathname.startsWith("/account/") ||
        pathname === "/bookings" ||
        pathname.startsWith("/bookings/") ||
        pathname === "/messages" ||
        pathname.startsWith("/messages/") ||
        pathname === "/services" ||
        pathname.startsWith("/services/");
      const customerLoggedIn =
        !!customer &&
        activeRole !== "provider" &&
        activeRole !== "admin";
      const adminPage =
        pathname.startsWith("/admin") &&
        pathname !== "/admin/login";
      const providerSidebarPages =
        pathname === "/provider/dashboard" ||
        pathname === "/provider/bookings" ||
        pathname === "/provider/messages" ||
        pathname === "/provider/reviews" ||
        pathname === "/provider/earnings" ||
        pathname === "/provider/account/edit" ||
        pathname === "/provider/support";
      setHasSidebar(
        (customerLoggedIn && customerPages) ||
          (admin && adminPage) ||
          providerSidebarPages
      );
    };
    checkSidebar();
    window.addEventListener("storage", checkSidebar);
    window.addEventListener(
      "master-auth-updated",
      checkSidebar
    );
    window.addEventListener(
      "master-customer-updated",
      checkSidebar
    );
    window.addEventListener(
      "master-provider-updated",
      checkSidebar
    );
    return () => {
      window.removeEventListener("storage", checkSidebar);
      window.removeEventListener(
        "master-auth-updated",
        checkSidebar
      );
      window.removeEventListener(
        "master-customer-updated",
        checkSidebar
      );
      window.removeEventListener(
        "master-provider-updated",
        checkSidebar
      );
    };
  }, [pathname]);
  if (!visible) {
    return null;
  }
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };
  return (
    <div
      className={`relative z-30 border-b border-gray-200 bg-white ${
        hasSidebar ? "lg:pl-64" : ""
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center px-4 py-2 sm:px-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98]"
        >
          <span className="text-lg leading-none">←</span>
          Back
        </button>
      </div>
    </div>
  );
}