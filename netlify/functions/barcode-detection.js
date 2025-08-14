/**
 * Netlify Function: Barcode Detection Fallback
 * OCR-based barcode detection when native BarcodeDetector API is unavailable
 */

const { GoogleAuth } = require('google-auth-library');

// Environment validation
const requiredEnvVars = ['GOOGLE_CLOUD_PROJECT_ID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️ [BARCODE-DETECTION] Missing environment variables:', missingVars);
}

exports.handler = async (event, context) => {
  console.log('🔍 [BARCODE-DETECTION] Function invoked');
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Method not allowed. Use POST.' 
      })
    };
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error('❌ [BARCODE-DETECTION] Invalid JSON in request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        })
      };
    }

    const { imageData, detection_type } = requestBody;

    if (!imageData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing imageData parameter'
        })
      };
    }

    console.log('📊 [BARCODE-DETECTION] Processing request:', {
      detection_type: detection_type || 'barcode',
      imageDataType: imageData.startsWith('data:') ? 'base64' : 'url',
      imageDataLength: imageData.length
    });

    // Initialize Google Vision client
    let visionClient;
    try {
      const { ImageAnnotatorClient } = require('@google-cloud/vision');
      
      // Use application default credentials or service account key
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      
      visionClient = new ImageAnnotatorClient({ auth });
      console.log('✅ [BARCODE-DETECTION] Google Vision client initialized');
    } catch (authError) {
      console.error('❌ [BARCODE-DETECTION] Google Vision initialization failed:', authError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Vision API initialization failed',
          details: authError.message
        })
      };
    }

    // Convert base64 data URL to buffer if needed
    let imageBuffer;
    if (imageData.startsWith('data:')) {
      const base64Data = imageData.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Only base64 data URLs are supported'
        })
      };
    }

    console.log('🔍 [BARCODE-DETECTION] Running OCR text detection...');

    // Use Google Vision OCR to extract text
    const [result] = await visionClient.textDetection({
      image: { content: imageBuffer }
    });

    const detections = result.textAnnotations || [];
    const fullText = result.fullTextAnnotation?.text || '';
    
    console.log('📝 [BARCODE-DETECTION] OCR results:', {
      detectionsCount: detections.length,
      fullTextLength: fullText.length,
      fullTextPreview: fullText.substring(0, 100)
    });

    // Extract potential barcodes using pattern matching
    const barcodes = extractBarcodesFromText(fullText, detections);
    
    console.log('🎯 [BARCODE-DETECTION] Barcode extraction results:', {
      barcodesFound: barcodes.length,
      barcodes: barcodes.map(b => ({ code: b.code, format: b.format, confidence: b.confidence }))
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        barcodes,
        ocrText: fullText,
        detectionsCount: detections.length,
        processingTime: Date.now()
      })
    };

  } catch (error) {
    console.error('❌ [BARCODE-DETECTION] Processing error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Barcode detection failed',
        details: error.message
      })
    };
  }
};

/**
 * Extract potential barcodes from OCR text using pattern matching
 */
