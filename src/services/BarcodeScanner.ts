/**
 * Barcode/UPC Scanner Service
 * Cell phone camera barcode scanning with product database lookup
 */

export interface BarcodeResult {
  code: string;
  format: 'UPC-A' | 'UPC-E' | 'EAN-13' | 'EAN-8' | 'CODE128' | 'QR' | 'unknown';
  confidence: number;
  productInfo?: ProductInfo;
}

export interface ProductInfo {
  title: string;
  brand: string;
  category: string;
  description: string;
  model?: string;
  manufacturer?: string;
  upc: string;
  isbn?: string;
  imageUrl?: string;
  suggestedPrice?: number;
  specifications?: Record<string, string>;
  source: 'upc-database' | 'isbn-database' | 'manual-lookup';
}

export class BarcodeScanner {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private scanning: boolean = false;

  /**
   * Initialize camera access for barcode scanning
   */
  async initializeCamera(): Promise<HTMLVideoElement> {
    try {
      console.log('📱 [BARCODE-SCANNER] Initializing camera access...');
      
      // Request camera permission with back camera preference
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Create video element
      this.video = document.createElement('video');
      this.video.setAttribute('playsinline', ''); // Required for iOS
      this.video.muted = true;
      this.video.srcObject = this.stream;
      
      await new Promise((resolve) => {
        this.video!.onloadedmetadata = () => {
          this.video!.play();
          resolve(void 0);
        };
      });

      // Create canvas for frame capture
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;

      console.log('✅ [BARCODE-SCANNER] Camera initialized successfully');
      return this.video;
    } catch (error) {
      console.error('❌ [BARCODE-SCANNER] Camera initialization failed:', error);
      throw new Error('Camera access denied or unavailable');
    }
  }

  /**
   * Start continuous barcode scanning
   */
  async startScanning(onBarcodeDetected: (result: BarcodeResult) => void): Promise<void> {
    if (!this.video || !this.canvas) {
      throw new Error('Camera not initialized. Call initializeCamera() first.');
    }

    this.scanning = true;
    console.log('🔍 [BARCODE-SCANNER] Starting continuous scan...');

    const scanFrame = async () => {
      if (!this.scanning || !this.video || !this.canvas) {
        return;
      }

      try {
        // Capture frame from video
        const ctx = this.canvas.getContext('2d')!;
        ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Convert to image data
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Use HTML5 BarcodeDetector API if available
        if ('BarcodeDetector' in window) {
          await this.scanWithBarcodeDetector(imageData, onBarcodeDetected);
        } else {
          // Fallback to ZXing or manual detection
          await this.scanWithFallback(this.canvas.toDataURL(), onBarcodeDetected);
        }
      } catch (error) {
        console.warn('⚠️ [BARCODE-SCANNER] Frame scan error:', error);
      }

      // Continue scanning
      if (this.scanning) {
        requestAnimationFrame(scanFrame);
      }
    };

    scanFrame();
  }

  /**
   * Scan using native BarcodeDetector API
   */
  private async scanWithBarcodeDetector(
    imageData: ImageData, 
    callback: (result: BarcodeResult) => void
  ): Promise<void> {
    try {
      // @ts-ignore - BarcodeDetector might not be in TypeScript types yet
      const barcodeDetector = new BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code']
      });

      // @ts-ignore
      const barcodes = await barcodeDetector.detect(imageData);
      
