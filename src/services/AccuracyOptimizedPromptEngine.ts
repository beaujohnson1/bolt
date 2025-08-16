import { PromptOptimizationEngine } from './PromptOptimizationEngine';
import { AIAccuracyAgent } from './AIAccuracyAgent';

interface ImageAnalysisContext {
  imageQuality: 'high' | 'medium' | 'low';
  ocrTextLength: number;
  ocrConfidence: number;
  detectedBrands: string[];
  previousAttempts?: number;
  knownFailurePatterns?: string[];
}

interface OptimizedPromptResult {
  prompt: string;
  temperature: number;
  maxTokens: number;
  focusAreas: string[];
  confidenceThreshold: number;
}

export class AccuracyOptimizedPromptEngine {
  private promptOptimizer: PromptOptimizationEngine;
  private accuracyAgent: AIAccuracyAgent;
  
  constructor() {
    this.promptOptimizer = new PromptOptimizationEngine();
    this.accuracyAgent = new AIAccuracyAgent();
  }

  /**
   * Generate an accuracy-optimized prompt based on context and historical performance
   */
  async generateAccuracyFocusedPrompt(
    context: ImageAnalysisContext,
    category: string = 'clothing'
  ): Promise<OptimizedPromptResult> {
    console.log('🎯 [ACCURACY-PROMPT] Generating optimized prompt for:', { 
      category, 
      quality: context.imageQuality,
      ocrLength: context.ocrTextLength 
    });

    // Get historical accuracy data for this category
    const historicalMetrics = await this.accuracyAgent.getPerformanceMetrics(category);
    const weakFields = this.identifyWeakFields(historicalMetrics);
    
    // Build the base prompt with accuracy enhancements
    let prompt = this.buildBasePrompt(category);
    
    // Add quality-specific instructions
    prompt += this.addQualityInstructions(context.imageQuality);
    
    // Add focus areas based on historical failures
    if (weakFields.length > 0) {
      prompt += this.addWeakFieldFocus(weakFields);
    }
    
    // Add OCR confidence weighting
    prompt += this.addOCRWeighting(context.ocrConfidence, context.ocrTextLength);
    
    // Add iterative refinement instructions
    if (context.previousAttempts && context.previousAttempts > 0) {
      prompt += this.addRefinementInstructions(context.previousAttempts);
    }
    
    // Determine optimal parameters based on context
    const parameters = this.optimizeParameters(context, historicalMetrics);
    
    return {
      prompt,
      temperature: parameters.temperature,
      maxTokens: parameters.maxTokens,
      focusAreas: weakFields,
      confidenceThreshold: parameters.confidenceThreshold
    };
  }

  /**
   * Build base prompt with structured analysis framework
   */
  private buildBasePrompt(category: string): string {
    return `You are an elite ${category} analysis AI with 99%+ accuracy requirements.

ANALYSIS PROTOCOL - MAXIMUM ACCURACY MODE:

PHASE 1: EVIDENCE GATHERING
- Scan ALL images systematically (zoom mentally on tags/labels)
- Document every text element found (even partial)
- Note logo shapes, button styles, stitching patterns
- Record confidence level for each observation

PHASE 2: CROSS-VALIDATION
- Compare findings across multiple images
- Resolve conflicts using probability weighting
- Apply brand-specific knowledge (style signatures)
- Use Bayesian inference for uncertain cases

PHASE 3: STRUCTURED EXTRACTION
Required fields with confidence scoring:
`;
  }

  /**
   * Add instructions based on image quality
   */
  private addQualityInstructions(quality: 'high' | 'medium' | 'low'): string {
    const instructions = {
      high: `
IMAGE QUALITY: EXCELLENT
- Extract fine details from tags and labels
- Read all text precisely, including small print
- Identify subtle brand indicators
- Use high-resolution areas for verification
`,
      medium: `
IMAGE QUALITY: MODERATE
- Focus on clearest areas first
- Use context clues for partially visible text
- Apply pattern recognition for blurry logos
- Cross-reference multiple angles
`,
      low: `
IMAGE QUALITY: LIMITED
- Prioritize high-contrast text areas
- Use garment style/construction as hints
- Apply probabilistic brand matching
- Flag low-confidence extractions
`
    };
    
    return instructions[quality];
  }

  /**
   * Add focus on historically weak fields
   */
  private addWeakFieldFocus(weakFields: string[]): string {
    return `
ACCURACY FOCUS AREAS (based on historical performance):
${weakFields.map(field => `- ${field.toUpperCase()}: Apply extra scrutiny and validation`).join('\n')}

Special instructions for weak fields:
- Double-check extraction logic
- Look for alternative indicators
- Use multiple validation methods
- Document evidence chain clearly
`;
  }

