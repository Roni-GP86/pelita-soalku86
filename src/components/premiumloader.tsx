import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, Sparkles } from "lucide-react";

interface PremiumLoaderProps {
  active: boolean;
  title: string;
  subtitle?: string;
  type?: "generate" | "download";
  onComplete?: () => void;
}

export default function PremiumLoader({
  active,
  title,
  subtitle = "Mohon tunggu sebentar...",
  type = "generate",
  onComplete,
}: PremiumLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  // Gamified step descriptions based on action type
  const stepsList = type === "generate"
    ? [
        "Menghubungkan ke Server Pintar Pelita Soal...",
        "Mengurai Capaian Pembelajaran (CP) Merdeka...",
        "Memetakan stimulus pembelajaran kontekstual...",
        "Menyeimbangkan proporsi tingkat kesulitan...",
        "Mengintegrasikan gambar diagram visual...",
        "Menyusun rubrik penskoran standar nasional...",
        "Mematangkan arsitektur naskah premium...",
        "Kompilasi final sukses 100%!"
      ]
    : [
        "Memulai penyiapan virtual renderer...",
        "Mengoversi tata letak dokumen (Times New Roman)...",
        "Menempelkan atribut KOP Lembaga Pendidikan...",
        "Melindungi margin & batas halaman (A4)...",
        "Menyelaraskan tabel distribusi bobot...",
        "Mengompilasi lembar pengesahan & tanda tangan...",
        "Mengunduh berkas digital siap saji...",
        "Selesai! Berkas terunduh sempurna!"
      ];

  useEffect(() => {
    if (!active) {
      setProgress(0);
      setCurrentStep(0);
      return;
    }

    // Set up rapid initial progression, then slower crawl towards 99%
    let intervalTime = 120; // ms
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) {
          clearInterval(timer);
          return 98;
        }

        // Variable increments to feel natural & authentic (organic speedup/slowdown)
        let increment = 1;
        if (prev < 30) {
          increment = Math.floor(Math.random() * 6) + 4; // fast start
        } else if (prev < 65) {
          increment = Math.floor(Math.random() * 3) + 2; // steady middle
        } else if (prev < 85) {
          increment = Math.floor(Math.random() * 2) + 1; // slowing down
        } else {
          increment = Math.random() > 0.6 ? 1 : 0; // crawl near end
        }

        const nextVal = Math.min(prev + increment, 98);
        
        // Update step index based on progress percentile
        const stepIndex = Math.min(
          Math.floor((nextVal / 100) * stepsList.length),
          stepsList.length - 2
        );
        setCurrentStep(stepIndex);

        return nextVal;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [active, stepsList.length]);

  useEffect(() => {
    if (active && progress === 98) {
      // stay at 98 until parent finishes or we force complete
    }
  }, [active, progress]);

  if (!active) return null;

  const circumference = 2 * Math.PI * 40; // ~251.2
  const strokeDashoffset = circumference - (circumference * progress) / 100;

  return (
    <div
      id="premium-game-loader-overlay"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl transition-all duration-500 overflow-hidden select-none"
    >
      {/* Visual background lights - glowing warm atmosphere */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

      {/* Cyber holographic grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.3)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40"></div>

      {/* Futuristic subtle scanning horizontal line */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-12 w-full animate-[bounce_6s_infinite] opacity-50 blur-sm"></div>

      {/* MAIN CONTAINER */}
      <div className="relative text-center max-w-xl px-6 flex flex-col items-center">
        
        {/* PREMIUM BADGE */}
        <div className="mb-6 px-3.5 py-1 bg-gradient-to-r from-amber-500/15 via-yellow-400/15 to-transparent border border-amber-500/30 text-amber-300 rounded-full text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-1.5 shadow-sm shadow-amber-950/20">
          <Sparkles size={11} className="text-amber-400" />
          <span>PROSES PENYUSUNAN OTOMATIS</span>
        </div>

        {/* LOGO TITLE IN PROGRESS */}
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-md">
          {title}
        </h2>
        <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto font-medium leading-relaxed">
          {subtitle}
        </p>

        {/* --- DUAL INTERLOCKING ROTATING SUPER PREMIUM CIRCULAR RINGS --- */}
        <div className="relative my-10 flex items-center justify-center w-56 h-56">
          
          {/* Glowing Outer Hexagon Aura */}
          <div className="absolute inset-0 bg-blue-500/5 rounded-full filter blur-md animate-pulse"></div>

          {/* Infinitely rotating high-tech dotted compass ring */}
          <div className="absolute inset-2 border-2 border-dashed border-blue-500/10 rounded-full animate-[spin_15s_linear_infinite]"></div>
          
          {/* Infinitely rotating segmented ring */}
          <div className="absolute inset-4 border-4 border-blue-400/5 border-t-blue-500/20 border-b-blue-500/20 rounded-full animate-[spin_8s_linear_infinite]"></div>

          {/* Reverse fast-spinning inner scanner dashes */}
          <div className="absolute inset-8 border border-dashed border-emerald-500/10 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>

          {/* Interactive core SVG Canvas */}
          <svg className="w-44 h-44 transform -rotate-90 filter drop-shadow-[0_0_20px_rgba(37,99,235,0.6)]" viewBox="0 0 100 100">
            {/* Base Background Dim Track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className="stroke-slate-900 fill-slate-950/60"
              strokeWidth="5"
            />
            {/* Interactive Progress Bar */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="url(#premiumGrad)"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-200 ease-out"
            />
            {/* Glowing endpoint node rider */}
            {progress > 0 && (
              <circle
                cx={50 + 40 * Math.cos((progress * 360 / 100 - 90) * Math.PI / 180)}
                cy={50 + 40 * Math.sin((progress * 360 / 100 - 90) * Math.PI / 180)}
                r="3.5"
                fill="#3b82f6"
                 className="filter drop-shadow-[0_0_8px_#3b82f6] animate-[ping_1.5s_infinite]"
              />
            )}

            {/* Gradient definition with premium 4-color palette (Blue, Gold, Orange, Green) */}
            <defs>
              <linearGradient id="premiumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="35%" stopColor="#fbbf24" />
                <stop offset="70%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>
 
          {/* INNER TEXT CONTROLS */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Pulsing luxurious background atmospheric orb */}
            <div className="absolute w-24 h-24 bg-gradient-to-tr from-amber-500/10 to-orange-500/10 rounded-full blur-md animate-ping duration-[3.5s]"></div>
            
            {/* Elegant tiny tracker */}
            <div className="text-[8px] tracking-[0.35em] font-extrabold text-amber-400 mb-1 uppercase animate-pulse">
              PELITA SOAL
            </div>
            
            {/* "MEMPROSES" - Requested centerpiece label */}
            <div id="loading-memproses-text" className="text-[10px] md:text-[11px] font-black tracking-[0.2em] text-white drop-shadow-[0_2px_8px_rgba(245,158,11,0.25)] uppercase flex items-center justify-center pl-[0.2em] font-display">
              MEMPROSES
            </div>

            {/* Glowing active indicator dot dots */}
            <div className="flex gap-1.5 mt-3 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>

        {/* ACTIVE STATUS TEXT */}
        <div className="w-full bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-center gap-3.5 max-w-sm shadow-xl shadow-black/40">
          <Loader2 size={16} className="animate-spin text-amber-500 shrink-0" />
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block leading-tight">
              Aktivitas Sistem Saat Ini:
            </span>
            <span className="text-xs font-semibold text-amber-100 mt-0.5 block leading-relaxed animate-pulse">
              {stepsList[currentStep]}
            </span>
          </div>
        </div>

        {/* PROGRESS METRICS INFRASTRUCTURE BAR */}
        <div className="w-64 bg-slate-900 rounded-full h-1 mt-6 overflow-hidden p-px">
          <div
            className="bg-gradient-to-r from-amber-600 to-yellow-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* SUBTLE FOOTER SYSTEM CREDENTIAL */}
        <p className="text-[9px] text-slate-600 font-black tracking-widest mt-10 uppercase">
          KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI
        </p>
      </div>
    </div>
  );
}
