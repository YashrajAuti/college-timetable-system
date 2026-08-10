"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  BookOpen,
  DoorOpen,
  ClipboardList,
  CalendarDays,
  FileSpreadsheet,
  Settings,
  LogOut,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navSections = [
  {
    title: 'Core Navigation',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Master Configuration',
    items: [
      { name: 'Departments', href: '/departments', icon: Building2 },
      { name: 'Teachers & Faculty', href: '/teachers', icon: Users },
      { name: 'Course Subjects', href: '/subjects', icon: BookOpen },
      { name: 'Rooms & Labs', href: '/rooms', icon: DoorOpen },
      { name: 'Faculty Allocations', href: '/allocations', icon: ClipboardList },
      { name: 'Workload Master', href: '/master/teacher-subjects', icon: FileSpreadsheet },
    ]
  },
  {
    title: 'Timetable Operations',
    items: [
      { name: 'Timetables Directory', href: '/timetables', icon: CalendarDays },
    ]
  },
  {
    title: 'System Administration',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLogoutClick = () => {
    if (confirm("Are you sure you want to log out of MMIT Timetable Generator?")) {
      logout();
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7EB] h-full flex flex-col z-30 shrink-0 print:hidden select-none shadow-xs">
      {/* Navigation Header */}
      <div className="p-4 border-b border-[#E5E7EB] flex items-center gap-3 bg-[#F8F9FA]">
        <div className="p-2 bg-[#FEF2F2] text-[#C8102E] border border-red-200/80 rounded-md">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xs font-extrabold text-[#222222] tracking-wider uppercase">MMIT Navigation</h2>
          <p className="text-[10px] text-[#666666] font-medium">Academic Year 2026–27</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-5">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold text-[#666666] uppercase tracking-wider">
              {section.title}
            </h3>
            <ul className="space-y-0.5 mt-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 text-xs font-semibold relative group",
                        isActive
                          ? "bg-[#FEF2F2] text-[#C8102E] border-l-4 border-[#C8102E] pl-2.5 font-bold"
                          : "text-[#222222] hover:bg-[#F8F9FA] hover:text-[#C8102E]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive ? "text-[#C8102E]" : "text-[#666666] group-hover:text-[#C8102E]"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Footer Action with Working Logout Button */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#F8F9FA] space-y-2">
        <div className="p-2.5 rounded-md bg-white border border-[#E5E7EB] text-xs">
          <p className="font-bold text-[#222222]">MMIT Timetable v2.5</p>
          <p className="text-[10px] text-[#666666]">College-wide System (7 Depts)</p>
        </div>
        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-[#C8102E] bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-200/80 cursor-pointer shadow-2xs"
          title="Logout from MMIT System"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout Session
        </button>
      </div>
    </aside>
  );
}