  /**
   * Add OCR confidence weighting instructions
   */
  private addOCRWeighting(confidence: number, textLength: number): string {
    if (confidence > 0.8 && textLength > 50) {
      return `
OCR CONFIDENCE: HIGH (${(confidence * 100).toFixed(0)}%)
- Prioritize OCR-extracted text for all fields
- Use OCR as primary source of truth
- Visual analysis for confirmation only
`;
    } else if (confidence > 0.5) {
      return `
OCR CONFIDENCE: MODERATE (${(confidence * 100).toFixed(0)}%)
- Balance OCR and visual analysis equally
- Cross-validate OCR findings with images
- Use context to resolve ambiguities
`;
    } else {
      return `
OCR CONFIDENCE: LOW (${(confidence * 100).toFixed(0)}%)
- Rely primarily on visual analysis
- Use OCR as supplementary hints only
- Apply strict visual verification
`;
    }
  }

  /**
   * Add refinement instructions for retry attempts
   */
  private addRefinementInstructions(attemptNumber: number): string {
    return `
REFINEMENT ATTEMPT #${attemptNumber + 1}:
- Previous extraction may have missed details
- Re-examine areas that typically contain brand/size
- Apply alternative recognition strategies
- Consider less common label locations
- Use enhanced pattern matching
`;
  }

  /**
   * Identify fields with low historical accuracy
   */
  private identifyWeakFields(metrics: any): string[] {
    if (!metrics || !metrics.fieldAccuracies) return [];
    
    const weakFields: string[] = [];
    const threshold = 0.75; // Fields below 75% accuracy
    
    Object.entries(metrics.fieldAccuracies).forEach(([field, accuracy]) => {
      if (typeof accuracy === 'number' && accuracy < threshold) {
        weakFields.push(field);
      }
    });
    
    return weakFields;
  }

  /**
   * Optimize model parameters based on context
   */
  private optimizeParameters(
    context: ImageAnalysisContext, 
    historicalMetrics: any
  ): { temperature: number; maxTokens: number; confidenceThreshold: number } {
    // Lower temperature for higher accuracy
    let temperature = 0.1;
    
    // Adjust based on image quality
    if (context.imageQuality === 'low') {
      temperature = 0.05; // Even more deterministic for poor images
    }
    
    // Adjust tokens based on complexity
    let maxTokens = 1500;
    if (context.ocrTextLength > 500) {
      maxTokens = 2000; // More tokens for complex items
    }
    
    // Set confidence threshold based on historical performance
    let confidenceThreshold = 0.7;
    if (historicalMetrics?.avgAccuracy < 0.8) {
      confidenceThreshold = 0.6; // Lower threshold if struggling
    }
    
    return { temperature, maxTokens, confidenceThreshold };
  }

  /**
   * Generate a validation prompt for double-checking results
   */
  async generateValidationPrompt(
    initialResult: any,
    context: ImageAnalysisContext
  ): Promise<string> {
    return `VALIDATION PASS - Verify this initial analysis:

Initial Results:
${JSON.stringify(initialResult, null, 2)}

VALIDATION CHECKLIST:
1. Brand: Is "${initialResult.brand}" visible in images/OCR?
2. Size: Can you confirm "${initialResult.size}" from tags?
3. Color: Does "${initialResult.color}" match visual appearance?
4. Category: Is "${initialResult.category}" classification correct?

RE-EXAMINE with focus on:
- Any fields marked as low confidence
- Fields that seem inconsistent
- Missing critical information

Return ONLY corrections needed, or confirm if accurate.`;
  }

  /**
   * Generate a prompt optimized for specific failure patterns
   */
  async generateTargetedPrompt(
    failurePattern: string,
    context: ImageAnalysisContext
  ): Promise<string> {
    const targetedInstructions: Record<string, string> = {
      brand_misidentification: `
BRAND DETECTION ENHANCEMENT:
- Check ALL label locations systematically
- Look for: ©, ®, ™ symbols near text
- Examine button/zipper engravings
- Match font styles to known brands
- Consider store brands (Gap, Old Navy, etc.)
`,
      size_extraction_failure: `
SIZE EXTRACTION PROTOCOL:
- Primary: Neck/waistband labels
- Secondary: Care instruction labels
- Tertiary: Side seam tags
- For pants: W x L format (e.g., 32x34)
- Convert international sizes if needed
`,
      color_mismatch: `
COLOR ANALYSIS REFINEMENT:
- Identify primary color (largest area)
- Note secondary colors if multicolor
- Use standard color names (Navy, not Dark Blue)
- Account for lighting conditions
`,
      category_confusion: `
CATEGORY CLASSIFICATION:
- Identify garment type first
- Consider gender indicators
- Match to eBay category taxonomy
- Use construction details as hints
`
    };
    
    const basePrompt = await this.generateAccuracyFocusedPrompt(context);
    return basePrompt.prompt + (targetedInstructions[failurePattern] || '');
  }
}

// Export singleton instance
export const accuracyOptimizedPromptEngine = new AccuracyOptimizedPromptEngine();