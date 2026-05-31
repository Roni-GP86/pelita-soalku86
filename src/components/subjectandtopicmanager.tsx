import React, { useState } from "react";
import { clientGenerateTopics } from "../services/ai-client";
import { SubjectType, AIElementTopic, AITopic, SchoolInfo } from "../types";
import { BookOpen, Sparkles, Loader2, CheckSquare, Plus, Trash2, FolderOpen, ListPlus, ChevronRight, AlertCircle } from "lucide-react";

interface SubjectAndTopicManagerProps {
  gradeClass: string;
  selectedSubject: SubjectType;
  onSubjectChange: (subject: SubjectType) => void;
  fetchedData: AIElementTopic[];
  onFetchedDataChange: (data: AIElementTopic[]) => void;
  selectedTopics: string[];
  onSelectedTopicsChange: (topics: string[]) => void;
  onFallbackChange?: (active: boolean) => void;
  isLocked?: boolean;
  isIdentityLocked?: boolean;
  schoolInfo?: SchoolInfo;
  errorHeader?: string | null;
  setErrorHeader?: (val: string | null) => void;
}

export default function SubjectAndTopicManager({
  gradeClass,
  selectedSubject,
  onSubjectChange,
  fetchedData,
  onFetchedDataChange,
  selectedTopics,
  onSelectedTopicsChange,
  onFallbackChange,
  isLocked = false,
  isIdentityLocked = false,
  schoolInfo,
  errorHeader,
  setErrorHeader,
}: SubjectAndTopicManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMateriText, setNewMateriText] = useState("");
  const [selectedElementIndex, setSelectedElementIndex] = useState<number>(0);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number>(0);

  const subjects = [
    { value: "Agama" as any, label: "Pendidikan Agama", desc: "Pilih agama untuk penyusunan soal mandiri", color: "from-purple-600 to-indigo-750", emoji: "🕌", textGradient: "from-purple-700 to-indigo-900" },
    { value: "Pendidikan Pancasila" as any, label: "Pendidikan Pancasila", desc: "Pancasila, UUD 1945, NKRI, Bhinneka Tunggal Ika", color: "from-yellow-500 to-amber-600", emoji: "🦅", textGradient: "from-yellow-600 to-amber-800" },
    { value: "Bahasa Indonesia" as any, label: "Bahasa Indonesia", desc: "Menyimak, Membaca, Berbicara, Menulis", color: "from-slate-800 to-slate-950", emoji: "🇮🇩", textGradient: "from-slate-800 to-slate-950" },
    { value: "Matematika" as any, label: "Matematika", desc: "Bilangan, Aljabar, Pengukuran, Geometri, Data", color: "from-blue-600 to-blue-750", emoji: "🧮", textGradient: "from-blue-700 to-blue-900" },
    { value: "IPAS" as any, label: "IPAS (Sains & Sosial)", desc: "Gejala Alam, Sosial, Lingkungan, dan Kontekstual", color: "from-emerald-500 to-emerald-650", emoji: "🌱", textGradient: "from-emerald-600 to-emerald-900" },
    { value: "Bahasa Inggris" as any, label: "Bahasa Inggris", desc: "Listening, Speaking, Reading, Writing, Vocabulary", color: "from-cyan-600 via-blue-650 to-indigo-750", emoji: "🇬🇧", textGradient: "from-cyan-700 to-indigo-900" },
    { value: "PJOK" as any, label: "PJOK", desc: "Keterampilan Gerak, Aktivitas Jasmani, Pola Hidup Sehat", color: "from-orange-500 to-orange-650", emoji: "🏃", textGradient: "from-orange-600 to-orange-850" },
    { value: "Seni Rupa" as any, label: "Seni Rupa", desc: "Unsur Rupa, Menggambar, Melukis, Karya Plastisin", color: "from-pink-500 to-rose-600", emoji: "🎨", textGradient: "from-pink-600 to-rose-850" },
    { value: "Seni Tari" as any, label: "Seni Tari", desc: "Gerak Anggota Tubuh, Ruang, Tempo, Eksplorasi", color: "from-red-500 to-red-650", emoji: "💃", textGradient: "from-red-650 to-red-850" },
    { value: "Seni Musik" as any, label: "Seni Musik", desc: "Tepuk Ritme, Bernyanyi Lagu Nasional, Alat Tiup", color: "from-violet-500 to-purple-650", emoji: "🎵", textGradient: "from-violet-650 to-purple-850" }
  ];

  const religions: { value: SubjectType; label: string; emoji: string }[] = [
    { value: "Pendidikan Agama Islam", label: "Agama Islam", emoji: "🕌" },
    { value: "Pendidikan Agama Kristen", label: "Agama Kristen", emoji: "⛪" },
    { value: "Pendidikan Agama Katolik", label: "Agama Katolik", emoji: "✝️" },
    { value: "Pendidikan Agama Hindu", label: "Agama Hindu", emoji: "🪔" },
    { value: "Pendidikan Agama Buddha", label: "Agama Buddha", emoji: "🛕" },
    { value: "Pendidikan Agama Khonghucu", label: "Agama Khonghucu", emoji: "☯️" },
  ];

  const isAgamaActive = selectedSubject.startsWith("Pendidikan Agama");
  const isGuruKelas = isLocked && schoolInfo?.teacherTitle?.trim().toLowerCase() === "guru kelas";
  const isGuruMapel = isLocked && !isGuruKelas;

  // Auto-restore / Sync cached curriculum instantly when subject or class changes
  React.useEffect(() => {
    if (fetchedData && fetchedData.length > 0) {
      const cacheKey = `ttu_cur_cache_${gradeClass}_${selectedSubject}`;
      if (!localStorage.getItem(cacheKey)) {
        localStorage.setItem(cacheKey, JSON.stringify(fetchedData));
      }
    } else {
      const cacheKey = `ttu_cur_cache_${gradeClass}_${selectedSubject}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onFetchedDataChange(parsed);
            if (selectedTopics.length === 0) {
              const initialTopics: string[] = [];
              parsed.forEach((item: AIElementTopic) => {
                if (item.topics && item.topics.length > 0) {
                  const firstTopic = item.topics[0];
                  if (firstTopic.materi && firstTopic.materi.length > 0) {
                    initialTopics.push(...firstTopic.materi);
                  }
                }
              });
              onSelectedTopicsChange(initialTopics);
            }
            setSelectedElementIndex(0);
            setSelectedTopicIndex(0);
          }
        } catch (e) {
          console.warn("Error restoring from curriculum cache on init:", e);
        }
      }
    }
  }, [selectedSubject, gradeClass]);

  const fetchCurriculum = async (subjectInput: SubjectType) => {
    setLoading(true);
    setError(null);
    if (setErrorHeader) setErrorHeader(null);
    try {
      // 1. Check local browser cache for hyper-speed 0ms loading
      const cacheKey = `ttu_cur_cache_${gradeClass}_${subjectInput}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Elegant micro delay for premium interactive feel
            await new Promise((resolve) => setTimeout(resolve, 300));
            onFetchedDataChange(parsed);
            
            const initialTopics: string[] = [];
            parsed.forEach((item: AIElementTopic) => {
              if (item.topics && item.topics.length > 0) {
                const firstTopic = item.topics[0];
                if (firstTopic.materi && firstTopic.materi.length > 0) {
                  initialTopics.push(...firstTopic.materi);
                }
              }
            });
            onSelectedTopicsChange(initialTopics);
            setSelectedElementIndex(0);
            setSelectedTopicIndex(0);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Curriculum cache parse error, hitting API...", e);
        }
      }

      const data = await clientGenerateTopics(
        subjectInput,
        gradeClass,
        localStorage.getItem("ttu_user_api_key") || ""
      );

      onFetchedDataChange(data);
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }

      // Auto-select initial materials from first topics
      const initialTopics: string[] = [];
      data.forEach((item: AIElementTopic) => {
        if (item.topics && item.topics.length > 0) {
          // Add all materi from the first topic as initial targets
          const firstTopic = item.topics[0];
          if (firstTopic.materi && firstTopic.materi.length > 0) {
            initialTopics.push(...firstTopic.materi);
          }
        }
      });
      onSelectedTopicsChange(initialTopics);
      setSelectedElementIndex(0);
      setSelectedTopicIndex(0);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan koneksi saat memuat materi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSelect = (sub: SubjectType) => {
    const isFaseA = gradeClass === "Kelas 1" || gradeClass === "Kelas 2" || schoolInfo?.phase === "Fase A" || (gradeClass || "").includes("Kelas 1") || (gradeClass || "").includes("Kelas 2");
    
    if (sub === "IPAS" && isFaseA) {
      return;
    }

    if (isIdentityLocked) {
      if (sub !== "Matematika") {
        return;
      }
    } else if (isGuruKelas) {
      if (sub.startsWith("Pendidikan Agama") || sub === "PJOK" || sub === "Bahasa Inggris") {
        return;
      }
    } else if (isGuruMapel) {
      if (selectedSubject !== sub) {
        return;
      }
    } else if (isLocked) {
      if (selectedSubject !== sub) {
        return;
      }
    }
    
    onSubjectChange(sub);

    // Swap instantly if cache is present to eliminate unnecessary loading/empty states
    const cacheKey = `ttu_cur_cache_${gradeClass}_${sub}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onFetchedDataChange(parsed);
          const initialTopics: string[] = [];
          parsed.forEach((item: AIElementTopic) => {
            if (item.topics && item.topics.length > 0) {
              const firstTopic = item.topics[0];
              if (firstTopic.materi && firstTopic.materi.length > 0) {
                initialTopics.push(...firstTopic.materi);
              }
            }
          });
          onSelectedTopicsChange(initialTopics);
          setSelectedElementIndex(0);
          setSelectedTopicIndex(0);
          if (setErrorHeader) setErrorHeader(null);
          return;
        }
      } catch (e) {}
    }

    onFetchedDataChange([]);
    onSelectedTopicsChange([]);
    if (setErrorHeader) setErrorHeader(null);
  };

  const handleSubjectCardClick = (val: string) => {
    let isSubLocked = false;
    const isFaseA = gradeClass === "Kelas 1" || gradeClass === "Kelas 2" || schoolInfo?.phase === "Fase A" || (gradeClass || "").includes("Kelas 1") || (gradeClass || "").includes("Kelas 2");

    if (val === "IPAS" && isFaseA) {
      isSubLocked = true;
    } else if (isIdentityLocked) {
      if (val !== "Matematika") {
        isSubLocked = true;
      }
    } else if (isGuruKelas) {
      if (val === "Agama" || val === "PJOK" || val === "Bahasa Inggris") {
        isSubLocked = true;
      }
    } else if (isGuruMapel) {
      const isMatchingAgama = val === "Agama" && selectedSubject.startsWith("Pendidikan Agama");
      const isMatchingDirect = selectedSubject === val;
      if (!isMatchingAgama && !isMatchingDirect) {
        isSubLocked = true;
      }
    } else if (isLocked) {
      const isAgamaCategory = val === "Agama";
      const isCurrentSubjectAgama = selectedSubject.startsWith("Pendidikan Agama");
      const isMatchingAgama = isAgamaCategory && isCurrentSubjectAgama;
      const isMatchingDirect = selectedSubject === val;
      if (!isMatchingAgama && !isMatchingDirect) {
        isSubLocked = true;
      }
    }

    if (isSubLocked) return;

    if (val === "Agama") {
      if (!selectedSubject.startsWith("Pendidikan Agama")) {
        if (isGuruMapel && selectedSubject.startsWith("Pendidikan Agama")) {
          handleSubjectSelect(selectedSubject);
        } else {
          handleSubjectSelect("Pendidikan Agama Islam");
        }
      }
    } else {
      handleSubjectSelect(val as SubjectType);
    }
  };

  const toggleMateri = (materiName: string) => {
    if (selectedTopics.includes(materiName)) {
      onSelectedTopicsChange(selectedTopics.filter((t) => t !== materiName));
    } else {
      onSelectedTopicsChange([...selectedTopics, materiName]);
    }
  };

  const handleAddCustomMateri = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMateriText.trim()) return;

    if (fetchedData.length === 0) {
      setError("Silakan klik 'Muat Capaian Pembelajaran' terlebih dahulu sebelum menambah materi.");
      return;
    }

    const updatedData = [...fetchedData];
    const targetElement = updatedData[selectedElementIndex];
    if (targetElement) {
      const targetTopic = targetElement.topics[selectedTopicIndex];
      if (targetTopic) {
        targetTopic.materi = [...targetTopic.materi, newMateriText.trim()];
        onFetchedDataChange(updatedData);
        // Auto check the newly added materi
        onSelectedTopicsChange([...selectedTopics, newMateriText.trim()]);
      } else {
        setError("Silakan pilih topik terlebih dahulu.");
      }
    }
    setNewMateriText("");
  };

  const removeMateriFromTopic = (elementIdx: number, topicIdx: number, materiName: string) => {
    const updatedData = [...fetchedData];
    const targetElement = updatedData[elementIdx];
    if (targetElement) {
      const targetTopic = targetElement.topics[topicIdx];
      if (targetTopic) {
        targetTopic.materi = targetTopic.materi.filter((m) => m !== materiName);
        onFetchedDataChange(updatedData);
        onSelectedTopicsChange(selectedTopics.filter((t) => t !== materiName));
      }
    }
  };

  const countSelectedForElement = (el: AIElementTopic) => {
    let count = 0;
    if (!el.topics) return 0;
    el.topics.forEach((top) => {
      if (top.materi) {
        top.materi.forEach((m) => {
          if (selectedTopics.includes(m)) count++;
        });
      }
    });
    return count;
  };

  const countSelectedForTopic = (top: AITopic) => {
    if (!top.materi) return 0;
    return top.materi.filter((m) => selectedTopics.includes(m)).length;
  };

  const activeElement = fetchedData[selectedElementIndex];
  const activeTopic = activeElement?.topics?.[selectedTopicIndex];

  return (
    <div id="subject-topic-manager" className="space-y-6">
      {/* Pilihan Mata Pelajaran */}
      <div className="bingkai-emas-premium p-6 md:p-8">
        {isLocked && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs text-rose-300 gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🔒</span>
              <div>
                <p className="font-extrabold text-[11px] uppercase tracking-wider leading-none text-rose-400">Pilihan Mata Pelajaran Terkunci</p>
                <p className="text-[9.5px] font-semibold text-rose-500/90 mt-1">
                  Mata pelajaran disinkronkan langsung dengan Kode Unik Anda dan tidak bisa diubah secara manual.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/40 font-black text-[9px] rounded-lg tracking-wider block shrink-0">
              KODE AKTIF
            </span>
          </div>
        )}

        <div className="flex items-center gap-3.5 border-b border-slate-800/80 pb-5 mb-6">
          <div className="p-3 bg-gradient-to-tr from-amber-650 via-yellow-550 to-amber-700 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/10 flex items-center justify-center shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-amber-510 tracking-tight flex items-center gap-2 uppercase">
              <span>📚</span> Pilih Mata Pelajaran Utama
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">Materi diselaraskan dengan Capaian Pembelajaran Kurikulum Merdeka Terkini.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {subjects.map((sub) => {
            const isSelected = sub.value === "Agama" 
              ? isAgamaActive 
              : selectedSubject === sub.value;

            const colorMap: Record<string, { border: string, bg: string, ring: string, badge: string }> = {
              "Agama": { border: "border-purple-500", bg: "from-purple-950/45 via-slate-900 to-slate-950", ring: "ring-purple-500/20", badge: "bg-purple-500 text-slate-950" },
              "Matematika": { border: "border-blue-500", bg: "from-blue-950/40 via-slate-900 to-slate-950", ring: "ring-blue-500/20", badge: "bg-blue-500 text-slate-950" },
              "Bahasa Indonesia": { border: "border-slate-550", bg: "from-slate-900 via-slate-950 to-black", ring: "ring-slate-500/20", badge: "bg-slate-400 text-slate-950" },
              "Pendidikan Pancasila": { border: "border-amber-500", bg: "from-amber-950/40 via-slate-900 to-slate-950", ring: "ring-amber-500/20", badge: "bg-amber-500 text-slate-950" },
              "IPAS": { border: "border-emerald-500", bg: "from-emerald-950/40 via-slate-900 to-slate-950", ring: "ring-emerald-500/20", badge: "bg-emerald-500 text-slate-950" },
              "PJOK": { border: "border-orange-500", bg: "from-orange-950/40 via-slate-900 to-slate-950", ring: "ring-orange-500/20", badge: "bg-orange-500 text-slate-950" },
              "Bahasa Inggris": { border: "border-cyan-500", bg: "from-cyan-950/40 via-slate-900 to-slate-950", ring: "ring-cyan-500/20", badge: "bg-cyan-500 text-slate-950" },
              "Seni Rupa": { border: "border-pink-500", bg: "from-pink-950/40 via-slate-900 to-slate-950", ring: "ring-pink-500/20", badge: "bg-pink-500 text-slate-950" },
              "Seni Tari": { border: "border-red-500", bg: "from-red-950/40 via-slate-900 to-slate-950", ring: "ring-red-500/20", badge: "bg-red-500 text-slate-950" },
              "Seni Musik": { border: "border-violet-500", bg: "from-violet-950/40 via-slate-900 to-slate-950", ring: "ring-violet-500/20", badge: "bg-violet-500 text-slate-950" },
            };

            const colors = colorMap[sub.value] || colorMap["Matematika"];

            let isSubLocked = false;
            let lockReason = "";
            const isFaseA = gradeClass === "Kelas 1" || gradeClass === "Kelas 2" || schoolInfo?.phase === "Fase A" || (gradeClass || "").includes("Kelas 1") || (gradeClass || "").includes("Kelas 2");

            if (sub.value === "IPAS" && isFaseA) {
              isSubLocked = true;
              lockReason = "Baru dimulai Kelas 3 (Fase B)";
            } else if (isIdentityLocked) {
              if (sub.value !== "Matematika") {
                isSubLocked = true;
                lockReason = "Dibutuhkan Kode Akses";
              }
            } else if (isGuruKelas) {
              if (sub.value === "Agama" || sub.value === "PJOK" || sub.value === "Bahasa Inggris") {
                isSubLocked = true;
                lockReason = "Rumpun Guru Mapel";
              }
            } else if (isGuruMapel) {
              const isMatchingAgama = sub.value === "Agama" && selectedSubject.startsWith("Pendidikan Agama");
              const isMatchingDirect = selectedSubject === sub.value;
              if (!isMatchingAgama && !isMatchingDirect) {
                isSubLocked = true;
                lockReason = "Rumpun Berbeda";
              }
            } else if (isLocked) {
              isSubLocked = true;
              lockReason = "Terkunci";
            }

            const interactivityStyles = isSubLocked 
              ? "cursor-default" 
              : "cursor-pointer hover:-translate-y-1";

            const cardStyles = isSelected 
              ? `${colors.border} bg-gradient-to-br ${colors.bg} shadow-[0_8px_20px_rgba(0,0,0,0.5)] ring-4 ${colors.ring} scale-[1.02] z-10 text-white` 
              : "border-slate-850 bg-slate-950/40 text-slate-350 hover:bg-slate-900/60 hover:border-slate-700 hover:text-slate-100";

            return (
              <button
                key={sub.label}
                id={`btn-subject-${sub.label.replace(/\s+/g, '-')}`}
                type="button"
                onClick={() => handleSubjectCardClick(sub.value)}
                className={`text-left p-4.5 rounded-2.5xl border transition-all duration-300 ease-out flex flex-col justify-between h-34 relative overflow-hidden group ${interactivityStyles} ${cardStyles}`}
                title={sub.desc}
              >
                <div>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${sub.color} flex items-center justify-center text-white text-base font-black mb-3 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <span>{sub.emoji}</span>
                  </div>
                  <h3 className="font-extrabold text-slate-200 text-xs tracking-tight leading-snug group-hover:text-amber-400 transition-colors duration-200">{sub.label}</h3>
                  <p className="text-[9.5px] mt-1 line-clamp-2 leading-tight font-semibold group-hover:text-slate-400 transition-colors">
                    {sub.desc}
                  </p>
                </div>
                {isSubLocked ? (
                  <div className="absolute top-3.5 right-3.5 bg-rose-500 text-white p-1 rounded-full shadow-md transition-all animate-pulse z-20">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : isSelected ? (
                  <div className={`absolute top-3.5 right-3.5 ${colors.badge} p-1 rounded-full text-xs shadow-md transition-all`}>
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Sub-Pilihan Agama (Hanya Tampil Jika Kategori Agama Aktif) */}
        {isAgamaActive && (
          <div className="mt-5 p-5 bg-purple-950/25 border border-purple-500/20 rounded-2xl animate-in slide-in-from-top duration-300">
            <h4 className="text-[11px] font-black text-purple-450 uppercase tracking-widest block mb-3">
              🕌 Pilih Agama Pengajaran Spesifik:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {religions.map((rel) => {
                const isRelActive = selectedSubject === rel.value;
                const isReligionLocked = isGuruKelas || (isGuruMapel && !isRelActive) || (isLocked && !isRelActive);
                return (
                  <button
                    key={rel.value}
                    type="button"
                    onClick={() => {
                      if (isReligionLocked) return;
                      handleSubjectSelect(rel.value);
                    }}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all duration-300 flex flex-col justify-between h-20 group relative overflow-hidden ${
                      isReligionLocked 
                        ? "cursor-default" 
                        : "cursor-pointer hover:-translate-y-0.5"
                    } ${
                      isRelActive
                        ? "border-purple-500 bg-purple-950/60 text-white ring-4 ring-purple-500/15 animate-pulse"
                        : "border-slate-850 bg-slate-950/50 text-slate-400 hover:bg-slate-900/60 hover:border-purple-800 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xl mb-1 flex items-center justify-between w-full">
                       <span>{rel.emoji}</span>
                    </span>
                    <span className="leading-none group-hover:text-purple-300 truncate w-full flex items-center justify-between" title={rel.label}>
                      <span className="truncate">{rel.label}</span>
                    </span>
                    {isReligionLocked ? (
                      <div className="absolute top-2 right-2 bg-rose-500 text-white p-0.5 rounded-full shadow-md transition-all animate-pulse z-20">
                        <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    ) : isRelActive ? (
                      <div className="absolute top-2 right-2 bg-purple-500 text-slate-950 p-0.5 rounded-full shadow-md transition-all">
                        <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-5 bg-slate-950 border border-slate-850 rounded-2.5xl p-6 shadow-2xl">
          <div className="text-center sm:text-left space-y-2">
            <h4 className="font-extrabold text-slate-200 text-sm flex items-center justify-center sm:justify-start gap-2 uppercase tracking-wide">
              <span>🔔</span> Mata Pelajaran Terpilih: <span className="text-amber-400 bg-amber-955/40 px-3 py-1 text-xs rounded-xl border border-amber-500/20 shadow-md font-black">{selectedSubject}</span>
            </h4>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">Sistem akan menyusun Capaian Pembelajaran, Elemen CP, Topik Utama, dan Rincian Sub-Materi secara otomatis.</p>
          </div>
          <button
            id="btn-fetch-curriculum"
            type="button"
            onClick={() => fetchCurriculum(selectedSubject)}
            disabled={loading}
            className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-95 text-xs font-black rounded-xl inline-flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-550/15"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Menganalisis Kurikulum &amp; Elemen...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} className="animate-pulse text-slate-950" />
                <span>Analisis CP, Topik, &amp; Rincian Materi</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorHeader && (
        <div id="workspace-step2-error" className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-rose-450 text-xs flex items-start gap-3 animate-bounce">
          <AlertCircle size={20} className="shrink-0 text-rose-500 mt-0.5 animate-pulse" />
          <div>
            <h4 className="font-bold text-rose-100 uppercase tracking-wider text-[11px]">Terjadi Gangguan Penyusunan</h4>
            <p className="mt-1 font-semibold text-rose-205">{errorHeader}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/40 rounded-2xl text-rose-450 text-xs font-bold flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0 animate-ping"></span>
          {error}
        </div>
      )}

      {/* TAMPILAN ELEMEN, TOPIK, DAN RINCIAN MATERI SEPERTI PESANAN */}
      {fetchedData.length > 0 && (
        <div className="space-y-4">
          <div className="bg-[#0b101c]/90 rounded-2.5xl p-5 border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider flex items-center gap-2">
                <span>🎯</span> Navigasi Kurikulum Terstruktur
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Pilih Elemen CP di kolom 1, pilih Topik Utama di kolom 2, lalu aktifkan check-list Materi Rinci di kolom 3 sebagai muatan materi butir soal.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 bg-slate-950 px-4.5 py-2.5 rounded-xl border border-slate-850">
              <span className="text-xs text-slate-400 font-bold">Total Materi Terpilih:</span>
              <span className="text-xs font-black px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-500/25 rounded-lg shadow-inner">
                {selectedTopics.length} Materi
              </span>
            </div>
          </div>

          <div id="elements-topics-container" className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10">
            {/* KOLOM 1: ELEMEN CP (🔖) */}
            <div className="bg-slate-900/40 p-5 rounded-2.5xl border border-slate-850 space-y-4 flex flex-col overflow-hidden">
              <div className="border-b border-slate-850/85 pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-100 text-[12.5px] uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> 1. Elemen CP
                </h3>
                <span className="text-[10px] text-blue-400 font-bold bg-blue-955/35 px-2 py-0.5 rounded-md border border-blue-500/10">Kolom Pertama</span>
              </div>
              
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 text-xs">
                {fetchedData.map((item, idx) => {
                  const isActive = selectedElementIndex === idx;
                  const countSelected = countSelectedForElement(item);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedElementIndex(idx);
                        setSelectedTopicIndex(0);
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-350 cursor-pointer block relative ${
                        isActive
                          ? "border-amber-500 bg-slate-900/90 text-white font-extrabold shadow-md ring-2 ring-amber-500/10"
                          : "border-slate-850 bg-slate-950/30 text-slate-400 hover:bg-slate-900/40 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className={`font-black tracking-tight ${isActive ? "text-amber-400" : "text-slate-300"}`}>{item.element}</span>
                        {countSelected > 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-500/20 font-bold rounded-lg text-[9px] shadow-sm whitespace-nowrap shrink-0 animate-pulse">
                            ✓ {countSelected}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-950 text-slate-600 font-semibold rounded-lg text-[9px] whitespace-nowrap shrink-0">
                            0 terpilih
                          </span>
                        )}
                      </div>
                      <p className={`line-clamp-2 text-[10.5px] leading-relaxed font-medium ${isActive ? "text-slate-300" : "text-slate-500"}`}>{item.cp}</p>
                    </button>
                  );
                })}
              </div>

              {/* Capaian Pembelajaran Detail Callout */}
              <div className="bg-[#0b101d] border border-slate-850 rounded-xl p-4 mt-auto text-[11px] leading-relaxed relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
                <h5 className="font-extrabold text-slate-300 flex items-center gap-1.5 uppercase text-[9.5px] tracking-wider mb-1.5">
                  <span className="text-amber-500">📌</span> CP Aktif (Elemen {activeElement?.element}):
                </h5>
                <p className="font-semibold text-slate-405 leading-relaxed italic line-clamp-4">
                  &ldquo;{activeElement?.cp}&rdquo;
                </p>
              </div>
            </div>

            {/* KOLOM 2: TOPIK UTAMA (📂) */}
            <div className="bg-slate-900/40 p-5 rounded-2.5xl border border-slate-850 space-y-4 flex flex-col">
              <div className="border-b border-slate-850/85 pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-100 text-[12.5px] uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> 2. Topik Utama
                </h3>
                <span className="text-[10px] text-amber-500 font-bold bg-amber-955/35 px-2 py-0.5 rounded-md border border-amber-500/10">Pilih Satu Topik</span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {activeElement?.topics && activeElement.topics.length > 0 ? (
                  activeElement.topics.map((topic, topIdx) => {
                    const isActive = selectedTopicIndex === topIdx;
                    const countSelected = countSelectedForTopic(topic);
                    return (
                      <button
                        key={topIdx}
                        type="button"
                        onClick={() => setSelectedTopicIndex(topIdx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all duration-300 cursor-pointer flex items-center justify-between relative ${
                          isActive
                            ? "border-amber-550/80 bg-slate-900 text-white font-extrabold shadow-md ring-2 ring-amber-500/10 text-orange-400"
                            : "border-slate-850 bg-slate-950/45 text-slate-400 hover:bg-slate-900/40 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <FolderOpen size={14} className={isActive ? "text-amber-400" : "text-slate-550"} />
                          <span className={`font-black truncate block leading-tight ${isActive ? "text-amber-355" : "text-slate-300"}`} title={topic.name}>
                            {topic.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {countSelected > 0 && (
                            <span className="text-[9.5px] px-1.5 py-0.5 bg-emerald-950 text-emerald-400 font-bold rounded">
                              {countSelected}
                            </span>
                          )}
                          <ChevronRight size={13} className={isActive ? "text-amber-400" : "text-slate-600"} />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-slate-500 text-xs font-semibold">
                    Silakan muat kurikulum terlebih dahulu.
                  </div>
                )}
              </div>
              
              <div className="mt-auto bg-slate-950/60 rounded-xl p-4 border border-slate-850/60 flex items-center gap-2 text-[10.5px] font-semibold text-slate-400">
                <span className="p-1 bg-amber-500/10 text-amber-500 rounded">💡</span>
                <span>Klik topik di atas untuk menampilkan sub-materi rincinya di kolom sebelah kanan.</span>
              </div>
            </div>

            {/* KOLOM 3: MATERI RINCI (📝) */}
            <div className="bg-slate-900/40 p-5 rounded-2.5xl border border-slate-850 space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-850/85 pb-3 flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-100 text-[12.5px] uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 3. Materi Rinci (Soal)
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-955/35 px-2 py-0.5 rounded-md border border-emerald-500/10">Pilih Muatan</span>
                </div>

                <div className="space-y-2 mt-3 max-h-[280px] overflow-y-auto pr-1">
                  {activeTopic?.materi && activeTopic.materi.length > 0 ? (
                    activeTopic.materi.map((mat, matIdx) => {
                      const isChecked = selectedTopics.includes(mat);
                      return (
                        <div
                          key={matIdx}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                            isChecked
                              ? "border-emerald-500 bg-emerald-955/20 ring-2 ring-emerald-500/10"
                              : "border-slate-850 bg-slate-950/70 hover:bg-slate-900/40 hover:border-slate-800"
                          }`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-slate-200 font-bold overflow-hidden mr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleMateri(mat)}
                              className="rounded text-emerald-500 focus:ring-emerald-400/50 w-4.5 h-4.5 cursor-pointer mt-0.5 shrink-0 border-slate-800 transition-colors bg-slate-900"
                            />
                            <span className="leading-snug text-slate-200 block text-[11.5px]" title={mat}>{mat}</span>
                          </label>
                          
                          <button
                            type="button"
                            onClick={() => removeMateriFromTopic(selectedElementIndex, selectedTopicIndex, mat)}
                            className="text-slate-500 hover:text-rose-400 hover:bg-rose-955/30 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Hapus materi ini"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                      {activeTopic ? "Tidak ada materi rincian." : "Silakan pilih salah satu topik di kolom ke-2."}
                    </div>
                  )}
                </div>
              </div>

              {/* Input Tambah Materi Kustom */}
              <form onSubmit={handleAddCustomMateri} className="border-t border-slate-850/80 pt-4 mt-4">
                <label htmlFor="newMateriText" className="text-[10.5px] font-extrabold text-slate-405 block mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <ListPlus size={14} className="text-blue-500" />
                  <span>Tambah Materi Kustom ke Topik Ini:</span>
                </label>
                <div className="flex gap-2 text-xs">
                  <input
                    type="text"
                    id="newMateriText"
                    value={newMateriText}
                    onChange={(e) => setNewMateriText(e.target.value)}
                    placeholder="Contoh: Menghitung keliling segitiga dengan model lampion adat"
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-100 placeholder-slate-600"
                  />
                  <button
                    type="submit"
                    id="btn-add-topic"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Plus size={14} /> Tambah
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
