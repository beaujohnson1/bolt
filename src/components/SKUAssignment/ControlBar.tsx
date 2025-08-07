import React from 'react';
import { RotateCcw, RotateCw, Trash2, CheckSquare, Square } from 'lucide-react';

interface ControlBarProps {
  skuValue: string;
  onSkuChange: (value: string) => void;
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onDelete: () => void;
  onAssignSKU: () => void;
  isAssigning: boolean;
  isDarkMode: boolean;
  validationError?: string;
  successMessage?: string;
  errorMessage?: string;
}

const ControlBar: React.FC<ControlBarProps> = ({
  skuValue,
  onSkuChange,
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onRotateLeft,
  onRotateRight,
  onDelete,
  onAssignSKU,
  isAssigning,
  isDarkMode,
  validationError,
  successMessage,
  errorMessage
}) => {
  const isValidSKU = skuValue.trim() && /\d$/.test(skuValue.trim());
  const hasSelection = selectedCount > 0;

  return (
    <div className="control-bar space-y-4">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* Main Control Bar */}
      <div className={`p-6 rounded-xl border ${
        isDarkMode 
          ? 'bg-gray-800/50 border-gray-700' 
          : 'bg-white border-gray-200'
      } shadow-lg`}>
        
        {/* Top Row - SKU Input and Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          {/* SKU Input Section */}
          <div className="flex-1 max-w-md">
            <div className="space-y-2">
              <input
                type="text"
                value={skuValue}
                onChange={(e) => onSkuChange(e.target.value)}
                placeholder="e.g. ABC-123"
                className={`w-full px-4 py-3 rounded-lg border-2 font-mono text-lg transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400 focus:border-blue-400' 
                    : 'bg-white text-gray-800 border-gray-300 placeholder-gray-500 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                disabled={isAssigning}
              />
              
              {/* Validation Messages */}
              <div className="space-y-1">
                {!isValidSKU && skuValue.trim() && (
                  <div className="text-red-500 text-sm font-medium">
                    Must end with digits
                  </div>
                )}
                
                {!skuValue.trim() && hasSelection && (
                  <div className="bg-blue-500 text-white text-sm px-3 py-1 rounded">
                    SKU is required
                  </div>
                )}
                
                {validationError && (
                  <div className="text-red-500 text-sm font-medium">
                    {validationError}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onSelectAll}
              disabled={isAssigning || totalCount === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:bg-gray-800 disabled:text-gray-500'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 disabled:bg-gray-50 disabled:text-gray-400'
              }`}
            >
              {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
            
            <button
              onClick={onRotateLeft}
              disabled={!hasSelection || isAssigning}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                hasSelection && !isAssigning
                  ? isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rotate Left</span>
            </button>
            
            <button
              onClick={onRotateRight}
              disabled={!hasSelection || isAssigning}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                hasSelection && !isAssigning
                  ? isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <RotateCw className="w-4 h-4" />
              <span>Rotate Right</span>
            </button>
            
            <button
              onClick={onDelete}
              disabled={!hasSelection || isAssigning}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                hasSelection && !isAssigning
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
        
        {/* Bottom Row - Status and Assign Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Status Indicator */}
          <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {selectedCount > 0 ? (
              <span className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>
                {selectedCount} photo{selectedCount !== 1 ? 's' : ''} selected
              </span>
            ) : (
              <span>0 photos selected</span>
            )}
          </div>
          
          {/* Assign SKU Button */}
          <button
            onClick={onAssignSKU}
            disabled={!hasSelection || !isValidSKU || isAssigning}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
              hasSelection && isValidSKU && !isAssigning
                ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:scale-105'
                : 'bg-gray-400 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isAssigning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Assigning SKU...</span>
              </>
            ) : (
              <>
                <span>Assign SKU to {selectedCount} Photo{selectedCount !== 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;