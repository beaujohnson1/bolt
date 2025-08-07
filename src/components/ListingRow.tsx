import React, { useState } from 'react';
import { Edit, Trash2, Zap, Eye, ExternalLink } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface GeneratedItem {
  id: string;
  sku: string;
  photos: string[];
  primaryPhoto: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  brand?: string;
  size?: string;
  color?: string;
  model_number?: string;
  ai_suggested_keywords: string[];
  ai_confidence: number;
  ai_analysis: any;
  status: 'not_started' | 'analyzing' | 'ready' | 'needs_attention' | 'complete';
  generationError?: string;
  lastUpdated: Date;
}

interface ListingRowProps {
  item: GeneratedItem;
  isSelected: boolean;
  onSelect: () => void;
  onGenerate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isGenerating: boolean;
}

const ListingRow: React.FC<ListingRowProps> = ({
  item,
  isSelected,
  onSelect,
  onGenerate,
  onEdit,
  onDelete,
  isGenerating
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempTitle, setTempTitle] = useState(item.title);
  const [tempPrice, setTempPrice] = useState(item.price.toString());

  const handleTitleSave = () => {
    // TODO: Implement inline title save
    setEditingTitle(false);
    console.log('Saving title:', tempTitle);
  };

  const handlePriceSave = () => {
    // TODO: Implement inline price save
    setEditingPrice(false);
    console.log('Saving price:', tempPrice);
  };

  const formatItemSpecifics = (specifics: Record<string, string>) => {
    const entries = Object.entries(specifics).filter(([key, value]) => 
      value && value !== 'Unknown' && value !== 'Unknown Brand'
    );
    
    if (entries.length === 0) return 'No specifics available';
    
    return entries
      .slice(0, 3) // Show first 3 specifics
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ') + (entries.length > 3 ? '...' : '');
  };

  return (
    <div className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
    }`}>
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Checkbox */}
        <div className="col-span-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        {/* Photo */}
        <div className="col-span-1">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border">
            {item.primaryPhoto ? (
              <img
                src={item.primaryPhoto}
                alt={`SKU ${item.sku}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity"
                onClick={() => window.open(item.primaryPhoto, '_blank')}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Eye className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {/* SKU */}
        <div className="col-span-1">
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {item.sku}
          </span>
        </div>

        {/* Title */}
        <div className="col-span-3">
          {editingTitle ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') {
                    setTempTitle(item.title);
                    setEditingTitle(false);
                  }
                }}
                autoFocus
              />
            </div>
          ) : (
            <div
              onClick={() => item.title && setEditingTitle(true)}
              className={`text-sm ${
                item.title 
                  ? 'text-gray-900 cursor-pointer hover:text-blue-600' 
                  : 'text-gray-400 italic'
              }`}
            >
              {item.title || 'Click Generate to create title'}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="col-span-1">
          {editingPrice ? (
            <input
              type="number"
              step="0.01"
              value={tempPrice}
              onChange={(e) => setTempPrice(e.target.value)}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              onBlur={handlePriceSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePriceSave();
                if (e.key === 'Escape') {
                  setTempPrice(item.price.toString());
                  setEditingPrice(false);
                }
              }}
              autoFocus
            />
          ) : (
            <div
              onClick={() => item.price > 0 && setEditingPrice(true)}
              className={`text-sm font-medium ${
                item.price > 0 
                  ? 'text-green-600 cursor-pointer hover:text-green-700' 
                  : 'text-gray-400 italic'
              }`}
            >
              {item.price > 0 ? `$${item.price.toFixed(2)}` : 'No price'}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="col-span-2">
          <StatusBadge 
            status={item.status} 
            error={item.generationError}
            confidence={item.ai_confidence}
          />
        </div>

        {/* Item Specifics */}
        <div className="col-span-2">
          <div className="text-xs text-gray-600">
            {formatItemSpecifics({
              Brand: item.brand || 'Unknown',
              Size: item.size || 'Unknown',
              Condition: item.condition || 'Unknown',
              Color: item.color || 'Unknown',
              Category: item.category || 'Unknown'
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-1">
          <div className="flex items-center space-x-1">
            {item.status === 'not_started' || item.status === 'needs_attention' ? (
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                title="Generate listing"
              >
                <Zap className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onEdit}
                className="p-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                title="Edit listing"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={onDelete}
              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title="Delete item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingRow;