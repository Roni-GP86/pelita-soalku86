import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { FALLBACK_CURRICULUMS, generateFallbackKisiKisi, generateFallbackSoal } from "./server-fallback";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = 3000;

// Initialize multiple Gemini API clients for rotation to handle high usage and multi-user rate limits
let aiClients: GoogleGenAI[] = [];
let currentClientIndex = 0;

// Topics Cache to make curriculum generation instantaneous
const topicsCache = new Map<string, any>();

function getAiClientsPool(): GoogleGenAI[] {
  if (aiClients.length === 0) {
    const keys: string[] = [];
    
    // 1. Prioritize process.env.GEMINI_API_KEY (default system key in AI Studio)
    const defaultSysKey = process.env.GEMINI_API_KEY;
    if (defaultSysKey && defaultSysKey.trim() !== "" && defaultSysKey !== "MY_GEMINI_API_KEY") {
      keys.push(defaultSysKey.trim());
      console.log("[Gemini API] Prioritizing the system-provided GEMINI_API_KEY.");
    }

    // 2. Add GEMINI_API_KEYS_POOL separated by commas if not already added
    if (process.env.GEMINI_API_KEYS_POOL) {
      const pool = process.env.GEMINI_API_KEYS_POOL.split(",")
        .map(k => k.trim())
        .filter(k => k.length > 0 && k !== "MY_GEMINI_API_KEY");
      for (const k of pool) {
        if (!keys.includes(k)) {
          keys.push(k);
        }
      }
    }
    
    // 3. Support other individual variables if not already added
    const envVars = ["GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5"];
    for (const v of envVars) {
      const val = process.env[v];
      if (val && val.trim() !== "" && val !== "MY_GEMINI_API_KEY" && !keys.includes(val.trim())) {
        keys.push(val.trim());
      }
    }
    
    // 4. Fallback to default developer key if no keys are configured
    if (keys.length === 0) {
      console.log("[Gemini API] No custom system key found, falling back to developer key.");
      keys.push("AIzaSyDUqQ7LNP_3dUy4uOCjcx_hbRwLgi8bEpU");
    }
    
    // Create client instances
    aiClients = keys.map(key => new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    }));
  }
  return aiClients;
}

// Returns the current active rotated client
function getAiClient(): GoogleGenAI {
  const pool = getAiClientsPool();
  return pool[currentClientIndex % pool.length];
}

// Rotates to the next client in case of rate limits
function rotateAiClient(): void {
  const pool = getAiClientsPool();
  if (pool.length > 1) {
    currentClientIndex = (currentClientIndex + 1) % pool.length;
    console.log(`[Gemini API Rotation] Switched to API key index ${currentClientIndex}/${pool.length}`);
  }
}

