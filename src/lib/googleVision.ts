// Google Cloud Vision API client
// Note: This is a simplified client for browser use
// In production, you'd typically use this server-side

interface VisionResponse {
  fullTextAnnotation?: {
    text: string;
  };
  textAnnotations?: Array<{
    description: string;
    boundingPoly?: {
      vertices: Array<{ x: number; y: number }>;
    };
  }>;
}

class GoogleVisionClient {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY || '';
  }

  async textDetection(imageUrl: string): Promise<[VisionResponse]> {
    try {
      console.log('🔍 [GOOGLE-VISION] Starting OCR text detection...');
      
      if (!this.apiKey) {
        console.warn('⚠️ [GOOGLE-VISION] No API key configured, returning empty OCR result');
        return [{ fullTextAnnotation: { text: '' } }];
      }

      // Convert image URL to base64 if needed
      let imageBase64: string;
      if (imageUrl.startsWith('data:')) {
        // Already base64
        imageBase64 = imageUrl.split(',')[1];
      } else {
        // Fetch and convert to base64
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        });
        imageBase64 = base64;
      }

      // Call Google Cloud Vision API
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: imageBase64,
                },
                features: [
                  {
                    type: 'TEXT_DETECTION',
                    maxResults: 50, // Increase to capture more text regions
                  },
                  {
                    type: 'DOCUMENT_TEXT_DETECTION', // Also try document detection for better OCR
                    maxResults: 1,
                  }
                ],
              },
            ],
          }),
        }
      );

      if (!visionResponse.ok) {
        throw new Error(`Google Vision API error: ${visionResponse.status}`);
      }

      const data = await visionResponse.json();
      const textAnnotations = data.responses?.[0]?.textAnnotations;
      const documentText = data.responses?.[0]?.fullTextAnnotation?.text;
      
      // Prefer document text detection if available, fallback to text annotations
      const fullText = documentText || textAnnotations?.[0]?.description || '';

      console.log('✅ [GOOGLE-VISION] OCR completed, extracted text length:', fullText.length);
      
      // Log individual text detections for debugging size detection
      if (textAnnotations && textAnnotations.length > 1) {
        const smallTexts = textAnnotations.slice(1, 11).map(t => t.description).filter(t => t && t.length < 10);
        console.log('🔍 [GOOGLE-VISION] Small text detections (potential sizes):', smallTexts);
        
        // Also log all individual text detections for comprehensive debugging
        const allTexts = textAnnotations.slice(1, 20).map(t => t.description).filter(t => t);
        console.log('📝 [GOOGLE-VISION] All individual text detections:', allTexts);
      }
      
      return [{ 
        fullTextAnnotation: { text: fullText },
        textAnnotations: textAnnotations || [],
        individualTexts: textAnnotations ? textAnnotations.slice(1, 20).map(t => t.description).filter(t => t) : []
      }];
    } catch (error) {
      console.error('❌ [GOOGLE-VISION] OCR failed:', error);
      return [{ 
        fullTextAnnotation: { text: '' },
        textAnnotations: [],
        individualTexts: []
      }];
    }
  }
}

export const visionClient = new GoogleVisionClient();