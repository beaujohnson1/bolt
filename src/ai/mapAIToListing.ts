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
  gender?: unknown;
  material?: unknown;
  pattern?: unknown;
  fit?: unknown;
  closure?: unknown;
  sleeve_length?: unknown;
  neckline?: unknown;
  style_keywords?: unknown;
  ebay_keywords?: unknown;
  __needsAttention?: boolean;
};

export function mapAIToListing(ai: RawAI, ocrData = {}) {
  console.log('🔄 [AI-MAPPER] Sanitizing AI payload before UI use...');
  
  // Check if this is a flagged "needs attention" response
  if (!ai || ai.__needsAttention) {
    console.log('🚨 [AI-MAPPER] AI data flagged for manual review');
    
    // Extract available OCR data for fallback
    const ocrBrand = ocrData.preBrand || null;
    const ocrSize = ocrData.preSize || null;
    const ocrColor = ocrData.preColor || null;
    const ocrItemType = ocrData.detectedCategory || "Item";
    
    // Build a better title using available OCR data
    const fallbackTitle = buildTitle({ 
      brand: ocrBrand, 
      item_type: ocrItemType, 
      color: ocrColor, 
      size: ocrSize 
    }) || `${ocrBrand || "Item"} - Review Required`;
    
    console.log('🔄 [AI-MAPPER] Using OCR fallback data:', {
      brand: ocrBrand,
      size: ocrSize,
      color: ocrColor,
      itemType: ocrItemType,
      title: fallbackTitle
    });
    
    return {
      needsAttention: true,
      title: fallbackTitle,
      description: "AI could not confidently analyze this item. Please review and edit manually.",
      brand: ocrBrand,
      size: ocrSize,
      color: ocrColor,
      item_type: ocrItemType,
      condition: "good",
      suggested_price: 25,
      keywords: [ocrBrand, ocrColor, ocrItemType].filter(Boolean),
      key_features: ["manual review required"],
      confidence: 0.1,
      evidence: ocrData.evidence || {},
      ebay_item_specifics: ocrBrand ? { Brand: ocrBrand } : {}
    };
  }
  
  // strings (nullable Unknown collapsed to null)
  const brand = nullIfUnknown(ai.brand);
  const size = nullIfUnknown(ai.size);
  const color = nullIfUnknown(ai.color);
  const item_type = safeTrim(ai.item_type) || "Jacket";
  const condition = safeTrim(ai.condition) || "good";
  const model_number = nullIfUnknown(ai.model_number);
  const model_name = nullIfUnknown(ai.model_name);
  const gender = nullIfUnknown(ai.gender);
  const material = nullIfUnknown(ai.material);
  const pattern = nullIfUnknown(ai.pattern);
  const fit = nullIfUnknown(ai.fit);
  const closure = nullIfUnknown(ai.closure);
  const sleeve_length = nullIfUnknown(ai.sleeve_length);
  const neckline = nullIfUnknown(ai.neckline);

  // arrays - safely filter and trim
  const keywords = Array.isArray(ai.keywords)
    ? ai.keywords.filter(isStr).map(safeTrim).filter(Boolean).slice(0, 20)
    : [];
    
  const key_features = Array.isArray(ai.key_features)
    ? ai.key_features.filter(isStr).map(safeTrim).filter(Boolean).slice(0, 20)
    : [];

  const style_keywords = Array.isArray(ai.style_keywords)
    ? ai.style_keywords.filter(isStr).map(safeTrim).filter(Boolean).slice(0, 10)
    : [];

  const ebay_keywords = Array.isArray(ai.ebay_keywords)
    ? ai.ebay_keywords.filter(isStr).map(safeTrim).filter(Boolean).slice(0, 10)
    : [];

  // numeric-ish
  const suggested_price =
    typeof ai.suggested_price === "number"
      ? ai.suggested_price
      : Number(toStr(ai.suggested_price)) || 25; // Default fallback price

  // title once - extract and build if needed using eBay optimization
  const titleRaw = safeTrim(ai.title);
  const title = titleRaw || buildTitle({ 
    brand, 
    item_type, 
    color, 
    size,
    gender,
    material,
    pattern,
    fit,
    closure,
    sleeve_length,
    neckline,
    style_keywords,
    ebay_keywords,
    keywords
  });

  // Safe description handling - use enhanced size instead of original AI size
  const descriptionTemplate = safeTrim(ai.description);
  let description;
  
  if (descriptionTemplate) {
    // If AI provided a description, ensure it uses the corrected/enhanced size
    description = descriptionTemplate;
    
    // If description contains incorrect size references, fix them
    if (size && description.toLowerCase().includes('size')) {
      // Replace any "Size [number]" patterns with the correct size
      description = description.replace(/\bsize\s+\d+\b/gi, `Size ${size}`);
    }
  } else {
    // Build description using correct enhanced components
    const sizeText = size ? ` Size ${size}.` : '';
    const brandText = brand ? ` ${brand} brand.` : '';
    description = `${title} in ${condition} condition.${sizeText}${brandText} Quality item ready to ship!`;
  }

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
    model_name,
    item_type,
    condition,
    description,
    suggested_price,
    keywords,
    key_features,
    confidence,
    evidence,
    ebay_item_specifics,
    gender,
    material,
    pattern,
    fit,
    closure,
    sleeve_length,
    neckline,
    style_keywords,
    ebay_keywords
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