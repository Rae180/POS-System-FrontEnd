import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  User as UserIcon, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  CreditCard, 
  Banknote, 
  ChevronRight, 
  RefreshCw,
  Clock,
  ArrowLeft,
  X,
  Printer,
  ChevronDown
} from 'lucide-react';
import api from '../lib/axios';
import { Product, Customer, OrderReceipt } from '../types';

interface CheckoutProps {
  onBackToDashboard?: () => void;
}

export const Checkout: React.FC<CheckoutProps> = ({ onBackToDashboard }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [amountPaidInput, setAmountPaidPaidInput] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<OrderReceipt | null>(null);
  const [isProcessingCheckout, setIsSubmittingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Categories helper list
  const categories = ['All', 'Beverages', 'Snacks', 'Dairy', 'Produce', 'Bakery'];

  // 1. Fetch products catalog
  const { data: productsData, isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['products', searchTerm],
    queryFn: async () => {
      // In the database model, we can filter or search.
      // We pass the search term as a query parameter.
      const response = await api.get('/products', { params: { search: searchTerm } });
      return response.data?.data?.data as Product[] || [];
    },
  });

  // 2. Fetch customers list
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data as Customer[] || [];
    },
  });

  // 3. Fetch cart items
  const { data: cartItems = [], isLoading: isLoadingCart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await api.get('/cart');
      return response.data as any[] || [];
    },
  });

  // 4. Fetch current shift
  const { data: currentShiftData } = useQuery({
    queryKey: ['current-shift'],
    queryFn: async () => {
      try {
        const response = await api.get('/shift/current');
        return response.data?.shift;
      } catch (err) {
        return null;
      }
    },
    retry: false,
  });

  // Mutators for cart actions
  // Add to cart
  const addToCartMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const response = await api.post('/cart', { barcode });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to add item to cart.');
    }
  });

  // Change cart quantity (MUST use PATCH)
  const changeQtyMutation = useMutation({
    mutationFn: async ({ product_id, quantity }: { product_id: number; quantity: number }) => {
      const response = await api.patch('/cart/quantity', { product_id, quantity });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update quantity.');
    }
  });

  // Delete from cart
  const deleteItemMutation = useMutation({
    mutationFn: async (product_id: number) => {
      const response = await api.delete('/cart/item', { data: { product_id } });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Empty cart
  const emptyCartMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/cart');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Cart summary calculations
  const cartSubtotal = cartItems.reduce((acc, item) => {
    const price = parseFloat(item.price as string) || 0;
    const qty = item.pivot?.quantity || 1;
    return acc + (price * qty);
  }, 0);

  const discountAmount = Math.round(cartSubtotal * (discountPercent / 100) * 100) / 100;
  const taxableAmount = Math.max(0, cartSubtotal - discountAmount);
  
  // Tax rate from backend settings, or assume 0% if seeder value is default. Let's make it configurable or standard 10%
  const taxRate = 0; // Defaulting to 0% as per default settings seeder, but we can compute tax_amount as 0
  const taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
  const cartTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  // Set default paid input matching the cart total when cart total updates or payment method changes
  useEffect(() => {
    if (paymentMethod === 'card') {
      setAmountPaidPaidInput(cartTotal.toFixed(2));
    } else {
      setAmountPaidPaidInput('');
    }
  }, [cartTotal, paymentMethod]);

  // Handle direct barcode text search match
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;

    // Check if search term matches exactly a product barcode in our list
    const foundProduct = productsData?.find(p => p.barcode === searchTerm);
    if (foundProduct) {
      addToCartMutation.mutate(foundProduct.barcode);
      setSearchTerm('');
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    const numericAmountPaid = paymentMethod === 'card' 
      ? cartTotal 
      : parseFloat(amountPaidInput) || 0;

    if (paymentMethod === 'cash' && numericAmountPaid < cartTotal) {
      setCheckoutError(`Insufficient cash amount. Minimum payment required: $${cartTotal.toFixed(2)}`);
      return;
    }

    setIsSubmittingCheckout(true);
    setCheckoutError(null);

    try {
      const response = await api.post('/orders', {
        customer_id: selectedCustomer?.id || null,
        amount: numericAmountPaid,
        discount_percent: discountPercent,
        payment_method: paymentMethod,
      });

      if (response.data?.success && response.data?.order_id) {
        // Order succeeded, fetch official receipt breakdown from `/api/orders/{id}/receipt`
        const receiptResponse = await api.get(`/orders/${response.data.order_id}/receipt`);
        setLastReceipt(receiptResponse.data);
        setShowReceiptModal(true);
        
        // Reset local cart and fields
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['current-shift'] });
        setSelectedCustomer(null);
        setDiscountPercent(0);
        setAmountPaidPaidInput('');
      } else {
        setCheckoutError('Unexpected response from checkout server.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setCheckoutError(err.response?.data?.message || 'Failed to complete transaction.');
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  const changeDue = Math.max(0, (parseFloat(amountPaidInput) || 0) - cartTotal);

  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] dark:bg-[#0a0a0a] text-[#1A1A1A] dark:text-[#EDEDEC] overflow-hidden" id="checkout-root">
      {/* 1. Main POS Console */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-20 px-8 bg-white dark:bg-[#161615] border-b border-gray-200 dark:border-[#3E3E3A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1">
            {onBackToDashboard && (
              <button 
                onClick={onBackToDashboard}
                className="w-10 h-10 border border-gray-200 dark:border-[#3E3E3A] hover:bg-gray-50 dark:hover:bg-[#1b1b18] rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer"
                id="back-to-dashboard-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <form onSubmit={handleBarcodeSubmit} className="relative w-96">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                <Search className="w-5 h-5" />
              </span>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-11 pr-3 py-2.5 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 dark:text-[#EDEDEC]" 
                placeholder="Scan barcode or search products..."
                id="barcode-search-input"
              />
            </form>
          </div>
          
          <div className="flex items-center gap-6">
            {currentShiftData ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-100 dark:border-emerald-900/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Shift Open: ${currentShiftData.expected_cash_so_far.toFixed(2)} cash in drawer
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-100 dark:border-amber-900/30">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                No shift open
              </div>
            )}
          </div>
        </header>

        {/* Categories filters */}
        <div className="px-8 pt-6 pb-2 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none'
                    : 'bg-white dark:bg-[#161615] border-gray-200 dark:border-[#3E3E3A] text-gray-600 dark:text-[#A1A09A] hover:bg-gray-50 dark:hover:bg-[#1b1b18]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Catalog Grid */}
        <div className="flex-1 p-8 overflow-y-auto min-h-0">
          {isLoadingProducts ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : productsData && productsData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" id="products-catalog-grid">
              {productsData.map((product) => {
                const isOutOfStock = product.quantity === 0;
                return (
                  <motion.div
                    whileHover={{ y: isOutOfStock ? 0 : -4 }}
                    key={product.id}
                    onClick={() => {
                      if (!isOutOfStock) {
                        addToCartMutation.mutate(product.barcode);
                      }
                    }}
                    className={`bg-white dark:bg-[#161615] p-5 rounded-xl border border-gray-200 dark:border-[#3E3E3A] shadow-sm transition-all select-none relative ${
                      isOutOfStock 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:border-indigo-300 dark:hover:border-indigo-500 cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    {/* Placeholder or Image */}
                    <div className="w-full h-32 bg-gray-50 dark:bg-[#1b1b18] rounded-lg mb-4 flex items-center justify-center text-gray-300 dark:text-gray-600 overflow-hidden border border-gray-100 dark:border-transparent">
                      {product.image ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ShoppingBag className="w-10 h-10 stroke-1" />
                      )}
                    </div>

                    <div className="text-sm font-bold truncate text-gray-900 dark:text-[#EDEDEC] mb-1">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 font-mono">
                      Barcode: {product.barcode}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold text-base">
                        ${parseFloat(product.price as string).toFixed(2)}
                      </span>
                      <span className={`text-[10px] px-2.5 py-1 rounded font-semibold ${
                        isOutOfStock 
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
                          : product.quantity < 10 
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' 
                          : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                      }`}>
                        {isOutOfStock ? 'Out of Stock' : `${product.quantity} in stock`}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-12">
              <ShoppingBag className="w-16 h-16 stroke-1 mb-4" />
              <p className="text-lg font-medium">No products found matching your search.</p>
              <button 
                onClick={() => setSearchTerm('')} 
                className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 2. Cart Sidebar */}
      <aside className="w-[380px] bg-white dark:bg-[#161615] border-l border-gray-200 dark:border-[#3E3E3A] flex flex-col h-full shrink-0" id="cart-sidebar">
        <div className="p-6 flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-[#3E3E3A] pb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-[#EDEDEC]">Current Cart</h2>
              <span className="bg-indigo-50 text-indigo-600 dark:bg-[#3E3E3A] dark:text-[#EDEDEC] text-xs font-semibold px-2 py-0.5 rounded-full">
                {cartItems.reduce((sum, i) => sum + (i.pivot?.quantity || 1), 0)}
              </span>
            </div>
            {cartItems.length > 0 && (
              <button 
                onClick={() => emptyCartMutation.mutate()}
                className="text-xs text-gray-400 hover:text-red-500 transition font-medium cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
          
          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4">
            {isLoadingCart ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : cartItems.length > 0 ? (
              <div className="space-y-4">
                {cartItems.map((item) => {
                  const itemQuantity = item.pivot?.quantity || 1;
                  const itemPrice = parseFloat(item.price as string) || 0;
                  const itemSubtotal = itemPrice * itemQuantity;

                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      key={item.id} 
                      className="p-3 bg-gray-50 dark:bg-[#1b1b18] rounded-xl border border-gray-100 dark:border-[#3E3E3A] flex justify-between items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-[#EDEDEC] truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          ${itemPrice.toFixed(2)} each
                        </div>
                        
                        {/* Control Quantity (MUST use PATCH) */}
                        <div className="flex items-center gap-2.5 mt-3">
                          <button
                            onClick={() => {
                              if (itemQuantity > 1) {
                                changeQtyMutation.mutate({ product_id: item.id, quantity: itemQuantity - 1 });
                              } else {
                                deleteItemMutation.mutate(item.id);
                              }
                            }}
                            className="w-7 h-7 bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] hover:bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold text-gray-800 dark:text-[#EDEDEC] w-4 text-center">
                            {itemQuantity}
                          </span>
                          <button
                            onClick={() => {
                              changeQtyMutation.mutate({ product_id: item.id, quantity: itemQuantity + 1 });
                            }}
                            className="w-7 h-7 bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] hover:bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-2">
                        <div className="text-sm font-bold text-gray-900 dark:text-[#EDEDEC]">
                          ${itemSubtotal.toFixed(2)}
                        </div>
                        <button
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-12 text-center">
                <ShoppingBag className="w-12 h-12 stroke-1 mb-3 text-gray-300" />
                <p className="text-sm font-medium">Cart is empty.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px]">
                  Click on catalog products or scan barcodes to begin sale
                </p>
              </div>
            )}
          </div>

          {/* Totals & Customers Section */}
          <div className="mt-auto border-t border-gray-100 dark:border-[#3E3E3A] pt-4 space-y-4">
            {/* Customer Picker */}
            <div>
              <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                <span>Customer (Optional)</span>
                <button 
                  onClick={() => setShowCustomerModal(true)}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
                >
                  {selectedCustomer ? 'Change Customer' : 'Select Loyalty Customer'}
                </button>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-[#1b1b18] rounded-xl border border-gray-100 dark:border-[#3E3E3A]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-[#3E3E3A] flex items-center justify-center text-indigo-600 dark:text-[#EDEDEC]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-700 dark:text-[#EDEDEC] uppercase">
                      {selectedCustomer ? ge.full_name : 'Walk-in Customer'}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">
                      {selectedCustomer ? selectedCustomer.phone || 'No phone registered' : 'No loyalty account selected'}
                    </div>
                  </div>
                </div>
                {selectedCustomer && (
                  <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-gray-50 dark:bg-[#1b1b18] rounded-xl border border-gray-100 dark:border-[#3E3E3A] p-4 space-y-2.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 items-center">
                <span>Discount (%)</span>
                <div className="flex items-center gap-1 border-b border-gray-200 dark:border-[#3E3E3A]">
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={discountPercent || ''}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                      setDiscountPercent(val);
                    }}
                    className="w-12 text-right bg-transparent text-sm focus:outline-none text-gray-800 dark:text-[#EDEDEC] font-semibold" 
                    placeholder="0"
                  />
                  <span className="text-gray-400 text-xs font-bold">%</span>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax Rate</span>
                <span>{taxRate}%</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax Amount</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200/50 dark:border-[#3E3E3A]">
                <span>Total</span>
                <span className="text-indigo-600 dark:text-indigo-400">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Action Forms */}
            {cartItems.length > 0 && (
              <div className="space-y-4">
                {/* Method selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition cursor-pointer select-none ${
                      paymentMethod === 'cash'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-400 font-bold'
                        : 'border-gray-200 dark:border-[#3E3E3A] hover:bg-gray-50 dark:hover:bg-[#1b1b18] text-gray-500'
                    }`}
                  >
                    <Banknote className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Cash</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition cursor-pointer select-none ${
                      paymentMethod === 'card'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-400 font-bold'
                        : 'border-gray-200 dark:border-[#3E3E3A] hover:bg-gray-50 dark:hover:bg-[#1b1b18] text-gray-500'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Card</span>
                  </button>
                </div>

                {/* Cash Drawer input if Cash payment is chosen */}
                {paymentMethod === 'cash' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <label className="block text-xs font-semibold text-gray-500">
                      Amount Handed Cash
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 font-bold text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min={cartTotal}
                        value={amountPaidInput}
                        onChange={(e) => {
                          setAmountPaidPaidInput(e.target.value);
                          if (checkoutError) setCheckoutError(null);
                        }}
                        className="block w-full pl-8 pr-3 py-2.5 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] font-semibold"
                        placeholder={cartTotal.toFixed(2)}
                        required
                        id="amount-paid-input"
                      />
                    </div>
                    {parseFloat(amountPaidInput) >= cartTotal && (
                      <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                        <span>Change due back:</span>
                        <span>${changeDue.toFixed(2)}</span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Error Banner */}
                {checkoutError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
                    {checkoutError}
                  </div>
                )}

                {/* Primary Action Submit button */}
                <button 
                  onClick={handleCheckout}
                  disabled={isProcessingCheckout}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center"
                  id="process-payment-btn"
                >
                  {isProcessingCheckout ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    `Complete Checkout ($${cartTotal.toFixed(2)})`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 3. Loyalty Customers Selection Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" id="customers-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#161615] rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden border border-gray-200 dark:border-[#3E3E3A] shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 dark:border-[#3E3E3A] flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-[#EDEDEC]">
                  Select Loyalty Customer
                </h3>
                <button 
                  onClick={() => setShowCustomerModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-3">
                {customers.length > 0 ? (
                  customers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        setSelectedCustomer(cust);
                        setShowCustomerModal(false);
                      }}
                      className="p-3 bg-gray-50 hover:bg-indigo-50 dark:bg-[#1b1b18] dark:hover:bg-[#1b1b18]/80 rounded-xl border border-gray-100 dark:border-[#3E3E3A] hover:border-indigo-300 dark:hover:border-indigo-500 transition cursor-pointer flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-[#3E3E3A] flex items-center justify-center text-indigo-600 dark:text-[#EDEDEC] font-bold text-xs uppercase">
                          {cust.first_name[0]}{cust.last_name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800 dark:text-[#EDEDEC]">
                            {cust.full_name}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                            {cust.email || 'No email registered'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">
                    No customers registered. Build customer CRUD or add a new customer in the Registry.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Thermal 80mm Receipt Modal */}
      <AnimatePresence>
        {showReceiptModal && lastReceipt && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 overflow-y-auto" id="receipt-modal">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-[#000000] rounded-none max-w-[340px] w-full p-6 shadow-2xl border border-gray-300 relative font-mono text-xs leading-relaxed"
            >
              {/* Close receipt button (absolute top right, doesn't print) */}
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 print:hidden cursor-pointer"
                id="close-receipt-btn"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Receipt Content Header */}
              <div className="text-center space-y-1.5 pb-4 border-b border-dashed border-gray-300">
                <h4 className="text-sm font-black tracking-widest uppercase">POS SALES STORE</h4>
                <p className="text-[10px] text-gray-500">TERMINAL RECEIPT TRANSACTION</p>
                <p className="text-[10px] text-gray-500">123 Store Lane, Retail City</p>
              </div>

              {/* Metadata details */}
              <div className="py-4 border-b border-dashed border-gray-300 space-y-1 text-[10px] text-gray-600">
                <div className="flex justify-between">
                  <span>RECEIPT:</span>
                  <span className="font-bold">{lastReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{new Date(lastReceipt.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span className="uppercase">{lastReceipt.cashier}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span className="uppercase">{lastReceipt.customer}</span>
                </div>
              </div>

              {/* Items breakdown list */}
              <div className="py-4 border-b border-dashed border-gray-300 space-y-2">
                <div className="flex font-bold text-[10px] text-gray-500">
                  <span className="flex-1">ITEM DESCRIPTION</span>
                  <span className="w-12 text-center">QTY</span>
                  <span className="w-16 text-right">TOTAL</span>
                </div>
                {lastReceipt.items.map((item, index) => (
                  <div key={index} className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="font-bold uppercase truncate max-w-[170px]">{item.product_name}</span>
                      <span className="w-12 text-center">x{item.quantity}</span>
                      <span className="w-16 text-right">${(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="text-gray-400 text-[9px]">
                      Unit Price: ${item.unit_price.toFixed(2)} | Barcode: {item.barcode}
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial breakdowns */}
              <div className="py-4 border-b border-dashed border-gray-300 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>${lastReceipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>DISCOUNT ({lastReceipt.discount_percent}%):</span>
                  <span>-${lastReceipt.discount_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TAX RATE:</span>
                  <span>{lastReceipt.tax_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>TAX AMOUNT:</span>
                  <span>${lastReceipt.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-black pt-2 border-t border-dashed border-gray-200">
                  <span>TOTAL:</span>
                  <span>${lastReceipt.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payments log */}
              <div className="py-4 border-b border-dashed border-gray-300 space-y-1.5 text-[10px] text-gray-600">
                <div className="font-bold text-gray-500 mb-1">PAYMENTS LOGGED</div>
                {lastReceipt.payments.map((p, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="uppercase font-semibold">{p.payment_method} RECEIVED:</span>
                    <span>${p.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                  <span>TOTAL PAID:</span>
                  <span>${lastReceipt.amount_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                  <span>CHANGE GIVEN:</span>
                  <span>
                    {lastReceipt.amount_paid > lastReceipt.total 
                      ? `$${(lastReceipt.amount_paid - lastReceipt.total).toFixed(2)}` 
                      : '$0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[9px]">
                  <span>BALANCE DUE:</span>
                  <span>${lastReceipt.balance_due.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer messages */}
              <div className="text-center pt-4 space-y-2 text-[10px] text-gray-500">
                <p className="font-black uppercase tracking-wider">THANK YOU FOR YOUR PATRONAGE</p>
                <p className="text-[9px]">PLEASE RETAIN THIS RECEIPT FOR YOUR RECORDS</p>
                
                {/* Print button (hidden when printed) */}
                <button
                  onClick={() => window.print()}
                  className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-semibold text-xs transition inline-flex items-center gap-2 print:hidden w-full justify-center cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
