import { QuestionItem } from "./types";

/**
 * Calculates how many questions should have images (25% rounded up).
 */
export function hitungSoalBergambar(totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.ceil(totalCount * 0.25);
}

/**
 * Checks if a question has a narrative story/text/reading comprehension stimulus,
 * which should be kept strictly as text/story without receiving visual illustrations.
 */
export function isQuestionAStoryStimulus(q: QuestionItem): boolean {
  const text = `${q.questionText || ""} ${q.stimulusText || ""} ${q.materi || ""}`.toLowerCase();
  
  const hasStoryKeywords = 
    text.includes("bacalah") ||
    text.includes("bacaan berikut") ||
    text.includes("cerita berikut") ||
    text.includes("kutipan cerita") ||
    text.includes("dongeng") ||
    text.includes("cerita di bawah") ||
    text.includes("teks di bawah") ||
    text.includes("teks berikut") ||
    text.includes("puisi") ||
    text.includes("pantun") ||
    text.includes("dialog berikut") ||
    text.includes("percakapan") ||
    text.includes("suatu hari") ||
    text.includes("paragraf") ||
    text.includes("penggalan cerita");
    
  const isLongText = q.stimulusText && q.stimulusText.trim().length > 65;
  const hasVisualInstruction = 
    text.includes("perhatikan gambar") || 
    text.includes("perhatikan diagram") || 
    text.includes("perhatikan tabel") || 
    text.includes("perhatikan grafik") ||
    text.includes("perhatikan peta") ||
    text.includes("lihat gambar");
    
  if (hasStoryKeywords && !hasVisualInstruction) {
    return true;
  }
  
  if (isLongText && !hasVisualInstruction && !text.includes("tabel") && !text.includes("diagram") && !text.includes("grafik") && !text.includes("bagan")) {
    return true;
  }
  
  return false;
}

/**
 * Determines if a question contains keywords indicating it should have an illustration.
 */
export function isQuestionVisuallyDemanding(q: QuestionItem): boolean {
  if (isQuestionAStoryStimulus(q)) {
    return false; // Automatically protect story/text stimuli from being marked as visually demanding
  }

  if (q.imagenPrompt && q.imagenPrompt.trim().length > 0) return true;
  if (q.imagePrompt && q.imagePrompt.trim().length > 0) return true;
  if (q.svgContent && q.svgContent.trim().toLowerCase().includes("<svg")) return true;

  const text = `${q.questionText || ""} ${q.stimulusText || ""} ${q.materi || ""}`.toLowerCase();
  
  // Proteksi Khusus PJOK / Pendidikan Olahraga dari gambar acak / kucing acak
  const isPjok = text.includes("pjok") || text.includes("jasmani") || text.includes("olahraga") || text.includes("senam") || text.includes("penjas") || text.includes("penjasorkes") || text.includes("bola") || text.includes("menggiring") || text.includes("meliuk");
  if (isPjok && !text.includes("lapangan") && !text.includes("gawang") && !text.includes("diagram") && !text.includes("peta") && !text.includes("lapangan basket") && !text.includes("lapangan sepakbola") && !text.includes("bola") && !text.includes("cone") && !text.includes("rintangan") && !text.includes("meliuk")) {
    return false;
  }

  return (
    text.includes("perhatikan gambar") ||
    text.includes("gambar") ||
    text.includes("ilustrasi") ||
    text.includes("diagram") ||
    text.includes("tabel") ||
    text.includes("grafik") ||
    text.includes("peta") ||
    text.includes("siklus") ||
    text.includes("pecahan") ||
    text.includes("segitiga") ||
    text.includes("bentuk") ||
    text.includes("pancasila") ||
    text.includes("bendera")
  );
}

/**
 * Direct Imagen model generation function provided by the user.
 * Prioritizes client-side API Key or localStorage, falling back to server-side if none is active.
 */
export async function generateImage(imagePromptText: string): Promise<string | null> {
  // 1. Prioritaskan API Key dari Environment (.env) sesuai standar arsitektur baru
  // 2. Fallback ke LocalStorage jika berjalan murni di sisi klien
  // 3. Fallback terakhir ke kosong
  const metaObj = (typeof import.meta !== 'undefined') ? (import.meta as any) : null;
  const activeKey = 
    (metaObj && metaObj.env && (metaObj.env.VITE_GEMINI_API_KEY || metaObj.env.GEMINI_API_KEY)) || 
    localStorage.getItem('ttu_user_api_key') ||
    localStorage.getItem('gemini_api_key') || 
    "";

  if (!activeKey) {
    console.log("No client-side Gemini API key found or set yet. Defaulting to server proxy...");
    return null;
  }

  // Menggunakan model Imagen terbaru untuk konsistensi gaya visual (vektor anak SD)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${activeKey}`;
  
  // Payload yang dioptimalkan untuk rasio soal (1:1) dan format gambar web
  const payload = { 
    instances: [{ prompt: imagePromptText }], 
    parameters: { 
      sampleCount: 1,
      aspectRatio: "1:1",
      outputOptions: {
        mimeType: "image/jpeg",
        compressionQuality: 70
      }
    } 
  };
  
  // Sistem Retry Otomatis (Mencegah kegagalan jika server AI sedang sibuk)
  for (let i = 0; i < 4; i++) { 
    try {
      const res = await fetch(url, { 
        method: "POST", 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || `HTTP Error ${res.status}`);
      }
      
      const json = await res.json();
      
      if (json.predictions && json.predictions[0] && json.predictions[0].bytesBase64Encoded) {
        // Konversi langsung dari Base64 ke format Data URL yang bisa dibaca tag <img> HTML
        const rawBase64 = `data:image/jpeg;base64,${json.predictions[0].bytesBase64Encoded}`;
        return rawBase64; 
      }
      throw new Error("Tidak ada data gambar yang dikembalikan oleh AI.");
    } catch (e: any) {
      console.warn(`Percobaan ke-${i + 1} gagal merender gambar:`, e.message);
      if (i === 3) return null; // Menyerah setelah 4 kali percobaan agar aplikasi tidak hang
      // Jeda waktu (Backoff) yang meningkat setiap kali gagal sebelum mencoba lagi
      await new Promise(r => setTimeout(r, 2500 * (i + 1))); 
    }
  }
  return null;
}

