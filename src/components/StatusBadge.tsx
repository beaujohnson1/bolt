import React from 'react';
import { Clock, Loader, CheckCircle, AlertTriangle, Star } from 'lucide-react';

interface StatusBadgeProps {
  status: 'not_started' | 'analyzing' | 'ready' | 'needs_attention' | 'complete';
  error?: string;
  confidence?: number;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, error, confidence }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'not_started':
        return {
          icon: Clock,
          text: 'Not Started',
          className: 'bg-gray-100 text-gray-700 border-gray-200',
          iconColor: 'text-gray-500'
        };
      case 'analyzing':
        return {
          icon: Loader,
          text: 'Analyzing...',
          className: 'bg-blue-100 text-blue-700 border-blue-200',
          iconColor: 'text-blue-500',
          animate: true
        };
      case 'ready':
        return {
          icon: CheckCircle,
          text: 'Ready for Review',
          className: 'bg-green-100 text-green-700 border-green-200',
          iconColor: 'text-green-500'
        };
      case 'needs_attention':
        return {
          icon: AlertTriangle,
          text: 'Needs Attention',
          className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          iconColor: 'text-yellow-500'
        };
      case 'complete':
        return {
          icon: Star,
          text: 'Complete',
          className: 'bg-purple-100 text-purple-700 border-purple-200',
          iconColor: 'text-purple-500'
        };
      default:
        return {
          icon: Clock,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-700 border-gray-200',
          iconColor: 'text-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-1">
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${config.className}`}>
        <Icon className={`w-3 h-3 ${config.iconColor} ${config.animate ? 'animate-spin' : ''}`} />
        <span>{config.text}</span>
      </div>
      
      {/* Confidence Score */}
      {confidence && confidence > 0 && status !== 'not_started' && (
        <div className="text-xs text-gray-500">
          Confidence: {Math.round(confidence * 100)}%
        </div>
      )}
      
      {/* Error Message */}
      {error && status === 'needs_attention' && (
        <div className="text-xs text-red-600 max-w-32 truncate" title={error}>
          {error}
        </div>
      )}
    </div>
  );
};

export default StatusBadge;