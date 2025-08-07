import { z } from "zod";
import openai from "../src/lib/openai";
import { visionClient } from "../src/lib/googleVision";

const ListingSchema = z.object({
  title: z.string().min(3),
  brand: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  condition: z.enum(["new","like_new","good","fair","poor"]).optional(),
  category: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  item_type: z.string().min(2),
  suggested_price: z.union([z.number(), z.string()]).optional(),
  keywords: z.array(z.string()).default([]),
  key_features: z.array(z.string()).default([]),
  description: z.string().optional(),
});

export type Listing = z.infer<typeof ListingSchema>;

export async function generateListingFromImage({
  imageUrl,
}: { imageUrl: string }): Promise<Listing> {
  console.log('🚀 [LISTING-GENERATOR] Starting listing generation for image...');
  
  // 1) OCR first
  console.log('📝 [LISTING-GENERATOR] Step 1: Extracting OCR text...');
  const ocrText = await getOcrText(imageUrl);
  console.log('✅ [LISTING-GENERATOR] OCR completed, text length:', ocrText.length);

  // 2) Call LLM with JSON mode
  console.log('🤖 [LISTING-GENERATOR] Step 2: Calling Vision LLM...');
  const raw = await callVisionLLMJson({ imageUrl, ocrText });
  console.log('✅ [LISTING-GENERATOR] LLM response received');

  // 3) Parse (handles fenced blocks just in case)
  console.log('📊 [LISTING-GENERATOR] Step 3: Parsing JSON response...');
  const parsed = parseJsonLoose(raw);

  // 4) Validate & coerce
  console.log('✅ [LISTING-GENERATOR] Step 4: Validating and coercing data...');
  const validated = validateAndCoerce(parsed);

  // 5) Normalize (title + keywords cleanup)
  console.log('🔧 [LISTING-GENERATOR] Step 5: Normalizing listing data...');
  const normalized = normalizeListing(validated);

  console.log('✅ [LISTING-GENERATOR] Listing generation completed successfully');
  return normalized;
}

/* -------------------- Helpers -------------------- */

async function getOcrText(imageUrl: string): Promise<string> {
  try {
    console.log('🔍 [OCR] Starting Google Cloud Vision OCR...');
    const [res] = await visionClient.textDetection(imageUrl);
    const extractedText = res?.fullTextAnnotation?.text ?? "";
    console.log('✅ [OCR] Text extraction completed:', extractedText.length, 'characters');
    return extractedText;
  } catch (e) {
    console.error("❌ [OCR] Failed:", e);
    return "";
  }
}

