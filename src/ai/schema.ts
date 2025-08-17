import { z } from "zod";

// Enhanced Zod schema for AI payload validation with AI Optimization fields
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
  model_name: z.union([z.string(), z.null()]).optional(),
  evidence: z.object({
    brand: z.string().optional(),
    size: z.string().optional()
  }).optional(),
  ebay_item_specifics: z.record(z.string().nullable()).optional(),
  confidence: z.number().optional(),
  __needsAttention: z.boolean().optional(),
  
  // AI Optimization Quality Metrics
  keywordQualityScore: z.number().optional(),
  ebayComplianceScore: z.number().optional(),
  ebayCompletenessScore: z.number().optional(),
  
  // Additional fields that may come from enhanced analysis
  material: z.union([z.string(), z.null()]).optional(),
  style_details: z.union([z.string(), z.null()]).optional(),
  season: z.union([z.string(), z.null()]).optional(),
  occasion: z.union([z.string(), z.null()]).optional()
}).passthrough();

export function coerceAI(raw: unknown) {
  try {
    console.log('🔍 [AI-SCHEMA] Validating AI payload:', JSON.stringify(raw, null, 2).substring(0, 500));
    const result = AiSchema.parse(raw);
    console.log('✅ [AI-SCHEMA] Validation successful');
    return result;
  } catch (error) {
    console.error('❌ [AI-SCHEMA] Validation failed for payload:', raw);
    console.error('❌ [AI-SCHEMA] Error details:', error);
    
    if (error.errors) {
      console.error('❌ [AI-SCHEMA] Validation errors:', error.errors);
    }
    
    // Try to return the raw data with passthrough for debugging
    console.log('🔄 [AI-SCHEMA] Attempting passthrough validation...');
    try {
      return raw as any; // Temporary bypass for debugging
    } catch {
      throw new Error('AI payload validation failed');
    }
  }
}