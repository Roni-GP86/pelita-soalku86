import { FALLBACK_CURRICULUMS, generateFallbackKisiKisi, generateFallbackSoal } from "../../server-fallback";

// === LOGICAL COPIES VALUE PRESERVING CORE FUNCTIONS ===

export function cleanMateri(materiStr: string): string {
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
}

export function cleanKisiKisiAnswerKey(answerKey: string, questionType: string, index: number): string {
  const cleanType = (questionType || "").trim().toLowerCase();
  
  if (cleanType === "pilihan ganda") {
    const letters = ["A", "B", "C", "D"];
    const seed = Math.sin((index + 13) * 37.89) * 10000;
    const randIdx = Math.floor((seed - Math.floor(seed)) * 4);
    return letters[randIdx];
  }
  
  return (answerKey || "").trim();
}

export function alignKisiKisiWithCurriculum(kisiRows: any[], curriculumData: any[]): any[] {
  if (!curriculumData || !Array.isArray(curriculumData) || curriculumData.length === 0) {
    return kisiRows;
  }

  const officialMateriList: { clean: string; original: string; element: string; cp: string }[] = [];

  curriculumData.forEach((elItem: any) => {
    const cpText = elItem.cp || "";
    const elName = elItem.element || "";
    if (Array.isArray(elItem.topics)) {
      elItem.topics.forEach((topicItem: any) => {
        if (Array.isArray(topicItem.materi)) {
          topicItem.materi.forEach((m: string) => {
            if (m) {
              officialMateriList.push({
                clean: cleanMateri(m).toLowerCase().replace(/[^a-z0-9]/g, ""),
                original: m,
                element: elName,
                cp: cpText
              });
            }
          });
        }
      });
    }
  });

  return kisiRows.map((row: any) => {
    if (!row) return row;
    const cleanRowMateri = cleanMateri(row.materi || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    let bestMatch = officialMateriList.find(item => item.clean === cleanRowMateri);

    if (!bestMatch) {
      bestMatch = officialMateriList.find(item => 
        item.clean.includes(cleanRowMateri) || cleanRowMateri.includes(item.clean)
      );
    }

    if (bestMatch) {
      return {
        ...row,
        element: bestMatch.element,
        cp: bestMatch.cp
      };
    } else {
      if (officialMateriList.length > 0) {
        return {
          ...row,
          element: officialMateriList[0].element,
          cp: officialMateriList[0].cp
        };
      }
    }

    return row;
  });
}

export function alignQuestionsWithKisiKisiAnswerKeys(questions: any[], kisiKisi: any[]): any[] {
  if (!questions || questions.length === 0 || !kisiKisi || kisiKisi.length === 0) {
    return questions;
  }

  return questions.map((q, idx) => {
    if (!q || q.questionType !== "Pilihan Ganda" || !q.options || q.options.length === 0) {
      return q;
    }

    const kisiItem = kisiKisi[idx];
    if (!kisiItem) {
      return q;
    }

    let targetAnswerLetter = (kisiItem.answerKey || "").trim().toUpperCase();
    const letters = ["A", "B", "C", "D"];

    if (!targetAnswerLetter || !letters.includes(targetAnswerLetter)) {
      const seed = Math.sin((idx + 17) * 23.41) * 10000;
      const randIdx = Math.floor((seed - Math.floor(seed)) * 4);
      targetAnswerLetter = letters[randIdx];
      kisiItem.answerKey = targetAnswerLetter;
    }

    const targetIdx = letters.indexOf(targetAnswerLetter);
    const cleanKey = (q.answerKey || "").trim().toUpperCase();
    let correctIdx = -1;
    const opts = [...q.options];

    if (/^[A-D](\.|$)/.test(cleanKey)) {
      correctIdx = cleanKey.charCodeAt(0) - 65;
    } else {
      const keyLower = cleanKey.toLowerCase();
      if (keyLower === "a" || keyLower === "0") correctIdx = 0;
      else if (keyLower === "b" || keyLower === "1") correctIdx = 1;
      else if (keyLower === "c" || keyLower === "2") correctIdx = 2;
      else if (keyLower === "d" || keyLower === "3") correctIdx = 3;
      else {
        for (let i = 0; i < opts.length; i++) {
          const optClean = opts[i].replace(/^[a-dA-D][.\s)]+/, "").trim().toLowerCase();
          if (optClean === keyLower || opts[i].toLowerCase().includes(keyLower)) {
            correctIdx = i;
            break;
          }
        }
      }
    }

    if (correctIdx === -1) {
      correctIdx = 0;
    }

    const cleanOptsContent = opts.map(opt => opt.replace(/^[a-dA-D][.\s)]+/, "").trim());
    const correctText = cleanOptsContent[correctIdx] || "";
    const incorrectTexts = cleanOptsContent.filter((_, i) => i !== correctIdx);

    const shuffledIncorrects = [...incorrectTexts];
    // Seeded deterministic random shuffle based on idx and question content hash to respect data integrity
    let stringHash = 0;
    const qStr = (q.questionText || "") + " " + correctText;
    for (let c = 0; c < qStr.length; c++) {
      stringHash = (stringHash << 5) - stringHash + qStr.charCodeAt(c);
      stringHash = stringHash & stringHash;
    }
    let seed = Math.abs(stringHash) || (idx + 133);
    for (let i = shuffledIncorrects.length - 1; i > 0; i--) {
      seed = Math.sin(seed + i) * 10000;
      const r = seed - Math.floor(seed);
      const j = Math.floor(r * (i + 1));
      const temp = shuffledIncorrects[i];
      shuffledIncorrects[i] = shuffledIncorrects[j];
      shuffledIncorrects[j] = temp;
    }

    const shuffledContent: string[] = [];
    let incIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === targetIdx) {
        shuffledContent.push(correctText);
      } else {
        shuffledContent.push(shuffledIncorrects[incIdx] || `Pilihan ${letters[i]}`);
        incIdx++;
      }
    }

    const finalOpts = shuffledContent.map((text, oIdx) => `${letters[oIdx]}. ${text}`);

    return {
      ...q,
      options: finalOpts,
      answerKey: finalOpts[targetIdx]
    };
  });
}

