import { isStr, safeTrim, nullIfUnknown, toStr } from '../utils/strings';
import { buildTitle } from '../utils/itemUtils';
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
  __needsAttention?: boolean;
};

export function mapAIToListing(ai: RawAI) {
  console.log('🔄 [AI-MAPPER] Sanitizing AI payload before UI use...');
  
  // Check if this is a flagged "needs attention" response
  if (!ai || ai.__needsAttention) {
    console.log('🚨 [AI-MAPPER] AI data flagged for manual review');
    return {
      needsAttention: true,
      title: "Needs Manual Review (AI Analysis Failed)",
      description: "AI could not confidently analyze this item. Please review and edit manually.",
      brand: null,
      size: null,
      color: null,
      item_type: "Item",
      condition: "good",
      suggested_price: 25,
      keywords: [],
      key_features: ["manual review required"],
      confidence: 0.1,
      evidence: {},
      ebay_item_specifics: {}
    };
  }
  
  // strings (nullable Unknown collapsed to null)
  const brand = nullIfUnknown(ai.brand);
  const size = nullIfUnknown(ai.size);
  const color = nullIfUnknown(ai.color);
  const item_type = safeTrim(ai.item_type) || "Jacket";
  const condition = safeTrim(ai.condition) || "good";
  const model_number = nullIfUnknown(ai.model_number);

  // arrays - safely filter and trim
  const keywords = Array.isArray(ai.keywords)
    ? ai.keywords.filter(isStr).map(safeTrim).filter(Boolean).slice(0, 20)
    : [];
    
  const key_features = Array.isArray(ai.key_features)
    ? ai.key_features.filter(isStr).map(safeTrim).filter(Boolean).slice(0, 20)
    : [];

  // numeric-ish
  const suggested_price =
    typeof ai.suggested_price === "number"
      ? ai.suggested_price
      : Number(toStr(ai.suggested_price)) || 25; // Default fallback price

  // title once - extract and build if needed
  const titleRaw = safeTrim(ai.title);
  const title = titleRaw || buildTitle({ brand, item_type, color, size });

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