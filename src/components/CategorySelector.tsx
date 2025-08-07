import React, { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';

interface CategorySelectorProps {
  selectedPath: string;
  selectedId: string;
  onSelect: (path: string, id: string) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedPath,
  selectedId,
  onSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock eBay categories for now
  const categories = [
    { id: '11450', path: 'Clothing, Shoes & Accessories > Clothing', name: 'Clothing' },
    { id: '57988', path: 'Clothing, Shoes & Accessories > Clothing > Coats & Jackets', name: 'Coats & Jackets' },
    { id: '57990', path: 'Clothing, Shoes & Accessories > Clothing > Shirts', name: 'Shirts' },
    { id: '57989', path: 'Clothing, Shoes & Accessories > Clothing > Pants', name: 'Pants' },
    { id: '63861', path: 'Clothing, Shoes & Accessories > Clothing > Dresses', name: 'Dresses' },
    { id: '93427', path: 'Clothing, Shoes & Accessories > Shoes', name: 'Shoes' },
    { id: '169291', path: 'Clothing, Shoes & Accessories > Accessories', name: 'Accessories' }
  ];

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">eBay Category</h3>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search categories..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Current Selection */}
      {selectedPath && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-1">Current Category</h4>
          <p className="text-sm text-blue-800">{selectedPath}</p>
        </div>
      )}

      {/* Category List */}
      <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
        {filteredCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category.path, category.id)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
              selectedId === category.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{category.name}</div>
                <div className="text-xs text-gray-500 flex items-center">
                  {category.path.split(' > ').map((part, index, array) => (
                    <React.Fragment key={index}>
                      <span>{part}</span>
                      {index < array.length - 1 && <ChevronRight className="w-3 h-3 mx-1" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              {selectedId === category.id && (
                <div className="text-blue-600">✓</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {filteredCategories.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-500">
          <p>No categories found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;