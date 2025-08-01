// Core data types for the EasyFlip application

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isPro: boolean;
  listingsUsed: number;
  listingsLimit: number;
  createdAt: string;
  subscription?: {
    plan: 'free' | 'pro' | 'commission';
    status: 'active' | 'canceled' | 'past_due';
    currentPeriodEnd?: string;
  };
}

export interface Item {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  condition: 'like_new' | 'good' | 'fair' | 'poor';
  brand?: string;
  size?: string;
  color?: string;
  suggestedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  images: string[];
  aiConfidence: number;
  aiAnalysis: {
    detectedCategory: string;
    detectedBrand?: string;
    detectedCondition: string;
    keyFeatures: string[];
    marketComparisons: MarketComparison[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  itemId: string;
  userId: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  platforms: Platform[];
  status: 'draft' | 'active' | 'sold' | 'ended' | 'pending';
  views: number;
  watchers: number;
  messages: number;
  createdAt: string;
  updatedAt: string;
  soldAt?: string;
  endedAt?: string;
  platformListings: PlatformListing[];
}

export interface PlatformListing {
  platform: Platform;
  externalId: string;
  url: string;
  status: 'active' | 'sold' | 'ended';
  views: number;
  watchers: number;
  messages: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  listingId: string;
  userId: string;
  itemTitle: string;
  salePrice: number;
  platform: Platform;
  buyerInfo: BuyerInfo;
  shippingInfo: ShippingInfo;
  paymentStatus: 'pending' | 'completed' | 'refunded';
  shippingStatus: 'pending' | 'label_created' | 'shipped' | 'delivered';
  trackingNumber?: string;
  soldAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  fees: {
    platformFee: number;
    paymentFee: number;
    shippingCost: number;
    appFee: number;
  };
  netProfit: number;
}

export interface BuyerInfo {
  name: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phone?: string;
}

export interface ShippingInfo {
  method: 'usps' | 'ups' | 'fedex' | 'local_pickup';
  service: string; // e.g., "Priority Mail", "Ground", etc.
  cost: number;
  estimatedDelivery: string;
  labelUrl?: string;
  trackingUrl?: string;
}

export interface MarketComparison {
  platform: Platform;
  averagePrice: number;
  recentSales: {
    price: number;
    soldDate: string;
    condition: string;
  }[];
  activeListings: number;
}

export interface Analytics {
  userId: string;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  metrics: {
    totalRevenue: number;
    totalSales: number;
    averageSalePrice: number;
    totalListings: number;
    conversionRate: number;
    averageTimeToSale: number; // in days
    totalViews: number;
    totalWatchers: number;
    platformBreakdown: {
      platform: Platform;
      sales: number;
      revenue: number;
      averagePrice: number;
    }[];
    categoryBreakdown: {
      category: string;
      sales: number;
      revenue: number;
      averagePrice: number;
    }[];
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: 'sale' | 'message' | 'view' | 'watcher' | 'system';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
  relatedId?: string; // listingId, saleId, etc.
}

export type Platform = 'ebay' | 'facebook' | 'poshmark' | 'offerup' | 'mercari';

export type ItemCategory = 
  | 'clothing'
  | 'shoes'
  | 'accessories'
  | 'electronics'
  | 'home_garden'
  | 'toys_games'
  | 'sports_outdoors'
  | 'books_media'
  | 'jewelry'
  | 'collectibles'
  | 'other';

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// AI Vision API Response Types
export interface VisionAnalysisResult {
  category: ItemCategory;
  confidence: number;
  detectedText: string[];
  colors: string[];
  objects: DetectedObject[];
  brand?: string;
  condition?: string;
  suggestedTitle: string;
  suggestedDescription: string;
  keyFeatures: string[];
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Platform API Integration Types
export interface PlatformConfig {
  platform: Platform;
  apiKey: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  sandboxMode: boolean;
}

export interface ListingTemplate {
  platform: Platform;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
  shippingOptions: ShippingOption[];
  returnPolicy?: string;
  paymentMethods: string[];
}

export interface ShippingOption {
  service: string;
  cost: number;
  estimatedDays: number;
}