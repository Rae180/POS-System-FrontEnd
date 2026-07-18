import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import api from '../lib/axios';
import { 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Database, 
  Settings as SettingsIcon, 
  TrendingUp, 
  Users, 
  Layers, 
  ShoppingBag, 
  FileText, 
  Clock, 
  Truck
} from 'lucide-react';
import { Checkout } from './Checkout';
import { Customers } from './Customers';
import { Shifts } from './Shifts';
import { Orders } from './Orders';
import { Products } from './Products';
import { Suppliers } from './Suppliers';
import { Purchases } from './Purchases';
import { Settings } from './Settings';

export const Dashboard: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'checkout' | 'orders' | 'customers' | 'shifts' | 'products' | 'suppliers' | 'purchases' | 'settings'>('dashboard');

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Server logout failed, clearing client session...', err);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const userRoles = user?.roles?.map((r) => r.name) || [];
  const isAdmin = userRoles.some(role => role.toLowerCase() === 'admin');

  // Full-screen dedicated checkout experience
  if (activeTab === 'checkout') {
    return <Checkout onBackToDashboard={() => setActiveTab('dashboard')} />;
  }

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'customers':
        return <Customers />;
      case 'shifts':
        return <Shifts />;
      case 'orders':
        return <Orders />;
      case 'products':
        if (!isAdmin) return <div className="p-8 text-red-500 font-bold">Access Denied.</div>;
        return <Products />;
      case 'suppliers':
        if (!isAdmin) return <div className="p-8 text-red-500 font-bold">Access Denied.</div>;
        return <Suppliers />;
      case 'purchases':
        if (!isAdmin) return <div className="p-8 text-red-500 font-bold">Access Denied.</div>;
        return <Purchases />;
      case 'settings':
        if (!isAdmin) return <div className="p-8 text-red-500 font-bold">Access Denied.</div>;
        return <Settings />;
      case 'dashboard':
      default:
        return (
          <div className="p-8 max-w-4xl space-y-8">
            {/* Welcome Alert */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/50 rounded-full flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-indigo-950 dark:text-indigo-400 mb-1">
                  Authentication Successful
                </h3>
                <p className="text-sm text-indigo-800/80 dark:text-indigo-500/80">
                  You have successfully authenticated via Laravel Sanctum Token Authentication. The client is now actively proxying routes and injecting authorization headers.
                </p>
              </div>
            </div>

            {/* User Profile Card */}
            <div className="bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-xl overflow-hidden shadow-sm hover:border-indigo-300 transition duration-200">
              <div className="p-6 border-b border-gray-200 dark:border-[#3E3E3A] flex items-center justify-between bg-gray-50 dark:bg-[#1b1b18]/30">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <h3 className="font-sans font-medium text-gray-900 dark:text-[#EDEDEC]">
                    User Profile Information (GET /api/me)
                  </h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 rounded-full capitalize">
                  {userRoles[0] || 'cashier'} role loaded
                </span>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <p className="text-sm font-medium text-gray-900 dark:text-[#EDEDEC]">
                    {user?.first_name} {user?.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <p className="text-sm font-medium text-gray-900 dark:text-[#EDEDEC]">
                    {user?.email}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Account Verified At
                  </label>
                  <p className="text-sm font-medium text-gray-900 dark:text-[#EDEDEC] font-mono">
                    {user?.email_verified_at ? new Date(user.email_verified_at).toLocaleString() : 'Not verified'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Assigned Spatie Roles
                  </label>
                  <div className="flex gap-1.5 mt-1">
                    {userRoles.map((role) => (
                      <span key={role} className="px-2 py-0.5 text-xs font-semibold bg-indigo-50/50 text-indigo-700 dark:bg-[#3E3E3A] dark:text-[#EDEDEC] rounded border border-indigo-100 dark:border-gray-600">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Session Diagnostics */}
            <div className="bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-xl overflow-hidden shadow-sm hover:border-indigo-300 transition duration-200">
              <div className="p-6 border-b border-gray-200 dark:border-[#3E3E3A] bg-gray-50 dark:bg-[#1b1b18]/30 flex items-center gap-3">
                <Database className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h3 className="font-sans font-medium text-gray-900 dark:text-[#EDEDEC]">
                  Active Client Session Diagnostics
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-[#A1A09A]">Axios Client Instance:</span>
                  <span className="font-mono text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2.5 py-0.5 rounded-full">
                    Configured (/api base)
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-[#A1A09A]">Sanctum Token Injected:</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-[#EDEDEC] truncate max-w-[250px] font-semibold">
                    {localStorage.getItem('pos_token') ? 'Yes (Present in LocalStorage)' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-[#A1A09A]">Response Interceptor 401:</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-[#EDEDEC] font-semibold">
                    Active & Listening
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  const linkClass = (tab: typeof activeTab) => {
    const base = "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer";
    const active = "bg-indigo-50 dark:bg-[#1b1b18] text-indigo-600 dark:text-[#EDEDEC]";
    const inactive = "text-gray-600 dark:text-[#A1A09A] hover:bg-gray-50 dark:hover:bg-[#1b1b18]";
    return `${base} ${activeTab === tab ? active : inactive}`;
  };

  return (
    <div className="min-h-screen h-screen bg-[#F8F9FA] dark:bg-[#0a0a0a] flex text-[#1A1A1A] dark:text-[#EDEDEC] overflow-hidden" id="dashboard-layout">
      {/* Navigation Sidebar */}
      <aside className="w-64 bg-white dark:bg-[#161615] border-r border-gray-200 dark:border-[#3E3E3A] flex flex-col justify-between shrink-0" id="dashboard-sidebar">
        <div>
          {/* Brand header */}
          <div className="h-20 px-6 border-b border-gray-200 dark:border-[#3E3E3A] flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-100 dark:shadow-none italic">
              P
            </div>
            <span className="text-lg font-sans font-semibold tracking-tight text-gray-900 dark:text-[#EDEDEC]">
              POS Terminal
            </span>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1">
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Core Operations
            </div>
            
            <button onClick={() => setActiveTab('dashboard')} className={linkClass('dashboard')} id="nav-dashboard">
              <TrendingUp className="w-5 h-5 text-current" />
              <span>Dashboard</span>
            </button>

            <button onClick={() => setActiveTab('checkout')} className={linkClass('checkout')} id="nav-checkout">
              <ShoppingBag className="w-5 h-5 text-current" />
              <span>POS Cashier</span>
            </button>

            <button onClick={() => setActiveTab('orders')} className={linkClass('orders')} id="nav-orders">
              <FileText className="w-5 h-5 text-current" />
              <span>Order History</span>
            </button>

            <button onClick={() => setActiveTab('customers')} className={linkClass('customers')} id="nav-customers">
              <Users className="w-5 h-5 text-current" />
              <span>Customer Registry</span>
            </button>

            <button onClick={() => setActiveTab('shifts')} className={linkClass('shifts')} id="nav-shifts">
              <Clock className="w-5 h-5 text-current" />
              <span>Cash Shift</span>
            </button>

            {/* Admin only section */}
            {isAdmin && (
              <div className="pt-4 space-y-1">
                <div className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Admin Controls
                </div>

                <button onClick={() => setActiveTab('products')} className={linkClass('products')} id="nav-products">
                  <Layers className="w-5 h-5 text-current" />
                  <span>Product Catalog</span>
                </button>

                <button onClick={() => setActiveTab('suppliers')} className={linkClass('suppliers')} id="nav-suppliers">
                  <Truck className="w-5 h-5 text-current" />
                  <span>Supplier Registry</span>
                </button>

                <button onClick={() => setActiveTab('purchases')} className={linkClass('purchases')} id="nav-purchases">
                  <ShoppingBag className="w-5 h-5 text-current" />
                  <span>Purchasing / Stock</span>
                </button>

                <button onClick={() => setActiveTab('settings')} className={linkClass('settings')} id="nav-settings">
                  <SettingsIcon className="w-5 h-5 text-current" />
                  <span>System Settings</span>
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* User profile section at the bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-[#3E3E3A] bg-gray-50 dark:bg-[#1b1b18]/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 dark:bg-[#3E3E3A] dark:text-[#EDEDEC] flex items-center justify-center font-semibold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-[#EDEDEC] truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-indigo-600 dark:text-[#A1A09A] truncate capitalize font-medium animate-pulse">
                {userRoles.join(', ') || 'Cashier'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
            id="logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-20 border-b border-gray-200 dark:border-[#3E3E3A] bg-white dark:bg-[#161615] px-8 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-sans font-medium tracking-tight text-gray-900 dark:text-[#EDEDEC] capitalize">
            {activeTab === 'dashboard' ? 'Register Terminal Diagnostics' : `${activeTab.replace('_', ' ')} Console`}
          </h2>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-100 dark:border-emerald-900/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Session
            </div>
            <span>System time: {new Date().toLocaleTimeString()}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {renderActiveTabContent()}
        </div>
      </main>
    </div>
  );
};
