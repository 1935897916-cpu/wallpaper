import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Download, 
  RefreshCw, 
  X, 
  Smartphone, 
  Layers, 
  History, 
  Clock, 
  ChevronRight, 
  Smile, 
  Check, 
  Trash2,
  Info 
} from "lucide-react";
import { Wallpaper, GenerationBatch, PresetVibe } from "./types";

const PRESET_VIBES: PresetVibe[] = [
  {
    name: "Cyberpunk City",
    description: "Rainy neon aesthetic storefronts",
    emoji: "🌧️",
    prompt: "An atmospheric rainy cyberpunk quiet street, glowing neon signs reflections, cozy alley cafe storefront, lo-fi nocturnal vibe, cinematic composition"
  },
  {
    name: "Pastel Dreamscape",
    description: "Whimsical clouds and floating castles",
    emoji: "🌸",
    prompt: "Surreal whimsical fantasy landscape with pastel pink clouds, a giant glowing crescent moon, soft pastel floral details, magical aesthetic"
  },
  {
    name: "Zen Mountains",
    description: "Minimalist Scandinavian design lines",
    emoji: "⛰️",
    prompt: "Minimalist Japanese woodblock style landscape, stylized geometric mountain peaks, serene warm sunset, abstract neutral earthy colors, clean elegance composition"
  },
  {
    name: "Retro Synthwave",
    description: "80s neon highway laser grids",
    emoji: "🕶️",
    prompt: "Dynamic synthetic sunset neon grid horizon, retro futuristic wireframe desert canyon, nostalgic 1980s retro cyber neon, high aesthetic appeal"
  },
  {
    name: "Emerald Nebula",
    description: "Mystical stellar dust constellations",
    emoji: "🌌",
    prompt: "Deep space high-contrast stellar nebula, magical swirling emerald stardust patterns, cosmic celestial clouds, abstract space dreamscape"
  },
  {
    name: "Ghibli Meadow",
    description: "Sun-drenched grassy cottage hills",
    emoji: "🍵",
    prompt: "Sunlight-bathed rolling grassy hills with small flowers, cozy rustic cottage, soft fluffy summer clouds in blue sky, whimsical studio illustration"
  }
];

