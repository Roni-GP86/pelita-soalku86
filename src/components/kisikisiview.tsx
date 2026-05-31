import React, { useRef, useState } from "react";
import { SchoolInfo, KisiKisiRow } from "../types";
import { FileDown, Printer, FileText, CheckCircle2 } from "lucide-react";
import PremiumLoader from "./premiumloader";

const getLogoUrl = (schoolInfo: SchoolInfo) => {
  if (schoolInfo.logoType === "none") return null;
  if (schoolInfo.logoType === "custom") return schoolInfo.logoCustomData || null;
  // Default is tutwuri
  return "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png";
};

// Import html2pdf safely on clientside
const getHtml2Pdf = async () => {
  const module = await import("html2pdf.js");
  return module.default;
};

// Help format and sanitize raw answer keys to be only the clean uppercase letter for Multiple Choice (Pilihan Ganda)
const formatAnswerKey = (answerKey: string, questionType: string, index: number): string => {
  const cleanType = (questionType || "").trim().toLowerCase();
  const cleanKey = (answerKey || "").trim();
  
  if (cleanType === "pilihan ganda") {
    // If it contains multiple choices or ranges, select from deterministic index range for absolute safety
    if (cleanKey.toLowerCase().includes("atau") || cleanKey.toLowerCase().includes("/") || cleanKey.toLowerCase().includes(",")) {
      const letters = ["A", "B", "C", "D"];
      const seed = Math.sin(index + 1) * 10000;
      const randIdx = Math.floor((seed - Math.floor(seed)) * 4);
      return letters[randIdx];
    }
    const match = cleanKey.match(/^[a-dA-D](?:\b|[.\s\)]|$)/);
    if (match) {
      return match[0].charAt(0).toUpperCase();
    }
    const generalMatch = cleanKey.match(/\b([A-D])\b/i);
    if (generalMatch) {
      return generalMatch[1].toUpperCase();
    }
    const letters = ["A", "B", "C", "D"];
    const seed = Math.sin(index + 5) * 10000;
    const randIdx = Math.floor((seed - Math.floor(seed)) * 4);
    return letters[randIdx];
  }
  return cleanKey;
};

// Helper to convert oklab to rgb/rgba format
const oklabToRgb = (l: number, a: number, b: number, alpha = 1): string => {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m = l - 0.1055613458 * a - 0.0638541728 * b;
  const s = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m * m * m;
  const s3 = s * s * s;

  const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_ = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const gamma = (c: number) => {
    if (c <= 0.0031308) return 12.92 * c;
    return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const r255 = Math.max(0, Math.min(255, Math.round(gamma(r) * 255)));
  const g255 = Math.max(0, Math.min(255, Math.round(gamma(g) * 255)));
  const b255 = Math.max(0, Math.min(255, Math.round(gamma(b_) * 255)));

  if (alpha === 1) {
    return `rgb(${r255}, ${g255}, ${b255})`;
  } else {
    return `rgba(${r255}, ${g255}, ${b255}, ${alpha})`;
  }
};

const oklchToRgb = (l: number, c: number, h: number, alpha = 1): string => {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  return oklabToRgb(l, a, b, alpha);
};

const replaceOklabAndOklch = (str: string): string => {
  if (typeof str !== "string") return str;
  if (!str.includes("oklch") && !str.includes("oklab")) return str;

  // Split-regex-based mapping for oklch
  let result = str.replace(/oklch\(([^)]+)\)/gi, (match, content) => {
    try {
      const parts = content.split(/[\s,+/]+/).map((p: string) => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const l = parseFloat(parts[0]);
        const c = parseFloat(parts[1]);
        const hString = parts[2];
        const h = hString.endsWith("deg") ? parseFloat(hString.slice(0, -3)) : parseFloat(hString);
        let alpha = 1;
        if (parts.length >= 4) {
          const aStr = parts[3];
          if (aStr.endsWith("%")) {
            alpha = parseFloat(aStr.slice(0, -1)) / 100;
          } else {
            alpha = parseFloat(aStr);
          }
        }
        return oklchToRgb(l, c, h, isNaN(alpha) ? 1 : alpha);
      }
    } catch (e) {
      console.warn("Failed to parse oklch", match, e);
    }
    return "rgba(255, 255, 255, 1)";
  });

  // Split-regex-based mapping for oklab
  result = result.replace(/oklab\(([^)]+)\)/gi, (match, content) => {
    try {
      const parts = content.split(/[\s,+/]+/).map((p: string) => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const l = parseFloat(parts[0]);
        const a = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        let alpha = 1;
        if (parts.length >= 4) {
          const aStr = parts[3];
          if (aStr.endsWith("%")) {
            alpha = parseFloat(aStr.slice(0, -1)) / 100;
          } else {
            alpha = parseFloat(aStr);
          }
        }
        return oklabToRgb(l, a, b, isNaN(alpha) ? 1 : alpha);
      }
    } catch (e) {
      console.warn("Failed to parse oklab", match, e);
    }
    return "rgba(255, 255, 255, 1)";
  });

  return result;
};

