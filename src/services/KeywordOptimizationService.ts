// =============================================
// AI KEYWORD OPTIMIZATION SYSTEM - INTEGRATION CODE
// =============================================

import { SupabaseClient } from '@supabase/supabase-js';
import { analyzeClothingItem } from './openaiService.js';
import { fetchImageAsBase64 } from '../utils/imageUtils';

// Types for the keyword system
interface PhotoAnalysis {
  id?: string;
  user_id?: string;
  item_id?: string;
  image_url: string;
  detected_brand?: string;
  detected_category?: string;
  detected_style?: string;
  detected_size?: string;
  detected_color?: string;
  detected_condition?: string;
  original_keywords?: string[];
  suggested_keywords?: string[];
  user_approved_keywords?: string[];
  confidence_score?: number;
  listing_platform?: string;
  listing_id?: string;
}

interface KeywordSuggestion {
  keywords: string[];
  confidence: number;
  source: 'database' | 'ai' | 'hybrid';
  ebayTitle?: string;
}

// =============================================
// KEYWORD SUGGESTION SERVICE
// =============================================

export class KeywordOptimizationService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Main function: Get AI-powered keyword suggestions for a photo
   */
  async getKeywordSuggestions(
    imageUrl: string,
    detectedBrand: string,
    detectedCategory: string,
    itemId?: string,
    detectedStyle?: string,
    userPreferences?: string[],
    aiConfidence?: number
  ): Promise<KeywordSuggestion> {
    try {
      console.log('🔍 [KEYWORDS] Starting keyword suggestion process...', {
        imageUrl: imageUrl.substring(0, 50) + '...',
        detectedBrand,
        detectedCategory,
        itemId,
        detectedStyle,
        aiConfidence
      });

      // Priority 1: Parallel processing - Run database lookup and AI analysis simultaneously
      console.log('📊 [KEYWORDS] Fetching database keywords...');
      console.log('🤖 [KEYWORDS] Starting parallel processing...');
      
      // Priority 5: Smart API usage - decide whether to call expensive AI
      const shouldUseAI = this.shouldUseExpensiveAI(aiConfidence);
      console.log('🧠 [KEYWORDS] Smart API decision:', { shouldUseAI, aiConfidence });
      
      const [dbKeywords, aiKeywords] = await Promise.all([
        this.getDatabaseKeywords(detectedBrand, detectedCategory, detectedStyle),
        shouldUseAI ? this.getAIKeywords(imageUrl, detectedBrand, detectedCategory) : Promise.resolve([])
      ]);
      
      console.log('✅ [KEYWORDS] Parallel processing complete:', {
        dbKeywords: dbKeywords.length,
        aiKeywords: aiKeywords.length,
        usedAI: shouldUseAI
      });

      // Combine and rank keywords
      console.log('🔄 [KEYWORDS] Combining and ranking keywords...');
      const combinedKeywords = this.combineAndRankKeywords(dbKeywords, aiKeywords, userPreferences);
      console.log('🔄 [KEYWORDS] Final combined keywords:', combinedKeywords);

      // Generate optimized eBay title
      const ebayTitle = this.generateEbayTitle(
        detectedBrand,
        detectedCategory,
        '', // Size will be added later
        combinedKeywords.keywords
      );

      // Save analysis to database
      console.log('💾 [KEYWORDS] Saving photo analysis to database...');
      await this.savePhotoAnalysis({
        item_id: itemId,
        image_url: imageUrl,
        detected_brand: detectedBrand,
        detected_category: detectedCategory,
        detected_style: detectedStyle,
        original_keywords: aiKeywords,
        suggested_keywords: combinedKeywords.keywords,
        confidence_score: combinedKeywords.confidence
      });

      console.log('✅ [KEYWORDS] Keyword suggestion process completed successfully');
      return {
        ...combinedKeywords,
        ebayTitle
      };
    } catch (error) {
      console.error('❌ [KEYWORDS] Error getting keyword suggestions:', error);
      throw error;
    }
  }

  /**
   * Priority 5: Smart API usage - Determine if expensive AI calls are needed
   */
  private shouldUseExpensiveAI(aiConfidence?: number): boolean {
    // If no confidence score, use AI as fallback
    if (!aiConfidence) {
      console.log('🧠 [KEYWORDS] No confidence score, using AI');
      return true;
    }
    
    // If confidence is very high (>0.9), we might skip expensive AI
    if (aiConfidence > 0.9) {
      console.log('🧠 [KEYWORDS] High confidence detected, checking database first');
      // We'll still use AI for now, but this is where you could add logic to skip it
      // if database keywords are sufficient
      return true;
    }
    
    // For medium to low confidence, always use AI for better results
    console.log('🧠 [KEYWORDS] Medium/low confidence, using AI for better accuracy');
    return true;
  }

  /**
   * Get keywords from your database based on brand/category
   */
  private async getDatabaseKeywords(
    brand: string, 
    category: string, 
    style?: string
  ): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_keyword_suggestions', {
          p_brand: brand,
          p_category: category,
          p_style: style
        });

      if (error) {
        console.error('❌ [KEYWORDS] Database keyword error:', error);
        return [];
      }

      // Convert JSONB array to string array
      const keywords = Array.isArray(data) ? data : [];
      console.log('📊 [KEYWORDS] Database returned keywords:', keywords);
      return keywords;
    } catch (error) {
      console.error('❌ [KEYWORDS] Error fetching database keywords:', error);
      return [];
    }
  }

  /**
   * Get AI-generated keywords using GPT-4 Vision
   */
  private async getAIKeywords(
    imageUrl: string,
    brand: string,
    category: string
  ): Promise<string[]> {
    try {
      console.log('🤖 [KEYWORDS] Starting AI keyword generation...');
      
      // Fetch the image and convert to base64 using utility function
      const imageBase64 = await fetchImageAsBase64(imageUrl);
      
      console.log('🤖 [KEYWORDS] Image converted to base64, calling OpenAI...');
      
      // Call the existing OpenAI service
      const result = await analyzeClothingItem(imageBase64);
      
      if (!result.success || !result.data) {
        console.error('❌ [KEYWORDS] OpenAI analysis failed:', result.error);
        return [];
      }
      
      // Extract keywords from the analysis
      const keyFeatures = result.data.key_features || [];
      const additionalKeywords = this.extractKeywordsFromAnalysis(result.data, brand, category);
      
      // Combine and clean keywords
      const allKeywords = [...keyFeatures, ...additionalKeywords];
      const cleanedKeywords = allKeywords
        .map(k => k.toLowerCase().trim())
        .filter(k => k.length > 0 && k.length < 20) // Filter out empty or too long keywords
        .slice(0, 12); // Limit to 12 keywords
      
      console.log('🤖 [KEYWORDS] AI keywords extracted:', cleanedKeywords);
      return cleanedKeywords;
    } catch (error) {
      console.error('❌ [KEYWORDS] AI keyword generation error:', error);
      return [];
    }
  }

  /**
   * Extract additional keywords from OpenAI analysis
   */
  private extractKeywordsFromAnalysis(analysis: any, brand: string, category: string): string[] {
    const keywords: string[] = [];
    
    // Add style-based keywords
    if (analysis.item_type) {
      keywords.push(analysis.item_type.toLowerCase());
    }
    
    // Add condition-based keywords
    if (analysis.condition) {
      const conditionKeywords = {
        'new': ['new', 'unworn', 'tags'],
        'like_new': ['like new', 'excellent', 'barely worn'],
        'good': ['good condition', 'gently used'],
        'fair': ['fair condition', 'some wear']
      };
      keywords.push(...(conditionKeywords[analysis.condition] || []));
    }
    
    // Add color keywords
    if (analysis.color) {
      keywords.push(analysis.color.toLowerCase());
    }
    
    // Add brand-specific keywords
    const brandKeywords = {
      'gap': ['casual', 'everyday', 'classic'],
      'lululemon': ['athletic', 'yoga', 'activewear'],
      'nike': ['athletic', 'sportswear', 'casual'],
      'farm rio': ['bohemian', 'brazilian', 'colorful']
    };
    
    const brandLower = brand.toLowerCase();
    if (brandKeywords[brandLower]) {
      keywords.push(...brandKeywords[brandLower]);
    }
    
    return keywords;
  }

  /**
   * Combine database and AI keywords, remove duplicates, rank by relevance
   */
  private combineAndRankKeywords(
    dbKeywords: string[],
    aiKeywords: string[],
    userPreferences?: string[]
  ): KeywordSuggestion {
    console.log('🔄 [KEYWORDS] Combining keywords:', {
      dbKeywords: dbKeywords.length,
      aiKeywords: aiKeywords.length,
      userPreferences: userPreferences?.length || 0
    });

    // Combine all keyword sources with scoring
    const allKeywords = [
      ...dbKeywords.map(k => ({ keyword: k.toLowerCase(), score: 10, source: 'database' })),
      ...aiKeywords.map(k => ({ keyword: k.toLowerCase(), score: 8, source: 'ai' })),
      ...(userPreferences || []).map(k => ({ keyword: k.toLowerCase(), score: 12, source: 'user' }))
    ];

    // Remove duplicates and rank
    const keywordMap = new Map();
    
    allKeywords.forEach(({ keyword, score, source }) => {
      const existing = keywordMap.get(keyword);
      if (!existing || existing.score < score) {
        keywordMap.set(keyword, { keyword, score, source });
      }
    });

    // Sort by score and take top 10
    const rankedKeywords = Array.from(keywordMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.keyword);

    // Calculate confidence based on keyword source diversity
    const confidence = Math.min(
      0.95,
      0.3 + (dbKeywords.length * 0.05) + (aiKeywords.length * 0.03)
    );

    console.log('🔄 [KEYWORDS] Final ranking complete:', {
      rankedKeywords,
      confidence,
      totalSources: keywordMap.size
    });

    return {
      keywords: rankedKeywords,
      confidence,
      source: 'hybrid'
    };
  }

  /**
   * Save photo analysis to database
   */
  private async savePhotoAnalysis(analysis: PhotoAnalysis): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        console.error('❌ [KEYWORDS] No authenticated user found');
        return null;
      }

      const analysisData = {
        ...analysis,
        user_id: user.id
      };

      const { data, error } = await this.supabase
        .from('photo_analysis')
        .insert([analysisData])
        .select()
        .single();

      if (error) {
        console.error('❌ [KEYWORDS] Error saving photo analysis:', error);
        return null;
      }

      console.log('✅ [KEYWORDS] Photo analysis saved successfully:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ [KEYWORDS] Error saving photo analysis:', error);
      return null;
    }
  }

  /**
   * Generate optimized eBay title
   */
  generateEbayTitle(
    brand: string,
    category: string,
    modelNumber: string,
    size: string,
    keywords: string[],
    maxLength: number = 80
  ): string {
    // Start with essential info - prioritize model number for searchability
    let title = brand;
    
    // Add model number right after brand for maximum search impact
    if (modelNumber) {
      title += ` ${modelNumber}`;
    }
    
    // Add category if it's not already implied by model number
    if (!modelNumber || !modelNumber.toLowerCase().includes(category.toLowerCase())) {
      title += ` ${category}`;
    }
    
    if (size) {
      title += ` Size ${size}`;
    }

    // Add keywords until we hit the length limit
    let remainingLength = maxLength - title.length;
    
    for (const keyword of keywords) {
      const keywordWithSpace = ` ${keyword}`;
      if (keywordWithSpace.length <= remainingLength) {
        title += keywordWithSpace;
        remainingLength -= keywordWithSpace.length;
      } else {
        break;
      }
    }

    return title;
  }

  /**
   * Update user-approved keywords for learning
   */
  async updateUserApprovedKeywords(
    itemId: string,
    approvedKeywords: string[]
  ): Promise<void> {
    try {
      console.log('📝 [KEYWORDS] Updating user-approved keywords for item:', itemId);
      
      const { error } = await this.supabase
        .from('photo_analysis')
        .update({ 
          user_approved_keywords: approvedKeywords 
        })
        .eq('item_id', itemId);

      if (error) {
        console.error('❌ [KEYWORDS] Error updating user-approved keywords:', error);
        throw error;
      }

      console.log('✅ [KEYWORDS] User-approved keywords updated successfully');
    } catch (error) {
      console.error('❌ [KEYWORDS] Error updating user-approved keywords:', error);
      throw error;
    }
  }

  /**
   * Track keyword performance when listing sells/gets views
   */
  async trackKeywordPerformance(
    photoAnalysisId: string,
    views: number = 0,
    watchers: number = 0,
    messages: number = 0,
    sold: boolean = false,
    salePrice?: number
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('update_keyword_performance', {
          p_photo_analysis_id: photoAnalysisId,
          p_views: views,
          p_watchers: watchers,
          p_messages: messages,
          p_sold: sold,
          p_sale_price: salePrice
        });

      if (error) {
        console.error('❌ [KEYWORDS] Error tracking keyword performance:', error);
      } else {
        console.log('✅ [KEYWORDS] Keyword performance tracked successfully');
      }
    } catch (error) {
      console.error('❌ [KEYWORDS] Error tracking keyword performance:', error);
    }
  }

  /**
   * Get user's keyword preferences
   */
  async getUserKeywordPreferences(userId: string): Promise<{
    preferred: string[];
    blocked: string[];
    autoApprove: boolean;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('user_keyword_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return { preferred: [], blocked: [], autoApprove: false };
      }

      return {
        preferred: data.preferred_keywords || [],
        blocked: data.blocked_keywords || [],
        autoApprove: data.auto_approve || false
      };
    } catch (error) {
      console.error('❌ [KEYWORDS] Error getting user preferences:', error);
      return { preferred: [], blocked: [], autoApprove: false };
    }
  }

  /**
   * AUTO-PROMOTION SYSTEM FUNCTIONS
   */

  /**
   * Preview brands that are ready for promotion (admin dashboard)
   */
  async getPromotableBrands(minSubmissions: number = 15): Promise<Array<{
    brand: string;
    category: string;
    submission_count: number;
    top_keywords: string[];
    ready_for_promotion: boolean;
  }>> {
    try {
      const { data, error } = await this.supabase
        .rpc('preview_promotable_brands', { min_submissions: minSubmissions });

      if (error) {
        console.error('❌ [KEYWORDS] Error getting promotable brands:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [KEYWORDS] Error getting promotable brands:', error);
      return [];
    }
  }

  /**
   * Run auto-promotion manually (admin function)
   */
  async runAutoPromotion(
    minSubmissions: number = 15,
    minApprovalRate: number = 0.60
  ): Promise<Array<{
    promoted_brand: string;
    promoted_category: string;
    new_keywords: string[];
    submission_count: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .rpc('auto_promote_brand_keywords', {
          min_submissions: minSubmissions,
          min_approval_rate: minApprovalRate
        });

      if (error) {
        console.error('❌ [KEYWORDS] Auto-promotion error:', error);
        return [];
      }

      console.log(`✅ [KEYWORDS] Auto-promoted ${data?.length || 0} brand/category combinations`);
      return data || [];
    } catch (error) {
      console.error('❌ [KEYWORDS] Error running auto-promotion:', error);
      return [];
    }
  }

  /**
   * Check if a brand needs more data before promotion
   */
  async getBrandLearningStatus(brand: string, category: string): Promise<{
    submissions: number;
    needsMore: number;
    readyForPromotion: boolean;
    topKeywords: string[];
  }> {
    try {
      const { data, error } = await this.supabase
        .from('photo_analysis')
        .select('user_approved_keywords')
        .eq('detected_brand', brand)
        .eq('detected_category', category)
        .not('user_approved_keywords', 'is', null);

      if (error) {
        console.error('❌ [KEYWORDS] Error checking brand status:', error);
        return { submissions: 0, needsMore: 15, readyForPromotion: false, topKeywords: [] };
      }

      const submissions = data.length;
      const needsMore = Math.max(0, 15 - submissions);
      
      // Extract most common keywords
      const allKeywords = data.flatMap(item => item.user_approved_keywords || []);
      const keywordCounts = allKeywords.reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {});
      
      const topKeywords = Object.entries(keywordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([keyword]) => keyword);
      
      return {
        submissions,
        needsMore,
        readyForPromotion: submissions >= 15,
        topKeywords
      };
    } catch (error) {
      console.error('❌ [KEYWORDS] Error checking brand status:', error);
      return { submissions: 0, needsMore: 15, readyForPromotion: false, topKeywords: [] };
    }
  }

  // Use existing OpenAI service for GPT-4 Vision analysis
  private async callGPT4Vision(imageUrl: string, prompt: string): Promise<string> {
    try {
      console.log('🤖 [KEYWORDS] Using existing OpenAI service for keyword analysis...');
      
      // Fetch the image and convert to base64 using utility function
      const imageBase64 = await fetchImageAsBase64(imageUrl);
      
      console.log('🤖 [KEYWORDS] Image converted to base64, calling analyzeClothingItem...');
      
      // Use the existing OpenAI service
      const result = await analyzeClothingItem(imageBase64);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'OpenAI analysis failed');
      }
      
      // Extract keywords from the analysis result
      const keyFeatures = result.data.key_features || [];
      const additionalKeywords = this.extractKeywordsFromAnalysis(result.data);
      
      // Combine and return as comma-separated string
      const allKeywords = [...keyFeatures, ...additionalKeywords];
      const keywordString = allKeywords.join(', ');
      
      console.log('🤖 [KEYWORDS] Keywords extracted from OpenAI analysis:', keywordString);
      return keywordString;
    } catch (error) {
      console.error('❌ [KEYWORDS] Error in callGPT4Vision:', error);
      throw error;
    }
  }

  /**
   * Extract additional keywords from OpenAI clothing analysis
   */
  private extractKeywordsFromAnalysis(analysis: any): string[] {
    const keywords: string[] = [];
    
    // Add style-based keywords
    if (analysis.item_type) {
      keywords.push(analysis.item_type.toLowerCase());
    }
    
    // Add condition-based keywords
    if (analysis.condition) {
      const conditionKeywords = {
        'New': ['new', 'unworn', 'tags'],
        'Like New': ['like new', 'excellent', 'barely worn'],
        'Good': ['good condition', 'gently used'],
        'Fair': ['fair condition', 'some wear']
      };
      const conditionKeys = conditionKeywords[analysis.condition] || [];
      keywords.push(...conditionKeys);
    }
    
    // Add marketplace-specific keywords from the analysis
    if (analysis.marketplace_title) {
      // Extract descriptive words from the suggested title
      const titleWords = analysis.marketplace_title
        .toLowerCase()
        .split(' ')
        .filter(word => 
          word.length > 3 && 
          !['size', 'the', 'and', 'for', 'with'].includes(word)
        );
      keywords.push(...titleWords);
    }
    
    return keywords.filter(k => k && k.length > 0);
  }
}

export default KeywordOptimizationService;