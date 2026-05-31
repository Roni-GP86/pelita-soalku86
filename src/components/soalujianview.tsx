import React, { useRef, useState } from "react";
import { SchoolInfo, QuestionItem, KisiKisiRow } from "../types";
import PremiumLoader from "./premiumloader";
import QuestionWithImage from "./questionwithimage";
import { generateAllImages, hitungSoalBergambar } from "../imageutils";
import { 
  FileDown, 
  Printer, 
  FileText, 
  Check, 
  Award, 
  Eye, 
  EyeOff, 
  Pencil, 
  Sparkles, 
  RefreshCw, 
  Upload, 
  Link, 
  Image as ImageIcon, 
  Code, 
  X, 
  Trash2, 
  HelpCircle,
  CheckCircle2,
  Copy,
  Loader2
} from "lucide-react";

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

const QuestionIllustrationComponent = ({ q, subject }: { q: QuestionItem; subject?: string }) => {
  const [hasError, setHasError] = useState(false);
  const width = q.imageWidth || 420;
  const height = q.imageHeight || 210;

  if (q.svgContent && q.svgContent.trim()) {
    let cleanSvg = q.svgContent.trim();
    if (cleanSvg.startsWith("```")) {
      cleanSvg = cleanSvg.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
    }
    if (!cleanSvg.includes("<svg")) {
      return null;
    }
    return (
      <div 
        className="question-illustration print-avoid-break bg-white p-1 my-4 mx-auto border-2 border-black flex items-center justify-center overflow-hidden shadow-xs" 
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: "100%",
        }}
      >
        <div 
          style={{ width: "100%", height: "100%" }}
          className="flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full"
          dangerouslySetInnerHTML={{ __html: cleanSvg }}
        />
      </div>
    );
  }

  if (q.imageUrl && !hasError) {
    return (
      <div 
        className="question-illustration print-avoid-break bg-white p-1 my-4 mx-auto border-2 border-black flex items-center justify-center overflow-hidden shadow-xs" 
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: "100%",
        }}
      >
        <img 
          src={q.imageUrl} 
          alt={`Ilustrasi Soal ${q.number}`} 
          style={{
            height: "100%",
            width: "100%",
            objectFit: "cover",
            borderRadius: "0px"
          }} 
          referrerPolicy="no-referrer"
          onError={() => {
            setHasError(true);
          }}
        />
      </div>
    );
  }

  return null;
};

const renderQuestionIllustration = (q: QuestionItem, subject?: string) => {
  return <QuestionIllustrationComponent q={q} subject={subject} />;
};

const getCorrectOptionIdxWithOpts = (key: string, opts: string[]): number => {
  if (!opts || opts.length === 0) return -1;
  const cleanKey = key.trim().toUpperCase();
  
  if (/^[A-D](\.|$)/.test(cleanKey)) {
    const char = cleanKey.charAt(0);
    return char.charCodeAt(0) - 65;
  }
  
  const keyLower = cleanKey.toLowerCase();
  for (let i = 0; i < opts.length; i++) {
    const optLower = opts[i].toLowerCase();
    const cleanOpt = optLower.replace(/^[a-d][.\s)]+/, "").trim();
    const cleanKeyTxt = keyLower.replace(/^[a-d][.\s)]+/, "").trim();
    if (cleanOpt === cleanKeyTxt || optLower.includes(cleanKeyTxt) || cleanOpt.includes(cleanKeyTxt)) {
      return i;
    }
  }
  
  for (let i = 0; i < opts.length; i++) {
    if (opts[i].toUpperCase().includes(cleanKey) || cleanKey.includes(opts[i].toUpperCase())) {
      return i;
    }
  }
  
  return -1;
};

const cleanMateriInClient = (materiStr: string): string => {
  if (!materiStr) return "";
  let clean = materiStr.trim();
  const prefixesToRemove = [
    /^(materi|topik|pembelajaran|bahasan|pokok bahasan|konsep dasar|konsep|belajar tentang|belajar|mengenal tentang|mengenal|pemahaman tentang|pemahaman)\s+(tentang|mengenai)\s+/gi,
    /^(materi|topik|pembelajaran|bahasan|pokok bahasan|konsep dasar|konsep|belajar|mengenal|pemahaman)\s+/gi,
    /\.*$/g
  ];

  for (const regex of prefixesToRemove) {
    clean = clean.replace(regex, "");
  }

  clean = clean.trim();
  const words = clean.split(/[\s\-_/]+/);
  const uniqueWords: string[] = [];
  const seenWords = new Set<string>();

  for (const w of words) {
    const finalNorm = w.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    if (finalNorm && !seenWords.has(finalNorm)) {
      seenWords.add(finalNorm);
      uniqueWords.push(w);
    }
  }

  let finalMateri = uniqueWords.join(" ");
  if (finalMateri.length > 0) {
    finalMateri = finalMateri.charAt(0).toUpperCase() + finalMateri.slice(1);
  }
  return finalMateri;
};

const normalizeQuestionObj = (q: QuestionItem): QuestionItem => {
  const cleanMateriText = cleanMateriInClient(q.materi || "");

  if (q.questionType !== "Pilihan Ganda" || !q.options || q.options.length === 0) {
    return {
      ...q,
      materi: cleanMateriText
    };
  }
  
  let opts = [...q.options];
  while (opts.length < 4) {
    const letter = String.fromCharCode(65 + opts.length);
    opts.push(`${letter}. Pilihan ${letter}`);
  }
  if (opts.length > 4) {
    opts = opts.slice(0, 4);
  }
  
  opts = opts.map((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    const clean = opt.replace(/^[a-dA-D][.\s)]+/, "").trim();
    return `${letter}. ${clean || `Pilihan ${letter}`}`;
  });
  
  let correctIdx = getCorrectOptionIdxWithOpts(q.answerKey, opts);
  if (correctIdx === -1) {
    correctIdx = 0; // fallback to 'a'
  }
  
  return {
    ...q,
    materi: cleanMateriText,
    options: opts,
    answerKey: String.fromCharCode(97 + correctIdx) // 'a', 'b', 'c', or 'd'
  };
};

export const getQuestionMaxScore = (type: string, q?: QuestionItem): number => {
  const cleanType = (type || "").trim().toLowerCase();
  if (cleanType === "pilihan ganda") {
    return 1;
  } else if (cleanType === "isian singkat") {
    return 2;
  } else if (cleanType === "uraian") {
    return 5;
  } else if (cleanType.includes("kompleks")) {
    return 3; // default dynamic max score for complex multiple choice
  } else {
    if (q && q.options && q.options.length > 0) {
      return Math.min(q.options.length, 3);
    }
    return 2;
  }
};

const cleanForCompare = (s: string) => {
  if (!s) return "";
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
};

