"use client";

import { useState, useRef, useEffect } from 'react';
import { Bell, ShieldCheck, Calendar, LogOut, ChevronDown, UserCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Header() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    logout();
  };

  return (
    <header className="bg-white border-b border-[#E5E7EB] shadow-xs sticky top-0 z-40 print:hidden">
      {/* Top MMIT Red Accent Bar */}
      <div className="h-1.5 bg-[#C8102E] w-full" />

      {/* Main College Branding Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Official College Logo + Title */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Logo container using user PNG asset directly */}
          <div className="shrink-0 bg-white p-1 rounded-md flex items-center justify-center">
            <img
              src="/logo.png"
              alt="MMIT College Logo Emblem"
              className="h-16 w-auto sm:h-20 object-contain block"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/mmit-logo.png';
              }}
            />
          </div>

          {/* College Name & Tagline Hierarchy */}
          <div className="flex flex-col justify-center">
            <div className="text-xs sm:text-sm font-bold text-[#222222] tracking-wider uppercase leading-snug">
              MARATHWADA MITRAMANDAL'S
            </div>
            <div className="text-base sm:text-xl font-extrabold text-[#C8102E] tracking-tight uppercase leading-tight mt-0.5">
              INSTITUTE OF TECHNOLOGY (MMIT)
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#666666]">
              <span className="italic font-medium">“Techno-social Excellence”</span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-500">Est. 1967</span>
              <span className="hidden lg:inline-block text-slate-300">•</span>
              <span className="hidden lg:inline-block text-slate-500 font-medium">Lohgaon, Pune – 411047</span>
            </div>
          </div>
        </div>

        {/* Vertical Divider for desktop */}
        <div className="hidden md:block h-12 w-px bg-[#E5E7EB]" />

        {/* Right: Application Controls */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          {/* Academic Year Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-md text-xs font-semibold text-[#222222]">
            <Calendar className="w-3.5 h-3.5 text-[#C8102E]" />
            <span>AY 2026–27</span>
          </div>

          {/* Notifications */}
          <button 
            type="button"
            className="p-2 rounded-md hover:bg-[#F8F9FA] text-[#666666] hover:text-[#C8102E] transition-colors relative border border-transparent hover:border-[#E5E7EB]"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C8102E]" />
          </button>

          <div className="h-6 w-px bg-[#E5E7EB]" />

          {/* Functional Admin User Profile Menu Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
              aria-expanded={dropdownOpen}
              aria-label="Admin user menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#C8102E] text-white flex items-center justify-center text-xs font-bold shadow-2xs group-hover:bg-[#A00C24] transition-colors">
                AD
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-[#222222] leading-tight">
                  {user?.name || 'Administrator'}
                </span>
                <span className="text-[10px] font-medium text-[#666666] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> System Admin
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-[#C8102E]' : ''}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fadeIn">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-900">{user?.name || 'Administrator'}</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{user?.email || 'admin@mmit.edu.in'}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="mmit-badge-red text-[10px]">Super Admin</span>
                    <span className="mmit-badge-emerald text-[10px]">Active Session</span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#C8102E] hover:bg-red-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 shrink-0 text-[#C8102E]" />
                    <span>Logout Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visually Separate Application Title Bar */}
      <div className="bg-[#F8F9FA] border-t border-b border-[#E5E7EB] py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs sm:text-sm font-extrabold text-[#C8102E] tracking-wider uppercase">
              TIMETABLE MANAGEMENT SYSTEM
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#666666] hidden sm:inline-block">
            Internal Administrative Portal • Department of Computer Engineering
          </span>
        </div>
      </div>
    </header>
  );
}
