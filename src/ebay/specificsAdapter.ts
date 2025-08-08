eBay Item Specifics (Name/Value pairs) with required checks.

import { sTrim, safeLower, toStr } from "@/utils/strings";

type AiData = {
  title?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  style_details?: string;
  condition?: string;
  gender?: string;
  department?: string;
  size_type?: string;     // e.g., Regular, Petite
  size_number?: string;   // e.g., 6, 34x30
  // add others you already produce
};

export type NameValue = { name: string; value: string | string[] };

export type BuildResult = {
  specifics: NameValue[];
  missingRequired: string[]; // names that eBay marks required but we couldn\'t fill
  notes?: string[];
};

/** ---------- helpers ---------- */

const pickFromAllowed = (input: string | undefined, allowed: string[] | undefined) => {
  const v = sTrim(input || "");
  if (!v) return undefined;
  if (!allowed?.length) return v; // free-text
  // try exact (case-insensitive), then startsWith/includes
  const lc = v.toLowerCase();
  const exact = allowed.find(a => a.toLowerCase() === lc);
  if (exact) return exact;
  const starts = allowed.find(a => a.toLowerCase().startsWith(lc));
  if (starts) return starts;
  const contains = allowed.find(a => a.toLowerCase().includes(lc));
  return contains || undefined;
};

const firstNonEmpty = (...vals: (string | undefined)[]) => {
  for (const v of vals) {
    const t = sTrim(v || "");
    if (t) return t;
  }
  return undefined;
};

// crude mapping rules -> tweak as needed
function valueFromAI(aspectName: string, ai: AiData): string | undefined {
  const n = safeLower(aspectName);
  if (n.includes("brand")) return ai.brand;
  if (n === "brand") return ai.brand;

  if (n.includes("size type")) return ai.size_type;
  if (n.includes("size")) return firstNonEmpty(ai.size_number, ai.size);

  if (n.includes("color")) return ai.color;
  if (n.includes("material")) return ai.material;

  if (n.includes("style")) return ai.style_details;

  if (n.includes("condition")) return ai.condition;

  if (n.includes("department") || n.includes("gender")) {
    // normalize a bit
    const g = sTrim(ai.gender || ai.department);
    if (!g) return undefined;
    // eBay prefers specific words:
    const map: Record<string, string> = {
      men: "Men",
      womens: "Women",
      women: "Women",
      ladies: "Women",
      kids: "Kids",
      boys: "Boys",
      girls: "Girls",
      unisex: "Unisex",
      adult: "Adults Unisex",
    };
    const key = g.toLowerCase();
    return map[key] || g;
  }

  return undefined;
}

/** ---------- taxonomy parser (Sell Metadata) ---------- */

type TaxonomyAspect = {
  localizedAspectName: string;
  aspectConstraint?: {
    aspectRequired?: boolean;
    aspectMode?: "FREE_TEXT" | "SELECTION_ONLY" | string;
    // sometimes min/max values, etc.
  };
  aspectValues?: Array<{ localizedValue: string }>;
};

type TaxonomyResponse = {
  aspects?: TaxonomyAspect[];
};

function fromTaxonomy(resp: TaxonomyResponse, ai: AiData): BuildResult {
  const specifics: NameValue[] = [];
  const missingRequired: string[] = [];
  const notes: string[] = [];

  for (const a of resp.aspects || []) {
    const name = a.localizedAspectName;
    const required = !!a.aspectConstraint?.aspectRequired;
    const selectionOnly = a.aspectConstraint?.aspectMode === "SELECTION_ONLY";
    const allowed = a.aspectValues?.map(v => v.localizedValue) || [];

    const aiGuess = valueFromAI(name, ai);
    const chosen = pickFromAllowed(aiGuess, selectionOnly ? allowed : allowed);

    if (chosen) {
      specifics.push({ name, value: chosen });
    } else if (required) {
      missingRequired.push(name);
      notes.push(`Missing required aspect: ${name}${selectionOnly && allowed?.length ? ` (allowed: ${allowed.slice(0,6).join(" | ")}${allowed.length>6?\'…\':\'\'})` : ""}`);
      )
    }
    }
  }

  return { specifics, missingRequired, notes };
}

/** ---------- trading parser (GetCategorySpecifics) ---------- */

type TradingNameRecommendation = {
  Name?: string;
  ValidationRules?: { MinValues?: number; SelectionMode?: "FreeText" | "SelectionOnly" | string };
  ValueRecommendation?: Array<{ Value?: string }>;
};

type TradingResponse = {
  Recommendations?: Array<{
    CategoryID?: string;
    NameRecommendation?: TradingNameRecommendation[]; // sometimes single object
  }>;
};

function fromTrading(resp: TradingResponse, ai: AiData): BuildResult {
  const specifics: NameValue[] = [];
  const missingRequired: string[] = [];
  const notes: string[] = [];

  const recs = resp.Recommendations?.;
  const names = Array.isArray(recs?.NameRecommendation)
    ? recs?.NameRecommendation
    : recs?.NameRecommendation
    ? [recs?.NameRecommendation]
    : [];

  for (const r of names) {
    const name = r.Name || "";
    if (!name) continue;

    const minValues = Number(r.ValidationRules?.MinValues ?? 0);
    const selectionOnly = r.ValidationRules?.SelectionMode === "SelectionOnly";
    const allowed = (r.ValueRecommendation || [])
      .map(v => v.Value)
      .filter(Boolean) as string[];

    const aiGuess = valueFromAI(name, ai);
    const chosen = pickFromAllowed(aiGuess, selectionOnly ? allowed : allowed);

    if (chosen) {
      specifics.push({ name, value: chosen });
    } else if (minValues > 0) {
      missingRequired.push(name);
      notes.push(`Missing required aspect: ${name}${selectionOnly && allowed?.length ? ` (allowed: ${allowed.slice(0,6).join(" | ")}${allowed.length>6?\'…\':\'\'})` : ""}`);
    }
    }
    }
  }

  return { specifics, missingRequired, notes };
}

/** ---------- public entry ---------- */

export function buildItemSpecificsFromEbayPayload(
  raw: unknown,
  ai: AiData
): BuildResult {
  // quick shape checks
  if (raw && typeof raw === "object") {
    const o = raw as any;
    if (Array.isArray(o.aspects)) {
      return fromTaxonomy(o as TaxonomyResponse, ai);
    }
    if (Array.isArray(o.Recommendations) || o?.Recommendations?.NameRecommendation) {
      return fromTrading(o as TradingResponse, ai);
    }
  }
  return { specifics: [], missingRequired: [], notes: ["Unrecognized eBay specifics payload shape"] };
}
'>Create src/ebay/specificsAdapter.ts
  }
}
  }
}