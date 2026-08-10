"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { AuthProvider, AuthGuard } from "@/context/AuthContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <AuthProvider>
      <AuthGuard>
        {isLoginPage ? (
          <div className="min-h-screen w-full font-sans antialiased">
            {children}
          </div>
        ) : (
          <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col antialiased font-sans print:bg-white print:block">
            {/* Institutional Top Header */}
            <Header />

            <div className="flex flex-1 overflow-hidden print:block">
              {/* Left Institutional Sidebar */}
              <Sidebar />

              {/* Main Workspace Body */}
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between print:p-0 print:overflow-visible">
                <div className="max-w-7xl w-full mx-auto space-y-6">
                  {children}
                </div>
                <Footer />
              </main>
            </div>
          </div>
        )}
      </AuthGuard>
    </AuthProvider>
  );
}
