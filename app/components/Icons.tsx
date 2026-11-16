"use client";
import React from "react";
import {
  Zap,
  Wrench,
  Snowflake,
  Hammer,
  Paintbrush,
  PaintRoller,
  Sparkles,
  Plug,
  Scissors,
  Car,
  Stethoscope,
  GraduationCap,
  ChefHat,
  Bug,
  Droplets,
  Search,
  SearchX,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Star,
  Briefcase,
  IndianRupee,
  Calendar,
  CalendarCheck,
  Clock,
  MapPin,
  Phone,
  PhoneCall,
  SlidersHorizontal,
  Smartphone,
  Download,
  Menu,
  X,
  ArrowUpRight,
  ChevronRight,
  User,
  Users,
  MessageSquare,
  Camera,
  TrendingUp,
  Check,
  Home,
  Settings,
  LogOut,
  Bot,
  Headphones,
  ClipboardList,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Crosshair,
  Laptop,
  CheckCircle,
  List,
  LayoutGrid,
  Bell,
} from "lucide-react";

// =======================================================================
// CORE BRAND & GENERAL UI ICONS (POWERED BY LUCIDE)
// =======================================================================

export function SparklesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Sparkles className={className} strokeWidth={1.8} />;
}

export function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Search className={className} strokeWidth={2} />;
}

export function SearchXIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <SearchX className={className} strokeWidth={1.75} />;
}

export function LoaderIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} strokeWidth={2} />;
}

export function MapPinIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <MapPin className={className} strokeWidth={1.8} />;
}

export function ShieldCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <ShieldCheck className={className} strokeWidth={1.8} />;
}

export function BellIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Bell className={className} strokeWidth={1.8} />;
}

export function BoltIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Zap className={className} strokeWidth={1.8} />;
}

export function WrenchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Wrench className={className} strokeWidth={1.8} />;
}

export function SnowflakeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Snowflake className={className} strokeWidth={1.8} />;
}

export function PaintRollerIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <PaintRoller className={className} strokeWidth={1.8} />;
}

export function PaintbrushIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Paintbrush className={className} strokeWidth={1.8} />;
}

export function HammerIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Hammer className={className} strokeWidth={1.8} />;
}

export function SparkleBroomIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Sparkles className={className} strokeWidth={1.8} />;
}

export function PlugIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Plug className={className} strokeWidth={1.8} />;
}

export function BriefcaseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Briefcase className={className} strokeWidth={1.8} />;
}

export function CurrencyRupeeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <IndianRupee className={className} strokeWidth={2} />;
}

export function CalendarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Calendar className={className} strokeWidth={1.8} />;
}

export function CalendarCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <CalendarCheck className={className} strokeWidth={1.8} />;
}

export function ClockIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Clock className={className} strokeWidth={1.8} />;
}

export function StarIcon({ className = "w-4 h-4", filled = true }: { className?: string; filled?: boolean }) {
  return (
    <Star
      className={`${className} ${filled ? "fill-amber-400 text-amber-400" : "fill-none text-slate-300"}`}
      strokeWidth={filled ? 1 : 1.8}
    />
  );
}

export function ArrowUpRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <ArrowUpRight className={className} strokeWidth={2} />;
}

export function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <ChevronRight className={className} strokeWidth={2} />;
}

export function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <CheckCircle2 className={className} strokeWidth={2} />;
}

export function CrosshairIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Crosshair className={className} strokeWidth={1.8} />;
}

export function MessageSquareIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <MessageSquare className={className} strokeWidth={1.8} />;
}

export function CameraIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Camera className={className} strokeWidth={1.8} />;
}

export function TrendingUpIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <TrendingUp className={className} strokeWidth={2} />;
}

export function CheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Check className={className} strokeWidth={2} />;
}

export function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <X className={className} strokeWidth={2} />;
}

export function MenuIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Menu className={className} strokeWidth={2} />;
}

export function UserIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <User className={className} strokeWidth={1.8} />;
}

export function PhoneIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Phone className={className} strokeWidth={1.8} />;
}

export function PhoneCallIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <PhoneCall className={className} strokeWidth={1.8} />;
}

