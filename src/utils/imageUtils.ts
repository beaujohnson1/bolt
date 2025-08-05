// Helper function to convert file to base64 (for client-side use)
export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

// Helper function to fetch image from URL and convert to base64
export const fetchImageAsBase64 = async (imageUrl: string): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], 'image.jpg', { type: blob.type });
    return await convertToBase64(file);
  } catch (error) {
    console.error('Error fetching image as base64:', error);
    throw error;
  }
};