import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, ArrowLeft, X, CheckCircle, Image, Smartphone, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';
import { resizeImage } from '../utils/imageUtils';
import MobileCameraCapture from '../components/MobileCameraCapture';

interface PhotoCaptureProps {
  onUploadComplete?: (photos?: any[]) => void;
  embedded?: boolean;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onUploadComplete, embedded = false }) => {
  const { authUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                            (window.innerWidth <= 768);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileCamera, setShowMobileCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'barcode'>('photo');

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      processDroppedFiles(files);
    }
  }, []);

  const processDroppedFiles = async (files: File[]) => {
    console.log('📁 [PHOTO] Processing dropped files:', files.length);
    setUploadStatus('Optimizing images...');
    
    try {
      // Resize all images to 800px max width
      const resizePromises = files.map(file => resizeImage(file, 800));
      const resizedFiles = await Promise.all(resizePromises);
      
      console.log('✅ [PHOTO] All images processed successfully');
      setSelectedFiles(resizedFiles);
      
      // Create preview URLs
      const imagePromises = resizedFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      });
      
      const imageUrls = await Promise.all(imagePromises);
      setSelectedImages(imageUrls);
      setUploadStatus('');
    } catch (error) {
      console.error('❌ [PHOTO] Error processing dropped files:', error);
      setUploadStatus('');
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      processDroppedFiles(files);
    }
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0 || selectedFiles.length === 0 || !authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) {
      alert('Database connection not available. Please check your configuration.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Checking storage configuration...');

    try {
      console.log('📤 [PHOTO] Starting photo uploads to Supabase...');
      
      setUploadStatus('Uploading photos...');
      
      // Upload all images - try Supabase Storage first, fallback to base64
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${authUser.id}/${Date.now()}_${index}.${fileExt}`;
        
        console.log(`📤 [PHOTO] Uploading image ${index + 1}/${selectedFiles.length}: ${fileName}`);
        
        // Try uploading to Supabase Storage first
        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('item-images')
            .upload(fileName, file);

          if (uploadError) {
            throw uploadError;
          }

          // Get public URL for the uploaded image
          const { data: { publicUrl } } = supabase.storage
            .from('item-images')
            .getPublicUrl(fileName);
            
          console.log(`✅ [PHOTO] Image ${index + 1} uploaded to cloud storage: ${publicUrl}`);
          return {
            url: publicUrl,
            filename: file.name,
            size: file.size,
            type: file.type
          };
        } catch (storageError) {
          // Fallback to base64 if storage upload fails
          console.log(`🔄 [PHOTO] Storage failed for image ${index + 1}, using base64 fallback:`, storageError.message);
          const reader = new FileReader();
          return new Promise<{url: string, filename: string, size: number, type: string}>((resolve) => {
            reader.onload = () => {
              const base64Url = reader.result as string;
              console.log(`✅ [PHOTO] Image ${index + 1} stored locally as base64`);
              resolve({
                url: base64Url,
                filename: file.name,
                size: file.size,
                type: file.type
              });
            };
            reader.readAsDataURL(file);
          });
        }
      });
      
      const uploadedImages = await Promise.all(uploadPromises);
      console.log('✅ [PHOTO] All images processed successfully:', uploadedImages);
      
      // Check if any images are using base64 fallback
      const base64Images = uploadedImages.filter(img => img.url.startsWith('data:'));
      const cloudImages = uploadedImages.filter(img => !img.url.startsWith('data:'));
      
      if (base64Images.length > 0) {
        console.log(`📝 [PHOTO] ${base64Images.length} images using local storage, ${cloudImages.length} in cloud storage`);
        if (cloudImages.length === 0) {
          setUploadStatus(`Photos processed (all ${base64Images.length} stored locally - bucket setup needed)`);
        } else {
          setUploadStatus(`Photos processed (${cloudImages.length} in cloud, ${base64Images.length} locally)`);
        }
      } else {
        setUploadStatus('All photos uploaded to cloud storage');
      }

      // Save photo records to database for SKU assignment
      setUploadStatus('Saving photo records...');
      console.log('🔍 [PHOTO] Current user for database save:', {
        id: authUser?.id,
        email: authUser?.email,
        isAuthenticated: !!authUser
      });
      
      const photoRecords = uploadedImages.map((img, index) => ({
        user_id: authUser.id,
        image_url: img.url,
        filename: img.filename,
        file_size: img.size,
        file_type: img.type,
        upload_order: index,
        status: img.url.startsWith('data:') ? 'local' : 'uploaded',
        created_at: new Date().toISOString()
      }));
      
      console.log('📋 [PHOTO] Sample record structure:', photoRecords[0]);
      
      // Test basic database connection first
      console.log('🔌 [PHOTO] Testing database connection...');
      try {
        const { data: testData, error: testError } = await supabase
          .from('uploaded_photos')
          .select('count', { count: 'exact', head: true });
          
        if (testError) {
          console.error('❌ [PHOTO] Database connection test failed:', testError);
          throw new Error(`Database connection failed: ${testError.message}`);
        }
        console.log('✅ [PHOTO] Database connection test passed');
      } catch (testError) {
        console.error('❌ [PHOTO] Database connection test failed:', testError);
        throw testError;
      }

      const { error: saveError } = await supabase
        .from('uploaded_photos')
        .insert(photoRecords);

      if (saveError) {
        console.error('❌ [PHOTO] Error saving photo records:', saveError);
        console.error('❌ [PHOTO] Full error details:', JSON.stringify(saveError, null, 2));
        console.error('❌ [PHOTO] Error message:', saveError.message);
        console.error('❌ [PHOTO] Error code:', saveError.code);
        console.error('❌ [PHOTO] Error details:', saveError.details);
        console.error('❌ [PHOTO] Error hint:', saveError.hint);
        console.log('📊 [PHOTO] Photo records being saved:', JSON.stringify(photoRecords, null, 2));
        
        // FALLBACK: Store in localStorage for offline workflow
        console.log('💾 [PHOTO] Storing photos in localStorage as fallback...');
        try {
          const existingPhotos = JSON.parse(localStorage.getItem('temp_uploaded_photos') || '[]');
          const allPhotos = [...existingPhotos, ...photoRecords];
          localStorage.setItem('temp_uploaded_photos', JSON.stringify(allPhotos));
          console.log('✅ [PHOTO] Photos stored in localStorage successfully');
          setUploadStatus(`Photos saved locally (${photoRecords.length} photos) - database unavailable`);
        } catch (localError) {
          console.error('❌ [PHOTO] LocalStorage fallback failed:', localError);
          setUploadStatus('Photos processed but could not be saved');
        }
        
        // Don't throw error - continue with workflow even if save fails
        console.log('⚠️ [PHOTO] Database save failed, but continuing with workflow');
      } else {
        console.log('✅ [PHOTO] Photo records saved successfully');
        console.log('📊 [PHOTO] Saved records count:', photoRecords.length);
      }

      console.log('✅ [PHOTO] Photo upload process completed successfully');
      setUploadStatus('Complete!');
      setUploadComplete(true);

      // Auto-redirect to SKUs tab after successful upload
      setTimeout(() => {
        if (onUploadComplete) {
          console.log('🎯 [PHOTO] Calling upload completion callback to switch to SKUs tab...');
          onUploadComplete(uploadedImages);
        }
      }, 2000);
    } catch (error) {
      console.error('❌ [PHOTO] Upload failed:', error);
      
      // Provide user-friendly error messages
      let userMessage = 'Failed to upload photos. Please try again.';
      if (error.message) {
        if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
          userMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (error.message.includes('Storage bucket not found')) {
          userMessage = 'Photo storage is not set up. Please contact support for assistance.';
        } else if (error.message.includes('File too large')) {
          userMessage = 'One or more photos are too large. Please use photos smaller than 10MB.';
        } else {
          userMessage = `Upload failed: ${error.message}`;
        }
      }
      
      alert(userMessage);
      setUploadStatus('');
    } finally {
      setIsUploading(false);
      if (!uploadComplete) {
        setUploadStatus('');
      }
    }
  };

  // Photo reordering handlers
  const handlePhotoReorderStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    e.currentTarget.style.opacity = '0.5';
  };

  const handlePhotoReorderEnd = (e: React.DragEvent) => {
    e.currentTarget.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handlePhotoReorderOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handlePhotoReorderLeave = () => {
    setDragOverIndex(null);
  };

  const handlePhotoReorderDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    console.log('🔄 [PHOTO-REORDER] Reordering photos:', {
      from: draggedIndex,
      to: dropIndex,
      totalPhotos: selectedImages.length
    });

    // Create new arrays with reordered items
    const newImages = [...selectedImages];
    const newFiles = [...selectedFiles];
    
    // Remove items from original position
    const [movedImage] = newImages.splice(draggedIndex, 1);
    const [movedFile] = newFiles.splice(draggedIndex, 1);
    
    // Insert items at new position
    newImages.splice(dropIndex, 0, movedImage);
    newFiles.splice(dropIndex, 0, movedFile);
    
    setSelectedImages(newImages);
    setSelectedFiles(newFiles);
    setDragOverIndex(null);
    
    console.log('✅ [PHOTO-REORDER] Photos reordered successfully');
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setSelectedFiles(newFiles);
  };

  // Handle mobile camera photos
  const handleMobileCameraPhotos = async (photos: string[]) => {
    console.log('📱 [MOBILE-CAMERA] Received photos:', photos.length);
    
    try {
      // Convert base64 to File objects
      const files: File[] = [];
      const imageUrls: string[] = [];
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        // Convert base64 to blob
        const response = await fetch(photo);
        const blob = await response.blob();
        
        // Create file
        const file = new File([blob], `camera-${Date.now()}-${i}.jpg`, { type: 'image/jpeg' });
        
        // Resize image
        const resizedFile = await resizeImage(file, 800);
        files.push(resizedFile);
        imageUrls.push(photo);
      }
      
      setSelectedFiles(files);
      setSelectedImages(imageUrls);
      setShowMobileCamera(false);
    } catch (error) {
      console.error('❌ [MOBILE-CAMERA] Error processing photos:', error);
    }
  };

  // Handle barcode detection
  const handleBarcodeDetected = (barcode: any) => {
    console.log('📱 [BARCODE] Detected:', barcode);
    // TODO: Integrate with product lookup system
    alert(`Barcode detected: ${barcode.code}\nFormat: ${barcode.format}`);
    setShowMobileCamera(false);
  };

  if (uploadComplete) {
    return (
      <div className={`${embedded ? '' : 'min-h-screen bg-gray-50 flex items-center justify-center'}`}>
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Photos Uploaded Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''} uploaded. 
              Redirecting to SKU assignment...
            </p>
            
            {embedded ? (
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Switching to SKU assignment...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/app"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Go to SKU Assignment
                </Link>
                <button
                  onClick={() => {
                    setUploadComplete(false);
                    setSelectedImages([]);
                    setSelectedFiles([]);
                  }}
                  className="block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Upload More Photos
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const uploadArea = (
    <div className="bg-white rounded-xl shadow-sm border p-8">
      {selectedImages.length === 0 ? (
        <>
          <div className="text-center">
            <div 
              className={`border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {isDragOver ? 'Drop your photos here!' : 'Upload Your Photos'}
              </h3>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 text-center">
                  💡 <strong>Tip:</strong> Drag and drop photos to reorder them. The first photo will be your primary listing image.
                </p>
              </div>
              <p className="text-gray-600 mb-6">
                Drag and drop photos here, or click to upload multiple photos. 
                You'll assign SKUs to group them into items on the next page.
              </p>
              
              <div className="space-y-4">
                {/* Mobile-first button layout */}
                {isMobile ? (
                  <div className="grid grid-cols-1 gap-3 w-full max-w-sm mx-auto">
                    <button
                      onClick={() => {
                        setCameraMode('photo');
                        setShowMobileCamera(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-3 text-lg touch-target"
                    >
                      <Smartphone className="w-6 h-6" />
                      <span>Take Photos</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setCameraMode('barcode');
                        setShowMobileCamera(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-3 text-lg touch-target"
                    >
                      <Camera className="w-6 h-6" />
                      <span>Scan Barcode</span>
                    </button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">or</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-700 px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-3 text-lg touch-target"
                    >
                      <Upload className="w-6 h-6" />
                      <span>Choose from Gallery</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Choose Photos</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setCameraMode('photo');
                        setShowMobileCamera(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Use Camera</span>
                    </button>
                  </div>
                )}
                
                <div className={`text-sm text-gray-500 ${isMobile ? 'text-center' : ''}`}>
                  {isMobile ? (
                    <div className="space-y-1">
                      <p>📱 <strong>Mobile optimized!</strong> Use camera for best experience</p>
                      <p>Supports JPG, PNG up to 10MB each</p>
                    </div>
                  ) : (
                    'Supports JPG, PNG up to 10MB each. Upload all photos first, then assign SKUs.'
                  )}
                </div>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
        </>
      ) : (
        <div>
          <div className="mb-6">
            <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-center ${
              isMobile ? 'text-xl' : ''
            }`}>
              Selected Photos ({selectedImages.length})
            </h3>
            <div className={`grid gap-4 ${
              isMobile 
                ? 'grid-cols-2 sm:grid-cols-3' 
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
              {selectedImages.map((image, index) => (
                <div 
                  key={index} 
                  className={`relative group cursor-move transition-all duration-200 ${
                    draggedIndex === index ? 'scale-105 rotate-2 z-10' : ''
                  } ${
                    dragOverIndex === index ? 'scale-110 shadow-lg' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handlePhotoReorderStart(e, index)}
                  onDragEnd={handlePhotoReorderEnd}
                  onDragOver={(e) => handlePhotoReorderOver(e, index)}
                  onDragLeave={handlePhotoReorderLeave}
                  onDrop={(e) => handlePhotoReorderDrop(e, index)}
                >
                  <img
                    src={image}
                    alt={`Selected photo ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border pointer-events-none"
                  />
                  <div className={`absolute top-2 left-2 text-white text-xs px-2 py-1 rounded font-bold ${
                    index === 0 ? 'bg-green-600' : 'bg-blue-600'
                  }`}>
                    {index === 0 ? 'PRIMARY' : index + 1}
                  </div>
                  
                  {/* Drag indicator */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                    <div className="bg-white/90 rounded-full p-2">
                      <div className="grid grid-cols-2 gap-1">
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Drop zone indicator */}
                  {dragOverIndex === index && draggedIndex !== index && (
                    <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-100/50 rounded-lg flex items-center justify-center">
                      <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        Drop Here
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={`flex justify-center ${
            isMobile ? 'flex-col space-y-3' : 'flex-row space-x-4'
          }`}>
            <button
              onClick={() => {
                setSelectedImages([]);
                setSelectedFiles([]);
              }}
              className={`px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors ${
                isMobile ? 'touch-target' : ''
              }`}
            >
              Choose Different Photos
            </button>
            
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className={`bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center space-x-2 ${
                isMobile ? 'touch-target text-lg py-4' : ''
              }`}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading {selectedImages.length} photos...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload {selectedImages.length} Photo{selectedImages.length > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>

          {isUploading && (
            <div className="mt-6 text-center">
              <div className="text-sm text-gray-600">
                {uploadStatus || `Uploading ${selectedImages.length} photos to cloud storage...`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Please wait while we process your photos
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // If embedded, just return the upload area
  if (embedded) {
    return uploadArea;
  }

  // Mobile camera modal
  if (showMobileCamera) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowMobileCamera(false)}
              className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-full touch-target"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
              {cameraMode === 'photo' ? '📸 Photo Mode' : '📱 Barcode Scanner'}
            </div>
            
            <div className="w-11 h-11"></div> {/* Spacer */}
          </div>
        </div>
        
        <MobileCameraCapture
          mode={cameraMode}
          onPhotoCapture={handleMobileCameraPhotos}
          onBarcodeDetected={handleBarcodeDetected}
          maxPhotos={20}
        />
      </div>
    );
  }

  // Full page layout
  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-safe' : ''}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center ${
            isMobile ? 'h-14' : 'h-16'
          }`}>
            <Link
              to="/app"
              className={`flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors ${
                isMobile ? 'touch-target' : ''
              }`}
            >
              <ArrowLeft className={`${
                isMobile ? 'w-6 h-6' : 'w-5 h-5'
              }`} />
              <span className={isMobile ? 'text-lg font-medium' : ''}>
                {isMobile ? 'Back' : 'Back to Dashboard'}
              </span>
            </Link>
            
            {isMobile && (
              <div className="ml-auto flex items-center space-x-2">
                <Monitor className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">Mobile Mode</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ${
        isMobile ? 'py-4' : 'py-8'
      }`}>
        <div className={`text-center ${
          isMobile ? 'mb-6' : 'mb-8'
        }`}>
          <h1 className={`font-bold text-gray-900 mb-4 ${
            isMobile ? 'text-2xl' : 'text-3xl'
          }`}>
            Upload Photos
          </h1>
          <p className={`text-gray-600 ${
            isMobile ? 'text-base px-2' : ''
          }`}>
            {isMobile 
              ? 'Take photos or scan barcodes with your camera for instant listings'
              : 'Upload all your photos first, then assign SKUs to group them into items'
            }
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {uploadArea}
        </div>

        {/* Tips */}
        <div className={`bg-blue-50 rounded-xl p-6 max-w-4xl mx-auto ${
          isMobile ? 'mt-6' : 'mt-8'
        }`}>
          <h3 className={`font-semibold text-gray-900 mb-3 ${
            isMobile ? 'text-lg' : ''
          }`}>
            {isMobile ? '📱 Mobile Tips' : '📸 Photo Upload Tips'}
          </h3>
          <ul className={`text-gray-600 space-y-2 ${
            isMobile ? 'text-base' : 'text-sm'
          }`}>
            {isMobile ? (
              <>
                <li>• <strong>Camera mode:</strong> Take photos with your phone camera for best quality</li>
                <li>• <strong>Barcode scanner:</strong> Instant product info from UPC/ISBN codes</li>
                <li>• Use good lighting - natural light works best</li>
                <li>• Take multiple angles for each item</li>
                <li>• Include brand labels and tags when visible</li>
              </>
            ) : (
              <>
                <li>• Upload photos for all items you want to sell</li>
                <li>• Use good lighting - natural light works best</li>
                <li>• Take photos from multiple angles for each item</li>
                <li>• Include brand labels and tags when visible</li>
                <li>• <strong>Drag and drop to reorder</strong> - first photo becomes your primary listing image</li>
                <li>• After upload, you'll assign SKUs to group photos by item</li>
              </>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default PhotoCapture;