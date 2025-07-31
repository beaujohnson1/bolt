// Google Analytics utility functions
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Track page views
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'YOUR_GA_MEASUREMENT_ID', {
      page_path: url,
    });
  }
};

// Track custom events
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Track conversions (email signups)
export const trackConversion = (email: string, source: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    // Track as conversion event
    window.gtag('event', 'conversion', {
      send_to: 'YOUR_GA_MEASUREMENT_ID',
      event_category: 'engagement',
      event_label: source,
      value: 1
    });

    // Track as custom event for detailed analysis
    window.gtag('event', 'email_signup', {
      event_category: 'lead_generation',
      event_label: source,
      value: 1,
      custom_parameters: {
        signup_source: source,
        user_email: email // Note: Be careful with PII in analytics
      }
    });
  }
};

// Track section engagement (scroll tracking)
export const trackSectionView = (sectionName: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'section_view', {
      event_category: 'engagement',
      event_label: sectionName,
      value: 1
    });
  }
};

// Track button clicks
export const trackButtonClick = (buttonName: string, location: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'button_click', {
      event_category: 'engagement',
      event_label: `${buttonName} - ${location}`,
      value: 1
    });
  }
};