// Helper to call Gemini with automatic retry and API key rotation on rate limits / errors, prioritizing userApiKey if provided
async function generateContentWithRetry(aiIgnored: GoogleGenAI, params: any, maxRetries = 2, userApiKey?: string): Promise<any> {
  let attempt = 0;
  const poolLength = getAiClientsPool().length;
  // We retry up to maxRetries or cycle through keys * 2 to ensure we utilize other keys
  const totalAttempts = Math.max(maxRetries, poolLength * 2);
  
  while (attempt <= totalAttempts) {
    let ai = getAiClient(); // Fetch currently active rotated client
    let isUserKeyActive = false;

    // Prioritize user's custom API key on early attempts if they provided one
    if (userApiKey && userApiKey.trim().length > 0 && attempt < 2) {
      isUserKeyActive = true;
      ai = new GoogleGenAI({
        apiKey: userApiKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build-user",
          },
        },
      });
    }

    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errStr = (String(err) + " " + String(err.message || "") + " " + String(err.status || "")).toLowerCase();
      
      // Dynamic fallback for restricted or access denied models
      const isAccessDenied = err.status === 403 ||
                             err.statusCode === 403 ||
                             errStr.includes("denied") ||
                             errStr.includes("permission_denied") ||
                             errStr.includes("forbidden") ||
                             errStr.includes("not allowed") ||
                             errStr.includes("not found") ||
                             errStr.includes("invalid argument");

      if (isAccessDenied && params.model && params.model !== "gemini-3.5-flash") {
        console.warn(`[Gemini API] Access denied or unsupported model for ${params.model}. Falling back to gemini-3.5-flash...`);
        params.model = "gemini-3.5-flash";
        if (params.config && params.config.thinkingConfig) {
          delete params.config.thinkingConfig;
        }
        attempt++;
        continue;
      }

      // Check if transient error, rate limit, service unavailable, or permission denied that could benefit from retry/rotation
      const isRateLimitOrTransient = 
        err.status === 429 || err.statusCode === 429 ||
        err.status === 503 || err.statusCode === 503 ||
        err.status === 403 || err.statusCode === 403 ||
        errStr.includes("quota") || errStr.includes("resource_exhausted") ||
        errStr.includes("rate limit") || errStr.includes("rate exceeded") ||
        errStr.includes("limitexceeded") || errStr.includes("demand") ||
        errStr.includes("unavailable") || errStr.includes("denied") ||
        errStr.includes("permission_denied");

      if (isRateLimitOrTransient && attempt < totalAttempts) {
        attempt++;
        if (!isUserKeyActive && poolLength > 1) {
          console.warn(`[Gemini API] Error (${err.status || err.statusCode || "Transient/RateLimit"}) encountered on system key. Rotating API keys...`);
          rotateAiClient();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          const waitTime = attempt * 3000; // Wait 3s, then 6s
          console.warn(`[Gemini API] Error (${err.status || err.statusCode || "Transient/RateLimit"}). Retrying attempt ${attempt}/${totalAttempts} in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        continue;
      }

      // Fallback to User API Key as a last resort if it wasn't already active and fails (for safety)
      if (!isUserKeyActive && userApiKey && userApiKey.trim().length > 0) {
        try {
          console.log("[Gemini API] System/pool key failed or exhausted. Attempting fallback with custom User API Key...");
          const userAi = new GoogleGenAI({
            apiKey: userApiKey.trim(),
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build-user",
              },
            },
          });
          return await userAi.models.generateContent(params);
        } catch (userErr) {
          console.error("[Gemini API] Custom User API Key fallback also experienced an error:", userErr);
          throw userErr;
        }
      }

      throw err;
    }
  }
}

// Helper to call Google Imagen API via GenAI SDK with automatic key rotation and retry on 429
async function generateImagenImage(prompt: string, maxRetries = 1, userApiKey?: string): Promise<string | null> {
  if (!prompt || prompt.trim().length === 0) return null;
  
  let customUserAi: GoogleGenAI | null = null;
  if (userApiKey && userApiKey.trim().length > 0) {
    customUserAi = new GoogleGenAI({
      apiKey: userApiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build-user",
        },
      },
    });
  }
  
  const promptLower = prompt.toLowerCase();
  
  // Decide the subject-specific constraints and visual styles
  let subjectStyleConstraint = "";
  if (
    promptLower.includes("vector") || 
    promptLower.includes("illustration") || 
    promptLower.includes("diagram") || 
    promptLower.includes("matematika") ||
    promptLower.includes("hitung") || 
    promptLower.includes("objek") || 
    promptLower.includes("benda") ||
    promptLower.includes("buah") ||
    promptLower.includes("apple") ||
    promptLower.includes("apel") ||
    promptLower.includes("balok") ||
    promptLower.includes("kubus") ||
    promptLower.includes("clipart") ||
    promptLower.includes("svg")
  ) {
    subjectStyleConstraint = "Style Constraint: Use ONLY '3D clay render, Pixar styled 3D model, isolated on a clean solid white background'. Highly detailed clay textures, vibrant colors, clear curves and shapes, with cute soft shadows, and absolutely zero text, zero labels, and zero realistic/photographic elements.";
  } else {
    subjectStyleConstraint = "Style Constraint: Use ONLY '3D digital illustration, cute Pixar and Disney animation render, claymation style'. Vibrant cheerful colors, highly detailed 3D textures, clean polished structures, soft overhead volumetric lighting, and gentle raytraced shadows. Match cute Indonesian settings: characters must be charming, friendly elementary school children with warm, innocent facial expressions and realistic child dimensions. They must wear clean public elementary school uniforms (pristine white short-sleeved shirts with national red ties and emblem badges, paired with brick-red shorts or pleated skirts) in appropriate situations, or bright neat school PE uniforms when doing physical or sports activities.";
  }

  const negativePromptStr = "text, words, letters, labels, spelling, font, numbers, characters, titles, overlay, watermarks, signature, captions, logos, badge, copyright, blurry, bad anatomy, bad hands, mutated fingers, out of frame, cropped, distorted object shapes, low quality, draft, extra limbs, banner, frame border, abstract colorful background, distracting details";

  let petConstraint = "";
  if (
    promptLower.includes("kucing") || 
    promptLower.includes("cat") || 
    promptLower.includes("anjing") || 
    promptLower.includes("dog") || 
    promptLower.includes("hewan") || 
    promptLower.includes("binatang") || 
    promptLower.includes("pet") || 
    promptLower.includes("animal") ||
    promptLower.includes("burung") ||
    promptLower.includes("bird") ||
    promptLower.includes("ikan") ||
    promptLower.includes("fish") ||
    promptLower.includes("kelinci") ||
    promptLower.includes("rabbit")
  ) {
    petConstraint = "\n4. LIVE PET EXCLUSION: Since a living pet/animal is requested, depict a living, healthy pet sitting naturally in its environment. Do NOT depict drawing paint, brushes, crayons, or sketch tools unless explicitly requested.";
  }

  const systemInstruction = `Strict System Instruction & Constraints:
You are an expert professional educational visual assets designer. You must adhere stringently to the following layout constraints, visual styles, and safety rules to prevent any hallucination.
1. ${subjectStyleConstraint}
2. ZERO HALLUCINATION: Render only the precise subjects and items explicitly detailed in the request description. Never introduce extraneous, unrelated items or mismatch subjects.
3. NO WRITTEN TEXT OR SYMBOLS: Absolutely never render any letters, word labels, numeric numbers, titles, banners, watermark lines, or artist signatures. The canvas must be 100% free of letters and text.${petConstraint}

Strict Avoidance (Negative Prompt): ${negativePromptStr}`;

  // Prepend strict system instructions and constraints to the prompt
  const enhancedPrompt = `${systemInstruction}\n\nUser Image Request:\n${prompt}`;
  
  const poolLength = getAiClientsPool().length;
  const totalRateLimitRetries = Math.max(3, poolLength * 2);
  const fallbackAttemptsMax = 2;

  let attempt = 0;

  // Try Model 1: 'imagen-3.0-generate-002' then 'imagen-3.0-generate-001'
  const imagenModels = ['imagen-3.0-generate-002', 'imagen-3.0-generate-001'];
  let imageGeneratedResult: string | null = null;
  
  for (const modelName of imagenModels) {
    if (imageGeneratedResult) break;
    attempt = 0;
    
    while (attempt <= totalRateLimitRetries) {
      const ai = customUserAi || getAiClient();
      try {
        console.log(`[Google Imagen] Generating image using '${modelName}' (Attempt ${attempt}/${totalRateLimitRetries}) using key index ${currentClientIndex}...`);
        
        const config: any = {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        };

        const response = await ai.models.generateImages({
          model: modelName,
          prompt: enhancedPrompt,
          config: config,
        });
        
        if (response && response.generatedImages && response.generatedImages[0] && response.generatedImages[0].image && response.generatedImages[0].image.imageBytes) {
          const base64Bytes = response.generatedImages[0].image.imageBytes;
          console.log(`[Google Imagen] Successfully generated image via '${modelName}'!`);
          imageGeneratedResult = `data:image/jpeg;base64,${base64Bytes}`;
          break;
        }
      } catch (err: any) {
        const errStr = (String(err) + " " + String(err.message || "") + " " + String(err.status || "")).toLowerCase();
        console.warn(`[Google Imagen Error] Model '${modelName}' attempt ${attempt} failed:`, err.message || err);

        // If it is a 404 or NOT_FOUND, skip this model entirely and try the next one
        if (err.status === 404 || errStr.includes("not found") || errStr.includes("not_found") || errStr.includes("unsupported")) {
          console.warn(`[Google Imagen] Model '${modelName}' is not found or unsupported. Skipping this model search.`);
          break;
        }

        const isRateLimit = err.status === 429 || 
                            err.statusCode === 429 ||
                            errStr.includes("quota") || 
                            errStr.includes("resource_exhausted") ||
                            errStr.includes("rate limit") ||
                            errStr.includes("rate exceeded") ||
                            errStr.includes("429") ||
                            errStr.includes("limitexceeded");
                            
        if (isRateLimit) {
          if (attempt < totalRateLimitRetries) {
            const backoffTime = Math.min(1500 * Math.pow(2, attempt) + Math.floor(Math.random() * 1000), 12000);
            console.warn(`[Google Imagen Rate Limit Triggered] Waiting ${backoffTime}ms on try ${attempt}/${totalRateLimitRetries} for ${modelName}...`);
            
            if (poolLength > 1 && !customUserAi) {
              rotateAiClient();
            }
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
            attempt++;
            continue;
          } else {
            console.warn(`[Google Imagen Rate Limit Exhausted] Maximum retries reached for '${modelName}'. Trying fallback...`);
            break;
          }
        }
        break; // Exit loop on content moderation / prompt blocks / invalid params to fail fast
      }
    }
  }

  if (imageGeneratedResult) {
    return imageGeneratedResult;
  }
  
  // Try Model 2 (Fallback 1): 'gemini-2.5-flash-image'
  attempt = 0;
  while (attempt <= fallbackAttemptsMax) {
    const ai = customUserAi || getAiClient();
    try {
      console.log(`[Google Imagen Fallback 1] Trying gemini-2.5-flash-image (Attempt ${attempt}/${fallbackAttemptsMax}) with prompt: "${prompt.slice(0, 60)}..."`);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });
      
      if (response && response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log(`[Google Imagen Fallback 1] Successfully generated image using gemini-2.5-flash-image!`);
            return `data:image/jpeg;base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (e: any) {
      const errStr = (String(e) + " " + String(e.message || "") + " " + String(e.status || "")).toLowerCase();
      console.warn(`[Google Imagen Fallback gemini-2.5-flash-image Error] Try ${attempt} error:`, e.message || e);
      
      const isRateLimit = e.status === 429 || 
                          e.statusCode === 429 ||
                          errStr.includes("quota") || 
                          errStr.includes("resource_exhausted") ||
                          errStr.includes("rate limit") ||
                          errStr.includes("rate exceeded") ||
                          errStr.includes("429") ||
                          errStr.includes("limitexceeded");

      if (isRateLimit && attempt < fallbackAttemptsMax) {
        const backoffTime = Math.min(1500 * Math.pow(2, attempt) + Math.floor(Math.random() * 1005), 12000);
        console.warn(`[Gemini Flash Image Rate Limit] Waiting ${backoffTime}ms with exponential backoff on fallback try ${attempt}/${fallbackAttemptsMax}...`);
        if (poolLength > 1) {
          rotateAiClient();
        }
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        attempt++;
        continue;
      }
      break;
    }
    attempt++;
  }

  // Try Model 3 (Fallback 2): 'gemini-3.1-flash-image'
  attempt = 0;
  while (attempt <= fallbackAttemptsMax) {
    const ai = customUserAi || getAiClient();
    try {
      console.log(`[Google Imagen Fallback 2] Trying gemini-3.1-flash-image (Attempt ${attempt}/${fallbackAttemptsMax}) with prompt: "${prompt.slice(0, 60)}..."`);
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });
      
      if (response && response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log(`[Google Imagen Fallback 2] Successfully generated image using gemini-3.1-flash-image!`);
            return `data:image/jpeg;base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (e: any) {
      const errStr = (String(e) + " " + String(e.message || "") + " " + String(e.status || "")).toLowerCase();
      console.warn(`[Google Imagen Fallback gemini-3.1-flash-image Error] Try ${attempt} error:`, e.message || e);
      
      const isRateLimit = e.status === 429 || 
                          e.statusCode === 429 ||
                          errStr.includes("quota") || 
                          errStr.includes("resource_exhausted") ||
                          errStr.includes("rate limit") ||
                          errStr.includes("rate exceeded") ||
                          errStr.includes("429") ||
                          errStr.includes("limitexceeded");

      if (isRateLimit && attempt < fallbackAttemptsMax) {
        const backoffTime = Math.min(1500 * Math.pow(2, attempt) + Math.floor(Math.random() * 105), 12000);
        console.warn(`[Gemini Flash Image Rate Limit] Waiting ${backoffTime}ms with exponential backoff on fallback try ${attempt}/${fallbackAttemptsMax}...`);
        if (poolLength > 1) {
          rotateAiClient();
        }
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        attempt++;
        continue;
      }
      break;
    }
    attempt++;
  }

  // Try Model 4 (Fallback 3 - Legacy Imagen Backup): 'imagen-3.0-capability-001'
  attempt = 0;
  while (attempt <= fallbackAttemptsMax) {
    const ai = getAiClient();
    try {
      console.log(`[Google Imagen Fallback 3] Trying backup model imagen-3.0-capability-001 (Attempt ${attempt}/${fallbackAttemptsMax}) with prompt: "${prompt.slice(0, 60)}..."`);
      
      const config: any = {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      };

      const response = await ai.models.generateImages({
        model: 'imagen-3.0-capability-001',
        prompt: enhancedPrompt,
        config: config,
      });
      
      if (response && response.generatedImages && response.generatedImages[0] && response.generatedImages[0].image && response.generatedImages[0].image.imageBytes) {
        console.log(`[Google Imagen Fallback 3] Successfully generated image using imagen-3.0-capability-001!`);
        return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
      }
    } catch (e: any) {
      const errStr = (String(e) + " " + String(e.message || "") + " " + String(e.status || "")).toLowerCase();
      console.warn(`[Google Imagen Fallback imagen-3.0-capability-001 Error] Try ${attempt} error:`, e.message || e);

      const isRateLimit = e.status === 429 || 
                          e.statusCode === 429 ||
                          errStr.includes("quota") || 
                          errStr.includes("resource_exhausted") ||
                          errStr.includes("rate limit") ||
                          errStr.includes("rate exceeded") ||
                          errStr.includes("429") ||
                          errStr.includes("limitexceeded");

      if (isRateLimit && attempt < fallbackAttemptsMax) {
        const backoffTime = Math.min(1500 * Math.pow(2, attempt) + Math.floor(Math.random() * 1005), 12000);
        console.warn(`[Imagen Capability Rate Limit] Waiting ${backoffTime}ms with exponential backoff on fallback try ${attempt}/${fallbackAttemptsMax}...`);
        if (poolLength > 1) {
          rotateAiClient();
        }
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        attempt++;
        continue;
      }
      break;
    }
    attempt++;
  }
  
  // Custom User API Key Final Fallback (only run if all system/pool keys failed or were limited)
  if (userApiKey && userApiKey.trim().length > 0) {
    try {
      console.log("[Google Imagen] System keys failed/limited. Running final fallback with custom User API Key on 'imagen-3.0-generate-002'...");
      const userAi = new GoogleGenAI({
        apiKey: userApiKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build-user",
          },
        },
      });
      
      const userConfig: any = {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      };
      
      const response = await userAi.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: enhancedPrompt,
        config: userConfig,
      });
      
      if (response && response.generatedImages && response.generatedImages[0] && response.generatedImages[0].image && response.generatedImages[0].image.imageBytes) {
        const base64Bytes = response.generatedImages[0].image.imageBytes;
        console.log("[Google Imagen] Custom User API Key generated image successfully!");
        return `data:image/jpeg;base64,${base64Bytes}`;
      }
    } catch (userErr: any) {
      console.error("[Google Imagen] Custom User API Key fallback failed during core generation:", userErr.message || userErr);
      
      // Secondary fallback on user key: Try 'gemini-2.5-flash-image'
      try {
        console.log("[Google Imagen] Trying secondary gemini-2.5-flash-image with custom User API Key...");
        const userAi = new GoogleGenAI({
          apiKey: userApiKey.trim(),
          httpOptions: { headers: { "User-Agent": "aistudio-build-user" } }
        });
        const response = await userAi.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: enhancedPrompt }] },
          config: {
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
          }
        });
        if (response && response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              return `data:image/jpeg;base64,${part.inlineData.data}`;
            }
          }
        }
      } catch (userFallbackErr) {
        console.error("[Google Imagen] Custom User API Key secondary fallback also failed:", userFallbackErr);
      }
    }
  }
  
  return null;
}



// Verified pool of high-quality active Unsplash image URLs to prevent broken image errors (404)
const VERIFIED_UNSPLASH_IMAGE_POOL: Record<string, string> = {
  gotongRoyong: "https://images.unsplash.com/photo-1610483178766-02e071e6be12?w=600&auto=format&fit=crop&q=80", // children with plants/garden
  indonesiaFlag: "https://images.unsplash.com/photo-1577964955725-b4618a00282b?w=600&auto=format&fit=crop&q=80", // fluttering Red and White Indonesian Flag
  classroom: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80", // clean high-contrast classroom
  reading: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600&auto=format&fit=crop&q=80", // child happily reading a book
  playing: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600&auto=format&fit=crop&q=80", // elementary students playing on sunny green field/courtyard
  schoolInteraction: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&auto=format&fit=crop&q=80", // friendly female teacher interacting with schoolchildren
  soccer: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=80", // active sports/soccer field
  science: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80", // science lab activity, microscope
  family: "https://images.unsplash.com/photo-1542037104857-ffbe0bb7ebb3?w=600&auto=format&fit=crop&q=80", // wholesome family smiling
  art: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80", // painting/art supplies and cups
  traditionalMarket: "https://images.unsplash.com/photo-1590224790079-66810260db97?w=600&auto=format&fit=crop&q=80", // Indonesian fruits active market
  indonesianCulture: "https://images.unsplash.com/photo-1610116306796-6ebd3051c3d8?w=600&auto=format&fit=crop&q=80", // Borobudur temple morning scene
  cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80", // adorable cat playing
  dog: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80", // friendly puppy dog
  bird: "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=600&auto=format&fit=crop&q=80", // beautiful colorful bird
  fish: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=600&auto=format&fit=crop&q=80", // goldfishes swimming
  rabbit: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600&auto=format&fit=crop&q=80", // cute domestic rabbit
  animals: "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=600&auto=format&fit=crop&q=80", // default fallback deer in forest
  astronomy: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=600&auto=format&fit=crop&q=80", // celestial astronomy stars background
  healthyDiet: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80", // organic vegetables and fruits table
  bicycling: "https://images.unsplash.com/photo-1485550409059-9afb054cada4?w=600&auto=format&fit=crop&q=80", // kids riding bicycle outdoors
  computers: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80", // digital learning computers group
  spiritual: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80", // warm sunlight study/pray window room
  indonesianGeography: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&auto=format&fit=crop&q=80", // tropical mountains and lake
  lushNature: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80", // green forest path
  defaultEdu: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&auto=format&fit=crop&q=80" // bright educational classroom environment
};

// Maps a question to a 100% working, beautiful and relevant Unsplash image based on topic context
function getRelevantVerifiedUnsplashUrl(subject: string, questionText: string, materi: string, stimulusText: string, imagenPrompt: string = ""): string {
  const textToScan = `${subject} ${questionText} ${materi} ${stimulusText} ${imagenPrompt}`.toLowerCase();
  const subjectLower = (subject || "").toLowerCase();
  const isPjokAndSports = 
    subjectLower.includes("pjok") || 
    subjectLower.includes("jasmani") || 
    subjectLower.includes("olahraga") || 
    subjectLower.includes("penjas") || 
    textToScan.includes("penjasorkes") || 
    textToScan.includes("senam") || 
    textToScan.includes("jasmani");

  // For PJOK/Sports education, NEVER show real-life animal photographs or bedroom/classroom scenes even if the question mimics animal walks (e.g., "menirukan gerakan kucing/kelinci").
  // Physical education exercises belong on playgrounds, outdoor courts, or sports fields.
  if (isPjokAndSports) {
    if (textToScan.includes("bola") || textToScan.includes("sepak") || textToScan.includes("gawang") || textToScan.includes("futsal")) {
      return VERIFIED_UNSPLASH_IMAGE_POOL.soccer;
    }
    return VERIFIED_UNSPLASH_IMAGE_POOL.playing;
  }
  
  // 0a. PRE-CHECK FOR TEACHER INTERACTIONS & GREETINGS (Prioritized highly so meeting a teacher never shows forest or empty rooms)
  if (
    textToScan.includes("bertemu") || 
    textToScan.includes("menyapa") || 
    textToScan.includes("salam") || 
    textToScan.includes("sapa") || 
    textToScan.includes("berpapasan") ||
    textToScan.includes("koridor") || 
    textToScan.includes("berbincang") ||
    (textToScan.includes("guru") && (textToScan.includes("murid") || textToScan.includes("siswa") || textToScan.includes("anak") || textToScan.includes("andi") || textToScan.includes("budi") || textToScan.includes("cici") || textToScan.includes("dedi")))
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.schoolInteraction;
  }

  // 1. SPECIFIC ANIMALS & PETS (Differentiated cleanly)
  if (textToScan.includes("kucing") || textToScan.includes("cat")) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.cat;
  }
  if (textToScan.includes("anjing") || textToScan.includes("dog")) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.dog;
  }
  if (textToScan.includes("burung") || textToScan.includes("bird")) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.bird;
  }
  if (textToScan.includes("ikan") || textToScan.includes("fish")) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.fish;
  }
  if (textToScan.includes("kelinci") || textToScan.includes("rabbit")) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.rabbit;
  }
  if (
    textToScan.includes("hewan") || 
    textToScan.includes("binatang") || 
    textToScan.includes("margasatwa") || 
    textToScan.includes("ekosistem") ||
    textToScan.includes("lingkungan")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.lushNature; // General green nature/habitat scene for ecosystems or non-specific pets
  }

  // 2. SCHOOL ROOMS, CLASSROOMS, EDUCATION (PRIORITIZED to show beautiful neat classrooms, boards, or rooms)
  if (
    textToScan.includes("kelas") || 
    textToScan.includes("papan") || 
    textToScan.includes("guru") || 
    textToScan.includes("siswa") || 
    textToScan.includes("murid") || 
    textToScan.includes("belajar") || 
    textToScan.includes("sekolah") || 
    textToScan.includes("didik") ||
    textToScan.includes("ruangan") || 
    textToScan.includes("ruang kelas") ||
    textToScan.includes("meja") ||
    textToScan.includes("bangku")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.classroom;
  }

  // 3. INDONESIAN FLAG, NATIONAL SYMBOLS & CITIZENSHIP
  if (
    textToScan.includes("bendera") || 
    textToScan.includes("upacara") || 
    textToScan.includes("proklamasi") || 
    textToScan.includes("merdeka") || 
    textToScan.includes("pancasila") || 
    textToScan.includes("garuda") || 
    textToScan.includes("negara") || 
    textToScan.includes("pahlawan") || 
    textToScan.includes("indonesia") && textToScan.includes("merah putih")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.indonesiaFlag;
  }

  // 4. INDONESIAN CULTURE & TEMPLES
  if (
    textToScan.includes("candi") || 
    textToScan.includes("sejarah") || 
    textToScan.includes("borobudur") || 
    textToScan.includes("prambanan") || 
    textToScan.includes("budaya") || 
    textToScan.includes("adat") || 
    textToScan.includes("rumah adat") || 
    textToScan.includes("tradisional") || 
    textToScan.includes("suku")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.indonesianCulture;
  }

  // 5. BEDROOMS & STUDY ROOMS (specific domestic rooms rather than classroom)
  if (
    textToScan.includes("kamar") || 
    textToScan.includes("tidur") || 
    textToScan.includes("bedroom") || 
    textToScan.includes("bed") || 
    textToScan.includes("meja belajar") || 
    textToScan.includes("study room")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.spiritual;
  }

  // 6. BOOKS, READING, WRITING
  if (
    textToScan.includes("buku") || 
    textToScan.includes("baca") || 
    textToScan.includes("perpustakaan") || 
    textToScan.includes("dongeng") || 
    textToScan.includes("cerita") || 
    textToScan.includes("menulis") || 
    textToScan.includes("puisi") || 
    textToScan.includes("pantun") || 
    textToScan.includes("dialog") || 
    textToScan.includes("percakapan") || 
    textToScan.includes("tulis") || 
    textToScan.includes("novel")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.reading;
  }

  // 7. EXPERIMENTS, SCIENCE, IPAS DIAGRAMS
  if (
    textToScan.includes("eksperimen") || 
    textToScan.includes("percobaan") || 
    textToScan.includes("sains") || 
    textToScan.includes("ipas") || 
    textToScan.includes("laboratorium") || 
    textToScan.includes("fisika") || 
    textToScan.includes("kimia") || 
    textToScan.includes("biologi") || 
    textToScan.includes("organ") || 
    textToScan.includes("pencernaan") || 
    textToScan.includes("tulang") || 
    textToScan.includes("gaya magnet")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.science;
  }

  // 8. SOCCER & SPORTS FIELDS
  if (
    textToScan.includes("sepak bola") || 
    textToScan.includes("futsal") || 
    textToScan.includes("gawang") || 
    textToScan.includes("bola") && (textToScan.includes("tendang") || textToScan.includes("lapangan"))
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.soccer;
  }

  // 9. CLEANING, GARDENING, GOTONG ROYONG
  if (
    textToScan.includes("gotong") || 
    textToScan.includes("bersih") || 
    textToScan.includes("sapu") || 
    textToScan.includes("sampah") || 
    textToScan.includes("lap") || 
    textToScan.includes("kerja bakti") || 
    textToScan.includes("piket") || 
    textToScan.includes("royong") ||
    textToScan.includes("tanam") || 
    textToScan.includes("kebun") || 
    textToScan.includes("siram") || 
    textToScan.includes("pupuk") || 
    textToScan.includes("merawat tanaman")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.gotongRoyong;
  }

  // 10. SOCIAL INTERACTION & ACTIVE OUTDOOR GAMES (walking path and park - evaluated after school classrooms/animals)
  if (
    textToScan.includes("main") || 
    textToScan.includes("bermain") || 
    textToScan.includes("kelereng") || 
    textToScan.includes("lari") || 
    textToScan.includes("lompat") || 
    textToScan.includes("tali") || 
    textToScan.includes("senam") || 
    textToScan.includes("olah raga") || 
    textToScan.includes("jasmani") ||
    textToScan.includes("salam") || 
    textToScan.includes("sapa") || 
    textToScan.includes("bertemu") || 
    textToScan.includes("pagi") || 
    textToScan.includes("siang") || 
    textToScan.includes("sore") || 
    textToScan.includes("malam") || 
    textToScan.includes("gerbang") || 
    textToScan.includes("hello") || 
    textToScan.includes("greetings") || 
    textToScan.includes("morning") || 
    textToScan.includes("afternoon")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.playing;
  }

  // 11. FAMILY & HOME SECTOR
  if (
    textToScan.includes("keluarga") || 
    textToScan.includes("ibu") || 
    textToScan.includes("bapak") || 
    textToScan.includes("ayah") || 
    textToScan.includes("ortu") || 
    textToScan.includes("kakak") || 
    textToScan.includes("dapur") || 
    textToScan.includes("mencuci") || 
    textToScan.includes("memasak") || 
    textToScan.includes("rumah") || 
    textToScan.includes("bantu") || 
    textToScan.includes("membantu")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.family;
  }

  // 12. ART & DRAWING TOOLS (Paint, Brush, Colors - evaluated AFTER Animals/Pets check)
  if (
    textToScan.includes("lukis") || 
    textToScan.includes("menggambar") || 
    textToScan.includes("mewarnai") || 
    textToScan.includes("krayon") || 
    textToScan.includes("kesenian") || 
    textToScan.includes("seni rupa") || 
    textToScan.includes("seni musik") || 
    textToScan.includes("seni tari") || 
    textToScan.includes("pahat") || 
    textToScan.includes("origami") || 
    textToScan.includes("kuas lukis") || 
    textToScan.includes("alat musik") || 
    textToScan.includes("nyanyi")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.art;
  }

  // 13. MARKETS, SHOPPING, TRADING
  if (
    textToScan.includes("pasar") || 
    textToScan.includes("toko") || 
    textToScan.includes("warung") || 
    textToScan.includes("jual") || 
    textToScan.includes("beli") || 
    textToScan.includes("pedagang") || 
    textToScan.includes("transaksi") || 
    textToScan.includes("uang") || 
    textToScan.includes("koperasi")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.traditionalMarket;
  }

  // 14. SPACE & ASTRONOMY
  if (
    textToScan.includes("planet") || 
    textToScan.includes("bintang") || 
    textToScan.includes("tatasurya") || 
    textToScan.includes("matahari") || 
    textToScan.includes("bulan") || 
    textToScan.includes("astronomi") || 
    textToScan.includes("bumi") || 
    textToScan.includes("antariksa")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.astronomy;
  }

  // 15. HEALTHY FOOD, DIET
  if (
    textToScan.includes("buah") || 
    textToScan.includes("sayur") || 
    textToScan.includes("gizi") || 
    textToScan.includes("makanan") || 
    textToScan.includes(" vitamin") || 
    textToScan.includes("sehat") || 
    textToScan.includes("susu") || 
    textToScan.includes("makan") || 
    textToScan.includes("menu sehat")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.healthyDiet;
  }

  // 16. BICYCLES
  if (
    textToScan.includes("sepeda") || 
    textToScan.includes("bersepeda") || 
    textToScan.includes("naik sepeda")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.bicycling;
  }

  // 17. COMPUTERS & DIGITAL TOOLS
  if (
    textToScan.includes("komputer") || 
    textToScan.includes("ict") || 
    textToScan.includes("internet") || 
    textToScan.includes("laptop") || 
    textToScan.includes("digital") || 
    textToScan.includes("tablet") || 
    textToScan.includes("teknologi")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.computers;
  }

  // 18. SPIRITUALS, ETHICS, TEMPLES & MOSQUES
  if (
    textToScan.includes("agama") || 
    textToScan.includes("ibadah") || 
    textToScan.includes("sholat") || 
    textToScan.includes("berdoa") || 
    textToScan.includes("doa") || 
    textToScan.includes("iman") || 
    textToScan.includes("sopan") || 
    textToScan.includes("jujur") || 
    textToScan.includes("masjid") || 
    textToScan.includes("gereja")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.spiritual;
  }

  // 19. MAPS, GEOGRAPHY
  if (
    textToScan.includes("peta") || 
    textToScan.includes("atlas") || 
    textToScan.includes("geografi") || 
    textToScan.includes("gunung") || 
    textToScan.includes("laut") || 
    textToScan.includes("pantai") || 
    textToScan.includes("sungai") || 
    textToScan.includes("pulau") || 
    textToScan.includes("pemandangan")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.indonesianGeography;
  }

  // 20. LUSH FORESTS & NATURE (Only when explicitly mentioned)
  if (
    textToScan.includes("hutan") || 
    textToScan.includes("pohon") || 
    textToScan.includes("alam") || 
    textToScan.includes("reboisasi") || 
    textToScan.includes("lingkungan hidup") || 
    textToScan.includes("daun")
  ) {
    return VERIFIED_UNSPLASH_IMAGE_POOL.lushNature;
  }

  // 21. DEFAULT fall back to school bag/books general edu picture
  return VERIFIED_UNSPLASH_IMAGE_POOL.defaultEdu;
}

// Compiles strict constraints and professional personas for Indonesian SD subjects:
// Highly optimized to prevent subject spillover (e.g. math entering Pancasila/Bahasa Indonesia)
function getSubjectSpecificRules(subject: string, gradeClass: string): { rules: string; systemInstruction: string } {
  const subjectLower = (subject || "").toLowerCase();
  const classLower = (gradeClass || "").toLowerCase();
  const isFaseA = classLower.includes("kelas 1") || classLower.includes("kelas 2") || classLower.includes("fase a") || classLower.includes("kelas 1-2") || classLower.includes("fase-a");
  const isFaseB = classLower.includes("kelas 3") || classLower.includes("kelas 4") || classLower.includes("fase b") || classLower.includes("kelas 3-4") || classLower.includes("fase-b");
  const isFaseC = classLower.includes("kelas 5") || classLower.includes("kelas 6") || classLower.includes("fase c") || classLower.includes("kelas 5-6") || classLower.includes("fase-c");
  
  let rules = "";
  let systemInstruction = "Anda adalah pengembang instrumen asesmen SD di Indonesia yang ahli, guru kelas profesional, psikolog perkembangan anak, desainer visual, dan prompt engineer Imagen. Anda menerjemahkan rancangan kisi-kisi ujian menjadi naskah soal asli yang utuh, mendidik, berpijak sepenuhnya pada bahasa Indonesia murni yang SANGAT SEDERHANA, lugas, ramah anak, serta bebas dari kosakata asing atau serapan rumit, disesuaikan dengan tingkat kognitif dan kemampuan realistik anak kelas terkait.";

  // Rule 1: Subject Isolation (CRITICAL)
  rules += `
    ========================================================================
    ATURAN ISOLASI MATA PELAJARAN YANG SANGAT KETAT (MANDATORI):
    Anda membuat soal untuk Mata Pelajaran: **${subject}** (Kelas: ${gradeClass}).
    SANGAT DILARANG KERAS MENCAMPURADUKKAN materi, istilah khusus, rumus, atau konsep dari mata pelajaran lain!
  `;

  // Rule 1.2: Batasan Cakupan Fase dan Elemen (MANDATORI SEJAJAR):
  rules += `
    ========================================================================
    BATASAN MUTLAK CAKUPAN MATERI & TINGKAT KESULITAN BERDASARKAN FASE (MUTLAK):
    Anda WAJIB menganalisis Fase kognitif serta elemen rujukan sebelum membuat kisi-kisi atau butir soal. JANGAN PERNAH melampaui (overshoot) kemampuan perkembangan kognitif anak sesuai Kurikulum Merdeka!

    MATEMATIKA:
    1. FASE A (Kelas 1 & 2):
       - Elemen Bilangan: Angka/nilai tempat maks adalah 100 untuk membaca/menulis/membandingkan/mengurutkan dan menentukan nilai tempat. Sangat dianjurkan menggunakan kekayaan angka dari 1 sampai 99 secara bervariasi (SANGAT DILARANG hanya terpaku pada angka di bawah 50, rancanglah soal yang secara aktif mengeksplorasi rentang 50 sampai 99!). Operasi penjumlahan dan pengurangan porsi pemahaman dasar boleh bernilai antara 1 sampai 99 (terutama untuk kelas 2 yang sudah menguasai bilangan cacah sampai 99). DILARANG KERAS menggunakan bilangan ratusan (kecuali angka 100 tepat) atau ribuan (ratusan/ribuan mutlak dilarang di Fase A)!
       - Elemen Aljabar: Pola gambar/bilangan beralur konkrit yang SANGAT sederhana (seperti lompat 1 atau 2, atau pola berulang berseling).
       - Elemen Pengukuran: Satuan tidak baku (depa, jengkal, langkah kaki, buku, klip kertas).
       - Elemen Geometri: Mengenal lingkaran, segitiga, segi empat sederhana, kubus, balok, bola.
    2. FASE B (Kelas 3 & 4):
       - Elemen Bilangan: Angka/nilai tempat maksimal adalah 10.000. Operasi perkalian dan pembagian puluhan/ratusan dengan angka satuan sederhana. Pecahan senilai hanya pecahan sederhana (seperti 1/2, 1/3, 1/4, dsb). DILARANG menggunakan angka puluh ribuan atau ratus ribuan!
       - Elemen Aljabar: Pola gambar membesar/mengecil sederhana, kalimat terbuka dengan simbol kotak atau variabel kosong sederhana.
       - Elemen Pengukuran: Satuan baku (m, cm, kg, g, ml, liter) dan keliling/luas persegi, persegi panjang, serta segitiga.
       - Elemen Geometri: Sifat-sifat segitiga dan segi empat, dekomposisi bangun datar sederhana.
    3. FASE C (Kelas 5 & 6):
       - Elemen Bilangan: Angka/nilai tempat maksimal adalah 1.000.000. Operasi pecahan campuran, rasio, skala, dan bilangan bulat negatif (seperti suhu termometer atau kedalaman laut).
       - Elemen Pengukuran: Menghitung volume kubus/balok, keliling/luas daerah lingkaran, luas permukaan gabungan.
       - Elemen Geometri: Sifat jaring-jaring prisma, tabung, kerucut, limas, serta koordinat Kartesius sederhana.

    PENDIDIKAN PANCASILA:
    1. FASE A (Kelas 1 & 2): Nilai-nilai gotong royong konkrit, menaati aturan harian di rumah/sekolah, menyebutkan nama simbol sila (Bintang, Rantai, dsb).
    2. FASE B (Kelas 3 & 4): Makna lambang/simbol Pancasila, kewajiban piket kelas, hak mendapat nilai, batas wilayah administrasi lokal dari tempat tinggal (Kecamatan, Kelurahan, Kabupaten).
    3. FASE C (Kelas 5 & 6): Hak dan kewajiban sebagai warga negara, struktur kelembagaan NKRI tingkat daerah/provinsi, sikap toleransi multiculturalisme secara luas.

    BAHASA INDONESIA:
    1. FASE A (Kelas 1 & 2): Ejaan K-V-K-V, membaca lancar kalimat pendek 3-5 kata, huruf kapital di awal nama/kalimat, tanda titik.
    2. FASE B (Kelas 3 & 4): Gagasan pokok, watak tokoh dongeng fabel, membedakan fakta vs opini sederhana, tanda baca koma dan tanya.
    3. FASE C (Kelas 5 & 6): Menganalisis pesan moral tersembunyi hikayat/pantun nasihat, menyusun laporan ilmiah sederhana, kalimat efektif dan komparatif.

    IPAS:
    - FASE B (Kelas 3 & 4): Panca indera, siklus hidup/metamorfosis sederhana, gaya otot/magnet/gesek harian, keragaman sosial ekonomi lokal.
    - FASE C (Kelas 5 & 6): Organ pencernaan/pernapasan manusia, rantai makanan ekosistem, sejarah kerajaan di Nusantara.
  `;

  // Rule 2: ATURAN BAHASA DAN TINGKAT KESULITAN (KHUSUS ANAK KELAS 1-2 SD / FASE A) - MUTLAK
  if (isFaseA) {
    rules += `
    ⚠️⚠️ SYARAT MUTLAK BAHASA & TINGKAT KESULITAN UNTUK ANAK KELAS 1-2 SD / FASE A (MUTLAK):
    Siswa Kelas 1-2 SD (usia 7-8 tahun) baru belajar membaca lancar dan memiliki kemampuan kognitif dasar yang konkrit. Anda HARUS mematuhi ATURAN MUTLAK berikut:
    1. Gunakan kosakata yang SANGAT SEDERHANA dan kata-kata sehari-hari yang benar-benar akrab dipahami anak kecil usia 7-8 tahun. DILARANG menggunakan istilah rumit, kata abstrak bermakna luas, kata berkognisi tinggi, atau kata serapan asing teknis (seperti: mengklasifikasikan, mengidentifikasi, komponen, struktur, simbolis, representasi, strategis, dampak, hasil, menyimpulkan, hubungan, karakteristik, efisien, dsb). Ganti dengan kata yang biasa didengar anak (misal: "mengelompokkan" diganti "memilih/memisahkan", "mengidentifikasi" diganti "menunjukkan/menemukan", "komponen" diganti "bagian", "struktur" diganti "bentuk", "dampak" diganti "akibat", "menyimpulkan" diganti "menebak/mengisi").
    2. Kalimat pada soal, stimulus, maupun pilihan jawaban HARUS SANGAT PENDEK, LUGAS, dan LANGSUNG PADA INTINYA (maksimal 1-2 kalimat pendek sederhana). DILARANG bertele-tele, menggunakan penjelasan panjang lebar, atau menggunakan kalimat majemuk bertingkat yang berbelit-belit dan membingungkan!
    3. Gunakan konteks cerita/stimulus harian anak kecil yang sangat dekat dengan dunia mereka. Contoh: budi bermain bola di halaman, cici membantu ibu mencuci piring, andi menyiram bunga di kebun, rudi merapikan mainan bersama teman sebaya. DILARANG menyajikan skenario bisnis, analisis perkantoran, ekonomi makro, atau masalah orang dewasa lainnya.
    `;
  } else {
    rules += `
    ⚠️ SYARAT BAHASA DAN TINGKAT KESULITAN (KELAS 3-6 SD / FASE B & C):
    - Bahasa sederhana, lugas, ramah anak, bebas dari istilah asing/bahasa Inggris yang membingungkan.
    - Menggunakan konteks lokal harian yang bermakna bagi siswa SD.
    `;
  }

  // Rule 3: ATURAN RELEVANSI MUTLAK STIMULUS (MANDATORI)
  rules += `
    ⚠️⚠️ ATURAN RELEVANSI MUTLAK STIMULUS (MANDATORI SEJAJAR INDIKATOR KISI-KISI):
    Anda WAJIB menyesuaikan properti stimulus pada naskah soal dengan apa yang tertulis persis di Indikator Kisi-Kisi!
    1. JIKA Indikator menyebut "Disajikan tabel" atau "Disajikan data":
       - Anda WAJIB membuat tabel data menggunakan HTML murni di properti "stimulusText" (menggunakan tag <table>, <tr>, <th>, <td> yang ditata bersih dengan border abu-abu tipis solid, padding 4px-8px, warna background kepala tabel #f1f5f9, w-full, dan teks kontras tinggi). Jangan menulis teks paragraf biasa, harus berupa tabel!
    2. JIKA Indikator menyebut "Disajikan cerita" atau "Disajikan wacana" atau "Disajikan teks":
       - Anda WAJIB membuat narasi/cerita pendek, bermakna, dan 100% berkaitan dengan materi di properti "stimulusText" (maksimal 1-2 kalimat untuk Fase A).
    3. JIKA Indikator menyebut "Disajikan diagram" atau "Disajikan grafik":
       - Anda WAJIB menyajikan simulasi angka/data berupa tabel HTML fungsional yang rapi di properti "stimulusText".
    4. JIKA Indikator menyebut "Disajikan gambar" atau "Disajikan ilustrasi":
       - Barulah Anda WAJIB mengisi properti "imagePrompt" / "imagenPrompt" dengan deskripsi gambar.
       
    ⚠️⚠️ KHUSUS PROMPT GAMBAR (PENCEGAHAN HALUSINASI, MISMATCH, & RELEVANSI VISUAL MUTLAK):
    Untuk butir soal yang dipasangkan stimulus gambar (baik "Disajikan gambar" maupun "Disajikan ilustrasi"), deskripsi properti "imagePrompt" / "imagenPrompt" WAJIB 100% selaras secara logis, literal, dan semantis dengan kejadian spesifik, tokoh, objek, latar tempat, dan masalah yang ditulis dalam "questionText" dan "stimulusText"!
    
    1. DILARANG KERAS MENYALIKAN CONTOH ACAK/GENERIK ATAU MENGHASILKAN GAMBAR YANG TIDAK NYAMBUNG.
       - Jika soal menceritakan "murid bertemu dengan ibu guru di koridor sekolah", gambarnya HARUS menampilkan interaksi murid menyapa dengan sopan seorang guru perempuan di koridor sekolah yang bersih. DILARANG KERAS malah menampilkan gambar anak-anak bermain di hutan.
       - Jika soal menanyakan "nama ruangan sekolah" (misalnya ruang kelas, perpustakaan, atau ruang guru), gambar HARUS memperlihatkan ruangan tersebut dari sudut pandang yang jelas sesuai materi. DILARANG menampilkan benda acak seperti tas sekolah kecuali jika tas tersebut memang ditanyakan.
       - Jika soal menanyakan "warna atau bentuk seekor kucing" (misalnya warna kucing hitam, putih, atau oranye), gambar HARUS memperlihatkan kucing tersebut secara dominan dan jelas dengan warna yang dimaksud di dalam kelas atau di teras rumah. DILARANG menampilkan kuas dan kaleng cat jika yang ditanyakan adalah kucing hidup!
    2. Tulis seluruh deskripsi prompt gambar dalam Bahasa Inggris secara mendetail dan berkualitas tinggi, fokus pada apa yang ingin disampaikan oleh soal agar siswa terbantu secara visual.
    3. Pilih salah satu pola gaya visual berikut yang paling sesuai dengan kebutuhan soal:
       - Gaya Animasi 3D Pixar (Sangat cocok untuk aktivitas manusia, sosial, pancasila, olahraga, bahasa, dsb): "A premium high-contrast 3D digital illustration in cute Pixar and Disney animation aesthetic, claymation style, clay render. [deskripsi detail pelaku/objek sesuai naskah soal, misal: a cheerful Indonesian schoolboy helping his friend], wearing pristine Indonesian elementary school uniform, showing [tindakan persis di dalam soal], located in [lokasi spesifik sesuai cerita soal], vibrant saturated colors, warm soft volumetric lighting, raytraced soft shadows, polished clay and plastic textures, no text, no watermark, perfectly detailed."
       - Gaya 3D Clay Render Terisolasi (Sangat cocok untuk hitung kelereng, buah-buahan, hewan tunggal, benda tunggal): "Cute 3D clay render, Pixar styled 3D model of [objek konkrit/hewan persis seperti di soal, misal: a cute fluffy orange cat sitting on a rug], isolated on a solid clean white background, vibrant colors, soft shadows, polished clay textures, no text, no watermark, 8k."
  `;

  if (subjectLower.includes("pancasila") || subjectLower.includes("pkn") || subjectLower.includes("kewarganegaraan")) {
    rules += `
    Mata pelajaran Pendidikan Pancasila:
    - FOKUS UTAMA HANYA pada pemahaman nilai-nilai Pancasila, simbol sila Pancasila (Bintang, Rantai, Pohon Beringin, Kepala Banteng, Padi & Kapas), lambang negara Garuda Pancasila, hak dan kewajiban anak di rumah/sekolah/masyarakat, aturan keluarga dan sekolah, keragaman budaya/suku/agama (Bhinneka Tunggal Ika), gotong royong, musyawarah mufakat, persatuan kesatuan, dan rasa cinta tanah air (NKRI).
    - JANGAN PERNAH menyisipkan soal berhitung matematika (seperti perkalian barang secara numerik, luas/keliling, atau hitung penjumlahan belanjaan rumit). JANGAN mencampuradukkan dengan sains/IPAS (seperti rantai makanan hewan, organ tubuh manusia, pelestarian lingkungan biologis).
    - JANGAN menyisipkan soal analisis tata bahasa Indonesia asli (seperti mencari ide pokok paragraf, struktur S-P-O-K, atau menulis puisi).
    - ATURAN ISOLASI MATERI MUTLAK: JANGAN PERNAH memasukkan soal yang mengandung unsur hitu-hitungan penjumlahan, pengurangan, uang belanjaan, atau konsep nomor matematika lain. Soal Pendidikan Pancasila wajib murni mengukur perilaku rukun, gotong royong, aturan rumah/sekolah, atau bodi simbol negara.
    - Gambar/SVG yang direncanakan harus RELEVAN dengan Pendidikan Pancasila: Bendera merah putih, simbol Garuda Pancasila, lambang sila ke-4 (kepala banteng), sila ke-3 (pohon beringin), anak bergotong-royong menyapu kelas, musyawarah kelompok dengan rukun, dsb.
    `;
    
    systemInstruction = `ANDA ADALAH SISTEM GENERATOR SOAL DAN GAMBAR KHUSUS MATA PELAJARAN PENDIDIKAN PANCASILA JENJANG SD DI INDONESIA.
 
 TUGAS UTAMA:
 Membuat soal Pendidikan Pancasila SD beserta gambar/SVG stimulus yang benar-benar relevan dengan isi soal, tingkat kelas, dan materi Pendidikan Pancasila (Pancasila, UUD 1945, Bhinneka Tunggal Ika, NKRI).
 
 ATURAN PALING PENTING:
 - DILARANG keras mencampurkan materi Matematika (berhitung, kalkulasi angka), sains/IPAS (biologi hewan/tumbuhan, geografi alam), atau analisis bahasa murni ke dalam soal Pendidikan Pancasila. Soal Pendidikan Pancasila tidak boleh menyuruh menghitung jumlah kelereng, penjumlahan matematika, nilai mata uang, atau organ tumbuhan.
 - Fokus utama hanya pada pemahaman nilai luhur Pancasila, sila pancasila, gotong royong, aturan rumah/sekolah, serta hak dan kewajiban anak.
 - GAMBAR/SVG HARUS benar-benar relevan dengan Pendidikan Pancasila: bodi simbol sila, anak gotong royong dengan lap/sapu di sekolah, anak berdiskusi mengacungkan tangan ramah, upacara bendera merah putih, pakaian adat dari berbagai daerah di Indonesia.
 - GUNAKAN seragam SD Indonesia (kemeja putih, celana/rok merah) untuk karakter anak-anak SD.`;
  }
  else if (subjectLower.includes("indonesia") || subjectLower.includes("bhs") || subjectLower.includes("bahasa")) {
    rules += `
    Mata pelajaran Bahasa Indonesia:
    - FOKUS UTAMA HANYA pada kemampuan berbahasa dan bersastra: membaca pemahaman teks cerita/dongeng, mengidentifikasi tokoh dan watak fabel, menentukan gagasan utama/ide pokok paragraf, melengkapi kalimat rumpang, pantun anak, puisi anak, dialog/percakapan drama, penggunaan huruf kapital, tanda baca, konjungsi, kalimat tanya/perintah, makna kamus kosakata, dan struktur pola S-P-O-K.
    - SANGAT DILARANG memasukkan soal berhitung matematika, sains/IPAS (seperti proses pernapasan, metamorfosis serangga, siklus air), atau teori hukum PKN/Pancasila.
    - Semua stimulus (puisi, pantun, cerita pengalaman, dongeng hewan fabel, dialog percakapan) hanya boleh digunakan untuk menilai kecakapan membaca pemahaman atau kaidah kebahasaan.
    
    ATURAN VARIASI STIMULUS (MANDATORI - AGAR TIDAK MONOTON):
    Untuk menghasilkan asesmen yang menarik, interaktif, dan tidak monoton bagi siswa SD, Anda WAJIB memvariasikan bentuk STIMULUS dalam indikator soal secara bergantian sesuai materi dan jenjang kelas:
      1. "Disajikan sebait PUISI anak..." (bertema keindahan alam, persahabatan, kasih sayang orang tua, atau lingkungan).
      2. "Disajikan bait PANTUN nasihat/pantun anak..." (menguji pemahaman amanat pantun, ciri-ciri pantun, rima rupa, atau baris isi).
      3. "Disajikan sepenggal cerita DONGENG/FABEL fiksi..." (watak tokoh hewan lucu, pesan moral tersembunyi, konflik cerita pendek).
      4. "Disajikan paragraf CERITA PENGALAMAN sehari-hari..." (pengalaman bermain layangan, membantu ibu, piket kelas, liburan sederhana).
      5. "Disajikan teks DIALOG/PERCAKAPAN singkat antara dua siswa..." (topik kebersihan kelas, kerja kelompok, melatih pemahaman intonasi/kalimat langsung).
      6. "Disajikan DIAGRAM GAGASAN UTAMA (mind-map) sederhana..." (bagan pohon atau awan ide pokok, melatih struktur membaca terarah).
      7. "Disajikan ILUSTRASI GAMBAR lingkungan/aktivitas anak..." (menganalisis unsur intrinsik, membuat kalimat deskriptif baru).
    `;

    systemInstruction = `ANDA ADALAH SISTEM GENERATOR SOAL DAN GAMBAR KHUSUS MATA PELAJARAN BAHASA INDONESIA JENJANG SD DI INDONESIA.

TUGAS UTAMA:
Membuat soal Bahasa Indonesia SD beserta gambar stimulus yang benar-benar relevan dengan isi soal, tingkat kelas, dan tujuan pembelajaran Bahasa Indonesia.

ATURAN PALING PENTING:
- DILARANG mencampurkan materi IPAS ekonomi/sains, Matematika numerik murni, Pendidikan Pancasila kenegaraan murni, atau mata pelajaran lain ke dalam soal Bahasa Indonesia.
- Fokus utama soal hanya pada kemampuan Bahasa Indonesia: membaca, memahami teks cerita, mengukur kosakata, menyusun kalimat, ide pokok paragraf, tokoh, pesan moral, puisi/pantun, dialog, menyimak, dan penggunaan ejaan bahasa yang baik.

SISTEM WAJIB MEMASTIKAN:
- Isi soal hanya mengukur kemampuan Bahasa Indonesia.
- Gambar hanya mendukung konteks Bahasa Indonesia: seorang anak membaca buku cerita, perpustakaan, guru bercerita dongeng di depan kelas, anak menulis surat/pantun, diagram awan mindmap ide pokok, gambar kartun kelinci atau hewan fabel lucu.
- Jangan membuat soal berhitung, sains biologis rumit, atau analisis numerik.

ATURAN VISUAL GAMBAR:
SEMUA GAMBAR WAJIB:
- menampilkan anak SD Indonesia, usia anak-anak, bukan orang dewasa.
- menggunakan seragam SD Indonesia: kemeja putih kancing, celana/rok merah hati.
- wajah anak SD yang ceria, proporsional, suasana sekolah Indonesia asli.`;
  }
  else if (subjectLower.includes("matematik") || subjectLower.includes("calc")) {
    rules += `
    Mata pelajaran Matematika:
    - FOKUS UTAMA HANYA pada operasi hitung penjumlahan, pengurangan, perkalian, pembagian bilangan cacah, pecahan biasa/desimal/persen, bangun datar (luas dan keliling), bangun ruang (volume kubus/balok), sudut geometri, grafik tabel data, dsb.
    - JANGAN menyisipkan soal Pendidikan Pancasila (nilai sila, gotong royong) atau analisis sastra ejaan bahasa Indonesia murni. Gunakan kalimat cerita pendek hanya sebagai pengantar numerasi kontekstual (soal cerita).
    - Gambar/SVG yang diproduksi wajib berupa diagram bentuk matematika presisi tinggi: pecahan lingkaran kue/pie, bangun datar segitiga dengan label sudut, bangun ruang kubus kubus transparan, dsb.
    `;

    systemInstruction = `ANDA ADALAH SISTEM GENERATOR SOAL DAN GAMBAR KHUSUS MATA PELAJARAN MATEMATIKA JENJANG SD DI INDONESIA.

TUGAS UTAMA:
Membuat soal Matematika SD beserta diagram gambar SVG matematika yang 100% presisi, terukur, dan bermakna edukatif untuk materi bilangan, geometri, atau statistika.

ATURAN PALING PENTING:
- DILARANG mencampurkan konsep Pendidikan Pancasila, sains ekologi/biologi IPAS, atau analisis tata bahasa murni ke dalam soal Matematika.
- Fokus utama hanya pada operasi aritmatika, penalaran kuantitatif matematika, geometri dasar, dan pengolahan data.
- SANGAT DIANJURKAN menyuplai svgContent dengan bentuk visual presisi (pecahan lingkaran arsir biru, bangun datar jajar genjang bersudut, dsb).`;
  }
  else if (subjectLower.includes("ipas") || subjectLower.includes("ipa") || subjectLower.includes("ips") || subjectLower.includes("sains")) {
    rules += `
    Mata pelajaran Ilmu Pengetahuan Alam dan Sosial (IPAS):
    - FOKUS UTAMA HANYA pada materi panca indera, bagian tubuh hewan/tumbuhan, perkembangbiakan, rantai makanan, kelestarian lingkungan, siklus daur air, gaya dan energi magnet/gesek/gravitasi, wujud zat dan perubahannya, peta geografi Indonesia, peninggalan kerajaan sejarah, keragaman sosial ekonomi, dsb.
    - JANGAN menyisipkan soal berhitung matematika murni (aritmatika tanpa konteks ipas), lambang sila pancasila murni, atau kaidah analisis sosiolinguistik bahasa indonesia murni.
    - Gambar/SVG harus berupa diagram sains/sosial yang indah dan akurat: misalnya bentuk rantai makanan berarah panah, struktur penampang daun, peta sketsa daerah, candi peninggalan sejarah dsb.
    `;

    systemInstruction = `ANDA ADALAH SISTEM GENERATOR SOAL DAN GAMBAR KHUSUS MATA PELAJARAN IPAS JENJANG SD DI INDONESIA.

TUGAS UTAMA:
Membuat soal IPAS SD beserta ilustrasi gambar/diagram sains atau kemanusiaan daerah yang 100% akurat, berbobot ilmiah sederhana, dan ramah anak.

ATURAN PALING PENTING:
- DILARANG mencampurkan perhitungan rumus matematika rumit tanpa konsep sains, teori ketatanegaraan murni, atau linguistik bahasa murni ke dalam soal IPAS.
- Fokus utama pada observasi alam, proses sains dasar, hubungan makhluk hidup dengan ekosistem, sejarah perjuangan pahlawan lokal, serta peta bentang alam.
- Harus menyajikan diagram berupa tabel HTML bila diminta diagram/grafik data.
- Ilustrasi/SVG harus mendukung fakta sains (siklus hidup hewan, bagian tanaman, organ pencernaan dsb).`;
  }
  else if (subjectLower.includes("pjok") || subjectLower.includes("jasmani") || subjectLower.includes("olahraga") || subjectLower.includes("penjas")) {
    rules += `
    Mata Pelajaran PJOK (Pendidikan Jasmani, Olahraga, dan Kesehatan) - Khususnya Kelas 4 SD:
    
    1. PERAN UTAMA:
       Anda bertindak sebagai: Ahli asesmen pendidikan Indonesia, penyusun kisi-kisi profesional, guru PJOK SD, ahli perkembangan peserta didik SD, desainer visual edukasi, dan prompt engineer Imagen.
    
    2. TUJUAN UTAMA:
       Soal yang Anda hasilkan wajib:
       - Sesuai indikator soal pada kisi-kisi, sesuai level kognitif, sesuai materi, sesuai bentuk stimulus, sesuai tingkat kelas.
       - GAMBAR HARUS RELEVAN DENGAN STIMULUS, dan TIDAK SEMUA SOAL HARUS BERGAMBAR.
    
    3. ATURAN PALING PENTING: JANGAN MEMBUAT SEMUA SOAL BERGAMBAR
       - AI WAJIB membaca terlebih dahulu bagian indikator soal, bentuk stimulus, dan konteks kisi-kisi.
       - Jika kisi-kisi hanya meminta: pertanyaan langsung, pernyataan, narasi, tabel HTML, dialok/percakapan, data, atau teks pendek biasa, MAKA JANGAN membuat gambar (kosongkan properti 'imagePrompt', 'imagenPrompt', 'imageUrl', dan 'svgContent').
       - GAMBAR HANYA DIGUNAKAN JIKA: indikator secara jelas membutuhkan observasi visual, stimulus berupa gambar/kegiatan/gerakan fisik, siswa perlu melihat gambar untuk menjawab soal, atau materi memang membutuhkan demonstrasi visual teknik gerakan olahraga.
    
    4. ANALISIS KISI-KISI WAJIB SEBELUM MEMBUAT SOAL:
       - Identifikasi apakah stimulus memerlukan gambar atau tidak sesuai indikator. Jangan tambahkan gambar jika tidak diperlukan!
       - Contoh 1 (TIDAK PERLUGAMBAR): Indikator meminta "Disajikan pertanyaan langsung tentang konsep dasar pengantar menggiring bola sepak bola." -> Stimulus teks saja, TIDAK butuh gambar.
       - Contoh 2 (YA PERLU GAMBAR): Indikator meminta "Peserta didik dapat menentukan gerakan menggiring bola yang benar berdasarkan gambar aktivitas." -> Stimulus harus ada gambar teknik spesifik (menggiring bola dengan kaki bagian dalam).
    
    5. HUBUNGAN STIMULUS DAN GAMBAR:
       - Jika stimulus berupa gambar, gambar harus membantu siswa menjawab soal, bukan sekadar dekorasi/hiasan acak.
       - Gambar harus relevan dengan indikator, materi, pertanyaan, dan pilihan jawaban.
    
    6. KESESUAIAN TEKNIK OLAHRAGA (SANGAT KRUSIAL):
       - Teknik gerakan olahraga yang digambarkan HARUS BENAR secara anatomis dan taktis. Contoh: posisi menggiring bola kaki bagian dalam (posisi kaki, arah pandangan, posisi tubuh, keseimbangan, perkenaan kaki dengan bola) harus benar. Jangan buat pose olahraga yang salah!
    
    7. PENYESUAIAN LEVEL KELAS 4 SD:
       - Gunakan bahasa sederhana, singkat, aktivitas fisik nyata siswa sehari-hari, observasi sederhana, pemecahan masalah ringan, dan pemahaman konsep dasar. Hindari istilah terlalu teknis teoritis or narasi yang terlalu panjang bertele-tele.
    
    8. ANTI PENGULANGAN (VARIASI):
       - Jangan mengulang nama orang, tempat, jenis gerakan olahraga, pola soal, atau sudut kamera yang sama secara beruntun. Kerahkan variasi gerakan olahraga, situasi permainan, posisi kamera, dan nama siswa SD.
    `;

    systemInstruction = `ANDA ADALAH GURU PJOK DAN AHLI ASESMEN SD KELAS 4 DI INDONESIA SERTA PROMPT ENGINEER IMAGEN PROFESSIONAL.

TUGAS UTAMA ANDA:
Membuat soal PJOK SD Kelas 4 yang sangat presisi sesuai indikator kisi-kisi, dengan aturan ketat mengenai penggunaan gambar stimulus yang relevan dan akurat.

ATURAN UTAMA PENGGUNAAN GAMBAR:
- JANGAN MEMBUAT SEMUA SOAL BERGAMBAR! Evaluasi indikator terlebih dahulu. Hanya buat gambar (di properti 'imagenPrompt' & 'imagePrompt') jika indikator soal menuntut observasi visual gerak olahraga.
- Jika tidak butuh gambar, pastikan properti 'imagenPrompt', 'imagePrompt', 'imageUrl', dan 'svgContent' murni KOSONG.

STANDAR PROMPT IMAGEN (GAYA ANIMASI 3D PIXAR):
Bila soal memang membutuhkan gambar pendukung, rancang prompt dalam bahasa Inggris yang SANGAT DETAIL dengan pola format wajib berikut:
“A premium high-contrast 3D digital illustration in cute Pixar and Disney animation aesthetic, claymation style, clay render of [deskripsi detail gerakan teknik olahraga spesifik oleh siswa SD Indonesia], authentic Indonesian elementary school sports field, vibrant saturated colors, warm soft volumetric lighting, raytraced soft shadows, polished clay textures, correct posture and sports technique, no text, no watermark, no distortion.”

PASTIKAN:
- Seragam olahraga yang dikenakan adalah kaos olahraga SD Indonesia yang sopan, rapi, dan cerah.
- Postur tubuh, perkenaan bola, kaki, tangan, arah mata, dan keseimbangan olahraga harus 100% BENAR secara konsep PJOK olahraga.`;
  }
  else {
    rules += `
    Mata pelajaran khusus ${subject}:
    - Fokuslah sepenuhnya hanya pada konten materi, practional dasar, dan nilai luhur yang relevan dengan ${subject}. JANGAN menyusupkan soal penjumlahan matematika dasar berpola rumit, lambang kenegaraan murni, maupun tata bahasa yang tidak sejalan dengan tujuan esensial pelajaran ${subject}!
    `;
  }

  rules += `
    - Pastikan semua naskah stimulus, pertanyaan, serta pilihan jawaban beralur logis, sederhana, ramah anak, dan bebas dari kata asing Inggris.
    ========================================================================
  `;

  return { rules, systemInstruction };
}

// Determines if a question has a narrative story/text/reading comprehension stimulus,
// which must remain strictly as text without forced visual illustrations/mismatch photos.
function isQuestionAStoryInServer(q: any): boolean {
  if (!q) return false;
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
    text.includes("penggalan cerita") ||
    text.includes("wacana") ||
    text.includes("pantun") ||
    text.includes("dongeng");
    
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

// Redistributes the designated illustrated questions strictly following user intent:
// 1. Spanned/distributed across multiple question types (not all in Pilihan Ganda).
// 2. Multiple Choice (Pilihan Ganda) MUST have MORE illustrated questions than other question types.
// 3. Ensuring target image count is exactly satisfied.
async function adjustAndNormalizeIllustratedQuestions(questions: any[], targetCount: number, subject: string, visualIndices?: Set<number>, userApiKey?: string): Promise<any[]> {
  if (questions.length === 0) return questions;

  // Track each question item with its initial "illustrated score" based on model-generated attributes
  const analyzedQuestions = questions.map((q, idx) => {
    let hasIllustration = false;
    if (q.svgContent && q.svgContent.trim().length > 0 && q.svgContent.includes("<svg")) {
      hasIllustration = true;
    } else if (q.imageUrl && q.imageUrl.trim().length > 0) {
      hasIllustration = true;
    } else if (q.imagenPrompt && q.imagenPrompt.trim().length > 0) {
      hasIllustration = true;
    }

    let isMathShapes = false;
    const isMath = subject.toLowerCase().includes("matematik");
    const labelLower = ((q.materi || "") + " " + (q.questionText || "")).toLowerCase();
    if (isMath && (labelLower.includes("pecahan") || labelLower.includes("bangun") || labelLower.includes("segitiga") || labelLower.includes("persegi") || labelLower.includes("luas") || labelLower.includes("keliling") || labelLower.includes("diagram") || labelLower.includes("grafik"))) {
      isMathShapes = true;
    }

    return {
      index: idx,
      question: q,
      originalType: q.questionType || "Pilihan Ganda",
      hasIllustration,
      isMathShapes
    };
  });

  const finalIllustratedIndices = new Set<number>(visualIndices || []);
  if (finalIllustratedIndices.size === 0) {
    analyzedQuestions.forEach(aq => {
      if (aq.hasIllustration || aq.isMathShapes) {
        finalIllustratedIndices.add(aq.index);
      }
    });
  }

  // Map back and apply perfect, error-free images to designated items, and wipe from undesignated items
  const processedQuestions = [];
  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    const cpQ = { ...q };
    const labelLower = ((cpQ.materi || "") + " " + (cpQ.questionText || "") + " " + (cpQ.stimulusText || "")).toLowerCase();
    
    // Ensure all question numbers match index
    cpQ.number = idx + 1;

    if (finalIllustratedIndices.has(idx)) {
      const isMath = subject.toLowerCase().includes("matematik");
      const isMathFraction = isMath && (labelLower.includes("pecahan") || labelLower.includes("setengah") || labelLower.includes("seperempat") || labelLower.includes("sepertiga"));
      const isMathShapesDetail = isMath && (labelLower.includes("segitiga") || labelLower.includes("sudut") || labelLower.includes("persegi") || labelLower.includes("luas") || labelLower.includes("keliling") || labelLower.includes("lapangan") || labelLower.includes("bangun datar"));
      const isIpasDiagram = subject.toLowerCase().includes("ipas") && (labelLower.includes("rantai") || labelLower.includes("siklus") || labelLower.includes("tulang") || labelLower.includes("daun") || labelLower.includes("alir") || labelLower.includes("organ"));
      const hContent = q.svgContent && q.svgContent.trim().length > 0 && q.svgContent.toLowerCase().includes("<svg");
      const pmt = cpQ.imagenPrompt || cpQ.imagePrompt || "";
      const isPhotoEligible = (pmt && pmt.trim().length > 0);

      // A question is truly visual only if it is a math shape, IPAS diagram, has explicit SVG, or has a planned visual photo prompt, AND is NOT a narrative script/story
      const isTrulyVisual = (isMathFraction || isMathShapesDetail || isIpasDiagram || hContent || isPhotoEligible) && !isQuestionAStoryInServer(cpQ);

      if (isTrulyVisual) {
        // Guarantee it has a premium command text prefix at the beginning of question or stimulus
        const visualPrefix = "**Perhatikan gambar berikut!**\n";
        
        if (cpQ.stimulusText && cpQ.stimulusText.trim().length > 0) {
          if (!cpQ.stimulusText.includes("Perhatikan gambar")) {
            cpQ.stimulusText = visualPrefix + cpQ.stimulusText;
          }
        } else {
          if (!cpQ.questionText.includes("Perhatikan gambar")) {
            cpQ.questionText = visualPrefix + cpQ.questionText;
          }
        }

        // 1. Math shapes: Keep or make gorgeous SVGs if applicable (highly reliable)
        if (isMath && (labelLower.includes("pecahan") || labelLower.includes("setengah") || labelLower.includes("seperempat") || labelLower.includes("sepertiga")) && (!cpQ.svgContent)) {
          // High quality mathematical fraction circle illustration
          let pieces = 4;
          let shaded = 1;
          if (labelLower.includes("setengah") || labelLower.includes("1/2") || labelLower.includes("2/4")) { pieces = 4; shaded = 2; }
          else if (labelLower.includes("sepertiga") || labelLower.includes("1/3")) { pieces = 3; shaded = 1; }
          else if (labelLower.includes("seperempat") || labelLower.includes("1/4")) { pieces = 4; shaded = 1; }

          let pathSegments = "";
          if (pieces === 4) {
            if (shaded >= 1) pathSegments += `<path d="M 60 10 A 50 50 0 0 1 110 60 L 60 60 Z" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2"/>`;
            if (shaded >= 2) pathSegments += `<path d="M 110 60 A 50 50 0 0 1 60 110 L 60 60 Z" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2"/>`;
            if (shaded >= 3) pathSegments += `<path d="M 60 110 A 50 50 0 0 1 10 60 L 60 60 Z" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2"/>`;
            if (shaded >= 4) pathSegments += `<path d="M 10 60 A 50 50 0 0 1 60 10 L 60 60 Z" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2"/>`;
          } else {
            // Default 3 pieces fraction
            pathSegments += `<path d="M 60 10 A 50 50 0 0 1 103 85 L 60 60 Z" fill="#93c5fd" stroke="#1e3a8a" stroke-width="2"/>`;
          }

          cpQ.svgContent = `<svg viewBox="0 0 120 120" style="max-width: 120px; display: block; margin: 10px auto;">
            <circle cx="60" cy="60" r="50" stroke="#1e3a8a" stroke-width="3" fill="none"/>
            ${pathSegments}
            <line x1="60" y1="10" x2="60" y2="110" stroke="#1e3a8a" stroke-width="2" stroke-dasharray="2,2"/>
            <line x1="10" y1="60" x2="110" y2="60" stroke="#1e3a8a" stroke-width="2" stroke-dasharray="2,2"/>
            <text x="60" y="65" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e3a8a" text-anchor="middle">Matematika</text>
          </svg>`;
          cpQ.imageUrl = "";
        } 
        else if (isMath && (labelLower.includes("segitiga") || labelLower.includes("sudut")) && (!cpQ.svgContent)) {
          cpQ.svgContent = `<svg viewBox="0 0 120 100" style="max-width: 120px; display: block; margin: 10px auto;">
            <polygon points="20,80 100,80 20,20" fill="#eff6ff" stroke="#1e3a8a" stroke-width="3"/>
            <rect x="20" y="70" width="10" height="10" fill="none" stroke="#1e3a8a" stroke-width="1.5"/>
            <text x="12" y="85" font-size="10" font-family="sans-serif" font-weight="bold" fill="#1e3a8a">A</text>
            <text x="105" y="85" font-size="10" font-family="sans-serif" font-weight="bold" fill="#1e3a8a">B</text>
            <text x="15" y="15" font-size="10" font-family="sans-serif" font-weight="bold" fill="#1e3a8a">C</text>
            <text x="35" y="65" font-size="9" font-weight="bold" fill="#ef4444">90°</text>
          </svg>`;
          cpQ.imageUrl = "";
        }
        else if (isMath && (labelLower.includes("persegi") || labelLower.includes("luas") || labelLower.includes("keliling") || labelLower.includes("lapangan") || labelLower.includes("bangun datar")) && (!cpQ.svgContent)) {
          cpQ.svgContent = `<svg viewBox="0 0 150 100" style="max-width: 150px; display: block; margin: 10px auto;">
            <rect x="15" y="15" width="120" height="70" fill="#eff6ff" stroke="#1e3a8a" stroke-width="3"/>
            <text x="75" y="10" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e3a8a" text-anchor="middle">Sisi Panjang</text>
            <text x="140" y="55" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e3a8a" text-anchor="start">Sisi Lebar</text>
            <text x="75" y="55" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ef4444" text-anchor="middle">Bangun Datar</text>
          </svg>`;
          cpQ.imageUrl = "";
        }
        
        // 2. Science / IPAS diagram: Make a wonderful clear SVG diagram if it is a diagram-driven topic
        else if (subject.toLowerCase().includes("ipas") && (labelLower.includes("rantai") || labelLower.includes("siklus") || labelLower.includes("tulang") || labelLower.includes("daun") || labelLower.includes("alir") || labelLower.includes("organ")) && (!cpQ.svgContent)) {
          if (labelLower.includes("rantai")) {
            cpQ.svgContent = `<svg viewBox="0 0 200 100" style="max-width: 200px; display: block; margin: 10px auto;">
              <rect x="10" y="35" width="40" height="30" rx="5" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
              <text x="30" y="53" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="bold" fill="#16a34a">Tumbuhan</text>
              <text x="30" y="62" font-family="sans-serif" font-size="7" text-anchor="middle" fill="#16a34a">(Produsen)</text>
              
              <path d="M 55 50 L 75 50" fill="none" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow)"/>
              
              <rect x="80" y="35" width="40" height="30" rx="5" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
              <text x="100" y="53" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="bold" fill="#dc2626">Belalang</text>
              <text x="100" y="62" font-family="sans-serif" font-size="7" text-anchor="middle" fill="#dc2626">(Konsumen I)</text>
              
              <path d="M 125 50 L 145 50" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" marker-end="url(#arrow)"/>
              
              <rect x="150" y="35" width="40" height="30" rx="5" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
              <text x="170" y="53" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="bold" fill="#2563eb">Katak</text>
              <text x="170" y="62" font-family="sans-serif" font-size="7" text-anchor="middle" fill="#2563eb">(Konsumen II)</text>
              
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#374151" />
                </marker>
              </defs>
            </svg>`;
            cpQ.imageUrl = "";
          } else {
            cpQ.svgContent = `<svg viewBox="0 0 150 100" style="max-width: 150px; display: block; margin: 10px auto;">
              <circle cx="75" cy="50" r="35" fill="#fdf2f8" stroke="#db2777" stroke-width="3" stroke-dasharray="3,3"/>
              <text x="75" y="45" font-family="sans-serif" font-size="10" font-weight="bold" fill="#db2777" text-anchor="middle">Siklus Hidup</text>
              <text x="75" y="60" font-family="sans-serif" font-size="9" fill="#db2777" text-anchor="middle">Makhluk Hidup</text>
            </svg>`;
            cpQ.imageUrl = "";
          }
        }

        // 3. Keep custom visual SVG content if it was specifically generated by the model
        else if (q.svgContent && q.svgContent.trim().length > 0 && q.svgContent.toLowerCase().includes("<svg")) {
          cpQ.svgContent = q.svgContent;
          cpQ.imageUrl = "";
        }

        // 4. For all other designated questions, or if we need a gorgeous photo, pre-generate with Imagen, falling back to verified Unsplash
        else {
          // Clear SVG so it relies strictly on our 100% verified real Unsplash image URL or newly generated Imagen!
          cpQ.svgContent = "";
          let generatedBytes = null;
          if (pmt && pmt.trim().length > 0) {
            try {
              // Elaborate and translate prompt via Gemini before calling Google Imagen
              const elaboratedPmt = await translateAndElaboratePromptForImagen(subject, cpQ, pmt, userApiKey);
              console.log(`[Batch Precompile Imagen No. ${cpQ.number}] elaborated prompt: ${elaboratedPmt}`);
              generatedBytes = await generateImagenImage(elaboratedPmt, 1, userApiKey);
              if (generatedBytes) {
                cpQ.imagenPrompt = elaboratedPmt;
                cpQ.imagePrompt = elaboratedPmt;
              }
            } catch (err) {
              console.error(`Gagal pre-generate Gambar Imagen untuk No. ${cpQ.number}, using Unsplash fallback:`, err);
            }
          }
          cpQ.imageUrl = generatedBytes || getRelevantVerifiedUnsplashUrl(subject, cpQ.questionText || "", cpQ.materi || "", cpQ.stimulusText || "", pmt);
        }
      } else {
        // Strictly verbal/text question. Clear any image or SVG completely!
        cpQ.imageUrl = "";
        cpQ.svgContent = "";
        
        // Clean up "Perhatikan gambar" phrases since there is no image
        if (cpQ.stimulusText) {
          cpQ.stimulusText = cpQ.stimulusText.replace(/Perhatikan gambar( berikut| di bawah ini|)!?\s*/gi, "").replace(/\*\*Perhatikan gambar( berikut| di bawah ini|)!?\*\*\s*/gi, "").trim();
        }
        if (cpQ.questionText) {
          cpQ.questionText = cpQ.questionText.replace(/Perhatikan gambar( berikut| di bawah ini|)!?\s*/gi, "").replace(/\*\*Perhatikan gambar( berikut| di bawah ini|)!?\*\*\s*/gi, "").trim();
        }
      }
    } else {
      // Must NOT have illustrations! Clear them out to look perfectly clean and official
      cpQ.imageUrl = "";
      cpQ.svgContent = "";
      cpQ.imagenPrompt = "";
      cpQ.imagePrompt = "";
      cpQ.visualAnalysis = null;
      
      // Clean up "Perhatikan gambar" phrases if they were hallucinated by Gemini on undesignated questions
      if (cpQ.stimulusText) {
        cpQ.stimulusText = cpQ.stimulusText.replace(/Perhatikan gambar( berikut| di bawah ini|)!?\s*/gi, "").replace(/\*\*Perhatikan gambar( berikut| di bawah ini|)!?\*\*\s*/gi, "").trim();
      }
      if (cpQ.questionText) {
        cpQ.questionText = cpQ.questionText.replace(/Perhatikan gambar( berikut| di bawah ini|)!?\s*/gi, "").replace(/\*\*Perhatikan gambar( berikut| di bawah ini|)!?\*\*\s*/gi, "").trim();
      }
    }

    processedQuestions.push(cpQ);
  }

  return processedQuestions;
}
function shuffleSingleQuestionOptions(q: any): any {
  if (!q || q.questionType !== "Pilihan Ganda" || !q.options || q.options.length === 0) {
    return q;
  }

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

  const scrambled = [...cleanOptsContent];
  // Seeded deterministic random shuffle based on question content hash to respect data integrity
  let stringHash = 0;
  const qStr = (q.questionText || "") + " " + correctText;
  for (let c = 0; c < qStr.length; c++) {
    stringHash = (stringHash << 5) - stringHash + qStr.charCodeAt(c);
    stringHash = stringHash & stringHash;
  }
  let seed = Math.abs(stringHash) || 133;
  for (let i = scrambled.length - 1; i > 0; i--) {
    seed = Math.sin(seed + i) * 10000;
    const r = seed - Math.floor(seed);
    const j = Math.floor(r * (i + 1));
    const temp = scrambled[i];
    scrambled[i] = scrambled[j];
    scrambled[j] = temp;
  }

  const letters = ["A", "B", "C", "D"];
  const finalOpts = scrambled.map((text, idx) => `${letters[idx]}. ${text || `Pilihan ${letters[idx]}`}`);

  const newCorrectIdx = scrambled.indexOf(correctText);
  const finalCorrectIdx = newCorrectIdx !== -1 ? newCorrectIdx : 0;
  const finalKey = String.fromCharCode(97 + finalCorrectIdx);

  return {
    ...q,
    options: finalOpts,
    answerKey: finalKey
  };
}

