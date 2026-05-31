import React, { useState } from "react";
import { QuestionItem } from "../types";
import { 
  Maximize2, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  AlertTriangle, 
  X, 
  Sparkles,
  Trash2
} from "lucide-react";

interface QuestionWithImageProps {
  q: QuestionItem;
  subject: string;
  onUpdateQuestion?: (updatedQ: QuestionItem) => void;
  disabled?: boolean;
}

export default function QuestionWithImage({ q, subject, onUpdateQuestion, disabled = false }: QuestionWithImageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showPromptInput, setShowPromptInput] = useState(false);

  const imageWidth = q.imageWidth || 380;
  const imageHeight = q.imageHeight || 190;

  const handleRegenerateFromAI = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (disabled || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-api-key": localStorage.getItem("ttu_user_api_key") || ""
        },
        body: JSON.stringify({
          subject,
          question: q,
          prompt: customPrompt.trim() || undefined,
          userApiKey: localStorage.getItem("ttu_user_api_key") || "",
        })
      });

      if (!response.ok) {
        throw new Error(`Gagal memanggil API (${response.status})`);
      }

      const data = await response.json();
      if (data.imageUrl && onUpdateQuestion) {
        onUpdateQuestion({
          ...q,
          imageUrl: data.imageUrl,
          svgContent: undefined,
          imagenPrompt: customPrompt.trim() || q.imagenPrompt
        });
        setShowPromptInput(false);
      } else {
        throw new Error("Respons gambar tidak mengandung data URL yang valid.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal membangkitkan gambar AI.");
    } finally {
      setLoading(false);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateQuestion) {
      onUpdateQuestion({
        ...q,
        imageUrl: undefined,
        svgContent: undefined
      });
    }
  };

  if (!q.imageUrl && !q.svgContent) {
    return null;
  }

  return (
    <div 
      className="question-illustration print-avoid-break group relative my-5 ml-0 mr-auto bg-slate-50 border-2 border-slate-300 border-dashed rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-300 hover:border-emerald-505 hover:bg-emerald-50/10"
      style={{
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        maxWidth: "100%",
      }}
    >
      {/* 1. Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-30 text-center p-4">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[11px] font-black tracking-wider text-amber-500 mt-3 uppercase animate-pulse">
            ✨ Seniman AI Merumuskan Gambar...
          </p>
          <p className="text-[9px] text-slate-400 mt-1">Menggunakan Google Imagen 3</p>
        </div>
      )}

      {/* 2. Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-xs flex flex-col items-center justify-center z-30 p-4 text-center">
          <AlertTriangle className="text-rose-400 w-7 h-7 mb-2 animate-bounce" />
          <p className="text-xs font-bold text-rose-200">Batas Limit Gambar Terlampaui</p>
          <p className="text-[10px] text-rose-300/80 max-w-[280px] mt-1 leading-snug">{error}</p>
          <div className="flex gap-2 mt-3.5 no-print">
            <button
              onClick={handleRegenerateFromAI}
              className="px-2.5 py-1.5 bg-rose-650 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={11} /> Coba Lagi
            </button>
            <button
              onClick={() => setError(null)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Illustration Canvas */}
      {q.imageUrl ? (
        <div className="w-full h-full relative flex items-center justify-center">
          <img 
            src={q.imageUrl} 
            alt={`Ilustrasi Soal ${q.number}`} 
            className="w-full h-full object-cover transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : q.svgContent ? (
        <div 
          className="w-full h-full p-2 flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-full [&_svg]:h-full"
          dangerouslySetInnerHTML={{ __html: q.svgContent }}
        />
      ) : null}

      {/* Flag to mark it's an AI or Educational illustration in print */}
      <div 
        className="absolute bottom-1 right-2 text-[8px] text-slate-400 font-bold select-none no-print group-hover:hidden transition-all pointer-events-none"
      >
        {q.imageUrl ? "✦ Gambar AI" : "✦ Sketsa Vektor"}
      </div>

      {/* 4. Overlay Controls (Visible on hover; completely hidden in print) */}
      {!disabled && !loading && (
        <div 
          className="absolute inset-x-0 bottom-0 bg-slate-900/95 border-t border-slate-700 p-1.5 px-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 no-print"
        >
          <div className="flex gap-1 items-center">
            {q.imageUrl && (
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                className="px-2 py-1 bg-slate-800 hover:bg-black border border-slate-700 text-white rounded text-[9px] font-bold transition-all cursor-pointer"
                title="Zoom Tampilan"
              >
                🔎 Lihat
              </button>
            )}
          </div>
          <div className="flex gap-1.5 items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (q.imageUrl) {
                  const link = document.createElement("a");
                  link.href = q.imageUrl;
                  link.download = `gambar_soal_${q.number}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else if (q.svgContent) {
                  const blob = new Blob([q.svgContent], { type: "image/svg+xml;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `gambar_soal_${q.number}.svg`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-black transition-all cursor-pointer flex items-center gap-0.5"
              title="Simpan Gambar"
            >
              📥 Simpan Gambar
            </button>
            <button
              type="button"
              onClick={clearImage}
              className="px-2.5 py-1 bg-rose-650 hover:bg-rose-700 text-white rounded text-[9px] font-black transition-all cursor-pointer flex items-center gap-0.5"
              title="Hapus Gambar"
            >
              🗑️ Hapus Gambar
            </button>
          </div>
        </div>
      )}

      {/* 5. Lightbox Modal Zoom (Portal inline for pure responsive UX) */}
      {zoomOpen && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 no-print"
          onClick={() => setZoomOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col bg-slate-950 border border-slate-800 rounded-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
              <div className="text-left">
                <h4 className="text-sm font-black text-white uppercase tracking-tight">🔎 Pratinjau Detil Ilustrasi Soal #{q.number}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{q.questionText}</p>
              </div>
              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body Canvas */}
            <div className="h-[55vh] w-full flex items-center justify-center overflow-auto bg-slate-900 border border-slate-850 rounded-2xl relative">
              <div 
                style={{ transform: `scale(${zoomScale})` }}
                className="transition-transform duration-200"
              >
                <img 
                  src={q.imageUrl} 
                  alt="Ilustrasi Detil" 
                  className="max-h-[50vh] max-w-[80vw] object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Float scale display */}
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-mono text-amber-500 tracking-wider">
                Skala: {Math.round(zoomScale * 100)}%
              </div>
            </div>

            {/* Modal Controls footer */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomScale(p => Math.max(0.5, p - 0.25))}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 rounded-xl flex items-center justify-center cursor-pointer"
                  title="Perkecil"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-105 rounded-xl text-xs font-mono cursor-pointer"
                  title="Ukur Semestinya"
                >
                  1:1
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(p => Math.min(3.0, p + 0.25))}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-355 rounded-xl flex items-center justify-center cursor-pointer"
                  title="Perbesar"
                >
                  <ZoomIn size={15} />
                </button>
              </div>

              <div className="text-[10px] font-semibold text-slate-400">
                Gunakan kursor klik/tarik gambar atau cubit layar untuk berinteraksi.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
