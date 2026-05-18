import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

/* ── Material shorthand → full name mapping ─────────────────────
   Common workshop shorthands recognised by UK/EU machine shops. */
const MATERIAL_MAP: Record<string, string> = {
  HE30: "Aluminium 6082-T6",
  "6082": "Aluminium 6082-T6",
  "6061": "Aluminium 6061-T6",
  "7075": "Aluminium 7075-T6",
  "2024": "Aluminium 2024-T3",
  EN1A: "EN1A Free-Cutting Mild Steel",
  EN3: "EN3 Mild Steel",
  EN8: "EN8 Medium Carbon Steel",
  EN24: "EN24T Alloy Steel",
  EN24T: "EN24T Alloy Steel",
  EN36: "EN36 Case-Hardening Steel",
  "316": "Stainless Steel 316",
  "316L": "Stainless Steel 316L",
  "304": "Stainless Steel 304",
  "303": "Stainless Steel 303",
  "17-4PH": "Stainless Steel 17-4PH",
  "174PH": "Stainless Steel 17-4PH",
  S275: "S275 Structural Steel",
  S355: "S355 Structural Steel",
};

function mapMaterial(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim();
  const key = normalized.toUpperCase().replace(/[-\s]/g, "");
  for (const [k, v] of Object.entries(MATERIAL_MAP)) {
    if (k.toUpperCase().replace(/[-\s]/g, "") === key) return v;
  }
  return normalized;
}

const IMAGE_PROMPT = `You are analyzing an engineering drawing for a CNC machine shop.

Extract key quoting information from this drawing and return ONLY a valid JSON object.

Return a JSON object with these fields (only include fields you can detect with confidence):
{
  "material": "string (e.g. Aluminium 6082-T6, Stainless Steel 316, EN8, HE30)",
  "materialConfidence": "low" | "medium" | "high",
  "quantity": number,
  "drawingNumber": "string",
  "revision": "string (e.g. A, B, 01, Rev2)",
  "tolerances": ["array of specific tight tolerance notes found, e.g. ±0.01, H7, ±0.005, Ra 1.6"],
  "coatings": ["array of coating or finish requirements, e.g. Anodise black, Zinc plate, Hard chrome"],
  "inspectionNotes": ["array of inspection or quality requirements, e.g. 100% inspection, CMM report, FAIR"]
}

Rules:
- Only include fields you can clearly identify from the drawing
- For materialConfidence: use "high" if the material is clearly stated, "medium" if reasonably inferred, "low" if uncertain or guessed
- Recognise common workshop shorthand: HE30=Aluminium 6082-T6, EN8=medium carbon steel, 316=stainless steel 316, etc.
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

    const conf = parsed.materialConfidence as
      | "low"
      | "medium"
      | "high"
      | undefined;
    const validConf =
      conf === "low" || conf === "medium" || conf === "high" ? conf : undefined;

    res.json({
      material: mapMaterial(parsed.material),
      materialConfidence: validConf,
      quantity:
        typeof parsed.quantity === "number" ? parsed.quantity : undefined,
      drawingNumber: parsed.drawingNumber,
      revision: parsed.revision,
      tolerances: Array.isArray(parsed.tolerances) ? parsed.tolerances : [],
      coatings: Array.isArray(parsed.coatings) ? parsed.coatings : [],
      inspectionNotes: Array.isArray(parsed.inspectionNotes)
        ? parsed.inspectionNotes
        : [],
      unreadable: parsed.unreadable === true,
    });
  } catch (err) {
    logger.error({ err }, "scan-drawing failed");
    res.status(500).json({ error: "Scan failed. Please try again." });
  }
});

export default router;