// Final pristine alignment function: forces multiple-choice option correct texts
// to correspond 100% exactly to the matching Kisi-Kisi row's answer key.
function alignQuestionsWithKisiKisiAnswerKeys(questions: any[], kisiKisi: any[]): any[] {
  if (!questions || questions.length === 0 || !kisiKisi || kisiKisi.length === 0) {
    return questions;
  }

  return questions.map((q, idx) => {
    if (q) {
      q.questionText = cleanQuestionEndings(q.questionText || "", q.questionType || "");
    }

    if (!q || q.questionType !== "Pilihan Ganda" || !q.options || q.options.length === 0) {
      return q;
    }

    const kisiItem = kisiKisi[idx];
    if (!kisiItem) {
      return q;
    }

    // Extract the designated answer letter from the Kisi-Kisi (e.g., "C", "A", etc.)
    let targetAnswerLetter = (kisiItem.answerKey || "").trim().toUpperCase();
    const letters = ["A", "B", "C", "D"];

    if (!targetAnswerLetter || !letters.includes(targetAnswerLetter)) {
      // If Kisi-Kisi item has no valid single letter, assign a nice deterministic one based on index
      const seed = Math.sin((idx + 17) * 23.41) * 10000;
      const randIdx = Math.floor((seed - Math.floor(seed)) * 4);
      targetAnswerLetter = letters[randIdx];
      kisiItem.answerKey = targetAnswerLetter;
    }

    const targetIdx = letters.indexOf(targetAnswerLetter);

    // Find the correct option index in the current question
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

    // Perform a nice seeded random shuffle on the remaining three incorrect options to respect data integrity
    const shuffledIncorrects = [...incorrectTexts];
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

    // Assemble options to place the correct description exactly at targetIdx
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
    const finalKey = targetAnswerLetter.toLowerCase();

    return {
      ...q,
      options: finalOpts,
      answerKey: finalOpts[targetIdx] // Store the full option string or letter according to schema preference
    };
  });
}