export function SmartphoneIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Smartphone className={className} strokeWidth={1.8} />;
}

export function DownloadIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Download className={className} strokeWidth={1.8} />;
}

export function SlidersIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <SlidersHorizontal className={className} strokeWidth={1.8} />;
}

export function ListIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <List className={className} strokeWidth={1.8} />;
}

export function LayoutGridIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <LayoutGrid className={className} strokeWidth={1.8} />;
}

export function HomeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Home className={className} strokeWidth={1.8} />;
}

export function SettingsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Settings className={className} strokeWidth={1.8} />;
}

export function LogOutIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <LogOut className={className} strokeWidth={1.8} />;
}

export function FilterIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function AwardIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

export function ThumbsUpIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

export function HelpCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronUpIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function QrCodeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );
}

export function NavigationIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

export function CompassIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

export function BotIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Bot className={className} strokeWidth={1.8} />;
}

export function HeadphonesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Headphones className={className} strokeWidth={1.8} />;
}

export function UsersIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Users className={className} strokeWidth={1.8} />;
}

export function ClipboardListIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <ClipboardList className={className} strokeWidth={1.8} />;
}

export function LockIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Lock className={className} strokeWidth={1.8} />;
}

export function MailIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Mail className={className} strokeWidth={1.8} />;
}

export function EyeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Eye className={className} strokeWidth={1.8} />;
}

export function EyeOffIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <EyeOff className={className} strokeWidth={1.8} />;
}

// =======================================================================
// BADGES & STATUS INDICATORS (PREMIUM HARDWARE AESTHETIC)
// =======================================================================

