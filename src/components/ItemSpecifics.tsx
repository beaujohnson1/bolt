import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { safeTrim, nullIfUnknown, toStr } from '../utils/strings';

interface ItemSpecificsProps {
  specifics: Record<string, string>;
  categoryId: string;
  onChange: (specifics: Record<string, string>) => void;
}

const ItemSpecifics: React.FC<ItemSpecificsProps> = ({
  specifics,
  categoryId,
  onChange
}) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Common item specifics based on category
  const getCommonSpecifics = (categoryId: string) => {
    const commonSpecifics: Record<string, string[]> = {
      '11450': ['Brand', 'Size', 'Color', 'Material', 'Condition', 'Style'], // General Clothing
      '57988': ['Brand', 'Size', 'Color', 'Material', 'Condition', 'Type', 'Season'], // Coats & Jackets
      '57990': ['Brand', 'Size', 'Color', 'Material', 'Condition', 'Sleeve Length', 'Neckline'], // Shirts
      '93427': ['Brand', 'Size', 'Color', 'Material', 'Condition', 'Shoe Width', 'Heel Height'] // Shoes
    };
    
    return commonSpecifics[categoryId] || commonSpecifics['11450'];
  };

  const commonFields = getCommonSpecifics(categoryId);

  const updateSpecific = (key: string, value: string) => {
    const updated = { ...specifics };
    const trimmedValue = safeTrim(toStr(value));
    if (trimmedValue) {
      updated[key] = trimmedValue;
    } else {
      delete updated[key];
    }
    onChange(updated);
  };

  const addCustomSpecific = () => {
    const trimmedKey = safeTrim(toStr(newKey));
    const trimmedValue = safeTrim(toStr(newValue));
    if (trimmedKey && trimmedValue) {
      updateSpecific(trimmedKey, trimmedValue);
      setNewKey('');
      setNewValue('');
    }
  };

  const removeSpecific = (key: string) => {
    const updated = { ...specifics };
    delete updated[key];
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Item Specifics</h3>
      
      {/* Common Fields */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Common Fields</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commonFields.map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {field}
              </label>
              <input
                type="text"
                value={specifics[field] || ''}
                onChange={(e) => updateSpecific(field, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder={`Enter ${field.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Custom Fields */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Custom Fields</h4>
        
        {/* Existing Custom Fields */}
        {Object.entries(specifics)
          .filter(([key]) => !commonFields.includes(key))
          .map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <input
                type="text"
                value={key}
                onChange={(e) => {
                  const updated = { ...specifics };
                  delete updated[key];
                  const newKey = safeTrim(toStr(e.target.value));
                  if (newKey) {
                    updated[newKey] = value;
                  }
                  onChange(updated);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Field name"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => updateSpecific(key, safeTrim(toStr(e.target.value)))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Value"
              />
              <button
                onClick={() => removeSpecific(key)}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

        {/* Add New Field */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="New field name"
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Value"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustomSpecific();
            }}
          />
          <button
            onClick={addCustomSpecific}
            disabled={!newKey.trim() || !newValue.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">SEO Keywords</h4>
        <textarea
          value={specifics.keywords || ''}
          onChange={(e) => updateSpecific('keywords', safeTrim(toStr(e.target.value)))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          rows={3}
          placeholder="Enter keywords separated by commas"
        />
        <div className="text-xs text-gray-500">
          Keywords help buyers find your listing. Separate with commas.
        </div>
      </div>
    </div>
  );
};

export default ItemSpecifics;