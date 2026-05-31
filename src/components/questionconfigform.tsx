import React from "react";
import { QuestionConfig } from "../types";
import { ListFilter, Plus, Trash2, HelpCircle } from "lucide-react";

interface QuestionConfigFormProps {
  configs: QuestionConfig[];
  onChange: (configs: QuestionConfig[]) => void;
}

export default function QuestionConfigForm({ configs, onChange }: QuestionConfigFormProps) {
  
  const handleAddRow = () => {
    const defaultNewRow: QuestionConfig = {
      type: "Pilihan Ganda",
      count: 5,
      cognitiveLevel: "Level 1"
    };
    onChange([...configs, defaultNewRow]);
  };

  const handleRemoveRow = (idx: number) => {
    // Keep at least one configuration
    if (configs.length === 1) return;
    onChange(configs.filter((_, i) => i !== idx));
  };

  const handleChangeRow = (idx: number, field: keyof QuestionConfig, value: any) => {
    const updated = configs.map((cfg, i) => {
      if (i === idx) {
        return { ...cfg, [field]: value };
      }
      return cfg;
    });
    onChange(updated);
  };

  const totalQuestions = configs.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);

  return (
    <div id="question-config-form" className="bingkai-emas-premium p-4 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3.5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-700 text-slate-950 rounded-xl shadow-md flex items-center justify-center font-black">
            <ListFilter size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-amber-400 tracking-wider uppercase">
              Aturan &amp; Spesifikasi Butir Soal
            </h2>
            <p className="text-[10px] font-semibold text-slate-400">Tentukan distribusi jenis soal dan standar tingkat kesukaran kognitif.</p>
          </div>
        </div>
        <div className="shrink-0 bg-gradient-to-r from-amber-600 to-amber-550 px-3 py-1.5 rounded-lg text-slate-950 text-[10px] font-black shadow-md flex items-center gap-1.5">
          <span>🚀</span> KELUARAN: <span className="underline decoration-amber-950 font-extrabold text-xs">{totalQuestions} Butir</span>
        </div>
      </div>

      {/* Info Level Kognitif */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-350 leading-relaxed">
          <span className="font-extrabold block mb-1 text-amber-500 flex items-center gap-1.5 uppercase tracking-widest text-[9px]">
            🧠 Level 1 (LOTS)
          </span>
          Mengingat &amp; memahami fakta dasar, rumus baku, grafik sederhana, atau hitungan langsung.
        </div>
        <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-350 leading-relaxed">
          <span className="font-extrabold block mb-1 text-amber-400 flex items-center gap-1.5 uppercase tracking-widest text-[9px]">
            ⚡ Level 2 (MOTS)
          </span>
          Mengaplikasikan konsep/prosedur matematika atau sains dalam penyelesaian kasus kontekstual rutin.
        </div>
        <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-350 leading-relaxed">
          <span className="font-extrabold block mb-1 text-[#ea580c] flex items-center gap-1.5 uppercase tracking-widest text-[9px]">
            🔥 Level 3 (HOTS)
          </span>
          Pemecahan masalah non-rutin, analisis stimulus cerita mendalam, mengambil keputusan kualitatif.
        </div>
      </div>

      {/* Tabel Konfigurasi */}
      <div className="space-y-3.5">
        {configs.map((row, idx) => (
          <div
            key={idx}
            className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 p-4.5 bg-gradient-to-br from-slate-900/40 to-slate-950/20 rounded-xl border border-slate-800/80 hover:border-amber-500/25 transition-all duration-300 shadow-md hover:shadow-amber-500/[0.02]"
          >
            <div className="w-full lg:flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Jenis Soal */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-amber-500/80 tracking-widest flex items-center gap-1.5">
                  📝 Jenis Soal
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs pointer-events-none">
                    ✏️
                  </span>
                  <select
                    value={row.type ?? "Pilihan Ganda"}
                    onChange={(e) => handleChangeRow(idx, "type", e.target.value)}
                    className="w-full pl-9 pr-3 py-3.5 bg-slate-950/85 border border-slate-800/90 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all cursor-pointer text-slate-200"
                  >
                    <option value="Pilihan Ganda">Pilihan Ganda (PG)</option>
                    <option value="Isian Singkat">Isian Singkat</option>
                    <option value="Uraian">Uraian / Essay</option>
                  </select>
                </div>
              </div>

              {/* Kedalaman Kognitif */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-amber-500/80 tracking-widest flex items-center gap-1.5">
                  🎓 Kedalaman Kognitif
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs pointer-events-none">
                    🧠
                  </span>
                  <select
                    value={row.cognitiveLevel ?? "Level 1"}
                    onChange={(e) => handleChangeRow(idx, "cognitiveLevel", e.target.value)}
                    className="w-full pl-9 pr-3 py-3.5 bg-slate-950/85 border border-slate-800/90 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all cursor-pointer text-slate-200"
                  >
                    <option value="Level 1">Level 1 (Pengetahuan &amp; Pemahaman - LOTS)</option>
                    <option value="Level 2">Level 2 (Aplikasi &amp; Penerapan - MOTS)</option>
                    <option value="Level 3">Level 3 (Penalaran &amp; Analisis - HOTS)</option>
                  </select>
                </div>
              </div>

              {/* Jumlah Soal */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-amber-500/80 tracking-widest flex items-center gap-1.5">
                  🔢 Jumlah Soal
                </label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs pointer-events-none">
                    📊
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={row.count ?? 5}
                    onChange={(e) => handleChangeRow(idx, "count", Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full pl-9 pr-12 py-3.5 bg-slate-950/85 border border-slate-800/90 rounded-lg text-xs font-black text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all"
                  />
                  <span className="absolute right-3 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider pointer-events-none">
                    Butir
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 lg:pt-5 self-end lg:self-center flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleRemoveRow(idx)}
                disabled={configs.length === 1}
                className="p-2.5 bg-rose-950/20 border border-rose-900/40 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-all disabled:opacity-20 cursor-pointer shadow-sm shrink-0 active:scale-95 duration-150"
                title="Hapus spesifikasi ini"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div id="add-rule-action-group" className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleAddRow}
            id="btn-add-config-row"
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 border border-amber-500/20 hover:border-amber-500/50 hover:bg-slate-850 text-amber-400 hover:text-amber-300 font-extrabold text-[10px] uppercase tracking-wider rounded-lg inline-flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer"
          >
            <Plus size={14} /> Tambah Aturan Distribusi Baru
          </button>

          <div
            id="total-configured-circle-wrapper"
            className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 p-1.5 pr-2.5 rounded-lg shrink-0 shadow-inner"
            title="Total kuota butir soal disusun"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-550 flex items-center justify-center text-slate-950 text-[11px] font-black shadow-md shadow-amber-500/10">
              {totalQuestions}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#93c5fd]/75">Soal</span>
          </div>
        </div>

        <span className="text-[10px] text-slate-550 font-semibold italic">💡 Materi akan dipecah secara proporsional sesuai jenis soal di atas.</span>
      </div>
    </div>
  );
}
