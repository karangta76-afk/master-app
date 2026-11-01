"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import CustomerSidebar from "./CustomerSidebar";
import AdminSidebar from "./AdminSidebar";
export default function RoleShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCustomer, setIsCustomer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const checkRole = () => {
      const customer = localStorage.getItem("masterUser");
      const admin = localStorage.getItem("masterAdminLoggedIn");
      const activeRole = localStorage.getItem("masterActiveRole");
      // Homepage "/" intentionally has NO customer sidebar.
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
      const adminLoggedIn = admin === "true";
      setIsCustomer(customerLoggedIn && customerPages);
      setIsAdmin(adminLoggedIn && adminPage);
    };
    checkRole();
    window.addEventListener("storage", checkRole);
    window.addEventListener("master-auth-updated", checkRole);
    window.addEventListener("master-customer-updated", checkRole);
    return () => {
      window.removeEventListener("storage", checkRole);
      window.removeEventListener("master-auth-updated", checkRole);
      window.removeEventListener("master-customer-updated", checkRole);
    };
  }, [pathname]);
  const showSidebar = isCustomer || isAdmin;
  return (
    <>
      {isCustomer && <CustomerSidebar />}
      {isAdmin && <AdminSidebar />}
      <main
        className={
          showSidebar
            ? "flex-1 min-w-0 lg:pl-64"
            : "flex-1 min-w-0"
        }
      >
        {children}
      </main>
    </>
  );
}
