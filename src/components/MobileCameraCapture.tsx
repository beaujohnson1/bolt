import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, RotateCcw, CheckCircle, X, ScanLine, Maximize2 } from 'lucide-react';
import { barcodeScanner } from '../services/BarcodeScanner';

interface MobileCameraCaptureProps {
  onPhotoCapture?: (photos: string[]) => void;
  onBarcodeDetected?: (barcode: any) => void;
  mode?: 'photo' | 'barcode';
  maxPhotos?: number;
}

const MobileCameraCapture: React.FC<MobileCameraCaptureProps> = ({
  onPhotoCapture,
  onBarcodeDetected,
  mode = 'photo',
  maxPhotos = 10
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<any>(null);
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);

  // Mobile-optimized camera constraints
  const getCameraConstraints = useCallback(() => ({
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      aspectRatio: { ideal: 16/9 }
    },
    audio: false
  }), [facingMode]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      console.log('📱 [MOBILE-CAMERA] Starting camera with constraints:', getCameraConstraints());
      
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints());
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true; // Crucial for iOS
        videoRef.current.muted = true;
        
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play();
            resolve();
          };
        });

        setIsActive(true);
        console.log('✅ [MOBILE-CAMERA] Camera started successfully');

        // Start barcode scanning if in barcode mode
        if (mode === 'barcode') {
          startBarcodeScanning();
        }
      }
    } catch (err) {
      console.error('❌ [MOBILE-CAMERA] Camera start failed:', err);
      setError('Camera access denied or unavailable. Please allow camera permissions and try again.');
    }
  }, [getCameraConstraints, mode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setIsScanningBarcode(false);
    console.log('🛑 [MOBILE-CAMERA] Camera stopped');
  }, []);

  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    console.log('🔄 [MOBILE-CAMERA] Switching camera to:', newFacingMode);
    
    if (isActive) {
      stopCamera();
      // Small delay to ensure cleanup
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  }, [facingMode, isActive, stopCamera, startCamera]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);
    console.log('📸 [MOBILE-CAMERA] Capturing photo...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64 with high quality
      const photoData = canvas.toDataURL('image/jpeg', 0.92);
      
      const newPhotos = [...capturedPhotos, photoData];
      setCapturedPhotos(newPhotos);
      
      console.log('✅ [MOBILE-CAMERA] Photo captured successfully');
      
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Call callback with all photos
      if (onPhotoCapture) {
        onPhotoCapture(newPhotos);
      }

      // Visual feedback
      const flashElement = document.createElement('div');
      flashElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: white;
        z-index: 9999;
        pointer-events: none;
        opacity: 0.8;
      `;
      document.body.appendChild(flashElement);
      
      setTimeout(() => {
        document.body.removeChild(flashElement);
      }, 150);

    } catch (err) {
      console.error('❌ [MOBILE-CAMERA] Photo capture failed:', err);
      setError('Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [capturedPhotos, isCapturing, onPhotoCapture]);

  const startBarcodeScanning = useCallback(async () => {
    if (!videoRef.current || isScanningBarcode) return;

    try {
      setIsScanningBarcode(true);
      console.log('🔍 [MOBILE-CAMERA] Starting barcode scanning...');
      
      await barcodeScanner.initializeCamera();
      await barcodeScanner.startScanning((result) => {
        console.log('✅ [MOBILE-CAMERA] Barcode detected:', result);
        setBarcodeResult(result);
        setIsScanningBarcode(false);
        
        if (onBarcodeDetected) {
          onBarcodeDetected(result);
        }

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      });
    } catch (err) {
      console.error('❌ [MOBILE-CAMERA] Barcode scanning failed:', err);
      setError('Barcode scanning failed. Please try again.');
      setIsScanningBarcode(false);
    }
  }, [isScanningBarcode, onBarcodeDetected]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const removePhoto = useCallback((index: number) => {
    const newPhotos = capturedPhotos.filter((_, i) => i !== index);
    setCapturedPhotos(newPhotos);
    if (onPhotoCapture) {
      onPhotoCapture(newPhotos);
    }
  }, [capturedPhotos, onPhotoCapture]);

  // Handle orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      if (isActive) {
        // Restart camera after orientation change
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play();
          }
        }, 100);
      }
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      barcodeScanner.stopScanning();
    };
  }, [stopCamera]);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'w-full'}`}>
      {/* Camera View */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        {isActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Barcode scanning overlay */}
            {mode === 'barcode' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-64 h-40 border-2 border-white rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br"></div>
                    
                    {isScanningBarcode && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ScanLine className="w-8 h-8 text-green-400 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <p className="text-white text-center mt-2 text-sm">
                    Position barcode within the frame
                  </p>
                </div>
              </div>
            )}

            {/* Photo mode focus frame */}
            {mode === 'photo' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-lg">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br"></div>
                </div>
              </div>
            )}

            {/* Controls overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top controls */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
                <button
                  onClick={stopCamera}
                  className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-full touch-target"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex space-x-2">
                  <button
                    onClick={toggleFullscreen}
                    className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-full touch-target"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={switchCamera}
                    className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-full touch-target"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-6 left-0 right-0 pointer-events-auto">
                <div className="flex items-center justify-center space-x-6">
                  {/* Photo thumbnails */}
                  {mode === 'photo' && capturedPhotos.length > 0 && (
                    <div className="flex space-x-2">
                      {capturedPhotos.slice(-3).map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo}
                            alt={`Captured ${index + 1}`}
                            className="w-12 h-12 object-cover rounded-lg border-2 border-white/50"
                          />
                          <button
                            onClick={() => removePhoto(capturedPhotos.length - 3 + index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Main capture button */}
                  {mode === 'photo' && (
                    <button
                      onClick={capturePhoto}
                      disabled={isCapturing || capturedPhotos.length >= maxPhotos}
                      className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center touch-target ${
                        isCapturing || capturedPhotos.length >= maxPhotos
                          ? 'bg-gray-400' 
                          : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                      } transition-all duration-150`}
                    >
                      {isCapturing ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </button>
                  )}

                  {/* Photo counter */}
                  {mode === 'photo' && (
                    <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm">
                      {capturedPhotos.length}/{maxPhotos}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <button
                onClick={startCamera}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium touch-target"
              >
                Start Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 underline text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Barcode result display */}
      {barcodeResult && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-green-800">Barcode Detected!</h3>
          </div>
          <p className="text-green-700 text-sm">
            <strong>Code:</strong> {barcodeResult.code}
          </p>
          <p className="text-green-700 text-sm">
            <strong>Format:</strong> {barcodeResult.format}
          </p>
          {barcodeResult.productInfo && (
            <p className="text-green-700 text-sm">
              <strong>Product:</strong> {barcodeResult.productInfo.title}
            </p>
          )}
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      <style jsx>{`
        .touch-target {
          min-width: 44px;
          min-height: 44px;
        }
      `}</style>
    </div>
  );
};

export default MobileCameraCapture;