export function findAndFixDuplicateQuestions(questions: any[], subject: string): any[] {
  const seenTexts = new Set<string>();
  const seenOptions = new Set<string>();
  const indonesianNames = ["Siti", "Edo", "Lani", "Udin", "Beni", "Dayu", "Meli", "Ahmad", "Sari", "Rian", "Gita", "Tono", "Wati", "Made", "Ketut", "Ayu", "Putu", "Nengah", "Gede"];

  return questions.map((q, idx) => {
    if (!q) return q;

    const baseText = (q.questionText || "").trim();
    const textKey = baseText.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const stimulus = q.stimulusText || q.stimulus || "";
    const fullTextKey = (stimulus + " " + (q.questionText || "")).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

    let optsKey = "";
    if (q.options && q.options.length > 0) {
      optsKey = [...q.options].map(opt => opt.replace(/^[A-DA-D][.\s)]+/, "").trim().toLowerCase()).sort().join("|").replace(/[^a-z0-9]/g, "");
    }

    const isDuplicateText = seenTexts.has(textKey) || (fullTextKey.length > 10 && seenTexts.has(fullTextKey));
    const isDuplicateOptions = optsKey.length > 0 && seenOptions.has(optsKey);

    if (isDuplicateText || isDuplicateOptions) {
      const mutated = { ...q };

      const randomName = indonesianNames[idx % indonesianNames.length];
      const alternateName = indonesianNames[(idx + 4) % indonesianNames.length];

      if (mutated.stimulusText) {
        mutated.stimulusText = mutated.stimulusText
          .replace(/Andi|Budi|Cici|Dedi|Evi|Fandi/g, randomName)
          .replace(/Andi/g, randomName)
          .replace(/Budi/g, alternateName);
      }
      mutated.questionText = mutated.questionText
        .replace(/Andi|Budi|Cici|Dedi|Evi|Fandi/g, randomName)
        .replace(/Andi/g, randomName)
        .replace(/Budi/g, alternateName);

      const isMath = (subject || "").toLowerCase().includes("matematik");
      if (isMath) {
        const materiLower = (mutated.materi || "").toLowerCase();
        if (materiLower.includes("pecahan") || baseText.includes("/") || baseText.toLowerCase().includes("pecah")) {
          const variations = [
            {
              stim: `Rian membawa martabak telur bundar untuk cemilan bersama dua orang sahabatnya. Martabak tersebut secara presisi dipotong menjadi 6 bagian yang sama besar. Kelompok mereka memakan 3 bagian martabak tersebut.`,
              q: `Nyatakan potongan martabak telur yang telah dimakan oleh kelompok Rian tersebut dalam bentuk pecahan paling sederhana!`,
              opts: ["A. 1/2", "B. 1/3", "C. 2/3", "D. 3/4"],
              key: "a",
              exp: "Jumlah potongan yang dimakan adalah 3 dari total 6 bagian, dapat ditulis 3/6. Pecahan 3/6 disederhanakan dengan membagi pembilang dan penyebut masing-masing dengan 3, sehingga diperoleh nilai pecahan paling sederhana yaitu 1/2."
            },
            {
              stim: `Made membeli pizza berukuran besar di pusat makanan. Pizza tersebut dipotong sama rata menjadi 8 potongan. Made memakan 2 bagian pizza dan adiknya memakan 2 bagian pizza.`,
              q: `Berapakah nilai pecahan yang melambangkan sisa potongan pizza Made yang belum dimakan?`,
              opts: ["A. 1/2", "B. 1/4", "C. 3/8", "D. 5/8"],
              key: "a",
              exp: "Jumlah pizza yang dimakan: 2 potongan + 2 potongan = 4 potongan dari total 8 potongan. Sisa potongan = 8 - 4 = 4 bagian. Ditulis dalam pecahan: 4/8, diperkecil menjadi 1/2."
            },
            {
              stim: `Beni memiliki seutas pita hias berwarna hijau sepanjang 4/8 meter untuk menghias gantungan kunci karyanya sendiri.`,
              q: `Manakah pecahan paling sederhana di bawah ini yang memiliki nilai setara dengan pajang kawat pita hias milik Beni tersebut?`,
              opts: ["A. 1/2", "B. 2/3", "C. 3/4", "D. 1/4"],
              key: "a",
              exp: "Pecahan 4/8 disederhanakan dengan membagi pembilang dan penyebut masing-masing dengan 4, sehingga penyederhanaan paling tepat adalah 1/2."
            },
            {
              stim: `Siti membeli kue keju berbentuk persegi panjang. Kue keju itu dipotong rapi menjadi 12 potong sama besar untuk acara kumpul keluarga. Siti memberikan 3 potong kepada Lani and 3 potong kepada Edo.`,
              q: `Manakah dari pecahan berikut yang melambangkan bagian kue keju yang telah diberikan kepada Lani dan Edo jika digabungkan?`,
              opts: ["A. 1/2", "B. 1/3", "C. 1/4", "D. 2/3"],
              key: "a",
              exp: "Bagian kue Lani dan Edo = 3 + 3 = 6 bagian dari total 12 potongan. Ditulis dalam bentuk pecahan: 6/12, disederhanakan dengan membagi masing-masing pembilang dan penyebut dengan angka 6, didapatkan 1/2."
            }
          ];
          const chosen = variations[idx % variations.length];
          mutated.stimulusText = chosen.stim;
          mutated.questionText = chosen.q;
          mutated.options = chosen.opts;
          mutated.answerKey = chosen.key;
          mutated.explanation = chosen.exp;
        } else if (materiLower.includes("cacah") || materiLower.includes("bilangan") || materiLower.includes("tempat") || baseText.match(/\d+/)) {
          const variations = [
            {
              stim: `Koperasi sekolah dasar berencana menyalurkan bantuan alat tulis. Koperasi tersebut sukses membeli total 250 pak buku tulis bersampul cokelat.`,
              q: `Jika masing-masing pak berisikan tepat 10 buku tulis, tentukanlah jumlah keseluruhan buku tulis yang dibeli koperasi tersebut!`,
              opts: ["A. 2.500 buku", "B. 1.500 buku", "C. 2.000 buku", "D. 3.000 buku"],
              key: "a",
              exp: "Jumlah seluruh buku tulis diperoleh dengan melakukan operasi perkalian: 250 pak x 10 buku per pak = 2.500 buah buku."
            },
            {
              stim: `Dalam pameran kesenian daerah, panitia mengumpulkan sumbangan paket sembako sebanyak 684 kotak paket untuk dibagikan di sekitar wilayah pameran.`,
              q: `Pada angka bilangan 684, tentukan angka yang tepat menempati posisi nilai tempat puluhan!`,
              opts: ["A. Angka 8", "B. Angka 6", "C. Angka 4", "D. Angka 80"],
              key: "a",
              exp: "Pada susunan bilangan 684, nilai tempatnya adalah: 6 menempati ratusan, 8 menempati puluhan, dan 4 menempati satuan. Sehingga angka puluhannya adalah 8."
            },
            {
              stim: `Toko mainan kreatif anak-anak memiliki persediaan kelereng kaca sebanyak 8.420 butir di dalam ruang gudang penyimpanan utama mereka.`,
              q: `Tentukan angka yang menempati posisi nilai tempat ratusan pada angka bilangan persediaan kelereng 8.420 tersebut!`,
              opts: ["A. Angka 4", "B. Angka 8", "C. Angka 2", "D. Angka 0"],
              key: "a",
              exp: "Pada susunan angka bilangan 8.420, angka 8 bernilai ribuan, angka 4 bernilai ratusan, angka 2 bernilai puluhan, dan angka 0 bernilai satuan."
            },
            {
              stim: `SD Merdeka sukses mengumpulkan sumbangan botol mineral plastik bekas sebanyak 3.450 botol untuk program daur ulang kerajinan kelas.`,
              q: `Angka 4 yang terletak pada bilangan jumlah botol 3.450 tersebut tepat menduduki nilai tempat apa?`,
              opts: ["A. Ratusan", "B. Ribuan", "C. Puluhan", "D. Satuan"],
              key: "a",
              exp: "Pada posisi bilangan 3.450, angka 3 adalah ribuan, angka 4 adalah ratusan (bernilai 400), angka 5 adalah puluhan (bernilai 50), dan angka 0 adalah satuan. Jadi angka 4 menduduki nilai tempat ratusan."
            }
          ];
          const chosen = variations[idx % variations.length];
          mutated.stimulusText = chosen.stim;
          mutated.questionText = chosen.q;
          mutated.options = chosen.opts;
          mutated.answerKey = chosen.key;
          mutated.explanation = chosen.exp;
        } else {
          const variations = [
            {
              stim: `Di perpustakaan sekolah terdapat 5 rak buku. Setiap rak memuat tepat 45 buku pelajaran.`,
              q: `Berapa jumlah total seluruh buku pelajaran yang ada di kelima rak tersebut?`,
              opts: ["A. 225 buku", "B. 200 buku", "C. 250 buku", "D. 180 buku"],
              key: "a",
              exp: "Jumlah total buku = 5 rak x 45 buku = 225 buku."
            },
            {
              stim: `Pak Danu memiliki kebun buah apel berbentuk persegi panjang dengan panjang 12 meter dan lebar 5 meter.`,
              q: `Berapakah luas kebun buah apel milik Pak Danu tersebut?`,
              opts: ["A. 60 meter persegi", "B. 50 meter persegi", "C. 34 meter persegi", "D. 24 meter persegi"],
              key: "a",
              exp: "Luas persegi panjang = panjang x lebar = 12 m x 5 m = 60 meter persegi."
            },
            {
              stim: `Udin memiliki tali sepanjang 150 cm dan Edo memiliki tali sepanjang 250 cm.`,
              q: `Jika kedua tali tersebut disambungkan, berapakah panjang total gabungan tali mereka?`,
              opts: ["A. 400 cm", "B. 300 cm", "C. 350 cm", "D. 500 cm"],
              key: "a",
              exp: "Total panjang tali = 150 cm + 250 cm = 400 cm."
            },
            {
              stim: `Ibu memotong buah semangka menjadi 10 potong sama besar untuk dibagikan kepada anak-anak.`,
              q: `Jika Rika memakan 3 potong semangka tersebut, berapa bagian pecahan semangka yang dimakan Rika?`,
              opts: ["A. 3/10", "B. 2/10", "C. 5/10", "D. 7/10"],
              key: "a",
              exp: "Jumlah bagian yang dimakan adalah 3 dari 10 total potongan, ditulis 3/10."
            }
          ];
          const chosen = variations[idx % variations.length];
          mutated.stimulusText = chosen.stim;
          mutated.questionText = chosen.q;
          mutated.options = chosen.opts;
          mutated.answerKey = chosen.key;
          mutated.explanation = chosen.exp;
        }
      } else {
        if (mutated.options && mutated.options.length > 0) {
          mutated.options = mutated.options.map((opt, oIdx) => {
            const letChar = String.fromCharCode(65 + oIdx);
            const optText = opt.replace(/^[A-DA-D][.\s)]+/, "").trim();
            return `${letChar}. ${optText}`;
          });
        }
      }

      const newTextKey = (mutated.questionText || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      seenTexts.add(newTextKey);
      
      const newFullTextStr = (mutated.stimulusText || "") + " " + (mutated.questionText || "");
      const newFullTextKey = newFullTextStr.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      seenTexts.add(newFullTextKey);

      if (mutated.options && mutated.options.length > 0) {
        const newOptsKey = [...mutated.options].map(opt => opt.replace(/^[A-DA-D][.\s)]+/, "").trim().toLowerCase()).sort().join("|").replace(/[^a-z0-9]/g, "");
        seenOptions.add(newOptsKey);
      }

      return mutated;
    }

    seenTexts.add(textKey);
    if (fullTextKey.length > 0) seenTexts.add(fullTextKey);
    if (optsKey) seenOptions.add(optsKey);

    return q;
  });
}

