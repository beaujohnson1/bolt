import { z } from "zod";

// Zod schema for AI payload validation
export const AiSchema = z.object({
  title: z.string().optional(),
  brand: z.union([z.string(), z.null()]).optional(),
  size: z.union([z.string(), z.null()]).optional(),
  color: z.union([z.string(), z.null()]).optional(),
  item_type: z.string().optional(),
  condition: z.string().optional(),
  description: z.string().optional(),
  suggested_price: z.union([z.number(), z.string()]).optional(),
  keywords: z.array(z.string()).optional(),
  key_features: z.array(z.string()).optional(),
  model_number: z.union([z.string(), z.null()]).optional(),
  evidence: z.object({
    brand: z.string().optional(),
    size: z.string().optional()
  }).optional(),
  ebay_item_specifics: z.record(z.string().nullable()).optional(),
  confidence: z.number().optional()
}).passthrough();

export function coerceAI(raw: unknown) {
  try {
    return AiSchema.parse(raw);
  } catch (error) {
    console.error('❌ [AI-SCHEMA] Validation failed:', error);
    throw new Error('AI payload validation failed');
  }
}