export function VerifiedBadge({ text = "Verified Pro", size = "sm" }: { text?: string; size?: "xs" | "sm" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50/90 text-[#0052cc] font-semibold border border-blue-200/80 shadow-2xs backdrop-blur-xs ${
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <CheckCircle className="w-3.5 h-3.5 text-[#0052cc] fill-blue-100 shrink-0" strokeWidth={2.2} />
      <span>{text}</span>
    </span>
  );
}

export function OnlineStatusDot({ available, online, label }: { available?: boolean; online?: boolean; label?: string }) {
  const isAvailable = online !== undefined ? online : (available ?? true);
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-xs">
      <span className="relative flex h-2.5 w-2.5">
        {isAvailable && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAvailable ? "bg-emerald-500" : "bg-slate-400"}`}></span>
      </span>
      {label && <span className={isAvailable ? "text-emerald-700 font-semibold" : "text-slate-500"}>{label}</span>}
    </span>
  );
}

// =======================================================================
// MASTER TRADE SERVICE ICON - VECTOR MAPPING FOR ALL DOMAINS
// =======================================================================

export function TradeServiceIcon({ service = "", className = "w-5 h-5" }: { service?: string; className?: string }) {
  const norm = (service || "").toLowerCase();

  if (norm.includes("electr") || norm.includes("wiring") || norm.includes("inverter")) {
    return <Zap className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("plumb") || norm.includes("tap") || norm.includes("pipe") || norm.includes("leak") || norm.includes("sanitary")) {
    return <Wrench className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("ac") || norm.includes("cool") || norm.includes("refrigerat") || norm.includes("hvac")) {
    return <Snowflake className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("paint") || norm.includes("whitewash")) {
    return <Paintbrush className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("carpent") || norm.includes("wood") || norm.includes("furnitur") || norm.includes("door")) {
    return <Hammer className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("clean") || norm.includes("maid") || norm.includes("housekeep") || norm.includes("deep clean")) {
    return <Sparkles className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("appliance") || norm.includes("tv") || norm.includes("microwave") || norm.includes("geyser")) {
    return <Plug className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("barber") || norm.includes("salon") || norm.includes("hair") || norm.includes("grooming")) {
    return <Scissors className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("driver") || norm.includes("cab") || norm.includes("car") || norm.includes("chauffeur")) {
    return <Car className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("doctor") || norm.includes("health") || norm.includes("clinic") || norm.includes("nurse")) {
    return <Stethoscope className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("tutor") || norm.includes("teacher") || norm.includes("tuition") || norm.includes("study")) {
    return <GraduationCap className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("cook") || norm.includes("chef") || norm.includes("kitchen") || norm.includes("tiffin")) {
    return <ChefHat className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("pest") || norm.includes("termite") || norm.includes("bedbug")) {
    return <Bug className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("ro") || norm.includes("water") || norm.includes("purifier")) {
    return <Droplets className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("mobile") || norm.includes("phone") || norm.includes("tablet")) {
    return <Smartphone className={className} strokeWidth={1.9} />;
  }
  if (norm.includes("computer") || norm.includes("laptop") || norm.includes("pc")) {
    return <Laptop className={className} strokeWidth={1.9} />;
  }
  // Generic high-utility trade fallback
  return <Wrench className={className} strokeWidth={1.9} />;
}

// =======================================================================
// TACTILE DUAL-TONE HARDWARE BADGE CONTAINER
// =======================================================================

export function TradeBadgeContainer({
  service,
  serviceName,
  children,
  size = "md",
}: {
  service?: string;
  serviceName?: string;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const resolvedService = service || serviceName || "";
  const norm = resolvedService.toLowerCase();

  // Modern subtle tinted hardware card with gentle contrast (NO harsh rainbow gradients)
  let themeStyles = "bg-blue-500/10 text-blue-600 border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600";

  if (norm.includes("electr") || norm.includes("wiring") || norm.includes("inverter")) {
    themeStyles = "bg-amber-500/10 text-amber-600 border-amber-500/25 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500";
  } else if (norm.includes("plumb") || norm.includes("tap") || norm.includes("pipe") || norm.includes("water")) {
    themeStyles = "bg-cyan-500/10 text-cyan-700 border-cyan-500/25 group-hover:bg-cyan-600 group-hover:text-white group-hover:border-cyan-600";
  } else if (norm.includes("ac") || norm.includes("cool") || norm.includes("refrigerat") || norm.includes("hvac")) {
    themeStyles = "bg-sky-500/10 text-sky-600 border-sky-500/25 group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600";
  } else if (norm.includes("paint") || norm.includes("whitewash")) {
    themeStyles = "bg-purple-500/10 text-purple-600 border-purple-500/25 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600";
  } else if (norm.includes("carpent") || norm.includes("wood") || norm.includes("furnitur")) {
    themeStyles = "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600";
  } else if (norm.includes("clean") || norm.includes("maid") || norm.includes("housekeep")) {
    themeStyles = "bg-teal-500/10 text-teal-700 border-teal-500/25 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600";
  } else if (norm.includes("appliance") || norm.includes("washing") || norm.includes("tv")) {
    themeStyles = "bg-indigo-500/10 text-indigo-600 border-indigo-500/25 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600";
  } else if (norm.includes("barber") || norm.includes("salon") || norm.includes("hair")) {
    themeStyles = "bg-rose-500/10 text-rose-600 border-rose-500/25 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600";
  } else if (norm.includes("driver") || norm.includes("cab") || norm.includes("car")) {
    themeStyles = "bg-orange-500/10 text-orange-600 border-orange-500/25 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600";
  } else if (norm.includes("doctor") || norm.includes("health")) {
    themeStyles = "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600";
  } else if (norm.includes("tutor") || norm.includes("teacher")) {
    themeStyles = "bg-violet-500/10 text-violet-600 border-violet-500/25 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600";
  } else if (norm.includes("cook") || norm.includes("chef")) {
    themeStyles = "bg-amber-600/10 text-amber-700 border-amber-600/25 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600";
  }

  const sizeStyles =
    size === "sm"
      ? "w-9 h-9 rounded-xl p-2 text-sm"
      : size === "lg"
      ? "w-14 h-14 rounded-2xl p-3.5 text-2xl"
      : "w-12 h-12 rounded-xl p-3 text-lg";

  return (
    <div
      className={`flex items-center justify-center shrink-0 border transition-all duration-300 shadow-2xs group-hover:scale-105 group-hover:shadow-md ${sizeStyles} ${themeStyles}`}
    >
      {children || <TradeServiceIcon service={resolvedService} className="w-full h-full" />}
    </div>
  );
}
