import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// Lazy initialize client to prevent startup crash if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please manage it via settings panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();

  // Handle larger payloads for base64 reference images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Endpoint to generate wallpapers
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, referenceImage, referenceMimeType } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Vibe description parameter prompt is required." });
      }

      const ai = getGenAI();

      // We will generate 4 variations in parallel
      // To ensure that the 4 images are indeed beautiful variations and not exact duplicates,
      // we append subtle compositing/aesthetic instructions to the prompt and use distinct random seeds!
      const modifiers = [
        "cinematic lighting, elegant masterpiece composition, crisp details",
        "dynamic wide composition, high dramatic contrast, vibrant atmosphere",
        "serene artistic framing, focus on rich textures, moody color grading",
        "abstract minimal layout, balanced negative space, modern aesthetic balance"
      ];

      const tasks = modifiers.map(async (mod, index) => {
        const enhancedPrompt = `${prompt}. ${mod}, high-quality 9:16 phone wallpaper.`;
        const seedValue = Math.floor(Math.random() * 1000000) + index * 37;

        const parts: any[] = [];
        
        // If a reference image is passed for remixing, we include it as the first part
        if (referenceImage && typeof referenceImage === "string") {
          // Keep base64 cleaned
          const base64Data = referenceImage.replace(/^data:image\/\w+;base64,/, "");
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: referenceMimeType || "image/png",
            },
          });
        }

        parts.push({ text: enhancedPrompt });

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: "9:16",
            },
            seed: seedValue,
            temperature: 1.0,
          },
        });

        // Extract the generated image
        let imageUrl = "";
        const candidates = response.candidates;
        if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
          for (const part of candidates[0].content.parts) {
            if (part.inlineData) {
              const base64EncodeString = part.inlineData.data;
              const mime = part.inlineData.mimeType || "image/png";
              imageUrl = `data:${mime};base64,${base64EncodeString}`;
              break;
            }
          }
        }

        if (!imageUrl) {
          throw new Error(`Failed to extract generated image for variation ${index}`);
        }

        return {
          id: `var-${index}-${seedValue}`,
          url: imageUrl,
          prompt: enhancedPrompt,
          seed: seedValue,
        };
      });

      const variations = await Promise.all(tasks);
      return res.json({ success: true, variations });

    } catch (error: any) {
      console.error("Image generation error:", error);
      return res.status(500).json({
        error: error.message || "An error occurred during wallpaper generation.",
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Vite Integration
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
    console.log(`Server starting on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start fullstack server", err);
});
