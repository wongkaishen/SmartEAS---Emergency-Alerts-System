import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MaterialUIProvider from "@/components/MaterialUIProvider";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartEAS - Emergency Alert System",
  description: "Stay safe with real-time emergency alerts and disaster monitoring. AI-powered early warning system for natural disasters and emergencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MaterialUIProvider>
          <Navigation />
          {children}
        </MaterialUIProvider>
      </body>
    </html>
  );
}