      if (barcodes.length > 0) {
        const barcode = barcodes[0];
        console.log('✅ [BARCODE-SCANNER] Barcode detected:', barcode.rawValue);
        
        const result: BarcodeResult = {
          code: barcode.rawValue,
          format: this.mapBarcodeFormat(barcode.format),
          confidence: 0.95
        };

        // Look up product information
        result.productInfo = await this.lookupProduct(result.code, result.format);
        
        callback(result);
        this.stopScanning();
      }
    } catch (error) {
      console.warn('⚠️ [BARCODE-SCANNER] BarcodeDetector error:', error);
    }
  }

  /**
   * Fallback scanning using OCR and pattern matching
   */
  private async scanWithFallback(
    imageDataUrl: string, 
    callback: (result: BarcodeResult) => void
  ): Promise<void> {
    try {
      // Send to our OCR service for barcode detection
      const response = await fetch('/.netlify/functions/barcode-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageDataUrl,
          detection_type: 'barcode'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.barcodes.length > 0) {
          const barcode = result.barcodes[0];
          console.log('✅ [BARCODE-SCANNER] Fallback barcode detected:', barcode.code);
          
          const barcodeResult: BarcodeResult = {
            code: barcode.code,
            format: barcode.format || 'unknown',
            confidence: barcode.confidence || 0.8
          };

          barcodeResult.productInfo = await this.lookupProduct(barcodeResult.code, barcodeResult.format);
          
          callback(barcodeResult);
          this.stopScanning();
        }
      }
    } catch (error) {
      console.warn('⚠️ [BARCODE-SCANNER] Fallback scan error:', error);
    }
  }

  /**
   * Look up product information by barcode
   */
  private async lookupProduct(code: string, format: string): Promise<ProductInfo | undefined> {
    try {
      console.log('🔍 [PRODUCT-LOOKUP] Looking up product:', code);
      
      // Try multiple product databases
      const lookupPromises = [
        this.lookupUPCDatabase(code),
        this.lookupISBNDatabase(code),
        this.lookupOpenFoodFacts(code)
      ];

      const results = await Promise.allSettled(lookupPromises);
      
      // Return first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          console.log('✅ [PRODUCT-LOOKUP] Product found:', result.value.title);
          return result.value;
        }
      }

      console.log('ℹ️ [PRODUCT-LOOKUP] No product information found for:', code);
      return undefined;
    } catch (error) {
      console.error('❌ [PRODUCT-LOOKUP] Lookup error:', error);
      return undefined;
    }
  }

  /**
   * Lookup product in UPC database
   */
  private async lookupUPCDatabase(code: string): Promise<ProductInfo | null> {
    try {
      // Using UPCItemDB API (free tier available)
      const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          return {
            title: item.title || 'Unknown Product',
            brand: item.brand || 'Unknown Brand',
            category: this.mapUPCCategory(item.category),
            description: item.description || '',
            model: item.model,
            manufacturer: item.manufacturer,
            upc: code,
            imageUrl: item.images?.[0],
            source: 'upc-database'
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ [UPC-LOOKUP] UPC database error:', error);
    }
    return null;
  }

  /**
   * Lookup book by ISBN
   */
  private async lookupISBNDatabase(code: string): Promise<ProductInfo | null> {
    try {
      // Check if it's a valid ISBN format
      if (!this.isValidISBN(code)) {
        return null;
      }

      // Using Google Books API (free)
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${code}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const book = data.items[0].volumeInfo;
          return {
            title: book.title || 'Unknown Book',
            brand: book.publisher || 'Unknown Publisher',
            category: 'books_media',
            description: book.description || '',
            manufacturer: book.publisher,
            upc: code,
            isbn: code,
            imageUrl: book.imageLinks?.thumbnail,
            specifications: {
              'Author': book.authors?.join(', ') || 'Unknown',
              'Pages': book.pageCount?.toString() || 'Unknown',
              'Published': book.publishedDate || 'Unknown',
              'Language': book.language || 'Unknown'
            },
            source: 'isbn-database'
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ [ISBN-LOOKUP] ISBN database error:', error);
    }
    return null;
  }

  /**
   * Lookup product in OpenFoodFacts (for food items)
   */
  private async lookupOpenFoodFacts(code: string): Promise<ProductInfo | null> {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 1 && data.product) {
          const product = data.product;
          return {
            title: product.product_name || 'Unknown Food Product',
            brand: product.brands || 'Unknown Brand',
            category: 'home_garden', // Food items go in home & garden
            description: product.generic_name || '',
            manufacturer: product.manufacturing_places,
            upc: code,
            imageUrl: product.image_url,
            specifications: {
              'Ingredients': product.ingredients_text || 'Unknown',
              'Nutrition Grade': product.nutrition_grade_fr || 'Unknown',
              'Categories': product.categories || 'Unknown'
            },
            source: 'upc-database'
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ [FOOD-LOOKUP] OpenFoodFacts error:', error);
    }
    return null;
  }

  /**
   * Stop scanning and release camera
   */
  stopScanning(): void {
    console.log('🛑 [BARCODE-SCANNER] Stopping scan...');
    this.scanning = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    
    this.canvas = null;
  }

  /**
   * Capture single frame for manual barcode detection
   */
  async captureFrame(): Promise<string | null> {
    if (!this.video || !this.canvas) {
      return null;
    }

    const ctx = this.canvas.getContext('2d')!;
    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    return this.canvas.toDataURL('image/jpeg', 0.8);
  }

  /**
   * Check if scanner is currently active
   */
  isScanning(): boolean {
    return this.scanning;
  }

  /**
   * Get available cameras
   */
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('❌ [BARCODE-SCANNER] Error getting cameras:', error);
      return [];
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(deviceId?: string): Promise<void> {
    this.stopScanning();
    
    const constraints: MediaStreamConstraints = {
      video: deviceId 
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: 'environment' } }
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    if (this.video) {
      this.video.srcObject = this.stream;
      await this.video.play();
    }
  }

  // Helper methods
  private mapBarcodeFormat(format: string): BarcodeResult['format'] {
    const formatMap: Record<string, BarcodeResult['format']> = {
      'upc_a': 'UPC-A',
      'upc_e': 'UPC-E', 
      'ean_13': 'EAN-13',
      'ean_8': 'EAN-8',
      'code_128': 'CODE128',
      'qr_code': 'QR'
    };
    return formatMap[format] || 'unknown';
  }

  private mapUPCCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'Electronics': 'electronics',
      'Books': 'books_media',
      'Home & Kitchen': 'home_garden',
      'Toys & Games': 'toys_games',
      'Sports & Outdoors': 'sports_outdoors',
      'Clothing': 'clothing',
      'Health & Beauty': 'other',
      'Food & Beverage': 'home_garden'
    };
    return categoryMap[category] || 'other';
  }

  private isValidISBN(code: string): boolean {
    // Remove hyphens and spaces
    const cleaned = code.replace(/[-\s]/g, '');
    
    // Check for ISBN-10 or ISBN-13 format
    return /^(?:97[89])?\d{9}[\dX]$/.test(cleaned);
  }
}

export const barcodeScanner = new BarcodeScanner();