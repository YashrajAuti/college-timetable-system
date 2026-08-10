import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "MMIT Academic Timetable Management System",
  description: "Official Timetable Planning and Management Portal for Marathwada Mitramandal's Institute of Technology (MMIT), Lohgaon, Pune",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased font-sans">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