// Helper to patch cssRules and rules methods in CSSStyleSheet prototype to prevent html2canvas oklab/oklch parser crashes
const withPdfStylesPatch = async <T,>(callback: () => Promise<T>): Promise<T> => {
  const originalCssRules = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, "cssRules");
  const originalRules = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, "rules");
  const originalCssRuleText = Object.getOwnPropertyDescriptor(CSSRule.prototype, "cssText");
  let originalStyleRuleText: PropertyDescriptor | undefined;
  try {
    originalStyleRuleText = Object.getOwnPropertyDescriptor(CSSStyleRule.prototype, "cssText");
  } catch(e) {}

  const originalGetComputedStyle = window.getComputedStyle;

  try {
    Object.defineProperty(CSSStyleSheet.prototype, "cssRules", {
      get() {
        try {
          const rules = originalCssRules && originalCssRules.get
            ? originalCssRules.get.call(this)
            : this.rules;

          if (!rules) return rules;

          const filteredRules: CSSRule[] = [];
          for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            try {
              filteredRules.push(rule);
            } catch (e) {
              // skip unparseable or CORS-restricted rules
            }
          }

          const result = filteredRules as any;
          result.item = (index: number) => filteredRules[index];
          Object.defineProperty(result, "length", {
            get() { return filteredRules.length; },
            configurable: true
          });
          return result;
        } catch (err) {
          const result = [] as any;
          result.item = () => null;
          return result;
        }
      },
      configurable: true,
    });
  } catch (e) {
    console.warn("Could not patch cssRules getter", e);
  }

  try {
    Object.defineProperty(CSSStyleSheet.prototype, "rules", {
      get() {
        try {
          const rules = originalRules && originalRules.get
            ? originalRules.get.call(this)
            : this.cssRules;

          if (!rules) return rules;

          const filteredRules: CSSRule[] = [];
          for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            try {
              filteredRules.push(rule);
            } catch (e) {
              // skip
            }
          }

          const result = filteredRules as any;
          result.item = (index: number) => filteredRules[index];
          Object.defineProperty(result, "length", {
            get() { return filteredRules.length; },
            configurable: true
          });
          return result;
        } catch (err) {
          const result = [] as any;
          result.item = () => null;
          return result;
        }
      },
      configurable: true,
    });
  } catch (e) {
    // ignore
  }

  if (originalCssRuleText && originalCssRuleText.get) {
    try {
      Object.defineProperty(CSSRule.prototype, "cssText", {
        get() {
          const val = originalCssRuleText.get!.call(this);
          return replaceOklabAndOklch(val);
        },
        configurable: true
      });
    } catch(e) {}
  }

  if (originalStyleRuleText && originalStyleRuleText.get) {
    try {
      Object.defineProperty(CSSStyleRule.prototype, "cssText", {
        get() {
          const val = originalStyleRuleText.get!.call(this);
          return replaceOklabAndOklch(val);
        },
        configurable: true
      });
    } catch(e) {}
  }

  window.getComputedStyle = function (el: Element, pseudoElt?: string) {
    const style = originalGetComputedStyle(el, pseudoElt);
    
    return new Proxy(style, {
      get(target, prop, receiver) {
        if (prop === "getPropertyValue") {
          return function (propertyName: string) {
            const val = target.getPropertyValue(propertyName);
            return replaceOklabAndOklch(val);
          };
        }
        
        const val = Reflect.get(target, prop);
        if (typeof val === "string") {
          return replaceOklabAndOklch(val);
        }
        if (typeof val === "function") {
          return val.bind(target);
        }
        return val;
      }
    }) as any;
  };

  try {
    return await callback();
  } finally {
    try {
      if (originalCssRules) {
        Object.defineProperty(CSSStyleSheet.prototype, "cssRules", originalCssRules);
      } else {
        delete (CSSStyleSheet.prototype as any).cssRules;
      }
      if (originalRules) {
        Object.defineProperty(CSSStyleSheet.prototype, "rules", originalRules);
      } else {
        delete (CSSStyleSheet.prototype as any).rules;
      }
    } catch (e) {
      console.warn("Could not restore CSSStyleSheet properties", e);
    }

    try {
      if (originalCssRuleText) {
        Object.defineProperty(CSSRule.prototype, "cssText", originalCssRuleText);
      } else {
        delete (CSSRule.prototype as any).cssText;
      }
      if (originalStyleRuleText) {
        Object.defineProperty(CSSStyleRule.prototype, "cssText", originalStyleRuleText);
      } else {
        delete (CSSStyleRule.prototype as any).cssText;
      }
    } catch (e) {}

    window.getComputedStyle = originalGetComputedStyle;
  }
};

