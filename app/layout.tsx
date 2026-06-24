import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SolveOnyx",
  description: "SolveOnyx platform starter",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(geistMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppSidebar />
        <main className="min-h-screen pl-[4.5rem]">{children}</main>
      </body>
    </html>
  );
}
