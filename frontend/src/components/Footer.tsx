"use client";

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E5E7EB] py-3.5 px-4 sm:px-6 text-xs text-[#666666] print:hidden mt-auto select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left font-sans">
        <div>
          <span className="font-semibold text-[#222222]">
            © 2026 Marathwada Mitramandal's Institute of Technology (MMIT)
          </span>
          <span className="mx-2 text-slate-300">|</span>
          <span className="font-medium text-[#666666]">All Rights Reserved. | ®</span>
        </div>
        <div className="font-medium text-[#666666]">
          Designed &amp; Developed by <span className="font-semibold text-[#222222]">Yashraj Auti &amp; Bhavesh Choudhary</span>
        </div>
      </div>
    </footer>
  );
}