function extractBarcodesFromText(fullText, detections) {
  const barcodes = [];
  const processedCodes = new Set();

  // Barcode patterns
  const patterns = [
    // UPC-A (12 digits)
    { regex: /\b\d{12}\b/g, format: 'UPC-A', minConfidence: 0.8 },
    // UPC-E (6-8 digits)
    { regex: /\b\d{6,8}\b/g, format: 'UPC-E', minConfidence: 0.7 },
    // EAN-13 (13 digits)
    { regex: /\b\d{13}\b/g, format: 'EAN-13', minConfidence: 0.8 },
    // EAN-8 (8 digits)
    { regex: /\b\d{8}\b/g, format: 'EAN-8', minConfidence: 0.7 },
    // ISBN-10 (10 digits with possible X)
    { regex: /\b\d{9}[\dX]\b/g, format: 'ISBN-10', minConfidence: 0.8 },
    // ISBN-13 (13 digits starting with 978 or 979)
    { regex: /\b97[89]\d{10}\b/g, format: 'ISBN-13', minConfidence: 0.9 },
    // Code 128 (alphanumeric, variable length)
    { regex: /\b[A-Z0-9]{6,20}\b/g, format: 'CODE128', minConfidence: 0.6 }
  ];

  // Search in full text
  for (const pattern of patterns) {
    const matches = fullText.match(pattern.regex) || [];
    
    for (const match of matches) {
      if (!processedCodes.has(match)) {
        processedCodes.add(match);
        
        // Validate barcode format
        const validation = validateBarcodeFormat(match, pattern.format);
        
        if (validation.isValid) {
          barcodes.push({
            code: match,
            format: pattern.format,
            confidence: Math.min(pattern.minConfidence + validation.confidence, 0.95),
            source: 'ocr-pattern-match'
          });
          
          console.log('✅ [BARCODE-EXTRACT] Found barcode:', {
            code: match,
            format: pattern.format,
            confidence: validation.confidence
          });
        }
      }
    }
  }

  // Search in individual detections for higher confidence
  for (const detection of detections.slice(1)) { // Skip first (full text)
    const text = detection.description || '';
    
    for (const pattern of patterns) {
      const matches = text.match(pattern.regex) || [];
      
      for (const match of matches) {
        if (!processedCodes.has(match)) {
          processedCodes.add(match);
          
          const validation = validateBarcodeFormat(match, pattern.format);
          
          if (validation.isValid) {
            // Higher confidence for individual detections
            const confidence = Math.min(pattern.minConfidence + validation.confidence + 0.1, 0.95);
            
            barcodes.push({
              code: match,
              format: pattern.format,
              confidence,
              source: 'ocr-individual-detection',
              boundingBox: detection.boundingPoly
            });
            
            console.log('✅ [BARCODE-EXTRACT] Found barcode in individual detection:', {
              code: match,
              format: pattern.format,
              confidence
            });
          }
        }
      }
    }
  }

  // Sort by confidence and return top results
  return barcodes
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5); // Return top 5 candidates
}

/**
 * Validate barcode format and calculate confidence
 */
function validateBarcodeFormat(code, format) {
  const cleanCode = code.replace(/[^0-9X]/g, '');
  
  switch (format) {
    case 'UPC-A':
      if (cleanCode.length === 12 && /^\d{12}$/.test(cleanCode)) {
        return { isValid: true, confidence: 0.2 };
      }
      break;
      
    case 'UPC-E':
      if (cleanCode.length >= 6 && cleanCode.length <= 8 && /^\d+$/.test(cleanCode)) {
        return { isValid: true, confidence: 0.15 };
      }
      break;
      
    case 'EAN-13':
      if (cleanCode.length === 13 && /^\d{13}$/.test(cleanCode)) {
        return { isValid: true, confidence: 0.2 };
      }
      break;
      
    case 'EAN-8':
      if (cleanCode.length === 8 && /^\d{8}$/.test(cleanCode)) {
        return { isValid: true, confidence: 0.15 };
      }
      break;
      
    case 'ISBN-10':
      if (cleanCode.length === 10 && /^\d{9}[\dX]$/.test(cleanCode)) {
        return { isValid: validateISBN10(cleanCode), confidence: 0.25 };
      }
      break;
      
    case 'ISBN-13':
      if (cleanCode.length === 13 && /^97[89]\d{10}$/.test(cleanCode)) {
        return { isValid: validateISBN13(cleanCode), confidence: 0.3 };
      }
      break;
      
    case 'CODE128':
      if (cleanCode.length >= 6 && cleanCode.length <= 20) {
        return { isValid: true, confidence: 0.1 };
      }
      break;
  }
  
  return { isValid: false, confidence: 0 };
}

/**
 * Validate ISBN-10 checksum
 */
function validateISBN10(isbn) {
  if (isbn.length !== 10) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(isbn[i]);
    if (isNaN(digit)) return false;
    sum += digit * (10 - i);
  }
  
  const checkDigit = isbn[9];
  const calculatedCheck = (11 - (sum % 11)) % 11;
  const expectedCheck = calculatedCheck === 10 ? 'X' : calculatedCheck.toString();
  
  return checkDigit === expectedCheck;
}

/**
 * Validate ISBN-13 checksum
 */
function validateISBN13(isbn) {
  if (isbn.length !== 13) return false;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i]);
    if (isNaN(digit)) return false;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  
  const checkDigit = parseInt(isbn[12]);
  const calculatedCheck = (10 - (sum % 10)) % 10;
  
  return checkDigit === calculatedCheck;
}