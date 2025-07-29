import React, { useState } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

interface EmailCaptureProps {
  placeholder?: string;
  buttonText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const EmailCapture: React.FC<EmailCaptureProps> = ({
  placeholder = "Enter your email address",
  buttonText = "Get Early Access",
  className = "",
  size = 'md'
}) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');

    try {
      // Netlify Function Integration
      const response = await fetch('/.netlify/functions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source: 'landing_page',
          timestamp: new Date().toISOString(),
          page_url: window.location.href
        }),
      });

      if (response.ok) {
        setStatus('success');
        setMessage('Success! Check your email for next steps.');
        setEmail('');
        
        // Track conversion event
        if (typeof gtag !== 'undefined') {
          gtag('event', 'conversion', {
            send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL',
            value: 1.0,
            currency: 'USD'
          });
        }
        
        // Facebook Pixel tracking
        if (typeof fbq !== 'undefined') {
          fbq('track', 'Lead');
        }
      } else {
        throw new Error('Subscription failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  const sizeClasses = {
    sm: 'text-sm py-2 px-4',
    md: 'text-base py-3 px-6',
    lg: 'text-lg py-4 px-8'
  };

  const inputSizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4 text-base',
    lg: 'py-4 px-5 text-lg'
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <div className="flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${inputSizeClasses[size]}`}
            disabled={status === 'loading'}
            required
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className={`bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center justify-center space-x-2 ${sizeClasses[size]}`}
        >
          {status === 'loading' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Subscribing...</span>
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              <span>{buttonText}</span>
            </>
          )}
        </button>
      </form>
      
      {status === 'success' && (
        <div className="mt-3 flex items-center justify-center space-x-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">{message}</span>
        </div>
      )}
      
      {status === 'error' && (
        <div className="mt-3 flex items-center justify-center space-x-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{message}</span>
        </div>
      )}
      
      <p className="text-xs text-gray-500 text-center mt-2">
        No spam. Unsubscribe anytime. We'll notify you when EasyFlip launches.
      </p>
    </div>
  );
};

export default EmailCapture;
