import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Award, RefreshCw, Play, Eye, BarChart3 } from 'lucide-react';
import KeywordOptimizationService from '../services/KeywordOptimizationService';
import { supabase } from '../lib/supabase';

interface PromotableBrand {
  brand: string;
  category: string;
  submission_count: number;
  top_keywords: string[];
  ready_for_promotion: boolean;
}

interface BrandLearningStatus {
  submissions: number;
  needsMore: number;
  readyForPromotion: boolean;
  topKeywords: string[];
}

const AutoPromotionDashboard: React.FC = () => {
  const [promotableBrands, setPromotableBrands] = useState<PromotableBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [brandStatus, setBrandStatus] = useState<BrandLearningStatus | null>(null);

  const keywordService = new KeywordOptimizationService(supabase);

  // Load brands ready for promotion
  const loadPromotableBrands = async () => {
    setLoading(true);
    try {
      console.log('🔄 [ADMIN] Loading promotable brands...');
      const brands = await keywordService.getPromotableBrands(10); // Lower threshold for testing
      console.log('📊 [ADMIN] Loaded promotable brands:', brands);
      setPromotableBrands(brands);
    } catch (error) {
      console.error('❌ [ADMIN] Error loading promotable brands:', error);
    } finally {
      setLoading(false);
    }
  };

  // Run auto-promotion
  const runPromotion = async () => {
    setPromoting(true);
    try {
      console.log('🚀 [ADMIN] Running auto-promotion...');
      const results = await keywordService.runAutoPromotion(10, 0.50); // Lower thresholds for testing
      console.log('✅ [ADMIN] Promotion results:', results);
      
      // Reload the list
      await loadPromotableBrands();
      
      alert(`Successfully promoted ${results.length} brand/category combinations!`);
    } catch (error) {
      console.error('❌ [ADMIN] Error running promotion:', error);
      alert('Error running auto-promotion');
    } finally {
      setPromoting(false);
    }
  };

  // Check individual brand status
  const checkBrandStatus = async (brand: string, category: string) => {
    try {
      console.log('🔍 [ADMIN] Checking brand status:', brand, category);
      const status = await keywordService.getBrandLearningStatus(brand, category);
      console.log('📊 [ADMIN] Brand status:', status);
      setBrandStatus(status);
      setSelectedBrand(`${brand} - ${category}`);
    } catch (error) {
      console.error('❌ [ADMIN] Error checking brand status:', error);
    }
  };

  useEffect(() => {
    loadPromotableBrands();
  }, []);

  const readyForPromotionCount = promotableBrands.filter(b => b.ready_for_promotion).length;
  const totalSubmissions = promotableBrands.reduce((sum, b) => sum + b.submission_count, 0);

  return (
    <div className="auto-promotion-dashboard bg-white rounded-2xl shadow-lg p-6">
      {/* Dashboard Header */}
      <div className="dashboard-header mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Auto-Promotion Dashboard</h2>
            <p className="text-gray-600">Monitor and manage AI keyword learning system</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={loadPromotableBrands} 
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
            </button>
            <button 
              onClick={runPromotion} 
              disabled={promoting || readyForPromotionCount === 0}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>
                {promoting ? 'Promoting...' : `Promote ${readyForPromotionCount} Brands`}
              </span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Ready for Promotion</p>
                <p className="text-2xl font-bold">{readyForPromotionCount}</p>
              </div>
              <Award className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Submissions</p>
                <p className="text-2xl font-bold">{totalSubmissions}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Learning Brands</p>
                <p className="text-2xl font-bold">{promotableBrands.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Brand List */}
      <div className="brand-list">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Learning Status</h3>
        
        {promotableBrands.length > 0 ? (
          <div className="space-y-4">
            {promotableBrands.map((brand, index) => (
              <div 
                key={index} 
                className={`brand-card border-2 rounded-xl p-4 transition-colors ${
                  brand.ready_for_promotion 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="brand-info flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {brand.brand} - {brand.category}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        brand.ready_for_promotion 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {brand.ready_for_promotion ? '✅ Ready' : '⏳ Learning'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{brand.submission_count} submissions</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{brand.top_keywords?.length || 0} keywords</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Learning Progress</span>
                        <span>{Math.min(100, Math.round((brand.submission_count / 15) * 100))}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            brand.ready_for_promotion ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (brand.submission_count / 15) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Keywords Preview */}
                    {brand.top_keywords && brand.top_keywords.length > 0 && (
                      <div className="keywords-preview">
                        <p className="text-sm font-medium text-gray-700 mb-2">Top Keywords:</p>
                        <div className="flex flex-wrap gap-2">
                          {brand.top_keywords.slice(0, 6).map((keyword: string, i: number) => (
                            <span 
                              key={i} 
                              className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-700"
                            >
                              {keyword}
                            </span>
                          ))}
                          {brand.top_keywords.length > 6 && (
                            <span className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-500">
                              +{brand.top_keywords.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => checkBrandStatus(brand.brand, brand.category)}
                    className="ml-4 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Learning Data Yet</h3>
            <p className="text-gray-600 mb-4">
              {loading ? 'Loading brand data...' : 'Start uploading photos to begin collecting keyword learning data!'}
            </p>
          </div>
        )}
      </div>

      {/* Brand Status Modal */}
      {selectedBrand && brandStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{selectedBrand}</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Submissions:</span>
                <span className="font-semibold">{brandStatus.submissions}/15</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Still Needed:</span>
                <span className="font-semibold text-orange-600">{brandStatus.needsMore}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ready for Promotion:</span>
                <span className={`font-semibold ${brandStatus.readyForPromotion ? 'text-green-600' : 'text-red-600'}`}>
                  {brandStatus.readyForPromotion ? 'Yes' : 'No'}
                </span>
              </div>
              
              {brandStatus.topKeywords.length > 0 && (
                <div>
                  <p className="text-gray-600 mb-2">Top Keywords:</p>
                  <div className="flex flex-wrap gap-2">
                    {brandStatus.topKeywords.map((keyword, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => {
                setSelectedBrand(null);
                setBrandStatus(null);
              }}
              className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* How It Works Info */}
      <div className="promotion-info mt-8 bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How Auto-Promotion Works</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">✅</span>
              <span>Collects user-approved keywords from photo uploads</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">✅</span>
              <span>Analyzes patterns when a brand reaches 15+ submissions</span>
            </li>
          </ul>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">✅</span>
              <span>Promotes keywords with 60%+ approval rate to main database</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">✅</span>
              <span>Future uploads get instant, accurate keyword suggestions</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AutoPromotionDashboard;