import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const IMAGE_PROMPT = `You are analyzing an engineering drawing for a CNC machine shop.

Extract key quoting information from this drawing and return ONLY a valid JSON object.

Return a JSON object with these fields (only include fields you can detect with confidence):
{
  "material": "string (e.g. Aluminium 6082-T6, Stainless Steel 316, EN8)",
  "quantity": number,
  "drawingNumber": "string",
  "revision": "string (e.g. A, B, 01, Rev2)",
  "tolerances": ["array of specific tight tolerance notes found, e.g. 0.01mm, H7, ±0.005"],
  "coatings": ["array of coating or finish requirements, e.g. Anodise black, Zinc plate, Hard chrome"],
  "inspectionNotes": ["array of inspection or quality requirements, e.g. 100% inspection, CMM report, FAIR"]
}

Rules:
- Only include fields you can clearly identify from the drawing
- Do not guess or invent information
- If the drawing is unreadable or has no detectable text, return { "unreadable": true }
- Return ONLY valid JSON, no markdown, no explanation`;

function parseResult(content: string) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

router.post("/ai/scan-drawing", async (req, res) => {
  const { imageData, mimeType } = req.body as {
    imageData?: string;
    mimeType?: string;
  };

  if (!imageData || !mimeType) {
    res.status(400).json({ error: "imageData and mimeType are required" });
    return;
  }

  const empty = { tolerances: [], coatings: [], inspectionNotes: [] };

  try {
    if (mimeType === "application/pdf") {
      res.json({ ...empty, unreadable: true });
      return;
    }

    const buffer = Buffer.from(imageData, "base64");
    const base64 = buffer.toString("base64");
    const imageUrl = `data:${mimeType};base64,${base64}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
            { type: "text", text: IMAGE_PROMPT },
          ],
        },
      ],
    });

    const parsed = parseResult(response.choices[0]?.message?.content ?? "");
    if (!parsed) {
      res.json({ ...empty, unreadable: true });
      return;
    }

    res.json({
      material: parsed.material,
      quantity: typeof parsed.quantity === "number" ? parsed.quantity : undefined,
      drawingNumber: parsed.drawingNumber,
      revision: parsed.revision,
      tolerances: Array.isArray(parsed.tolerances) ? parsed.tolerances : [],
      coatings: Array.isArray(parsed.coatings) ? parsed.coatings : [],
      inspectionNotes: Array.isArray(parsed.inspectionNotes) ? parsed.inspectionNotes : [],
      unreadable: parsed.unreadable === true,
    });
  } catch (err) {
    logger.error({ err }, "scan-drawing failed");
    res.status(500).json({ error: "Scan failed. Please try again." });
  }
});

export default router;
