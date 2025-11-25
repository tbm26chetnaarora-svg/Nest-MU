import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, Minimize2, Mic, MicOff, Volume2 } from 'lucide-react';
import { createChatSession, createLiveSession } from '../aiClient';
import { GenerateContentResponse, LiveServerMessage } from '@google/genai';

interface Message {
  role: 'user' | 'model';
  text: string;
}

// --- Audio Helpers for Live API ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


export const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  
  // Text Chat State
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hi! I\'m NEST AI. Ask me anything about your travel plans!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Chat State
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, mode]);

  // Clean up voice session on unmount or close
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  const handleSendText = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession();
      }

      const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: userMsg });
      const responseText = result.text || "I'm having trouble thinking right now.";

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceSession = async () => {
    setIsVoiceConnecting(true);
    try {
      // 1. Setup Audio Context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 24000 }); // Output rate
      audioContextRef.current = ctx;
      
      const outputNode = ctx.createGain();
      outputNode.connect(ctx.destination);
      outputNodeRef.current = outputNode;
      nextStartTimeRef.current = 0;

      // 2. Setup Input Stream (Microphone)
      const inputCtx = new AudioCtx({ sampleRate: 16000 }); // Input rate must be 16kHz for Gemini
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      inputSourceRef.current = source;
      scriptProcessorRef.current = scriptProcessor;

      // 3. Connect to Live API
      const sessionPromise = createLiveSession();
      
      sessionPromise.then(session => {
         liveSessionRef.current = session;
         
         // Setup callbacks manually since createLiveSession returns a promise resolving to session with callbacks already attached? 
         // Wait, the new SDK pattern in instructions is ai.live.connect({ callbacks: ... }).
         // My aiClient helper returns the promise. I need to modify aiClient or re-implement here to attach callbacks properly.
         // Let's reimplement session creation here to attach callbacks properly.
      });

      // RE-IMPLEMENTING connection here to access callbacks directly
      const { GoogleGenAI, Modality } = await import('@google/genai');
      let apiKey = '';
      try {
          if (typeof process !== 'undefined' && process.env && process.env.API_KEY) apiKey = process.env.API_KEY;
          else if (typeof import.meta !== 'undefined' && (import.meta as any).env) apiKey = (import.meta as any).env.VITE_API_KEY || (import.meta as any).env.API_KEY;
      } catch (e) {}

      const ai = new GoogleGenAI({ apiKey });
      
      // We need to store the promise to send input later
      const sessionProm = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: "You are NEST, a cheerful family travel planner. Keep responses helpful and encouraging.",
        },
        callbacks: {
          onopen: () => {
            setIsVoiceConnected(true);
            setIsVoiceConnecting(false);
            
            // Connect Audio Pipeline
            scriptProcessor.onaudioprocess = (e) => {
               const inputData = e.inputBuffer.getChannelData(0);
               const pcmBlob = createBlob(inputData);
               sessionProm.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && ctx) {
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
               const bufferSource = ctx.createBufferSource();
               bufferSource.buffer = audioBuffer;
               bufferSource.connect(outputNode);
               bufferSource.addEventListener('ended', () => {
                  audioSourcesRef.current.delete(bufferSource);
               });
               bufferSource.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               audioSourcesRef.current.add(bufferSource);
            }
            
            // Handle Interruption
            if (msg.serverContent?.interrupted) {
               audioSourcesRef.current.forEach(s => s.stop());
               audioSourcesRef.current.clear();
               nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            stopVoiceSession();
          },
          onerror: (err) => {
            console.error("Live API Error", err);
            stopVoiceSession();
          }
        }
      });
      
      liveSessionRef.current = sessionProm; // Store the promise or session wrapper

    } catch (error) {
      console.error("Failed to start voice session", error);
      setIsVoiceConnecting(false);
    }
  };

  const stopVoiceSession = () => {
    setIsVoiceConnected(false);
    setIsVoiceConnecting(false);
    
    // Close Audio Contexts
    if (audioContextRef.current) {
       audioContextRef.current.close();
       audioContextRef.current = null;
    }
    if (scriptProcessorRef.current) {
       scriptProcessorRef.current.disconnect();
       scriptProcessorRef.current = null;
    }
    if (inputSourceRef.current) {
       inputSourceRef.current.disconnect();
       inputSourceRef.current = null;
    }
    
    // Close Live Session
    if (liveSessionRef.current) {
       liveSessionRef.current.then((s: any) => s.close());
       liveSessionRef.current = null;
    }
  };

  const toggleVoiceMode = () => {
    if (mode === 'text') {
       setMode('voice');
       startVoiceSession();
    } else {
       stopVoiceSession();
       setMode('text');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center ${
          isOpen ? 'bg-nest-800 text-nest-400 rotate-90' : 'bg-gradient-to-r from-accent-600 to-primary-600 text-white'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[70vh] bg-nest-950/90 backdrop-blur-xl border border-nest-700 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="p-4 border-b border-nest-800 bg-gradient-to-r from-nest-900 to-nest-950 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center text-white">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">NEST Assistant</h3>
                <p className="text-[10px] text-accent-400 font-mono">Gemini 1.5 Pro & Live</p>
              </div>
            </div>
            <div className="flex gap-2">
                <button 
                   onClick={toggleVoiceMode}
                   className={`p-2 rounded-lg transition-all ${mode === 'voice' ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-nest-400 hover:bg-nest-800 hover:text-white'}`}
                   title={mode === 'voice' ? "End Voice Chat" : "Start Voice Chat"}
                >
                   {mode === 'voice' ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="text-nest-500 hover:text-white p-2">
                  <Minimize2 size={16} />
                </button>
            </div>
          </div>

          {/* MODE CONTENT */}
          {mode === 'voice' ? (
             <div className="flex-1 flex flex-col items-center justify-center p-8 bg-nest-900/50">
                 <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${isVoiceConnected ? 'bg-accent-500/20 shadow-[0_0_50px_rgba(168,85,247,0.3)]' : 'bg-nest-800'}`}>
                    {isVoiceConnecting ? (
                        <Loader2 className="w-12 h-12 text-accent-400 animate-spin" />
                    ) : (
                        <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center ${isVoiceConnected ? 'animate-pulse' : ''}`}>
                             <Mic className="text-white w-8 h-8" />
                             {isVoiceConnected && (
                                <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping"></div>
                             )}
                        </div>
                    )}
                 </div>
                 
                 <h4 className="text-white font-bold text-lg mb-2">
                    {isVoiceConnecting ? "Connecting to Gemini Live..." : isVoiceConnected ? "Listening..." : "Disconnected"}
                 </h4>
                 <p className="text-nest-400 text-sm text-center">
                    {isVoiceConnected ? "Speak freely. I'm listening!" : "Check your microphone permissions."}
                 </p>
                 
                 <button onClick={toggleVoiceMode} className="mt-8 px-6 py-2 bg-nest-800 hover:bg-nest-700 text-nest-200 rounded-full text-sm font-medium transition-colors">
                    Switch to Text
                 </button>
             </div>
          ) : (
             <>
                {/* Text Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                        className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-primary-600 text-white rounded-br-none' 
                            : 'bg-nest-800 text-nest-100 rounded-bl-none border border-nest-700'
                        }`}
                        >
                        {msg.text}
                        </div>
                    </div>
                    ))}
                    {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-nest-800 p-3 rounded-2xl rounded-bl-none border border-nest-700 flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-accent-400" />
                        <span className="text-xs text-nest-400">Thinking...</span>
                        </div>
                    </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Text Input */}
                <div className="p-4 border-t border-nest-800 bg-nest-900/50">
                    <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Ask about your trip..."
                        className="flex-1 bg-nest-950 border border-nest-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-accent-500 outline-none transition-all placeholder:text-nest-600"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                    />
                    <button 
                        onClick={handleSendText}
                        disabled={isLoading || !input.trim()}
                        className="p-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                    </div>
                </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