// === DIRECT CLIENT-SIDE GEMINI API CALLER ===

async function callDirectGemini(apiKey: string, prompt: string, schema: any, systemInstruction?: string): Promise<any> {
  const models = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.15
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Google API status ${response.status}: ${await response.text()}`);
      }

      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Sistem Google mengembalikan respon kosong.");
      }

      return JSON.parse(text);
    } catch (err: any) {
      lastError = err;
      console.warn(`Direct Gemini call failed using ${model}. Trying next option...`, err);
    }
  }

  throw lastError || new Error("Semua upaya kontak API Google Gemini secara langsung gagal.");
}

// === MAIN HIGH-AVAILABILITY CLIENT WRAPPERS ===

// 1. Generate Topics
export async function clientGenerateTopics(subject: string, gradeClass: string, userApiKey?: string): Promise<any> {
  const finalKey = userApiKey || localStorage.getItem("ttu_user_api_key") || "";
  
  // A. First, attempt backend request
  try {
    const res = await fetch("/api/generate-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, gradeClass, userApiKey: finalKey })
    });
    if (res.ok) {
      return await res.json();
    }
    // If not found (404) or server issue, proceed to client fallback pipeline
    console.warn("Backend API generate-topics not available or failed. Falling back to client hybrid path...");
  } catch (err) {
    console.warn("Failed fetching backend generate-topics due to network error. Falling back...", err);
  }

  // B. Second, if user has an API Key, run Direct Gemini API from client
  if (finalKey.trim().length > 0) {
    try {
      const prompt = `
        Anda adalah pakar kurikulum pendidikan di Indonesia untuk tingkat Sekolah Dasar (SD) Kurikulum Merdeka.
        Tolong buatkan daftar Capaian Pembelajaran (CP) beserta Elemen yang sesuai untuk mata pelajaran "${subject}" dan tingkat kelas "${gradeClass}".
        Untuk setiap Elemen, buatkan juga 3-5 topik utama yang diajarkan di kelas tersebut.
        SANGAT PENTING: Untuk setiap topik, pecahkan menjadi 3-4 materi atau sub-kompetensi detail secara lebih rinci (materi inilah yang nantinya dipasangkan langsung untuk butir soal SD berkualitas tinggi).
        Buat materi-materi tersebut kontekstual, spesifik, rill, dan sesuai standar nasional Kementerian Pendidikan.

        Format keluaran dalam JSON yang valid sesuai skema yang disediakan.
      `;
      const schema = {
        type: "ARRAY",
        description: "Daftar Capaian Pembelajaran beserta Elemen dan topik rincian",
        items: {
          type: "OBJECT",
          properties: {
            cp: { type: "STRING" },
            element: { type: "STRING" },
            topics: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  materi: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["name", "materi"]
              }
            }
          },
          required: ["cp", "element", "topics"]
        }
      };
      
      const directData = await callDirectGemini(
        finalKey,
        prompt,
        schema,
        "Anda adalah pengembang kurikulum nasional SD di Indonesia yang ahli dalam menyusun Capaian Pembelajaran Kurikulum Merdeka dan rincian materi bahasan yang sangat mendasar dan konkrit."
      );
      if (Array.isArray(directData) && directData.length > 0) {
        return directData;
      }
    } catch (apiError) {
      console.error("Direct client Gemini API topics execution failed, executing local algorithm fallback...", apiError);
    }
  }

  // C. Third, Offline Local Metadata Fallback
  const subjectName = (subject || "Matematika") as string;
  const currentPhase = ["Kelas 1", "Kelas 2"].includes(gradeClass) 
    ? "Fase A" 
    : ["Kelas 3", "Kelas 4"].includes(gradeClass) 
      ? "Fase B" 
      : "Fase C";
  const keyName = `${subjectName} - ${currentPhase}`;
  const fallbackData = FALLBACK_CURRICULUMS[keyName] || FALLBACK_CURRICULUMS[`${subjectName} - Fase B`] || FALLBACK_CURRICULUMS["Matematika - Fase B"];

  const mappedFallback = fallbackData.map((item: any) => {
    return {
      element: item.element,
      cp: item.cp,
      topics: (item.topics || []).map((topicStr: string) => {
        return {
          name: topicStr,
          materi: [
            `Pengantar ${topicStr}`,
            `Pemahaman Konsep ${topicStr}`,
            `Penerapan Praktis ${topicStr} dalam Kehidupan Sehari-hari`
          ]
        };
      })
    };
  });

  return mappedFallback;
}

// 2. Generate Kisi-Kisi
export async function clientGenerateKisiKisi(
  schoolInfo: any,
  subject: string,
  selectedTopics: string[],
  questionConfigs: any[],
  curriculumData: any[],
  userApiKey?: string
): Promise<any> {
  const finalKey = userApiKey || localStorage.getItem("ttu_user_api_key") || "";

  // A. First, attempt backend request
  try {
    const res = await fetch("/api/generate-kisi-kisi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolInfo, subject, selectedTopics, questionConfigs, curriculumData, userApiKey: finalKey })
    });
    if (res.ok) {
      if (res.headers.get("X-Fallback-Used") === "true") {
        localStorage.setItem("ttu_fallback_triggered", "true");
      }
      return await res.json();
    }
    console.warn("Backend API generate-kisi-kisi not available or failed. Falling back to client hybrid path...");
  } catch (err) {
    console.warn("Failed fetching backend generate-kisi-kisi due to network error. Falling back...", err);
  }

  let generatedData: any[] | null = null;

  // B. Second, if user has an API Key, run Direct Gemini API from client
  if (finalKey.trim().length > 0) {
    try {
      const prompt = `
        Buatkan kisi-kisi soal ujian sekolah dasar.
        Informasi Sekolah:
        - Nama Sekolah: ${schoolInfo?.schoolName || "SD Kabupaten"}
        - Kelas: ${schoolInfo?.gradeClass || "Kelas 4"}
        - Tahun Pelajaran: ${schoolInfo?.academicYear || "2025/2026"}
        - Mata Pelajaran: ${subject}
        
        Daftar Topik/Materi Terpilih:
        ${JSON.stringify(selectedTopics)}
   
        Rujukan Kurikulum Resmi (Elemen & Capaian Pembelajaran):
        ${JSON.stringify(curriculumData || [])}
   
        Konfigurasi Jumlah dan Jenis Soal:
        ${JSON.stringify(questionConfigs)}

        ==================================================================
        LARANGAN KERAS STIMULUS BERGAMBAR / ILUSTRASI:
        ==================================================================
        - Anda SANGAT DILARANG MERANCANG jenis soal apa pun untuk dipasangkan stimulus visual (gambar, ilustrasi, foto, dsb). Semua soal harus bebas dari gambar fisik.
        - Kolom Indikator Soal (indicator) SANGAT DILARANG diawali dengan kata-kata terkait gambar fisik. No image/visual stimulus is allowed!
        - ISI NILAI KOLOM 'indicator' HARUS BERUPA INDIKATOR BERSIH yang langsung mendeskripsikan stimulus teks/data dan tugas siswa secara profesional. JANGAN PERNAH menambahkan prefiks "Stimulus:" di awal teks indikator. Tuliskan indikator secara langsung dan elegan!

        ==================================================================
        Aturan umum dalam menghasilkan Indikator Soal (Indicator) - MUTLAK:
        - Indikator soal wajib memuat STIMULUS nyata/konkrit.
        - Level Kognitif kurikulum Indonesia: Level 1, Level 2, atau Level 3.
        - WAJIB menggunakan bahasa sederhana yang ramah anak, lugas, dan sesuai tingkat kemampuan berpikir siswa kelas ${schoolInfo?.gradeClass || "Sekolah Dasar"}.
        
        Petunjuk Pengisian Kisi-kisi:
        - Buat urutan nomor soal yang berkesinambungan dari 1 sampai total soal yang diminta.
        - Tentukan "capaian pembelajaran", "elemen", "materi", "indikator soal", "level kognitif", "bentuk soal", dan "kunci jawaban" ideal untuk setiap nomor.

        Hasilkan keluaran JSON murni sesuai skema pendukung.
      `;

      const schema = {
        type: "ARRAY",
        description: "Daftar baris data tabel kisi-kisi soal",
        items: {
          type: "OBJECT",
          properties: {
            number: { type: "INTEGER" },
            cp: { type: "STRING" },
            element: { type: "STRING" },
            materi: { type: "STRING" },
            indicator: { type: "STRING" },
            cognitiveLevel: { type: "STRING" },
            questionType: { type: "STRING" },
            answerKey: { type: "STRING" }
          },
          required: ["number", "cp", "element", "materi", "indicator", "cognitiveLevel", "questionType", "answerKey"]
        }
      };

      const directRes = await callDirectGemini(
        finalKey,
        prompt,
        schema,
        "Anda menyusun matriks kisi-kisi ujian yang sangat detail namun sederhana, menyertakan stimulus yang pendek, ringkas dan ramah anak pada indikator soal, serta mematuhi Level Kognitif secara akurat."
      );
      if (Array.isArray(directRes) && directRes.length > 0) {
        generatedData = directRes;
      }
    } catch (apiError) {
      console.error("Direct client Gemini API kisi-kisi execution failed, executing local algorithm fallback...", apiError);
    }
  }

  // C. Third, Local Fallback
  if (!generatedData) {
    generatedData = generateFallbackKisiKisi(schoolInfo, subject, selectedTopics, questionConfigs);
  }

  // Final sanitation steps matching server behavior
  let cleaned = generatedData.map((item: any, idx: number) => {
    if (item) {
      if (item.materi) {
        item.materi = cleanMateri(item.materi);
      }
      item.answerKey = cleanKisiKisiAnswerKey(item.answerKey || "", item.questionType || "", idx);
    }
    return item;
  });

  cleaned = alignKisiKisiWithCurriculum(cleaned, curriculumData);
  return cleaned;
}

// 3. Generate Questions (Actual Test Items)
export async function clientGenerateSoal(
  schoolInfo: any,
  subject: string,
  kisiKisi: any[],
  userApiKey?: string
): Promise<any> {
  const finalKey = userApiKey || localStorage.getItem("ttu_user_api_key") || "";

  // Immediately sanitize incoming Kisi-Kisi materi
  const sanitizedKisiKisi = (kisiKisi || []).map((item: any) => {
    if (item && item.materi) {
      return {
        ...item,
        materi: cleanMateri(item.materi)
      };
    }
    return item;
  });

  // A. First, attempt backend request
  try {
    const res = await fetch("/api/generate-soal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolInfo, subject, kisiKisi: sanitizedKisiKisi, userApiKey: finalKey })
    });
    if (res.ok) {
      if (res.headers.get("X-Fallback-Used") === "true") {
        localStorage.setItem("ttu_fallback_triggered", "true");
      }
      return await res.json();
    }
    console.warn("Backend API generate-soal not available or failed. Falling back to client hybrid path...");
  } catch (err) {
    console.warn("Failed fetching backend generate-soal due to network error. Falling back...", err);
  }

  let generatedQuestions: any[] | null = null;

  // B. Second, if user has an API Key, run Direct Gemini API from client
  if (finalKey.trim().length > 0) {
    try {
      const gradeClass = schoolInfo?.gradeClass || "Kelas 4";
      const numQuestions = sanitizedKisiKisi.length;
      const currentPhase = ["Kelas 1", "Kelas 2"].includes(gradeClass) 
        ? "Fase A" 
        : ["Kelas 3", "Kelas 4"].includes(gradeClass) 
          ? "Fase B" 
          : "Fase C";

      const prompt = `
        Format lembar soal ujian sekolah dasar berdasarkan kisi-kisi berikut.
        Mata Pelajaran: ${subject}
        Kelas: ${gradeClass}
        Tahun Pelajaran: ${schoolInfo?.academicYear || "2025/2026"}
        Fase: ${currentPhase}
        
        Kisi-Kisi Sumber:
        ${JSON.stringify(sanitizedKisiKisi)}

        ==================================================================
        ATURAN SANGAT KETAT: 1-KE-1 SINKRONISASI & TENTANG SOAL DUPLIKAT ATAU KEMBAR!
        ==================================================================
        1. Anda WAJIB menghasilkan TEPAT ${numQuestions} butir soal, di mana soal ke-i (index ke-i) di dalam array JSON hasil harus dibuat 100% berlandaskan rincian baris kisi-kisi ke-i (index ke-i) di "Kisi-Kisi Sumber".
        2. Jumlah item dalam array JSON hasil harus SAMA EXACT dengan jumlah item di "Kisi-Kisi Sumber". Jangan kurangi, jangan tambahi!
        3. Setiap nomor soal HARUS memiliki skenario, cerita stimulus, nama tokoh, pertanyaan, pilihan jawaban, kunci jawaban, dan pembahasan yang UNIK DAN SEPENUHNYA BERBEDA satu sama lain!
        4. SANGAT DILARANG KERAS menyalin, menduplikasi, atau menggunakan teks lintas nomor soal!
        5. Gunakan nama-nama tokoh anak Indonesia yang bervariasi secara bergantian.
        6. RANDOMISASI KUNCI JAWABAN (SANGAT MANDATORI): SANGAT DILARANG KERAS membuat pola kunci jawaban yang terlalu berurutan. Pastikan kunci jawaban didistribusikan secara acak penuh.
        7. SANGAT DILARANG KERAS mengandung ayat kitab suci, tulisan Arab atau simbol visual keagamaan tertulis untuk menjamin kebhinekaan naskah.

        Format Keluaran JSON Sesuai dengan Skema.
      `;

      const schema = {
        type: "ARRAY",
        description: "Daftar butir soal ujian",
        items: {
          type: "OBJECT",
          properties: {
            number: { type: "INTEGER" },
            questionType: { type: "STRING" },
            cp: { type: "STRING" },
            element: { type: "STRING" },
            materi: { type: "STRING" },
            stimulusText: { type: "STRING" },
            questionText: { type: "STRING" },
            options: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            answerKey: { type: "STRING" },
            explanation: { type: "STRING" }
          },
          required: ["number", "questionType", "cp", "element", "materi", "questionText", "answerKey", "explanation"]
        }
      };

      const directRes = await callDirectGemini(
        finalKey,
        prompt,
        schema,
        "Anda memproduksi lembar kompetensi soal SD yang sangat selaras dengan Kurikulum Merdeka, bebas stimulus gambar fisik, aman dari urutan kunci seragam, dan menggunakan skenario kontekstual tanah air yang otentik."
      );
      if (Array.isArray(directRes) && directRes.length > 0) {
        generatedQuestions = directRes;
      }
    } catch (apiError) {
      console.error("Direct client Gemini API questions execution failed, executing local algorithm fallback...", apiError);
    }
  }

  // C. Third, Local Fallback
  if (!generatedQuestions) {
    generatedQuestions = generateFallbackSoal(schoolInfo, subject, sanitizedKisiKisi);
  }

  // Final sanitation steps matching server behavior
  const normalizedData = generatedQuestions.map((q: any) => {
    let cleanOpts = q.options ? [...q.options] : [];
    if (q.questionType === "Pilihan Ganda") {
      const letters = ["A", "B", "C", "D"];
      // Fill options if missing or make sure precisely 4 choices
      while (cleanOpts.length < 4) {
        const letter = letters[cleanOpts.length];
        cleanOpts.push(`${letter}. Pilihan ${letter}`);
      }
      if (cleanOpts.length > 4) {
        cleanOpts = cleanOpts.slice(0, 4);
      }
      cleanOpts = cleanOpts.map((opt, idx) => {
        const letter = letters[idx];
        const cleanText = opt.replace(/^[a-dA-D][.\s)]+/, "").trim();
        return `${letter}. ${cleanText || `Pilihan ${letter}`}`;
      });
    }

    return {
      ...q,
      materi: cleanMateri(q.materi || ""),
      options: cleanOpts
    };
  });

  const cleanedQuestions = normalizedData.map((q: any) => {
    if (q && q.materi) {
      q.materi = cleanMateri(q.materi);
    }
    return q;
  });

  const deduplicated = findAndFixDuplicateQuestions(cleanedQuestions, subject);
  const aligned = alignQuestionsWithKisiKisiAnswerKeys(deduplicated, sanitizedKisiKisi);
  return aligned;
}
