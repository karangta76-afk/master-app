"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  HomeIcon,
  BriefcaseIcon,
  UsersIcon,
  ClipboardListIcon,
  WrenchIcon,
  StarIcon,
  BotIcon,
  SettingsIcon,
  HeadphonesIcon,
  LogOutIcon,
} from "./Icons";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    const checkAdmin = () => {
      const isLoggedIn =
        window.localStorage.getItem("masterAdminLoggedIn") === "true";
      const savedAdmin = window.localStorage.getItem("masterAdmin");
      if (!isLoggedIn || !savedAdmin) {
        setLoggedIn(false);
        return;
      }
      try {
        const admin = JSON.parse(savedAdmin);
        const validAdmin =
          admin?.email?.trim().toLowerCase() === "admin@masterapp.com" &&
          admin?.role === "admin";
        setLoggedIn(validAdmin);
      } catch {
        setLoggedIn(false);
      }
    };
    checkAdmin();
    window.addEventListener("storage", checkAdmin);
    window.addEventListener("master-auth-updated", checkAdmin);
    return () => {
      window.removeEventListener("storage", checkAdmin);
      window.removeEventListener("master-auth-updated", checkAdmin);
    };
  }, []);
  const isLoginPage = pathname === "/admin/login";
  if (!loggedIn || isLoginPage || !pathname.startsWith("/admin")) {
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
  const logout = async () => {
    await supabase.auth.signOut();
    window.localStorage.removeItem("masterAdminLoggedIn");
    window.localStorage.removeItem("masterAdmin");
    window.localStorage.removeItem("masterAdminCredentials");
    window.localStorage.removeItem("masterActiveRole");
    window.dispatchEvent(new Event("master-auth-updated"));
    router.replace("/admin/login");
  };
  return (
    <>
      <aside className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-64px)] w-64 border-r border-slate-200/80 bg-white lg:block">
        <div className="flex h-full flex-col p-4">
          <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Administration</p>
            <p className="mt-0.5 text-sm font-extrabold text-slate-900">
              Master App Admin
            </p>
          </div>
          <nav className="space-y-1">
            <Link
              href="/admin/dashboard"
              className={linkClass("/admin/dashboard")}
            >
              <HomeIcon className="w-4 h-4 text-slate-500" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/admin/providers"
              className={linkClass("/admin/providers")}
            >
              <BriefcaseIcon className="w-4 h-4 text-slate-500" />
              <span>Providers</span>
            </Link>
            <Link
              href="/admin/customers"
              className={linkClass("/admin/customers")}
            >
              <UsersIcon className="w-4 h-4 text-slate-500" />
              <span>Customers</span>
            </Link>
            <Link
              href="/admin/bookings"
              className={linkClass("/admin/bookings")}
            >
              <ClipboardListIcon className="w-4 h-4 text-slate-500" />
              <span>Bookings</span>
            </Link>
            <Link
              href="/admin/services"
              className={linkClass("/admin/services")}
            >
              <WrenchIcon className="w-4 h-4 text-slate-500" />
              <span>Services</span>
            </Link>
            <Link
              href="/admin/reviews"
              className={linkClass("/admin/reviews")}
            >
              <StarIcon className="w-4 h-4 text-slate-500" />
              <span>Reviews</span>
            </Link>
            <Link
              href="/admin/ai-assistant"
              className={linkClass("/admin/ai-assistant")}
            >
              <BotIcon className="w-4 h-4 text-slate-500" />
              <span>AI Assistant</span>
            </Link>
            <Link
              href="/admin/account/edit"
              className={linkClass("/admin/account/edit")}
            >
              <SettingsIcon className="w-4 h-4 text-slate-500" />
              <span>My Account</span>
            </Link>
          </nav>
          <div className="mt-auto">
            <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <HeadphonesIcon className="w-5 h-5 text-blue-600" />
              <p className="mt-1.5 text-xs font-bold text-slate-900">
                Admin Support
              </p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                Manage the Master App platform.
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
          <Link
            href="/admin/dashboard"
            className={
              linkClass("/admin/dashboard") + " flex-col justify-center text-center py-2"
            }
          >
            <HomeIcon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
            <div className="text-[10px]">Dashboard</div>
          </Link>
          <Link
            href="/admin/providers"
            className={
              linkClass("/admin/providers") + " flex-col justify-center text-center py-2"
            }
          >
            <BriefcaseIcon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
            <div className="text-[10px]">Providers</div>
          </Link>
          <Link
            href="/admin/customers"
            className={
              linkClass("/admin/customers") + " flex-col justify-center text-center py-2"
            }
          >
            <UsersIcon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
            <div className="text-[10px]">Customers</div>
          </Link>
          <Link
            href="/admin/bookings"
            className={
              linkClass("/admin/bookings") + " flex-col justify-center text-center py-2"
            }
          >
            <ClipboardListIcon className="w-4 h-4 mx-auto mb-1 text-slate-500" />
            <div className="text-[10px]">Bookings</div>
          </Link>
        </div>
      </div>
    </>
  );
}
