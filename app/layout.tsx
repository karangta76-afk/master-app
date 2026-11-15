import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import LocationAutoDetect from "./components/LocationAutoDetect";
import RoleShell from "./components/RoleShell";
import BackButton from "./components/BackButton";
import OtpNotificationBanner from "./components/OtpNotificationBanner";

export const metadata: Metadata = {
  metadataBase: new URL("https://master-app-master-app2.vercel.app"),
  title: "Master App — One App. All Services.",
  description:
    "Find and book trusted local service experts in minutes. Electricians, plumbers, carpenters, AC repair, technicians and more. One App. All Services.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo-icon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Master App — One App. All Services.",
    description: "Verified local services marketplace connecting certified technicians with customers.",
    images: [{ url: "/logo-square.jpg", width: 1024, height: 1024, alt: "Master App - One App. All Services." }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">
        <OtpNotificationBanner />
        <Navbar />
        <LocationAutoDetect />
        <BackButton />
        <RoleShell>{children}</RoleShell>
      </body>
    </html>
  );
}