const LOADING_MESSAGES = [
  "Mixing base aesthetic templates...",
  "Synthesizing customized lighting paths...",
  "Harmonizing fine resolution detail structures...",
  "Adapting viewport aspect ratios to 9:16...",
  "Applying creative temperature variations...",
  "Generating unique visual seeds...",
  "Polishing final custom candidates..."
];

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [variations, setVariations] = useState<Wallpaper[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [batches, setBatches] = useState<GenerationBatch[]>([]);
  
  // Lightbox modal state
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [previewLockScreen, setPreviewLockScreen] = useState(false);
  
  // Feedback notification state
  const [notification, setNotification] = useState<string | null>(null);
  
  // Scroll anchors
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const loadingIntervalRef = useRef<any>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("wallvibe_history");
      if (stored) {
        setBatches(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse history archive from state:", e);
    }
  }, []);

  // Sync batch updates with local storage
  const saveBatchesToLocalStorage = (newBatches: GenerationBatch[]) => {
    try {
      localStorage.setItem("wallvibe_history", JSON.stringify(newBatches));
    } catch (e) {
      console.error("Local storage sync error:", e);
    }
  };

  // Rotating loading message cycle
  useEffect(() => {
    if (isLoading) {
      let index = 0;
      loadingIntervalRef.current = setInterval(() => {
        index = (index + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[index]);
      }, 2500);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, [isLoading]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleGenerate = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const targetedPrompt = customPrompt || prompt;

    if (!targetedPrompt.trim()) {
      showNotification("Please describe a vibe first!");
      return;
    }

    setIsLoading(true);
    setLoadingMessage(LOADING_MESSAGES[0]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: targetedPrompt,
          referenceImage: referenceImage || undefined,
          referenceMimeType: referenceImage?.startsWith("data:image/webp") ? "image/webp" : "image/png"
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Generation endpoint communication breakdown");
      }

      const data = await response.json();
      if (data.success && data.variations) {
        const newBatch: GenerationBatch = {
          id: `batch-${Date.now()}`,
          vibe: targetedPrompt,
          timestamp: Date.now(),
          variations: data.variations,
          referenceImage: referenceImage || undefined
        };

        const updatedHistory = [newBatch, ...batches];
        setBatches(updatedHistory);
        saveBatchesToLocalStorage(updatedHistory);
        setVariations(data.variations);
        showNotification("Success! 4 stunning phone wallpaper variations created.");
        
        // Scroll smoothly to results
        setTimeout(() => {
          window.scrollTo({ top: window.innerHeight * 0.45, behavior: "smooth" });
        }, 300);
      } else {
        throw new Error(data.error || "The service returned an invalid sequence structure.");
      }
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Encountered an issue calling the generator service.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectPreset = (p: PresetVibe) => {
    setPrompt(p.prompt);
    handleGenerate(undefined, p.prompt);
  };

  const handleDownload = (wallpaper: Wallpaper) => {
    try {
      const link = document.createElement("a");
      link.href = wallpaper.url;
      // Sanitize vibe keyword for filename
      const cleanedLabel = prompt.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20) || "wallpaper";
      link.download = `aura_${cleanedLabel}_${wallpaper.seed}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification("Download triggered successfully!");
    } catch (err) {
      console.error("Local client download fallback error:", err);
      showNotification("Failed physical download. Try right clicking to save.");
    }
  };

  const handleRemixInit = (wallpaper: Wallpaper) => {
    setReferenceImage(wallpaper.url);
    setSelectedWallpaper(null); // Close Lightbox
    
    // Automatically pre-populate input prompt or focus
    if (!prompt.includes("remixed from")) {
      setPrompt((prev) => prev ? `${prev} (remixed)` : "Add some style alterations here...");
    }
    
    showNotification("Image set as style reference! Describe your next remix design changes below.");
    
    // Scroll viewport to search query context smoothly
    inputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const clearHistoryBatch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = batches.filter(b => b.id !== id);
    setBatches(updated);
    saveBatchesToLocalStorage(updated);
    showNotification("Generation history item cleared.");
  };

  const clearReference = () => {
    setReferenceImage(null);
    showNotification("Remix stylesheet reference cleared.");
  };

  // Mock Date format helper for lock screen layout
  const getSimulatedDate = () => {
    const d = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans antialiased overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* Absolute notification bar */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-950/90 border border-zinc-800 text-zinc-100 text-sm py-3 px-6 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md"
            id="aura-notification"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <p className="font-medium">{notification}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-indigo-950/15 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Core Responsive Frame Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-8 md:gap-12" id="main-frame-root">
        
        {/* Humble and Aesthetic Heading Line */}
        <header className="text-center flex flex-col items-center gap-3" id="app-header">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            WALLGEN AI
          </motion.div>
          <h1 className="text-3xl md:text-5xl font-extrabold font-display tracking-tight text-white mb-1" id="main-title">
            Phone Wallpaper Generator
          </h1>
          <p className="text-sm md:text-base text-zinc-400 max-w-lg mx-auto" id="main-subtitle">
            Describe your current vibe to generate high-quality 9:16 mobile wallpapers. Tap to expand, download, or remix themes.
          </p>
        </header>

        {/* Input Interface Block */}
        <section 
          ref={inputSectionRef}
          className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 backdrop-blur-md flex flex-col gap-6"
          id="generation-control-panel"
        >
          {/* Form Context */}
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="vibe-prompt" className="text-xs font-semibold text-zinc-500 uppercase tracking-widest font-mono">
                Current Style Vibe Prompt
              </label>
              
              <div className="relative group/input flex items-center">
                <textarea
                  id="vibe-prompt"
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Rainy cyberpunk lo-fi with neon reflections..."
                  className="w-full bg-zinc-950/80 border border-zinc-805/70 group-hover/input:border-zinc-800 focus:border-indigo-500 rounded-2xl py-3.5 pl-4 pr-12 text-sm text-white placeholder:text-zinc-650 outline-none transition-all resize-none focus:ring-2 focus:ring-indigo-500/20"
                  disabled={isLoading}
                />
                
                {prompt && (
                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-opacity"
                    title="Clear prompt"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Remix Reference Active Banner */}
            <AnimatePresence>
              {referenceImage && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                  id="remix-banner"
                >
                  <div className="flex items-center justify-between gap-4 bg-indigo-950/15 border border-indigo-900/30 p-3.5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-16 rounded-lg overflow-hidden border border-zinc-800 relative flex-shrink-0 bg-black">
                        <img 
                          src={referenceImage} 
                          alt="Style referencing source" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Remix Mode Engaged
                        </span>
                        <span className="text-xs text-zinc-400 line-clamp-1 max-w-[200px] md:max-w-md">
                          Selected wallpaper set as styling reference for upcoming variations
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearReference}
                      className="p-1.5 rounded-full hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-all"
                      title="Dismiss style reference"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trigger Button Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
              <div className="text-xs text-zinc-550 flex items-center gap-2 font-mono">
                <Smartphone className="w-4 h-4 text-zinc-500" />
                OUTPUT ASPECT RATIO: 9:16 (MOBILE FULL SCREEN)
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className={`py-4 px-8 rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  isLoading || !prompt.trim()
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-transparent"
                    : "bg-white text-black hover:bg-zinc-200 active:scale-[0.98] transition-colors shadow-xl"
                }`}
                id="generate-button"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Spinning up batch...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Theme</span>
                    <span className="text-[10px] bg-zinc-150 text-zinc-800 px-1.5 py-0.5 rounded font-mono font-medium">1 CREDIT</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Spark Inspiration Preset Vibes Column */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest font-mono">
              Trending Vibes
            </span>
            <div className="flex flex-wrap gap-2" id="preset-grid">
              {PRESET_VIBES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => selectPreset(preset)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-full text-xs md:text-sm border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer transition-colors inline-block text-left"
                  type="button"
                >
                  <span className="font-semibold">{preset.emoji} {preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Live Active Variations Workspace */}
        <section className="flex flex-col gap-4" id="active-canvas-section">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Active Render Batch
            </h2>
            {variations.length > 0 && (
              <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-850 py-1 px-3 rounded-full font-mono">
                4 Variations Created
              </span>
            )}
          </div>

          {/* Skeleton Framework / Screen Panel */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 bg-zinc-950/40 border border-zinc-900 rounded-3xl min-h-[300px] text-center gap-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-505 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="flex flex-col gap-2 max-w-sm">
                <h3 className="font-bold text-white text-lg font-display tracking-tight">Creating Wallpaper Iterations</h3>
                <p className="text-sm text-zinc-400 font-mono animate-pulse min-h-[20px]">{loadingMessage}</p>
                <span className="text-[10px] text-zinc-550">Generating 4 parallel render files natively at 9:16 aspect ratios</span>
              </div>
            </div>
          ) : variations.length > 0 ? (
            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.15 } }
              }}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              id="variations-grid"
            >
              {variations.map((wall, index) => (
                <motion.div
                  key={wall.id}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setSelectedWallpaper(wall)}
                  className="group relative aspect-[9/16] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-750 transition-all cursor-pointer shadow-md shadow-black/40 hover:shadow-indigo-500/5 hover:ring-2 hover:ring-indigo-500"
                >
                  <img 
                    src={wall.url} 
                    alt={`Wallpaper Variation ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle hover overlay details */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3.5">
                    <span className="self-end bg-zinc-900/80 backdrop-blur-md text-[10px] text-zinc-300 font-mono py-0.5 px-2 rounded-md border border-zinc-800">
                      Seed: {wall.seed}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-white line-clamp-1">Variation {index + 1}</span>
                      <span className="text-[9px] text-indigo-400 font-bold tracking-wider flex items-center gap-1 uppercase font-bold">
                        View Canvas <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* Ambient Welcome Card */
            <div className="flex flex-col items-center justify-center p-10 bg-zinc-950/20 border border-zinc-850 border-dashed rounded-3xl text-center min-h-[250px] gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-805 flex items-center justify-center text-zinc-500">
                <Smartphone className="w-6 h-6 text-zinc-500" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <h3 className="font-semibold text-zinc-300 text-sm">No Active Wallpaper Wallpaper</h3>
                <p className="text-xs text-zinc-500">
                  Select a predefined vibe template above or write custom keywords to produce a set of four modern mockups.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Dynamic Legacy History Blocks */}
        {batches.length > 0 && (
          <section className="flex flex-col gap-6" id="history-canvas-section">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <History className="w-5 h-5 text-zinc-500" />
                Style Generation History
              </h2>
              <button 
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete all wallpaper batches in history?")) {
                    setBatches([]);
                    saveBatchesToLocalStorage([]);
                    showNotification("History cleaned.");
                  }
                }}
                className="text-xs text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                title="Wipe historical records"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Archive
              </button>
            </div>

            <div className="flex flex-col gap-6" id="batches-history-container">
              {batches.map((batch) => (
                <div 
                  key={batch.id} 
                  className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-5 flex flex-col gap-3 group/batch"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-indigo-400 font-mono font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(batch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p className="text-sm font-semibold text-white line-clamp-1 group-hover/batch:text-indigo-300 transition-colors">
                        "{batch.vibe}"
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => clearHistoryBatch(batch.id, e)}
                      className="text-zinc-600 hover:text-rose-400 p-1 rounded-lg transition-colors opacity-0 group-hover/batch:opacity-100"
                      title="Delete archive item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {batch.variations.map((wall, index) => (
                      <div
                        key={wall.id}
                        onClick={() => setSelectedWallpaper(wall)}
                        className="relative aspect-[9/16] rounded-lg overflow-hidden border border-zinc-950 group/img cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                        title="Expand style card"
                      >
                        <img 
                          src={wall.url} 
                          alt="Historical wallpaper item" 
                          className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center">
                          <span className="text-[9px] font-bold text-white bg-zinc-900/95 py-0.5 px-1.5 rounded border border-zinc-800">
                            View
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Lightbox / Immersive Full-Screen Layout Model */}
      <AnimatePresence>
        {selectedWallpaper && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col md:flex-row items-center justify-center p-4 md:p-8 gap-6 overflow-y-auto"
            id="lightbox-canvas-active"
          >
            {/* Absolute close background area click */}
            <div className="absolute inset-0" onClick={() => setSelectedWallpaper(null)} />

            {/* Simulated Desktop Preview Controls SidePanel */}
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-sm aspect-[9/16] h-[75vh] md:h-[82vh] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-zinc-800 bg-black self-center flex-shrink-0"
              id="lock-screen-simulated-device"
            >
              <img 
                src={selectedWallpaper.url} 
                alt="Enlarged detailed print" 
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
              />

              {/* Toggled Interactive Phone Notification/Time Overlay Layer */}
              <AnimatePresence>
                {previewLockScreen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="absolute inset-0 bg-black/10 select-none flex flex-col justify-between p-6 pt-12 pb-8 text-center text-white font-sans pointer-events-none"
                  >
                    {/* Top center lock & simulated clock */}
                    <div className="flex flex-col items-center gap-1.5 font-sans">
                      <div className="w-5 h-5 bg-white/20 border border-white/30 rounded-full flex items-center justify-center mb-1 backdrop-blur-md">
                        <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2c-2.76 0-5 2.24-5 5v3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2v-3c0-2.76-2.24-5-5-5zm-3 7v-2c0-1.66 1.34-3 3-3s3 1.34 3 3v2h-6z" />
                        </svg>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/80">
                        {getSimulatedDate()}
                      </span>
                      <span className="text-5xl font-extrabold leading-none tracking-tight block">
                        09:41
                      </span>
                    </div>

                    {/* Bottom home gesture indicator bar */}
                    <div className="flex flex-col items-center gap-4">
                      <span className="text-[11px] font-medium text-white/75 bg-zinc-950/40 border border-white/10 px-3.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
                        Swipe up to open
                      </span>
                      <div className="w-28 h-1 bg-white/70 rounded-full" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Dynamic details column layout */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="relative z-10 w-full max-w-sm flex flex-col gap-5 text-left bg-zinc-900 border border-zinc-800 p-6 rounded-3xl backdrop-blur-md"
              id="wallpaper-lightbox-actions"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">
                    Wallpaper Card Metrics
                  </span>
                  <h3 className="text-lg font-bold font-display text-white">
                    Seed: {selectedWallpaper.seed}
                  </h3>
                </div>
                
                <button
                  onClick={() => setSelectedWallpaper(null)}
                  className="bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white p-2 rounded-full border border-zinc-800 transition-colors cursor-pointer"
                  title="Close expanded view"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Meta Prompt Section */}
              <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800 flex flex-col gap-1.5">
                <span className="text-[9px] font-mono tracking-widest text-indigo-400 font-semibold flex items-center gap-1.5 uppercase">
                  <Info className="w-3.5 h-3.5" /> Prompt Instruction Details
                </span>
                <p className="text-xs text-zinc-350 leading-relaxed italic">
                  "{selectedWallpaper.prompt || prompt}"
                </p>
              </div>

              {/* Action Operations Column */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => handleDownload(selectedWallpaper)}
                  className="w-full py-3.5 px-5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Download Wallpaper
                </button>

                <button
                  onClick={() => handleRemixInit(selectedWallpaper)}
                  className="w-full py-3.5 px-5 rounded-xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 font-semibold transition-all border border-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Use style as Reference (Remix)
                </button>

                <button
                  onClick={() => setPreviewLockScreen(!previewLockScreen)}
                  className={`w-full py-3.5 px-5 rounded-xl font-semibold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                    previewLockScreen
                      ? "bg-zinc-800 border-zinc-700 text-indigo-400"
                      : "bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-300"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  {previewLockScreen ? "Hide Device Layout Guide" : "Preview Device Lock Screen"}
                </button>
              </div>

              <div className="text-[10px] text-zinc-500 text-center font-mono">
                Full 9:16 portrait ratio compatible with standard screen sizes
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
