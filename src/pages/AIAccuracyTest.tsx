import React, { useState } from 'react';
import { enhancedMultiImageProcessor } from '../services/EnhancedMultiImageProcessor';
import { aiAccuracyAgent } from '../services/AIAccuracyAgent';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';

interface TestResult {
  combinedAnalysis: any;
  individualResults: any[];
  bestImage: number;
  processingTime: number;
  accuracyScore: number;
  optimizationSuggestions: string[];
}

export default function AIAccuracyTest() {
  const { user } = useAuth();
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<TestResult | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageUrls: string[] = [];
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      imageUrls.push(url);
    });
    
    setImages(imageUrls);
    setResults(null);
  };

  const runAccuracyTest = async () => {
    if (images.length === 0) return;
    
    setIsProcessing(true);
    try {
      console.log('🧪 [AI-TEST] Starting enhanced multi-image analysis...');
      
      // Process with enhanced multi-image processor
      const result = await enhancedMultiImageProcessor.processMultipleImages(
        images,
        user?.id,
        `test_${Date.now()}`
      );
      
      setResults(result);
      
      // Get performance metrics if user is available
      if (user?.id) {
        const metrics = await aiAccuracyAgent.getPerformanceMetrics(user.id);
        setPerformanceMetrics(metrics);
      }
      
      console.log('✅ [AI-TEST] Analysis complete:', result);
      
    } catch (error) {
      console.error('❌ [AI-TEST] Analysis failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getAccuracyColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Accuracy Test Lab</h1>
          <p className="text-gray-600">Test the enhanced AI analysis system with multiple images</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Test Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={url}
                        alt={`Test image ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Badge className="absolute top-2 left-2">
                        {idx + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                onClick={runAccuracyTest}
                disabled={images.length === 0 || isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Analyzing Images...' : 'Run Enhanced AI Analysis'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {results && (
          <Tabs defaultValue="combined" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="combined">Combined Results</TabsTrigger>
              <TabsTrigger value="individual">Individual Images</TabsTrigger>
              <TabsTrigger value="metrics">Performance</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="combined">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Combined Analysis Results
                    <Badge className={getConfidenceColor(results.combinedAnalysis.confidence)}>
                      {Math.round(results.combinedAnalysis.confidence * 100)}% Confidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">Extracted Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Brand:</span>
                          <span className="font-medium">{results.combinedAnalysis.brand || 'Not detected'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium">{results.combinedAnalysis.size || 'Not detected'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Color:</span>
                          <span className="font-medium">{results.combinedAnalysis.color || 'Not detected'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Condition:</span>
                          <span className="font-medium">{results.combinedAnalysis.condition || 'Not detected'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Category:</span>
                          <span className="font-medium">{results.combinedAnalysis.category || 'Not detected'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Material:</span>
                          <span className="font-medium">{results.combinedAnalysis.material || 'Not detected'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3">Performance Metrics</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">Accuracy Score</span>
                            <span className={`text-sm font-medium ${getAccuracyColor(results.accuracyScore)}`}>
                              {Math.round(results.accuracyScore * 100)}%
                            </span>
                          </div>
                          <Progress value={results.accuracyScore * 100} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">Processing Time</span>
                            <span className="text-sm font-medium">{results.processingTime}ms</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">Best Image</span>
                            <span className="text-sm font-medium">Image #{results.bestImage + 1}</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">Images Processed</span>
                            <span className="text-sm font-medium">{results.individualResults.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3">Keywords ({results.combinedAnalysis.keywords.length})</h3>
                    <div className="flex flex-wrap gap-2">
                      {results.combinedAnalysis.keywords.map((keyword: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {results.combinedAnalysis.ocrText && (
                    <div>
                      <h3 className="font-semibold mb-3">OCR Text Extracted</h3>
                      <div className="bg-gray-100 p-3 rounded text-sm max-h-32 overflow-y-auto">
                        {results.combinedAnalysis.ocrText}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="individual">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.individualResults.map((result, idx) => (
                  <Card key={idx} className={idx === results.bestImage ? 'ring-2 ring-blue-500' : ''}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Image #{idx + 1} {idx === results.bestImage && <Badge>Best</Badge>}
                        <Badge className={getConfidenceColor(result.confidence)}>
                          {Math.round(result.confidence * 100)}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Brand:</span>
                          <span>{result.brand || 'None'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span>{result.size || 'None'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Color:</span>
                          <span>{result.color || 'None'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Keywords:</span>
                          <span>{result.keywords.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">OCR Length:</span>
                          <span>{result.ocrText.length} chars</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="metrics">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  {performanceMetrics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Overall Performance</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Predictions:</span>
                            <span className="font-medium">{performanceMetrics.totalPredictions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Average Accuracy:</span>
                            <span className={`font-medium ${getAccuracyColor(performanceMetrics.avgAccuracy)}`}>
                              {Math.round(performanceMetrics.avgAccuracy * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Average Cost:</span>
                            <span className="font-medium">{performanceMetrics.avgCostCents}¢</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cost Efficiency:</span>
                            <span className="font-medium">{performanceMetrics.costEfficiency.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-3">Field Accuracies</h3>
                        <div className="space-y-2">
                          {Object.entries(performanceMetrics.fieldAccuracies).map(([field, accuracy]: [string, any]) => (
                            <div key={field}>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-600 capitalize">{field}:</span>
                                <span className={`text-sm font-medium ${getAccuracyColor(accuracy)}`}>
                                  {Math.round(accuracy * 100)}%
                                </span>
                              </div>
                              <Progress value={accuracy * 100} className="h-1" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">No historical performance data available. Complete more analyses to see metrics.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suggestions">
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.optimizationSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                          {idx + 1}
                        </div>
                        <p className="text-blue-800">{suggestion}</p>
                      </div>
                    ))}
                    
                    {results.optimizationSuggestions.length === 0 && (
                      <p className="text-green-600 font-medium">🎉 Excellent! No optimization suggestions needed.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}