const renderStimulusText = (text: string, questionText?: string) => {
  if (!text) return null;

  // Prevent redundancy if stimulusText is already repeated or contained inside questionText
  const cleanStim = cleanForCompare(text);
  const cleanQText = cleanForCompare(questionText || "");
  if (cleanStim && cleanQText && (cleanQText.includes(cleanStim) || cleanStim.includes(cleanQText))) {
    return null;
  }

  const hasHtml = /<[a-z][\s\S]*>/i.test(text);
  if (hasHtml) {
    return (
      <span 
        style={{ fontStyle: "normal", color: "#000000", display: "block", marginBottom: "6px" }}
        dangerouslySetInnerHTML={{ __html: text }} 
      />
    );
  }

  const lines = text.split("\n");
  const parsedElements: React.ReactNode[] = [];
  let currentTableRows: string[][] = [];
  let isInsideTable = false;
  let hasTableDivider = false;
  
  const flushTable = (key: number) => {
    if (currentTableRows.length === 0) return;
    
    const tableHeaders = currentTableRows[0];
    const tableBody = currentTableRows.slice(hasTableDivider ? 2 : 1);
    
    parsedElements.push(
      <div key={`table-container-${key}`} className="overflow-x-auto max-w-full my-3 print:my-1">
        <table 
          key={`table-${key}`}
          style={{
            width: "100%",
            maxWidth: "100%",
            margin: "12px auto",
            borderCollapse: "collapse",
            border: "2.2px solid #000000",
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "12pt",
            lineHeight: "1.5",
            color: "#000000",
            pageBreakInside: "avoid"
          }}
          className="kisi-table mb-4 dynamic-stimulus-table print:my-2"
        >
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2.2px solid #000000" }}>
              {tableHeaders.map((cell, idx) => (
                <th 
                  key={`th-${idx}`} 
                  style={{
                    border: "1.8px solid #000000",
                    padding: "7px 12px",
                    fontWeight: "bold",
                    textAlign: "center",
                    whiteSpace: "normal",
                    wordBreak: "break-word"
                  }}
                >
                  {cell.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableBody.map((row, rowIdx) => (
              <tr key={`tr-${rowIdx}`} style={{ borderBottom: "1.2px solid #000000" }}>
                {row.map((cell, cellIdx) => {
                  const cleanCell = cell.trim();
                  // Match integers, fractions, or short units (e.g. "kg", "cm", "butir") to keep columns perfectly aligned
                  const isNumeric = /^[0-9\-\.,\s]+$/.test(cleanCell) || 
                                    /^\d+\/\d+$/.test(cleanCell) || 
                                    cleanCell.toLowerCase().endsWith("kg") || 
                                    cleanCell.toLowerCase().endsWith("cm") || 
                                    cleanCell.toLowerCase().endsWith("gram") || 
                                    cleanCell.toLowerCase().endsWith("butir") || 
                                    cleanCell.toLowerCase().endsWith("orang") || 
                                    cleanCell.toLowerCase().endsWith("buah");
                  return (
                    <td 
                      key={`td-${cellIdx}`} 
                      style={{
                        border: "1.5px solid #000000",
                        padding: "6px 12px",
                        textAlign: isNumeric ? "center" : "left",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere"
                      }}
                    >
                      {cleanCell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    
    currentTableRows = [];
    isInsideTable = false;
    hasTableDivider = false;
  };
  
  let elementKey = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const origLine = lines[i];
    const trimmed = origLine.trim();
    
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2) {
      isInsideTable = true;
      const cells = trimmed.split("|").slice(1, -1);
      const isDivider = cells.every(c => c.trim().replace(/[\-\s:]/g, "") === "");
      if (isDivider) {
        hasTableDivider = true;
      }
      currentTableRows.push(cells);
    } else {
      if (isInsideTable) {
        flushTable(elementKey++);
      }
      
      if (trimmed.length > 0) {
        parsedElements.push(
          <div 
            key={`txt-${elementKey++}`}
            style={{ 
              fontStyle: "normal", 
              color: "#000000", 
              marginBottom: "6px",
              lineHeight: "1.5",
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: "12pt"
            }}
          >
            {trimmed}
          </div>
        );
      } else {
        parsedElements.push(<div key={`sp-${elementKey++}`} className="h-1.5" />);
      }
    }
  }
  
  if (isInsideTable) {
    flushTable(elementKey++);
  }
  
  return (
    <div className="stimulus-wrapper mb-3 block print:mb-2">
      {parsedElements}
    </div>
  );
};

const cleanQuestionTextForDisplay = (text: string, type: string): string => {
  if (!text) return "";
  let clean = text.trim();

  // 1. Remove "Jawaban:" or "Jawaban :" or "JAWABAN" or "Jawab:" or "Jawab :" and any trailing dots, spaces, underscores, or lines
  clean = clean.replace(/jawab(an)?\s*:?\s*[.\s_\-()]+/gi, "");
  // Also match and remove patterns like ": ....................." or ": ___________________" or just long underscores/dots at the end
  clean = clean.replace(/:\s*[.\s_\-()]{3,}/g, "");

  const isIsian = type === "Isian Singkat" || type === "Isian";
  const isUraian = type === "Uraian";

  // 2. If there are question marks "?" at any point, and everything after it is just junk/dots/lines/parentheses/spaces,
  // make it end exactly at "?" with no trailing dots or lines at all.
  const qMarkIndex = clean.lastIndexOf("?");
  if (qMarkIndex !== -1) {
    const trailingPart = clean.slice(qMarkIndex + 1).trim();
    if (/^[.\s_\-()]*$/.test(trailingPart)) {
      return clean.slice(0, qMarkIndex + 1).trim();
    }
  }

  // 3. Remove long trailing sequences of dots or underscores (3 or more)
  clean = clean.replace(/[.\s_\-()]{3,}$/, "").trim();

  // 4. Handle exact endings based on type:
  if (isIsian) {
    if (/[._\-]+$/.test(clean)) {
      clean = clean.replace(/[._\-]+$/, "").trim();
    }
    if (!clean.endsWith("?")) {
      clean = clean + " ...";
    }
  } else if (isUraian) {
    if (/[._\-]+$/.test(clean)) {
      clean = clean.replace(/[._\-]+$/, "").trim();
    }
    if (!clean.endsWith("?")) {
      clean = clean + " ....";
    }
  }

  return clean.trim();
};

interface SoalUjianViewProps {
  schoolInfo: SchoolInfo;
  subject: string;
  questions: QuestionItem[];
  onUpdateQuestions?: (questions: QuestionItem[]) => void;
  kisiKisi?: KisiKisiRow[];
  onUpdateKisiKisi?: (kisiKisi: KisiKisiRow[]) => void;
  onSaveToBankSoal?: () => void;
  setSuccessToast?: (msg: string | null) => void;
  setWarningToast?: (msg: string | null) => void;
  isAlreadySaved?: boolean;
}

export default function SoalUjianView({ 
  schoolInfo, 
  subject, 
  questions, 
  onUpdateQuestions,
  kisiKisi,
  onUpdateKisiKisi,
  onSaveToBankSoal,
  setSuccessToast,
  setWarningToast,
  isAlreadySaved
}: SoalUjianViewProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [activeTab, setActiveTab ] = useState<"siswa" | "kunci" | "pedoman">("siswa");
  const [studentScores, setStudentScores] = useState<Record<number, number>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [showScoringMenu, setShowScoringMenu] = useState(false);
  const [generatingBatchImages, setGeneratingBatchImages] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ percent: 0, current: 0, total: 0 });

  // States for interactive inline prompt and image generator for each question on-demand
  const [activeQuestionForImage, setActiveQuestionForImage] = useState<number | null>(null);
  const [inlinePrompts, setInlinePrompts] = useState<Record<number, string>>({});
  const [loadingPrompts, setLoadingPrompts] = useState<Record<number, boolean>>({});
  const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({});
  const [inlineErrors, setInlineErrors] = useState<Record<number, string>>({});
  const [copiedPromptId, setCopiedPromptId] = useState<number | null>(null);
  const [tempImages, setTempImages] = useState<Record<number, { imageUrl?: string; svgContent?: string }>>({});

  // States for detailed edit modal and image configuration
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [modalTab, setModalTab] = useState<"content" | "media">("content");
  const [imageError, setImageError] = useState<string | null>(null);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [bankSaveSuccess, setBankSaveSuccess] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState(false);

  const handleBankSave = async () => {
    if (!onSaveToBankSoal || isAlreadySaved || isSavingToBank) return;
    setIsSavingToBank(true);
    try {
      await onSaveToBankSoal();
      setBankSaveSuccess(true);
    } catch (e: any) {
      console.error(e);
      if (setWarningToast) {
        setWarningToast("Gagal menyimpan ke Bank Soal SD.");
      }
    } finally {
      setIsSavingToBank(false);
    }
  };

  const handleSaveModal = () => {
    if (!editingQuestion) return;
    const updated = questions.map(q => q.number === editingQuestion.number ? editingQuestion : q);
    if (onUpdateQuestions) {
      onUpdateQuestions(updated);
    }
    
    if (kisiKisi && onUpdateKisiKisi) {
      const updatedKisi = kisiKisi.map((row) => {
        if (row.number === editingQuestion.number) {
          return {
            ...row,
            materi: editingQuestion.materi || row.materi
          };
        }
        return row;
      });
      onUpdateKisiKisi(updatedKisi);
    }
    
    setSaveSuccess(true);
    if (setSuccessToast) {
      setSuccessToast(`Soal nomor ${editingQuestion.number} berhasil diperbarui.`);
    }
    setTimeout(() => {
      setSaveSuccess(false);
      setEditingQuestion(null);
    }, 1200);
  };

  const handleRemoveImage = () => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      imageUrl: undefined,
      svgContent: undefined,
      imagenPrompt: undefined,
      imagePrompt: undefined
    });
  };

  const [generatingModalPrompt, setGeneratingModalPrompt] = useState(false);

  const handleModalGeneratePromptAI = async () => {
    if (!editingQuestion) return;
    setGeneratingModalPrompt(true);
    setImageError(null);
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-api-key": localStorage.getItem("ttu_user_api_key") || ""
        },
        body: JSON.stringify({
          subject,
          question: editingQuestion,
          userApiKey: localStorage.getItem("ttu_user_api_key") || ""
        })
      });

      if (!res.ok) {
        throw new Error("Gagal memperoleh saran prompt dari asisten kecerdasan.");
      }

      const data = await res.json();
      if (data.prompt) {
        setEditingQuestion({
          ...editingQuestion,
          imagenPrompt: data.prompt
        });
        if (setSuccessToast) {
          setSuccessToast("Prompt materi berbasis AI berhasil dirakit!");
        }
      } else {
        throw new Error("Format saran prompt kosong.");
      }
    } catch (err: any) {
      console.error(err);
      setImageError(err.message || "Gagal membangkitkan materi prompt.");
    } finally {
      setGeneratingModalPrompt(false);
    }
  };

  const handlePasteImageOrUrl = (e: React.ClipboardEvent) => {
    // 1. Process files first (e.g. copied file or screenshot paste)
    const items = e.clipboardData.items;
    let imageItemFound = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          imageItemFound = true;
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            setEditingQuestion(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                imageUrl: result,
                svgContent: undefined // clear SVG
              };
            });
            setModalTab("media"); // Auto-switch to media tab so user sees it instantly
            if (setSuccessToast) {
              setSuccessToast("Kopi-paste gambar dari clipboard berhasil ditempel langsung!");
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }

    if (imageItemFound) return;

    // 2. Process text containing image URL
    const activeEl = document.activeElement;
    const isTextEditing = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
    const isUrlField = activeEl && (activeEl.getAttribute("type") === "url" || activeEl.id === "image-url-input");

    const pastedText = e.clipboardData.getData("text");
    if (pastedText) {
      const trimmed = pastedText.trim();
      const isImageUrl = trimmed.startsWith("http://") || 
                         trimmed.startsWith("https://") || 
                         trimmed.startsWith("data:image/");
      
      // If it is a valid image/web URL and either we are not typing in a text field,
      // or we are specifically focusing the Image URL entry field, intercept it and render.
      if (isImageUrl) {
        if (!isTextEditing || isUrlField) {
          e.preventDefault();
          setEditingQuestion(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              imageUrl: trimmed,
              svgContent: undefined // clear SVG
            };
          });
          setModalTab("media"); // Auto-switch to media tab so user sees it instantly
          if (setSuccessToast) {
            setSuccessToast("Tautan gambar otomatis diubah menjadi gambar pendukung soal!");
          }
          return;
        }
      }
    }
  };

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingQuestion) return;
    
    setImageError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (file.type.includes("svg+xml") || file.name.endsWith(".svg")) {
        setEditingQuestion({
          ...editingQuestion,
          svgContent: result,
          imageUrl: undefined
        });
      } else {
        setEditingQuestion({
          ...editingQuestion,
          imageUrl: result,
          svgContent: undefined
        });
      }
    };
    reader.onerror = () => {
      setImageError("Gagal membaca file gambar.");
    };
    reader.readAsDataURL(file);
  };

  const handleRegenerateImageAI = async () => {
    if (!editingQuestion) return;
    const promptText = editingQuestion.imagenPrompt || "";
    setRegeneratingImage(true);
    setImageError(null);

    try {
      const res = await fetch("/api/generate-individual-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-api-key": localStorage.getItem("ttu_user_api_key") || ""
        },
        body: JSON.stringify({
          subject,
          question: {
            ...editingQuestion,
            imagenPrompt: promptText,
            imagePrompt: promptText
          },
          userApiKey: localStorage.getItem("ttu_user_api_key") || ""
        })
      });

      if (!res.ok) {
        let errMsg = "Gagal membuat gambar AI.";
        try {
          const errText = await res.text();
          if (res.status === 429) {
            errMsg = "Silakan coba lagi. Sesi batas permintaan AI terlampaui.";
          } else {
            try {
              const errJson = JSON.parse(errText);
              errMsg = errJson.error || errMsg;
            } catch {
              if (errText) errMsg = errText;
            }
          }
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.svgContent && data.svgContent.trim()) {
        setEditingQuestion({
          ...editingQuestion,
          svgContent: data.svgContent,
          imageUrl: undefined
        });
      } else if (data.imageUrl) {
        setEditingQuestion({
          ...editingQuestion,
          imageUrl: data.imageUrl,
          svgContent: undefined
        });
      } else {
        throw new Error("Format gambar kosong dari server AI.");
      }
    } catch (err: any) {
      console.error(err);
      setImageError(err.message || "Gagal membangun gambar AI.");
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleToggleAktifkanGambar = (q: QuestionItem) => {
    if (activeQuestionForImage === q.number) {
      setActiveQuestionForImage(null);
    } else {
      setActiveQuestionForImage(q.number);
      if (!inlinePrompts[q.number]) {
        setInlinePrompts(prev => ({
          ...prev,
          [q.number]: q.imagenPrompt || q.imagePrompt || ""
        }));
      }
    }
  };

  const handleGeneratePromptInline = async (q: QuestionItem) => {
    setLoadingPrompts(prev => ({ ...prev, [q.number]: true }));
    setInlineErrors(prev => ({ ...prev, [q.number]: "" }));
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-api-key": localStorage.getItem("ttu_user_api_key") || ""
        },
        body: JSON.stringify({
          subject,
          question: q,
          userApiKey: localStorage.getItem("ttu_user_api_key") || ""
        })
      });

      if (!res.ok) {
        throw new Error("Gagal memperoleh saran prompt dari asisten kecerdasan.");
      }

      const data = await res.json();
      if (data.prompt) {
        setInlinePrompts(prev => ({
          ...prev,
          [q.number]: data.prompt
        }));
      } else {
        throw new Error("Format saran prompt kosong.");
      }
    } catch (err: any) {
      console.error(err);
      setInlineErrors(prev => ({ ...prev, [q.number]: err.message || "Gagal membangkitkan materi prompt." }));
    } finally {
      setLoadingPrompts(prev => ({ ...prev, [q.number]: false }));
    }
  };

  const handleCopyPromptInline = (number: number, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPromptId(number);
    setTimeout(() => {
      setCopiedPromptId(null);
    }, 2000);
  };

  const handleGenerateImageInline = async (q: QuestionItem) => {
    const promptText = inlinePrompts[q.number] || "";
    if (generatingImages[q.number]) return;

    setGeneratingImages(prev => ({ ...prev, [q.number]: true }));
    setInlineErrors(prev => ({ ...prev, [q.number]: "" }));

    try {
      const res = await fetch("/api/generate-individual-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-api-key": localStorage.getItem("ttu_user_api_key") || ""
        },
        body: JSON.stringify({
          subject,
          question: {
            ...q,
            imagenPrompt: promptText,
            imagePrompt: promptText
          },
          userApiKey: localStorage.getItem("ttu_user_api_key") || ""
        })
      });

      if (!res.ok) {
        let errMsg = "Materi pelajaran Anda gagal melahirkan gambar di server AI.";
        try {
          const errText = await res.text();
          if (errText.includes("Rate exceeded") || errText.includes("rate limit") || res.status === 429) {
            errMsg = "Silakan klik Generate kembali dalam beberapa detik. Sesi kuota AI terlampaui.";
          } else {
            try {
              const errJson = JSON.parse(errText);
              errMsg = errJson.error || errMsg;
            } catch {
              if (errText && errText.trim().length > 0) errMsg = errText.trim();
            }
          }
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.svgContent && data.svgContent.trim()) {
        setTempImages(prev => ({
          ...prev,
          [q.number]: { svgContent: data.svgContent, imageUrl: "" }
        }));
      } else if (data.imageUrl) {
        setTempImages(prev => ({
          ...prev,
          [q.number]: { imageUrl: data.imageUrl, svgContent: "" }
        }));
      } else {
        throw new Error("Sistem AI gagal melahirkan visualisasi atau SVG pembelajaran.");
      }
    } catch (err: any) {
      console.error(err);
      setInlineErrors(prev => ({ ...prev, [q.number]: err.message || "Gagal membangun gambar AI." }));
    } finally {
      setGeneratingImages(prev => ({ ...prev, [q.number]: false }));
    }
  };

  const handleSimpanImageInline = (q: QuestionItem) => {
    const temp = tempImages[q.number];
    if (!temp) return;

    const promptText = inlinePrompts[q.number] || q.imagenPrompt || q.imagePrompt || "";
    const updatedQ = {
      ...q,
      imageUrl: temp.imageUrl || undefined,
      svgContent: temp.svgContent || undefined,
      imagenPrompt: promptText,
      imagePrompt: promptText
    };
    updateSingleQuestion(q.number, updatedQ);
    if (setSuccessToast) {
      setSuccessToast(`Visualisasi gambar untuk soal nomor ${q.number} berhasil diterapkan.`);
    }
    // clear temp image preview
    setTempImages(prev => {
      const next = { ...prev };
      delete next[q.number];
      return next;
    });
  };

  const handleResetImageInline = (q: QuestionItem) => {
    const updatedQ = {
      ...q,
      imageUrl: undefined,
      svgContent: undefined,
      imagenPrompt: undefined,
      imagePrompt: undefined
    };
    updateSingleQuestion(q.number, updatedQ);
    setTempImages(prev => {
      const next = { ...prev };
      delete next[q.number];
      return next;
    });
    setInlinePrompts(prev => ({ ...prev, [q.number]: "" }));
  };

  const renderActiveImagePanel = (q: QuestionItem) => {
    if (activeQuestionForImage !== q.number || isExporting) return null;

    const currentPrompt = inlinePrompts[q.number] || "";
    const tempImg = tempImages[q.number];
    const hasCommittedImage = !!(q.imageUrl || q.svgContent);
    const hasTempImage = !!(tempImg && (tempImg.imageUrl || tempImg.svgContent));

    return (
      <div className="no-print my-4 p-5 bg-white border-2 border-slate-300 rounded-2xl space-y-4 shadow-xl max-w-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150 pb-3">
          <div className="flex items-center gap-2 font-black text-slate-800 text-sm">
            <span className="text-xl">📷</span> Bingkai Pembuat Gambar AI Soal #{q.number}
          </div>
          <button
            type="button"
            onClick={() => setActiveQuestionForImage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 transition-colors cursor-pointer"
          >
            &times; Tutup
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-sans">
          Rumuskan gambar pembelajaran yang selaras dengan materi kelas Anda. Anda bisa membiarkan AI menyusun deskripsi terbaik untuk Anda, menyalinnya, atau menulis sendiri sesuai keinginan.
        </p>

        {/* Kotak Prompt */}
        <div className="space-y-1.5 font-sans">
          <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
            Deskripsi Gambar (Prompt AI)
          </label>
          <textarea
            className="w-full min-h-[90px] p-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium leading-relaxed transition-all"
            placeholder="Gambarkan ilustrasi yang relevan untuk soal ini (bisa menggunakan Bahasa Indonesia atau Inggris)..."
            value={currentPrompt}
            onChange={(e) => setInlinePrompts(prev => ({ ...prev, [q.number]: e.target.value }))}
          />
        </div>

        {/* Action Buttons for Prompting */}
        <div className="flex flex-wrap gap-2 items-center justify-between pt-1 font-sans">
          <div className="flex gap-2">
            {/* Fitur Buat Prompt */}
            <button
              type="button"
              disabled={loadingPrompts[q.number]}
              onClick={() => handleGeneratePromptInline(q)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loadingPrompts[q.number] ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-indigo-500" />
                  Mendesain Deskripsi...
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-indigo-500" />
                  Buat Prompt AI
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!currentPrompt}
              onClick={() => handleCopyPromptInline(q.number, currentPrompt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                copiedPromptId === q.number
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              {copiedPromptId === q.number ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy size={13} className="text-slate-500" />
                  Salin Prompt
                </>
              )}
            </button>
          </div>

          <div className="flex gap-2 items-center">
            {/* Generate Button */}
            <button
              type="button"
              disabled={generatingImages[q.number] || !currentPrompt}
              onClick={() => handleGenerateImageInline(q)}
              className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {generatingImages[q.number] ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Membuat Gambar...
                </>
              ) : (
                <>
                  <span>🚀 Generate Gambar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Preview Container inside the edit card - Displayed unconditionally to allow users to see placeholder, size, and layout */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 font-sans animate-fade-in">
          <div className="text-[11px] font-black text-slate-700 flex items-center justify-between">
            <span>🖼️ PRATINJAU VISUALISASI SEBELUM DISIMPAN SOAL #{q.number}:</span>
            {hasTempImage ? (
              <span className="text-amber-600 font-extrabold uppercase animate-pulse">
                ● Gambar Baru (Belum Disimpan)
              </span>
            ) : hasCommittedImage ? (
              <span className="text-emerald-600 font-bold">
                ● Gambar Aktif di Soal (Tersimpan)
              </span>
            ) : (
              <span className="text-slate-550 font-bold">
                ● Belum Ada Gambar Aktif
              </span>
            )}
          </div>

          {/* Sizing frame visual preview */}
          <div 
            className="flex items-center justify-center p-2 bg-white rounded-xl border border-slate-200 mx-auto overflow-hidden transition-all duration-300 shadow-xs"
            style={{
              width: `${q.imageWidth || 380}px`,
              height: `${q.imageHeight || 190}px`,
              maxWidth: "100%",
            }}
          >
            {hasTempImage ? (
              tempImg.imageUrl ? (
                <img
                  src={tempImg.imageUrl}
                  alt="Pratinjau Gambar Baru"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : tempImg.svgContent ? (
                <div
                  className="h-full w-full flex items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full [&_svg]:w-full [&_svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: tempImg.svgContent }}
                />
              ) : null
            ) : q.imageUrl ? (
              <img
                src={q.imageUrl}
                alt="Pratinjau Gambar Aktif"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : q.svgContent ? (
              <div
                className="h-full w-full flex items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full [&_svg]:w-full [&_svg]:h-full"
                dangerouslySetInnerHTML={{ __html: q.svgContent }}
              />
            ) : (
              <div className="text-center p-4">
                <p className="text-[11px] font-bold text-slate-400">Bingkai Gambar Kosong ({q.imageWidth || 380} × {q.imageHeight || 190}px)</p>
                <p className="text-[9.5px] text-slate-400 font-semibold leading-relaxed">Sumbu dimensi tinggi & lebar siap diisi gambar pembelajaran</p>
              </div>
            )}
          </div>

          {/* Sizing controls directly editable inline inside active image panel! */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <span className="text-sm">📏</span>
              <h5 className="text-[11px] font-black uppercase text-slate-800">Atur Dimensi Ukuran Gambar Layout Soal #{q.number}</h5>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => updateSingleQuestion(q.number, { ...q, imageWidth: 120, imageHeight: 80 })}
                className={`py-1 text-[9.5px] font-black rounded-lg border transition-all cursor-pointer ${
                  (q.imageWidth === 120 && q.imageHeight === 80)
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-slate-50 border-slate-300 text-slate-705 hover:bg-slate-100"
                }`}
              >
                Kecil (120×80)
              </button>
              <button
                type="button"
                onClick={() => updateSingleQuestion(q.number, { ...q, imageWidth: 240, imageHeight: 140 })}
                className={`py-1 text-[9.5px] font-black rounded-lg border transition-all cursor-pointer ${
                  (!q.imageWidth || (q.imageWidth === 240 && q.imageHeight === 140))
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-705 hover:bg-slate-100"
                }`}
              >
                Sedang (240×140)
              </button>
              <button
                type="button"
                onClick={() => updateSingleQuestion(q.number, { ...q, imageWidth: 380, imageHeight: 190 })}
                className={`py-1 text-[9.5px] font-black rounded-lg border transition-all cursor-pointer ${
                  (q.imageWidth === 380 && q.imageHeight === 190)
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-705 hover:bg-slate-100"
                }`}
              >
                Besar (380×190)
              </button>
              <button
                type="button"
                onClick={() => updateSingleQuestion(q.number, { ...q, imageWidth: 500, imageHeight: 280 })}
                className={`py-1 text-[9.5px] font-black rounded-lg border transition-all cursor-pointer ${
                  (q.imageWidth === 500 && q.imageHeight === 280)
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-705 hover:bg-slate-100"
                }`}
              >
                Luas (500×280)
              </button>
            </div>

            {/* Custom Inputs and Sliders for Precise Custom Dimensions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Width */}
              <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-700">
                  <span>Lebar Gambar:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="60"
                      max="600"
                      value={q.imageWidth || 380}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 380;
                        updateSingleQuestion(q.number, { ...q, imageWidth: Math.min(600, Math.max(60, val)) });
                      }}
                      className="w-14 text-center text-[10px] font-mono font-bold bg-white border border-slate-350 rounded px-1 text-indigo-750"
                    />
                    <span className="font-mono text-[9px] text-slate-500 font-bold">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="60"
                  max="600"
                  step="10"
                  value={q.imageWidth || 380}
                  onChange={(e) => updateSingleQuestion(q.number, { ...q, imageWidth: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Height */}
              <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-700">
                  <span>Tinggi Gambar Layout:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="40"
                      max="400"
                      value={q.imageHeight || 190}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 190;
                        updateSingleQuestion(q.number, { ...q, imageHeight: Math.min(400, Math.max(40, val)) });
                      }}
                      className="w-14 text-center text-[10px] font-mono font-bold bg-white border border-slate-350 rounded px-1 text-indigo-750"
                    />
                    <span className="font-mono text-[9px] text-slate-500 font-bold">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="40"
                  max="400"
                  step="10"
                  value={q.imageHeight || 190}
                  onChange={(e) => updateSingleQuestion(q.number, { ...q, imageHeight: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1.5">
            <button
              type="button"
              onClick={() => handleResetImageInline(q)}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black transition-all cursor-pointer border border-rose-200"
            >
              🗑️ Batalkan &amp; Hapus Gambar
            </button>

            {hasTempImage && (
              <button
                type="button"
                onClick={() => handleSimpanImageInline(q)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1 hover:-translate-y-0.5"
              >
                💾 Gunakan &amp; Simpan Gambar
              </button>
            )}
          </div>
        </div>

        {inlineErrors[q.number] && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] leading-relaxed font-semibold font-sans">
            ⚠️ <strong>Gagal:</strong> {inlineErrors[q.number]}
          </div>
        )}

        {hasCommittedImage && !hasTempImage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[11px] flex items-center gap-1.5 font-bold font-sans">
            <span>🎉</span> Gambar saat ini sudah tersimpan dan menyatu di naskah ujian resmi Anda!
          </div>
        )}
      </div>
    );
  };

  const handleBatchGenerateImages = async () => {
    if (generatingBatchImages) return;
    setGeneratingBatchImages(true);
    setBatchProgress({ percent: 0, current: 0, total: 0 });
    try {
      const updated = await generateAllImages(subject, questions, (percent, current, total) => {
        setBatchProgress({ percent, current, total });
      });
      if (onUpdateQuestions) {
        onUpdateQuestions(updated);
      }
    } catch (err) {
      console.error("Batch image generation failed:", err);
    } finally {
      setGeneratingBatchImages(false);
    }
  };

  const printAreaRef = useRef<HTMLDivElement>(null);

  const renderQuestionIllustration = (q: QuestionItem, subj?: string) => {
    return (
      <QuestionWithImage
        q={q}
        subject={subj || subject}
        onUpdateQuestion={(updatedQ) => {
          if (onUpdateQuestions) {
            const nextQuestions = questions.map(item => item.number === q.number ? updatedQ : item);
            onUpdateQuestions(nextQuestions);
          }
        }}
        disabled={isExporting}
      />
    );
  };

  const handleDownloadPedomanDirectly = async (format: "word" | "pdf") => {
    if (!questions || questions.length === 0) return;
    const prevTab = activeTab;
    setActiveTab("pedoman");
    // Wait for the DOM to render the pedoman block
    await new Promise((resolve) => setTimeout(resolve, 350));
    
    try {
      if (format === "word") {
        await handleDownloadWord();
      } else {
        await handleDownloadPdf();
      }
    } catch (err) {
      console.error("Direct download error:", err);
    } finally {
      // Revert the active tab to restore original user view context
      setActiveTab(prevTab);
    }
  };



  const getFormattedDate = () => {
    const place = schoolInfo.documentPlace || "Fatubai";
    if (schoolInfo.documentDate) {
      return `${place}, ${schoolInfo.documentDate}`;
    }
    const today = new Date();
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${place}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
  };

  const handleDownloadWord = async () => {
    if (!questions || questions.length === 0) return;

    setDownloadingWord(true);
    setIsExporting(true);
    // Smooth delay for premium circular progress presentation
    await new Promise((resolve) => setTimeout(resolve, 2200));

    const fileSuffix = activeTab === "siswa" 
      ? "Naskah_Soal" 
      : activeTab === "kunci" 
        ? "Kunci_Jawaban" 
        : "Pedoman_Penskoran";
    const headerWord = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Naskah Soal Ujian</title>
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
            size: 595.3pt 841.9pt; /* A4 Portrait size */
            margin: 2.0cm 2.0cm 2.0cm 2.0cm;
          }
          div.Section1 { 
            page: Section1; 
          }
          body {
            font-family: "Times New Roman", "serif";
            font-size: 12pt;
            line-height: 1.5;
            color: #000000;
          }
          p { margin: 0px 0px 5px 0px; }
          .kop {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 3.5px double black;
            padding-bottom: 10px;
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
            margin-top: 10px;
            margin-bottom: 20px;
            text-decoration: underline;
          }
          .identitas-table {
            border: 1px solid black;
            width: 100%;
            margin-bottom: 25px;
            border-collapse: collapse;
          }
          .identitas-table td {
            border: 1px solid black;
            padding: 6px;
            font-size: 12pt;
            line-height: 1.5;
          }
          .stimulus {
            background-color: #ffffff;
            border-left: 3px solid #000000;
            padding: 8px 12px;
            margin: 10px 0px;
            font-style: normal;
            font-size: 12pt;
            line-height: 1.5;
          }
          .question-block {
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .options-grid {
            margin-left: 20px;
            margin-top: 4px;
            margin-bottom: 10px;
          }
          .options-grid td {
            padding: 2px 0px;
            font-size: 12pt;
            line-height: 1.5;
          }
          .key-block {
            background-color: #f0fdf4;
            border: 1px dashed #16a34a;
            padding: 6px 10px;
            margin-top: 5px;
            font-size: 10pt;
            color: #14532d;
          }
          .signature-table {
            width: 100%;
            margin-top: 35px;
            border-collapse: collapse;
          }
          .signature-table td {
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

    const payloadId = activeTab === "siswa" 
      ? "soal-siswa-payload" 
      : activeTab === "kunci" 
        ? "soal-kunci-payload" 
        : "soal-pedoman-payload";
    const contentsElement = document.getElementById(payloadId);
    if (!contentsElement) {
      setIsExporting(false);
      return;
    }

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
    link.download = `${fileSuffix}_${subject.replace(/\s+/g, '_')}_${schoolInfo.gradeClass.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsExporting(false);
    setDownloadingWord(false);
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setDownloadingPdf(true);
    setIsExporting(true);

    // Smooth delay for premium circular progress presentation
    await new Promise((resolve) => setTimeout(resolve, 2200));

    try {
      const html2pdf = await getHtml2Pdf();
      const fileSuffix = activeTab === "siswa" 
        ? "Naskah_Soal" 
        : activeTab === "kunci" 
          ? "Kunci_Jawaban" 
          : "Pedoman_Penskoran";
      const filename = `${fileSuffix}_${subject.replace(/\s+/g, "_")}_${schoolInfo.gradeClass.replace(/\s+/g, "_")}.pdf`;
      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number], // specify [top, left, bottom, right] explicitly to ensure clean upper and lower page boundaries
        filename: filename,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak: { 
          mode: ["css", "legacy"], 
          avoid: [".signature-table", "tr", ".key-block", ".question-block", "h4", "table", ".formula-block", ".identitas-table"] 
        }
      };

      await withPdfStylesPatch(async () => {
        await html2pdf().set(opt).from(printAreaRef.current).save();
      });
    } catch (err: any) {
      console.error("Gagal mendownload PDF:", err);
    } finally {
      setIsExporting(false);
      setDownloadingPdf(false);
    }
  };



  const updateSingleQuestion = (questionNumber: number, updatedQ: QuestionItem) => {
    if (onUpdateQuestions) {
      const newQuestions = questions.map((q) => q.number === questionNumber ? updatedQ : q);
      onUpdateQuestions(newQuestions);
    }

    if (kisiKisi && onUpdateKisiKisi) {
      const hasImage = !!(updatedQ.imageUrl || (updatedQ.svgContent && updatedQ.svgContent.trim().length > 0));
      const newKisiKisi = kisiKisi.map((row) => {
        if (row.number === questionNumber) {
          const original = row.originalIndicator || row.indicator;
          if (hasImage) {
            // Replace known presentation/text-intro words with "GAMBAR"
            const match = original.match(/^(disajikan)\s+(kutipan|teks|bacaan|pernyataan|deskripsi|tabel|bagan|diagram|grafik|cerita|informasi|situasi|peta)\b/i);
            let updatedIndicator = original;
            if (match) {
              updatedIndicator = original.replace(/^(disajikan)\s+(kutipan|teks|bacaan|pernyataan|deskripsi|tabel|bagan|diagram|grafik|cerita|informasi|situasi|peta)\b/i, "Disajikan GAMBAR");
            } else {
              if (!/^disajikan\s+gambar\b/i.test(original)) {
                if (/^disajikan\s+/i.test(original)) {
                  updatedIndicator = original.replace(/^(disajikan)\s+/i, "Disajikan GAMBAR ");
                } else {
                  updatedIndicator = "Disajikan GAMBAR " + original;
                }
              }
            }
            return {
              ...row,
              originalIndicator: original,
              indicator: updatedIndicator
            };
          } else {
            // Revert back to original
            return {
              ...row,
              indicator: original,
              originalIndicator: undefined
            };
          }
        }
        return row;
      });
      onUpdateKisiKisi(newKisiKisi);
    }
  };



  // Group questions by type to follow formal exam layout sections:
  // Bagian I: Pilihan Ganda, Bagian II: Isian Singkat, Bagian III: Uraian
  const pgQuestions = questions.filter((q) => q.questionType === "Pilihan Ganda");
  const isianQuestions = questions.filter((q) => q.questionType === "Isian Singkat");
  const uraianQuestions = questions.filter((q) => q.questionType === "Uraian");

  return (
    <div id="soal-ujian-view-root" className="space-y-6">
      {/* PREMIUM GAME-STYLE EXPORT LOADER */}
      <PremiumLoader
        active={downloadingWord}
        title={
          activeTab === "siswa"
            ? "Mengekspor Lembar Soal ke Word"
            : activeTab === "kunci"
              ? "Mengekspor Kunci Jawaban ke Word"
              : "Mengekspor Pedoman Penskoran ke Word"
        }
        subtitle="Memetakan susunan naskah ke format dokumen Microsoft Word (.doc)..."
        type="download"
      />
      <PremiumLoader
        active={downloadingPdf}
        title={
          activeTab === "siswa"
            ? "Mengekspor Lembar Soal ke PDF"
            : activeTab === "kunci"
              ? "Mengekspor Kunci Jawaban ke PDF"
              : "Mengekspor Pedoman Penskoran ke PDF"
        }
        subtitle="Memformat dokumen siap cetak A4 Portrait, menyusun lampiran tanda tangan, dan memindai dokumen ke PDF..."
        type="download"
      />
      <PremiumLoader
        active={generatingBatchImages}
        title="Pelita Soal Menulis Gambar & Ilustrasi Soal"
        subtitle={`Menggunakan Google Imagen 3 untuk merancang ilustrasi kurikulum merdeka pada 25% butir soal. Memproses gambar ${batchProgress.current} dari ${batchProgress.total} (${batchProgress.percent}%)...`}
        type="generate"
      />

      {/* Kontrol & Menu Unduhan */}
      <div className="bingkai-emas-premium p-6 flex flex-col xl:flex-row items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-4.5 z-10">
          <div className="w-12 h-12 bg-gradient-to-tr from-amber-600 via-yellow-550 to-amber-700 text-slate-950 rounded-2xl shadow-md flex items-center justify-center text-xl shrink-0 animate-pulse">
            ✨
          </div>
          <div>
            <h3 className="font-extrabold text-amber-500 text-sm flex items-center gap-1.5 uppercase">
              <span>📝</span> Naskah Soal &amp; Kunci Jawaban Siap!
            </h3>
            <p className="text-xs text-slate-450 mt-1 font-semibold leading-relaxed">
              Anda kini dapat <b>mengedit butir soal secara visual</b> dengan mengeklik langsung pada soal sebelum mengunduh.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end relative z-10">

          <div className="flex flex-wrap items-center bg-slate-950 border border-slate-850 p-1 rounded-2xl text-xs shadow-xs gap-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("siswa")}
              className={`px-3.5 py-2 rounded-xl font-black text-xs cursor-pointer transition-all ${
                activeTab === "siswa" ? "bg-gradient-to-r from-blue-600 to-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📝 Naskah Soal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("kunci")}
              className={`px-3.5 py-2 rounded-xl font-black text-xs cursor-pointer transition-all ${
                activeTab === "kunci" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🔑 Kunci Jawaban
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pedoman")}
              className={`px-3.5 py-2 rounded-xl font-black text-xs cursor-pointer transition-all ${
                activeTab === "pedoman" ? "bg-gradient-to-r from-emerald-600 to-emerald-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📊 Penskoran
            </button>
          </div>

          <button
            id="btn-download-soal-word"
            type="button"
            onClick={handleDownloadWord}
            disabled={downloadingPdf || isExporting}
            className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 font-extrabold text-[11px] rounded-xl inline-flex items-center gap-1.5 hover:bg-slate-900 transition-all duration-300 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <span className="text-sm">📥</span> Unduh Word
          </button>

          <button
            id="btn-download-soal-pdf"
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || isExporting}
            className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-black text-white font-extrabold text-[11px] rounded-xl inline-flex items-center gap-1.5 transition-all duration-300 shadow-md hover:shadow-blue-500/10 cursor-pointer disabled:opacity-50"
          >
            <span className="text-sm">📄</span>
            {downloadingPdf ? "Memproses..." : "Unduh PDF"}
          </button>



          {/* MEN DOWNLOAD DOKUMEN PENSKORAN & RUMUS NILAI AKHIR */}
          <div className="relative" id="menu-download-pedoman-root">
            <button
              id="btn-menu-download-pedoman"
              type="button"
              onClick={() => setShowScoringMenu(!showScoringMenu)}
              disabled={downloadingPdf || isExporting}
              className="px-3.5 py-2.5 bg-emerald-600 border border-emerald-700 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl inline-flex items-center gap-1.5 transition-all duration-300 shadow-md hover:shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
            >
              <span className="text-sm">📊</span> Unduh Penskoran <span className="text-[9px] opacity-80">▼</span>
            </button>
            {showScoringMenu && (
              <div 
                id="scoring-dropdown-menu" 
                className="absolute right-0 mt-2 w-72 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-3 text-left animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div>
                  <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                    <span>📊</span> Dokumen Penskoran &amp; Nilai
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Unduh format resmi bobot soal dan standardisasi rumus Nilai Akhir (NA) lengkap dengan tanda tangan pengesahan resmi.
                  </p>
                </div>
                <div className="border-t border-slate-800 pt-2 space-y-2">
                  <button
                    id="btn-download-pedoman-word-direct"
                    type="button"
                    onClick={async () => {
                      setShowScoringMenu(false);
                      await handleDownloadPedomanDirectly("word");
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-205 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:text-white rounded-xl transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>📥 Unduh Word (.doc)</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">Word</span>
                  </button>
                  <button
                    id="btn-download-pedoman-pdf-direct"
                    type="button"
                    onClick={async () => {
                      setShowScoringMenu(false);
                      await handleDownloadPedomanDirectly("pdf");
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>📄 Unduh PDF (Portrait)</span>
                    <span className="text-[10px] bg-emerald-800 text-white px-1.5 py-0.5 rounded font-bold">PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout containing Document Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: The actual printable examination paper */}
        <div className="lg:col-span-4 bingkai-emas-premium overflow-x-auto p-6 md:p-10 relative w-full">
          

          <div
            ref={printAreaRef}
            id="soal-ujian-print-area"
            className="max-w-[700px] mx-auto bg-white p-10 md:p-12"
            style={{ fontFamily: '"Times New Roman", Times, serif', color: "#000000", fontSize: "12pt", lineHeight: "1.5" }}
          >
            {/* Global Printable PDF & Page Break Styles to protect top/bottom page boundaries */}
            <style dangerouslySetInnerHTML={{ __html: `
              @page {
                size: A4 portrait;
                margin: 0mm !important; /* This completely REMOVES browser default print headers and footers (date, URL, page title, etc.) while printing! */
              }
              body, table, div, p, span, h4, tr, td, img {
                max-width: 100% !important;
                box-sizing: border-box !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
              }
              @media print {
                /* Hide all other core application layouts */
                body * {
                  visibility: hidden !important;
                }
                /* Display only the print target sheet */
                #soal-ujian-print-area, #soal-ujian-print-area * {
                  visibility: visible !important;
                }
                #soal-ujian-print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  padding: 20mm 20mm 20mm 20mm !important;
                  margin: 0 auto !important;
                }
                .no-print {
                  display: none !important;
                  height: 0 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                tr, .signature-table, .key-block, .question-block, .formula-block, .identitas-table {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                table {
                  page-break-inside: auto;
                }
              }
              /* Define CSS break classes for both native browser prints and html2pdf renderer */
              .page-break-avoid, tr, .signature-table, .key-block, .question-block, .formula-block, .identitas-table {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              table {
                page-break-inside: auto;
              }
            `}} />
            {/* SAKLAR TAMPILAN SISWA */}
            {activeTab === "siswa" && (
              <div id="soal-siswa-payload">
                {/* Kop Resmi Dinamis */}
                <div className="kop" style={{ borderBottom: "3.5px double black", paddingBottom: "10px", marginBottom: "15px" }}>
                  {getLogoUrl(schoolInfo) ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
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
                          <td style={{ border: "none", width: "90%", textAlign: "center", verticalAlign: "middle" }}>
                            <p className="kop-b1" style={{ margin: "0px", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: "1.2" }}>
                              {schoolInfo.governmentName || "Pemerintah Kabupaten / Kota"}
                            </p>
                            <p className="kop-b2" style={{ margin: "2px 0px", fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                              {schoolInfo.educationDepartment || "Dinas Pendidikan dan Kebudayaan"}
                            </p>
                            <p className="kop-b3" style={{ margin: "2px 0px", fontSize: "15pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                              {schoolInfo.schoolName || "SD NEGERI KABUPATEN"}
                            </p>
                            <p className="kop-b4" style={{ margin: "2px 0px 0px 0px", fontSize: "9.5pt", fontStyle: "italic", lineHeight: "1.2", fontWeight: "normal" }}>
                              Alamat: {schoolInfo.schoolAddress || "Alamat Lengkap Lembaga Pendidikan"}
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <p className="kop-b1" style={{ margin: "0px", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: "1.2" }}>
                        {schoolInfo.governmentName || "Pemerintah Kabupaten / Kota"}
                      </p>
                      <p className="kop-b2" style={{ margin: "2px 0px", fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                        {schoolInfo.educationDepartment || "Dinas Pendidikan dan Kebudayaan"}
                      </p>
                      <p className="kop-b3" style={{ margin: "2px 0px", fontSize: "15pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                        {schoolInfo.schoolName || "SD NEGERI KABUPATEN"}
                      </p>
                      <p className="kop-b4" style={{ margin: "2px 0px 0px 0px", fontSize: "9.5pt", fontStyle: "italic", lineHeight: "1.2", fontWeight: "normal" }}>
                        Alamat: {schoolInfo.schoolAddress || "Alamat Lengkap Lembaga Pendidikan"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Judul Lembar Asesmen */}
                <div className="document-title" style={{ textAlign: "center", fontSize: "12pt", fontWeight: "bold", textTransform: "uppercase", margin: "10px 0px 20px 0px", textDecoration: "underline" }}>
                  SOAL {schoolInfo.assessmentPurpose ? schoolInfo.assessmentPurpose.toUpperCase() : "SUMATIF AKHIR SEMESTER"}
                </div>

                {/* Tabel Identitas Pengisian Siswa */}
                <table className="identitas-table" style={{ border: "1px solid black", width: "100%", marginBottom: "25px", borderCollapse: "collapse", fontSize: "12pt", fontFamily: '"Times New Roman", Times, serif', lineHeight: "1.5" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid black", padding: "6px", width: "15%", fontWeight: "bold" }}>Mata Pelajaran</td>
                      <td style={{ border: "1px solid black", padding: "6px", width: "35%" }}>{subject}</td>
                      <td style={{ border: "1px solid black", padding: "6px", width: "15%", fontWeight: "bold" }}>Nama Siswa</td>
                      <td style={{ border: "1px solid black", padding: "6px", width: "35%", color: "#94a3b8" }}>..................................................</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid black", padding: "6px", fontWeight: "bold" }}>Kelas / Semester</td>
                      <td style={{ border: "1px solid black", padding: "6px" }}>{schoolInfo.gradeClass} / {schoolInfo.semester === 'II' ? 'Genap (II)' : 'Ganjil (I)'}</td>
                      <td style={{ border: "1px solid black", padding: "6px", fontWeight: "bold" }}>Nomor Absen</td>
                      <td style={{ border: "1px solid black", padding: "6px", color: "#94a3b8" }}>..................................................</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid black", padding: "6px", fontWeight: "bold" }}>Tahun Pelajaran</td>
                      <td style={{ border: "1px solid black", padding: "6px" }}>{schoolInfo.academicYear}</td>
                      <td style={{ border: "1px solid black", padding: "6px", fontWeight: "bold" }}>Hari / Tanggal</td>
                      <td style={{ border: "1px solid black", padding: "6px", color: "#94a3b8" }}>..................................................</td>
                    </tr>
                  </tbody>
                </table>

                {/* BAGIAN I: PILIHAN GANDA */}
                {pgQuestions.length > 0 && (
                  <div style={{ marginBottom: "25px" }}>
                    <h4 style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid #ddd", paddingBottom: "3px", marginBottom: "12px" }}>
                      PETUNJUK A: Pilihlah satu jawaban yang paling benar (A, B, C, atau D) di bawah ini!
                    </h4>
                    {pgQuestions.map((q, qIdx) => (
                      <div key={q.number} className="question-block group relative" style={{ marginBottom: "24px", pageBreakInside: "avoid" }}>
                        
                        {/* Interactive floating buttons */}
                        <div className="absolute right-2 top-0 opacity-0 group-hover:opacity-100 transition-all duration-200 no-print flex items-center gap-1.5 z-10">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestion(JSON.parse(JSON.stringify(q)));
                              setModalTab("content");
                            }}
                            className="bg-indigo-50 hover:bg-indigo-600 text-indigo-750 hover:text-white p-2 py-1.5 rounded-lg border border-indigo-200 inline-flex items-center gap-1 text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                            title="Edit Soal"
                          >
                            <Pencil size={11} /> Edit Soal
                          </button>
                        </div>

                        {q.stimulusText && renderStimulusText(q.stimulusText, cleanQuestionTextForDisplay(q.questionText, q.questionType))}
                        <p style={{ fontWeight: "normal", fontSize: "12pt", margin: "0px", lineHeight: "1.5" }}>
                          <strong>{qIdx + 1}.</strong> {cleanQuestionTextForDisplay(q.questionText, q.questionType)}
                        </p>
                        {renderQuestionIllustration(q, subject)}
                        
                        {q.options && q.options.length > 0 && (
                          <table className="options-grid" style={{ fontFamily: '"Times New Roman", Times, serif', width: "100%", marginLeft: "20px", marginTop: "4px" }}>
                            <tbody>
                              <tr>
                                <td style={{ width: "50%", border: "none", padding: "1px 0px", fontSize: "12pt", lineHeight: "1.5" }}>{q.options[0]}</td>
                                <td style={{ width: "50%", border: "none", padding: "1px 0px", fontSize: "12pt", lineHeight: "1.5" }}>{q.options[1]}</td>
                              </tr>
                              <tr>
                                <td style={{ width: "50%", border: "none", padding: "1px 0px", fontSize: "12pt", lineHeight: "1.5" }}>{q.options[2]}</td>
                                <td style={{ width: "50%", border: "none", padding: "1px 0px", fontSize: "12pt", lineHeight: "1.5" }}>{q.options[3]}</td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* BAGIAN II: ISIAN SINGKAT */}
                {isianQuestions.length > 0 && (
                  <div style={{ marginBottom: "25px" }}>
                    <h4 style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid #ddd", paddingBottom: "3px", marginBottom: "12px" }}>
                      PETUNJUK B: Isilah titik-titik di bawah ini dengan jawaban yang tepat dan ringkas!
                    </h4>
                    {isianQuestions.map((q, qIdx) => (
                      <div key={q.number} className="question-block group relative" style={{ marginBottom: "24px", pageBreakInside: "avoid" }}>

                        {/* Interactive floating buttons */}
                        <div className="absolute right-2 top-0 opacity-0 group-hover:opacity-100 transition-all duration-200 no-print flex items-center gap-1.5 z-10">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestion(JSON.parse(JSON.stringify(q)));
                              setModalTab("content");
                            }}
                            className="bg-indigo-50 hover:bg-indigo-600 text-indigo-750 hover:text-white p-2 py-1.5 rounded-lg border border-indigo-200 inline-flex items-center gap-1 text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                            title="Edit Soal"
                          >
                            <Pencil size={11} /> Edit Soal
                          </button>
                        </div>

                        {q.stimulusText && renderStimulusText(q.stimulusText, cleanQuestionTextForDisplay(q.questionText, q.questionType))}
                        <p style={{ fontSize: "12pt", margin: "0px", lineHeight: "1.5" }}>
                          <strong>{pgQuestions.length + qIdx + 1}.</strong> {cleanQuestionTextForDisplay(q.questionText, q.questionType)}
                        </p>
                        {renderQuestionIllustration(q, subject)}
                      </div>
                    ))}
                  </div>
                )}

                {/* BAGIAN III: URAIAN */}
                {uraianQuestions.length > 0 && (
                  <div style={{ marginBottom: "25px" }}>
                    <h4 style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid #ddd", paddingBottom: "3px", marginBottom: "12px" }}>
                      PETUNJUK C: Jawablah pertanyaan-pertanyaan berikut dengan menguraikan langkah penyelesaian dan analisis Anda!
                    </h4>
                    {uraianQuestions.map((q, qIdx) => (
                      <div key={q.number} className="question-block group relative" style={{ marginBottom: "24px", pageBreakInside: "avoid" }}>

                        {/* Interactive floating buttons */}
                        <div className="absolute right-2 top-0 opacity-0 group-hover:opacity-100 transition-all duration-200 no-print flex items-center gap-1.5 z-10">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestion(JSON.parse(JSON.stringify(q)));
                              setModalTab("content");
                            }}
                            className="bg-indigo-50 hover:bg-indigo-600 text-indigo-750 hover:text-white p-2 py-1.5 rounded-lg border border-indigo-200 inline-flex items-center gap-1 text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                            title="Edit Soal"
                          >
                            <Pencil size={11} /> Edit Soal
                          </button>
                        </div>

                        {q.stimulusText && renderStimulusText(q.stimulusText, cleanQuestionTextForDisplay(q.questionText, q.questionType))}
                        <p style={{ fontSize: "12pt", margin: "0px", lineHeight: "1.5" }}>
                          <strong>{pgQuestions.length + isianQuestions.length + qIdx + 1}.</strong> {cleanQuestionTextForDisplay(q.questionText, q.questionType)}
                        </p>
                        {renderQuestionIllustration(q, subject)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SAKLAR TAMPILAN GURU / KUNCI JAWABAN */}
            {activeTab === "kunci" && (
              <div id="soal-kunci-payload">
                {/* Kop Resmi Dinamis */}
                <div className="kop" style={{ borderBottom: "3.5px double black", paddingBottom: "10px", marginBottom: "15px" }}>
                  {getLogoUrl(schoolInfo) ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
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
                          <td style={{ border: "none", width: "90%", textAlign: "center", verticalAlign: "middle" }}>
                            <p className="kop-b1" style={{ margin: "0px", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                              {schoolInfo.governmentName || "Pemerintah Kabupaten / Kota"}
                            </p>
                            <p className="kop-b2" style={{ margin: "2px 0px", fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                              {schoolInfo.educationDepartment || "Dinas Pendidikan dan Kebudayaan"}
                            </p>
                            <p className="kop-b3" style={{ margin: "2px 0px", fontSize: "15pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                              {schoolInfo.schoolName || "SD NEGERI KABUPATEN"}
                            </p>
                            <p className="kop-b4" style={{ margin: "2px 0px 0px 0px", fontSize: "9.5pt", fontStyle: "italic", lineHeight: "1.2", fontWeight: "normal" }}>
                              Alamat: {schoolInfo.schoolAddress || "Alamat Lengkap Lembaga Pendidikan"}
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <p className="kop-b1" style={{ margin: "0px", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                        {schoolInfo.governmentName || "Pemerintah Kabupaten / Kota"}
                      </p>
                      <p className="kop-b2" style={{ margin: "2px 0px", fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                        {schoolInfo.educationDepartment || "Dinas Pendidikan dan Kebudayaan"}
                      </p>
                      <p className="kop-b3" style={{ margin: "2px 0px", fontSize: "15pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                        {schoolInfo.schoolName || "SD NEGERI KABUPATEN"}
                      </p>
                      <p className="kop-b4" style={{ margin: "2px 0px 0px 0px", fontSize: "9.5pt", fontStyle: "italic", lineHeight: "1.2", fontWeight: "normal" }}>
                        Alamat: {schoolInfo.schoolAddress || "Alamat Lengkap Lembaga Pendidikan"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Judul Lembar Asesmen */}
                <div className="document-title" style={{ textAlign: "center", fontSize: "12pt", fontWeight: "bold", textTransform: "uppercase", margin: "10px 0px 20px 0px", textDecoration: "underline" }}>
                  KUNCI JAWABAN &AMP; PEDOMAN PENILAIAN GURU
                </div>

                {/* Pembatas Meta */}
                <table className="identitas-table" style={{ border: "1px solid black", width: "100%", marginBottom: "25px", borderCollapse: "collapse", fontSize: "10pt" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid black", padding: "6px", width: "15%", fontWeight: "bold" }}>Mata Pelajaran</td>
                      <td style={{ border: "1px solid black", padding: "6px", width: "35%" }}>{subject}</td>
                      <td style={{ border: "1px solid black", padding: "6px", width: "15%", fontWeight: "bold" }}>Kelas / Semester</td>
                      <td style={{ border: "1px solid black", padding: "6px", width: "35%" }}>{schoolInfo.gradeClass} / {schoolInfo.semester === 'II' ? 'Genap (II)' : 'Ganjil (I)'}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid black", padding: "6px", fontWeight: "bold" }}>Tahun Pelajaran</td>
                      <td style={{ border: "1px solid black", padding: "6px" }}>{schoolInfo.academicYear}</td>
                      <td style={{ border: "1px solid black", padding: "6px", fontWeight: "bold" }}>Aspek/Asesmen</td>
                      <td style={{ border: "1px solid black", padding: "6px" }}>Kunci Guru Resmi</td>
                    </tr>
                  </tbody>
                </table>

                {/* Loop Kunci Pertanyaan Sederhana - Full screen & Bersih */}
                <div style={{ marginTop: "15px", marginBottom: "30px", color: "#000000" }}>
                  {(() => {
                    const pgQuestions = questions.filter(q => q.questionType === "Pilihan Ganda");
                    const isianQuestions = questions.filter(q => q.questionType === "Isian Singkat");
                    const uraianQuestions = questions.filter(q => q.questionType === "Uraian");

                    return (
                      <div className="space-y-8" style={{ color: "#000000" }}>
                        {/* Pilihan Ganda */}
                        {pgQuestions.length > 0 && (
                          <div style={{ marginBottom: "25px" }}>
                            <h4 style={{ fontSize: "11pt", fontWeight: "bold", borderBottom: "1.5px solid #000000", paddingBottom: "3px", marginBottom: "15px", textTransform: "uppercase", color: "#000000" }}>
                              I. Kunci Jawaban Soal Pilihan Ganda (PG)
                            </h4>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: '"Times New Roman", Times, serif', fontSize: "11pt", margin: "10px 0 20px 0", color: "#000000" }}>
                              <tbody>
                                {(() => {
                                  const chunkArray = (arr: any[], size: number) => {
                                    const result = [];
                                    for (let i = 0; i < arr.length; i += size) {
                                      result.push(arr.slice(i, i + size));
                                    }
                                    return result;
                                  };
                                  const pgChunks = chunkArray(pgQuestions, 10);
                                  return pgChunks.map((chunk, chunkIdx) => (
                                    <tr key={chunkIdx}>
                                      {chunk.map((q) => {
                                        const rawKey = (q.answerKey || "").trim();
                                        let cleanLetter = "-";
                                        if (rawKey.length > 0) {
                                          const firstChar = rawKey.charAt(0).toUpperCase();
                                          cleanLetter = firstChar;
                                        }
                                        return (
                                          <td 
                                            key={q.number} 
                                            style={{ 
                                              border: "2px solid #000000", 
                                              padding: "10px 4px", 
                                              textAlign: "center", 
                                              width: "10%",
                                              backgroundColor: "#ffffff",
                                              color: "#000000"
                                            }}
                                          >
                                            <div style={{ fontSize: "9.5pt", color: "#555555", marginBottom: "3px", fontFamily: '"Times New Roman", Times, serif' }}>No. {q.number}</div>
                                            <div style={{ fontSize: "15pt", fontWeight: "bold", color: "#000000", fontFamily: '"Times New Roman", Times, serif' }}>{cleanLetter}</div>
                                          </td>
                                        );
                                      })}
                                      {/* Fill empty cells if the last row has less than 10 questions */}
                                      {chunk.length < 10 && 
                                        Array.from({ length: 10 - chunk.length }).map((_, emptyIdx) => (
                                          <td 
                                            key={`empty-${emptyIdx}`} 
                                            style={{ 
                                              border: "2px solid #000000", 
                                              padding: "10px 4px", 
                                              width: "10%",
                                              backgroundColor: "#ffffff"
                                            }}
                                          />
                                        ))
                                      }
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Isian Singkat */}
                        {isianQuestions.length > 0 && (
                          <div style={{ marginBottom: "25px" }}>
                            <h4 style={{ fontSize: "11pt", fontWeight: "bold", borderBottom: "1.5px solid #000000", paddingBottom: "3px", marginBottom: "10px", textTransform: "uppercase", color: "#000000" }}>
                              II. Kunci Jawaban Soal Isian Singkat
                            </h4>
                            <div style={{ fontSize: "12pt", fontFamily: '"Times New Roman", Times, serif', lineHeight: "1.8", color: "#000000" }}>
                              {isianQuestions.map((q) => (
                                <div key={q.number} style={{ marginBottom: "8px", pageBreakInside: "avoid" }}>
                                  <strong>{q.number}.</strong> {q.answerKey.trim()}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Uraian */}
                        {uraianQuestions.length > 0 && (
                          <div style={{ marginBottom: "25px" }}>
                            <h4 style={{ fontSize: "11pt", fontWeight: "bold", borderBottom: "1.5px solid #000000", paddingBottom: "3px", marginBottom: "10px", textTransform: "uppercase", color: "#000000" }}>
                              III. Kunci Jawaban Soal Uraian (Essay)
                            </h4>
                            <div style={{ fontSize: "12pt", fontFamily: '"Times New Roman", Times, serif', lineHeight: "1.8", color: "#000000" }}>
                              {uraianQuestions.map((q) => (
                                <div key={q.number} style={{ marginBottom: "8px", pageBreakInside: "avoid" }}>
                                  <strong>{q.number}.</strong> {q.answerKey.trim()}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Tanda Tangan */}
                <table className="signature-table" style={{ width: "100%", marginTop: "35px", borderCollapse: "collapse", fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", lineHeight: "1.5" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "50%" }}></td>
                      <td style={{ width: "50%", textAlign: "center", fontSize: "12pt" }}>
                        {getFormattedDate()}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ width: "50%", textAlign: "center", fontSize: "12pt", verticalAlign: "top" }}>
                        Mengetahui,<br />
                        <strong>Kepala Sekolah</strong>
                        <br /><br /><br /><br />
                        <span style={{ textDecoration: "underline", fontWeight: "bold" }}>{schoolInfo.principalName || "......................................................."}</span><br />
                        <span>NIP. {schoolInfo.principalNip || "......................................................."}</span>
                      </td>
                      <td style={{ width: "50%", textAlign: "center", fontSize: "12pt", verticalAlign: "top" }}>
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
            )}

            {activeTab === "pedoman" && (
              <div id="soal-pedoman-payload" className="animate-in fade-in duration-300">
                {/* Kop Resmi Dinamis */}
                <div className="kop" style={{ borderBottom: "3.5px double black", paddingBottom: "10px", marginBottom: "15px" }}>
                  {getLogoUrl(schoolInfo) ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
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
                          <td style={{ border: "none", width: "90%", textAlign: "center", verticalAlign: "middle" }}>
                            <p className="kop-b1" style={{ margin: "0px", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: "1.2" }}>
                              {schoolInfo.governmentName || "Pemerintah Kabupaten / Kota"}
                            </p>
                            <p className="kop-b2" style={{ margin: "2px 0px", fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                              {schoolInfo.educationDepartment || "Dinas Pendidikan dan Kebudayaan"}
                            </p>
                            <p className="kop-b3" style={{ margin: "2px 0px", fontSize: "15pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                              {schoolInfo.schoolName || "SD NEGERI KABUPATEN"}
                            </p>
                            <p className="kop-b4" style={{ margin: "2px 0px 0px 0px", fontSize: "9.5pt", fontStyle: "italic", lineHeight: "1.2", fontWeight: "normal" }}>
                              Alamat: {schoolInfo.schoolAddress || "Alamat Lengkap Lembaga Pendidikan"}
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <p className="kop-b1" style={{ margin: "0px", fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: "1.2" }}>
                        {schoolInfo.governmentName || "Pemerintah Kabupaten / Kota"}
                      </p>
                      <p className="kop-b2" style={{ margin: "2px 0px", fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                        {schoolInfo.educationDepartment || "Dinas Pendidikan dan Kebudayaan"}
                      </p>
                      <p className="kop-b3" style={{ margin: "2px 0px", fontSize: "15pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: "1.2" }}>
                        {schoolInfo.schoolName || "SD NEGERI KABUPATEN"}
                      </p>
                      <p className="kop-b4" style={{ margin: "2px 0px 0px 0px", fontSize: "9.5pt", fontStyle: "italic", lineHeight: "1.2", fontWeight: "normal" }}>
                        Alamat: {schoolInfo.schoolAddress || "Alamat Lengkap Lembaga Pendidikan"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Judul Lembar Pedoman */}
                <div className="document-title" style={{ textAlign: "center", fontSize: "12pt", fontWeight: "bold", textTransform: "uppercase", margin: "10px 0px 20px 0px", textDecoration: "underline" }}>
                  PEDOMAN PENSKORAN &amp; RUBRIK EVALUASI NILAI AKHIR
                </div>

                {/* Pembatas Meta */}
                <table className="identitas-table" style={{ border: "1px solid black", width: "100%", marginBottom: "20px", borderCollapse: "collapse", fontSize: "10pt" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid black", padding: "6px", width: "15%", fontWeight: "bold" }}>Mata Pelajaran</td>
                      <td style={{ border: "1px solid black", padding: "6px", width: "35%" }}>{subject}</td>
                      <td style={{ border: "1px solid black", padding: "6px", width: "15%", fontWeight: "bold" }}>Kelas / Semester</td>
                      <td style={{ border: "1px solid black", padding: "6px", width: "35%" }}>{schoolInfo.gradeClass} / {schoolInfo.semester === 'II' ? 'Genap (II)' : 'Ganjil (I)'}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid black", padding: "6px", fontWeight: "bold" }}>Tahun Pelajaran</td>
                      <td style={{ border: "1px solid black", padding: "6px" }}>{schoolInfo.academicYear}</td>
                      <td style={{ border: "1px solid black", padding: "6px", fontWeight: "bold" }}>Kriteria Evaluasi</td>
                      <td style={{ border: "1px solid black", padding: "6px" }}>Standar Bobot Kelulusan SD</td>
                    </tr>
                  </tbody>
                </table>

                {/* Ringkasan Konfigurasi Bobot & Penskoran */}
                <h4 style={{ fontSize: "11pt", fontWeight: "bold", margin: "15px 0px 8px 0px", textTransform: "uppercase", pageBreakInside: "avoid", breakInside: "avoid" }}>
                  I. Kriteria Bobot Nilai Berdasarkan Bentuk Soal
                </h4>
                <table className="page-break-avoid" style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black", marginBottom: "20px", fontSize: "10pt", pageBreakInside: "avoid" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f2f2f2", pageBreakInside: "avoid", breakInside: "avoid" }}>
                      <th style={{ border: "1px solid black", padding: "8px", textAlign: "center", fontWeight: "bold", width: "5%" }}>No</th>
                      <th style={{ border: "1px solid black", padding: "8px", textAlign: "left", fontWeight: "bold", width: "25%" }}>Bentuk Soal</th>
                      <th style={{ border: "1px solid black", padding: "8px", textAlign: "left", fontWeight: "bold", width: "50%" }}>Kriteria Rubrik &amp; Pedoman Penskoran</th>
                      <th style={{ border: "1px solid black", padding: "8px", textAlign: "center", fontWeight: "bold", width: "20%" }}>Skor / Bobot Maksimal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                      <td style={{ border: "1px solid black", padding: "8px", textAlign: "center" }}>1</td>
                      <td style={{ border: "1px solid black", padding: "8px", fontWeight: "bold" }}>Pilihan Ganda</td>
                      <td style={{ border: "1px solid black", padding: "8px", lineHeight: "1.4" }}>
                        Jawaban benar mendapat skor <b>1</b>, sedangkan jawaban salah mendapat skor <b>0</b>.
                      </td>
                      <td style={{ border: "1px solid black", padding: "8px", textAlign: "center", fontWeight: "bold" }}>1 Poin Utama</td>
                    </tr>
                    <tr style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                      <td style={{ border: "1px solid black", padding: "8px", textAlign: "center" }}>2</td>
                      <td style={{ border: "1px solid black", padding: "8px", fontWeight: "bold" }}>Isian Singkat</td>
                      <td style={{ border: "1px solid black", padding: "8px", lineHeight: "1.4" }}>
                        Menyediakan rentang skor <b>0 s.d 2</b>:<br />
                        • <b>Skor 2:</b> Jawaban benar, tepat dan lengkap sesuai kunci jawaban.<br />
                        • <b>Skor 1:</b> Jawaban mendekati benar / kurang lengkap.<br />
                        • <b>Skor 0:</b> Jawaban salah total atau kosong.
                      </td>
                      <td style={{ border: "1px solid black", padding: "8px", textAlign: "center", fontWeight: "bold" }}>Rentang 0 - 2 Poin</td>
                    </tr>
                    <tr style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                      <td style={{ border: "1px solid black", padding: "8px", textAlign: "center" }}>3</td>
                      <td style={{ border: "1px solid black", padding: "8px", fontWeight: "bold" }}>Uraian</td>
                      <td style={{ border: "1px solid black", padding: "8px", lineHeight: "1.4" }}>
                        Menyediakan rentang skor <b>0 s.d 5</b>:<br />
                        • <b>Skor 5:</b> Jawaban sangat lengkap, analisis mendalam, runut, dan tepat.<br />
                        • <b>Skor 4:</b> Jawaban tepat, analisis benar, tetapi ada bagian kecil yang belum diuraikan.<br />
                        • <b>Skor 3:</b> Jawaban sebagian besar tepat, penjelasan sederhana.<br />
                        • <b>Skor 2:</b> Jawaban kurang tepat, tetapi masih mengandung konsep/langkah yang relevan.<br />
                        • <b>Skor 1:</b> Menuliskan respon seadanya/hanya menyalin soal, tidak tepat.<br />
                        • <b>Skor 0:</b> Jawaban salah total atau kosong.
                      </td>
                      <td style={{ border: "1px solid black", padding: "8px", textAlign: "center", fontWeight: "bold" }}>Rentang 0 - 5 Poin</td>
                    </tr>
                    <tr style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                      <td style={{ border: "1px solid black", padding: "8px", textAlign: "center" }}>4</td>
                      <td style={{ border: "1px solid black", padding: "8px", fontWeight: "bold" }}>Kompleks &amp; Lainnya</td>
                      <td style={{ border: "1px solid black", padding: "8px", lineHeight: "1.4" }}>
                        Untuk Pilihan Ganda Kompleks / Menjodohkan / lainnya, jika jawaban dipilih benar, diberi <b>1 poin per opsi benar</b> (jumlah poin total disesuaikan jumlah pasangan atau pilihan berstatus benar).
                      </td>
                      <td style={{ border: "1px solid black", padding: "8px", textAlign: "center", fontStyle: "italic", fontWeight: "bold" }}>Sesuai Opsi Benar (1 Poin/Benar)</td>
                    </tr>
                  </tbody>
                </table>

                {/* Tabel Distribusi Bobot per Soal */}
                <h4 style={{ fontSize: "11pt", fontWeight: "bold", margin: "20px 0px 8px 0px", textTransform: "uppercase", pageBreakInside: "avoid", breakInside: "avoid" }}>
                  II. Tabel Distribusi Bobot dan Skor Maksimal Butir Soal ({questions.length} Butir)
                </h4>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black", marginBottom: "20px", fontSize: "10pt" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f2f2f2", pageBreakInside: "avoid", breakInside: "avoid" }}>
                      <th style={{ border: "1px solid black", padding: "6px", textAlign: "center", fontWeight: "bold", width: "8%" }}>Butir No</th>
                      <th style={{ border: "1px solid black", padding: "6px", textAlign: "left", fontWeight: "bold", width: "22%" }}>Bentuk Soal</th>
                      <th style={{ border: "1px solid black", padding: "6px", textAlign: "left", fontWeight: "bold", width: "18%" }}>Level Kognitif</th>
                      <th style={{ border: "1px solid black", padding: "6px", textAlign: "left", fontWeight: "bold", width: "37%" }}>Materi Pokok</th>
                      <th style={{ border: "1px solid black", padding: "6px", textAlign: "center", fontWeight: "bold", width: "15%" }}>Skor Maksimal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => {
                      const maxScore = getQuestionMaxScore(q.questionType, q);
                      return (
                        <tr key={q.number} style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                          <td style={{ border: "1px solid black", padding: "6px", textAlign: "center" }}>{q.number}</td>
                          <td style={{ border: "1px solid black", padding: "6px" }}>{q.questionType}</td>
                          <td style={{ border: "1px solid black", padding: "6px" }}>{q.cognitiveLevel}</td>
                          <td style={{ border: "1px solid black", padding: "6px" }}>{q.materi}</td>
                          <td style={{ border: "1px solid black", padding: "6px", textAlign: "center", fontWeight: "bold" }}>{maxScore}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ backgroundColor: "#f9f9f9", fontWeight: "bold", pageBreakInside: "avoid", breakInside: "avoid" }}>
                      <td colSpan={4} style={{ border: "1px solid black", padding: "8px", textAlign: "right" }}>
                        TOTAL SKOR MAKSIMAL INTRUMEN UJIAN (∑ Skor):
                      </td>
                      <td style={{ border: "1px solid black", padding: "8px", textAlign: "center", fontSize: "11pt", color: "#111" }}>
                        {questions.reduce((sum, q) => sum + getQuestionMaxScore(q.questionType, q), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Perhitungan Rumus Nilai Akhir */}
                <div className="formula-block page-break-avoid" style={{ border: "1px solid black", padding: "12px", backgroundColor: "#fcfcfc", marginBottom: "25px", fontSize: "10.5pt", lineHeight: "1.4", pageBreakInside: "avoid", breakInside: "avoid" }}>
                  <p style={{ margin: "0px 0px 8px 0px", fontWeight: "bold", textTransform: "uppercase", fontSize: "10pt", color: "#1e293b" }}>
                    III. Rumusan Standardisasi Nilai Akhir (NA)
                  </p>
                  <p style={{ margin: "0px 0px 8px 0px" }}>
                    Nilai Akhir diperoleh secara proporsional dengan membandingkan total skor perolehan murid terhadap total skor maksimal soal ujian, dikalikan 100.
                  </p>
                  <div style={{ textAlign: "center", margin: "12px 10px", padding: "10px", border: "1px dashed #ccc", backgroundColor: "#fff" }}>
                    <p style={{ margin: "0px", fontSize: "11.5pt", fontWeight: "bold", fontFamily: "Courier New, monospace" }}>
                      Nilai Akhir (NA) = (Total Skor Perolehan Siswa / Total Skor Maksimal) x 100
                    </p>
                  </div>
                  <p style={{ margin: "0px", fontSize: "9.5pt", fontStyle: "italic", color: "#64748b" }}>
                    * Catatan: Nilai Akhir dibulatkan hingga 2 angka di belakang koma untuk akurasi pelaporan rapor hasil belajar siswa.
                  </p>
                </div>

                {/* Tanda Tangan */}
                <table className="signature-table page-break-avoid" style={{ width: "100%", marginTop: "35px", borderCollapse: "collapse", pageBreakInside: "avoid", breakInside: "avoid", fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", lineHeight: "1.5" }}>
                  <tbody>
                    <tr style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                      <td style={{ width: "50%" }}></td>
                      <td style={{ width: "50%", textAlign: "center", fontSize: "12pt" }}>
                        {getFormattedDate()}
                      </td>
                    </tr>
                    <tr style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                      <td style={{ width: "50%", textAlign: "center", fontSize: "12pt", verticalAlign: "top" }}>
                        Mengetahui,<br />
                        <strong>Kepala Sekolah</strong>
                        <br /><br /><br /><br />
                        <span style={{ textDecoration: "underline", fontWeight: "bold" }}>{schoolInfo.principalName || "......................................................."}</span><br />
                        <span>NIP. {schoolInfo.principalNip || "......................................................."}</span>
                      </td>
                      <td style={{ width: "50%", textAlign: "center", fontSize: "12pt", verticalAlign: "top" }}>
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
            )}
          </div>

          {onSaveToBankSoal && (
            <div className="flex justify-center mt-6 mb-2 no-print">
              <button
                id="btn-save-to-bank-soal"
                type="button"
                disabled={isAlreadySaved || isSavingToBank}
                onClick={handleBankSave}
                className={`px-6 py-3 font-black text-xs rounded-2xl inline-flex items-center gap-2 transition-all duration-300 shadow-md active:scale-97 cursor-pointer uppercase tracking-wider border ${
                  isAlreadySaved
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/20 cursor-not-allowed"
                    : isSavingToBank
                    ? "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed animate-pulse"
                    : "bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 border-yellow-300/30 hover:shadow-yellow-500/15"
                }`}
              >
                {isAlreadySaved ? (
                  <>
                    <CheckCircle2 size={14} className="animate-bounce shrink-0" /> Berhasil Disimpan ke Bank Soal! ✔
                  </>
                ) : isSavingToBank ? (
                  <>
                    <Loader2 size={14} className="animate-spin shrink-0" /> Menyimpan naskah soal...
                  </>
                ) : (
                  <>
                    <span className="text-sm shrink-0">💾</span> Simpan ke Bank Soal
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DETAILED QUESTION & SVG IMAGE REGENERATOR MODAL */}
      {editingQuestion && (
        <div 
          onPaste={handlePasteImageOrUrl}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[200] p-3 sm:p-6 overflow-y-auto scroll-smooth transition-all duration-305"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-[94vw] max-w-4xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] border-2 border-indigo-100 animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 text-white rounded-xl flex items-center justify-center text-lg shadow-inner">
                  ✏️
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                    Sunting Butir Soal Nomor #{editingQuestion.number}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-indigo-100 mt-0.5 font-semibold">
                    Atur konten naskah, stimuli cerita, alternatif pilihan ganda, kunci utama, hingga diagram visual pendukung.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 transition-all flex items-center justify-center text-white cursor-pointer hover:scale-105 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs (High Contrast, Brighter Capsule Styling) */}
            <div className="bg-slate-105 border-b border-slate-200/85 px-6 py-3 flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab("content")}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all uppercase flex items-center gap-2 cursor-pointer border ${
                  modalTab === "content" 
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 border-indigo-600Scale" 
                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                }`}
              >
                📝 Konten &amp; Kunci Jawaban
              </button>
              <button
                type="button"
                onClick={() => setModalTab("media")}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all uppercase flex items-center gap-2 cursor-pointer border relative ${
                  modalTab === "media" 
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 border-indigo-600Scale" 
                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                }`}
              >
                🎨 Gambar Pendukung Soal
                {(editingQuestion.svgContent || editingQuestion.imageUrl) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-450 block animate-ping" />
                )}
              </button>
            </div>

            {/* Modal Body Scroll Container */}
            <div 
              onPaste={modalTab === "media" ? handlePasteImageOrUrl : undefined}
              className="p-6 bg-slate-50/50 overflow-y-auto flex-1 max-h-[calc(95vh-190px)] sm:max-h-[calc(90vh-190px)] space-y-5 scroll-smooth pr-5"
            >
              
              {modalTab === "content" && (
                <div className="space-y-4">
                  {/* Row 1: Pokok Bahasan */}
                  <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
                    <label className="text-[12px] font-black text-slate-850 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <span className="text-indigo-600">📌</span> Materi / Pokok Bahasan
                    </label>
                    <input
                      type="text"
                      value={editingQuestion.materi}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, materi: e.target.value })}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-350 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all bg-white text-slate-900 shadow-inner"
                      placeholder="Masukkan materi pokok soal..."
                    />
                  </div>

                  {/* Stimulus */}
                  <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
                    <label className="text-[12px] font-black text-slate-850 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <span className="text-indigo-600">📖</span> Teks Stimulus (Cerita / Deskripsi Konteks) <span className="text-slate-450 italic font-medium lowercase text-[11px]">(Opsional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={editingQuestion.stimulusText || ""}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, stimulusText: e.target.value })}
                      placeholder="Contoh: Teks bacaan, tabel pengamatan sains, cerita, atau stimulus pendukung soal..."
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-350 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all bg-white text-slate-900 shadow-inner"
                    />
                  </div>

                  {/* Teks Pertanyaan */}
                  <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
                    <label className="text-[12px] font-black text-slate-850 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <span className="text-indigo-600">❓</span> Kalimat Pertanyaan Utama
                    </label>
                    <textarea
                      rows={4}
                      value={editingQuestion.questionText}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-350 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all bg-white text-slate-900 shadow-inner"
                    />
                  </div>

                  {/* Opsi Pilihan Ganda */}
                  {editingQuestion.questionType === "Pilihan Ganda" && editingQuestion.options && (
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <label className="text-[12px] font-black text-slate-850 uppercase tracking-wider block">
                          🔘 Pilihan Alternatif Jawaban (A, B, C, D)
                        </label>
                        <span className="text-[9.5px] text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-md select-none">
                          Prefix Huruf Diatur Otomatis ✨
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-35">
                        {editingQuestion.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const cleanVal = opt.replace(/^[a-dA-D][.\s)]+/, "");
                          return (
                            <div key={oIdx} className="flex items-center bg-slate-50 hover:bg-slate-100/90 rounded-xl border border-slate-350 overflow-hidden pr-2 transition-all">
                              <span className="bg-slate-200 text-slate-800 text-xs font-extrabold px-3.5 py-3 shrink-0 select-none border-r border-slate-300">
                                {letter}
                              </span>
                              <input
                                type="text"
                                value={cleanVal}
                                placeholder={`Opsi ${letter}...`}
                                onChange={(e) => {
                                  const newOpts = [...(editingQuestion.options || [])];
                                  newOpts[oIdx] = `${letter}. ${e.target.value}`;
                                  setEditingQuestion({ ...editingQuestion, options: newOpts });
                                }}
                                className="w-full text-xs font-black p-2.5 bg-transparent outline-none border-none text-slate-900"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Kunci Jawaban & Pembahasan */}
                  <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div>
                      <label className="text-[12px] font-black text-slate-850 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                        <span className="text-emerald-600">🔑</span> Kunci Jawaban Definitif
                      </label>
                      {editingQuestion.questionType === "Pilihan Ganda" ? (
                        <div className="flex bg-slate-100 border border-slate-300 p-1.5 rounded-2xl gap-1.5 max-w-sm">
                          {["A", "B", "C", "D"].map((letter) => {
                            const isSelected = editingQuestion.answerKey.toUpperCase().trim() === letter || 
                              editingQuestion.answerKey.toUpperCase().trim().startsWith(letter + ".");
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={() => setEditingQuestion({ ...editingQuestion, answerKey: letter.toLowerCase() })}
                                className={`flex-1 py-2.5 font-black text-xs rounded-xl cursor-pointer transition-all ${
                                  isSelected 
                                    ? "bg-slate-900 text-white shadow-md" 
                                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-200"
                                }`}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={editingQuestion.answerKey}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, answerKey: e.target.value })}
                          className="w-full text-xs font-black p-3 rounded-xl border border-slate-350 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all bg-white text-slate-900 shadow-inner"
                          placeholder="Masukkan kunci jawaban..."
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-[12px] font-black text-slate-850 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                        <span className="text-amber-600">💡</span> Pedoman Penilaian / Penjelasan Pembahasan
                      </label>
                      <textarea
                        rows={3}
                        value={editingQuestion.explanation}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                        className="w-full text-xs font-bold p-3 rounded-xl border border-slate-350 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all bg-white text-slate-900 shadow-inner"
                        placeholder="Uraikan pembahasan soal yang mendalam di sini..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "media" && (
                <div className="space-y-5">
                  
                  {/* Status & Visual Image Preview Sheet */}
                  <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[12px] font-black text-slate-850 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <span className="text-pink-500">🖼️</span> Pratinjau Visual Gambar Pendukung Saat Ini
                    </span>
                    <div className="min-h-[180px] bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                      {editingQuestion.svgContent || editingQuestion.imageUrl ? (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center w-full">
                          {renderQuestionIllustration(editingQuestion, subject)}
                          <div className="mt-3 flex flex-col items-center gap-1.5 w-full">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-black bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md">
                                {editingQuestion.svgContent ? "Tipe SVG Pembelajaran" : "Tipe Foto / Link Eksperimental"}
                              </span>
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 font-extrabold border border-red-200 px-2.5 py-1 rounded-md transition-all cursor-pointer"
                              >
                                ✕ Hapus Gambar
                              </button>
                            </div>
                            <p className="text-[9.5px] text-zinc-500 font-bold select-none text-center bg-zinc-50 p-1.5 rounded-lg border border-dashed border-zinc-200 w-full">
                              💡 Tips: Anda dapat langsung menekan **Ctrl+V (Paste)** gambar atau tautan di mana saja pada layar ini untuk menimpa berkas pendukung ini!
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-2.5 p-5 text-slate-500">
                          {/* Live interactive empty frame for sizing visibility */}
                          <div 
                            className="bg-white rounded-xl border border-slate-250 mx-auto overflow-hidden transition-all duration-300 flex items-center justify-center p-2 shadow-xs bg-stripes bg-stripes-slate-100"
                            style={{
                              width: `${editingQuestion.imageWidth || 240}px`,
                              height: `${editingQuestion.imageHeight || 140}px`,
                              maxWidth: "100%",
                            }}
                          >
                            <div className="text-center p-2">
                              <p className="text-[11px] font-bold text-slate-400">Bingkai Aktif Kosong</p>
                              <p className="text-[9.5px] text-slate-400">({editingQuestion.imageWidth || 240} × {editingQuestion.imageHeight || 140}px)</p>
                            </div>
                          </div>
                          
                          <p className="text-xs font-black text-slate-800 font-sans mt-2">Materi Soal Belum Memiliki Gambar Ilustrasi</p>
                          <p className="text-[10.5px] text-slate-550 leading-relaxed max-w-sm mx-auto font-semibold">
                            Gunakan tombol asisten AI di bawah untuk merancang gambar, atau **tekan Ctrl+V (Paste) langsung** salinan berkas gambar atau tautan link gambar di layar ini!
                          </p>
                          <button
                            type="button"
                            onClick={() => setEditingQuestion({
                              ...editingQuestion,
                              imageWidth: editingQuestion.imageWidth || 240,
                              imageHeight: editingQuestion.imageHeight || 140,
                              svgContent: `<svg viewBox="0 0 245 145" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="4"/><circle cx="122" cy="72" r="28" fill="#cbd5e1"/><text x="122" y="76" font-family="'Inter', sans-serif" font-size="10" font-weight="950" fill="#475569" text-anchor="middle">Ilustrasi Pelajaran Aktif</text></svg>`
                            })}
                            className="px-3.5 py-1.5 bg-slate-900 border border-slate-950 text-white rounded-xl text-[10.5px] font-black cursor-pointer shadow-xs hover:bg-slate-800 active:scale-95 transition-all"
                          >
                            ✨ Contoh Gambar Penjelas
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* WORD-STYLE SIZING PANEL */}
                  {true && (
                    <div className="p-4.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                        <span className="text-md">📏</span>
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Atur Dimensi Ukuran Gambar Layout Dokumen</h4>
                      </div>

                      {/* Presets Row */}
                      <div>
                        <span className="text-[10px] font-black text-slate-700 uppercase block mb-1.5">Pilih Ukuran Proporsi Instan:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingQuestion({ ...editingQuestion, imageWidth: 120, imageHeight: 80 })}
                            className={`px-3 py-2 text-[10px] font-black rounded-xl border transition-all cursor-pointer ${
                              (editingQuestion.imageWidth === 120 && editingQuestion.imageHeight === 80)
                                ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                                : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            🔎 Kecil (120×80)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingQuestion({ ...editingQuestion, imageWidth: 240, imageHeight: 140 })}
                            className={`px-3 py-2 text-[10px] font-black rounded-xl border transition-all cursor-pointer ${
                              (!editingQuestion.imageWidth || (editingQuestion.imageWidth === 240 && editingQuestion.imageHeight === 140))
                                ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                                : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            ⚖️ Sedang (240×140)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingQuestion({ ...editingQuestion, imageWidth: 360, imageHeight: 200 })}
                            className={`px-3 py-2 text-[10px] font-black rounded-xl border transition-all cursor-pointer ${
                              (editingQuestion.imageWidth === 360 && editingQuestion.imageHeight === 200)
                                ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                                : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            🖼️ Besar (360×200)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingQuestion({ ...editingQuestion, imageWidth: 500, imageHeight: 280 })}
                            className={`px-3 py-2 text-[10px] font-black rounded-xl border transition-all cursor-pointer ${
                              (editingQuestion.imageWidth === 500 && editingQuestion.imageHeight === 280)
                                ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                                : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            🖥️ Luas (500×280)
                          </button>
                        </div>
                      </div>

                      {/* Custom Sliders for Fine-Tuning */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
                        {/* Width Slider with Number Input */}
                        <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-250">
                          <div className="flex justify-between items-center text-[10px] font-black text-slate-700">
                            <span>↔️ Lebar Gambar (Panjang):</span>
                            <div className="flex items-center gap-1.55">
                              <input
                                type="number"
                                min="60"
                                max="600"
                                value={editingQuestion.imageWidth || 240}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 240;
                                  setEditingQuestion({
                                    ...editingQuestion,
                                    imageWidth: Math.min(600, Math.max(60, val))
                                  });
                                }}
                                className="w-16 text-center text-xs font-mono font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-indigo-700"
                              />
                              <span className="font-mono text-[9px] text-slate-500 font-bold">px</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="60"
                            max="600"
                            step="10"
                            value={editingQuestion.imageWidth || 240}
                            onChange={(e) => setEditingQuestion({
                              ...editingQuestion,
                              imageWidth: parseInt(e.target.value)
                            })}
                            className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <p className="text-[9px] text-slate-550 font-semibold leading-none">Seret slider atau ketik nilai lebar presisi</p>
                        </div>

                        {/* Height Slider with Number Input */}
                        <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-250">
                          <div className="flex justify-between items-center text-[10px] font-black text-slate-700">
                            <span>↕️ Tinggi Gambar Layout:</span>
                            <div className="flex items-center gap-1.55">
                              <input
                                type="number"
                                min="40"
                                max="400"
                                value={editingQuestion.imageHeight || 140}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 140;
                                  setEditingQuestion({
                                    ...editingQuestion,
                                    imageHeight: Math.min(400, Math.max(40, val))
                                  });
                                }}
                                className="w-16 text-center text-xs font-mono font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-indigo-700"
                              />
                              <span className="font-mono text-[9px] text-slate-500 font-bold">px</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="40"
                            max="400"
                            step="10"
                            value={editingQuestion.imageHeight || 140}
                            onChange={(e) => setEditingQuestion({
                              ...editingQuestion,
                              imageHeight: parseInt(e.target.value)
                            })}
                            className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <p className="text-[9px] text-slate-555 font-semibold leading-none">Seret slider atau ketik nilai tinggi presisi</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ERROR REPORT BOX */}
                  {imageError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-red-850 text-xs rounded-xl flex items-center gap-2 font-bold animate-pulse">
                      <span>⚠️ Error:</span>
                      <p>{imageError}</p>
                    </div>
                  )}

                  {/* STEP 1: AI AUTO_GENERATION */}
                  <div className="p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-2 border-indigo-250 rounded-2xl space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-600 animate-bounce" />
                      <h4 className="text-xs sm:text-sm font-black text-indigo-900 uppercase tracking-wide">🪄 Hasilkan Gambar Diagram/Sains Kustom via AI</h4>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed font-semibold">
                      Gemini AI akan secara otomatis menelaah seluruh isi naskah pertanyaan utamanya, 
                      kemudian menyusun kode XML SVG ilustrasi berkualitas (seperti pecahan lingkaran matematika, 
                      jaring-jaring bangun ruang, bagan ekosistem IPA, dsb) secara khusus agar naskah terlihat profesional.
                    </p>
                    <button
                      type="button"
                      disabled={regeneratingImage}
                      onClick={handleRegenerateImageAI}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black text-xs rounded-xl inline-flex items-center gap-2 shadow-md hover:shadow-indigo-200 cursor-pointer select-none transition-all"
                    >
                      {regeneratingImage ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" /> Merumuskan SVG Presisi Tinggi...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          Hasilkan Gambar Baru (AI)
                        </>
                      )}
                    </button>
                  </div>

                  {/* IMAGEN PHOTO PROMPT EDITOR SECTION - WITH DETAILED 3D PIXAR STYLING */}
                  <div className="p-5 bg-gradient-to-b from-amber-50 to-amber-100/60 border-2 border-amber-300 rounded-2xl space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📸</span>
                        <h4 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide select-none">Prompt Gambar Pendukung 3D &amp; Pixar (Imagen 3)</h4>
                      </div>
                      <span className="text-[9.5px] uppercase font-black bg-amber-200/90 border border-amber-300 text-amber-900 px-2 py-0.5 rounded-md">
                        3D &amp; Pixar Style ✨
                      </span>
                    </div>
                    <p className="text-[11.5px] text-amber-900 leading-relaxed font-semibold">
                      Ubah atau buat prompt visual di bawah ini. Sempurna jika Anda ingin menjadikannya referensi cerah berupa 
                      **ilustrasi edukasi 3D interaktif bermutu tinggi (Gaya Pixar/Disney 3D)** yang memvisualisasikan benda, makhluk hidup, atau kisah di soal.
                    </p>
                    
                    <textarea
                      rows={4}
                      value={editingQuestion.imagenPrompt || ""}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, imagenPrompt: e.target.value })}
                      placeholder="Gunakan helper tombol di bawah ini untuk merakit prompt 3D Pixar otomatis yang sangat detail berdasarkan isi materi soal ini!"
                      className="w-full text-xs font-mono p-3 bg-white border-2 border-slate-300 rounded-xl outline-hidden text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 leading-relaxed font-bold shadow-inner"
                    />

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const cleanSubject = (subject || "Pelajaran").trim();
                          const cleanMateri = (editingQuestion.materi || "pembelajaran sekolah dasar").trim();
                          const stimulusDetail = (editingQuestion.stimulusText || "").trim();
                          const questionDetail = (editingQuestion.questionText || "").trim();
                          
                          const isMath = cleanSubject.toLowerCase().includes("matematik") || 
                                         cleanMateri.toLowerCase().includes("matematik") ||
                                         questionDetail.toLowerCase().includes("hitung") ||
                                         questionDetail.toLowerCase().includes("jumlah") ||
                                         questionDetail.toLowerCase().includes("pecahan");

                          // Build highly structured, detailed 3D Pixar or Math educational illustration prompt
                          const generatedPrompt = isMath
                            ? `An educational 3D digital math illustration for counting, cute visual textbook schematic style. Depict precisely and clearly: ${stimulusDetail || questionDetail}. The items must be beautifully arranged, highly distinct, isolated, well-spaced, and easy for primary school students to count visually. Colorful cute claymation-like assets, clean wooden surface or soft light-colored pastel solid background, clear volumetric studio lighting, rich colors. No letter labels, no mathematical operator characters, no written text, completely textless, pure visual math presentation.`
                            : `Stunning 3D digital educational illustration, vibrant Pixar style, Disney animation visual aesthetic, depicting a scene about ${cleanMateri}. Scene context: ${stimulusDetail || questionDetail}. Cute relatable characters, rich detailed textures, smooth clay render model, brilliant studio lighting, high contrast color palette, volumetric and soft warm shadows, clean and beautiful academic environment, highly engaging for primary school students, 8k resolution, cinematic composition, no typography, no texts, no watermarks, clear focus vector look.`;
                          
                          setEditingQuestion({ ...editingQuestion, imagenPrompt: generatedPrompt });
                          if (setSuccessToast) {
                            setSuccessToast("Prompt 3D Pixar berhasil dirakit dari materi soal!");
                          }
                        }}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-sm hover:shadow-amber-500/20 transition-all border border-amber-400 flex items-center gap-1"
                      >
                        🚀 Buat Prompt 3D Pixar (Templat)
                      </button>

                      <button
                        type="button"
                        disabled={generatingModalPrompt}
                        onClick={handleModalGeneratePromptAI}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm hover:shadow-indigo-500/20 transition-all border border-indigo-500 flex items-center gap-1.5"
                      >
                        {generatingModalPrompt ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" /> Merakit...
                          </>
                        ) : (
                          <>
                            <span>🪄</span> Hasilkan Prompt (Gemini AI)
                          </>
                        )}
                      </button>
                      
                      {editingQuestion.imagenPrompt && (
                        <div className="flex flex-wrap items-center gap-2 w-full mt-1.5 border-t border-amber-200/50 pt-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(editingQuestion.imagenPrompt || "");
                              if (setSuccessToast) {
                                setSuccessToast("Prompt berhasil disalin ke clipboard!");
                              }
                            }}
                            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-black cursor-pointer shadow-2xs active:scale-95 transition-all flex items-center gap-1.5"
                          >
                            📋 Salin Prompt
                          </button>

                          <button
                            type="button"
                            disabled={regeneratingImage}
                            onClick={handleRegenerateImageAI}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-black cursor-pointer shadow-md select-none transition-all flex items-center gap-1.5 hover:shadow-emerald-200"
                          >
                            {regeneratingImage ? (
                              <>
                                <RefreshCw size={11} className="animate-spin" /> Membuat Gambar AI...
                              </>
                            ) : (
                              <>
                                <span>🎨</span> Buat Gambar dari Prompt Ini
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STEP 2: MANUAL SOURCE INPUT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                    {/* Method A: File Upload */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                      <label className="text-[11px] font-black text-slate-700 uppercase block select-none">
                        Pilihan A: Unggah Berkas Gambar Mandiri (.png, .jpg / maks 2MB)
                      </label>
                      <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-300">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLocalImageUpload}
                          className="block w-full text-[10px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Method B: URL input */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                      <label className="text-[11px] font-black text-slate-700 uppercase block select-none">
                        Pilihan B: Tempel Tautan / URL Link Gambar Online
                      </label>
                      <input
                        id="image-url-input"
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={editingQuestion.imageUrl || ""}
                        onChange={(e) => setEditingQuestion({
                          ...editingQuestion,
                          imageUrl: e.target.value,
                          svgContent: undefined // clear SVG
                        })}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 outline-hidden focus:border-indigo-500 bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* SVG Code direct input (Advanced) */}
                  <div className="pt-2 border-t border-slate-205">
                    <details className="group">
                      <summary className="text-[11px] text-indigo-600 hover:text-indigo-800 font-black cursor-pointer select-none outline-hidden pb-1 hover:underline">
                        ⚙️ Opsi Lanjutan: Tinjau &amp; Sunting Kode XML SVG Langsung
                      </summary>
                      <div className="mt-2 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                        <textarea
                          rows={5}
                          value={editingQuestion.svgContent || ""}
                          onChange={(e) => setEditingQuestion({
                            ...editingQuestion,
                            svgContent: e.target.value,
                            imageUrl: undefined
                          })}
                          placeholder="<svg viewBox='0 0 100 100'>...</svg>"
                          className="w-full text-[10.5px] font-mono p-3 bg-slate-950 text-emerald-450 rounded-xl outline-hidden border border-slate-800 focus:border-emerald-500"
                        />
                      </div>
                    </details>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400 font-light hidden sm:inline">
                *Tinggi visual SVG otomatis menyesuaikan cetakan kertas dokumen ujian.
              </span>
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saveSuccess}
                  onClick={handleSaveModal}
                  className={`px-5 py-2 text-xs font-extrabold text-white transition-all duration-300 rounded-xl cursor-pointer inline-flex items-center gap-1.5 ${
                    saveSuccess
                      ? "bg-emerald-600 scale-105"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                  }`}
                >
                  {saveSuccess ? (
                    <>
                      <Check size={14} className="animate-bounce" /> Berhasil Disimpan! ✔
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