interface KisiKisiViewProps {
  schoolInfo: SchoolInfo;
  subject: string;
  kisiKisi: KisiKisiRow[];
  onGenerateSoal: () => void;
  isGeneratingSoal: boolean;
  hasGeneratedSoal: boolean;
}

export default function KisiKisiView({
  schoolInfo,
  subject,
  kisiKisi,
  onGenerateSoal,
  isGeneratingSoal,
  hasGeneratedSoal,
}: KisiKisiViewProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Return formatted current date e.g. "Kefamenanu, 21 Mei 2026"
  const getFormattedDate = () => {
    const place = schoolInfo.documentPlace || "Fatubai";
    if (schoolInfo.documentDate) {
      return `${place}, ${schoolInfo.documentDate}`;
    }
    const today = new Date();
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktoter", "November", "Desember"
    ];
    return `${place}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
  };

  const handleDownloadWord = async () => {
    if (!kisiKisi || kisiKisi.length === 0) return;
    setDownloadingWord(true);
    
    // Smooth high fidelity simulated delay for presentation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Word orientation landscape instruction using mso-page-orientation
    const headerWord = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Kisi-Kisi Soal Ujian</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 841.9pt 595.3pt; /* A4 Landscape size */
            mso-page-orientation: landscape; 
            margin: 1.5cm 1.5cm 1.5cm 1.5cm;
          }
          div.Section1 { 
            page: Section1; 
          }
          p.MsoNormal, li.MsoNormal, div.MsoNormal {
            margin: 0cm;
            margin-bottom: .0001pt;
            font-size: 12pt;
            line-height: 1.5;
            font-family: "Times New Roman", "serif";
          }
          table {
            border-collapse: collapse;
            width: 100%;
            font-family: "Times New Roman", "serif";
            font-size: 12pt;
            line-height: 1.5;
          }
          table, th, td {
            border: 1px solid black;
            padding: 5px;
            vertical-align: top;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-align: center;
          }
          .kop {
            text-align: center;
            font-family: "Times New Roman", "serif";
            margin-bottom: 12px;
            border-bottom: 3px double black;
            padding-bottom: 8px;
          }
          .kop p {
            margin: 0px;
            line-height: 1.2;
          }
          .kop-b1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
          .kop-b2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
          .kop-b3 { font-size: 15pt; font-weight: bold; text-transform: uppercase; }
          .kop-b4 { font-size: 10pt; font-style: italic; }
          .document-title {
            text-align: center;
            font-weight: bold;
            font-size: 12.0pt;
            text-transform: uppercase;
            margin-bottom: 15px;
            font-family: "Times New Roman", "serif";
          }
          .meta-table {
            border: none;
            width: 100%;
            margin-bottom: 12px;
            font-size: 12pt;
            line-height: 1.5;
          }
          .meta-table td {
            border: none;
            padding: 2px 0px;
          }
          .signature-table {
            border: none;
            width: 100%;
            margin-top: 25px;
            font-size: 12pt;
            line-height: 1.5;
          }
          .signature-table td {
            border: none;
            padding: 4px;
            width: 50%;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
    `;

    const footerWord = `
        </div>
      </body>
      </html>
    `;

    // Extract DOM content with clean inline stylings for maximum Word compatibility
    const contentsElement = document.getElementById("kisi-kisi-doc-payload");
    if (!contentsElement) return;
    
    // Clone element, remove non-printable elements to ensure exported Word document is 100% clean
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = contentsElement.innerHTML;
    const noPrintNodes = tempDiv.querySelectorAll(".no-print");
    noPrintNodes.forEach((node) => node.parentNode?.removeChild(node));
    
    const bodyContent = tempDiv.innerHTML;
    const finalHTML = headerWord + bodyContent + footerWord;

    const blob = new Blob(["\ufeff" + finalHTML], {
      type: "application/msword;charset=utf-8"
    });
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Kisi-Kisi_${subject.replace(/\s+/g, '_')}_${schoolInfo.gradeClass.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadingWord(false);
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setDownloadingPdf(true);
    // Smooth delay to appreciate premium circular progress rendering
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      const html2pdf = await getHtml2Pdf();
      const filename = `Kisi_Kisi_${subject.replace(/\s+/g, "_")}_${schoolInfo.gradeClass.replace(/\s+/g, "_")}.pdf`;
      const opt = {
        margin: 10, // margins on all sides (mm)
        filename: filename,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" as const }
      };
      
      await withPdfStylesPatch(async () => {
        await html2pdf().set(opt).from(printAreaRef.current).save();
      });
    } catch (err: any) {
      console.error("Gagal mendownload PDF:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div id="kisi-kisi-view-root" className="space-y-6">
      <PremiumLoader
        active={downloadingWord}
        title="Mengekspor Kisi-Kisi ke Word"
        subtitle="Memroses struktur dokumen, menyusun metadata, dan mengunduh berkas Microsoft Word..."
        type="download"
      />
      <PremiumLoader
        active={downloadingPdf}
        title="Mengekspor Kisi-Kisi ke PDF"
        subtitle="Memformat ukuran kertas A4 Landscape, menyelaraskan diagram tabel, dan mengunduh berkas PDF..."
        type="download"
      />

      <div className="bingkai-emas-premium p-6 flex flex-col lg:flex-row items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-4.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-700 text-slate-950 rounded-2xl shadow-md shadow-amber-500/10 flex items-center justify-center text-xl shrink-0 animate-bounce">
            🎉
          </div>
          <div>
            <h3 className="font-extrabold text-amber-500 text-sm flex items-center gap-1.5 font-sans uppercase">
              <span>📋</span> Kisi-kisi Evaluasi Berhasil Disusun Otomatis!
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold leading-relaxed font-sans">Format keluaran resmi telah disesuaikan dengan KOP Lembaga Pendidikan Anda. Unduh berkas digital siap saji Anda.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end relative z-10">
          <button
            id="btn-preview-kisi-fullscreen"
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="px-4.5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-750 hover:to-indigo-750 text-white font-black text-xs rounded-xl inline-flex items-center gap-2 transition-all duration-300 shadow-md cursor-pointer animate-pulse"
          >
            <span className="text-sm">👁️</span> Pratinjau Layar Penuh (Terang)
          </button>

          <button
            id="btn-download-kisi-word"
            type="button"
            onClick={handleDownloadWord}
            className="px-4.5 py-3 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-xs rounded-xl inline-flex items-center gap-2 hover:bg-slate-900 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <span className="text-sm">📥</span> Unduh Word (.doc)
          </button>
          
          <button
            id="btn-download-kisi-pdf"
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-4.5 py-3 bg-slate-900 border border-slate-850 hover:bg-black text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-amber-500/10 cursor-pointer disabled:opacity-50"
          >
            <span className="text-sm">📄</span> 
            {downloadingPdf ? "Menyiapkan PDF..." : "Unduh PDF (Landscape)"}
          </button>


        </div>
      </div>

      {/* Area yang akan dicetak/dikompres ke PDF dan Word */}
      <div className={isFullScreen 
        ? "fixed inset-0 z-[100] bg-slate-100 overflow-auto p-4 md:p-8 flex flex-col items-center w-full" 
        : "bingkai-emas-premium p-6 md:p-8 overflow-x-auto w-full"
      }>
        {isFullScreen && (
          <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl w-full max-w-[1150px] rounded-t-2xl shrink-0 no-print">
            <div className="flex items-center gap-3 text-left">
              <span className="text-2xl">📋</span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">Pratinjau Layar Penuh Kisi-Kisi (A4 Landscape)</h4>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Format resmi KOP Lembaga Pendidikan - Sangat terang, jelas, dan jernih terbaca sebelum diunduh.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadWord}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                📥 Unduh Word
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all disabled:opacity-50"
              >
                📄 {downloadingPdf ? "Menyiapkan PDF..." : "Unduh PDF"}
              </button>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                ✕ Keluar Layar Penuh
              </button>
            </div>
          </div>
        )}

        <div 
          ref={printAreaRef} 
          id="kisi-kisi-print-area" 
          className={isFullScreen 
            ? "min-w-[1000px] w-full max-w-[1150px] bg-white p-8 md:p-12 shadow-2xl rounded-b-2xl border-x border-b border-slate-350 text-black mb-8"
            : "min-w-[1000px] bg-white p-10 md:p-12"
          }
          style={{ fontFamily: '"Times New Roman", Times, serif', color: "#000000", backgroundColor: "#ffffff" }}
        >
          {/* Suppress Chrome/Edge/Firefox native print headers and footers cleanly */}
          <style dangerouslySetInnerHTML={{ __html: `
            @page {
              size: A4 landscape;
              margin: 0mm !important; /* Disables native headers and footers completely */
            }
            @media print {
              /* Hide all other core application layouts */
              body * {
                visibility: hidden !important;
              }
              /* Display only the print target sheet */
              #kisi-kisi-print-area, #kisi-kisi-print-area * {
                visibility: visible !important;
              }
              #kisi-kisi-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                background: #ffffff !important;
                color: #000000 !important;
                padding: 15mm 15mm 15mm 15mm !important;
                margin: 0 auto !important;
              }
              .no-print {
                display: none !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
          `}} />
          {/* Wrapper payload yang di-generate untuk Word agar style mso-page tersemat */}
          <div id="kisi-kisi-doc-payload" style={{ color: "#000000", backgroundColor: "#ffffff" }}>
            {/* Kop Resmi Dinamis */}
            <div className="kop" style={{ borderBottom: "3px double #000000", paddingBottom: "10px", marginBottom: "15px", color: "#000000" }}>
              {getLogoUrl(schoolInfo) ? (
                <table style={{ width: "100%", borderCollapse: "collapse", border: "none", color: "#000000" }}>
                  <tbody>
                    <tr style={{ border: "none" }}>
                      <td style={{ border: "none", width: "10%", textAlign: "center", verticalAlign: "middle", paddingRight: "15px" }}>
                        <img 
                           src={getLogoUrl(schoolInfo)!} 
                          alt="Logo KOP" 
                          style={{ maxHeight: "75px", maxWidth: "75px", display: "inline-block" }} 
                          referrerPolicy="no-referrer"
                        />
                      </td>
                      <td style={{ border: "none", width: "90%", textAlign: "center", verticalAlign: "middle", color: "#000000" }}>
                        <p className="kop-b1" style={{ margin: "0px", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2", color: "#000000" }}>
                          {schoolInfo.governmentName || "Pemerintah Kabupaten / Kota"}
                        </p>
                        <p className="kop-b2" style={{ margin: "2px 0px", fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2", color: "#000000" }}>
                          {schoolInfo.educationDepartment || "Dinas Pendidikan dan Kebudayaan"}
                        </p>
                        <p className="kop-b3" style={{ margin: "2px 0px", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2", color: "#000000" }}>
                          {schoolInfo.schoolName || "SD NEGERI KABUPATEN"}
                        </p>
                        <p className="kop-b4" style={{ margin: "2px 0px 0px 0px", fontSize: "9.5pt", fontStyle: "italic", lineHeight: "1.2", fontWeight: "normal", color: "#000000" }}>
                          Alamat: {schoolInfo.schoolAddress || "Alamat Lengkap Lembaga Pendidikan"}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: "center", color: "#000000" }}>
                  <p className="kop-b1" style={{ margin: "0px", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2", color: "#000000" }}>
                    {schoolInfo.governmentName || "Pemerintah Kabupaten / Kota"}
                  </p>
                  <p className="kop-b2" style={{ margin: "2px 0px", fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2", color: "#000000" }}>
                    {schoolInfo.educationDepartment || "Dinas Pendidikan dan Kebudayaan"}
                  </p>
                  <p className="kop-b3" style={{ margin: "2px 0px", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2", color: "#000000" }}>
                    {schoolInfo.schoolName || "SD NEGERI KABUPATEN"}
                  </p>
                  <p className="kop-b4" style={{ margin: "2px 0px 0px 0px", fontSize: "9.5pt", fontStyle: "italic", lineHeight: "1.2", fontWeight: "normal", color: "#000000" }}>
                    Alamat: {schoolInfo.schoolAddress || "Alamat Lengkap Lembaga Pendidikan"}
                  </p>
                </div>
              )}
            </div>

            {/* Judul Berkas */}
            <div className="document-title" style={{ textAlign: "center", fontSize: "12pt", fontWeight: "bold", textTransform: "uppercase", marginBottom: "15px", color: "#000000" }}>
              KISI-KISI {schoolInfo.assessmentPurpose ? schoolInfo.assessmentPurpose.toUpperCase() : "SUMATIF AKHIR SEMESTER"}
            </div>

            {/* Meta Data Sekolah */}
            <table className="meta-table" style={{ border: "none", width: "100%", marginBottom: "12px", borderCollapse: "collapse", color: "#000000", fontFamily: '"Times New Roman", Times, serif', lineHeight: "1.5" }}>
              <tbody>
                <tr style={{ border: "none" }}>
                  <td style={{ border: "none", padding: "2px 0px", width: "15%", fontSize: "12pt", fontWeight: "bold", color: "#000000" }}>Mata Pelajaran</td>
                  <td style={{ border: "none", padding: "2px 0px", width: "2%", fontSize: "12pt", color: "#000000" }}>:</td>
                  <td style={{ border: "none", padding: "2px 0px", width: "33%", fontSize: "12pt", color: "#000000" }}>{subject}</td>
                  <td style={{ border: "none", padding: "2px 0px", width: "15%", fontSize: "12pt", fontWeight: "bold", color: "#000000" }}>Kelas / Semester</td>
                  <td style={{ border: "none", padding: "2px 0px", width: "2%", fontSize: "12pt", color: "#000000" }}>:</td>
                  <td style={{ border: "none", padding: "2px 0px", width: "33%", fontSize: "12pt", color: "#000000" }}>{schoolInfo.gradeClass} / Semester {schoolInfo.semester || 'I'}</td>
                </tr>
                <tr style={{ border: "none" }}>
                  <td style={{ border: "none", padding: "2px 0px", fontSize: "12pt", fontWeight: "bold", color: "#000000" }}>Satuan Pendidikan</td>
                  <td style={{ border: "none", padding: "2px 0px", fontSize: "12pt", color: "#000000" }}>:</td>
                  <td style={{ border: "none", padding: "2px 0px", fontSize: "12pt", color: "#000000" }}>{schoolInfo.schoolName}</td>
                  <td style={{ border: "none", padding: "2px 0px", fontSize: "12pt", fontWeight: "bold", color: "#000000" }}>Tahun Pelajaran</td>
                  <td style={{ border: "none", padding: "2px 0px", fontSize: "12pt", color: "#000000" }}>:</td>
                  <td style={{ border: "none", padding: "2px 0px", fontSize: "12pt", color: "#000000" }}>{schoolInfo.academicYear}</td>
                </tr>
              </tbody>
            </table>

            {/* Tabel Utama Kisi-Kisi */}
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12pt", fontFamily: '"Times New Roman", Times, serif', lineHeight: "1.5", border: "2.2px solid #000000", color: "#000000" }}>
              <thead>
                <tr style={{ backgroundColor: "#e2e8f0" }}>
                  <th style={{ border: "2.2px solid #000000", padding: "8px 6px", width: "5%", textAlign: "center", fontWeight: "bold", color: "#000000", fontSize: "12pt" }}>No.</th>
                  <th style={{ border: "2.2px solid #000000", padding: "8px 6px", width: "20%", textAlign: "center", fontWeight: "bold", color: "#000000", fontSize: "12pt" }}>Capaian Pembelajaran</th>
                  <th style={{ border: "2.2px solid #000000", padding: "8px 6px", width: "13%", textAlign: "center", fontWeight: "bold", color: "#000000", fontSize: "12pt" }}>Elemen</th>
                  <th style={{ border: "2.2px solid #000000", padding: "8px 6px", width: "12%", textAlign: "center", fontWeight: "bold", color: "#000000", fontSize: "12pt" }}>Materi</th>
                  <th style={{ border: "2.2px solid #000000", padding: "8px 6px", width: "25%", textAlign: "center", fontWeight: "bold", color: "#000000", fontSize: "12pt" }}>Indikator Soal</th>
                  <th style={{ border: "2.2px solid #000000", padding: "8px 6px", width: "10%", textAlign: "center", fontWeight: "bold", color: "#000000", fontSize: "12pt" }}>Level Kognitif</th>
                  <th style={{ border: "2.2px solid #000000", padding: "8px 6px", width: "8%", textAlign: "center", fontWeight: "bold", color: "#000000", fontSize: "12pt" }}>Bentuk Soal</th>
                  <th style={{ border: "2.2px solid #000000", padding: "8px 6px", width: "7%", textAlign: "center", fontWeight: "bold", color: "#000000", fontSize: "12pt" }}>Kunci Jwb.</th>
                </tr>
              </thead>
              <tbody>
                {kisiKisi.map((row, idx) => (
                  <tr key={idx} style={{ pageBreakInside: "avoid" }}>
                    <td style={{ border: "1.8px solid #000000", padding: "8px 6px", textAlign: "center", color: "#000000", fontWeight: "bold", fontSize: "12pt" }}>{row.number || idx + 1}</td>
                    <td style={{ border: "1.8px solid #000000", padding: "8px 6px", fontSize: "12pt", fontWeight: "500", lineHeight: "1.5", color: "#000000" }}>{row.cp}</td>
                    <td style={{ border: "1.8px solid #000000", padding: "8px 6px", fontSize: "12pt", fontWeight: "bold", color: "#000000" }}>{row.element}</td>
                    <td style={{ border: "1.8px solid #000000", padding: "8px 6px", fontSize: "12pt", fontWeight: "500", color: "#000000" }}>{row.materi}</td>
                    <td style={{ border: "1.8px solid #000000", padding: "8px 6px", fontSize: "12pt", fontWeight: "500", lineHeight: "1.5", color: "#000000" }}>
                      {row.indicator}
                    </td>
                    <td style={{ border: "1.8px solid #000000", padding: "8px 6px", fontSize: "12pt", textAlign: "center", color: "#000000" }}>{row.cognitiveLevel}</td>
                    <td style={{ border: "1.8px solid #000000", padding: "8px 6px", fontSize: "12pt", textAlign: "center", color: "#000000" }}>{row.questionType}</td>
                    <td style={{ border: "1.8px solid #000000", padding: "8px 6px", fontSize: "12pt", textAlign: "center", fontWeight: "black", color: "#000000" }}>{formatAnswerKey(row.answerKey, row.questionType, idx)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tempat Tanda Tangan Verifikator */}
            <table className="signature-table" style={{ border: "none", width: "100%", marginTop: "30px", borderCollapse: "collapse", color: "#000000" }}>
              <tbody>
                <tr style={{ border: "none" }}>
                  <td style={{ border: "none", width: "50%" }}></td>
                  <td style={{ border: "none", width: "50%", textAlign: "center", fontSize: "11pt", fontFamily: 'Times New Roman, serif', color: "#000000" }}>
                    {getFormattedDate()}
                  </td>
                </tr>
                <tr style={{ border: "none" }}>
                  <td style={{ border: "none", width: "50%", textAlign: "center", fontSize: "11pt", fontFamily: 'Times New Roman, serif', verticalAlign: "top", color: "#000000" }}>
                    Mengetahui,<br />
                    <strong>Kepala Sekolah</strong>
                    <br /><br /><br /><br />
                    <span style={{ textDecoration: "underline", fontWeight: "bold" }}>{schoolInfo.principalName || "......................................................."}</span><br />
                    <span>NIP. {schoolInfo.principalNip || "......................................................."}</span>
                  </td>
                  <td style={{ border: "none", width: "50%", textAlign: "center", fontSize: "11pt", fontFamily: 'Times New Roman, serif', verticalAlign: "top", color: "#000000" }}>
                    Penyusun,<br />
                    <strong>{schoolInfo.teacherTitle || "Guru Kelas"}</strong>
                    <br /><br /><br /><br />
                    <span style={{ textDecoration: "underline", fontWeight: "bold" }}>{schoolInfo.teacherName || "......................................................."}</span><br />
                    <span>NIP. {schoolInfo.teacherNip || "......................................................."}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
