import React from 'react';
import { Check } from 'lucide-react';

interface PhotoCardProps {
  photo: {
    id: string;
    image_url: string;
    filename: string;
    upload_order: number;
    status: string;
    assigned_sku?: string;
  };
  isSelected: boolean;
  onSelect: (photoId: string) => void;
  isDarkMode: boolean;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, isSelected, onSelect, isDarkMode }) => {
  return (
    <div
      onClick={() => onSelect(photo.id)}
      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 group ${
        isSelected 
          ? 'border-blue-500 ring-2 ring-blue-200 scale-105 shadow-lg' 
          : isDarkMode
          ? 'border-gray-600 hover:border-blue-400 hover:shadow-md'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      {/* Photo */}
      <div className="aspect-square bg-gray-100 dark:bg-gray-800">
        <img
          src={photo.image_url}
          alt={photo.filename}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
      
      {/* Upload Order Badge */}
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
        {photo.upload_order + 1}
      </div>
      
      {/* Selection Checkbox */}
      <div className="absolute top-2 right-2">
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          isSelected 
            ? 'bg-blue-500 border-blue-500' 
            : 'bg-white/80 border-gray-300 hover:border-blue-400'
        }`}>
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </div>
      </div>
      
      {/* SKU Badge (if assigned) */}
      {photo.assigned_sku && (
        <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
          {photo.assigned_sku}
        </div>
      )}
      
      {/* Photo Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="text-white">
          <div className="text-sm font-medium truncate">{photo.filename}</div>
          <div className="text-xs text-gray-300">No date</div>
        </div>
      </div>
      
      {/* Selection Overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500/20 pointer-events-none" />
      )}
    </div>
  );
};

export default PhotoCard;