// Programmatic deduplication pass to prevent duplicate questions or choice combinations
function findAndFixDuplicateQuestions(questions: any[], subject: string): any[] {
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
      console.log(`[Deduplication] Programmatically diversifying duplicate question or option set at number: ${q.number || (idx + 1)}`);
      const mutated = { ...q };

      const randomName = indonesianNames[idx % indonesianNames.length];
      const alternateName = indonesianNames[(idx + 4) % indonesianNames.length];
      const nameThree = indonesianNames[(idx + 8) % indonesianNames.length];

      // Mutate names
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
        // If it's a mathematics question, provide a fully generated correct alternative math scenario to steer clear of invalid equations or solutions
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
        // Non-math question: Just clean up options formatting without appending any artificial words
        if (mutated.options && mutated.options.length > 0) {
          mutated.options = mutated.options.map((opt, oIdx) => {
            const letChar = String.fromCharCode(65 + oIdx);
            const optText = opt.replace(/^[A-DA-D][.\s)]+/, "").trim();
            return `${letChar}. ${optText}`;
          });
        }
      }

      // Add to seen records
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
    seenTexts.add(fullTextKey);
    if (optsKey) seenOptions.add(optsKey);

    return q;
  });
}

// 1. API: Generate Topics & Capaian Pembelajaran based on Class and Subject
app.post("/api/generate-topics", async (req, res) => {
  const { subject, gradeClass, userApiKey } = req.body;
  const keyToUse = (userApiKey || req.headers["x-user-api-key"] || "").toString();
  try {
    if (!subject || !gradeClass) {
      return res.status(400).json({ error: "Mata pelajaran dan Kelas harus diisi." });
    }

    // In-memory server cache lookup for instant response
    const cacheKey = `${subject.toLowerCase().trim()}_${gradeClass.toLowerCase().trim()}`;
    if (topicsCache.has(cacheKey)) {
      console.log(`[Cache Hit] Serving topics for ${subject} ${gradeClass} from server-side cache instantly.`);
      return res.json(topicsCache.get(cacheKey));
    }

    const ai = getAiClient();
    const prompt = `
      Anda adalah pakar kurikulum pendidikan di Indonesia untuk tingkat Sekolah Dasar (SD) Kurikulum Merdeka.
      Tolong buatkan daftar Capaian Pembelajaran (CP) beserta Elemen yang sesuai untuk mata pelajaran "${subject}" dan tingkat kelas "${gradeClass}".
      Untuk setiap Elemen, buatkan juga 3-5 topik utama yang diajarkan di kelas tersebut.
      SANGAT PENTING: Untuk setiap topik, pecahkan menjadi 3-4 materi atau sub-kompetensi detail secara lebih rinci (materi inilah yang nantinya dipasangkan langsung untuk butir soal SD berkualitas tinggi).
      Buat materi-materi tersebut kontekstual, spesifik, rill, dan sesuai standar nasional Kementerian Pendidikan.

      Format keluaran dalam JSON yang valid sesuai skema yang disediakan.
    `;

    const fetchPromise = generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah pengembang kurikulum nasional SD di Indonesia yang ahli dalam menyusun Capaian Pembelajaran Kurikulum Merdeka yang rincian materi bahasan yang sangat mendasar dan konkrit.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Daftar Capaian Pembelajaran beserta Elemen dan topik rincian",
          items: {
            type: Type.OBJECT,
            properties: {
              cp: {
                type: Type.STRING,
                description: "Deskripsi singkat Capaian Pembelajaran (CP) untuk elemen terkait.",
              },
              element: {
                type: Type.STRING,
                description: "Nama elemen kurikulum (contoh untuk Matematika: Bilangan, Aljabar, Pengukuran, Geometri, Analisis Data).",
              },
              topics: {
                type: Type.ARRAY,
                description: "Daftar topik bahasan utama kurikulum.",
                items: {
                  type: Type.OBJECT,
                  description: "Nama topik dan rincian sub-materi pelajaran.",
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Nama topik bahasan utama (contoh: Penjumlahan Pecahan Sederhana)."
                    },
                    materi: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Daftar 3-4 materi/sub-konsep rill hasil pecahan detail dari topik tersebut yang siap diuji (contoh: 'Pecahan dengan penyebut sama', 'Pecahan dengan penyebut berbeda')."
                    }
                  },
                  required: ["name", "materi"]
                }
              },
            },
            required: ["cp", "element", "topics"],
          },
        },
      },
    }, 2, keyToUse);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout generating topics. Using fallback.")), 16000)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]) as any;
    const resultText = response.text || "[]";
    const data = JSON.parse(resultText);

    // Cache the successful response for extreme high availability and instant responsiveness
    if (Array.isArray(data) && data.length > 0) {
      topicsCache.set(cacheKey, data);
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error generating topics, activating offline premium fallback:", error);
    res.setHeader("X-Fallback-Used", "true");
    
    const subjectName = (subject || "Matematika") as string;
    const currentPhase = ["Kelas 1", "Kelas 2"].includes(gradeClass) 
      ? "Fase A" 
      : ["Kelas 3", "Kelas 4"].includes(gradeClass) 
        ? "Fase B" 
        : "Fase C";
    const keyName = `${subjectName} - ${currentPhase}`;
    const fallbackData = FALLBACK_CURRICULUMS[keyName] || FALLBACK_CURRICULUMS[`${subjectName} - Fase B`] || FALLBACK_CURRICULUMS["Matematika - Fase B"];
    
    // Map simple fallback data array of string topics to nested topic + detailed materi schema to keep it 100% compatible
    const mappedFallback = fallbackData.map((item: any) => {
      return {
        element: item.element,
        cp: item.cp,
        topics: (item.topics || []).map((topicStr: string) => {
          // Break down this topicStr into 3 realistic materi items
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
    
    res.json(mappedFallback);
  }
});
function cleanMateriInServer(materiStr: string): string {
  if (!materiStr) return "";
  
  // 1. Remove common redundant prefixes (case-insensitive)
  let clean = materiStr.trim();
  const prefixesToRemove = [
    /^(materi|topik|pembelajaran|bahasan|pokok bahasan|konsep dasar|konsep|belajar tentang|belajar|mengenal tentang|mengenal|pemahaman tentang|pemahaman)\s+(tentang|mengenai)\s+/gi,
    /^(materi|topik|pembelajaran|bahasan|pokok bahasan|konsep dasar|konsep|belajar|mengenal|pemahaman)\s+/gi,
    /\.*$/g // trailing dots
  ];

  for (const regex of prefixesToRemove) {
    clean = clean.replace(regex, "");
  }

  clean = clean.trim();

  // 2. Remove word repetitions (e.g., "Pecahan Pecahan" or "pola pola")
  // Let's split by space, hyphen, and slash
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

  // Join them back with space
  let finalMateri = uniqueWords.join(" ");

  // Final trim and safety check: capitalize first letter
  if (finalMateri.length > 0) {
    finalMateri = finalMateri.charAt(0).toUpperCase() + finalMateri.slice(1);
  }

  return finalMateri;
}

// Strictly cleans endings of questions to ensure they are NOT student worksheets,
// but exam papers with correct dot counts or precise question mark endings.
function cleanQuestionEndings(questionText: string, questionType: string): string {
  if (!questionText) return "";
  let cleanText = questionText.trim();

  // 1. Remove "Jawaban:" or "Jawaban :" or "JAWABAN" or "Jawab:" or "Jawab :" and any trailing dots, spaces, underscores, or lines
  cleanText = cleanText.replace(/jawab(an)?\s*:?\s*[.\s_\-()]+/gi, "");
  // Also match and remove patterns like ": ....................." or ": ___________________" or just long underscores/dots at the end
  cleanText = cleanText.replace(/:\s*[.\s_\-()]{3,}/g, "");

  const isIsian = questionType === "Isian Singkat" || questionType === "Isian";
  const isUraian = questionType === "Uraian";

  // 2. If there's a question mark "?" in the text, and everything after it is just junk/dots/lines/parentheses/spaces,
  // make it end exactly at "?" with no trailing dots or lines at all.
  const qMarkIndex = cleanText.lastIndexOf("?");
  if (qMarkIndex !== -1) {
    const trailingPart = cleanText.slice(qMarkIndex + 1).trim();
    if (/^[.\s_\-()]*$/.test(trailingPart)) {
      return cleanText.slice(0, qMarkIndex + 1).trim();
    }
  }

  // 3. Strip any trailing handwriting workspace lines/dots (such as 3 or more dots, underscores, or hyphens at the end if we have letters)
  cleanText = cleanText.replace(/[._\-]{3,}\s*$/, "");
  cleanText = cleanText.trim();

  // If after stripping it ends with "?" then return directly
  if (cleanText.endsWith("?")) {
    return cleanText;
  }

  // 4. For Isian Singkat: if it ends with dots, force exactly 3 dots: "..."
  if (isIsian) {
    if (/[._\-]+$/.test(cleanText)) {
      cleanText = cleanText.replace(/[._\-]+$/, "").trim() + " ...";
    }
  }

  // 5. For Uraian: if it ends with dots, force exactly 4 dots: "...."
  if (isUraian) {
    if (/[._\-]+$/.test(cleanText)) {
      cleanText = cleanText.replace(/[._\-]+$/, "").trim() + " ....";
    }
  }

  return cleanText.trim();
}

// Helper to programmatically clean answer keys specifically for multiple choice inside the Kisi-Kisi layout
function cleanKisiKisiAnswerKey(answerKey: string, questionType: string, index: number): string {
  const cleanType = (questionType || "").trim().toLowerCase();
  
  if (cleanType === "pilihan ganda") {
    const letters = ["A", "B", "C", "D"];
    // Using a fluctuating multiplier combined with sine to distribute choices beautifully
    // and completely avoid repetitive or sequential patterns (like A, B, C, D)
    const seed = Math.sin((index + 13) * 37.89) * 10000;
    const randIdx = Math.floor((seed - Math.floor(seed)) * 4);
    return letters[randIdx];
  }
  
  return (answerKey || "").trim();
}

// Helper to programmatically align and fix generated Kisi-Kisi's Elemen & CP with official curriculum data
function alignKisiKisiWithCurriculum(kisiRows: any[], curriculumData: any[]): any[] {
  if (!curriculumData || !Array.isArray(curriculumData) || curriculumData.length === 0) {
    return kisiRows;
  }

  // Create a list of all official materis and their corresponding element & cp
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
                clean: cleanMateriInServer(m).toLowerCase().replace(/[^a-z0-9]/g, ""),
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
    const cleanRowMateri = cleanMateriInServer(row.materi || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    // 1. Try exact match on clean materi string
    let bestMatch = officialMateriList.find(item => item.clean === cleanRowMateri);

    // 2. If no exact match, try substring match (does one contain the other?)
    if (!bestMatch) {
      bestMatch = officialMateriList.find(item => 
        item.clean.includes(cleanRowMateri) || cleanRowMateri.includes(item.clean)
      );
    }

    // 3. Fallback: if we still don't have a match, assign first element
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

// 2. API: Generate Kisi-Kisi Soal (Matrix Sheet)
app.post("/api/generate-kisi-kisi", async (req, res) => {
  const { schoolInfo, subject, selectedTopics, questionConfigs, curriculumData, userApiKey } = req.body;
  const keyToUse = (userApiKey || req.headers["x-user-api-key"] || "").toString();
  try {
    if (!subject || !selectedTopics || selectedTopics.length === 0 || !questionConfigs || questionConfigs.length === 0) {
      return res.status(400).json({ error: "Data input tidak lengkap untuk menjamin pembuatan kisi-kisi." });
    }

    const { rules: subjectRules, systemInstruction: systemInstructionOverride } = getSubjectSpecificRules(subject, schoolInfo?.gradeClass || "Sekolah Dasar");

    const totalQuestions = questionConfigs.reduce((sum: number, item: any) => sum + (Number(item.count) || 0), 0) || 10;
    const targetImageCount = 0;

    const ai = getAiClient();
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

      ${subjectRules}

      ==================================================================
      STIMULUS INDIKATOR BERGAMBAR / ILUSTRASI:
      ==================================================================
      - Anda diperbolehkan merancang soal yang dipasangkan stimulus visual (gambar, ilustrasi, foto, diagram, grafik, dsb) terutama untuk mata pelajaran Matematika dan IPAS (Sains), atau jika relevan dengan materi pelajaran.
      - Jika ada indikator soal yang menggunakan gambar, gunakan awalan-awalan seperti "Disajikan gambar...", "Disajikan ilustrasi...", "Disajikan diagram..." pada kolom 'indicator' untuk menandai kebutuhan stimulus visual tersebut secara jelas.
      - ISI NILAI KOLOM 'indicator' HARUS BERUPA INDIKATOR BERSIH yang langsung mendeskripsikan stimulus (visual/teks) dan tugas siswa secara profesional. JANGAN PERNAH menambahkan prefiks "Stimulus:" di awal teks indikator. Tuliskan indikator secara langsung dan elegan!

      ==================================================================
      11 PILIHAN KOMBINASI STIMULUS TEKS/DATA KELAS TINGGI (SANGAT DIANJURKAN & MANDATORI BERVARIASI):
      ==================================================================
      Untuk menghasilkan naskah ujian yang sangat berwarna, keren, tidak monoton, dan bervariasi secara profesional walau tanpa gambar, Anda WAJIB merancang stimulus indikator Anda bergantian menggunakan kombinasi dari 11 gaya stimulus ramah-cetak berikut secara acak lintas nomor soal:
      1. Teks Bacaan Pendek/Narasi (Cerita pendek fabel, legenda nusantara, dongeng anak kreatif, informasi sains ramah anak, percakapan sehari-hari)
      2. Tabel Teks Sederhana (Tabel jadwal piket/pelajaran, tabel data tinggi/berat badan murid, tabel daftar nilai olahraga, tabel data hasil panen sayur)
      3. Diagram/Grafik Berbasis Teks Deskriptif (Representasi diagram batang sederhana menggunakan simbol karakter teks/angka, contoh data cuaca mingguan atau jumlah buku di lemari per hari)
      4. Infografis data & angka pendek (Gabungan fakta singkat, ringkasan angka statistik, dan simbol tanda baca terstruktur)
      5. Situasi Kontekstual / Studi Kasus Sederhana (Aktivitas belanja di kantin sekolah secara jujur, menabung uang kembalian di celengan, kerja bakti membersihkan selokan kelas, membagi kue pecahan dengan adil)
      6. Dialog/Percakapan Berperan (Skenario naskah komik berbasis dialog langsung antar tokoh anak)
      7. Karya Sastra Anak (Puisi keindahan alam Indonesia, pantun nasihat budi pekerti, syair ketekunan belajar)
      8. Simbol / Rambu / Lambang berbasis Deskripsi (Deskripsi rambu keselamatan di jalan, deskripsi Lambang Garuda Pancasila, deskripsi simbol prakiraan cuaca)
      9. Kumpulan Data Sederhana Terbuka (Daftar absensi kelas, daftar pengunjung perpustakaan per hari, daftar harga barang di koperasi sekolah)
      10. Prosedur / Urutan Langkah Praktik (Langkah mencuci tangan memakai sabun, langkah menanam biji tanaman, cara membuat es jeruk peras)
      11. Kutipan / Pernyataan Pendek (Kutipan nasihat bijak para guru atau tokoh teladan untuk melatih siswa menemukan ide pokok atau menyimpulkan amanat moral secara cerdas)

      PASTIKAN Anda mendistribusikan ke-11 variasi di atas secara kaya dan kreatif! Gunakan nama tokoh orang Indonesia, nama sekolah, lokasi tempat tinggal, dan objek yang SANGAT BERVARIASI, baru, dan anti-monoton di setiap baris soal. Jangan gunakan nama-nama yang sama berturut-turut!

      ==================================================================
      ATURAN KOLOM MATERI (MUTLAK BERSIH & JELAS):
      ==================================================================
      - Kolom 'materi' HANYA BOLEH diisi dengan NAMA MATERI UTAMA SAJA (misalnya: 'Pecahan Senilai', 'Gerak Manipulatif', 'Gaya Magnet', 'Simbol Pancasila').
      - SANGAT DILARANG menulis materi yang terlalu panjang, menyertakan penjelasan tambahan, mengulang-ulang kalimat, atau mengulang satu kata di dalamnya (TIDAK BOLEH ada kata ganda berulang seperti 'pola pola' atau 'pecahan pecahan').

      ==================================================================
      ATURAN ELEMEN & CAPAIAN PEMBELAJARAN (CP) - MUTLAK DARI RUJUKAN:
      ==================================================================
      - Kolom 'element' dan 'cp' WAJIB disalin atau disesuaikan persis dengan data "Rujukan Kurikulum Resmi" yang menaungi materi tersebut. DILARANG KERAS mengarang bebas, membuat istilah tersendiri, atau menerjemahkan istilah kurikulum secara acak!
      - KESESUAIAN TINGKAT KESULITAN (SANGAT KETAT): Pembuatan indikator soal WAJIB disesuaikan secara presisi dengan Capaian Pembelajaran (CP) pada elemen yang dipilih, topik, serta materi. 
      - Tingkat kesulitan pada indikator dan soal yang dibuat SANGAT DILARANG MELEWATI (overshoot) Capaian Pembelajaran di setiap elemen untuk setiap fase dan mata pelajaran. Misalnya, jika CP hanya menuntut siswa kelas 1-2 (Fase A) untuk "mengenal" atau "mengidentifikasi", maka indikator soal tidak boleh menuntut siswa melakukan analisis rumit (HOTS tingkat tinggi) atau perhitungan kompleks yang melampaui batas CP elemen tersebut. Jaga agar tetap realistis, proporsional, dan tuntas sesuai tingkat perkembangan kognitif siswa di fasenya.

      ==================================================================
      Aturan umum dalam menghasilkan Indikator Soal (Indicator) - MUTLAK:
      - Kolom Indikator Soal (indicator) WAJIB mengawali barisnya dengan penyebutan jenis stimulus secara eksplisit sesuai aturan 25% di atas.
      - Indikator soal wajib memuat STIMULUS nyata/konkrit.
      - Sesuaikan indikator soal dengan tingkat kognitif yang diminta.
      - Level Kognitif kurikulum Indonesia:
        * Level 1: Mengingat (C1) / Memahami (C2)
        * Level 2: Mengaplikasikan (C3)
        * Level 3: Menganalisis (C4) / Mengevaluasi (C5) / Mencipta (C6) - HOTS
      - WAJIB menggunakan bahasa sederhana yang ramah anak, lugas, dan sesuai tingkat kemampuan berpikir siswa kelas ${schoolInfo?.gradeClass || "Sekolah Dasar"}.
      - Stimulus tidak boleh terlalu panjang atau rumit, pastikan ringkas, pendek, dan langsung fokus pada objek pertanyaan.
      
      Rekomendasi Penamaan Pendukung Konteks Indonesia Umum:
      - Jika menyebutkan Nama Desa, gunakan variasi desa berikut: Desa Sukamaju, Desa Sari Makmur, Desa Harapan, Desa Subur.
      - Jika menyebutkan Nama Guru, gunakan nama berikut: Pak Bambang, Ibu Shinta, Pak Priyadi, Ibu Ratih, Pak Joko, Ibu Sri, Pak Hartono, Ibu Melinda.
      - Jika menyebutkan Nama Murid, gunakan variasi berikut: Andi, Budi, Cici, Dedi, Evi, Fandi, Gita, Hari, Iwan, Julia, Rian, Sari, Dian, Tono, Wati.
      - Jika menyebutkan Nama Sekolah, gunakan rekomendasi berikut: SD Negeri Nusantara, SD Merdeka, SD Harapan Bangsa, SD Bakti Luhur, SD Pancasila.

      Petunjuk Pengisian Kisi-kisi:
      - Buat urutan nomor soal yang berkesinambungan dari 1 sampai total soal yang diminta.
      - Distribusikan materi-materi secara proporsional ke dalam konfigurasi jumlah soal.
      - Tentukan "capaian pembelajaran", "elemen", "materi", "indikator soal", "level kognitif", "bentuk soal", dan "kunci jawaban" ideal untuk setiap nomor.

      Hasilkan keluaran JSON murni sesuai skema pendukung.
    `;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstructionOverride + "\n\nAnda menyusun matriks kisi-kisi ujian yang sangat detail namun sederhana, menyertakan stimulus (contoh konkrit, cerita, deskripsi gambar, puisi, pantun atau dialog) yang pendek, ringkas dan ramah anak pada indikator soal, serta mematuhi Level Kognitif secara akurat.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Daftar baris data tabel kisi-kisi soal",
          items: {
            type: Type.OBJECT,
            properties: {
              number: {
                type: Type.INTEGER,
                description: "Nomor urut soal.",
              },
              cp: {
                type: Type.STRING,
                description: "Capaian Pembelajaran (CP) terkait.",
              },
              element: {
                type: Type.STRING,
                description: "Elemen kurikulum terkait.",
              },
              materi: {
                type: Type.STRING,
                description: "NAMA MATERI UTAMA SAJA yang sangat padat, jelas (maksimal 2-4 kata), tanpa pengulangan kata sama sekali, dan HANYA berisi nama materi asli (contoh: 'Pecahan Senilai', 'Lari Estafet', 'Gaya Magnet', 'Simbol Pancasila'). Dilarang keras menulis penjelasan panjang, dilarang menyertakan kalimat 'materi tentang', dilarang keras mengulang kata-kata baik secara berurutan maupun dalam satu kalimat.",
              },
              indicator: {
                type: Type.STRING,
                description: "Indikator soal lengkap berkekhasan stimulus, ditulis detail. Harus menyebutkan stimulus spesifik (cerita/data/gambar konkrit).",
              },
              cognitiveLevel: {
                type: Type.STRING,
                description: "Tingkat kognitif (Level 1, Level 2, atau Level 3). Serta sebutkan penjelasannya (contoh: Level 3 - Menganalisis / HOTS).",
              },
              questionType: {
                type: Type.STRING,
                description: "Bentuk Soal: harus bernilai 'Pilihan Ganda', 'Isian Singkat', atau 'Uraian'.",
              },
              answerKey: {
                type: Type.STRING,
                description: "Kunci jawaban tunggal yang benar. Khusus untuk 'Pilihan Ganda', Anda WAJIB hanya menuliskan satu huruf pilihan (misalnya 'A', 'B', 'C', atau 'D') tanpa teks tambahan lainnya. Untuk Isian Singkat atau Uraian, tuliskan jawaban kunci yang tepat secara ringkas.",
              },
            },
            required: ["number", "cp", "element", "materi", "indicator", "cognitiveLevel", "questionType", "answerKey"],
          },
        },
      },
    }, 2, keyToUse);

    const resultText = response.text || "[]";
    let data = JSON.parse(resultText);
    
    // Clean and sanitize columns programmatically for perfect security and formatting
    if (Array.isArray(data)) {
      data = data.map((item: any, idx: number) => {
        if (item) {
          if (item.materi) {
            item.materi = cleanMateriInServer(item.materi);
          }
          item.answerKey = cleanKisiKisiAnswerKey(item.answerKey || "", item.questionType || "", idx);
        }
        return item;
      });

      // Align elements and CP texts strictly with official curriculum data to avoid hallucinations
      data = alignKisiKisiWithCurriculum(data, curriculumData);
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error generating kisi-kisi, activating offline premium fallback:", error);
    res.setHeader("X-Fallback-Used", "true");
    const fallbackData = generateFallbackKisiKisi(schoolInfo, subject, selectedTopics, questionConfigs);
    
    // Clean, sanitize, and align fallback data with curriculumData as well
    let cleanedFallback = fallbackData.map((item: any, idx: number) => {
      if (item) {
        if (item.materi) {
          item.materi = cleanMateriInServer(item.materi);
        }
        item.answerKey = cleanKisiKisiAnswerKey(item.answerKey || "", item.questionType || "", idx);
      }
      return item;
    });

    cleanedFallback = alignKisiKisiWithCurriculum(cleanedFallback, curriculumData);

    res.json(cleanedFallback);
  }
});

// 3. API: Generate Soal Ujian (Actual Test Items)
app.post("/api/generate-soal", async (req, res) => {
  const { schoolInfo, subject, kisiKisi, userApiKey } = req.body;
  const keyToUse = (userApiKey || req.headers["x-user-api-key"] || "").toString();
  
  // Programmatically clean any incoming materi in the kisiKisi array immediately (before try block for unified catch-fallback scope)
  const sanitizedKisiKisi = (kisiKisi || []).map((item: any) => {
    if (item && item.materi) {
      return {
        ...item,
        materi: cleanMateriInServer(item.materi)
      };
    }
    return item;
  });

  try {
    if (!sanitizedKisiKisi || sanitizedKisiKisi.length === 0) {
      return res.status(400).json({ error: "Data kisi-kisi tidak boleh kosong untuk membuat soal." });
    }

    const { rules: subjectRules, systemInstruction: systemInstructionOverride } = getSubjectSpecificRules(subject, schoolInfo?.gradeClass || "Semua");

    const ai = getAiClient();
    const gradeClass = schoolInfo?.gradeClass || "Kelas 4";
    const numQuestions = sanitizedKisiKisi.length;
    const currentPhase = ["Kelas 1", "Kelas 2"].includes(gradeClass) 
      ? "Fase A" 
      : ["Kelas 3", "Kelas 4"].includes(gradeClass) 
        ? "Fase B" 
        : "Fase C";

    // Tentukan secara presisi soal mana yang harus memiliki gambar berdasarkan rancangan Kisi-kisi.
    const visualKisiKisiIndices = new Set<number>();
    sanitizedKisiKisi.forEach((item: any, idx: number) => {
      const indicatorText = (item.indicator || "").toLowerCase();
      const stimulusText = (item.stimulusText || item.stimulus || "").toLowerCase();
      
      // Exclude cases where it is clearly a narrative text or story stimulus (non-visual)
      const isStory = 
        indicatorText.includes("cerita") || indicatorText.includes("dongeng") || indicatorText.includes("puisi") || 
        indicatorText.includes("dialog") || indicatorText.includes("bacaan") || indicatorText.includes("teks") ||
        indicatorText.includes("wacana") || indicatorText.includes("pantun") || indicatorText.includes("paragraf") ||
        stimulusText.includes("bacalah") || stimulusText.includes("bacaan berikut") || stimulusText.includes("cerita berikut") ||
        stimulusText.includes("suatu hari") || stimulusText.includes("tersebut") || stimulusText.includes("dongeng");

      const isVisual = 
        (indicatorText.includes("gambar") || indicatorText.includes("ilustrasi") || indicatorText.includes("sketsa") ||
         stimulusText.includes("gambar") || stimulusText.includes("ilustrasi") || stimulusText.includes("sketsa") ||
         indicatorText.includes("peta") || indicatorText.includes("diagram") || indicatorText.includes("grafik") || indicatorText.includes("tabel")) && 
        !isStory;
      
      if (isVisual) {
        visualKisiKisiIndices.add(idx);
      }
    });

    // SISTEM WAJIB menghitung otomatis jumlah soal bergambar berdasarkan total soal.
    const targetImageCount = visualKisiKisiIndices.size;
    const designatedImageQuestions: number[] = Array.from(visualKisiKisiIndices);

    const prompt = `
      Format lembar soal ujian sekolah dasar berdasarkan kisi-kisi berikut.
      Mata Pelajaran: ${subject}
      Kelas: ${schoolInfo?.gradeClass || "Semua"}
      Tahun Pelajaran: ${schoolInfo?.academicYear || "2025/2026"}
      Fase: ${currentPhase}
      
      Kisi-Kisi Sumber:
      ${JSON.stringify(sanitizedKisiKisi)}

      ${subjectRules}

      TUGAS UTAMA SISTEM:
      1. Membuat soal berkualitas tinggi yang selaras secara mutlak dengan Capaian Pembelajaran (CP) Kurikulum Merdeka. Isi pertanyaan, rincian kasus, dan kedalaman materi wajib sesuai dengan CP pada elemen, topik, dan materi terpilih.
      2. TINGKAT KESULITAN SOAL MUTLAK DILARANG MELEWATI (overshoot) batas cakupan Capaian Pembelajaran di setiap elemen untuk setiap fase dan mata pelajaran. Jika CP hanya mengamanatkan pemahaman dasar atau pengenalan konkrit, soal dilarang dipaksa naik ke tingkat analisis teoritis yang membingungkan/terlalu rumit bagi usia anak kelas tersebut.
      3. Membuat stimulus soal yang relevan (cerita, dsb) secara pendek dan ramah anak.
      4. Melakukan analisis stimulus visual secara terperinci (Tokoh, Aktivitas, Lokasi, Objek Utama, Suasana, Fokus Visual) SEBELUM merumuskan prompt gambar.
      5. Membuat prompt gambar yang sangat presisi dan sejajar, khusus untuk soal yang ditunjuk memiliki gambar.
      
      ==================================================================
      ATURAN SANGAT KETAT: 1-KE-1 SINKRONISASI & TENTANG SOAL DUPLIKAT ATAU KEMBAR!
      ==================================================================
      1. Anda WAJIB menghasilkan TEPAT ${numQuestions} butir soal, di mana soal ke-i (index ke-i) di dalam array JSON hasil harus dibuat 100% berlandaskan rincian baris kisi-kisi ke-i (index ke-i) di "Kisi-Kisi Sumber".
      2. Jumlah item dalam array JSON hasil harus SAMA EXACT dengan jumlah item di "Kisi-Kisi Sumber" (yaitu ${numQuestions} soal). Jangan kurangi, jangan tambahi!
      3. Setiap nomor soal HARUS memiliki skenario, cerita stimulus, nama tokoh, pertanyaan, pilihan jawaban, kunci jawaban, dan pembahasan yang UNIK DAN SEPENUHNYA BERBEDA satu sama lain!
      4. SANGAT DILARANG KERAS menyalin, menduplikasi, atau menggunakan teks, cerita, atau stimulus yang mirip/kembar lintas nomor soal! Setiap butir soal harus mewakili kasus pelajaran yang segar dan otentik.
      5. Contoh: Jika soal nomor 1 dan soal nomor 2 sama-sama bertopik "Gerak Manipulatif", maka buatlah soal nomor 1 dengan skenario "menggiring bola melewati rintangan cone secara zig-zag", sedangkan soal nomor 2 menggunakan skenario "melakukan servis bawah atau menangkap bola kasti yang melambung tinggi". TIDAK BOLEH ada kesamaan narasi!
      6. Gunakan nama-nama tokoh anak Indonesia yang bervariasi secara bergantian (jangan gunakan nama Andi atau Budi terus-menerus di seluruh nomor soal).
      7. RANDOMISASI KUNCI JAWABAN (SANGAT MANDATORI): SANGAT DILARANG KERAS membuat pola kunci jawaban yang terlalu berurutan atau merata berpola (seperti A, B, C, D, A, B, C, D atau A, A, B, B, dsb). Pastikan kunci jawaban ('a', 'b', 'c', 'd') didistribusikan secara acak penuh untuk setiap nomor soal. Misalnya nomor 1 ber-kunci 'c', nomor 2 ber-kunci 'a', nomor 3 ber-kunci 'd', nomor 4 ber-kunci 'b', dsb. Kunci jawaban dan pembahasannya HARUS sepenuhnya akurat, benar-benar berkorespondensi dengan pilihan jawaban, dan sesuai teori keilmuan!
      
      ==================================================================
      ATURAN KRITIS - SENSITIVITAS AGAMA & LARANGAN KERAS TEKS KITAB SUCI (MUTLAK!):
      ==================================================================
      Berlaku untuk seluruh mata pelajaran AGAMA (Islam, Kristen, Katolik, Hindu, Buddha, Konghucu) maupun mata pelajaran umum:
      - SANGAT DILARANG KERAS menghasilkan ayat kitab suci, tulisan Arab, kutipan ayat, mantra, lafaz ritual, aksara suci, lafaz doa tertulis, kaligrafi, lafaz Allah, lafaz Muhammad, atau teks/halaman keagamaan apa pun di dalam gambar, prompt gambar, stimulus teks, pertanyan, maupun hiasan latar!
      - SANGAT DILARANG KERAS menyisipkan unsur teks ibadah dalam visual.
      - Sebagai alternatif, gunakan stimulus perilaku terpuji sehari-hari, gotong royong, persahabatan harmonis antar murid yang toleran, saling membantu, menyayangi binatang secara umum tanpa teks, bersedekah, rukun dengan tetangga, atau kegiatan ibadah non-verbal tanpa menyertakan teks apa pun!
      
      ==================================================================
      LARANGAN KERAS OBJEK RANDOM & KUCING ACAK:
      ==================================================================
      - Anda dilarang memunculkan kucing atau binatang lainnya secara acak pada visual jika stimulus soal tidak menyebutkan tentang hewan itu. Hewan hanyalah stimulus jika relevan dengan isi soal.
      - SANGAT DILARANG menggunakan objek dekoratif tambahan yang random atau latar asri secara asal-asalan yang tidak memengaruhi pengerjaan soal.
 
      ==================================================================
      ATURAN KHUSUS KARAKTER MANUSIA (WAJIB INDONESIA):
      ==================================================================
      - Semua manusia di dalam gambar wajib berciri anak SD Indonesia, usia anak-anak (7-12 tahun), wajah manis ramah khas Indonesia, dengan proporsi tubuh anak kecil yang realistis.
      - Murid wajib menggunakan seragam resmi SD Indonesia: baju kemeja putih lengan pendek rapi, celana pendek merah (untuk laki-laki) atau rok rempel panjang/pendek merah hati (untuk perempuan).
      - PENGECUALIAN: 
        * PJOK -> menggunakan pakaian seragam raga olahraga SD Indonesia yang sopan dan cerah.
        * Kegiatan di rumah -> menggunakan kaos/baju rumahan anak yang sederhana dan sopan.
        * Seni tari -> pakaian tari/pakaian adat nusantara sederhana, sopan, dan rapi sesuai budaya setempat.
      - SANGAT DILARANG: Orang dewasa, model remaja, gaya anime/fantasi, seragam luar negeri, atau ekspresi berlebihan.

      ==================================================================
      STIMULUS BERGAMBAR / ILUSTRASI:
      ==================================================================
      - Untuk soal-soal tertentu yang bersifat visual (misalnya diagram, bangun ruang matematika, pecahan pie, siklus hidup hewan/rantai makanan, aktivitas fisik PJOK tertentu, peta konseptual), silakan sertakan model deskripsi prompt atau SVG murni yang presisi.
      - Jika menyertakan ilustrasi/visual, gunakan 'Perhatikan gambar berikut!' sebagai awalan instruksi di stimulusText atau di awal questionText.
      - Anda dapat mengisi 'imagePrompt' atau 'imagenPrompt' dengan deskripsi detail dalam bahasa Inggris untuk menginstruksikan modul Imagen membuat gambar yang 100% kongruen dengan cerita soal.
      - Sebagai alternatif, jika itu diagram garis, grafik batang, pecahan lingkaran, atau bangun matematika, Anda dapat melukiskan secara presisi menggunakan string XML SVG murni langsung pada properti 'svgContent' (viewBox responsif, warna kontras tinggi, elegan).
      - Untuk soal non-visual, isi dengan string kosong "".

      ==================================================================
      ATURAN ANTI-REDUNDANSI & DUPLIKASI STIMULUS (SANGAT KETAT):
      ==================================================================
      - SANGAT DILARANG KERAS menduplikat cerita, kalimat, kasus, atau pengantar dari 'stimulusText' di dalam 'questionText'!
      - Pemisahan tugas ideal:
        * Jika ada narasi, dialog, tabel, data, atau puisi panjang, letakkan sepenuhnya di 'stimulusText'. 'questionText' hanya berisi pertanyaan/instruksi pendek yang merujuk pada stimulus tersebut. Jangan menceritakan ulang kisah di dalam 'questionText'.
        * JIKA TIDAK ADA stimulus terpisah yang memadai (misalnya soal pertanyaan langsung sederhana), maka KOSONGKAN properti 'stimulusText' (isi dengan string kosong "") dan tuliskan seluruh kalimatnya dengan padat langsung di 'questionText'.
        * Contoh Salah:
          "stimulusText": "Andi merapikan kedereng di kotak. Ada 100 kelereng."
          "questionText": "Andi merapikan kelereng di kotak dan ternyata ada 100 kelereng. Angka ratusan pada bilangan 100 adalah ..." (Salah karena menduplikasi jalan cerita dan bilangan 100).
        * Contoh Benar (Pemisahan Bagus):
          "stimulusText": "Andi sedang merapikan kelereng miliknya di dalam kotak. Setelah dihitung, ternyata seluruh kelereng tersebut berjumlah 100 butir."
          "questionText": "Angka yang menempati nilai tempat ratusan pada bilangan jumlah kelereng Andi adalah ..."
        * Contoh Benar Lain (Langsung Tanpa Stimulus Terpisah):
          "stimulusText": ""
          "questionText": "Andi sedang merapikan kelereng miliknya. Andi menghitung kelerengnya dan ternyata ada 100 butir. Angka yang menempati nilai tempat ratusan pada bilangan 100 adalah ..."

      ==================================================================
      GAYA RENDER TEKS UNTUK 11 STIMULUS KOMBINASI (WAJIB PROFESSIONAL):
      ==================================================================
      Ketika merumuskan 'stimulusText' atau 'questionText' untuk setiap nomor soal sesuai kisi-kisi yang ditunjuk, buatlah render teks Anda sangat rapi, kokoh, dan bervariasi sesuai jenis stimulusnya:
      1. Sastra/Puisi/Pantun: Pisahkan baris puisi/pantun dengan tanda baris baru (\n) yang jelas agar terpahat rapi laksana bait karya sastra asli.
      2. Tabel Teks: Gunakan format tabel teks terstruktur sederhana berbasis karakter (gunakan garis pemisah horizontal seperti "---+---" dan pipa "|" untuk kolom, atau gunakan baris-baris ber-tab rapi). Contoh:
         | Hari | Jumlah Hasil Panen |
         | --- | --- |
         | Senin | 4 kg |
         | Selasa | 6 kg |
      3. Diagram Berbasis Karakter Teks: Gambarkan diagram batang sederhana dengan deretan simbol aksara kotak "█" atau "▉" secara estetik. Contoh:
         Kelas 1: ▉▉▉ (3 anak)
         Kelas 2: ▉▉▉▉▉ (5 anak)
      4. Dialog / Komik: Buat baris percakapan yang diawali dengan nama tokoh bertanda titik dua. Contoh:
         Dayu: "Apakah kelerengku ada di dalam laci, Edi?"
         Edi: "Iya, ada tepat di sudut kanan bawah laci meja."
      5. Urutan Langkah / Prosedur: Tuliskan bertingkat memakai nomor urutan (1, 2, 3...) yang teratur dan bersih.
      6. Skenario / Kasus Kerja yang Variatif (SANGAT MANDATORI): Skenario latar tempat kejadian cerita soal dilarang melulu atau hanya terikat di lingkungan sekolah (seperti ruang kelas atau halaman sekolah). Jadilah desainer soal profesional dengan menyajikan latar variatif yang sangat beragam: di dalam kelas/sekolah (kantin, koperasi, perpustakaan, lobi, bidang olahraga), di rumah (ruang makan, kebun belakang), di taman bermain umum, di lapangan desa, di pasar tradisional, di pertokoan modern/swalayan, di jalan raya ramah anak, di sawah yang asri, di kebun buah, di lereng pegunungan, di pantai/pantai/laut, di tempat ibadah (masjid, gereja, pura/kuil, dsb), di kebun binatang, dsb! Pastikan semua latar cerita buatan Anda memiliki korelasi konkret, relevan, logis, dan mendidik dengan materi pokok bahasan serta Capaian Pembelajaran peserta didik.

      ==================================================================
      ATURAN AKHIRAN KALIMAT SOAL UNTUK NASKAH SOAL (MANDATORI MUTLAK):
      ==================================================================
      1. NASKAH SOAL INI BERKATEGORI LEMBAR SOAL YANG 100% MENYAJIKAN SOAL, BUKAN LEMBAR KERJA MURID! 
         - SANGAT DILARANG MENAMBAH titik-titik panjang (seperti ......................) atau garis kosong (seperti __________________) di bagian bawah/akhir atau dalam pertanyaan/isian/uraian sebagai area atau tempat menulis tangan bagi murid.
      2. ATURAN TANDA TANYA (?):
         - JIKA PERTANYAAN ISIAN SINGKAT MAUPUN URAIAN DIAKHIRI TANDA TANYA, MAKA SOALNYA WAJIB BERAKHIR TEPAT DI TANDA TANYA TERSEBUT! DILARANG setelah tanda tanya ditambahkan titik-titik atau garis apa pun!
      3. ATURAN TITIK-TITIK PADA AKHIR SOAL ISIAN SINGKAT (PILIHAN GANDA TIDAK TERPENGARUH):
         - JIKA pada bagian terakhir soal Isian Singkat membutuhkan titik-titik kelanjutan kalimat, maka jumlah titik-titik yang digunakan WAJIB HANYA TIGA TITIK SAJA: ... (Tanpa ada area menulis murid).
      4. ATURAN TITIK-TITIK PADA AKHIR SOAL URAIAN (ESSAY):
         - JIKA pada bagian terakhir soal Uraian membutuhkan titik-titik kelanjutan kalimat (dan tidak diakhiri tanda tanya), gunakan KETENTUAN TEPAT EMPAT TITIK SAJA: .... (Tanpa ada area menulis murid).

      ==================================================================
      ATURAN DETIL KELAS & KOGNITIF:
      ==================================================================
      - Gunakan bahasa murni yang sangat pendek, lugas, bersahabat, ramah anak, dan bebas dari istilah asing rumit.
      - Jangan ulangi nama-nama tokoh berturut-turut pada nomor yang bersebelahan. Gunakan variasi nama Indonesia: Andi, Budi, Cici, Dedi, Evi, Fandi, Gita, Hari, Iwan, Julia, Rian, Sari, Dian, Tono, Wati.
      
      Hasilkan keluaran JSON murni terstruktur.
    `;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstructionOverride,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Daftar naskah soal ujian lengkap beserta gambar pendukung acak jika ada",
          items: {
            type: Type.OBJECT,
            properties: {
              number: {
                type: Type.INTEGER,
                description: "Nomor soal (harus sesuai dengan kisi-kisi).",
              },
              questionType: {
                type: Type.STRING,
                description: "Bentuk Soal ('Pilihan Ganda', 'Isian Singkat', atau 'Uraian').",
              },
              cognitiveLevel: {
                type: Type.STRING,
                description: "Level kognitif soal (Level 1, Level 2, atau Level 3).",
              },
              materi: {
                type: Type.STRING,
                description: "Materi pokok bahasan.",
              },
              stimulusText: {
                type: Type.STRING,
                description: "Teks stimulus pendukung (cerita, penjelasan, data, dongeng, contoh konkrit, dsb). Kosongkan jika tidak ada.",
              },
              questionText: {
                type: Type.STRING,
                description: "Pertanyaan atau perintah soal.",
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Untuk Pilihan Ganda, berikan 4 pilihan lengkap (contoh: ['A. Pilihan satu', 'B. Pilihan dua', ...]). Kembalikan array kosong jika isian/uraian.",
              },
              answerKey: {
                type: Type.STRING,
                description: "Kunci jawaban definitif. Khusus untuk bentuk 'Pilihan Ganda', wajib berupa satu huruf kecil antara 'a', 'b', 'c', atau 'd'.",
              },
              alternativeAnswers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Opsi jawaban alternatif yang juga dianggap benar atau bernilai benar untuk bentuk Isian Singkat atau Uraian. Kosongkan untuk Pilihan Ganda.",
              },
              explanation: {
                type: Type.STRING,
                description: "Pembahasan singkat atau alasan jawaban untuk membantu penilaian guru.",
              },
              visualAnalysis: {
                type: Type.OBJECT,
                description: "Langkah 3: Analisis visual untuk soal yang menggunakan stimulus gambar. Kosongkan objek ini jika tidak memakai gambar.",
                properties: {
                  tokoh: { type: Type.STRING, description: "Siapa tokoh di dalam stimulus visual." },
                  aktivitas: { type: Type.STRING, description: "Aktivitas yang sedang dilakukan." },
                  lokasi: { type: Type.STRING, description: "Latar tempat kejadian visual." },
                  objekUtama: { type: Type.STRING, description: "Benda atau objek utama pendukung pelajaran." },
                  suasana: { type: Type.STRING, description: "Suasana psikologis rombongan belajar/kegiatan." },
                  fokusVisual: { type: Type.STRING, description: "Fokus visual utama kameramen." }
                }
              },
              imageUrl: {
                type: Type.STRING,
                description: "URL gambar foto/ilustrasi jika soal ini bertipe visual. Kosongkan jika tidak ada atau jika sudah menggunakan svgContent.",
              },
              svgContent: {
                type: Type.STRING,
                description: "Kode string murni XML SVG (misalnya bangun ruang, pecahan pie, diagram alir, dsb) tanpa backtick/markdown. Pastikan responsif dengan viewBox yang tepat dan kontras tinggi. Kosongkan jika tidak ada.",
              },
              imagenPrompt: {
                type: Type.STRING,
                description: "Deskripsi prompt visual Imagen detail dalam Bahasa Inggris untuk generate gambar. WAJIB 100% relevan dengan peristiwa/cerita soal & stimulus (TANPA MISMATCH!). Gunakan gaya 'Ultra realistic educational photography...' atau 'Vibrant 2D vector flat illustration...' tergantung isi soal. Kosongkan jika tidak ada.",
              },
              imagePrompt: {
                type: Type.STRING,
                description: "Sama dengan imagenPrompt (deskripsi prompt gambar detail dalam Bahasa Inggris, 100% relevan dengan peristiwa/cerita & stimulus, tanpa salah objek). Kosongkan jika tidak ada.",
              },
            },
            required: ["number", "questionType", "cognitiveLevel", "materi", "questionText", "answerKey", "explanation"],
          },
        },
      },
    }, 2, keyToUse);

    const resultText = response.text || "[]";
    const data = JSON.parse(resultText);
    
    // Intelligent normalization pipeline for high-accuracy educational outputs
    const normalizedData = data.map((q: any) => {
      const promptStr = q.imagePrompt || q.imagenPrompt || "";
      if (q.questionType !== "Pilihan Ganda" || !q.options || q.options.length === 0) {
        return {
          ...q,
          imagePrompt: promptStr,
          imagenPrompt: promptStr
        };
      }
      
      let opts = [...q.options].slice(0, 4);
      while (opts.length < 4) {
        const letter = String.fromCharCode(65 + opts.length);
        opts.push(`${letter}. Pilihan ${letter}`);
      }
      
      opts = opts.map((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const cleanText = opt.replace(/^[a-dA-D][.\s)]+/, "").trim();
        return `${letter}. ${cleanText || `Pilihan ${letter}`}`;
      });

      const cleanKey = (q.answerKey || "").trim().toUpperCase();
      let correctIdx = -1;
      
      if (/^[A-D](\.|$)/.test(cleanKey)) {
        correctIdx = cleanKey.charCodeAt(0) - 65;
      } else {
        const keyLower = cleanKey.toLowerCase();
        for (let i = 0; i < opts.length; i++) {
          const optLower = opts[i].toLowerCase();
          const cleanOpt = optLower.replace(/^[a-d][.\s)]+/, "").trim();
          const cleanKeyTxt = keyLower.replace(/^[a-d][.\s)]+/, "").trim();
          if (cleanOpt === cleanKeyTxt || optLower.includes(cleanKeyTxt) || cleanOpt.includes(cleanKeyTxt)) {
            correctIdx = i;
            break;
          }
        }
      }

      if (correctIdx === -1) {
        for (let i = 0; i < opts.length; i++) {
          if (opts[i].toUpperCase().includes(cleanKey) || cleanKey.includes(opts[i].toUpperCase())) {
            correctIdx = i;
            break;
          }
        }
      }

      if (correctIdx === -1) {
        correctIdx = 0;
      }

      // 1. Identify the correct answer option text content
      const cleanOptsContent = opts.map(opt => opt.replace(/^[A-DA-D][.\s)]+/, "").trim());
      const correctText = cleanOptsContent[correctIdx];

      // 2. Shuffle the options content array deterministically (using seeded Knuth-Fisher-Yates) to respect data integrity
      const shuffledContent = [...cleanOptsContent];
      let stringHash = 0;
      const qStr = (q.questionText || "") + " " + correctText;
      for (let c = 0; c < qStr.length; c++) {
        stringHash = (stringHash << 5) - stringHash + qStr.charCodeAt(c);
        stringHash = stringHash & stringHash;
      }
      let seed = Math.abs(stringHash) || 133;
      for (let i = shuffledContent.length - 1; i > 0; i--) {
        seed = Math.sin(seed + i) * 10000;
        const r = seed - Math.floor(seed);
        const j = Math.floor(r * (i + 1));
        const temp = shuffledContent[i];
        shuffledContent[i] = shuffledContent[j];
        shuffledContent[j] = temp;
      }

      // 3. Re-assign letters "A", "B", "C", "D"
      const letters = ["A", "B", "C", "D"];
      const finalOpts = shuffledContent.map((text, idx) => `${letters[idx]}. ${text || `Pilihan ${letters[idx]}`}`);

      // 4. Find the new index of the correct answer text
      const newCorrectIdx = shuffledContent.indexOf(correctText);
      const finalCorrectIdx = newCorrectIdx !== -1 ? newCorrectIdx : 0;

      return {
        ...q,
        materi: cleanMateriInServer(q.materi || ""),
        options: finalOpts,
        answerKey: String.fromCharCode(97 + finalCorrectIdx),
        imagePrompt: promptStr,
        imagenPrompt: promptStr
      };
    });

    const finalQuestions = await adjustAndNormalizeIllustratedQuestions(normalizedData, targetImageCount, subject, visualKisiKisiIndices, keyToUse);
    
    // Extra secure cleaning of finalQuestions materi
    const cleanedQuestions = finalQuestions.map((q: any) => {
      if (q && q.materi) {
        q.materi = cleanMateriInServer(q.materi);
      }
      return q;
    });

    // Run programmatic de-duplication to guarantee 100% uniqueness of questions and choices
    const deduplicatedQuestions = findAndFixDuplicateQuestions(cleanedQuestions, subject);

    // Final pristine alignment: Force correct answer positions and alphabetical letters to EXACTLY match Kisi-Kisi row keys
    const fullyAlignedQuestions = alignQuestionsWithKisiKisiAnswerKeys(deduplicatedQuestions, sanitizedKisiKisi);

    res.json(fullyAlignedQuestions);
  } catch (error: any) {
    console.error("Error generating soal, activating offline premium fallback:", error);
    res.setHeader("X-Fallback-Used", "true");
    const fallbackData = generateFallbackSoal(schoolInfo, subject, sanitizedKisiKisi);
    
    // Clean and sanitize fallback questions
    const cleanedFallback = fallbackData.map((q: any) => {
      if (q && q.materi) {
        q.materi = cleanMateriInServer(q.materi);
      }
      return q;
    });
    
    // Also de-duplicate fallback data
    const deduplicatedFallback = findAndFixDuplicateQuestions(cleanedFallback, subject);
    
    // Final pristine alignment for fallback too
    const fullyAlignedFallback = alignQuestionsWithKisiKisiAnswerKeys(deduplicatedFallback, sanitizedKisiKisi);

    res.json(fullyAlignedFallback);
  }
});

// 4. API: Generate or Regenerate Individual SVG/Image for a Specific Question
app.post("/api/generate-prompt", async (req, res) => {
  const { subject, question, userApiKey } = req.body;
  const keyToUse = (userApiKey || req.headers["x-user-api-key"] || "").toString();
  try {
    if (!question || !question.questionText) {
      return res.status(400).json({ error: "Data naskah soal tidak lengkap." });
    }
    const elaborated = await translateAndElaboratePromptForImagen(subject, question, "", keyToUse);
    res.json({ prompt: elaborated });
  } catch (error: any) {
    console.error("Error generating prompt:", error);
    res.status(502).json({ error: error.message || "Gagal membangkitkan prompt AI." });
  }
});

app.post("/api/generate-individual-image", async (req, res) => {
  const { subject, question, userApiKey } = req.body;
  const keyToUse = (userApiKey || req.headers["x-user-api-key"] || "").toString();
  try {
    if (!question || !question.questionText) {
      return res.status(400).json({ error: "Data naskah soal tidak lengkap." });
    }

    // ALWAYS try Google Imagen 3 first to guarantee a relevant, accurate, and stunning educational graphic!
    try {
      console.log(`[generate-individual-image] Starting premium Google Imagen 3 generation for subject: ${subject}`);
      const promptStr = await translateAndElaboratePromptForImagen(subject, question, question.imagenPrompt || question.imagePrompt, keyToUse);
      console.log(`[generate-individual-image] Elaborated prompt: "${promptStr}"`);
      const imageBytes = await generateImagenImage(promptStr, 2, keyToUse);
      if (imageBytes) {
        console.log(`[generate-individual-image] Google Imagen 3 generation succeeded! Returning high-quality educational asset.`);
        return res.json({
          imageUrl: imageBytes,
          svgContent: ""
        });
      }
      console.warn(`[generate-individual-image] Imagen did not return image bytes. Hoisting to fallback SVG/Gemini generator...`);
    } catch (imagenError) {
      console.error(`[generate-individual-image] Google Imagen 3 failed:`, imagenError);
    }

    const ai = getAiClient();
    const prompt = `
      Anda adalah seorang desainer grafis materi pembelajaran SD nasional (Kurikulum Merdeka) yang sangat mahir membuat ilustrasi SVG edukatif yang bersih, akurat, dan bermakna.

      Detail Soal yang memerlukan gambar:
      - Bidang Pelajaran: ${subject || "Umum"}
      - Materi Pokok: ${question.materi || "Materi Umum"}
      - Jenis Soal: ${question.questionType || "Pilihan Ganda"}
      - Teks Soal: "${question.questionText}"
      - Pilihan Jawaban (bila PG): ${JSON.stringify(question.options || [])}
      - Kunci Jawaban: "${question.answerKey || ""}"

      TUGAS UTAMA:
      Buatkan satu kode XML SVG murni yang sangat relevan, presisi, dan indah untuk membantu murid menjawab atau memahami konteks soal di atas.

      ATURAN DESAIN KARAKTER ANAK SD INDONESIA (WAJIB):
      - Jika ilustrasi menggambarkan anak sekolah dasar, Anda WAJIB menggambarkan mereka memakai seragam sekolah dasar negeri Indonesia yang otentik: Baju kemeja lengan pendek warna putih terang (gunakan fill putih #ffffff atau abu-abu sangat muda #f8fafc) dan celana (laki-laki) atau rok rempel (perempuan) berwarna merah hati (gunakan warna merah tajam/merah hati seperti #dc2626 atau #b91c1c). Kembalikan kode SVG dengan styling warna seragam yang tepat sasaran agar murid langsung mengenali identitas murid SD Indonesia secara instan dan akurat.

      Rekomendasi Konten Gambar & Nuansa Anak-Anak (Ramah Kelas 1-3):
      - Ilustrasi Kegiatan Anak: Untuk soal IPS/PKN/Bahasa Indonesia, Anda bisa melukiskan ikon/karakter anak sederhana (gaya kartun imut, wajah tersenyum khas Indonesia, memakai seragam kemeja putih lengan pendek and celana atau rok merah hati, atau siluet gotong royong anak berdua sedang menyiram bunga, memegang sapu lidi, menyapu lantai, memungut sampah, atau bermain bola/kelereng).
      - Matematika Pecahan: Gambarkan Diagram Lingkaran (misalnya semangka yang dipotong, cokelat batangan, pizza pecahan yang diarsir porsinya) dengan garis arsir tebal yang ramah anak.
      - Matematika Geometri: Gambarkan bangun datar (bidang miring, segitiga siku-siku, lingkaran) atau bangun ruang (kubus, limas, prisma, tabung) dengan garis luar (stroke) yang jelas, label huruf di sudutnya (misalkan A, B, C) berukuran besar dan terbaca jelas.
      - Sains / IPAS: Gambarkan rantai makanan sederhana bernuansa lucu (misal daun apel -> ulat bulu kartun -> burung kecil -> elang dengan panah dan ikon lucu), diagram siklus air dengan awan tersenyum ramah anak, organ tubuh sederhana dengan panah penunjuk tebal, dsb.

      PERSYARATAN TEKNIS SVG:
      1. KELUARAN HARUS berupa string XML SVG murni, diawali tag <svg> dan diakhiri tag </svg>.
      2. Responsif: Gunakan atribut viewBox (contoh: viewBox="0 0 250 200") dan abaikan atribut width / height yang bernilai tetap, atau pasang width="100%" height="auto" agar ramah responsive.
      3. Warna Ramah Cetak: Gunakan kombinasi warna hitam-putih, abu-abu, atau warna soft yang kontras tinggi dan terbaca jelas jika dicetak di kertas buram ujian atau difotokopi.
      4. Bebas Markdown: Kembalikan langsung isi tag SVG di dalam properti JSON tanpa penanda markdown "\`\`\`" atau "\`\`\`xml".

      Kembalikan data dalam JSON murni sesuai skema berikut.
    `;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah tim visual grafik PUSMENJAR/Kemendikbud yang ahli menulis kode SVG edukasi bermutu tinggi, bersih secara markup, responsif, dan mudah dipahami siswa SD.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            svgContent: {
              type: Type.STRING,
              description: "String XML SVG murni (tidak mengandung markdown atau kutipan backtick) yang mewakili ilustrasi soal.",
            },
          },
          required: ["svgContent"],
        },
      },
    }, 2, keyToUse);

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    
    // Fail-safe check: If generated SVG is empty, invalid, or missing, it indicates the AI model failed to produce a valid graphic.
    if (!parsed.svgContent || parsed.svgContent.trim().length === 0 || !parsed.svgContent.includes("<svg")) {
      return res.status(422).json({ error: "Gagal merumuskan gambar AI yang sesuai dengan materi." });
    }
    
    res.json(parsed);
  } catch (error: any) {
    console.error("Error generating individual image:", error);
    res.status(502).json({ error: error.message || "Gagal membangkitkan gambar AI kustom untuk materi ini." });
  }
});

// Helper to translate and elaborate Indonesian question details into detailed English Imagen prompts
async function translateAndElaboratePromptForImagen(
  subject: string,
  q: any,
  rawPrompt?: string,
  userApiKey?: string
): Promise<string> {
  const ai = getAiClient();
  
  // Enrich raw context to provide complete understanding of the question details to the AI prompt engineer
  const rawTextToAnalyze = `
    Mata Pelajaran / Subject: ${subject || "Umum"}
    Materi Pokok / Topic: ${q.materi || q.topic || ""}
    Stimulus / Context: ${q.stimulusText || ""}
    Butir Soal / Question: ${q.questionText || ""}
    Pilihan Jawaban / Multiple Choice Options: ${q.options ? JSON.stringify(q.options) : "Tidak ada/Isian/Uraian"}
    Kunci Jawaban / Correct Answer: ${q.answerKey || ""}
    Penjelasan Soal / Explanation of the Question: ${q.explanation || ""}
    User Suggested Prompt: ${rawPrompt || ""}
  `.trim();

  const qtext = (q.questionText || "").toLowerCase();
  const qmat = (q.materi || "").toLowerCase();
  const qstim = (q.stimulusText || "").toLowerCase();
  const combinedText = `${qtext} ${qmat} ${qstim}`.toLowerCase();

  const isPjok = (subject || "").toLowerCase().includes("pjok") || 
                  (subject || "").toLowerCase().includes("jasmani") || 
                  (subject || "").toLowerCase().includes("olahraga") ||
                  (subject || "").toLowerCase().includes("penjas") ||
                  qmat.includes("olahraga") ||
                  qmat.includes("jasmani") ||
                  qmat.includes("bola") ||
                  qmat.includes("sepak") ||
                  qmat.includes("atletik") ||
                  combinedText.includes("olahraga") ||
                  combinedText.includes("gerak") ||
                  combinedText.includes("bola") ||
                  combinedText.includes("sepak") ||
                  combinedText.includes("futsal") ||
                  combinedText.includes("kaki bagian") ||
                  combinedText.includes("menggiring") ||
                  combinedText.includes("mengkontrol") || // Typo tolerance
                  combinedText.includes("mengontrol") ||
                  combinedText.includes("lokomotor") ||
                  combinedText.includes("manipulatif") ||
                  combinedText.includes("voli") ||
                  combinedText.includes("kasti") ||
                  combinedText.includes("cone") ||
                  combinedText.includes("meliuk");

  const isMath = (subject || "").toLowerCase().includes("matematika") ||
                  qmat.includes("matematika") ||
                  combinedText.includes("hitung") ||
                  combinedText.includes("pecahan") ||
                  combinedText.includes("bangun datar") ||
                  combinedText.includes("geometri") ||
                  combinedText.includes("angka") ||
                  combinedText.includes("nilai tempat") ||
                  combinedText.includes("penjumlahan") ||
                  combinedText.includes("pengurangan") ||
                  combinedText.includes("jarum jam") ||
                  combinedText.includes("sudut") ||
                  combinedText.includes("pola bilangan") ||
                  combinedText.includes("piktogram") ||
                  combinedText.includes("diagram");

  let instructions = "";
  if (isPjok) {
    instructions = `
You are an expert AI Image Prompt Engineer specializing in creating ultra-detailed, highly descriptive, and fully complete English text-to-image prompts for sports and physical education (Google Imagen 3).
Analyze this Indonesian physical education (PJOK) exam question:
===
${rawTextToAnalyze}
===

Your task is to generate an incredibly comprehensive, highly detailed, and complete English prompt describing the EXACT active body posture, movement technique, drills, athletic stance, or sport scenery specified in the question context or correct answer.

CRITICAL DIRECTIVES FOR COMPLETE AND DETAILED PJOK PROMPTS:
1. PIXAR 3D CLAYMATION STYLE: The output MUST be a premium high-contrast 3D digital illustration in cute Pixar and Disney animation aesthetic, claymation style, clay render. You MUST specify vibrant saturated colors, warm soft volumetric lighting, raytraced soft shadows, polished clay and plastic textures, beautifully balanced composition, and a clean soft background. Absolutely do NOT write realistic, photography, photo, or real-life photoshoot terms.
2. COMPREHENSIVE VISUALIZATION: DO NOT summarize or output a short phrase or single sentence. You MUST expand the athletic posture, foot alignment, arm position, muscle tension, motion freeze, and the sport-specific equipment (like a soccer ball, badminton racket, volleyball, cone markings, or tennis net) into a lush, vivid description of 80 to 200 words.
3. HIGHLY DESCRIPTIVE LANGUAGE: Formulate a detailed active scene. Specify:
    - The action phase (e.g., intermediate phase of kick, prep stance, active dribbling, perfect balance phase).
    - The kid's form, movement, and concentrated/focused but friendly expression (e.g., highly focused, energetic 3D claymation Indonesian primary school child).
    - The surroundings (e.g., bright outdoor schoolyard, green soccer field, or indoor school gymnasium with polished wooden floor, under soft volumetric sunlight and raytraced shadows).
4. SPECIFIC EXAMPLES:
    - "menggiring" (dribbling): Describe a detailed active scene of a cute 3D Pixar-style schoolboy dribbling a classic black and white soccer ball on green grass with the outer margin of his shoe.
    - "sikap kapal terbang" (airplane balance): Describe a cute 3D Pixar-style Indonesian school child standing on one leg, body tilted forward, other leg straight back, arms wide like wings, maintaining balance with a happy expression.
5. INDONESIAN PE UNIFORM: Describe the child as an Indonesian child wearing a neat, colorful public school physical education (PE) sports uniform or clean elementary school uniform.
6. STRIKT REGEL (EXTREMELY FORBIDDEN):
    - ABSOLUTELY NO INDONESIAN WORDS OR RAW SENTENCES FROM THE QUESTION: You must translate everything into beautiful visual English descriptive words. Never output any Indonesian sentences or words!
    - ABSOLUTELY NO QUOTATION MARKS: Do not write any part of the scene or descriptions inside quotation marks (single or double) in the final output. The image generator interprets quotation marks as instructions to draw physical letters or text on the screen!
    - ABSOLUTELY NO WRITTEN TEXT, LETTERS, OR LABELS: Ensure there are absolutely no letters, labels, words, numbers, or pointer tags drawn anywhere on any object or backdrop.
    - ABSOLUTELY NO USER INTERFACES OR SCREEN LAYOUTS: Do not describe edit boxes, menus, templates, dialog boxes, UI mockups, or application windows. Describe ONLY the organic, pure physical scene contents (the kids, the gym, the soccer field, etc.).
7. MUST INCLUDE EXACT ENFORCED ENDING SUFFIX: You must append the exact sentence: "This illustration is meticulously crafted to be fully relevant to the educational question text, presenting accurate subjects, physical objects, athletic activities, backgrounds, and cultural visual context with adorable Pixar styling."
8. NO INTRO OR OUTRO: Output ONLY the raw final English prompt string. No intro, explanation, metadata, backticks, or quotes.
`.trim();
  } else if (isMath) {
    instructions = `
You are an expert AI Image Prompt Engineer specializing in generating ultra-precise, highly clear, and mathematically accurate English text-to-image prompts for elementary school math illustrations (Google Imagen 3).
Analyze this Indonesian elementary school Mathematics (Matematika) question context, numerical details, and data:
===
${rawTextToAnalyze}
===

Your task is to generate an incredibly focused, mathematically structured, and detailed English prompt of 100 to 250 words describing the EXACT mathematical schema, counting objects, geometric shapes, clocks, or fractions.

CRITICAL DIRECTIVES FOR PRECISION MATHEMATICS PROMPTS (MUST ADHERE STRICTLY):
1. CLARITY AND ACCURACY: Visual fidelity is critical for math. If the question involves counting, the number of displayed items MUST MATCH THE QUESTION DETAILS EXACTLY. Describe each object and its precise layout. Do NOT use abstract metaphors.
2. CATEGORICAL INSTRUCTIONS:
    - FOR FRACTIONS / PECAHAN: Identify the fraction mentioned (e.g. 1/2, 1/3, 1/4, 2/4, 3/8). Describe a simple, beautiful top-down 3D model of a round object (such as a chocolate bar, freshly baked pizza, or sweet cake) divided into exactly the denominator's equal slices (e.g. "exactly four equal quarter slices"). Describe exactly the numerator's count of slices (e.g. "exactly three slices") having a distinct bright color, or being pulled out slightly with a neat soft shadow to represent the fraction perfectly.
    - FOR GEOMETRY / BANGUN DATAR / GEOMETRI: Describe a perfectly symmetrical, pristine 3D digital model of the shape (e.g., green cube, yellow cylinder, blue cone, pink sphere, or red triangle) resting on a clean solid flat surface under soft studio lights. The lines and corners of the shape MUST be highly defined, sharp, and easy to recognize. Ensure there is no perspective distortion.
    - FOR COUNTING / PENJUMLAHAN / PENGURANGAN: Translate the counting items and count them exactly. Describe they are arranged neatly in rows or distinct groups on a clean desk. For example: "A group of exactly 5 bright red glossy apples on the left side, and a separate group of exactly 3 bright red glossy apples on the right side, arranged neatly on a plain off-white wooden table."
    - FOR CLOCKS / JAM: If the question focuses on reading a clock, describe a front-facing round analog clock on a wall or a table. State clearly: "The clock face shows clear thick numbers 1 to 12. The short hour hand points perfectly and directly at number X, and the long minute hand points perfectly and directly at number Y." Replace X and Y with the actual times mentioned in the question.
    - FOR CHARTS OR MEASURING / PENGUKURAN: If measuring with an object (like a ruler or non-standard jengkal), describe a clean, front-facing parallel arrangement.
3. VISUAL STYLE: Use a clean 3D clay render model look, vibrant primary colors, sharp focus, with high-contrast outlines, on a solid soft pastel-gray or white background. Keep the scene entirely free of any decorative background clutter, leaves, animals (unless in the math story), or abstract shapes that are not in the question.
4. STRICT RULES:
    - ABSOLUTELY NO INDONESIAN WORDS OR RAW SENTENCES FROM THE QUESTION: Translate all concepts into elegant visual English descriptive words. Never output Indonesian phrases or question fragments in the prompt.
    - ABSOLUTELY NO QUOTATION MARKS: Do not write any words in single or double quotes in the final output. The image model gets confused by quotation marks and draws text.
    - ABSOLUTELY NO ALPHANUMERIC TEXT, LETTERS, OR LABELS: It is STRICTLY FORBIDDEN to write actual alphanumeric text, variable letters (like 'A', 'B', 'x'), math symbols (like '+', '-', '='), or labels in the prompt, because AI image generators create ugly garbled text. Instead, represent relationships purely through beautiful, clean physical objects or spatial placement.
    - ABSOLUTELY NO USER INTERFACES OR SCREEN LAYOUTS: Do not describe any edit boxes, buttons, text fields, menu options, web pages, or layout borders. Describe only the clean mathematical items.
5. MUST INCLUDE EXACT ENFORCED ENDING SUFFIX: You must append the exact sentence: "This illustration is meticulously crafted to be fully relevant to the educational question text, presenting accurate subjects, physical objects, athletic activities, backgrounds, and cultural visual context with adorable Pixar styling."
6. Output ONLY the final elaborated English prompt string. No intro, explanations, metadata, markdown backticks, or quote blocks.
`.trim();
  } else {
    instructions = `
You are an expert AI Image Prompt Engineer specializing in creating ultra-detailed, highly descriptive, and fully complete English text-to-image prompts for educational figures (Google Imagen 3).
Analyze this Indonesian elementary school exam question context and data:
===
${rawTextToAnalyze}
===

Your task is to generate a comprehensive, highly detailed, and complete English prompt that visualizes the EXACT scenario, biology diagram, physical mechanism, math geometry shape, or historical/social event requested.

CRITICAL DIRECTIVES FOR COMPLETE AND DETAILED PROMPTS:
1. PIXAR 3D CLAYMATION STYLE: The output MUST be a premium high-contrast 3D digital illustration in cute Pixar and Disney animation aesthetic, claymation style, clay render. You MUST specify vibrant saturated colors, warm soft volumetric lighting, raytraced soft shadows, polished clay and plastic textures, beautifully balanced composition, and a clean soft background. Absolutely do NOT write realistic, photography, photo, or real-life photoshoot terms.
2. COMPREHENSIVE SCENE DESCRIPTION: DO NOT write a quick placeholder or a single generic sentence. You MUST produce a rich, multi-sentence prompt of 80 to 250 words describing the entire composition, the foreground objects, background scenery, lighting direction, texture details, color palette, and visual mood.
3. TRANSLATE & ELABORATE ALL CONCEPTS:
    - Identify the main Indonesian core concepts, subjects, species, equipment, or events from the question text/materials/answerkey. Translate them into precise English terms.
    - Expand them fully into physical, visual descriptions. For example, instead of "tumbuhan", describe a small leafy green plant in a rustic clay pot on a wooden windowsill, with vibrant green leaves showing delicate clay contours, soft volumetric sunlight casting gentle shadows.
4. SCENARIO CUSTOMIZATION:
    - Science/IPAS (plants, animals, organs, magnets, water cycle): Describe scientific phenomena as beautiful, polished 3D clay models and diagrams (e.g., "A cute 3D clay render, Pixar styled 3D model of a bright green grasshopper showing its physical anatomy, resting on a textured tomato leaf with shiny clay water droplets, isolated on a clean soft studio background with volumetric lighting.")
    - Math/Geometry/Clocks: Describe absolute exact configurations. E.g., for fractions, describe the exact segmented object (like "A top-down, clean 3D claymation diagram of a round pizza on a bright white background, divided into four identical slices. Exactly one slice is separated slightly with a cute soft shadow and colored highlight...")
    - Social Studies/PPKn/Story Scenarios: ALWAYS use adorable, friendly 3D visual styles! State: "Vibrant high-contrast 3D digital illustration, cute Pixar and Disney animation aesthetic, clay render style. A pair of cheerful Indonesian elementary school kids—one boy and one girl with charming friendly smiles—wearing clean authentic public school uniforms (pristine white short-sleeved shirts with national red tie and emblem badges, paired with brick-red shorts and pleated skirts). They are shown performing the schoolyard cleaning activity with wooden leaf brooms. Colorful background of an Indonesian schoolyard, warm bright overhead volumetric sunlight, soft shadows, beautiful visual composition."
5. STRICT RULES AGAINST TEXT & UI CLUTTER:
    - ABSOLUTELY NO INDONESIAN WORDS OR RAW SENTENCES FROM THE QUESTION: Identify and translate all Indonesian core concepts to descriptive English. Do not write any Indonesian words or literal Indonesian sentences in the output.
    - ABSOLUTELY NO QUOTATION MARKS: Do not wrap any segment, description, or action in single or double quotes. If the output contains quotes, the image generator will draw messy alphanumeric letters and text labels in the image itself.
    - ABSOLUTELY NO WRITTEN TEXT, LETTERS, OR LABELS: Ensure there are absolutely no letters, labels, words, or numbers drawn on any object or backdrop to prevent garbled text.
    - ABSOLUTELY NO USER INTERFACES OR MODAL LAYOUTS: Do not describe edit boxes, prompt text boxes, buttons, cancel buttons, save buttons, or layouts of text editors. Output only the pure visual scene or subject itself.
6. NO INTRO OR OUTRO: Output ONLY the final elaborated English prompt string. No intro, explanation, metadata, backticks, or quotes.
`.trim();
  }

  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: instructions,
      config: {
        systemInstruction: "You are a professional image prompt generator. You output the final highly descriptive English prompt directly based on the provided instructions.",
        temperature: 0.6,
        maxOutputTokens: 600,
      }
    }, 2, userApiKey);

    if (response && response.text) {
      let result = response.text.trim();
      // Remove backticks and any codeblock markdown
      if (result.startsWith("```")) {
        result = result.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
      }
      // Remove leading/trailing quotation marks that might be outputted
      let cleaned = result.replace(/^["'`]|["'`]$/g, '').trim();
      // Remove any internal double-quotes entirely to prevent the image generator from writing text
      cleaned = cleaned.replace(/"/g, '');

      // Force enforce exact endings as requested by the user
      const enforcedSuffix = "This illustration is meticulously crafted to be fully relevant to the educational question text, presenting accurate subjects, physical objects, athletic activities, backgrounds, and cultural visual context with adorable Pixar styling. ANDA WAJIB MENGHASILKAN GAMBAR YANG RELEVAN DENGAN SOAL, BAIK ITU TOKOH, SUBJEK, OBJEK, AKTIFITAS, LATAR, LINGKUNGAN, BUDAYA, AGAMA, TEMA DAN LAINNYA.";
      
      // If the model output already contains similar phrases, let's strip them first to prevent duplicates
      const indicators = [
        "This illustration is meticulously",
        "ANDA WAJIB MENGHASILKAN",
        "Anda wajib menghasilkan"
      ];
      for (const indicator of indicators) {
        if (cleaned.includes(indicator)) {
          const idx = cleaned.indexOf(indicator);
          cleaned = cleaned.slice(0, idx).trim();
        }
      }

      cleaned = cleaned.trim();
      if (!cleaned.endsWith(".")) {
        cleaned += ".";
      }
      
      // Clean up any remaining double quotes
      cleaned = cleaned.replace(/"/g, '');

      return (cleaned + " " + enforcedSuffix).trim();
    }
  } catch (err: any) {
    console.error("[translateAndElaboratePromptForImagen] Failed to elaborate prompt with Gemini:", err);
  }

  // Fallback to original prompt if Gemini call fails
  return rawPrompt || q.imagenPrompt || q.imagePrompt || q.questionText || "vibrant educational vector clipart illustration";
}

// 5. API: Generate actual PNG/JPEG Image via Google Imagen
app.post("/api/generate-image", async (req, res) => {
  const { subject, question, prompt, userApiKey } = req.body;
  const keyToUse = (userApiKey || req.headers["x-user-api-key"] || "").toString();
  try {
    const q = question || {};
    
    // Dynamically translate and elaborate the prompt using Gemini 2.5 Flash before sending it to Imagen
    console.log(`[API Generate Image] Running Gemini Translator & Elaborator on Indonesian question...`);
    const promptStr = await translateAndElaboratePromptForImagen(subject, q, prompt, keyToUse);
    console.log(`[API Generate Image] Elaborated English Prompt for Imagen: "${promptStr}"`);

    const imageBytes = await generateImagenImage(promptStr, 2, keyToUse);
    if (imageBytes) {
      return res.json({ imageUrl: imageBytes });
    }

    // Fallback: use Unsplash verified education stock pictures mapping
    const fallbackUrl = getRelevantVerifiedUnsplashUrl(
      subject || "Umum", 
      q.questionText || "", 
      q.materi || "", 
      q.stimulusText || "", 
      promptStr
    );
    console.log(`[API Generate Image Fallback] Imagen failed, resolving to Unsplash fallback URL: ${fallbackUrl}`);
    res.json({ imageUrl: fallbackUrl, isFallback: true });
  } catch (error: any) {
    console.error("Error generating image via /api/generate-image:", error);
    res.status(500).json({ error: error.message || "Gagal memproses gambar AI." });
  }
});

// Setup Vite & static serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT}`);
  });
}

if (!process.env.NETLIFY && !process.env.LAMBDA_TASK_ROOT) {
  start().catch((err) => {
    console.error("Server startup failure:", err);
  });
}

export default app;
