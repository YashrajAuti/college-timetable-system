"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, User, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [adminId, setAdminId] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, setLoginState] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!adminId.trim()) {
      setErrorMessage("Please enter your administrator ID.");
      triggerShake();
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      triggerShake();
      return;
    }

    setLoginState('LOADING');
    setErrorMessage('');

    // Short realistic authentication transition timing (600ms)
    setTimeout(async () => {
      const result = await login(adminId, password);

      if (result.success) {
        setLoginState('SUCCESS');
        setTimeout(() => {
          router.replace('/');
        }, 600);
      } else {
        setLoginState('ERROR');
        setErrorMessage(result.message || "Invalid administrator credentials.");
        setPassword(''); // Clear password field after unsuccessful attempt
        triggerShake();
      }
    }, 600);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#C8102E] selection:text-white">
      
      {/* Animated Subtle Background: Geometric Academic Grid & Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Red-to-Slate Gradient Overlay */}
        <div className="absolute inset-0 bg-radial from-[#990000]/20 via-slate-900/90 to-slate-950" />
        
        {/* Academic Faint Grid Lines Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.07]" 
          style={{
            backgroundImage: `radial-gradient(#C8102E 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px, 80px 80px, 80px 80px'
          }}
        />

        {/* Floating Geometric Orbs (Respects reduced motion) */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#C8102E]/15 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-[#990000]/15 blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />

        {/* Subtle Floating Tech Lines & Circles */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <circle cx="15%" cy="25%" r="120" stroke="#FFFFFF" strokeWidth="1" fill="none" strokeDasharray="6,6" />
          <circle cx="85%" cy="75%" r="180" stroke="#C8102E" strokeWidth="1" fill="none" strokeDasharray="8,8" />
          <line x1="0" y1="30%" x2="100%" y2="70%" stroke="#C8102E" strokeWidth="0.5" strokeDasharray="4,4" />
        </svg>
      </div>

      {/* Main Centered Login Card Container */}
      <div className={`relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>
        
        {/* Top MMIT Red Accent Header Line */}
        <div className="h-2 bg-[#C8102E] w-full" />

        <div className="p-6 sm:p-8">
          
          {/* MMIT Logo & Institution Title */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-100 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Marathwada Mitramandal Institute of Technology Logo"
                className="h-20 w-auto object-contain block"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/mmit-logo.png';
                }}
              />
            </div>

            <div>
              <div className="text-[11px] font-extrabold text-[#C8102E] tracking-widest uppercase">
                Marathwada Mitramandal's
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                MMIT Automated Timetable Generator
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                College-wide Academic Timetable Management System
              </p>
            </div>
          </div>

          <div className="my-6 border-t border-slate-100" />

          {/* Form Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C8102E]" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Administrator Login
              </h2>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Secure Gateway
            </span>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700 flex items-center gap-2.5 animate-fadeIn" role="alert">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            
            {/* Admin ID Input Field */}
            <div className="space-y-1.5">
              <label htmlFor="adminId" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Admin ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="adminId"
                  type="text"
                  required
                  placeholder="Enter administrator ID"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E] transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input Field with Eye Toggle */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E] transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary LOGIN Action Button */}
            <button
              type="submit"
              disabled={loginState === 'LOADING' || loginState === 'SUCCESS'}
              className={`w-full mt-2 py-3 px-4 rounded-lg text-sm font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loginState === 'SUCCESS'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#C8102E] hover:bg-[#A00C24] active:scale-[0.99]'
              } disabled:opacity-80 disabled:cursor-not-allowed`}
            >
              {loginState === 'LOADING' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : loginState === 'SUCCESS' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Authentication Successful</span>
                </>
              ) : (
                <span>LOGIN</span>
              )}
            </button>
          </form>

          {/* Footer Security Notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C8102E]" /> Authorized Administrative Access Only
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
