export interface Wallpaper {
  id: string;
  url: string; // Base64 data URI
  prompt: string;
  seed: number;
}

export interface GenerationBatch {
  id: string;
  vibe: string;
  timestamp: number;
  variations: Wallpaper[];
  referenceImage?: string; // Base64 reference used (if remix)
}

export interface PresetVibe {
  name: string;
  description: string;
  emoji: string;
  prompt: string;
}
