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

const IMAGE_PROMPT = `You are analysing an engineering drawing for CNC machining quotation.

Extract all visible manufacturing and quoting information. If anything is unclear, use "not visible" rather than guessing.

Return ONLY a valid JSON object with these fields (only include fields you can detect):
{
  "partName": "string — part name or description from title block",
  "material": "string (e.g. Aluminium 6082-T6, Stainless Steel 316, EN8, HE30)",
  "materialConfidence": "low" | "medium" | "high",
  "quantity": number,
  "drawingNumber": "string",
  "revision": "string (e.g. A, B, 01, Rev2)",
  "finish": "string — surface treatment or coating (e.g. Anodise black, Zinc plate, Passivate)",
  "heatTreatment": "string — heat treatment requirement if stated (e.g. Harden and temper, Case harden)",
  "criticalDimensions": ["array of critical dimensions or diameter/length callouts"],
  "tolerances": ["array of tight tolerance notes, e.g. ±0.01, H7, h6, ±0.005, Ra 1.6"],
  "threads": ["array of thread callouts, e.g. M8x1.25, 1/4-20 UNC, G1/4"],
  "surfaceFinish": "string — Ra value or finish grade if stated (e.g. Ra 1.6, Ra 3.2, N7)",
  "inspectionNotes": ["array of inspection or quality requirements, e.g. 100% inspection, CMM report, FAIR"],
  "missingInfo": ["array of information needed to quote that is NOT visible on the drawing"],
  "quoteRisk": "low" | "medium" | "high",
  "summary": "one sentence describing what this part is and any notable quoting considerations"
}

Rules:
- Only include fields you can clearly identify
- For materialConfidence: "high" if clearly stated, "medium" if reasonably inferred, "low" if uncertain
- For quoteRisk: "high" if tight tolerances, unusual material, or missing info; "medium" if some uncertainty; "low" if straightforward
- Recognise workshop shorthand: HE30=Aluminium 6082-T6, EN8=medium carbon steel, 316=stainless steel 316
- Do not invent information — if not visible, omit the field or add to missingInfo
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

  const empty = {
    tolerances: [],
    coatings: [],
    threads: [],
    criticalDimensions: [],
    inspectionNotes: [],
    missingInfo: [],
  };

  try {
    const buffer = Buffer.from(imageData, "base64");

    req.log.info(
      { mimeType, sizeBytes: buffer.length },
      "scan-drawing: file received",
    );

    const base64 = buffer.toString("base64");
    const imageUrl = `data:${mimeType};base64,${base64}`;

    req.log.info("scan-drawing: sending to AI vision");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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

    req.log.info("scan-drawing: AI response received");

    const parsed = parseResult(response.choices[0]?.message?.content ?? "");
    if (!parsed) {
      req.log.warn("scan-drawing: failed to parse AI response");
      res.json({ ...empty, unreadable: true });
      return;
    }

    if (parsed.unreadable) {
      req.log.info("scan-drawing: drawing unreadable");
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

    const risk = parsed.quoteRisk as "low" | "medium" | "high" | undefined;
    const validRisk =
      risk === "low" || risk === "medium" || risk === "high" ? risk : undefined;

    const result = {
      partName: parsed.partName || undefined,
      material: mapMaterial(parsed.material),
      materialConfidence: validConf,
      quantity:
        typeof parsed.quantity === "number" ? parsed.quantity : undefined,
      drawingNumber: parsed.drawingNumber || undefined,
      revision: parsed.revision || undefined,
      finish: parsed.finish || undefined,
      heatTreatment: parsed.heatTreatment || undefined,
      tolerances: Array.isArray(parsed.tolerances) ? parsed.tolerances : [],
      coatings: Array.isArray(parsed.coatings) ? parsed.coatings : [],
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
      criticalDimensions: Array.isArray(parsed.criticalDimensions)
        ? parsed.criticalDimensions
        : [],
      inspectionNotes: Array.isArray(parsed.inspectionNotes)
        ? parsed.inspectionNotes
        : [],
      missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : [],
      quoteRisk: validRisk,
      summary: parsed.summary || undefined,
    };

    req.log.info(
      {
        hasPartName: !!result.partName,
        hasMaterial: !!result.material,
        toleranceCount: result.tolerances.length,
        missingInfoCount: result.missingInfo.length,
        quoteRisk: result.quoteRisk,
      },
      "scan-drawing: completed",
    );

    res.json(result);
  } catch (err) {
    logger.error({ err }, "scan-drawing failed");
    res.status(500).json({ error: "Scan failed. Please try again." });
  }
});

export default router;
