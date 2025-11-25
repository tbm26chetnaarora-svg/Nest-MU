
import { GoogleGenAI, Type } from '@google/genai';
import { ActivityCategory } from './types';

export interface AiSuggestion {
  title: string;
  category: ActivityCategory;
  time: string;
  cost: number;
  location?: string;
  notes: string;
}

export interface ActivityDetail {
  description: string;
  rating?: string;
  openingHours?: string;
  website?: string;
  phoneNumber?: string;
  address?: string;
  bestTime?: string;
}

const getApiKey = () => {
  try {
    // Try process.env first (System standard)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
    // Fallback to import.meta.env for Vite if process is not polyfilled
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env.VITE_API_KEY || (import.meta as any).env.API_KEY;
    }
  } catch (e) {
    console.error("Environment access error", e);
  }
  return '';
};

// --- FEATURE 1: ITINERARY GENERATION (JSON + Search Grounding) ---
export const generateDaySuggestions = async (
  destination: string,
  date: string,
  dayNumber: number,
  preferences?: string,
  existingTitles: string[] = []
): Promise<AiSuggestion[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  const exclusionNote = existingTitles.length > 0 
    ? `IMPORTANT: Do NOT suggest the following activities as they are already on the itinerary: ${existingTitles.join(', ')}.` 
    : '';

  const prompt = `
    You are an expert local travel guide planning a trip for a family.
    
    Trip Details:
    - Destination: ${destination}
    - Date: ${date} (Day ${dayNumber} of the trip)
    - User Preferences: ${preferences || "A balanced mix of famous landmarks, local food spots, and relaxing breaks."}
    
    ${exclusionNote}

    Task:
    Suggest 3 distinct, high-quality activities for this specific day.
    Find "Hidden Gems" or highly rated local favorites if the main attractions are taken.
    
    CRITICAL Requirements:
    1. **REAL PLACES ONLY**: You must use Google Search to verify that the places exist and are popular.
    2. **Specific Names**: Do NOT say "Lunch at a local cafe". Say "Lunch at Café de Flore".
    3. **Logical Flow**: Order them logically by time (Morning -> Afternoon -> Evening).
    4. **Family Friendly**: Ensure activities are suitable for a family.
    
    Output Format:
    Return a strictly valid JSON array (no markdown code blocks) where each object has these fields:
    - title (string)
    - category (one of: "Food", "Adventure", "Sightseeing", "Relax", "Travel", "Other")
    - time (string, 24h format HH:MM)
    - cost (number, estimated cost per person in USD)
    - location (string)
    - notes (string, short persuasive description)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 1.0, 
      }
    });

    const text = response.text;
    if (!text) return [];

    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as AiSuggestion[];

  } catch (error) {
    console.error("AI Suggestion Error:", error);
    throw error;
  }
};

// --- FEATURE 2: DESTINATION IMAGE GENERATION ---
export const generateDestinationImage = async (destination: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop";

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: `A breathtaking, cinematic, 4k highly detailed travel photography shot of ${destination} at golden hour. Wide angle, vibrant colors, photorealistic, professional travel magazine style. No text.`,
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    return "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop";
  } catch (error) {
    console.error("Image Gen Error:", error);
    return "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop";
  }
};

// --- FEATURE 2.1: IMAGE EDITING (Nano Banana) ---
export const editTripImage = async (imageBase64: string, prompt: string): Promise<string | null> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Strip data:image/xxx;base64, prefix if present
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const mimeType = imageBase64.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: cleanBase64, mimeType: mimeType } },
          { text: prompt },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
  } catch (error) {
    console.error("Image Edit Error:", error);
    throw error;
  }
};

// --- FEATURE 2.2: VIDEO TEASER GENERATION (VEO) ---
export const generateTripTeaser = async (destination: string, vibe: string): Promise<string | null> => {
  const win = window as any;

  // Helper to run the video generation
  const runGeneration = async (currentKey: string) => {
    const ai = new GoogleGenAI({ apiKey: currentKey });
    const prompt = `Cinematic drone shot of ${destination}. ${vibe}. 4k, hyper-realistic, travel documentary style, wide angle, slow smooth motion.`;

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll until complete with longer interval (10s)
    let retryCount = 0;
    while (!operation.done && retryCount < 60) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s
      operation = await ai.operations.getVideosOperation({ operation: operation });
      retryCount++;
    }

    if (!operation.done) {
        console.warn("Video generation timed out.");
        return null;
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) return null;

    // Fetch the actual video blob
    const response = await fetch(`${videoUri}&key=${currentKey}`);
    if (!response.ok) throw new Error("Failed to download video bytes");
    
    const blob = await response.blob();
    
    return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
  };

  // 1. Initial Key Check
  if (typeof win !== 'undefined' && win.aistudio) {
      try {
          const hasKey = await win.aistudio.hasSelectedApiKey();
          if (!hasKey) {
              await win.aistudio.openSelectKey();
          }
      } catch (e) {
          console.warn("AI Studio Key Selection failed", e);
      }
  }

  let apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    return await runGeneration(apiKey);
  } catch (error: any) {
    console.error("Veo Video Gen Error:", error);
    
    // 4. Handle specific 404 Entity Not Found error for Veo
    // This usually means the API key is not valid for Veo or no billing project is selected
    if (typeof win !== 'undefined' && win.aistudio && 
        (error.message?.includes("Requested entity was not found") || error.message?.includes("404") || error.status === 404)) {
            console.warn("Veo model access denied. Prompting for API Key...");
            try {
                await win.aistudio.openSelectKey();
                // Update key after selection
                const newKey = getApiKey();
                if (newKey) {
                    console.log("Retrying Veo generation with new key...");
                    return await runGeneration(newKey);
                }
            } catch (retryError) {
                console.error("Retry failed", retryError);
            }
    }
    return null;
  }
};

// --- FEATURE 3: FAST AI RESPONSES (Flash Lite) ---
export const getQuickTip = async (destination: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Have a great trip!";

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Using flash-lite for low latency tips
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite', 
      contents: `Give me one single, fascinating, short travel tip or fun fact about ${destination} for a family traveler. Under 30 words.`,
    });
    return response.text || "Explore the local culture!";
  } catch (error) {
    // console.error("Lite Tip Error:", error);
    // Fallback if lite is not available or errors
    return "Enjoy your adventure!";
  }
};

// --- FEATURE 4: ACTIVITY DETAILS (Deep Search) ---
export const getActivityDetails = async (activityTitle: string, location: string): Promise<ActivityDetail> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
  
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Find specific details for the place "${activityTitle}" in "${location}".
      I need practical info for a traveler.
      Use Google Search to find the most current info.
      
      Return a STRICT valid JSON object (no markdown) with these exact fields:
      {
        "description": "string (1 sentence overview)",
        "rating": "string (e.g. 4.5 stars)",
        "openingHours": "string (e.g. 9AM - 5PM)",
        "website": "string (url)",
        "phoneNumber": "string",
        "address": "string",
        "bestTime": "string (best time to visit)"
      }
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.7,
        }
      });
      
      const text = response.text || "{}";
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText) as ActivityDetail;
    } catch (error) {
      console.error("Detail Fetch Error", error);
      return { description: "Details unavailable." };
    }
  };

// --- FEATURE 5: GROUNDING (Search & Maps) ---
export interface GroundedResponse {
  text: string;
  webSources?: Array<{ uri: string; title: string }>;
  mapSources?: Array<{ uri: string; title: string }>;
}

export const getLiveDestinationInfo = async (query: string): Promise<GroundedResponse> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
      }
    });

    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    
    const webSources = groundingMetadata?.groundingChunks
      ?.filter((c: any) => c.web)
      .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));

    const mapSources = groundingMetadata?.groundingChunks
        ?.filter((c: any) => c.web && (c.web.uri.includes('maps.google') || c.web.uri.includes('google.com/maps')))
        .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));

    return {
      text: response.text || "No information found.",
      webSources,
      mapSources
    };

  } catch (error) {
    console.error("Grounding Error:", error);
    throw error;
  }
};

// --- FEATURE 6: CHATBOT (Pro & Live) ---
export const createChatSession = () => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    return ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
            systemInstruction: "You are NEST, a helpful family travel assistant. Be concise, friendly, and expert."
        }
    });
};

export const createLiveSession = () => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: "You are NEST, a cheerful family travel planner. Keep responses helpful and encouraging.",
      },
  });
};
