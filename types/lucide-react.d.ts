declare module "lucide-react" {
  import * as React from "react";
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    className?: string;
  }
  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >;

  export const Zap: LucideIcon;
  export const Wrench: LucideIcon;
  export const Snowflake: LucideIcon;
  export const Hammer: LucideIcon;
  export const Paintbrush: LucideIcon;
  export const PaintRoller: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Plug: LucideIcon;
  export const Scissors: LucideIcon;
  export const Car: LucideIcon;
  export const Stethoscope: LucideIcon;
  export const GraduationCap: LucideIcon;
  export const ChefHat: LucideIcon;
  export const Bug: LucideIcon;
  export const Droplets: LucideIcon;
  export const Search: LucideIcon;
  export const SearchX: LucideIcon;
  export const Loader2: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const Star: LucideIcon;
  export const Briefcase: LucideIcon;
  export const IndianRupee: LucideIcon;
  export const Calendar: LucideIcon;
  export const CalendarCheck: LucideIcon;
  export const Clock: LucideIcon;
  export const MapPin: LucideIcon;
  export const Phone: LucideIcon;
  export const PhoneCall: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Download: LucideIcon;
  export const Menu: LucideIcon;
  export const X: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const User: LucideIcon;
  export const Users: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Camera: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Check: LucideIcon;
  export const Home: LucideIcon;
  export const Settings: LucideIcon;
  export const LogOut: LucideIcon;
  export const Bot: LucideIcon;
  export const Headphones: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Lock: LucideIcon;
  export const Mail: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Crosshair: LucideIcon;
  export const Laptop: LucideIcon;
  export const Layers: LucideIcon;
  export const List: LucideIcon;
  export const LayoutGrid: LucideIcon;
  export const Bell: LucideIcon;
}
