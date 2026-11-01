"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  WrenchIcon,
  ClipboardListIcon,
  MessageSquareIcon,
  UserIcon,
  HeadphonesIcon,
  LogOutIcon,
} from "./Icons";

type Customer = {
  id?: string;
  name?: string;
};

export default function CustomerSidebar() {
  const pathname = usePathname();
  const [customer, setCustomer] = useState<Customer | null>(null);
  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem("masterUser");
        setCustomer(saved ? JSON.parse(saved) : null);
      } catch {
        setCustomer(null);
      }
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener("master-auth-updated", load);
    window.addEventListener("master-customer-updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("master-auth-updated", load);
      window.removeEventListener("master-customer-updated", load);
    };
  }, []);
  const isLoginPage =
    pathname === "/login" || pathname === "/login/register";
  if (!customer || isLoginPage || pathname.startsWith("/provider") || pathname.startsWith("/admin")) {
    return null;
  }
  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);
  const linkClass = (path: string) =>
    `flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
      isActive(path)
        ? "bg-blue-50 text-blue-700 shadow-2xs"
        : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
    }`;
  const logout = () => {
    localStorage.removeItem("masterUser");
    localStorage.removeItem("masterUserMobile");
    localStorage.removeItem("masterOtpVerified");
    localStorage.removeItem("masterActiveRole");
    window.dispatchEvent(new Event("master-auth-updated"));
    window.location.href = "/";
  };
  return (
    <>
      <aside className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-64px)] w-64 border-r border-slate-200/80 bg-white lg:block">
        <div className="flex h-full flex-col p-4">
          <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Account</p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-slate-900">
              {customer.name || "My Account"}
            </p>
          </div>
          <nav className="space-y-1">
            <Link href="/services" className={linkClass("/services")}>
              <WrenchIcon className="w-4 h-4 text-slate-500" />
              <span>Services</span>
            </Link>
            <Link href="/bookings" className={linkClass("/bookings")}>
              <ClipboardListIcon className="w-4 h-4 text-slate-500" />
              <span>My Bookings</span>
            </Link>
            <Link href="/messages" className={linkClass("/messages")}>
              <MessageSquareIcon className="w-4 h-4 text-slate-500" />
              <span>Messages</span>
            </Link>
            <Link href="/account" className={linkClass("/account")}>
              <UserIcon className="w-4 h-4 text-slate-500" />
              <span>My Profile</span>
            </Link>
          </nav>
          <div className="mt-auto">
            <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <HeadphonesIcon className="w-5 h-5 text-blue-600" />
              <p className="mt-1.5 text-xs font-bold text-slate-900">Need Help?</p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                Contact Master App support.
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOutIcon className="w-4 h-4 text-rose-500" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="border-b border-slate-200 bg-white p-1.5 lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          <Link href="/services" className={linkClass("/services") + " flex-col justify-center text-center py-2"}>
            <WrenchIcon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
            <div className="text-[10px]">Services</div>
          </Link>
          <Link href="/bookings" className={linkClass("/bookings") + " flex-col justify-center text-center py-2"}>
            <ClipboardListIcon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
            <div className="text-[10px]">Bookings</div>
          </Link>
          <Link href="/messages" className={linkClass("/messages") + " flex-col justify-center text-center py-2"}>
            <MessageSquareIcon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
            <div className="text-[10px]">Messages</div>
          </Link>
          <Link href="/account" className={linkClass("/account") + " flex-col justify-center text-center py-2"}>
            <UserIcon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
            <div className="text-[10px]">Profile</div>
          </Link>
        </div>
      </div>
    </>
  );
}