/**
 * Generates an image for a single question item.
 * Prioritizes direct Web client-side generation, otherwise proxies to backend /api/generate-image.
 */
export async function generateImageForSoal(
  subject: string,
  question: QuestionItem
): Promise<QuestionItem> {
  // Use any existing prompt or construct a robust, descriptive context-specific English prompt
  let prompt = question.imagenPrompt || question.imagePrompt || "";
  
  if (!prompt) {
    const cleanSubject = (subject || "").toLowerCase();
    const cleanMateri = (question.materi || "").toLowerCase();
    const cleanText = (question.questionText || "").toLowerCase();
    
    const isMath = cleanSubject.includes("matematik") || 
                   cleanMateri.includes("matematik") ||
                   cleanText.includes("hitung") ||
                   cleanText.includes("jumlah") ||
                   cleanText.includes("pecahan");

    if (isMath) {
      prompt = `An educational 3D digital math illustration for counting, cute visual textbook schematic style. Depict precisely and clearly: "${question.questionText}". The items must be beautifully arranged, highly distinct, isolated, well-spaced, and easy for primary school students to count visually. Colorful cute claymation-like assets, clean wooden surface or soft light-colored pastel solid background, clear volumetric studio lighting, rich colors. No letter labels, no mathematical operator characters, no written text, completely textless, pure visual math presentation.`;
    } else {
      const materiContext = question.materi ? `about ${question.materi}` : "";
      prompt = `A premium 3D digital illustration in cute Pixar and Disney animation aesthetic, claymation style, clay render ${materiContext} for elementary school grade exam. Visual or context: "${question.questionText}". Focus purely on the main visuals, vibrant saturated colors, soft overhead volumetric lighting, raytraced shadows, polished clay textures, clean soft background. ABSOLUTELY NO letters, labels, or written text.`;
    }
  }

  try {
    // 1. Coba panggil direktori client-side generateImage jika kunci tersedia di Browser/Vite
    const clientGeneratedBase64 = await generateImage(prompt);
    if (clientGeneratedBase64) {
      console.log(`[imageUtils] Client-side Image Generation succeeded for question #${question.number}`);
      return {
        ...question,
        imageUrl: clientGeneratedBase64,
        svgContent: undefined
      };
    }

    // 2. Fallback ke endpoint server proxy jika tidak ada kunci kustom di client
    console.log(`[imageUtils] Direct client-side key not loaded/available. Relaying generation to backend /api/generate-image proxy...`);
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-user-api-key": localStorage.getItem("ttu_user_api_key") || ""
      },
      body: JSON.stringify({
        subject,
        question,
        prompt,
        userApiKey: localStorage.getItem("ttu_user_api_key") || "",
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }

    const data = await response.json();
    if (data.imageUrl) {
      return {
        ...question,
        imageUrl: data.imageUrl,
        svgContent: undefined // Prefer physical PNG image over SVG when Imagen successfully produces outputs
      };
    }
    return question;
  } catch (error) {
    console.error(`[imageUtils] Failed to generate image for question #${question.number}:`, error);
    return question; // Return un-modified item as safe fallback
  }
}

/**
 * Generates illustrations for multiple questions up to the calculated 25% target count.
 * Progress is reported via onProgress callback.
 */
export async function generateAllImages(
  subject: string,
  questions: QuestionItem[],
  onProgress: (percent: number, current: number, total: number) => void
): Promise<QuestionItem[]> {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) return questions;

  const targetCount = hitungSoalBergambar(totalQuestions);
  
  // Prioritize questions: visually demanding first, then by sequence, but exclude story stimuli
  const indexedList = questions.map((q, idx) => {
    const isStory = isQuestionAStoryStimulus(q);
    const demanding = isStory ? false : isQuestionVisuallyDemanding(q);
    return { q, idx, demanding, isStory };
  });
  
  // Filter out any story stimulus to keep them strictly verbal without artificial mismatch images
  const candidates = indexedList.filter(item => !item.isStory);

  // Sort visually demanding to the front, but keep original relative order inside groups.
  // ONLY illustrate questions that are genuinely visually demanding or explicitly marked as demanding.
  const sortedToIllustrate = candidates
    .filter(item => item.demanding)
    .sort((a, b) => (b.demanding ? 1 : 0) - (a.demanding ? 1 : 0))
    .slice(0, targetCount)
    .map(item => item.idx);

  const updatedQuestions = [...questions];
  let processedCount = 0;

  // Let UI know we are starting
  onProgress(0, 0, targetCount);

  for (let i = 0; i < totalQuestions; i++) {
    if (sortedToIllustrate.includes(i)) {
      const q = questions[i];
      try {
        const updatedQ = await generateImageForSoal(subject, q);
        updatedQuestions[i] = updatedQ;
      } catch (e) {
        console.error(`Failed during batch illustration of index ${i}:`, e);
      }
      
      processedCount++;
      const percent = Math.round((processedCount / targetCount) * 100);
      onProgress(percent, processedCount, targetCount);
    }
  }

  return updatedQuestions;
}
