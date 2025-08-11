import React, { useState, useEffect } from 'react';
import { Sun, Moon, HelpCircle, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Debug log to confirm component is being rendered
  console.log('✅ [DASHBOARD-LAYOUT] DashboardLayout component rendered successfully');

  // Initialize theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'upload', label: 'Upload', icon: '📤' },
    { id: 'skus', label: 'SKUs', icon: '🏷️' },
    { id: 'generate', label: 'Generate Listings', icon: '✨' },
    { id: 'publish', label: 'Publish', icon: '🚀' },
    { id: 'coach', label: 'Coach', icon: '🤖' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowAccountMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-dashboard-dark text-white' : 'bg-dashboard-light text-gray-900'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${
        isDarkMode ? 'glass-panel' : 'glass-panel-light'
      } backdrop-blur-glass`}>
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyber-gradient rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-lg">
              🤖
            </div>
            <div className="text-cyber-gradient text-xl font-bold">
              EasyFlip.ai
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className={`flex gap-2 ${
            isDarkMode ? 'bg-white/5' : 'bg-black/5'
          } p-1.5 rounded-xl backdrop-blur-light`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-cyber-gradient text-white shadow-lg shadow-cyber-blue-500/30'
                    : isDarkMode
                    ? 'text-white/70 hover:bg-white/10 hover:text-white'
                    : 'text-gray-600 hover:bg-black/10 hover:text-gray-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
            
            {/* Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                  isDarkMode
                    ? 'text-white/70 hover:bg-white/10 hover:text-white'
                    : 'text-gray-600 hover:bg-black/10 hover:text-gray-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Account</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {/* Account Dropdown Menu */}
              {showAccountMenu && (
                <div className={`absolute right-0 mt-2 w-48 ${
                  isDarkMode ? 'glass-panel' : 'glass-panel-light'
                } backdrop-blur-glass rounded-xl shadow-xl z-50`}>
                  <div className="p-2">
                    <div className="px-3 py-2 text-sm border-b border-white/10">
                      <div className="font-medium">{user?.name}</div>
                      <div className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                        {user?.email}
                      </div>
                    </div>
                    <button
                      onClick={() => { 
                        console.log('TODO: Implement eBay connection flow'); 
                        alert('eBay connection coming soon!'); 
                        setShowAccountMenu(false); 
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'
                      }`}
                    >
                      Connect eBay Account
                    </button>
                    <button
                      onClick={() => {
                        navigate('/ai-insights');
                        setShowAccountMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'
                      }`}
                    >
                      🧠 AI Insights
                    </button>
                    <button
                      onClick={() => {/* TODO: Settings */}}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'
                      }`}
                    >
                      Settings
                    </button>
                    <button
                      onClick={handleSignOut}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-white/10 text-red-400' : 'hover:bg-black/10 text-red-600'
                      }`}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-cyber-gradient text-white shadow-lg shadow-cyber-blue-500/30' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            {/* Help Button */}
            <button className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              isDarkMode 
                ? 'bg-cyber-gradient text-white shadow-lg shadow-cyber-blue-500/30 hover:scale-110' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-110'
            }`}>
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <div className={`mx-5 mt-5 ${
        isDarkMode 
          ? 'bg-cyber-blue-500/10 border-cyber-blue-500/20' 
          : 'bg-blue-50 border-blue-200'
      } border rounded-2xl p-4 backdrop-blur-light`}>
        <div className="flex gap-6 items-center text-sm">
          <span className={`px-4 py-1.5 rounded-full font-semibold ${
            isDarkMode 
              ? 'bg-cyber-gradient text-white' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {user?.listings_used || 0} items processed
          </span>
          <span className={`px-4 py-1.5 rounded-full font-semibold ${
            isDarkMode 
              ? 'bg-cyber-gradient text-white' 
              : 'bg-green-100 text-green-700'
          }`}>
            {user?.total_sales || 0} sales completed
          </span>
          <span className={`px-4 py-1.5 rounded-full font-semibold ${
            isDarkMode 
              ? 'bg-cyber-gradient text-white' 
              : 'bg-purple-100 text-purple-700'
          }`}>
            ${user?.monthly_revenue || 0} revenue
          </span>
          <div className={`ml-auto font-semibold ${
            isDarkMode ? 'text-cyber-blue-500' : 'text-blue-600'
          }`}>
            {user?.subscription_plan === 'free' ? 'Free Plan' : 'Pro Plan'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-5">
        {children}
      </main>
      
      {/* Click outside to close account menu */}
      {showAccountMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowAccountMenu(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;