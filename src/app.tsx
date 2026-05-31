import React, { useState, useEffect } from "react";
import { clientGenerateKisiKisi, clientGenerateSoal } from "./services/ai-client";
import { onSnapshot, collection, doc, setDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { SchoolInfo, SubjectType, AIElementTopic, QuestionConfig, KisiKisiRow, QuestionItem } from "./types";
import SchoolProfileForm from "./components/schoolprofileform";
import SubjectAndTopicManager from "./components/subjectandtopicmanager";
import QuestionConfigForm from "./components/questionconfigform";
import KisiKisiView from "./components/kisikisiview";
import SoalUjianView from "./components/soalujianview";
import PremiumLoader from "./components/premiumloader";
import {
  School,
  BookOpen,
  ListFilter,
  FileSpreadsheet,
  FileCheck,
  MessageSquare,
  Upload,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Menu,
  Key,
  Lock,
  Unlock,
  Copy,
  Trash,
  X,
  Database,
  FolderOpen,
  Bell
} from "lucide-react";

/**
 * Compresses an image file (PNG/JPG) using HTML Canvas and returns a base64 DataURL.
 * Keeps the file size small (<= 200KB) to ensure it satisfies Firestore's 1MB document limit.
 */
function compressImageFile(file: File, maxDimension = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizes activation codes (replaces digit 0 with letter O, to prevent typos).
 */
export function normalizeCode(code: string): string {
  if (!code) return "";
  return code.trim().toUpperCase().replace(/0/g, "O");
}

/**
 * Parses dynamic Indonesian or English document formats from Firestore.
 */
export function parseFirestoreDoc(docId: string, data: any): any {
  if (!data) return null;

  // 1. Unique Code (standardize O and 0)
  let uniqueCode = data["kode unik"] || data["uniqueCode"] || data["kode_unik"] || "";
  uniqueCode = String(uniqueCode).trim().toUpperCase();

  // 2. Is Active
  let isActive = true;
  const rawAktif = data["aktif"] !== undefined ? data["aktif"] : data["isActive"];
  if (rawAktif !== undefined) {
    if (typeof rawAktif === "boolean") {
      isActive = rawAktif;
    } else {
      const normalized = String(rawAktif).trim().toUpperCase();
      isActive = (normalized === "BENAR" || normalized === "TRUE" || normalized === "AKTIF" || normalized === "1");
    }
  }

  // 3. School Name
  const schoolName = data["nama sekolah"] || data["schoolName"] || data["school_name"] || "";

  // 4. Subject / Topic Selection
  const subject = data["subjek"] || data["subject"] || data["selectedSubject"] || "Bahasa Inggris";

  // 5. Teacher Name
  const teacherName = data["Nama guru"] || data["nama guru"] || data["teacherName"] || data["teacher_name"] || "";

  // 6. Timestamp
  const timestamp = data["cap waktu"] || data["timestamp"] || new Date().toLocaleString("id-ID");

  // 7. Whatsapp Number / Phone
  let whatsappNumber = data["Nomor WhatsApp"] || data["Nomor Whatsapp"] || data["whatsappNumber"] || data["phone"] || "";
  whatsappNumber = String(whatsappNumber).trim();

  // 8. Bukti Transfer
  const buktiTransfer = data["bukti transfer"] || data["buktiTransfer"] || data["bukti_transfer"] || "";

  return {
    id: docId,
    schoolName,
    teacherName,
    role: data["role"] || data["peran"] || "Guru Kelas",
    subject,
    selectedSubject: subject,
    whatsappNumber,
    phone: whatsappNumber,
    uniqueCode,
    isActive,
    buktiTransfer,
    timestamp
  };
}

/**
 * Formats standard React record into full hybrid Indonesian & English fields for Firestore.
 */
export function toFirestoreDoc(record: any): any {
  const isAct = record.isActive !== false;
  return {
    // Indonesian fields (matches the user's live database screenshot)
    "aktif": isAct ? "BENAR" : "SALAH",
    "nama sekolah": record.schoolName || "",
    "subjek": record.subject || record.selectedSubject || "Bahasa Inggris",
    "Nama guru": record.teacherName || "",
    "cap waktu": record.timestamp || new Date().toLocaleString("id-ID"),
    "kode unik": normalizeCode(record.uniqueCode || ""),
    "Nomor WhatsApp": record.whatsappNumber || record.phone || "",
    "bukti transfer": record.buktiTransfer || "",

    // English fields (keeps total code compatibility)
    "id": record.id || "",
    "schoolName": record.schoolName || "",
    "teacherName": record.teacherName || "",
    "role": record.role || "Guru Kelas",
    "subject": record.subject || record.selectedSubject || "Bahasa Inggris",
    "selectedSubject": record.subject || record.selectedSubject || "Bahasa Inggris",
    "whatsappNumber": record.whatsappNumber || record.phone || "",
    "phone": record.whatsappNumber || record.phone || "",
    "uniqueCode": normalizeCode(record.uniqueCode || ""),
    "isActive": isAct,
    "buktiTransfer": record.buktiTransfer || "",
    "timestamp": record.timestamp || new Date().toLocaleString("id-ID")
  };
}

export default function App() {
  // 1. Initial State from localStorage or default TTU config
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(() => {
    const saved = localStorage.getItem("ttu_school_info");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Automatically migrate old default placeholders to SD Negeri Fatubai with new specifications
        if (
          parsed.schoolName === "SD Negeri Noemeto" || 
          parsed.schoolName === "SD Negeri Merdeka" ||
          parsed.schoolName === "SD Negeri Nusantara" || 
          parsed.principalName === "Drs. H. Ahmad Fauzi, M.Pd." ||
          parsed.principalName === "Darius Kusi, S.Pd.,Gr." ||
          parsed.teacherName === "Dewi Lestari, S.Pd." ||
          parsed.teacherName === "Natan Jordyson, S.Pd." ||
          parsed.teacherName === "Natan Jordyson Bhigju, S.Pd." ||
          parsed.teacherName === "NATAN JORDYSON BHIGJU" ||
          !parsed.schoolName
        ) {
          parsed.schoolName = "SD Negeri Fatubai";
          parsed.schoolAddress = "Fatubai, Desa Oehalo Kecamatan Insana Tengah - 856713";
          parsed.principalName = "Budi Santoso, S.Pd.";
          parsed.principalNip = "198001012005011002";
          parsed.teacherName = "Natan Jordyson";
          parsed.teacherNip = "1234567876654321";
          parsed.teacherTitle = "Guru Kelas";
          parsed.gradeClass = "Kelas 2";
          parsed.phase = "Fase A";
          parsed.governmentName = "pemerintah kabupaten timor tengah utara";
          parsed.educationDepartment = "dinas pendidikan dan kebuadayaan";
        }
        if (!parsed.governmentName || parsed.governmentName === "Pemerintah Kabupaten Nusantara") {
          parsed.governmentName = "pemerintah kabupaten timor tengah utara";
        }
        if (!parsed.educationDepartment || parsed.educationDepartment === "Dinas Pendidikan dan Kebudayaan") {
          parsed.educationDepartment = "dinas pendidikan dan kebuadayaan";
        }
        if (!parsed.assessmentPurpose) {
          parsed.assessmentPurpose = "Sumatif Akhir Semester";
        }
        return parsed;
      } catch (e) {
        // Fallback to default
      }
    }
    return {
      schoolName: "SD Negeri Fatubai",
      schoolAddress: "Fatubai, Desa Oehalo Kecamatan Insana Tengah - 856713",
      principalName: "Budi Santoso, S.Pd.",
      principalNip: "198001012005011002",
      teacherName: "Natan Jordyson",
      teacherNip: "1234567876654321",
      gradeClass: "Kelas 2",
      phase: "Fase A",
      academicYear: "2025/2026",
      logoType: "tutwuri",
      semester: "I",
      teacherTitle: "Guru Kelas",
      governmentName: "pemerintah kabupaten timor tengah utara",
      educationDepartment: "dinas pendidikan dan kebuadayaan",
      assessmentPurpose: "Sumatif Akhir Semester"
    };
  });

  const [selectedSubject, setSelectedSubject] = useState<SubjectType>(() => {
    return (localStorage.getItem("ttu_selected_subject") as SubjectType) || "Matematika";
  });

  const [fetchedData, setFetchedData] = useState<AIElementTopic[]>(() => {
    const saved = localStorage.getItem("ttu_fetched_curriculum");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedTopics, setSelectedTopics] = useState<string[]>(() => {
    const saved = localStorage.getItem("ttu_selected_topics");
    return saved ? JSON.parse(saved) : [];
  });

  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>(() => {
    const saved = localStorage.getItem("ttu_question_configs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { type: "Pilihan Ganda", count: 5, cognitiveLevel: "Level 1" },
      { type: "Pilihan Ganda", count: 5, cognitiveLevel: "Level 2" },
      { type: "Isian Singkat", count: 3, cognitiveLevel: "Level 2" },
      { type: "Uraian", count: 2, cognitiveLevel: "Level 3" },
    ];
  });

  // Steps state: 1: Profile, 2: Subject & Topics, 3: Specifications, 4: Kisi-Kisi, 5: Soal Ujian
  const [activeStep, setActiveStep] = useState<number>(1);

  // 1b. PIN & Activation Codes States (Strictly filtered of any sample or simulation codes)
  const [codeRequests, setCodeRequests] = useState<any[]>(() => {
    const saved = localStorage.getItem("ttu_code_requests");
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return parsed
          .filter((item: any) => item && item.id !== "req-1" && item.id !== "req-2" && item.uniqueCode !== "GP-RN00R")
          .map((item: any) => ({
            ...item,
            isActive: item.isActive !== undefined ? item.isActive : true
          }));
      } catch (e) { }
    }
    return [];
  });

  const [activeCode, setActiveCode] = useState<string>(() => {
    return localStorage.getItem("ttu_active_code") || "";
  });

  const [codeInputValue, setCodeInputValue] = useState(() => {
    return localStorage.getItem("ttu_active_code") || "";
  });
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  
  // Menu Pesan States
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [appConfirm, setAppConfirm] = useState<{
    isOpen: boolean;
    title: string;
    subTitle?: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [messageForm, setMessageForm] = useState({
    schoolName: "",
    teacherName: "",
    uniqueCode: "",
    buktiTransfer: ""
  });

  // WA Form Values
  const [waForm, setWaForm] = useState({
    schoolName: "SD Makanan Bergizi Gratis",
    teacherName: "Ghea Gavriella, S.Pdf., MBG",
    role: "Guru Kelas",
    gradeClass: "Kelas 4",
    subjectType: "Bahasa Inggris",
    religionType: "Pendidikan Agama Islam",
    whatsappNumber: ""
  });

  const [showSubmittingConfirm, setShowSubmittingConfirm] = useState(false);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [isSubmittingWa, setIsSubmittingWa] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [warningToast, setWarningToast] = useState<string | null>(null);
  const [firestoreSyncError, setFirestoreSyncError] = useState<string | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  const [bankSoalFilterSubject, setBankSoalFilterSubject] = useState<string>("Semua");
  const [bankSoalRefreshTrigger, setBankSoalRefreshTrigger] = useState<number>(0);
  const [bankSoalList, setBankSoalList] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem("ttu_bank_soal");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // PWA & Laptop Installation States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    return localStorage.getItem("ttu_app_installed_status") === "true";
  });
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  const [isInstallBannerDismissed, setIsInstallBannerDismissed] = useState<boolean>(() => {
    return localStorage.getItem("ttu_install_banner_dismissed") === "true";
  });

  const [userApiKey, setUserApiKey] = useState(() => {
    return localStorage.getItem("ttu_user_api_key") || "";
  });

  const handleSaveUserApiKey = (key: string) => {
    setUserApiKey(key);
    localStorage.setItem("ttu_user_api_key", key.trim());
  };

  // Derive lock & admin properties
  const matchedRequest = codeRequests.find(r => normalizeCode(r.uniqueCode) === normalizeCode(activeCode));
  const isAdmin = normalizeCode(activeCode) === normalizeCode("GP-PSR86");
  const pendingRequestsCount = codeRequests.filter(r => r && r.id !== "req-1" && r.id !== "req-2" && r.isActive === false).length;
  const messagesRequestsCount = codeRequests.filter(r => r && r.id !== "req-1" && r.id !== "req-2" && r.buktiTransfer && r.buktiTransfer !== "").length;
  const totalSignalsCount = codeRequests.filter(r => r && r.id !== "req-1" && r.id !== "req-2" && (r.isActive === false || (r.buktiTransfer && r.buktiTransfer !== ""))).length;
  const isCodeActive = isAdmin || (!!matchedRequest && matchedRequest.isActive !== false);
  const isIdentityLocked = !isCodeActive;
  const isLocked = !!matchedRequest && !isAdmin;

  const effectiveSchoolInfo = isIdentityLocked ? {
    ...schoolInfo,
    schoolName: "SD Negeri Fatubai",
    schoolAddress: "Fatubai, Desa Oehalo Kecamatan Insana Tengah - 856713",
    principalName: "Budi Santoso, S.Pd.",
    principalNip: "198001012005011002",
    teacherName: "Natan Jordyson",
    teacherTitle: "Guru Kelas",
    gradeClass: "Kelas 2",
    phase: "Fase A",
    governmentName: "pemerintah kabupaten timor tengah utara",
    educationDepartment: "dinas pendidikan dan kebuadayaan",
  } : schoolInfo;

  const isSubjectRestrictedInTrial = (subject: string) => {
    if (isIdentityLocked) {
      // In trial (unactivated) mode, lock everything except Matematika
      return subject !== "Matematika";
    }
    // In registered activated mode for Guru Kelas, lock Agama, PJOK, and Bahasa Inggris
    return subject.startsWith("Pendidikan Agama") || subject === "PJOK" || subject === "Bahasa Inggris";
  };

  const effectiveSelectedSubject = isAdmin 
    ? selectedSubject 
    : (matchedRequest 
        ? (matchedRequest.role?.trim().toLowerCase() === "guru kelas"
            ? (isSubjectRestrictedInTrial(selectedSubject) ? "Matematika" : selectedSubject)
            : matchedRequest.subject as SubjectType
          )
        : (isSubjectRestrictedInTrial(selectedSubject) ? "Matematika" : selectedSubject)
      );

  // Syncing PIN-related states
  useEffect(() => {
    localStorage.setItem("ttu_code_requests", JSON.stringify(codeRequests));
  }, [codeRequests]);

  // Syncing with Firestore in Real-Time (Strictly filtering out legacy sample or simulation records)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Permintaan kode"),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const parsed = parseFirestoreDoc(doc.id, data);
          if (parsed && doc.id !== "req-1" && doc.id !== "req-2" && parsed.uniqueCode !== "GP-RN00R") {
            list.push(parsed);
          }
        });
        
        // Sort newest first based on timestamp (robust parsing) or ID
        list.sort((a, b) => {
          const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          if (!isNaN(timestampA) && !isNaN(timestampB) && timestampA !== timestampB) {
            return timestampB - timestampA;
          }
          return (b.id || "").localeCompare(a.id || "");
        });

        setCodeRequests(list);
        setFirestoreSyncError(null);
      },
      (error) => {
        console.error("Firestore real-time subscription error:", error);
        setFirestoreSyncError(error.message || String(error));
      }
    );
    return () => unsubscribe();
  }, []);

  // Local storage synchronization of Bank Soal for individual devices
  useEffect(() => {
    localStorage.setItem("ttu_bank_soal", JSON.stringify(bankSoalList));
  }, [bankSoalList]);

  useEffect(() => {
    localStorage.setItem("ttu_active_code", activeCode);
    setIsBannerDismissed(false);
  }, [activeCode]);

  useEffect(() => {
    if (activeStep === 7 && !isAdmin) {
      setActiveStep(1);
    }
  }, [activeStep, isAdmin]);

  // Auto-sync schoolInfo and selectedSubject with active matchedRequest properties
  useEffect(() => {
    if (matchedRequest && matchedRequest.isActive !== false && !isAdmin) {
      setSchoolInfo(prev => {
        const isGuruKelas = matchedRequest.role === "Guru Kelas";
        const targetClass = isGuruKelas 
          ? (matchedRequest.gradeClass || "Kelas 4")
          : (prev.gradeClass || "Kelas 4");
        const targetPhase = ["Kelas 1", "Kelas 2"].includes(targetClass) 
          ? "Fase A" 
          : ["Kelas 3", "Kelas 4"].includes(targetClass) 
          ? "Fase B" 
          : "Fase C";
        
        if (
          prev.schoolName === matchedRequest.schoolName &&
          prev.teacherName === matchedRequest.teacherName &&
          prev.teacherTitle === matchedRequest.role &&
          prev.gradeClass === targetClass &&
          prev.phase === targetPhase
        ) {
          return prev;
        }
        return {
          ...prev,
          schoolName: matchedRequest.schoolName,
          teacherName: matchedRequest.teacherName,
          teacherTitle: matchedRequest.role,
          gradeClass: targetClass,
          phase: targetPhase
        };
      });

      if (matchedRequest.role === "Guru Mata Pelajaran") {
        if (selectedSubject !== matchedRequest.subject) {
          setSelectedSubject(matchedRequest.subject);
        }
      } else {
        const isSubjectRestricted = selectedSubject.startsWith("Pendidikan Agama") || selectedSubject === "PJOK" || selectedSubject === "Bahasa Inggris";
        if (isSubjectRestricted) {
          setSelectedSubject("Matematika");
        }
      }
    }
  }, [matchedRequest, isAdmin, selectedSubject]);

  // Result States
  const [kisiKisi, setKisiKisi] = useState<KisiKisiRow[]>(() => {
    const saved = localStorage.getItem("ttu_generated_kisi_kisi");
    return saved ? JSON.parse(saved) : [];
  });

  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    const saved = localStorage.getItem("ttu_generated_questions");
    return saved ? JSON.parse(saved) : [];
  });

  const [hasSavedCurrentSoal, setHasSavedCurrentSoal] = useState<boolean>(() => {
    return localStorage.getItem("ttu_has_saved_current_soal") === "true";
  });

  useEffect(() => {
    localStorage.setItem("ttu_has_saved_current_soal", String(hasSavedCurrentSoal));
  }, [hasSavedCurrentSoal]);

  // Loading States
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [generatingKisiKisi, setGeneratingKisiKisi] = useState(false);
  const [generatingSoal, setGeneratingSoal] = useState(false);
  const [isFallbackActive, setIsFallbackActive] = useState<boolean>(() => {
    return localStorage.getItem("ttu_fallback_active") === "true";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [waAlert, setWaAlert] = useState<boolean>(() => {
    return localStorage.getItem("ttu_wa_alert_dismissed") !== "true";
  });

  // Auto-hide sidebar during document preview (Steps 4 and 5) to display the full document layout
  useEffect(() => {
    if (activeStep === 4 || activeStep === 5) {
      setSidebarOpen(false);
    }
  }, [activeStep]);

  // Set up PWA installation listeners and standalone detectors
  useEffect(() => {
    const checkStandalone = () => {
      const standaloneMode = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (window.navigator as any).standalone === true || 
        document.referrer.includes("android-app://");
      
      setIsStandalone(standaloneMode);
      if (standaloneMode) {
        setIsInstalled(true);
        localStorage.setItem("ttu_app_installed_status", "true");
      }
    };
    checkStandalone();

    const handleBeforePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstall = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsStandalone(true);
      localStorage.setItem("ttu_app_installed_status", "true");
      setSuccessToast("🎉 Selamat! Aplikasi resmi Pelita Soal berhasil dipasang di laptop Anda.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforePrompt);
    window.addEventListener("appinstalled", handleAppInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforePrompt);
      window.removeEventListener("appinstalled", handleAppInstall);
    };
  }, []);

  // 2. LocalStorage syncing
  useEffect(() => {
    localStorage.setItem("ttu_school_info", JSON.stringify(schoolInfo));
  }, [schoolInfo]);

  useEffect(() => {
    localStorage.setItem("ttu_selected_subject", selectedSubject);
  }, [selectedSubject]);

  useEffect(() => {
    localStorage.setItem("ttu_fetched_curriculum", JSON.stringify(fetchedData));
  }, [fetchedData]);

  useEffect(() => {
    localStorage.setItem("ttu_selected_topics", JSON.stringify(selectedTopics));
  }, [selectedTopics]);

  useEffect(() => {
    localStorage.setItem("ttu_question_configs", JSON.stringify(questionConfigs));
  }, [questionConfigs]);

  useEffect(() => {
    localStorage.setItem("ttu_generated_kisi_kisi", JSON.stringify(kisiKisi));
  }, [kisiKisi]);

  useEffect(() => {
    localStorage.setItem("ttu_generated_questions", JSON.stringify(questions));
  }, [questions]);

  // Reset current assessment state to start fresh
  const handleResetWorkspace = () => {
    setIsResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    setFetchedData([]);
    setSelectedTopics([]);
    setKisiKisi([]);
    setQuestions([]);
    setHasSavedCurrentSoal(false);
    setIsFallbackActive(false);
    setSelectedSubject("Matematika");
    setQuestionConfigs([
      { type: "Pilihan Ganda", count: 5, cognitiveLevel: "Level 1" },
      { type: "Pilihan Ganda", count: 5, cognitiveLevel: "Level 2" },
      { type: "Isian Singkat", count: 3, cognitiveLevel: "Level 2" },
      { type: "Uraian", count: 2, cognitiveLevel: "Level 3" },
    ]);
    setActiveStep(2); // Jump back to subject selection
    setErrorHeader(null);
    localStorage.removeItem("ttu_fetched_curriculum");
    localStorage.removeItem("ttu_selected_topics");
    localStorage.removeItem("ttu_generated_kisi_kisi");
    localStorage.removeItem("ttu_generated_questions");
    localStorage.removeItem("ttu_has_saved_current_soal");
    localStorage.removeItem("ttu_fallback_active");
    localStorage.removeItem("ttu_selected_subject");
    localStorage.removeItem("ttu_question_configs");
    setIsResetConfirmOpen(false);
  };

  const checkFallbackToast = () => {
    if (localStorage.getItem("ttu_fallback_triggered") === "true") {
      setWarningToast("⚠️ Layanan Google Gemini mendeteksi lalu lintas padat atau keterbatasan kuota server bersama, sehingga fitur PREMIUM LURING otomatis aktif agar naskah berkualitas tinggi Anda selesai tepat waktu secara instan. Untuk performa prima tak terbatas, Anda dapat mendaftarkan Kunci API mandiri gratis di tab PROFIL SEKOLAH.");
      localStorage.removeItem("ttu_fallback_triggered");
    }
  };

  // 3. API Handlers
  const handleGenerateKisiKisi = async () => {
    if (matchedRequest && matchedRequest.isActive === false) {
      setErrorHeader("PERINGATAN: Kode Anda belum diaktifkan oleh Admin Pelita Soal. Silakan hubungi Admin via Menu Pesan di kanan atas & unggah bukti/konfirmasi transfer.");
      return;
    }
    if (selectedTopics.length === 0) {
      setErrorHeader("Harap pilih minimal satu materi atau topik pokok terlebih dahulu di Langkah 2.");
      return;
    }
    const totalCount = questionConfigs.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    if (totalCount === 0) {
      setErrorHeader("Total jumlah soal tidak boleh nol. Silakan periksa pengaturan distribusi soal Anda.");
      return;
    }

    setGeneratingKisiKisi(true);
    setErrorHeader(null);

    try {
      const data = await clientGenerateKisiKisi(
        effectiveSchoolInfo,
        effectiveSelectedSubject,
        selectedTopics,
        questionConfigs,
        fetchedData,
        localStorage.getItem("ttu_user_api_key") || ""
      );

      setKisiKisi(data);
      setQuestions([]);
      setHasSavedCurrentSoal(false);
      
      // Automatically generate questions right now!
      setGeneratingSoal(true);
      try {
        const questionsData = await clientGenerateSoal(
          effectiveSchoolInfo,
          effectiveSelectedSubject,
          data,
          localStorage.getItem("ttu_user_api_key") || ""
        );
        setQuestions(questionsData);
        setHasSavedCurrentSoal(false);
        setActiveStep(5);
      } catch (err: any) {
        setErrorHeader(err.message || "Gagal menghasilkan naskah lembar pertanyaan ujian.");
        setActiveStep(4);
      } finally {
        setGeneratingSoal(false);
      }
    } catch (err: any) {
      setErrorHeader(err.message || "Gagal menyusun Kisi-kisi karena gangguan sistem.");
    } finally {
      setGeneratingKisiKisi(false);
      checkFallbackToast();
    }
  };

  const handleGenerateSoalUjian = async () => {
    if (matchedRequest && matchedRequest.isActive === false) {
      setErrorHeader("PERINGATAN: Kode Anda belum diaktifkan oleh Admin Pelita Soal. Silakan hubungi Admin via Menu Pesan di kanan atas & unggah bukti/konfirmasi transfer.");
      return;
    }
    if (kisiKisi.length === 0) {
      setErrorHeader("Fungsi ini membutuhkan rancangan kisi-kisi aktif. Silakan buat Kisi-kisi terlebih dahulu.");
      return;
    }

    setGeneratingSoal(true);
    setErrorHeader(null);

    try {
      const data = await clientGenerateSoal(
        effectiveSchoolInfo,
        effectiveSelectedSubject,
        kisiKisi,
        localStorage.getItem("ttu_user_api_key") || ""
      );

      setQuestions(data);
      setHasSavedCurrentSoal(false);
      // Move immediately to Step 5 (Soal Ujian View)
      setActiveStep(5);
    } catch (err: any) {
      setErrorHeader(err.message || "Gagal menghasilkan naskah lembar pertanyaan ujian.");
    } finally {
      setGeneratingSoal(false);
      checkFallbackToast();
    }
  };

  const handleSaveToBankSoal = async () => {
    try {
      if (questions.length === 0) {
        alert("Tidak ada naskah soal aktif untuk disimpan!");
        return;
      }
      const newBankId = "bank_" + Date.now();
      const currentCode = activeCode ? activeCode.trim().toUpperCase() : "TRIAL";
      const newBankItem = {
        id: newBankId,
        ownerCode: currentCode,
        savedAt: new Date().toLocaleString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        subject: effectiveSelectedSubject,
        schoolInfo: effectiveSchoolInfo,
        questions: questions,
        kisiKisi: kisiKisi,
      };

      // 1. Save locally and update in-memory state IMMEDIATELY for zero latency
      const existingRaw = localStorage.getItem("ttu_bank_soal");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      if (!existing.some((item: any) => item.id === newBankId)) {
        existing.unshift(newBankItem);
        localStorage.setItem("ttu_bank_soal", JSON.stringify(existing));
        setBankSoalList(existing);
      }
      
      // Mark as saved instantly to disable button and show success mark
      setHasSavedCurrentSoal(true);
      
      // Instant success toast feedback
      setSuccessToast(`🎉 Sukses! Paket soal Mapel ${effectiveSelectedSubject} berhasil disimpan di Bank Soal lokal perangkat Anda.`);

    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan ke Bank Soal: " + (err.message || err));
      throw err;
    }
  };

  const handleVerifyCodeProcess = async (val: string) => {
    if (val === "GP-PSR86") {
      setActiveCode(val);
      setErrorHeader(null);
      setSuccessToast("Akses Terbuka: ADMIN GURU PELOSOK!");
      return;
    }

    // Try finding in local list first
    let req = codeRequests.find(r => normalizeCode(r.uniqueCode) === normalizeCode(val));
    
    // Fallback: Fetch directly from Firestore to guarantee absolute real-time accuracy and prevent any caching sync delays
    if (!req || req.isActive === false) {
      try {
        const normalizedVal = normalizeCode(val);
        // Query both fields "kode unik" and "uniqueCode" to support old and new formats cleanly
        const qIndo = query(collection(db, "Permintaan kode"), where("kode unik", "==", val));
        let qSnap = await getDocs(qIndo);
        if (qSnap.empty) {
          const qEng = query(collection(db, "Permintaan kode"), where("uniqueCode", "==", val));
          qSnap = await getDocs(qEng);
        }

        // Search options with zero/O replaced in case they typed GP-PS012R but stored GP-PSO12R
        if (qSnap.empty) {
          const alternatedVal = val.includes("0") ? val.replace(/0/g, "O") : val.replace(/O/g, "0");
          const qIndoAlt = query(collection(db, "Permintaan kode"), where("kode unik", "==", alternatedVal));
          qSnap = await getDocs(qIndoAlt);
          if (qSnap.empty) {
            const qEngAlt = query(collection(db, "Permintaan kode"), where("uniqueCode", "==", alternatedVal));
            qSnap = await getDocs(qEngAlt);
          }
        }

        if (!qSnap.empty) {
          const liveDoc = qSnap.docs[0];
          const liveData = parseFirestoreDoc(liveDoc.id, liveDoc.data());
          req = liveData;
          // Sync it into codeRequests state
          setCodeRequests(prev => {
            const exists = prev.some(r => r.id === liveData.id);
            if (!exists) {
              return [...prev, liveData];
            }
            return prev.map(r => r.id === liveData.id ? liveData : r);
          });
        }
      } catch (err) {
        console.error("Gagal melakukan verifikasi langsung ke database:", err);
      }
    }

    if (req) {
      if (req.isActive === false) {
        setErrorHeader("Kode Anda belum diaktifkan oleh Admin! Silakan kirim bukti transfer melalui tombol 'PESAN & KIRIM BUKTI' di kanan atas dan tunggu Admin mengaktifkannya.");
        return;
      }
      setActiveCode(val);
      setSchoolInfo(prev => ({
        ...prev,
        schoolName: req.schoolName,
        teacherName: req.teacherName,
        teacherTitle: req.role,
        gradeClass: req.gradeClass || prev.gradeClass || "Kelas 4",
        semester: req.semester || prev.semester || "I",
        academicYear: req.academicYear || prev.academicYear || "2025/2026"
      }));
      setSelectedSubject(req.subject);
      setErrorHeader(null);
      setSuccessToast(`Kode Aktif! Profil & Mapel disinkronkan & dikunci.`);
    } else {
      setErrorHeader("Kode tidak terdaftar! Klik tombol MINTA KODE di samping untuk mengajukan.");
    }
  };

  const stepsList = [
    { 
      num: 1, 
      label: "Profil Sekolah", 
      desc: "Verifikasi Identitas", 
      icon: <School size={16} />, 
      emoji: "🏫",
      colorClass: "from-blue-600 via-blue-500 to-blue-400",
      activeBg: "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20",
      activeTextColor: "text-blue-600",
      borderActive: "border-blue-600",
      badgeColor: "bg-blue-100 text-blue-700"
    },
    { 
      num: 2, 
      label: "Mata Pelajaran", 
      desc: "Pilih & Ambil Materi", 
      icon: <BookOpen size={16} />, 
      emoji: "📚",
      colorClass: "from-slate-800 via-slate-900 to-slate-950",
      activeBg: "bg-gradient-to-r from-slate-800 to-slate-950 text-white shadow-lg shadow-slate-900/40",
      activeTextColor: "text-slate-950",
      borderActive: "border-slate-950",
      badgeColor: "bg-slate-200 text-slate-900"
    },
    { 
      num: 3, 
      label: "Aturan Soal", 
      desc: "Tipe & Level Kognitif", 
      icon: <ListFilter size={16} />, 
      emoji: "🎯",
      colorClass: "from-yellow-500 via-amber-500 to-amber-600",
      activeBg: "bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg shadow-amber-500/20",
      activeTextColor: "text-amber-600",
      borderActive: "border-amber-500",
      badgeColor: "bg-amber-100 text-amber-700"
    },
    { 
      num: 4, 
      label: "Hasil Kisi-Kisi", 
      desc: "Matriks Ujian", 
      icon: <FileSpreadsheet size={16} />, 
      emoji: "📋",
      colorClass: "from-orange-500 via-orange-600 to-red-650",
      activeBg: "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-lg shadow-orange-500/20",
      activeTextColor: "text-orange-600",
      borderActive: "border-orange-500",
      badgeColor: "bg-orange-100 text-orange-700"
    },
    { 
      num: 5, 
      label: "Hasil Soal", 
      desc: "Naskah Soal & Kunci", 
      icon: <FileCheck size={16} />, 
      emoji: "📝",
      colorClass: "from-emerald-500 to-green-400",
      activeBg: "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/20",
      activeTextColor: "text-emerald-600",
      borderActive: "border-emerald-500",
      badgeColor: "bg-emerald-100 text-emerald-700"
    },
    { 
      num: 6, 
      label: "Bank Soal", 
      desc: "Koleksi & Arsip Soal", 
      icon: <Database size={16} />, 
      emoji: "🗄️",
      colorClass: "from-blue-600 via-indigo-600 to-indigo-700",
      activeBg: "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/20",
      activeTextColor: "text-indigo-600",
      borderActive: "border-indigo-500",
      badgeColor: "bg-indigo-100 text-indigo-700"
    },
    { 
      num: 7, 
      label: "Menu Kode", 
      desc: "Kelola Akses & Kode", 
      icon: <Key size={16} />, 
      emoji: "🔑",
      colorClass: "from-purple-600 via-indigo-500 to-blue-600",
      activeBg: "bg-gradient-to-r from-purple-650 grid-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/20",
      activeTextColor: "text-purple-650",
      borderActive: "border-purple-500",
      badgeColor: "bg-purple-100 text-purple-700"
    },
  ].filter(step => step.num !== 7 || isAdmin);

  return (
    <div id="app-root-container" className="min-h-screen comel-dot-pattern text-slate-300 flex flex-col font-sans selection:bg-blue-600/30 selection:text-white antialiased relative overflow-hidden">
      {/* Decorative colored glow strip of Blue, Black/Slate, Yellow Gold, Orange, and Glowing Green */}
      <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-slate-950 via-amber-400 via-orange-500 to-emerald-400 relative z-50 animate-pulse"></div>

      {/* Atmospheric Ambient Glow Circles */}
      <div className="colored-bg-glow glow-indigo w-96 h-96 top-10 left-10"></div>
      <div className="colored-bg-glow glow-purple w-[500px] h-[500px] top-[40%] right-[-10%]"></div>
      <div className="colored-bg-glow glow-rose w-96 h-96 bottom-10 left-[15%]"></div>
      <div className="colored-bg-glow glow-amber w-80 h-80 top-[15%] right-[25%]"></div>

      {/* Header Utama Aplikasi */}
      <header id="app-main-header" className="sticky top-0 z-40 bg-slate-950/85 border-b border-slate-800/80 backdrop-blur-md px-6 md:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative">

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-row items-center gap-3.5">
            {/* Custom Interactive SVG Logo matching real branding: Glowing bulb with pen tip over an open book */}
            <div className="w-14 h-14 bg-slate-900/90 border border-slate-700/80 rounded-2xl flex items-center justify-center text-white font-black tracking-tight shadow-lg shadow-blue-500/10 relative group overflow-hidden shrink-0">
              <svg viewBox="0 0 100 100" className="w-10 h-10 select-none pointer-events-none" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Bulb rays */}
                <path d="M50 12 V4" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" className="animate-pulse" />
                <path d="M25 25 L19 19" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" className="animate-pulse" />
                <path d="M12 50 H4" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" className="animate-pulse" />
                <path d="M25 75 L19 81" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" className="animate-pulse" />
                <path d="M75 25 L81 19" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" className="animate-pulse" />
                <path d="M88 50 H96" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" className="animate-pulse" />
                <path d="M75 75 L81 81" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" className="animate-pulse" />

                {/* Inside lightbulb ambient radial gradient */}
                <circle cx="50" cy="45" r="24" fill="url(#headerBulbGlowDark)" />
                {/* Lightbulb glass envelope outline */}
                <path d="M50 18 C36 18 26 29 26 43 C26 53 32 61 38 66 L38 73 L62 73 L62 66 C68 61 74 53 74 43 C74 29 64 18 50 18 Z" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="3.5" strokeLinejoin="round" />
                
                {/* Pen Tip (Inside the lightbulb) */}
                <path d="M50 32 L39 58 L50 72 L61 58 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" strokeLinejoin="round" />
                <line x1="50" y1="32" x2="50" y2="59" stroke="#fbbf24" strokeWidth="2.5" />
                <circle cx="50" cy="46" r="3.5" fill="#fef08a" />

                {/* Screw Base of Lightbulb */}
                <rect x="39" y="73" width="22" height="5" rx="2" fill="#94a3b8" />
                <rect x="42" y="78" width="16" height="4" rx="1.5" fill="#475569" />

                {/* Open Book underneath */}
                <path d="M15 94 C33 94 43 85 50 87 C57 85 67 94 85 94" stroke="#93c5fd" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M50 87 V94" stroke="#93c5fd" strokeWidth="3" />
                
                <defs>
                  <radialGradient id="headerBulbGlowDark" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="text-left">
              <div className="flex flex-row items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-slate-100 tracking-tight leading-none uppercase">
                  PELITA SOAL
                </h1>
                <span className="px-2.5 py-0.5 bg-yellow-400 text-slate-950 text-[9px] font-black rounded-md uppercase tracking-wider shadow-md select-none">APLIKASI PEMBUAT SOAL</span>
                {isStandalone && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[9.5px] font-black rounded-md uppercase tracking-wider shadow-sm select-none">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    💻 LAPTOP APP AKTIF
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-100 mt-2 font-black flex items-center justify-start gap-1 flex-wrap">
                <span>🚀</span> Cerdas Membuat Soal, Lebih Mudah, PRAKTIS & Berkualitas!
              </p>
            </div>
          </div>

        </div>

        {/* PROFILE GURU PELOSOK - HORIZONTAL ALIGNED WITH SOCIAL ACTIONS */}
        <div id="author-profile-card" className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/80 hover:bg-slate-900/95 border-2 border-amber-500/40 rounded-2xl p-3.5 px-5 shadow-2xl shadow-amber-500/5 backdrop-blur-md transition-all duration-300 md:self-auto ml-auto sm:ml-0 md:ml-auto select-none">
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Activation Code input / Admin Badge */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 shadow-inner shrink-0 leading-none w-full sm:w-auto">
              <div className="flex flex-col items-start mr-2">
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest block mb-1 leading-none">🔑 Kode Akses</span>
                <input 
                  type="text"
                  value={codeInputValue}
                  onChange={(e) => setCodeInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = codeInputValue.trim().toUpperCase();
                      if (!val) return;
                      handleVerifyCodeProcess(val);
                    }
                  }}
                  placeholder="INPUT KODE"
                  className="bg-transparent text-[11px] font-black font-mono outline-none text-slate-100 placeholder-slate-600 w-24 uppercase tracking-wider leading-none"
                />
              </div>
              
              <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2.5">
                {activeCode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCode("");
                      setCodeInputValue("");
                      setErrorHeader(null);
                      setSuccessToast("Aktivasi dinonaktifkan!");
                    }}
                    className="px-2.5 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-black rounded-lg uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all cursor-pointer block shrink-0 leading-none"
                    title="Lepaskan Kode Aktivasi"
                  >
                    Lepas
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const val = codeInputValue.trim().toUpperCase();
                      if (!val) return;
                      handleVerifyCodeProcess(val);
                    }}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-[9px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer block shrink-0 leading-none shadow-md"
                  >
                    Aktif
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons: Minta Kode & Menu Pesan - BESIDE each other, highly prominent */}
            <div className="flex flex-row items-center gap-2">
              {/* MINTA KODE */}
              <button 
                type="button"
                onClick={() => {
                  setWaForm({
                    schoolName: "SD Makanan Bergizi Gratis",
                    teacherName: "Ghea Gavriella, S.Pdf., MBG",
                    role: "Guru Kelas",
                    gradeClass: "Kelas 4",
                    subjectType: "Bahasa Inggris",
                    religionType: "Pendidikan Agama Islam",
                    whatsappNumber: ""
                  });
                  setIsWaModalOpen(true);
                }}
                className={`px-3 py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 leading-none hover:scale-[1.02] active:scale-95 ${
                  waAlert ? "animate-pulse border border-rose-500 bg-rose-500/20 text-rose-400" : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 shadow-md shadow-amber-500/10 font-black"
                }`}
                title="Ajukan Pengajuan Kode Aktivasi Baru"
              >
                <span>🔑</span> Minta Kode
                {waAlert && (
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce"></span>
                )}
              </button>

              {/* MENU PESAN (KIRIM BUKTI) */}
              <button 
                type="button"
                onClick={() => {
                  const hasSubmitted = localStorage.getItem("ttu_has_submitted_request") === "true" || codeRequests.some(r => r.id !== "req-1" && r.id !== "req-2" && r.schoolName && schoolInfo.schoolName && r.schoolName.trim().toLowerCase() === schoolInfo.schoolName.trim().toLowerCase());
                  if (!hasSubmitted) {
                    setWarningToast("⚠️ Anda belum meminta kode akses! Silakan klik tombol 'Minta Kode'");
                    return;
                  }

                  // Pre-fill message form with newest pending/request if available
                  const newestRequest = codeRequests.find(r => !r.isActive) || codeRequests[0];
                  setMessageForm({
                    schoolName: (matchedRequest && matchedRequest.schoolName) || (newestRequest && newestRequest.schoolName) || schoolInfo.schoolName || "",
                    teacherName: (matchedRequest && matchedRequest.teacherName) || (newestRequest && newestRequest.teacherName) || schoolInfo.teacherName || "",
                    uniqueCode: (matchedRequest && matchedRequest.uniqueCode) || (newestRequest && newestRequest.uniqueCode) || activeCode || "",
                    buktiTransfer: ""
                  });
                  setIsMessageModalOpen(true);
                }}
                className="px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 leading-none shadow-md shadow-emerald-500/10 hover:scale-[1.02] active:scale-95 border border-emerald-500/30 font-black"
                title="Menu Pesan: Kirim Bukti Transfer Aktivasi"
              >
                <MessageSquare size={11} className="stroke-[2.5]" />
                <span>Pesan &amp; Kirim Bukti</span>
              </button>
            </div>
          </div>

          {/* Attractive Graphic Logo GP replacing standard avatar photo */}
          <div className="flex items-center gap-2.5 ml-auto sm:ml-0 border-t sm:border-t-0 sm:border-l border-slate-800/85 pt-2.5 sm:pt-0 sm:pl-4">
            {isAdmin && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep(7);
                    setSuccessToast(`Membuka Panel Manajemen Kode Aktivasi: ${totalSignalsCount} notifikasi berjalan.`);
                  }}
                  className={`relative p-2 rounded-xl border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-md group active:scale-95 shrink-0 ${
                    totalSignalsCount > 0 
                      ? "bg-slate-900 border-rose-500/50 text-rose-450 hover:text-rose-400 select-none animate-pulse-subtle" 
                      : "bg-slate-900 border-slate-800 text-amber-500 hover:text-amber-400 select-none"
                  }`}
                  title={
                    messagesRequestsCount > 0
                      ? `Ada ${pendingRequestsCount} pengajuan baru & ${messagesRequestsCount} bukti transfer terlampir.`
                      : `Ada ${pendingRequestsCount} pengajuan kode baru.`
                  }
                >
                  <Bell size={16} className={`stroke-[2.5] ${totalSignalsCount > 0 ? "animate-bounce" : ""}`} />
                  {/* Ping Animation halo ring if there is any pending request or message */}
                  {totalSignalsCount > 0 && (
                    <span className="absolute inset-0 rounded-xl bg-rose-500/10 border-2 border-rose-500 animate-ping pointer-events-none opacity-45"></span>
                  )}
                  {/* Red bubble request badge */}
                  {totalSignalsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-black text-[8.5px] w-5 h-5 rounded-full flex items-center justify-center border border-slate-950 shadow-lg select-none">
                      {totalSignalsCount}
                    </span>
                  )}
                </button>
                {/* Special mini green receipt alert if there are uploaded payment proofs */}
                {messagesRequestsCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 px-1 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider border border-slate-950 shadow-md animate-pulse">
                    +PESAN
                  </span>
                )}
              </div>
            )}
            
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 border border-amber-300/40 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0 select-none group transition-all duration-300">
              <div className="absolute inset-0.5 bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-[13px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-350 to-amber-500 drop-shadow-md">
                  GP
                </span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse"></span>
            </div>
            
            <div className="flex flex-col text-left select-none shrink-0 border-l border-slate-850 pl-2">
              <span className="text-[10px] font-black text-slate-100 tracking-wider uppercase leading-none">
                GURU PELOSOK
              </span>
              <span className="text-[7.5px] font-black text-amber-500/90 mt-1 uppercase tracking-widest leading-none">
                {isAdmin ? "⭐ ADMIN UTAMA" : "OFFICIAL BRAND"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Rincian Progress Bar Step-by-Step - Mode Visual Cantik Mewah Sangat Indah berupa Sidebar Kiri Premium */}
      <div className="flex-1 flex flex-col lg:flex-row w-full relative z-10 min-h-0">
        
        {/* Left Sidebar Menu */}
        {sidebarOpen && (
          <aside id="app-sidebar-nav" className="w-full lg:w-80 shrink-0 bg-slate-950/90 border-b lg:border-b-0 lg:border-r border-slate-800 px-6 py-5 md:px-8 flex flex-col gap-5 relative z-20 backdrop-blur-md animate-in slide-in-from-left duration-300">
            {/* Subtle gold decoration top of sidebar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700"></div>

            <div className="flex items-center justify-between border-b border-slate-800/85 pb-3">
              <div className="flex items-center gap-2.5">
                <button
                  id="btn-sidebar-inner-close"
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-amber-500 hover:text-amber-400 bg-slate-900/60 hover:bg-slate-900 border border-amber-500/25 rounded-md flex items-center justify-center transition-all cursor-pointer focus:outline-none"
                  title="Sembunyikan Menu"
                >
                  <Menu size={20} className="stroke-[2.5]" />
                </button>
                <h2 className="text-xs font-black tracking-widest text-[#93c5fd] uppercase">
                  MENU UTAMA
                </h2>
              </div>
              <button
                id="btn-workspace-clear"
                type="button"
                onClick={handleResetWorkspace}
                className="px-2.5 py-1.5 border border-rose-950 bg-rose-950/40 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
              >
                <RotateCcw size={10} /> Reset
              </button>
            </div>

            {/* Sidebar Step Tabs */}
            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2.5 pb-2.5 lg:pb-0 scrollbar-hide">
              {stepsList.map((step) => {
                const isActive = activeStep === step.num;
                const isCompleted = (kisiKisi.length > 0 && step.num < 4) || (questions.length > 0 && step.num < 5);
                return (
                  <button
                    key={step.num}
                    id={`btn-step-tab-${step.num}`}
                    type="button"
                    onClick={() => {
                      if (step.num === 4 && kisiKisi.length === 0) return;
                      if (step.num === 5 && questions.length === 0) return;
                      setActiveStep(step.num);
                      setSidebarOpen(false); // Sembunyikan sidebar setelah menu diklik untuk tampilan penuh
                    }}
                    disabled={(step.num === 4 && kisiKisi.length === 0) || (step.num === 5 && questions.length === 0)}
                    className={`flex flex-row items-center gap-3.5 p-3 rounded-xl border text-left transition-all duration-300 shrink-0 w-[190px] lg:w-full group relative ${
                      isActive
                        ? "bingkai-emas-tab-active scale-[1.01]"
                        : isCompleted
                        ? "border-emerald-500/40 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-950/20"
                        : "border-slate-850 bg-slate-900/40 text-slate-400 hover:bg-slate-905 hover:border-slate-800"
                    } ${(step.num === 4 && kisiKisi.length === 0) || (step.num === 5 && questions.length === 0) ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {/* Icon or emoji with badge indicators */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl relative shrink-0 transition-transform group-hover:scale-105 duration-300 ${
                      isActive ? "bg-amber-500/10 text-amber-400" : "bg-slate-850 text-slate-400"
                    }`}>
                      {step.emoji}
                      {isCompleted && (
                        <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-emerald-600 to-green-400 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border border-slate-950 shadow-sm animate-bounce">
                          ✓
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute -top-1 -right-1 bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border border-slate-950 shadow-sm animate-pulse">
                          ⭐
                        </div>
                      )}
                      {step.num === 7 && pendingRequestsCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-rose-600 to-red-600 text-white font-extrabold text-[8.5px] w-5 h-5 rounded-full flex items-center justify-center border border-slate-950 shadow-lg animate-bounce select-none">
                          {pendingRequestsCount}
                        </div>
                      )}
                    </div>

                    <div className="text-left min-w-0 flex-1">
                      <span className={`text-[11px] font-black tracking-tight leading-normal uppercase block transition-colors duration-300 truncate ${
                        isActive ? "text-amber-400" : isCompleted ? "text-emerald-400" : "text-slate-300"
                      }`}>
                        {step.label}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold block mt-0.5 leading-tight truncate">
                        {step.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Golden branding footer inside sidebar */}
            <div className="mt-auto hidden lg:block p-4 bg-[#0a0f24] border border-amber-500/10 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
              <h4 className="text-[9px] font-extrabold text-amber-500 tracking-wider uppercase mb-1.5 flex items-center gap-1">
                <span>💎</span> STATUS LISENSI
              </h4>
              <p className="text-[9px] text-slate-400 font-bold leading-normal mb-3">
                Premium Aktif &bull; Edisi Terintegrasi Kurikulum Merdeka Fase A-C Dasar.
              </p>

              {/* Laptop PWA Shortcut integration */}
              {!isInstalled && !isStandalone && (
                <button
                  type="button"
                  onClick={() => {
                    if (deferredPrompt) {
                      deferredPrompt.prompt();
                    } else {
                      setShowInstallGuide(true);
                    }
                  }}
                  className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500 hover:text-white border border-indigo-500/40 text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <span>💻</span> INSTAL APLIKASI
                </button>
              )}
            </div>
          </aside>
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 px-5 py-5 md:px-6 md:py-6 space-y-5 min-w-0 bg-slate-950/20 relative">

          {/* FIREBASE SYNC ERROR DIAGNOSTIC PANEL */}
          {firestoreSyncError && (
            <div id="firebase-sync-alert" className="bg-gradient-to-r from-rose-950/85 via-slate-900/85 to-rose-950/85 border-2 border-rose-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 text-xl animate-bounce">
                  ⚠️
                </div>
                <div className="text-left space-y-2 flex-1">
                  <span className="px-2.5 py-0.5 bg-rose-500/15 border border-rose-500/35 text-rose-400 text-[9px] font-black rounded-md uppercase tracking-wider block w-fit mb-1">
                    KENDALA DATABASE CLOUD FIRESTORE TERDETEKSI
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-100 uppercase tracking-tight">
                    Sinkronisasi Data Bermasalah dengan Project Firebase Anda ({db.app.options.projectId || "pelita-soal"})
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                    Aplikasi mendeteksi bahwa perangkat tidak dapat melakukan sinkronisasi dengan Cloud Database Firestore Anda. Pesan/bukti transfer dari pengguna tidak akan terbaca di perangkat Admin, dan sebaliknya, sampai masalah Aturan Keamanan (Rules) diselesaikan di Console Firebase Anda.
                  </p>
                  
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-rose-500/20 space-y-2.5 text-[11.5px] leading-relaxed font-semibold text-slate-200">
                    <p className="text-rose-400 font-extrabold">🚨 Detail Kesalahan:</p>
                    <code className="block bg-slate-900 px-2.5 py-1.5 rounded text-[10px] font-mono text-rose-350 break-all select-all">
                      {firestoreSyncError}
                    </code>
                    
                    <p className="text-amber-400 font-bold mt-2">🛠️ Langkah Solusi (Sangat Mudah &amp; 100% Mengatasi Masalah):</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 font-medium">
                      <li>Buka <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 font-black underline hover:text-blue-300">Firebase Console</a> Anda dan pilih project <strong className="text-white">{db.app.options.projectId || "pelita-soal"}</strong>.</li>
                      <li>Di menu kiri, klik <strong className="text-white">Build &gt; Firestore Database</strong>. Jika database belum dibuat, klik <strong className="text-white">Create Database</strong>, pilih lokasi server Asia terdekat (misal <strong className="text-white">asia-southeast1</strong>), lalu buat dengan mode default.</li>
                      <li>Buka tab <strong className="text-white">Rules</strong> (Aturan Keamanan) di atas halaman Firestore Database.</li>
                      <li>Hapus semua isi Aturan Keamanan default di sana, ganti sepenuhnya dengan copy-paste Aturan Keamanan resmi di bawah ini:</li>
                    </ol>
                    
                    <div className="relative mt-2">
                      <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[9.5px] font-mono text-emerald-400 overflow-x-auto max-h-48 select-all">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                      </pre>
                      <span className="absolute top-2 right-2 text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase pointer-events-none">Aturan Terbuka (Siap Pakai)</span>
                    </div>
                    
                    <p className="text-slate-400 text-[10px] mt-2 font-medium">
                      Setelah menempel aturan di atas di tab <strong className="text-white">Rules</strong>, jangan lupa klik tombol <strong className="text-emerald-400 font-extrabold">"Publish"</strong> di Firebase Console. Database Anda akan langsung aktif &amp; sinkronisasi multi-device otomatis berjalan seketika!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAPTOP INSTALLATION WARNING BANNER (PROGRESSIVE WEB APP) */}
          {!isInstalled && !isStandalone && !isInstallBannerDismissed && (
            <div className="bg-gradient-to-r from-indigo-950/95 via-slate-900/95 to-indigo-950/95 border-2 border-indigo-500/40 rounded-2xl p-4 md:p-5 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 animate-pulse-subtle">
              {/* Decorative accent background lights */}
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute left-1/3 bottom-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                <div className="flex items-start gap-4">
                  {/* Glowing Icon Container with a laptop inside */}
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/10 animate-bounce-slow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-laptop">
                      <polygon points="12 17 12 17 12 17 12 17"/>
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <path d="M22 17v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-100 tracking-tight flex items-center gap-2 flex-wrap text-left">
                      <span>💻</span> REKOMENDASI UTAMA: PASANG UNTUK PENGGUNAAN OFFLINE
                    </h3>
                    <p className="text-xs text-slate-300 mt-1.5 font-medium leading-relaxed max-w-3xl text-left">
                      Demi menjaga keutuhan data sekolah, stabilitas sinkronisasi guru, kelancaran pencetakan (PDF/Word), dan agar <span className="text-amber-400 font-extrabold font-black">seluruh generator serta menu aplikasi tetap berfungsi 100% lancar secara offline luring (tanpa internet)</span>, klik tombol install di bawah!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 select-none flex-wrap">
                  <button
                    type="button"
                    onClick={async () => {
                      if (deferredPrompt) {
                        try {
                          await deferredPrompt.prompt();
                          const { outcome } = await deferredPrompt.userChoice;
                          console.log("[PWA] User choice outcome:", outcome);
                          if (outcome === "accepted") {
                            setIsInstalled(true);
                            localStorage.setItem("ttu_app_installed_status", "true");
                          }
                          setDeferredPrompt(null);
                        } catch (e) {
                          console.error("[PWA] Install error:", e);
                          setShowInstallGuide(true);
                        }
                      } else {
                        setShowInstallGuide(true);
                      }
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white text-[10.5px] font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <span>💻</span> INSTAL APLIKASI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInstallBannerDismissed(true);
                      localStorage.setItem("ttu_install_banner_dismissed", "true");
                    }}
                    className="p-2.5 border border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-850 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
                    title="Sembunyikan Peringatan"
                  >
                    Nanti Saja
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* USER ACCESS CODE NOTIFICATION AREA */}
          {activeStep === 1 && matchedRequest && !isBannerDismissed && (
            matchedRequest.isActive === false ? (
              /* Simple, calm warning for inactive code - no headache alarm styling */
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 md:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                    <Lock size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-extrabold rounded uppercase tracking-wider">
                        Menunggu Aktivasi
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold font-mono">Kode: {matchedRequest.uniqueCode}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                      Kode akses Anda belum diaktifkan oleh Admin. Silakan konfirmasi via Menu Pesan atau hubungi admin agar dapat mengakses seluruh fitur tanpa batasan.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMessageForm({
                        schoolName: matchedRequest.schoolName || schoolInfo.schoolName || "",
                        teacherName: matchedRequest.teacherName || schoolInfo.teacherName || "",
                        buktiTransfer: "",
                        uniqueCode: matchedRequest.uniqueCode || activeCode || ""
                      });
                      setIsMessageModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0 active:scale-95"
                  >
                    <MessageSquare size={12} className="stroke-[2.5]" />
                    <span>Kirim Info Bukti</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBannerDismissed(true)}
                    className="p-1 px-2 border border-slate-700 bg-slate-950/40 text-slate-450 hover:bg-slate-850 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all duration-300 cursor-pointer shadow-sm ml-1"
                    title="Tutup Notifikasi"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              /* Simple, elegant notification for active access code */
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 md:p-5 shadow-lg flex items-center justify-between gap-4 animate-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Unlock size={16} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold rounded uppercase tracking-wider">
                        ✓ Kode Akses Aktivasi Aktif
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold font-mono">Kode: {matchedRequest.uniqueCode}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-medium leading-normal">
                      Selamat, kode akses Anda telah aktif secara realtime! Seluruh instrumen capaian pembelajaran dan penyusunan modul soal siap digunakan.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBannerDismissed(true)}
                  className="p-1 px-2 border border-slate-700 bg-slate-950/40 text-slate-450 hover:bg-slate-850 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all duration-300 cursor-pointer shadow-sm shrink-0"
                  title="Tutup Notifikasi"
                >
                  Tutup
                </button>
              </div>
            )
          )}

          {!sidebarOpen && (
            <div className="flex justify-start items-center mb-1.5 animate-in fade-in slide-in-from-left duration-300">
              <button
                id="btn-sidebar-reopen"
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 rounded-xl flex items-center gap-2 shadow-md shadow-amber-500/5 hover:shadow-amber-500/10 active:scale-95 duration-300 cursor-pointer text-[11px] font-black uppercase tracking-wider text-amber-400 focus:outline-none"
                title="Tampilkan Kembali Menu Utama"
              >
                <Menu size={16} className="stroke-[2.5]" />
                <span>⚙️ Menu Utama</span>
              </button>
            </div>
          )}
          
          {/* Fallback Active Banner processed silently in background */}

          {/* PREMIUM GAME-STYLE CIRCULAR LOADER FOR GENERATING KISI-KISI */}
          <PremiumLoader
            active={generatingKisiKisi}
            title="Pelita Soal Sedang Menyusun Kisi-Kisi Ujian"
            subtitle="Kami memproses Capaian Pembelajaran dan memetakan indikator soal yang memiliki stimulus konkrit (cerita, gambar, tabel)..."
            type="generate"
          />

          {/* PREMIUM GAME-STYLE CIRCULAR LOADER FOR GENERATING SOAL */}
          <PremiumLoader
            active={generatingSoal}
            title="Pelita Soal Sedang Menulis Naskah Soal Lengkap"
            subtitle="Menerjemahkan kisi-kisi menjadi lembar pertanyaan utuh dengan stimulus pembelajaran kontekstual..."
            type="generate"
          />

          {/* Render Konten sesuai Aktif Step */}
          {!generatingKisiKisi && !generatingSoal && (
            <div id="workspace-step-render" className="animate-in fade-in duration-300">
              {activeStep === 1 && (
                <SchoolProfileForm 
                  schoolInfo={effectiveSchoolInfo} 
                  onChange={setSchoolInfo} 
                  isIdentityLocked={isIdentityLocked} 
                  isLocked={isLocked} 
                  activeCode={activeCode}
                  userApiKey={userApiKey}
                  onChangeUserApiKey={handleSaveUserApiKey}
                />
              )}

              {activeStep === 2 && (
                <SubjectAndTopicManager
                  gradeClass={effectiveSchoolInfo.gradeClass}
                  selectedSubject={effectiveSelectedSubject}
                  onSubjectChange={setSelectedSubject}
                  fetchedData={fetchedData}
                  onFetchedDataChange={setFetchedData}
                  selectedTopics={selectedTopics}
                  onSelectedTopicsChange={setSelectedTopics}
                  onFallbackChange={setIsFallbackActive}
                  isLocked={isLocked}
                  isIdentityLocked={isIdentityLocked}
                  schoolInfo={effectiveSchoolInfo}
                  errorHeader={errorHeader}
                  setErrorHeader={setErrorHeader}
                />
              )}

              {activeStep === 3 && (
                <div className="space-y-6">
                  <QuestionConfigForm configs={questionConfigs} onChange={setQuestionConfigs} />
                  
                  <div className="bingkai-emas-premium p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">Pratinjau Topik Terpilih</h3>
                      <p className="text-xs text-slate-400 mt-1">Anda memilih <span className="text-blue-400 font-extrabold">{selectedTopics.length} topik</span> untuk mata pelajaran <span className="font-extrabold text-slate-200">{effectiveSelectedSubject}</span>.</p>
                    </div>
                    <button
                      id="btn-trigger-kisi-generation"
                      type="button"
                      onClick={() => {
                        setErrorHeader(null);
                        handleGenerateKisiKisi();
                      }}
                      className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-650 via-slate-900 to-slate-950 hover:from-blue-750 hover:to-black text-white font-black text-xs rounded-xl inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all duration-300 cursor-pointer"
                    >
                      <Sparkles size={16} /> Susun Kisi-Kisi Otomatis (AI)
                    </button>
                  </div>

                  {errorHeader && errorHeader.includes("Kisi-Kisi") && (
                    <div id="workspace-step3-error" className="p-4 bg-rose-950/40 border-2 border-rose-500/60 rounded-2xl text-rose-450 text-xs flex items-start gap-3 animate-bounce">
                      <AlertCircle size={20} className="shrink-0 text-rose-500 mt-0.5 animate-pulse" />
                      <div>
                        <h4 className="font-bold text-rose-100 uppercase tracking-wider text-[11px]">Terjadi Gangguan Penyusunan</h4>
                        <p className="mt-1 font-semibold text-rose-200">{errorHeader}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeStep === 4 && kisiKisi.length > 0 && (
                <div className="space-y-6">
                  <KisiKisiView
                    schoolInfo={effectiveSchoolInfo}
                    subject={effectiveSelectedSubject}
                    kisiKisi={kisiKisi}
                    onGenerateSoal={() => {
                      setErrorHeader(null);
                      handleGenerateSoalUjian();
                    }}
                    isGeneratingSoal={generatingSoal}
                    hasGeneratedSoal={questions.length > 0}
                  />

                  {errorHeader && errorHeader.includes("Naskah Soal") && (
                    <div id="workspace-step4-error" className="p-4 bg-rose-950/40 border-2 border-rose-500/60 rounded-2xl text-rose-450 text-xs flex items-start gap-3 animate-bounce">
                      <AlertCircle size={20} className="shrink-0 text-rose-500 mt-0.5 animate-pulse" />
                      <div>
                        <h4 className="font-bold text-rose-100 uppercase tracking-wider text-[11px]">Terjadi Gangguan Penyusunan</h4>
                        <p className="mt-1 font-semibold text-rose-200">{errorHeader}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeStep === 5 && questions.length > 0 && (
                <SoalUjianView
                  schoolInfo={effectiveSchoolInfo}
                  subject={effectiveSelectedSubject}
                  questions={questions}
                  onUpdateQuestions={setQuestions}
                  kisiKisi={kisiKisi}
                  onUpdateKisiKisi={setKisiKisi}
                  onSaveToBankSoal={handleSaveToBankSoal}
                  setSuccessToast={setSuccessToast}
                  setWarningToast={setWarningToast}
                  isAlreadySaved={hasSavedCurrentSoal}
                />
              )}

              {activeStep === 6 && (
                <div id="step-6-bank-soal" className="space-y-6">
                  {/* Glass Header */}
                  <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-950/75 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-in fade-in duration-300">
                    <div className="absolute top-0 right-0 p-8 text-indigo-500/15 pointer-events-none">
                      <Database size={120} className="stroke-[1.5]" />
                    </div>
                    <div className="relative z-10">
                      <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black rounded-lg uppercase tracking-wider block w-fit mb-3">
                        🗄️ REPOSITORI ARSIP SOAL
                      </span>
                      <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight">
                        BANK SOAL MANDIRI
                      </h2>
                      <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
                        Simpan, kelola, pilah berdasarkan mata pelajaran, dan muat kembali lembaran soal yang handal ke dalam kanvas kerja Anda secara instan.
                      </p>
                    </div>
                  </div>

                  {/* Bank Soal List and Filters Container */}
                  <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl shadow-xl space-y-6">
                    {(() => {
                      const bankItems = bankSoalList;
                      
                      // Filter by subject
                      const subjects = Array.from(new Set(bankItems.map((item: any) => item.subject))).filter(Boolean) as string[];
                      const filteredItems = bankSoalFilterSubject === "Semua" 
                        ? bankItems 
                        : bankItems.filter((item: any) => item.subject === bankSoalFilterSubject);

                      const handleDeleteItem = async (itemId: string, itemSubject: string) => {
                        const confirmMsg = `Apakah Anda yakin ingin menghapus paket soal ${itemSubject} ini dari Bank Soal lokal Anda?`;

                        setAppConfirm({
                          isOpen: true,
                          title: "Hapus Paket Soal",
                          subTitle: "HAPUS DARI REPOSITORI BANK SOAL",
                          message: confirmMsg,
                          confirmLabel: "Ya, Hapus Permanen",
                          cancelLabel: "Batal",
                          isDanger: true,
                          onConfirm: async () => {
                            // Close popup instantly to prevent stagnation!
                            setAppConfirm(null);

                            // Optimistically update list state instantly so it updates without delay
                            setBankSoalList(prev => {
                              const updated = prev.filter((item: any) => item.id !== itemId);
                              localStorage.setItem("ttu_bank_soal", JSON.stringify(updated));
                              return updated;
                            });

                            setSuccessToast(`Sukses menghapus paket soal dari Bank Soal Anda.`);
                          }
                        });
                      };

                      const handleLoadItem = (item: any) => {
                        setAppConfirm({
                          isOpen: true,
                          title: "Muat Paket Soal",
                          subTitle: "MENGGANTI KANVAS KERJA AKTIF",
                          message: `Memuat paket ini akan mengganti draf soal aktif Anda saat ini di layar. Pekerjaan apa pun yang belum disimpan akan digantikan. Apakah Anda yakin ingin melanjutkan memuat paket ${item.subject}?`,
                          confirmLabel: "Ya, Muat Sekarang",
                          cancelLabel: "Batal",
                          isDanger: false,
                          onConfirm: () => {
                            setSchoolInfo(item.schoolInfo);
                            setQuestions(item.questions);
                            setKisiKisi(item.kisiKisi || []);
                            setSelectedSubject(item.subject);
                            setSuccessToast(`🎉 Paket soal ${item.subject} berhasil dimuat ke Kanvas Kerja!`);
                            setActiveStep(5); // Jump to active exam paper view
                            setAppConfirm(null);
                          }
                        });
                      };

                      return (
                        <div className="space-y-6">
                          {/* Subject Filters Pills */}
                          <div className="flex flex-wrap items-center gap-2 border-b border-slate-805 pb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-2">Pilar Pelajaran:</span>
                            <button
                              type="button"
                              onClick={() => setBankSoalFilterSubject("Semua")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                                bankSoalFilterSubject === "Semua"
                                  ? "bg-slate-100 text-slate-950 border-slate-100"
                                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                              }`}
                            >
                              Semua ({bankItems.length})
                            </button>
                            {subjects.map((sub) => {
                              const count = bankItems.filter((item: any) => item.subject === sub).length;
                              return (
                                <button
                                  key={sub}
                                  type="button"
                                  onClick={() => setBankSoalFilterSubject(sub)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                                    bankSoalFilterSubject === sub
                                      ? "bg-slate-100 text-slate-950 border-slate-150"
                                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                                  }`}
                                >
                                  {sub} ({count})
                                </button>
                              );
                            })}
                          </div>

                          {/* List Grid */}
                          {filteredItems.length === 0 ? (
                            <div className="text-center py-12 space-y-3.5 animate-in fade-in duration-200">
                              <div className="w-16 h-16 bg-slate-950 rounded-2.5xl flex items-center justify-center text-3xl mx-auto shadow-inner text-slate-600 border border-slate-850">
                                🗄️
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-300">Belum Ada Soal Tersimpan</h4>
                                <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                                  Arsip untuk filter ini kosong. Silakan masuk menu <strong>Hasil Soal</strong> dan klik <strong>Simpan ke Bank Soal</strong> untuk merekam data secara instan!
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {filteredItems.map((item: any) => (
                                <div 
                                  key={item.id} 
                                  className="bg-slate-950/65 border border-slate-850 hover:border-slate-800/85 p-4.5 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:bg-slate-950/95 hover:shadow-lg shadow-black/20 group relative overflow-hidden"
                                >
                                  <div className="space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex flex-wrap gap-1 items-center">
                                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[9px] font-black rounded uppercase tracking-wider block">
                                            {item.subject}
                                          </span>
                                          {isAdmin && (
                                            <span className="px-2 py-0.5 bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[9px] font-black rounded uppercase tracking-wider block">
                                              🔑 {item.ownerCode || "TRIAL"}
                                            </span>
                                          )}
                                        </div>
                                        <h3 className="font-black text-slate-200 text-sm mt-1.5 tracking-tight group-hover:text-amber-400 transition-colors">
                                          {item.schoolInfo?.schoolName || "SD Negeri"}
                                        </h3>
                                      </div>
                                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                                        {item.savedAt}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-900">
                                      <div>
                                        <span className="text-slate-500 block text-[9px] uppercase font-black">Kategori Kelas:</span>
                                        <span className="font-bold text-slate-300">{item.schoolInfo?.gradeClass || "Kelas 4"}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block text-[9px] uppercase font-black">Jumlah Butir:</span>
                                        <span className="font-bold text-slate-300">{item.questions?.length || 0} Soal</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block text-[9px] uppercase font-black">Semester:</span>
                                        <span className="font-bold text-slate-300">Semester {item.schoolInfo?.semester || "I"}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block text-[9px] uppercase font-black">Tahun Ajaran:</span>
                                        <span className="font-bold text-slate-300">{item.schoolInfo?.academicYear || "2025/2026"}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 pt-3 border-t border-slate-900 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleLoadItem(item)}
                                      className="flex-1 py-1.5 bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 text-slate-200 hover:text-amber-400 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-97 shadow-sm"
                                    >
                                      📂 Ambil &amp; Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item.id, item.subject)}
                                      className="p-2 bg-rose-950/20 hover:bg-rose-950 border border-rose-950 hover:border-rose-800 text-rose-400 font-black text-xs rounded-xl transition-all cursor-pointer active:scale-97 duration-200"
                                      title="Hapus paket ini dari Bank Soal"
                                    >
                                      <Trash size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeStep === 7 && isAdmin && (
                <div id="step-6-menu-kode" className="space-y-6">
                  {/* Glass Header */}
                  <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-950/75 border border-purple-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-purple-500/15 pointer-events-none">
                      <Key size={120} className="stroke-[1.5]" />
                    </div>
                    <div className="relative z-10">
                      <span className="px-2.5 py-1 bg-purple-500/20 text-purple-350 border border-purple-500/30 text-[10px] font-black rounded-lg uppercase tracking-wider block w-fit mb-3">
                        🔑 PANEL MANAJEMEN KODE AKTIVASI
                      </span>
                      <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight">
                        Status &amp; Verifikasi Lisensi Profil Sekolah
                      </h2>
                      <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
                        Fitur ini mengunci data Sekolah, Guru, Mata Pelajaran, dan Batasan Pelosok secara otomatis setelah pengguna terverifikasi oleh <strong>Admin Pelita Soal</strong>. Di bawah ini adalah riwayat pengisian kontak WhatsApp dan kode aktivasi unik yang diterbitkan.
                      </p>
                    </div>
                  </div>

                  {/* Active Status Info Box */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <Key size={18} />
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Kode Aktif Saat Ini</span>
                        <span className="text-sm font-black font-mono text-amber-400 mt-1 block">
                          {activeCode ? activeCode : "TIDAK ADA (Trial/Bebas)"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <School size={18} />
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Status Proteksi Profil</span>
                        <span className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${isLocked ? "text-emerald-400" : "text-amber-500"}`}>
                          {isLocked ? (
                            <>🔒 Terkunci (Lisensi Aktif)</>
                          ) : (
                            <>🔓 Terbuka (Bebas Edit)</>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                        <Unlock size={18} />
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Bypass Admin</span>
                        <span className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${isAdmin ? "text-emerald-400 font-black animate-pulse" : "text-slate-400"}`}>
                          {isAdmin ? "⭐ Admin Aktif (GP-PSR86)" : "Non-Aktif"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Code Request List */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 md:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
                      <div>
                        <h3 className="font-bold text-slate-200 text-sm">Daftar Request Kode Masuk</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Database riwayat pengisian formulir kode aktivasi dari WhatsApp Kontak.</p>
                      </div>
                    </div>

                    {codeRequests.length === 0 ? (
                      <div className="text-center py-10">
                        <span className="text-3xl text-slate-600 block mb-2">📋</span>
                        <p className="text-xs text-slate-500 font-bold">Belum ada request data kode aktivasi yang diajukan.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {codeRequests.map((req: any) => {
                          const isThisReqActive = normalizeCode(activeCode) === normalizeCode(req.uniqueCode);
                          const isActivated = req.isActive !== false; // defaults to active if undefined
                          return (
                            <div 
                              key={req.id} 
                              className={`bg-slate-950/65 hover:bg-slate-950 border rounded-2xl p-5 md:p-6 transition-all duration-300 gap-6 flex flex-col md:flex-row md:items-center justify-between ${
                                isThisReqActive ? "border-amber-500/60 bg-amber-500/5 shadow-lg" : "border-slate-850"
                              }`}
                            >
                              <div className="flex-1 space-y-3 text-left">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${
                                    isThisReqActive ? "bg-amber-400 text-slate-950 shadow-sm" : "bg-slate-850 text-slate-300"
                                  }`}>
                                    {req.role}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-extrabold">
                                    Diajukan: {req.timestamp}
                                  </span>
                                  
                                  {/* Payment status badge */}
                                  <span className={`text-[9.5px] font-black py-1 px-2.5 rounded-md inline-flex items-center gap-1 uppercase tracking-wider ${
                                    isActivated 
                                      ? "bg-emerald-950/70 text-emerald-400 border border-emerald-900/60" 
                                      : "bg-rose-950/70 text-rose-400 border border-rose-900/60 animate-pulse"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActivated ? "bg-emerald-400" : "bg-rose-400"}`}></span>
                                    {isActivated ? "🟢 AKTIF" : "🟠 BELUM AKTIF"}
                                  </span>

                                  {isThisReqActive && (
                                    <span className="text-[9px] bg-indigo-650 text-indigo-100 border border-indigo-500/40 px-2.5 py-1 rounded-md font-black uppercase tracking-wider flex items-center gap-1">
                                      🔒 AKTIF DI HEADER
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 text-xs font-semibold text-slate-300">
                                  <div>
                                    <span className="text-[10.5px] text-slate-500 block font-black uppercase tracking-wider mb-0.5">Nama Sekolah:</span>
                                    <span className="font-bold text-slate-200">{req.schoolName}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10.5px] text-slate-500 block font-black uppercase tracking-wider mb-0.5">Nama Guru:</span>
                                    <span className="font-bold text-slate-200">{req.teacherName}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10.5px] text-slate-500 block font-black uppercase tracking-wider mb-0.5">Mapel / Agama:</span>
                                    <span className="font-bold text-slate-200">{req.subject}</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 pt-1">
                                  <div>
                                    <span className="text-[10.5px] text-slate-500 font-extrabold mr-1.5 uppercase tracking-wider">No. WA Kontak:</span>
                                    <span className="text-xs text-slate-400 font-mono font-black select-all bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-lg">
                                      {req.whatsappNumber}
                                    </span>
                                  </div>
                                </div>

                                {/* Proof of Transfer Section */}
                                {req.buktiTransfer && (
                                  <div className="mt-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl max-w-md">
                                    <span className="text-[9.5px] text-emerald-400 font-black uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                                      🧾 BUKTI TRANSFER PEMBAYARAN (Rp. 20.000)
                                    </span>
                                    {req.buktiTransfer.startsWith("data:image") ? (
                                      <div className="flex items-center gap-3">
                                        <img 
                                          src={req.buktiTransfer} 
                                          alt="Bukti Transfer" 
                                          className="h-20 w-32 rounded-lg object-contain border border-slate-750 bg-slate-950/60 hover:scale-105 transition-transform duration-300 cursor-pointer shadow-md shrink-0"
                                          onClick={() => {
                                            const w = window.open();
                                            if (w) {
                                              w.document.write(`<img src="${req.buktiTransfer}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                              w.document.close();
                                            }
                                          }}
                                          title="Klik untuk membuka bukti transfer ukuran penuh"
                                        />
                                        <div className="text-left">
                                          <p className="text-[10px] text-slate-400 font-bold leading-normal">
                                            Bukti Transfer telah diunggah oleh user dalam format gambar.
                                          </p>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const w = window.open();
                                              if (w) {
                                                w.document.write(`<img src="${req.buktiTransfer}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                                w.document.close();
                                              }
                                            }}
                                            className="text-[9.5px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-wider block mt-1 hover:underline cursor-pointer"
                                          >
                                            Buka Ukuran Penuh &rarr;
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-emerald-950/30 text-emerald-400 border border-emerald-900/50 text-[10.5px] font-black rounded-lg flex items-center gap-1.5">
                                        <span>💎</span> Bukti transfer terkirim dalam status peninjauan.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Action Unique Code block */}
                              <div className="mt-4 md:mt-0 flex flex-col sm:flex-row md:flex-col gap-3 bg-slate-950/80 border border-slate-850 rounded-2xl p-4 shrink-0 min-w-[180px] text-center md:text-left shadow-inner">
                                <div className="text-left border-b border-slate-900 pb-2.5">
                                  <span className="text-[9.5px] text-slate-500 font-black block tracking-wider uppercase mb-0.5">Kode Unik</span>
                                  <span className="text-base font-black font-mono text-purple-400 tracking-widest block leading-none">
                                    {req.uniqueCode}
                                  </span>
                                </div>
                                
                                <div className="flex flex-col gap-1.5">
                                  {/* ACTIVE/INACTIVE TOGGLE (Requested by user) */}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const updatedReq = { ...req, isActive: !isActivated };
                                      // Optimistic update
                                      setCodeRequests((prev) => 
                                        prev.map((r) => r.id === req.id ? updatedReq : r)
                                      );
                                      setSuccessToast(`Kode ${req.uniqueCode} berhasil ${isActivated ? "DINONAKTIFKAN" : "DIAKTIFKAN"} oleh Admin!`);
                                      
                                      try {
                                        await setDoc(doc(db, "Permintaan kode", req.id), toFirestoreDoc(updatedReq));
                                      } catch (err) {
                                        console.error("Gagal memperbarui status di database:", err);
                                      }
                                    }}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                                      isActivated 
                                        ? "bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/30" 
                                        : "bg-emerald-500/20 hover:bg-emerald-600 text-emerald-400 hover:text-slate-950 border-emerald-500/30"
                                    }`}
                                    title={isActivated ? "Klik untuk Menonaktifkan Kode" : "Klik untuk Mengaktifkan Kode"}
                                  >
                                    {isActivated ? <Lock size={12} /> : <Unlock size={12} />}
                                    <span>{isActivated ? "Nonaktifkan" : "Aktifkan Kode"}</span>
                                  </button>

                                  <div className="grid grid-cols-2 gap-1.5">
                                    {/* Copy to clipboard */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(req.uniqueCode);
                                        setSuccessToast(`Kode ${req.uniqueCode} disalin!`);
                                      }}
                                      className="py-1.5 px-2 hover:bg-slate-800 text-[#93c5fd] hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-850"
                                      title="Salin Kode ke Clipboard"
                                    >
                                      <Copy size={11} /> Salin
                                    </button>

                                    {/* Delete Request */}
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setAppConfirm({
                                          isOpen: true,
                                          title: "Hapus Request Kode",
                                          subTitle: "TINDAKAN KENDALI ADMIN",
                                          message: `Apakah Anda yakin ingin menghapus request kode ${req.uniqueCode} milik ${req.teacherName}? Hubungan lisensi akan diputus secara permanen dari database cloud.`,
                                          confirmLabel: "Ya, Hapus",
                                          cancelLabel: "Batal",
                                          isDanger: true,
                                          onConfirm: async () => {
                                            // Close confirmation popup instantly!
                                            setAppConfirm(null);

                                            // Optimistic update
                                            setCodeRequests((prev) => prev.filter((r) => r.id !== req.id));
                                            setSuccessToast("Data request terhapus.");
                                            if (isThisReqActive) {
                                              setActiveCode("");
                                            }
                                            
                                            try {
                                              await deleteDoc(doc(db, "Permintaan kode", req.id));
                                            } catch (err) {
                                              console.error("Gagal menghapus data di database:", err);
                                            }
                                          }
                                        });
                                      }}
                                      className="py-1.5 px-2 hover:bg-rose-950 text-rose-450 hover:text-rose-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-850"
                                      title="Hapus Data Ini"
                                    >
                                      <Trash size={11} /> Hapus
                                    </button>
                                  </div>
                                  
                                  {/* Kirim WA - Action restricted to active codes by request */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isActivated) {
                                        alert("Peringatan: Kode akses belum diaktifkan oleh Admin. Aktifkan kode ini terlebih dahulu dengan mengeklik tombol 'Aktifkan Kode' di atas!");
                                        return;
                                      }
                                      
                                      // format phone properly: e.g. "0822..." -> "62822..."
                                      let cleanWA = req.whatsappNumber.replace(/\D/g, "");
                                      if (cleanWA.startsWith("0")) {
                                        cleanWA = "62" + cleanWA.slice(1);
                                      } else if (!cleanWA.startsWith("62")) {
                                        cleanWA = "62" + cleanWA;
                                      }
                                      
                                      const textMsg = `Bapak/Ibu Guru yang terhormat, terima kasih atas kepercayaan memilih Pelita Soal sebagai alat bantu dari bapak/ibu guru untuk membuat kisi-kisi dan naskah soal. Berikut adalah kode akses anda:\n\n*${req.uniqueCode}*\n\nSilahkan diaktifkan dalam aplikasi. Terima kasih.`;
                                      
                                      window.open(`https://wa.me/${cleanWA}?text=${encodeURIComponent(textMsg)}`, "_blank");
                                      setSuccessToast(`Mendireksi pesan WA ke ${req.teacherName}`);
                                    }}
                                    className={`py-2 px-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                                      isActivated 
                                        ? "bg-emerald-500/10 hover:bg-emerald-600 hover:text-slate-950 text-emerald-400 border-emerald-555/20 shadow-sm"
                                        : "bg-slate-900 text-slate-600 border-slate-850 cursor-not-allowed opacity-50"
                                    }`}
                                    title="Kirim Kode Aktivasi ke Guru Terdaftar via WhatsApp"
                                  >
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12.004 2C6.48 2 2 6.48 2 12c0 1.76.46 3.42 1.27 4.88l-1.21 4.43 4.54-1.19C7.99 20.73 9.9 22 12 22a10 10 0 0010-10c0-5.52-4.48-10-10-10zm5.66 14.19c-.25.7-.72 1.25-1.39 1.57-.45.21-1.03.38-2.58-.26-1.99-.82-3.15-2.86-3.25-3.01-.1-.13-.81-1.07-.81-2.04s.48-1.46.67-1.66c.16-.16.35-.2.48-.2h.33c.12 0 .27-.05.42.31.16.38.55 1.34.6 1.45.05.1.08.22.01.35-.07.13-.15.22-.24.33-.1.11-.2.22-.28.32-.09.11-.19.23-.08.43.11.2 1.47 2.41 3.16 3.48a14.21 14.21 0 001.21.68c.2.1.32.08.41-.01.09-.1.41-.48.52-.65.11-.17.22-.14.37-.09.15.05.95.45 1.11.53.16.08.27.12.31.19.04.07.04.4-.21 1.11z"/>
                                    </svg>
                                    Kirim WA
                                  </button>
                                  {isActivated && (
                                    <span className="text-[8.5px] text-emerald-500 font-semibold leading-relaxed block text-center mt-1 select-none">
                                      *Bebas kirim info via WA atau tidak, karena status kode langsung tersinkron aktif di akun user secara realtime.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
           {/* Tombol Navigasi Bawah */}
          {!generatingKisiKisi && !generatingSoal && (
            <div className="flex justify-between items-center bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 shadow-md">
              <button
                id="btn-nav-prev"
                type="button"
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                disabled={activeStep === 1}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 font-extrabold text-[11px] uppercase tracking-wider rounded-lg inline-flex items-center gap-1.5 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowLeft size={13} /> Kembali
              </button>

              {/* Hint Box */}
              <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <HelpCircle size={12} className="text-amber-500" />
                <span>
                  {activeStep === 1 && "Lengkapi data sekolah sebagai pembuka."}
                  {activeStep === 2 && "Tentukan mata pelajaran dan muat bahan ajar."}
                  {activeStep === 3 && "Tentukan model butir soal Anda."}
                  {activeStep === 4 && "Periksa kisi-kisi sebelum pindah ke cetak soal."}
                  {activeStep === 5 && "Naskah soal dan kunci telah selesai diproduksi!"}
                </span>
              </div>

              {activeStep < 5 ? (
                <button
                  id="btn-nav-next"
                  type="button"
                  onClick={() => {
                    if (activeStep === 2) {
                      if (fetchedData.length === 0) {
                        setErrorHeader("Silakan muat kurikulum & topik terlebih dahulu pada tombol Analisis CP berwarna kuning.");
                        return;
                      }
                      if (selectedTopics.length === 0) {
                        setErrorHeader("Silakan centang minimal satu materi pokok terlebih dahulu.");
                        return;
                      }
                    }
                    if (activeStep === 3 && kisiKisi.length === 0) {
                      setErrorHeader("Silakan susun Kisi-Kisi terlebih dahulu menggunakan tombol di atas.");
                      return;
                    }
                    if (activeStep === 4 && questions.length === 0) {
                      setErrorHeader("Silakan buat Naskah Soal terlebih dahulu menggunakan tombol di atas.");
                      return;
                    }
                    setErrorHeader(null);
                    setActiveStep((prev) => Math.min(5, prev + 1));
                  }}
                  disabled={
                    (activeStep === 3 && kisiKisi.length === 0) ||
                    (activeStep === 4 && questions.length === 0)
                  }
                  className={`px-5 py-2 transition-all rounded-lg inline-flex items-center gap-1.5 shadow-md active:scale-95 ${
                    ((activeStep === 3 && kisiKisi.length === 0) || (activeStep === 4 && questions.length === 0))
                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50 shadow-none"
                      : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-[11px] uppercase tracking-wider cursor-pointer hover:scale-[1.02]"
                  }`}
                >
                  Lanjutkan <ArrowRight size={13} />
                </button>
              ) : (
                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 bg-amber-950/20 px-3 py-1.5 rounded-lg border border-amber-500/30">
                  ⭐️ Penyusunan Selaras
                </div>
              )}
            </div>
          )}
            </div>
          )}
        </main>
      </div>

      {/* Footer Hak Cipta & Disclaimer */}
      <footer className="mt-auto px-6 py-4 bg-slate-950 border-t border-slate-900 text-center text-[10px] text-slate-500 font-light space-y-1 relative z-20">
        <p>&copy; 2026 Penyusun Soal Ujian Cerdas &bull; Berbasis Kurikulum Merdeka.</p>
      </footer>

      {/* SUCCESS TOAST NOTIFICATE OVERLAY */}
      {successToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[999] bg-slate-900 border-2 border-emerald-500 text-white shadow-[0_20px_50px_rgba(16,185,129,0.35)] px-6 py-4.5 rounded-2.5xl flex items-center gap-4 animate-in slide-in-from-top duration-300 w-[94vw] max-w-lg">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-lg shrink-0 shadow-lg animate-pulse">
            ✔
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[11.5px] uppercase tracking-wider text-emerald-400">
              {(() => {
                const msg = successToast.toLowerCase();
                if (msg.includes("bukti") || msg.includes("transfer") || msg.includes("pesan") || msg.includes("foto")) {
                  return "Pesan & Bukti Terbuka";
                }
                if (msg.includes("pengajuan") || msg.includes("informasikan") || msg.includes("register") || msg.includes("minta kode")) {
                  return "Pengajuan Kode Berhasil";
                }
                if (msg.includes("dinonaktifkan") || msg.includes("diaktifkan") || msg.includes("aktivasi")) {
                  return "Status Lisensi Diperbarui";
                }
                if (msg.includes("muat") || msg.includes("dimuat")) {
                  return "Paket Soal Dimuat";
                }
                if (msg.includes("dipasang") || msg.includes("pasang") || msg.includes("install")) {
                  return "Aplikasi Terpasang";
                }
                if (msg.includes("bank soal") || msg.includes("permanen") || msg.includes("disimpan")) {
                  return "Bank Soal Diperbarui";
                }
                return "Notifikasi Berhasil";
              })()}
            </p>
            <p className="text-[10.5px] font-semibold text-slate-200 mt-1.5 leading-snug break-words">{successToast}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessToast(null)} 
            className="text-slate-400 hover:text-white font-bold p-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs w-6 h-6 flex items-center justify-center shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* WARNING TOAST NOTIFICATE OVERLAY */}
      {warningToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[999] bg-slate-900 border-2 border-amber-500 text-white shadow-[0_20px_50px_rgba(245,158,11,0.35)] px-6 py-4.5 rounded-2.5xl flex items-center gap-4 animate-in slide-in-from-top duration-300 w-[94vw] max-w-lg">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-lg shrink-0 shadow-lg animate-pulse">
            ⚠️
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[11.5px] uppercase tracking-wider text-amber-400">Pemberitahuan Peringatan</p>
            <p className="text-[10.5px] font-semibold text-slate-200 mt-1.5 leading-snug break-words">{warningToast}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setWarningToast(null)} 
            className="text-slate-400 hover:text-white font-bold p-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs w-6 h-6 flex items-center justify-center shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* MENU PESAN & UNGGAH BUKTI TRANSFER MODAL OVERLAY */}
      {isMessageModalOpen && (
        <div id="message-proof-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 p-5 md:p-6 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-md shrink-0">
                  <MessageSquare size={20} className="stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-sm text-slate-100 uppercase tracking-widest leading-none">
                    KIRIM PESAN &amp; BUKTI TRANSFER
                  </h3>
                  <p className="text-[10px] text-blue-400 font-extrabold mt-1.5 uppercase leading-none">
                    VERIFIKASI AKTIVASI MANUAL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMessageModalOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg text-xs leading-none transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body with inputs scroll */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!messageForm.buktiTransfer) {
                  alert("Harap unggah bukti transfer pembayaran terlebih dahulu!");
                  return;
                }
                
                const trimmedCode = messageForm.uniqueCode.trim().toUpperCase();
                const trimmedTeacher = messageForm.teacherName.trim().toLowerCase();
                
                setIsSubmittingMessage(true);
                try {
                  let existingReq = null;
                  if (trimmedCode) {
                    existingReq = codeRequests.find(r => normalizeCode(r.uniqueCode) === normalizeCode(trimmedCode));
                  }
                  if (!existingReq && trimmedTeacher) {
                    existingReq = codeRequests.find(r => r.teacherName.trim().toLowerCase() === trimmedTeacher && !r.isActive);
                  }
                  
                  let finalRecord: any = null;
                  if (existingReq) {
                    finalRecord = { 
                      ...existingReq, 
                      buktiTransfer: messageForm.buktiTransfer, 
                      schoolName: messageForm.schoolName || existingReq.schoolName, 
                      teacherName: messageForm.teacherName || existingReq.teacherName 
                    };
                  } else {
                    const numbers = String(Math.floor(Math.random() * 90) + 10);
                    const randomChar = ["R", "A", "K", "I", "P"][Math.floor(Math.random() * 5)];
                    const code = trimmedCode || `GP-PS0${numbers}${randomChar}`;
                    finalRecord = {
                      id: "req-" + Date.now(),
                      schoolName: messageForm.schoolName || "SD Negeri Fatubai",
                      teacherName: messageForm.teacherName || "Natan Jordyson",
                      role: "Guru Kelas",
                      subject: "Bahasa Inggris",
                      whatsappNumber: "082200000000",
                      uniqueCode: code,
                      isActive: false, // Default false until admin clicks activate!
                      buktiTransfer: messageForm.buktiTransfer,
                      timestamp: new Date().toLocaleString("id-ID")
                    };
                  }
                  
                  // Await the write to guarantee save to cloud database
                  await setDoc(doc(db, "Permintaan kode", finalRecord.id), toFirestoreDoc(finalRecord));

                  // Update optimistic local state only after a successful cloud write
                  if (existingReq) {
                    setCodeRequests((prev) => prev.map((r) => r.id === existingReq.id ? finalRecord : r));
                  } else {
                    setCodeRequests((prev) => [finalRecord, ...prev]);
                  }
                  
                  setIsMessageModalOpen(false);
                  setSuccessToast("Bukti transfer berhasil terkirim ke Cloud Database! Silakan buka kembali aplikasi Pelita Soal secara berkala untuk mengecek keaktifan kode akses Anda (Admin tidak wajib membalas via WhatsApp).");
                } catch (err: any) {
                  console.error("Gagal mengirim bukti transfer ke Firestore:", err);
                  alert("Gagal mengirim bukti transfer ke server: " + (err.message || err) + ". Hubungi Admin atau silakan periksa koneksi internet Anda.");
                } finally {
                  setIsSubmittingMessage(false);
                }
              }} 
              className="p-5 md:p-6 overflow-y-auto space-y-4 text-left flex-1 max-h-[60vh] scrollbar-thin"
            >
              
              {/* Payment Info Warn message */}
              <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 text-sky-200 text-[11px] rounded-xl leading-relaxed font-semibold">
                ℹ️ <strong className="text-sky-300">INFO TRANSFER PEMBAYARAN:</strong>
                <p className="mt-1">
                  Biaya aktivasi lisensi resmi adalah <strong className="text-white">Rp. 20.000,- (Dua Puluh Ribu Rupiah)</strong> dikirimkan ke:
                </p>
                <div className="mt-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-0.5 font-mono text-[10.5px]">
                  <div>Bank: <strong className="text-slate-100">Bank BRI (Bank Rakyat Indonesia)</strong></div>
                  <div>No Rekening: <strong className="text-emerald-400 font-extrabold select-all px-1.5 py-0.5 bg-slate-900 rounded">4668 0101 4250 500</strong></div>
                  <div>Atas Nama: <strong className="text-slate-100">Roni Hariyanto Bhidju</strong></div>
                </div>
              </div>

              {/* School Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#93c5fd] uppercase tracking-wider block">
                  Nama Sekolah <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: SD Negeri Nusantara"
                  value={messageForm.schoolName}
                  onChange={(e) => setMessageForm({ ...messageForm, schoolName: e.target.value })}
                  className="w-full bg-slate-950/70 border border-slate-800 hover:border-slate-750 focus:border-blue-500/50 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl font-semibold outline-none transition-all placeholder:text-slate-700"
                />
              </div>

              {/* Teacher Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#93c5fd] uppercase tracking-wider block">
                  Nama Guru Pelapor <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: NATAN JORDYSON BHIGJU"
                  value={messageForm.teacherName}
                  onChange={(e) => setMessageForm({ ...messageForm, teacherName: e.target.value })}
                  className="w-full bg-slate-950/70 border border-slate-800 hover:border-slate-750 focus:border-blue-500/50 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl font-semibold outline-none transition-all placeholder:text-slate-700"
                />
              </div>

              {/* Kode Akses (Optional / Exact Match) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#93c5fd] uppercase tracking-wider block">
                  KODE AKSES YANG AKAN DIAKTIFKAN <span className="text-slate-500">(Opsional)</span>
                </label>
                <input 
                  type="text"
                  placeholder="Contoh: GP-PS145R (Kosongkan jika ingin dibuatkan baru)"
                  value={messageForm.uniqueCode}
                  onChange={(e) => setMessageForm({ ...messageForm, uniqueCode: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950/70 border border-slate-800 hover:border-slate-750 focus:border-blue-500/50 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl font-bold font-mono outline-none transition-all placeholder:text-slate-700"
                />
              </div>

              {/* Unggah Bukti File Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#93c5fd] uppercase tracking-wider block">
                  UNGGAH FOTO BUKTI TRANSFER PEMBAYARAN <span className="text-rose-500">*</span>
                </label>
                
                <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/40 rounded-2xl p-6 transition-all bg-slate-950/40 focus-within:border-blue-500/50 relative flex flex-col items-center justify-center text-center min-h-[140px] cursor-pointer">
                  <input 
                    type="file" 
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png" 
                    required={!messageForm.buktiTransfer}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const fileExt = file.name.split('.').pop()?.toLowerCase();
                        const allowedExts = ['jpg', 'jpeg', 'png'];
                        const allowedMimes = ['image/jpeg', 'image/png'];
                        if (!allowedExts.includes(fileExt || '') && !allowedMimes.includes(file.type)) {
                          alert("Format file tidak didukung! Bukti transfer hanya diperbolehkan berupa file gambar JPG/PNG.");
                          e.target.value = ""; // Reset file input
                          return;
                        }
                        try {
                          const compressedBase64 = await compressImageFile(file, 800, 0.7);
                          setMessageForm(prev => ({ ...prev, buktiTransfer: compressedBase64 }));
                          setSuccessToast("Foto bukti transfer berhasil dimuat dan dikompresi!");
                        } catch (err) {
                          console.error("Gagal melakukan kompresi gambar:", err);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setMessageForm(prev => ({ ...prev, buktiTransfer: reader.result as string }));
                            setSuccessToast("Foto bukti transfer berhasil dimuat!");
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                  />
                  {messageForm.buktiTransfer ? (
                    <div className="space-y-2.5 z-10 pointer-events-none">
                      <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest block bg-emerald-950/40 border border-emerald-900/60 px-2 py-1 rounded mx-auto w-fit">
                        ✨ BUKTI BERHASIL DIMUAT
                      </span>
                      <img src={messageForm.buktiTransfer} alt="Ulasan Bukti" className="h-24 max-w-[200px] object-contain mx-auto rounded-lg border border-slate-750 bg-slate-900/80 p-0.5 shadow-md" />
                      <p className="text-[9.5px] text-slate-500 font-bold">Ganti file dengan menyeret gambar lain atau mengeklik area ini</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pointer-events-none">
                      <Upload size={24} className="text-slate-600 mx-auto animate-pulse" />
                      <p className="text-xs text-slate-400 font-bold">Klik atau seret foto bukti transfer Anda ke sini</p>
                      <p className="text-[10px] text-slate-500">Mendukung format PNG, JPG, JPEG (Maks. 5 MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* REMINDER BOX (Requested by user) */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/35 text-amber-200 text-xs rounded-2xl leading-relaxed space-y-1.5 shadow-inner">
                <p className="font-black text-amber-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  🔔 CATATAN PENTING UNTUK USER:
                </p>
                <p className="text-[11px] text-slate-200 font-semibold leading-normal">
                  Pihak <strong className="text-white font-black">Admin Guru Pelosok TIDAK WAJIB atau tidak perlu mengirimkan balasan pesan via WhatsApp</strong> jika kode akses Anda telah diaktifkan di sistem.
                </p>
                <p className="text-[11px] text-amber-300 font-bold leading-normal pt-1">
                  Setelah mengirimkan bukti transfer di bawah, silakan buka kembali aplikasi Pelita Soal ini secara berkala, lalu masukkan kode akses Anda di menu bagian atas untuk mengecek apakah status lisensi kode Anda sudah otomatis AKTIF!
                </p>
              </div>

              {/* Submit triggers */}
              <div className="pt-4 flex items-center justify-end gap-3.5 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(false)}
                  className="px-4 py-2 text-xs font-black hover:text-white uppercase tracking-wider border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMessage}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingMessage ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> MENGIRIM...
                    </>
                  ) : (
                    "KIRIM BUKTI TRANSFER"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP QUESTIONNAIRE MODAL OVERLAY */}
      {isWaModalOpen && (
        <div id="wa-form-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 p-5 md:p-6 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-md shrink-0">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.1 1.458 4.8 1.458 5.65.003 10.25-4.6 10.25-10.247 0-2.737-1.06-5.31-2.99-7.24a10.15 10.15 0 0 0-7.25-3C5.66.125 1.06 4.7 1.06 10.35c0 1.8.48 3.3 1.44 4.8l-1 3.6 3.7-1v-.004zm11.37-6.425c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15s-.77.98-.95 1.18c-.17.2-.35.22-.65.07-1.15-.58-1.92-1.03-2.67-2.33-.2-.35-.02-.54.15-.7.15-.15.3-.35.45-.5.15-.15.2-.25.3-.45s.05-.38-.02-.53c-.07-.15-.68-1.63-.93-2.24-.25-.6-.52-.5-.68-.5-.18 0-.38-.02-.58-.02s-.52.07-.8.37c-.27.3-1.05 1.03-1.05 2.5 0 1.48 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.5.7.3 1.27.5 1.7.63.73.22 1.4.2 1.9.1.58-.08 1.77-.73 2.02-1.4.25-.68.25-1.25.17-1.38-.08-.13-.3-.2-.6-.35z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-black text-sm text-slate-100 uppercase tracking-widest leading-none">
                    FORM REQUEST KODE
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-extrabold mt-1.5 uppercase leading-none">
                    GURU PELOSOK VERIFIED
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWaModalOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg text-xs leading-none transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body with inputs scroll */}
            <form onSubmit={(e) => { e.preventDefault(); setShowSubmittingConfirm(true); }} className="p-5 md:p-6 overflow-y-auto space-y-4 text-left flex-1 max-h-[60vh] scrollbar-thin">
              
              {/* Mandatory Info Warn message */}
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs rounded-xl leading-relaxed font-extrabold text-center uppercase tracking-wide">
                ⚠️ LENGKAPI DATA DENGAN CERMAT, KESALAHAN INPUT NAMA JADI TANGGUNG JAWAB PRIBADI!
              </div>

              {/* School Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#93c5fd] uppercase tracking-wider block">
                  Nama Sekolah Anda <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: SD Makanan Bergizi Gratis"
                  value={waForm.schoolName}
                  onChange={(e) => setWaForm({ ...waForm, schoolName: e.target.value })}
                  className="w-full bg-slate-950/70 border border-slate-800 hover:border-slate-750 focus:border-blue-500/50 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl font-semibold outline-none transition-all placeholder:text-slate-705"
                />
              </div>

              {/* Teacher Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#93c5fd] uppercase tracking-wider block">
                  Nama Guru Lengkap beserta Gelar Akademik <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: Ghea Gavriella, S.Pdf., MBG"
                  value={waForm.teacherName}
                  onChange={(e) => setWaForm({ ...waForm, teacherName: e.target.value })}
                  className="w-full bg-slate-950/70 border border-slate-800 hover:border-slate-750 focus:border-blue-500/50 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl font-semibold outline-none transition-all placeholder:text-slate-705"
                />
                <p className="text-[9.5px] text-[#93c5fd]/80 italic font-black leading-tight mt-1">
                  ⚠️ SARAN: Gunakan huruf besar di awal kata saja (contoh: Ghea Gavriella, S.Pdf., MBG). Mohon tidak mengetik menggunakan huruf KAPITAL SEMUA!
                </p>
                <p className="text-[9px] text-slate-500 italic font-bold">Pastikan tidak ada salah ketik gelar agar sertifikat/lembaran ujian resmi sepadan.</p>
              </div>

              {/* Teacher Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#93c5fd] uppercase tracking-wider block">
                  Peran / Tugas Mengajar <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWaForm({ ...waForm, role: "Guru Kelas", subjectType: "Matematika" })}
                    className={`px-4 py-2.5 text-xs font-black rounded-xl border transition-all text-center cursor-pointer ${
                      waForm.role === "Guru Kelas"
                        ? "bg-slate-950 border-amber-500/80 text-amber-400"
                        : "bg-slate-950/30 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-350"
                    }`}
                  >
                    👩‍🏫 Guru Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaForm({ ...waForm, role: "Guru Mata Pelajaran", subjectType: "Bahasa Inggris" })}
                    className={`px-4 py-2.5 text-xs font-black rounded-xl border transition-all text-center cursor-pointer ${
                      waForm.role === "Guru Mata Pelajaran"
                        ? "bg-slate-950 border-amber-500/80 text-amber-400"
                        : "bg-slate-950/30 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-350"
                    }`}
                  >
                    🎨 Guru Mapel
                  </button>
                </div>
              </div>

              {/* Class Selection - Only if Guru Kelas is selected */}
              {waForm.role === "Guru Kelas" && (
                <div className="space-y-1.5 border-l-2 border-blue-500/40 pl-3.5 mt-2 animate-in slide-in-from-left duration-250">
                  <label className="text-[9.5px] font-black text-[#93c5fd] uppercase tracking-wider block">
                    Pilih Tingkatan Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={waForm.gradeClass}
                    onChange={(e) => setWaForm({ ...waForm, gradeClass: e.target.value })}
                    className="w-full bg-slate-950 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-blue-500/50 font-bold outline-none cursor-pointer"
                  >
                    <option value="Kelas 1">Kelas 1</option>
                    <option value="Kelas 2">Kelas 2</option>
                    <option value="Kelas 3">Kelas 3</option>
                    <option value="Kelas 4">Kelas 4</option>
                    <option value="Kelas 5">Kelas 5</option>
                    <option value="Kelas 6">Kelas 6</option>
                  </select>
                </div>
              )}

              {/* Subject dropdown - Only shown for Guru Mata Pelajaran */}
              {waForm.role === "Guru Mata Pelajaran" && (
                <div className="space-y-1.5 border-l-2 border-emerald-500/40 pl-3.5 mt-2 animate-in slide-in-from-left duration-250">
                  <label className="text-[9.5px] font-black text-emerald-400 uppercase tracking-wider block">
                    Pilih Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select
                      value={waForm.subjectType}
                      onChange={(e) => {
                        const newSub = e.target.value;
                        setWaForm({ 
                          ...waForm, 
                          subjectType: newSub,
                          religionType: newSub === "Agama" ? "Pendidikan Agama Islam" : waForm.religionType
                        });
                      }}
                      className="w-full bg-slate-950 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-emerald-500/50 font-bold outline-none cursor-pointer"
                    >
                      <option value="Bahasa Inggris">Bahasa Inggris</option>
                      <option value="PJOK">PJOK</option>
                      <option value="Agama">Agama</option>
                    </select>

                    {/* Sub religion selection if Agama category is selected */}
                    {waForm.subjectType === "Agama" && (
                      <div className="animate-in slide-in-from-top duration-200">
                        <select
                          value={waForm.religionType}
                          onChange={(e) => setWaForm({ ...waForm, religionType: e.target.value })}
                          className="w-full bg-slate-950 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-emerald-500/50 font-bold outline-none cursor-pointer"
                        >
                          <option value="Pendidikan Agama Islam">Pendidikan Agama Islam</option>
                          <option value="Pendidikan Agama Kristen">Pendidikan Agama Kristen</option>
                          <option value="Pendidikan Agama Katolik">Pendidikan Agama Katolik</option>
                          <option value="Pendidikan Agama Hindu">Pendidikan Agama Hindu</option>
                          <option value="Pendidikan Agama Buddha">Pendidikan Agama Buddha</option>
                          <option value="Pendidikan Agama Khonghucu">Pendidikan Agama Khonghucu</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* WhatsApp Number with clear request instructions */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#93c5fd] uppercase tracking-wider block">
                  LENGKAPI NOMOR WHATSAPP AKTIF ANDA <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-600 font-black font-mono select-none">+62</span>
                  <input 
                    type="tel"
                    required
                    placeholder="Contoh: 082000100211"
                    value={waForm.whatsappNumber}
                    onChange={(e) => setWaForm({ ...waForm, whatsappNumber: e.target.value.replace(/\D/g, "") })}
                    className="w-full bg-slate-950/70 border border-slate-800 hover:border-slate-750 focus:border-blue-500/50 text-slate-150 text-xs pl-12 pr-3.5 py-2.5 rounded-xl font-bold font-mono outline-none transition-all placeholder:text-slate-705"
                  />
                </div>
                <div className="bg-slate-950/80 border border-amber-500/30 p-3 rounded-xl space-y-1.5 shadow-inner">
                  <p className="text-[10px] text-amber-400 font-black leading-normal uppercase tracking-wider flex items-center gap-1.5">
                    ⚠️ INFORMASI PENTING SEBELUM MENGIRIM
                  </p>
                  <p className="text-[11px] text-slate-100 font-medium leading-relaxed">
                    Pastikan nomor WhatsApp Anda ditulis dengan lengkap dan benar untuk mempermudah Admin mengirimkan kode aktivasi Anda. 
                  </p>
                  <p className="text-[11.5px] text-slate-100 font-semibold leading-relaxed pt-1 border-t border-slate-800/60">
                    Silakan kirim bukti transfer (Rp. 20.000 ke nomor rekening <strong className="text-amber-400 font-extrabold underline decoration-amber-400/30">4668 0101 4250 500</strong> atas nama <strong className="text-amber-400 font-extrabold">Roni Hariyanto Bhidju (Bank BRI)</strong>). 
                  </p>
                  <p className="text-[11.5px] text-emerald-400 font-bold bg-emerald-950/30 px-2 py-1.5 rounded border border-emerald-500/20 mt-1">
                    Jika telah berhasil, kirim bukti melalui Menu <span className="underline font-extrabold decoration-emerald-400/40">PESAN & KIRIM BUKTI</span>. Terima kasih.
                  </p>
                </div>
              </div>

              {/* Submit trigger button */}
              <div className="pt-4 flex items-center justify-end gap-3.5 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsWaModalOpen(false)}
                  className="px-4 py-2 text-xs font-black hover:text-white uppercase tracking-wider border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer transition-transform active:scale-95"
                >
                  KIRIM PENGAJUAN DATA SEKARANG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION SUBMISSION DIALOG WINDOW overlay */}
      {showSubmittingConfirm && (
        <div id="wa-form-confirm-popup" className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xs animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-amber-500/25 rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto text-xl animate-bounce">
              ⚠️
            </div>
            
            <h4 className="font-extrabold text-sm text-slate-100 uppercase tracking-widest leading-none font-sans">KONFIRMASI DATA</h4>
            <div className="text-xs text-slate-300 leading-relaxed font-semibold">
              <p>Apakah Anda sudah memeriksa penulisan <strong className="text-slate-100">Nama Lengkap &amp; Gelar Akademik</strong> Guru dengan teliti?</p>
              <div className="mt-2 text-slate-150 bg-slate-950/70 p-3.5 rounded-xl border border-amber-500/30 text-left space-y-2 text-[11.5px]">
                <p className="font-black text-amber-400">Bapak/Ibu Guru yang terhormat,</p>
                <p className="leading-normal">
                  Silakan kirim bukti transfer (Rp. 20.000 ke nomor rekening <strong className="text-amber-400 font-extrabold select-all underline decoration-amber-400/30">4668 0101 4250 500</strong> atas nama <strong className="text-amber-400 font-extrabold">Roni Hariyanto Bhidju (Bank BRI)</strong>).
                </p>
                <p className="text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded border border-emerald-500/20 leading-relaxed">
                  Jika telah berhasil, kirim bukti melalui Menu <span className="underline font-extrabold decoration-emerald-400/40">PESAN & KIRIM BUKTI</span>. Terima kasih.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowSubmittingConfirm(false)}
                className="px-4 py-2 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cek Lagi
              </button>
              <button
                type="button"
                disabled={isSubmittingWa}
                onClick={async () => {
                  // Final submission routine
                  const cleanWA = waForm.whatsappNumber.startsWith("0") 
                    ? waForm.whatsappNumber.slice(1) 
                    : waForm.whatsappNumber.startsWith("62") 
                    ? waForm.whatsappNumber.slice(2) 
                    : waForm.whatsappNumber;

                  // Determine chosen subject
                  let activeSub = "Semua Mapel Utama";
                  if (waForm.role === "Guru Mata Pelajaran") {
                    if (waForm.subjectType === "Agama") {
                      activeSub = waForm.religionType;
                    } else {
                      activeSub = waForm.subjectType;
                    }
                  }

                  // Generate Unique activation code GP-PS012R
                  const numbers = String(Math.floor(Math.random() * 90) + 10);
                  const randomChar = ["R", "A", "K", "I", "P"][Math.floor(Math.random() * 5)];
                  const code = `GP-PS0${numbers}${randomChar}`;

                  const newRecord: any = {
                    id: "req-" + Date.now(),
                    schoolName: waForm.schoolName,
                    teacherName: waForm.teacherName,
                    role: waForm.role,
                    subject: activeSub,
                    gradeClass: waForm.gradeClass || "Kelas 4",
                    whatsappNumber: "0" + cleanWA,
                    uniqueCode: code,
                    isActive: false, // Starts strictly as FALSE (trial/unactivated) until Admin toggles it ON!
                    timestamp: new Date().toLocaleString("id-ID")
                  };

                  setIsSubmittingWa(true);
                  try {
                    // Await Firestore Cloud write first to secure the record!
                    await setDoc(doc(db, "Permintaan kode", newRecord.id), toFirestoreDoc(newRecord));

                    // 1b. Update real-time state
                    setCodeRequests((prev) => {
                      if (prev.some(r => r.id === newRecord.id)) return prev;
                      return [newRecord, ...prev];
                    });

                    // 1c. Automatically pre-fill the Message & Proof Form with these exact requested details!
                    setMessageForm({
                      schoolName: newRecord.schoolName,
                      teacherName: newRecord.teacherName,
                      uniqueCode: newRecord.uniqueCode,
                      buktiTransfer: ""
                    });

                    // 2. Clear Wa Blink alarm permanently
                    localStorage.setItem("ttu_wa_alert_dismissed", "true");
                    localStorage.setItem("ttu_has_submitted_request", "true");
                    setWaAlert(false);

                    // 3. Close Modals immediately
                    setShowSubmittingConfirm(false);
                    setIsWaModalOpen(false);

                    // 4. Trigger success toast
                    setSuccessToast(`Pengajuan Berhasil! Data direkam di Cloud Database. Informasikan pada Admin untuk mengaktifkan kode: ${code}`);
                  } catch (err: any) {
                    console.error("Gagal menyimpan pengajuan di Cloud Firestore:", err);
                    alert("Gagal mengirim data pengajuan ke server: " + (err.message || err) + ". Silakan periksa koneksi internet Anda atau coba lagi.");
                  } finally {
                    setIsSubmittingWa(false);
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isSubmittingWa ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Mengirim...
                  </>
                ) : (
                  "Ya, Kirim Data!"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isResetConfirmOpen && (
        <div id="reset-workspace-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden text-left">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-md">
                <RotateCcw size={24} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-100 uppercase tracking-wider leading-none">
                  Konfirmasi Reset
                </h3>
                <p className="text-[10px] text-rose-400 font-extrabold mt-1.5 uppercase leading-none tracking-widest">
                  Mengosongkan Workspace
                </p>
              </div>
            </div>

            {/* Warning body */}
            <p className="text-slate-300 text-xs leading-relaxed font-bold mb-4">
              Apakah Anda yakin ingin meriset workspace? Tindakan ini bersifat permanen dan akan menghapus semua draf aktif berikut:
            </p>
            
            <ul className="space-y-2 mb-6 bg-slate-950/40 border border-slate-850 p-3.5 rounded-xl text-[11px] font-semibold text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-rose-500">❌</span> Kisi-Kisi Ujian Terbuat
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-500">❌</span> Naskah Soal &amp; Kunci Jawaban
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-500">❌</span> Bobot &amp; Pedoman Penskoran Guru
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Riwayat Kode Akses &amp; Profil Sekolah Tetap Tersimpan
              </li>
            </ul>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md shadow-rose-950/20 active:scale-95 transition-all"
              >
                Ya, Riset Sekarang!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA MANUAL INSTALLATION GUIDE MODAL */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl w-full max-w-lg p-5 md:p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-blue-400 to-indigo-600"></div>
            
            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-all cursor-pointer focus:outline-none"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/25 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-laptop">
                  <polygon points="12 17 12 17 12 17 12 17"/>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <path d="M22 17v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight">
                  PANDUAN PEMASANGAN LAPTOP
                </h3>
                <p className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider">
                  Ikuti langkah mudah di Chrome / Edge
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Pemasangan aplikasi laptop instan 5 detik, tanpa download file installer (.exe). Ikuti cara berikut sesuai browser Anda:
              </p>

              {/* Steps List */}
              <div className="bg-slate-950/80 border border-slate-800/85 rounded-2xl p-4 space-y-3.5">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-[11px] shrink-0 select-none">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-250">Cari Bilah Alamat Browser</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Sorot ke pojok kanan bilah alamat URL (Address Bar) browser Anda di bagian atas laptop.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-[11px] shrink-0 select-none">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-250">Temukan Ikon Pasang / Install</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Klik ikon bermodel <strong className="text-indigo-400 font-bold font-semibold">"Monitor dengan panah bawah"</strong> (Install Pelita Soal) atau ketuk menu titik tiga browser lalu pilih <strong className="text-slate-300">"Simpan & bagikan &gt; Pasang halaman ini sebagai aplikasi"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-[11px] shrink-0 select-none">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-250">Konfirmasi Install</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Klik tombol <strong className="text-amber-405 font-bold font-semibold">"Install" / "Pasang"</strong> pada opsi popup browser. Aplikasi akan berdiri sendiri sebagai window aplikasi profesional di laptop Anda!
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefit Strip */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-start gap-2.5">
                <span className="text-sm select-none shrink-0">✓</span>
                <p className="text-[10.5px] text-emerald-400 leading-normal font-semibold">
                  Selesai! Aplikasi siap diakses offline kapan saja langsung melalui pintasan ikon desktop laptop Anda tanpa khawatir koneksi internet terputus di area pelosok.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-5 border-t border-slate-800/80 pt-4 select-none">
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="px-4 py-2 bg-indigo-900/40 hover:bg-slate-800 border-2 border-indigo-500/20 text-white text-[10px] font-black rounded-xl uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
              >
                Dipahami, Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM APP CONFIRM MODAL */}
      {appConfirm && appConfirm.isOpen && (
        <div id="custom-app-confirm-modal" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-slate-850 rounded-3xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden text-left animate-in zoom-in-95 duration-200">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-blue-400 to-indigo-600"></div>
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                appConfirm.isDanger 
                  ? "bg-rose-500/10 border border-rose-500/20 text-rose-500" 
                  : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
              }`}>
                {appConfirm.isDanger ? <Trash size={24} className="stroke-[2.5]" /> : <FolderOpen size={24} className="stroke-[2.5]" />}
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-100 uppercase tracking-wider leading-none">
                  {appConfirm.title}
                </h3>
                {appConfirm.subTitle && (
                  <p className={`text-[10px] font-extrabold mt-1.5 uppercase leading-none tracking-widest ${
                    appConfirm.isDanger ? "text-rose-400" : "text-amber-500"
                  }`}>
                    {appConfirm.subTitle}
                  </p>
                )}
              </div>
            </div>

            {/* Content Message */}
            <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-xl text-xs font-semibold text-slate-300 leading-relaxed mb-6">
              {appConfirm.message}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setAppConfirm(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
              >
                {appConfirm.cancelLabel}
              </button>
              <button
                type="button"
                onClick={appConfirm.onConfirm}
                className={`px-4.5 py-2.5 text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md active:scale-95 transition-all ${
                  appConfirm.isDanger 
                    ? "bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 shadow-rose-950/20" 
                    : "bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 shadow-indigo-950/20"
                }`}
              >
                {appConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
