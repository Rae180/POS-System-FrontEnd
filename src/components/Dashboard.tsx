import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import api from '../lib/axios';
import {
  LogOut,
  Shield,
  Settings as SettingsIcon,
  TrendingUp,
  Users,
  Layers,
  ShoppingBag,
  FileText,
  Clock,
  Truck,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Package,
} from 'lucide-react';
import { Checkout } from './Checkout';
import { Customers } from './Customers';
import { Shifts } from './Shifts';
import { Orders } from './Orders';
import { Products } from './Products';
import { Suppliers } from './Suppliers';
import { Purchases } from './Purchases';
import { Settings } from './Settings';

const LOW_STOCK_THRESHOLD = 10;

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const isToday = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

export const Dashboard: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'checkout' | 'orders' | 'customers' | 'shifts' | 'products' | 'suppliers' | 'purchases' | 'settings'>('dashboard');

  const userRoles = user?.roles?.map((r) => r.name) || [];
  const isAdmin = userRoles.some(role => role.toLowerCase() === 'admin');

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

  // --- Dashboard data (only fetched while the dashboard tab is active) ---
  const { data: currentShift } = useQuery({
    queryKey: ['current-shift'],
    queryFn: async () => {
      try {
        const response = await api.get('/shift/current');
        return response.data?.shift || null;
      } catch {
        return null;
      }
    },
    enabled: activeTab === 'dashboard',
    retry: false,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await api.get('/orders');
      return response.data?.data || response.data || [];
    },
    enabled: activeTab === 'dashboard',
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-admin', ''],
    queryFn: async () => {
      const response = await api.get('/products', { params: { search: '' } });
      return response.data?.data?.data as any[] || [];
    },
    enabled: activeTab === 'dashboard' && isAdmin,
  });

  const todayOrders = orders.filter((o: any) => o.status !== 'refunded' && isToday(o.created_at));
  const todaySales = todayOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || o.amount || 0), 0);
  const todayOrderCount = todayOrders.length;

  const lowStockProducts = [...products]
    .filter((p: any) => p.quantity <= LOW_STOCK_THRESHOLD)
    .sort((a: any, b: any) => a.quantity - b.quantity)
    .slice(0, 6);

  const productTotals = new Map<string, number>();
  orders
    .filter((o: any) => o.status !== 'refunded')
    .forEach((o: any) => {
      (o.items || []).forEach((item: any) => {
        const name = item.product?.name || `Product #${item.product_id}`;
        productTotals.set(name, (productTotals.get(name) || 0) + Number(item.quantity || 0));
      });
    });
  const topProducts = Array.from(productTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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
          <div className={`p-8 w-full mx-auto space-y-8 ${isAdmin ? 'max-w-6xl' : 'max-w-4xl'}`}>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-[#EDEDEC]">
                {getGreeting()}, {user?.first_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-[#A1A09A] mt-1">
                {isAdmin ? "Here's how the store is doing today." : "Here's what's happening with your till."}
              </p>
            </div>

            {/* Shift status */}
            <div className="bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-xl p-6 flex items-center justify-between">
              {currentShift ? (
                <>
                  <div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm mb-2">
                      <CheckCircle className="w-4 h-4" />
                      Till is open
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-[#EDEDEC]">
                      ${Number(currentShift.expected_cash_so_far).toFixed(2)}
                      <span className="text-sm font-normal text-gray-400 ml-1.5">expected in drawer</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Opened {new Date(currentShift.opened_at).toLocaleTimeString()} · float ${Number(currentShift.opening_float).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('shifts')}
                    className="px-4 py-2 text-sm font-medium bg-gray-50 dark:bg-[#1b1b18] border border-gray-200 dark:border-[#3E3E3A] rounded-lg hover:bg-gray-100 dark:hover:bg-[#232320] transition cursor-pointer"
                  >
                    Manage Shift
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      Till is closed
                    </div>
                    <p className="text-sm text-gray-500 dark:text-[#A1A09A]">Open a shift before taking any sales.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('shifts')}
                    className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Open Till
                  </button>
                </>
              )}
            </div>

            {isAdmin ? (
              <>
                {/* Store-wide stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-xl p-6">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      <DollarSign className="w-4 h-4" /> Today's Sales
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-[#EDEDEC]">${todaySales.toFixed(2)}</p>
                  </div>
                  <div className="bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-xl p-6">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      <FileText className="w-4 h-4" /> Orders Today
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-[#EDEDEC]">{todayOrderCount}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Low stock */}
                  <div className="bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-2 mb-4">
                      <Package className="w-4 h-4 text-amber-500" /> Low Stock Alerts
                    </h3>
                    {lowStockProducts.length > 0 ? (
                      <div className="space-y-2">
                        {lowStockProducts.map((p: any) => (
                          <div key={p.id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700 dark:text-[#EDEDEC]">{p.name}</span>
                            <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{p.quantity} left</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Everything's well stocked.</p>
                    )}
                  </div>

                  {/* Top products */}
                  <div className="bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-indigo-500" /> Top Products
                    </h3>
                    {topProducts.length > 0 ? (
                      <div className="space-y-2">
                        {topProducts.map(([name, qty]) => (
                          <div key={name} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700 dark:text-[#EDEDEC]">{name}</span>
                            <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{qty} sold</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">
                        No item-level data on orders yet — your <code>/orders</code> endpoint may not be eager-loading <code>items.product</code>.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('checkout')}
                  className="p-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer flex items-center gap-3 text-left"
                >
                  <ShoppingBag className="w-6 h-6 shrink-0" />
                  <div>
                    <p className="font-semibold">Start Checkout</p>
                    <p className="text-xs opacity-80">Ring up a new sale</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="p-6 rounded-xl border border-gray-200 dark:border-[#3E3E3A] hover:bg-gray-50 dark:hover:bg-[#1b1b18] transition cursor-pointer flex items-center gap-3 text-left"
                >
                  <FileText className="w-6 h-6 shrink-0 text-gray-500" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-[#EDEDEC]">Order History</p>
                    <p className="text-xs text-gray-400">View past transactions</p>
                  </div>
                </button>
              </div>
            )}
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
      <aside className="w-64 bg-white dark:bg-[#161615] border-r border-gray-200 dark:border-[#3E3E3A] flex flex-col justify-between shrink-0" id="dashboard-sidebar">
        <div>
          <div className="h-20 px-6 border-b border-gray-200 dark:border-[#3E3E3A] flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-100 dark:shadow-none italic">
              P
            </div>
            <span className="text-lg font-sans font-semibold tracking-tight text-gray-900 dark:text-[#EDEDEC]">
              POS Terminal
            </span>
          </div>

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

        <div className="p-4 border-t border-gray-200 dark:border-[#3E3E3A] bg-gray-50 dark:bg-[#1b1b18]/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 dark:bg-[#3E3E3A] dark:text-[#EDEDEC] flex items-center justify-center font-semibold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-[#EDEDEC] truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-indigo-600 dark:text-[#A1A09A] truncate capitalize font-medium">
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

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-20 border-b border-gray-200 dark:border-[#3E3E3A] bg-white dark:bg-[#161615] px-8 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-sans font-medium tracking-tight text-gray-900 dark:text-[#EDEDEC] capitalize">
            {activeTab === 'dashboard' ? 'Dashboard' : `${activeTab.replace('_', ' ')} Console`}
          </h2>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-100 dark:border-emerald-900/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Session
            </div>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {renderActiveTabContent()}
        </div>
      </main>
    </div>
  );
};