async function callVisionLLMJson({
  imageUrl, ocrText,
}: { imageUrl: string; ocrText: string }): Promise<string> {
  const PROMPT = `
You are creating an eBay listing from a clothing photo.
Use the OCR text FIRST for brand, size, style codes, RN numbers, materials.
If OCR conflicts with the image, prefer OCR unless obviously wrong.

CRITICAL BRAND & SIZE DETECTION:
1. EXAMINE OCR TEXT CAREFULLY for:
   - Brand names (Nike, Adidas, Lululemon, Gap, etc.)
   - Size labels (XS, S, M, L, XL, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20+)
   - Style/model numbers
   - RN numbers (company identifiers)
   - Care instruction details

2. VISUAL INSPECTION for:
   - Neck labels and tags
   - Care labels inside garments
   - Embroidered or printed logos
   - Hardware text (zippers, buttons)
   - Woven labels on seams

3. COMMON BRANDS TO RECOGNIZE:
   Lululemon, Nike, Adidas, North Face, Patagonia, Under Armour, Gap, Old Navy, 
   H&M, Zara, Uniqlo, American Eagle, Hollister, Abercrombie, Banana Republic, 
   J.Crew, Ann Taylor, LOFT, Express, Forever 21, Farm Rio, Free People, 
   Anthropologie, Urban Outfitters, Madewell, Everlane

Return ONLY JSON (no code fences) with:
{
  "title": string, // Brand + (Men's/Women's if certain) + Item_Type + Fabric (if known) + Color + Size/Size Unknown
  "brand": string|null,
  "size": string|null,
  "item_type": string,
  "color": string|null,
  "condition": "new"|"like_new"|"good"|"fair"|"poor",
  "keywords": string[],     // 10-20 SEO terms
  "key_features": string[], // bullet facts from photo/tag
  "suggested_price": number,
  "description": string     // 2-4 sentences
}

Rules:
- Only include gender if certain from tag/cut.
- Use US spelling; capitalize brand/proper nouns only.
- Never put "Unknown" into keywords; keep it out of SEO.
- Conservative price if unsure, typical mid-tier outdoor comps.
- Be VERY specific with item_type (e.g., "High-Rise Skinny Jeans", "Cropped Tank Top")
- Generate keywords buyers would actually search for
- Include fabric/material in keywords if detected

OCR_TEXT:
${ocrText}
`.trim();

  try {
    console.log('🤖 [LLM] Calling OpenAI Vision API...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use the latest vision-capable model
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You return only valid JSON matching the requested schema." },
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
    });

    const raw = response.choices?.[0]?.message?.content ?? "";
    console.log('✅ [LLM] OpenAI response received, length:', raw.length);
    debugPreview("[LLM RAW]", raw);
    return raw;
  } catch (error) {
    console.error('❌ [LLM] OpenAI Vision API call failed:', error);
    throw error;
  }
}

function parseJsonLoose(raw: string): any {
  const t = typeof raw;
  debugPreview(`[PARSE] typeof raw=${t}`, raw);
  if (t !== "string") {
    // Some SDKs already give parsed objects
    return raw;
  }

  // Try strict parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Strip ```json fences if present
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const body = fenced ? fenced[1] : raw;

    // Grab first {...} block
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON object found in response");

    const json = body.slice(start, end + 1);
    return JSON.parse(json);
  }
}

function validateAndCoerce(obj: any): Listing {
  try {
    const parsed = ListingSchema.parse(obj);
    // coerce suggested_price to number
    const sp = parsed.suggested_price;
    const suggested_price =
      typeof sp === "string" ? Number(sp) :
      typeof sp === "number" ? sp : undefined;

    return { ...parsed, suggested_price };
  } catch (e: any) {
    console.error("[VALIDATION] Failed:", e?.errors ?? e);
    throw new Error("AI response validation failed; see logs for details.");
  }
}

function normalizeListing(listing: Listing): Listing {
  const keywords = (listing.keywords ?? []).filter(Boolean)
    .filter(k => !/unknown/i.test(k))
    .map(k => k.trim())
    .filter((k, i, arr) => arr.indexOf(k) === i)  // dedupe
    .slice(0, 20);

  const title = buildTitle({
    brand: listing.brand,
    item_type: listing.item_type,
    color: listing.color,
    size: listing.size,
    // gender/fabric optional—add if you later capture them
  });

  return {
    ...listing,
    title,
    keywords,
  };
}

function buildTitle({
  brand, item_type, color, size, gender, fabric
}: {
  brand?: string | null;
  item_type: string;
  color?: string | null;
  size?: string | null;
  gender?: string | null;
  fabric?: string | null;
}) {
  const parts = [
    brand && brand.trim(),
    gender && /men|women|kid/i.test(gender) ? `${cap(gender)}'s` : null,
    item_type,
    fabric && !/unknown/i.test(fabric) ? fabric : null,
    color && !/unknown/i.test(color) ? color : null,
    size ? `Size ${size}` : "Size Unknown",
  ].filter(Boolean);
  return parts.join(" ");
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

function debugPreview(label: string, s: string) {
  if (typeof s === "string") {
    console.debug(label, s.length > 200 ? s.slice(0, 200) + "…" : s);
  } else {
    console.debug(label, s);
  }
}