import React from 'react';
import ListingRow from './ListingRow';

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

interface ListingsTableProps {
  items: GeneratedItem[];
  selectedItems: Set<string>;
  onSelectItem: (itemSku: string) => void;
  onSelectAll: () => void;
  onGenerateItem: (item: GeneratedItem) => void;
  onEditItem: (item: GeneratedItem) => void;
  onDeleteItem: (itemSku: string) => void;
  isGenerating: boolean;
}

const ListingsTable: React.FC<ListingsTableProps> = ({
  items,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onGenerateItem,
  onEditItem,
  onDeleteItem,
  isGenerating
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-700">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={selectedItems.size === items.length && items.length > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-1">Photo</div>
          <div className="col-span-1">SKU</div>
          <div className="col-span-3">Title</div>
          <div className="col-span-1">Price</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Item Specifics</div>
          <div className="col-span-1">Actions</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {items.map((item) => (
          <ListingRow
            key={item.sku}
            item={item}
            isSelected={selectedItems.has(item.sku)}
            onSelect={() => onSelectItem(item.sku)}
            onGenerate={() => onGenerateItem(item)}
            onEdit={() => onEditItem(item)}
            onDelete={() => onDeleteItem(item.sku)}
            isGenerating={isGenerating}
          />
        ))}
      </div>

      {/* Table Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {items.length} item{items.length !== 1 ? 's' : ''} • {selectedItems.size} selected
          </span>
          <span>
            {items.filter(i => i.status === 'complete').length} ready to post
          </span>
        </div>
      </div>
    </div>
  );
};

export default ListingsTable;