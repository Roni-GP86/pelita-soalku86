import React, { useState, useEffect } from "react";
import { SchoolInfo } from "../types";
import { School, User, Award, Calendar, MapPin, Hash, Sparkles } from "lucide-react";

interface SchoolProfileFormProps {
  schoolInfo: SchoolInfo;
  onChange: (info: SchoolInfo) => void;
  isLocked?: boolean;
  isIdentityLocked?: boolean;
  activeCode?: string;
  userApiKey?: string;
  onChangeUserApiKey?: (key: string) => void;
}

export default function SchoolProfileForm({ 
  schoolInfo, 
  onChange, 
  isLocked = false, 
  isIdentityLocked = false,
  activeCode = "",
  userApiKey = "",
  onChangeUserApiKey = () => {}
}: SchoolProfileFormProps) {
  const [tempKey, setTempKey] = useState(userApiKey || "");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setTempKey(userApiKey || "");
  }, [userApiKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // For trial mode (isIdentityLocked), everything including school profile and principal is locked.
    // For standard licensed mode (isLocked):
    // - Guru Kelas has key credentials locked: schoolName, teacherName, teacherTitle, gradeClass, phase
    // - Guru Mata Pelajaran has ONLY identity locked: schoolName, teacherName, teacherTitle (gradeClass and phase remain unlocked to select classes)
    const isGuruKelas = schoolInfo.teacherTitle?.trim().toLowerCase() === "guru kelas";
    const isFieldLocked = isIdentityLocked 
      ? ["schoolName", "teacherName", "gradeClass", "phase", "teacherTitle", "semester", "academicYear", "governmentName", "educationDepartment", "schoolAddress", "principalName", "principalNip"].includes(name)
      : isLocked 
        ? (isGuruKelas
            ? ["schoolName", "teacherName", "gradeClass", "phase", "teacherTitle", "governmentName", "educationDepartment", "schoolAddress", "principalName", "principalNip"].includes(name)
            : ["schoolName", "teacherName", "teacherTitle", "governmentName", "educationDepartment", "schoolAddress", "principalName", "principalNip"].includes(name)
          )
        : false;

    if (isFieldLocked) {
      return;
    }
    onChange({
      ...schoolInfo,
      [name]: value,
    });
  };

  return (
    <div id="school-profile-form-container" className="bingkai-emas-premium overflow-hidden p-4 md:p-5">
      <div className="flex items-center gap-3 border-b border-slate-800/60 pb-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 via-amber-400 to-amber-700 flex items-center justify-center text-slate-950 font-black tracking-tight shadow-md shrink-0">
          🏫
        </div>
        <div>
          <h2 className="text-base font-black text-amber-400 tracking-wider uppercase">
            Profil Satuan Pendidikan &amp; Validator
          </h2>
          <p className="text-[10px] font-semibold text-slate-400">Penyelarasan identitas kop resmi, validator dokumen, serta lampiran naskah ujian.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kolom 1: Profil Sekolah */}
        <div className="space-y-3.5 bg-slate-900/35 p-4 rounded-xl border border-slate-800/80 hover:border-amber-500/10 transition-all duration-350 shadow-inner">
          <h3 className="text-xs font-black text-amber-500 flex items-center gap-2 uppercase tracking-widest pb-1 border-b border-slate-800/40">
            🎒 Identitas Utama Sekolah
          </h3>
          
          <div className="space-y-1">
            <label htmlFor="schoolName" className="text-[10px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block flex items-center gap-1">
              Nama Sekolah
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                🏫
              </span>
              <input
                type="text"
                id="schoolName"
                name="schoolName"
                value={schoolInfo.schoolName}
                onChange={handleChange}
                disabled={isIdentityLocked || isLocked}
                placeholder="Contoh: SD Negeri Nusantara"
                className="w-full pl-9 pr-3 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-150 placeholder-slate-600 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                required
              />
            </div>
            <p className="text-[8.5px] text-slate-500 font-bold leading-none mt-1.5 flex items-center gap-1 select-none">
              ✎ Silakan sesuaikan nama sekolah Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label htmlFor="governmentName" className="text-[10px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block">Pemerintah Daerah (Kop)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-500 text-[11px]">
                  🏛️
                </span>
                <input
                  type="text"
                  id="governmentName"
                  name="governmentName"
                  value={schoolInfo.governmentName || ""}
                  onChange={handleChange}
                  disabled={isIdentityLocked || isLocked}
                  placeholder="Contoh: Pemerintah Kabupaten Sleman"
                  className="w-full pl-8 pr-2 py-3 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 placeholder-slate-600 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="educationDepartment" className="text-[10px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block">Dinas Terkait (Kop)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-500 text-[11px]">
                  🏢
                </span>
                <input
                  type="text"
                  id="educationDepartment"
                  name="educationDepartment"
                  value={schoolInfo.educationDepartment || ""}
                  onChange={handleChange}
                  disabled={isIdentityLocked || isLocked}
                  placeholder="Contoh: Dinas Pendidikan dan Kebudayaan"
                  className="w-full pl-8 pr-2 py-3 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 placeholder-slate-600 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="schoolAddress" className="text-[10px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block">Alamat Lengkap Sekolah</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                📍
              </span>
              <input
                type="text"
                id="schoolAddress"
                name="schoolAddress"
                value={schoolInfo.schoolAddress}
                onChange={handleChange}
                disabled={isIdentityLocked || isLocked}
                placeholder="Contoh: Jl. Merdeka No. 17, Kecamatan Nusantara"
                className="w-full pl-9 pr-3 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 placeholder-slate-600 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                required
              />
            </div>
          </div>

          {/* TUJUAN / JENIS ASESMEN DROPDOWN - DIBAWAH ALAMAT SEKOLAH SECARA INSTAN DAN SANGAT JELAS */}
          <div className="space-y-1.5 mt-2 bg-slate-950/40 p-3.5 rounded-xl border border-amber-500/30">
            <label htmlFor="assessmentPurpose" className="text-[10px] font-extrabold text-amber-300 uppercase tracking-widest flex items-center gap-1.5 leading-none">
              <span className="inline-block animate-pulse text-xs">🎯</span> Jenis / Tujuan Asesmen <span className="text-rose-500 font-extrabold animate-pulse">(*PILIH DI SINI)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-400 text-xs pointer-events-none z-20 font-sans">
                🎯
              </span>
              <select
                id="assessmentPurpose"
                name="assessmentPurpose"
                value={schoolInfo.assessmentPurpose || "Sumatif Akhir Semester"}
                onChange={(e) => {
                  onChange({
                    ...schoolInfo,
                    assessmentPurpose: e.target.value
                  });
                }}
                className="w-full pl-9 pr-10 py-3.5 bg-slate-900 hover:bg-slate-850 border-2 border-amber-400 rounded-lg text-xs font-black focus:ring-4 focus:ring-amber-500/20 focus:border-amber-300 text-white appearance-none cursor-pointer relative z-10"
              >
                <option value="Ulangan Harian" className="bg-slate-950 text-slate-150 font-bold">Ulangan Harian</option>
                <option value="Sumatif Akhir Tema/Topik" className="bg-slate-950 text-slate-150 font-bold">Sumatif Akhir Tema/Topik</option>
                <option value="Sumatif Tengah Semester" className="bg-slate-950 text-slate-150 font-bold">Sumatif Tengah Semester</option>
                <option value="Sumatif Akhir Semester" className="bg-slate-950 text-slate-150 font-bold">Sumatif Akhir Semester</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-amber-400 text-xs font-bold z-20">
                ▼
              </div>
            </div>
            <p className="text-[9px] text-amber-200/90 font-bold leading-normal">
              💡 Menu Pilihan Judul Cetak: Mengubah lembar kisi-kisi dan naskah soal secara dinamis.
            </p>
          </div>

          {(() => {
            const isGuruKelas = schoolInfo.teacherTitle?.trim().toLowerCase() === "guru kelas";
            const isClassSelectLocked = isIdentityLocked || (isLocked && isGuruKelas);
            const currentPhase = schoolInfo.phase || (["Kelas 1", "Kelas 2"].includes(schoolInfo.gradeClass) ? "Fase A" : ["Kelas 3", "Kelas 4"].includes(schoolInfo.gradeClass) ? "Fase B" : "Fase C");
            
            return (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="phaseSelect" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block flex items-center gap-1">
                    Fase Kurikulum
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-xs">
                      ⚡
                    </span>
                    <select
                      id="phaseSelect"
                      name="phase"
                      value={currentPhase}
                      disabled={isClassSelectLocked}
                      onChange={(e) => {
                        const selectedPhase = e.target.value as "Fase A" | "Fase B" | "Fase C";
                        let defaultClass = "Kelas 3";
                        if (selectedPhase === "Fase A") defaultClass = "Kelas 1";
                        if (selectedPhase === "Fase C") defaultClass = "Kelas 5";
                        onChange({
                          ...schoolInfo,
                          phase: selectedPhase,
                          gradeClass: defaultClass
                        });
                      }}
                      className="w-full pl-8 pr-2 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                    >
                      {isClassSelectLocked ? (
                        <option value={currentPhase}>{currentPhase}</option>
                      ) : (
                        <>
                          <option value="Fase A">Fase A</option>
                          <option value="Fase B">Fase B</option>
                          <option value="Fase C">Fase C</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="gradeClass" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block flex items-center gap-1">
                    Kelas
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-xs">
                      🏅
                    </span>
                    <select
                      id="gradeClass"
                      name="gradeClass"
                      value={schoolInfo.gradeClass}
                      onChange={handleChange}
                      disabled={isClassSelectLocked}
                      className="w-full pl-8 pr-2 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                    >
                      {isClassSelectLocked ? (
                        <option value={schoolInfo.gradeClass}>{schoolInfo.gradeClass}</option>
                      ) : (
                        <>
                          {currentPhase === "Fase A" && (
                            <>
                              <option value="Kelas 1">Kelas 1</option>
                              <option value="Kelas 2">Kelas 2</option>
                            </>
                          )}
                          {currentPhase === "Fase B" && (
                            <>
                              <option value="Kelas 3">Kelas 3</option>
                              <option value="Kelas 4">Kelas 4</option>
                            </>
                          )}
                          {currentPhase === "Fase C" && (
                            <>
                              <option value="Kelas 5">Kelas 5</option>
                              <option value="Kelas 6">Kelas 6</option>
                            </>
                          )}
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label htmlFor="semester" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block flex items-center gap-1">
                Semester
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-xs">
                  🌓
                </span>
                <select
                  id="semester"
                  name="semester"
                  value={schoolInfo.semester || "I"}
                  onChange={handleChange}
                  disabled={isIdentityLocked}
                  className="w-full pl-8 pr-2 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                >
                  <option value="I">I (Ganjil)</option>
                  <option value="II">II (Genap)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="academicYear" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block flex items-center gap-1">
                Tahun Ajaran
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-xs">
                  📅
                </span>
                <input
                  type="text"
                  id="academicYear"
                  name="academicYear"
                  value={schoolInfo.academicYear}
                  onChange={handleChange}
                  disabled={isIdentityLocked}
                  placeholder="2025/2026"
                  className="w-full pl-8 pr-2 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 placeholder-slate-600 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Logo KOP Section */}
          <div className="space-y-2.5 pt-3 border-t border-slate-850">
            <h4 className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest block">
              Logo Sekolah Pada Kop
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-300 relative overflow-hidden bg-slate-950/70 h-[92px] ${
                  schoolInfo.logoCustomData 
                    ? "border-amber-500/35 shadow-[0_4px_12px_rgba(245,158,11,0.04)]" 
                    : "border-slate-850 hover:border-slate-800/80"
                }`}
              >
                {schoolInfo.logoCustomData ? (
                  <div className="relative group/logo">
                    <img
                      src={schoolInfo.logoCustomData}
                      alt="Logo Sekolah"
                      className="h-14 object-contain mx-auto rounded border border-slate-800 p-0.5 bg-slate-900 shadow-sm transition-transform duration-300 group-hover/logo:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="text-xl mb-0.5">📁</div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Unggah Logo</span>
                    <span className="text-[8px] text-slate-500 mt-0.5">Untuk Kop Surat</span>
                  </div>
                )}
              </div>

              {/* Custom Logo Upload Input Panel */}
              <div className="p-2.5 bg-slate-950/70 border border-slate-850 rounded-lg space-y-1.5 flex flex-col justify-center">
                <span className="text-[9px] text-[#93c5fd]/75 font-black uppercase tracking-wider block">Unggah Logo Sekolah</span>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-1">
                  <input
                    type="file"
                    id="logo-file-picker"
                    accept="image/*"
                    disabled={false}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          onChange({
                            ...schoolInfo,
                            logoType: "custom",
                            logoCustomData: event.target?.result as string,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-[9px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Input API Key sebagai cadangan mandiri pengguna */}
          <div className="flex flex-col gap-1.5 p-2 px-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl max-w-sm w-full md:w-80 shadow-md mt-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <span>🔑</span> Masukan API Key Disini
              </label>
              <a 
                href="https://www.youtube.com/results?search_query=cara+mendapatkan+gemini+api+key+gratis" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[9px] text-blue-400 hover:text-blue-300 font-extrabold underline flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>🎥</span> Tutorial (GRATIS)
              </a>
            </div>
            
            <div className="flex gap-1.5 w-full">
              <input 
                type="text"
                value={tempKey}
                onChange={(e) => {
                  setTempKey(e.target.value);
                  setIsSaved(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onChangeUserApiKey(tempKey);
                    setIsSaved(true);
                    setTimeout(() => setIsSaved(false), 2000);
                  }
                }}
                placeholder="Masukkan API Key Anda (Opsional)"
                className="bg-slate-950/90 text-[10px] font-bold font-mono outline-none border border-slate-800 focus:border-amber-500/80 rounded-lg px-2.5 py-1.5 text-slate-100 placeholder-slate-700 flex-1 tracking-wider leading-none transition-all"
              />
              <button 
                type="button"
                onClick={() => {
                  onChangeUserApiKey(tempKey);
                  setIsSaved(true);
                  setTimeout(() => setIsSaved(false), 2000);
                }}
                className={`px-3 py-1.5 font-black text-[9px] uppercase tracking-wider rounded-lg border transition-all duration-300 cursor-pointer flex items-center gap-1 shrink-0 ${
                  isSaved 
                    ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-400" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 border-indigo-500/30 text-white hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-blue-900/30"
                }`}
              >
                {isSaved ? "Saved! ✓" : "Simpan 💾"}
              </button>
            </div>
            
            <p className="text-[9px] text-slate-400 font-medium leading-normal">
              Jika anda ingin membuat <span className="text-amber-400 font-extrabold">soal bergambar</span>, silahkan masukan api key. Api key anda bersifat pribadi, dan hanya anda yang menggunakan berdasarkan kode akses anda.
            </p>
          </div>
        </div>

        {/* Kolom 2: Pemangku Jabatan */}
        <div className="space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-200 flex items-center gap-2 uppercase tracking-widest pb-1 border-b border-slate-800/40">
              🧑‍💼 Penanggung Jawab &amp; Validator
            </h3>

            {/* Principal Card */}
            <div className="bg-slate-900/25 p-3.5 space-y-2.5 rounded-xl border border-slate-800/80 hover:border-amber-500/10 transition-all duration-350">
              <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                👑 Kepala Sekolah (Validator Kop)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="principalName" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block">Nama Lengkap &amp; Gelar</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-[10px]">
                      👤
                    </span>
                    <input
                      type="text"
                      id="principalName"
                      name="principalName"
                      value={schoolInfo.principalName}
                      onChange={handleChange}
                      disabled={isIdentityLocked || isLocked}
                      placeholder="Nama Lengkap"
                      className="w-full pl-8 pr-2.5 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="principalNip" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block">NIP (18 Digit)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-[10px]">
                      🔢
                    </span>
                    <input
                      type="text"
                      id="principalNip"
                      name="principalNip"
                      value={schoolInfo.principalNip}
                      onChange={handleChange}
                      disabled={isIdentityLocked || isLocked}
                      placeholder="NIP / -"
                      className="w-full pl-8 pr-2.5 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Teacher Card */}
            <div className="bg-slate-900/25 p-3.5 space-y-2.5 rounded-xl border border-slate-800/80 hover:border-amber-500/10 transition-all duration-350">
              <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                🧑‍🏫 Penyusun / Pembuat Soal
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="teacherName" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block flex items-center gap-1">
                    Nama Lengkap Guru
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-[10px]">
                      👤
                    </span>
                    <input
                      type="text"
                      id="teacherName"
                      name="teacherName"
                      value={schoolInfo.teacherName}
                      onChange={handleChange}
                      disabled={isIdentityLocked || isLocked}
                      placeholder="Contoh: Roni Hariyanto Bhidju, S.Pd.,Gr."
                      className="w-full pl-8 pr-2.5 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                      required
                    />
                  </div>
                  <p className="text-[8.5px] text-slate-500 font-bold leading-none mt-1.5 flex items-center gap-1 select-none">
                    ✎ Silakan sesuaikan nama Anda sebagai pembuat soal.
                  </p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="teacherTitle" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block flex items-center gap-1">
                    Jabatan Pendidik
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-[10px]">
                      💼
                    </span>
                    <select
                      id="teacherTitle"
                      name="teacherTitle"
                      value={schoolInfo.teacherTitle || "Guru Kelas"}
                      onChange={handleChange}
                      disabled={isIdentityLocked || isLocked}
                      className="w-full pl-8 pr-2 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                    >
                      <option value="Guru Kelas">Guru Kelas</option>
                      <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                    </select>
                  </div>
                  <p className="text-[8.5px] text-slate-500 font-bold leading-none mt-1.5 flex items-center gap-1 select-none">
                    ✎ Pilih jenis jabatan pendidik Anda.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="teacherNip" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block">NIP / NUPTK / PegID</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-[10px]">
                    🔢
                  </span>
                  <input
                    type="text"
                    id="teacherNip"
                    name="teacherNip"
                    value={schoolInfo.teacherNip}
                    onChange={handleChange}
                    disabled={false}
                    placeholder="Masukkan NIP atau NUPTK atau -"
                    className="w-full pl-8 pr-2.5 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Document Date and Place Card */}
            <div className="bg-slate-900/25 p-3.5 space-y-2.5 rounded-xl border border-slate-800/80 hover:border-amber-500/10 transition-all duration-350">
              <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                📅 Tempat &amp; Tanggal Pembuatan Dokumen
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="documentPlace" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block">Tempat Pembuatan</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-[10px]">
                      📍
                    </span>
                    <input
                      type="text"
                      id="documentPlace"
                      name="documentPlace"
                      value={schoolInfo.documentPlace || "Fatubai"}
                      onChange={handleChange}
                      disabled={false}
                      placeholder="Contoh: Fatubai atau Kefamenanu"
                      className="w-full pl-8 pr-2.5 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="documentDate" className="text-[9px] font-extrabold text-[#93c5fd]/80 uppercase tracking-widest block">Tanggal Pembuatan</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500 text-[10px]">
                      📆
                    </span>
                    <input
                      type="text"
                      id="documentDate"
                      name="documentDate"
                      value={schoolInfo.documentDate || ""}
                      onChange={handleChange}
                      disabled={false}
                      placeholder="Kosongkan untuk tanggal hari ini"
                      className="w-full pl-8 pr-2.5 py-3.5 bg-slate-950/85 border border-slate-800/85 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all duration-300 text-slate-100 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-slate-900/10"
                    />
                  </div>
                  <p className="text-[8px] text-slate-500 font-bold leading-normal select-none">
                    *Contoh: 28 Mei 2026. Kosongkan untuk hari ini.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Kartu Inspiratif Premium */}
          <div className="pt-3 border-t border-slate-850 space-y-2.5">
            <h4 className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest block flex items-center gap-1.5 leading-none">
              <span>💡 Pengingat Kualitas Ujian</span>
              <span className="text-[8px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/25 uppercase tracking-wider animate-pulse font-black">PENTING</span>
            </h4>
            
            <div className="bg-gradient-to-r from-amber-500/5 via-slate-900/65 to-amber-500/1 flex items-start sm:items-center gap-3.5 p-3.5 rounded-lg border border-amber-500/15 hover:border-amber-500/25 shadow-[0_4px_24px_rgba(245,158,11,0.03)] relative overflow-hidden group transition-all duration-300 md:h-[92px]">
              {/* Subtle Glowing Pulse Ambient Lamp */}
              <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/8 transition-all duration-500"></div>
              
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <Sparkles size={14} className="animate-pulse" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[9px] text-[#93c5fd]/75 font-black uppercase tracking-wider block">Catatan Inspiratif Pendidik</span>
                <p className="text-[10px] sm:text-[10.5px] font-semibold text-slate-300 leading-normal italic">
                  "Teknologi membantu meringankan pekerjaan guru, namun kebijaksanaan &amp; ketelitian Anda adalah penyempurna kualitas utama. <span className="text-amber-400 not-italic font-extrabold underline decoration-amber-500/30">Selalu verifikasi mandiri</span> sebelum diunduh."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
