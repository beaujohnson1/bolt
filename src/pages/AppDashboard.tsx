import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Camera, 
  Plus, 
  BarChart3, 
  Settings, 
  LogOut, 
  Crown,
  Package,
  DollarSign,
  TrendingUp,
  Eye,
  Printer,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  Zap
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Listing {
  id: string;
  title: string;
  price: number;
  status: 'active' | 'sold' | 'pending' | 'draft';
  platforms: string[];
  createdAt: string;
  soldAt?: string;
  views: number;
  watchers: number;
  messages: number;
  image: string;
  buyerInfo?: {
    name: string;
    address: string;
    email: string;
  };
}

interface Sale {
  id: string;
  listingId: string;
  title: string;
  salePrice: number;
  platform: string;
  soldAt: string;
  shippingStatus: 'pending' | 'label_printed' | 'shipped' | 'delivered';
  trackingNumber?: string;
  buyerInfo: {
    name: string;
    address: string;
    email: string;
  };
}

const AppDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'sales' | 'analytics'>('overview');
  const [listings, setListings] = useState<Listing[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock data - replace with real API calls
  useEffect(() => {
    // Mock listings data
    const mockListings: Listing[] = [
      {
        id: '1',
        title: 'Vintage Denim Jacket',
        price: 45,
        status: 'active',
        platforms: ['eBay', 'Facebook'],
        createdAt: '2025-01-27',
        views: 23,
        watchers: 3,
        messages: 1,
        image: 'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg'
      },
      {
        id: '2',
        title: 'Nike Running Shoes',
        price: 65,
        status: 'sold',
        platforms: ['eBay'],
        createdAt: '2025-01-25',
        soldAt: '2025-01-26',
        views: 45,
        watchers: 8,
        messages: 5,
        image: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg'
      }
    ];

    // Mock sales data
    const mockSales: Sale[] = [
      {
        id: '1',
        listingId: '2',
        title: 'Nike Running Shoes',
        salePrice: 65,
        platform: 'eBay',
        soldAt: '2025-01-26',
        shippingStatus: 'pending',
        buyerInfo: {
          name: 'John Smith',
          address: '123 Main St, Anytown, ST 12345',
          email: 'john@example.com'
        }
      }
    ];

    setListings(mockListings);
    setSales(mockSales);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handlePrintLabel = (saleId: string) => {
    // In real app, this would generate and print shipping label
    alert('Shipping label generation would be integrated with USPS/UPS/FedEx APIs');
    setSales(prev => prev.map(sale => 
      sale.id === saleId 
        ? { ...sale, shippingStatus: 'label_printed' as const }
        : sale
    ));
  };

  const handleNewListing = () => {
    console.log('New Listing button clicked');
    setShowPhotoCapture(true);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessImage = async () => {
    if (!selectedImage || !selectedFile || !user) return;

    setIsProcessing(true);

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a simple ID for the mock item (no database needed)
      const mockItemId = `listing_${Date.now()}`;
      
      // Create a new listing directly in the local state
      const newListing: Listing = {
        id: mockItemId,
        title: 'Vintage Denim Jacket', // AI would detect this
        price: 45,
        status: 'active',
        platforms: ['eBay'],
        createdAt: new Date().toLocaleDateString(),
        views: 0,
        watchers: 0,
        messages: 0,
        image: selectedImage
      };
      
      // Add the new listing to the dashboard
      setListings(prev => [newListing, ...prev]);
      
      // Reset the photo capture modal
      resetPhotoCapture();
      
      // Show success message
      alert('🎉 Item analyzed successfully! Your listing is now active on eBay.');
      
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPhotoCapture = () => {
    setShowPhotoCapture(false);
    setSelectedImage(null);
    setSelectedFile(null);
    setIsProcessing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'sold': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getShippingStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-red-600 bg-red-100';
      case 'label_printed': return 'text-yellow-600 bg-yellow-100';
      case 'shipped': return 'text-blue-600 bg-blue-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.salePrice, 0);
  const activeListing = listings.filter(l => l.status === 'active').length;
  const totalViews = listings.reduce((sum, listing) => sum + listing.views, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">EasyFlip</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {!user?.isPro && (
                <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 hover:from-purple-700 hover:to-blue-700 transition-colors">
                  <Crown className="w-4 h-4" />
                  <span>Upgrade to Pro</span>
                </button>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500">
                    {user?.listingsUsed}/{user?.listingsLimit} listings used
                  </div>
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'listings', label: 'My Listings', icon: Package },
              { id: 'sales', label: 'Sales & Shipping', icon: DollarSign },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.name}!
              </h2>
              <p className="text-gray-600">
                Here's what's happening with your listings today.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${totalRevenue}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Listings</p>
                    <p className="text-2xl font-bold text-gray-900">{activeListing}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Views</p>
                    <p className="text-2xl font-bold text-gray-900">{totalViews}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">12.5%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
              <button
                onClick={handleNewListing}
                className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl transition-colors group text-left w-full"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-500 p-3 rounded-lg group-hover:bg-blue-400 transition-colors">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">New Listing</h3>
                    <p className="text-blue-100">Snap a photo to get started</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('sales')}
                className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Manage Sales</h3>
                    <p className="text-gray-600">Print labels & track shipments</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">View Analytics</h3>
                    <p className="text-gray-600">Track your performance</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Photo Capture Modal */}
        {showPhotoCapture && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Listing</h2>
                <button
                  onClick={resetPhotoCapture}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {!selectedImage ? (
                <div className="text-center">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 hover:border-blue-400 transition-colors">
                    <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Add Your Photo
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Take a clear photo of your item or upload from your device
                    </p>
                    
                    <div className="space-y-4">
                      <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                      
                      <div className="text-sm text-gray-500">
                        Supports JPG, PNG up to 10MB
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <img
                      src={selectedImage}
                      alt="Selected item"
                      className="max-w-full h-64 object-contain mx-auto rounded-lg"
                    />
                  </div>

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Choose Different Photo
                    </button>
                    
                    <button
                      onClick={handleProcessImage}
                      disabled={isProcessing}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Analyze Item</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isProcessing && (
                    <div className="mt-6 text-center">
                      <div className="text-sm text-gray-600">
                        Our AI is analyzing your item...
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        This usually takes 2-3 seconds
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tips */}
              <div className="mt-8 bg-blue-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">📸 Photo Tips for Best Results</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Use good lighting - natural light works best</li>
                  <li>• Show the entire item in the frame</li>
                  <li>• Include any brand labels or tags if visible</li>
                  <li>• Take photos from multiple angles if needed</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Listings</h2>
              <Link
                to="/capture"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 no-underline"
              >
                <Plus className="w-4 h-4" />
                <span>New Listing</span>
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Platforms
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {listings.map((listing) => (
                      <tr key={listing.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={listing.image}
                              alt={listing.title}
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {listing.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                Listed {listing.createdAt}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${listing.price}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(listing.status)}`}>
                            {listing.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-1">
                            {listing.platforms.map((platform) => (
                              <span
                                key={platform}
                                className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
                              >
                                {platform}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {listing.views}
                            </div>
                            <div className="flex items-center">
                              <MessageSquare className="w-4 h-4 mr-1" />
                              {listing.messages}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">eBay Sales & Shipping</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 font-bold">eB</span>
                </div>
                <span>Powered by eBay Managed Shipping</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sale Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Buyer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shipping Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            Sold {sale.soldAt}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-green-600">
                            ${sale.salePrice}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {sale.platform}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{sale.buyerInfo.name}</div>
                          <div className="text-sm text-gray-500">{sale.buyerInfo.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getShippingStatusColor(sale.shippingStatus)}`}>
                            {sale.shippingStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {sale.shippingStatus === 'pending' && (
                            <button
                              onClick={() => handlePrintLabel(sale.id)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs flex items-center space-x-1"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print eBay Label</span>
                            </button>
                          )}
                          {sale.shippingStatus === 'label_printed' && (
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-900 text-xs">
                                Mark Shipped in eBay
                              </button>
                            </div>
                          )}
                          {sale.trackingNumber && (
                            <div className="text-xs text-gray-500 mt-1">
                              Tracking: {sale.trackingNumber}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {sales.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No eBay sales yet</h3>
                <p className="text-gray-600 mb-6">
                  Once you make your first eBay sale, you'll be able to print labels and track shipments here.
                </p>
                <Link
                  to="/capture"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Create Your First Listing</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Sale Price</span>
                    <span className="font-medium">${totalRevenue / Math.max(sales.length, 1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Time to Sale</span>
                    <span className="font-medium">2.3 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-medium">85%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">eBay</span>
                    <span className="font-medium">65% of sales</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Facebook</span>
                    <span className="font-medium">35% of sales</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue</span>
                    <span className="font-medium text-green-600">${totalRevenue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items Sold</span>
                    <span className="font-medium">{sales.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Listings</span>
                    <span className="font-medium">{activeListing}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {sales.map((sale) => (
                  <div key={sale.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {sale.title} sold for ${sale.salePrice}
                      </p>
                      <p className="text-xs text-gray-500">
                        {sale.soldAt} on {sale.platform}
                      </p>
                    </div>
                  </div>
                ))}
                
                {listings.filter(l => l.status === 'active').map((listing) => (
                  <div key={listing.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {listing.title} listed for ${listing.price}
                      </p>
                      <p className="text-xs text-gray-500">
                        {listing.createdAt} • {listing.views} views
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AppDashboard;