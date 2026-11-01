import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import LocationAutoDetect from "./components/LocationAutoDetect";
import RoleShell from "./components/RoleShell";
import BackButton from "./components/BackButton";
import OtpNotificationBanner from "./components/OtpNotificationBanner";

export const metadata: Metadata = {
  title: "Master App",
  description: "Find and book local services with Master App.",
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