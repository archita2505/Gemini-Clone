import { GoogleGenAI } from "@google/genai";

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { prompt, previousInteractionId, image } = req.body ?? {};
  const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";

  if (!cleanPrompt && !image) {
    return res.status(400).json({
      error: "Enter a prompt or attach an image before sending.",
    });
  }

  if (previousInteractionId && (
    typeof previousInteractionId !== "string" ||
    !/^[\w-]{1,256}$/.test(previousInteractionId)
  )) {
    return res.status(400).json({
      error: "Invalid conversation reference. Start a new chat.",
    });
  }

  if (image !== undefined && image !== null) {
    if (
      typeof image !== "object" ||
      typeof image.data !== "string" ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data) ||
      image.data.length > 4_200_000 ||
      typeof image.mimeType !== "string" ||
      !allowedImageTypes.has(image.mimeType)
    ) {
      return res.status(400).json({
        error: "Attach a valid JPEG, PNG, WebP, or GIF image up to 3 MB.",
      });
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: "Gemini API is not configured. Add GEMINI_API_KEY in Vercel.",
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const input = [];

    if (cleanPrompt) {
      input.push({ type: "text", text: cleanPrompt });
    } else if (image) {
      input.push({ type: "text", text: "Describe this image." });
    }

    if (image) {
      input.push({
        type: "image",
        data: image.data,
        mime_type: image.mimeType,
      });
    }

    const result = await ai.interactions.create({
      model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
      input,
      ...(previousInteractionId
        ? { previous_interaction_id: previousInteractionId }
        : {}),
      store: true,
    });

    if (!result.output_text || !result.id) {
      return res.status(502).json({
        error: "Gemini returned an empty response.",
      });
    }

    return res.status(200).json({
      text: result.output_text,
      interactionId: result.id,
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return res.status(502).json({
      error:
        "Gemini could not generate a response. Check your API key, model access, quota, and Vercel function logs.",
    });
  }
}