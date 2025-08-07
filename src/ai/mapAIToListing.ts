import { isStr, safeTrim, nullIfUnknown, toStr } from '../utils/strings';
import { buildTitle } from '../utils/itemUtils';

type RawAI = {
  title?: unknown; 
  brand?: unknown; 
  size?: unknown; 
  color?: unknown;
  item_type?: unknown; 
  condition?: unknown; 
  description?: unknown;
  suggested_price?: unknown; 
  keywords?: unknown; 
  key_features?: unknown;
  model_number?: unknown;
  evidence?: unknown;
  ebay_item_specifics?: unknown;
  confidence?: unknown;
};

export function mapAIToListing(ai: RawAI) {
  console.log('🔄 [AI-MAPPER] Sanitizing AI payload before UI use...');
  
  // Extract title first
  const titleRaw = safeTrim(ai.title);
  
  // arrays - safely filter and trim
  const keywords = Array.isArray(ai.keywords)
    ? ai.keywords.filter(isStr).map(safeTrim).filter(Boolean).slice(0, 20)
    : [];
    
  const key_features = Array.isArray(ai.key_features)
    ? ai.key_features.filter(isStr).map(safeTrim).filter(Boolean).slice(0, 20)
    : [];

  // numbers - safe conversion
  const suggested_price =
    typeof ai.suggested_price === "number"
      ? ai.suggested_price
      : Number(toStr(ai.suggested_price)) || 25; // Default fallback price

  // strings (coerced) + "Unknown" -> null
  const brand = nullIfUnknown(ai.brand);
  const size = nullIfUnknown(ai.size);
  const color = nullIfUnknown(ai.color);
  const model_number = nullIfUnknown(ai.model_number);
  const condition = safeTrim(ai.condition) || "good";
  const item_type = safeTrim(ai.item_type) || "Item";
  let title = titleRaw;

  // Rebuild title if missing or invalid
  if (!title || title.length < 3) {
    title = buildTitle({ brand, item_type, color, size });
  }

  // Safe description handling
  const description = safeTrim(ai.description) || 
    `${title} in ${condition} condition. Quality item ready to ship!`;

  // Safe confidence handling
  const confidence = typeof ai.confidence === "number" ? ai.confidence : 0.5;

  // Safe evidence handling
  const evidence = typeof ai.evidence === "object" && ai.evidence !== null ? ai.evidence : {};

  // Safe eBay specifics handling
  const ebay_item_specifics = typeof ai.ebay_item_specifics === "object" && ai.ebay_item_specifics !== null 
    ? ai.ebay_item_specifics 
    : {};

  const result = {
    title,
    brand,
    size,
    color,
    model_number,
    item_type,
    condition,
    description,
    suggested_price,
    keywords,
    key_features,
    confidence,
    evidence,
    ebay_item_specifics
  };

  console.log('✅ [AI-MAPPER] AI payload sanitized successfully:', {
    title: result.title,
    brand: result.brand,
    size: result.size,
    hasKeywords: result.keywords.length > 0,
    confidence: result.confidence
  });

  return result;
}