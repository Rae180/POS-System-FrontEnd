import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Plus, Minus, Trash2, Check, CreditCard, Banknote, 
  ChevronRight, RefreshCw, Clock, ArrowLeft, X, Printer, Search, 
  Layers, Truck, Clipboard, ClipboardList, PackagePlus, DollarSign
} from 'lucide-react';
import api from '../lib/axios';
import { Product } from '../types';

interface Supplier {
  id: number;
  name: string;
  contact_name: string | null;
}

export const Purchases: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Editable prices map for purchase-cart prices
  const [customPrices, setCustomPrices] = useState<Record<number, string>>({});

  // 1. Fetch products for catalog Selection
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-purchase', searchTerm],
    queryFn: async () => {
      const response = await api.get('/products', { params: { search: searchTerm } });
      return response.data?.data?.data as Product[] || [];
    },
  });

  // 2. Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data?.data || [];
    },
  });

  // 3. Fetch purchase cart
  const { data: pCartItems = [], isLoading: isLoadingPCart } = useQuery({
    queryKey: ['purchase-cart'],
    queryFn: async () => {
      const response = await api.get('/purchase-cart');
      return response.data as any[] || [];
    },
  });

  // 4. Fetch historical purchases
  const { data: historicalPurchases = [], isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const response = await api.get('/purchases');
      return response.data as any[] || [];
    },
  });

  // CART MUTATIONS
  // Add to purchase cart
  const addToPCart = useMutation({
    mutationFn: async (barcode: string) => {
      const response = await api.post('/purchase-cart', { barcode });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-cart'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to add item to wholesale cart.');
    }
  });

  // Change quantity (PATCH)
  const changeQtyPCart = useMutation({
    mutationFn: async ({ product_id, quantity }: { product_id: number; quantity: number }) => {
      const response = await api.patch('/purchase-cart/quantity', { product_id, quantity });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-cart'] });
    },
  });

  // Change unit price (PATCH)
  const changePricePCart = useMutation({
    mutationFn: async ({ product_id, purchase_price }: { product_id: number; purchase_price: number }) => {
      const response = await api.patch('/purchase-cart/price', { product_id, purchase_price });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-cart'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update cost price.');
    }
  });

  // Delete from purchase cart
  const deletePCartItem = useMutation({
    mutationFn: async (product_id: number) => {
      const response = await api.delete('/purchase-cart/item', { data: { product_id } });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-cart'] });
    },
  });

  // Empty purchase cart
  const emptyPCart = useMutation({
    mutationFn: async () => {
      await api.delete('/purchase-cart');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-cart'] });
    },
  });

  const cartTotal = pCartItems.reduce((sum, item) => {
    const cost = parseFloat(item.pivot?.purchase_price || item.price || 0);
    const qty = item.pivot?.quantity || 1;
    return sum + (cost * qty);
  }, 0);

  const handleCheckoutPurchase = async () => {
    if (pCartItems.length === 0) {
      setPurchaseError('Wholesale purchase cart is empty.');
      return;
    }
    if (!selectedSupplierId) {
      setPurchaseError('Please select a wholesale supplier.');
      return;
    }

    setIsSubmittingPurchase(true);
    setPurchaseError(null);

    try {
      await api.post('/purchases', {
        supplier_id: parseInt(selectedSupplierId),
        notes: purchaseNotes || null,
        status: 'completed'
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-cart'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      setSelectedSupplierId('');
      setPurchaseNotes('');
      alert('Wholesale stock replenishment complete! Inventory updated.');
      setActiveTab('history');
      refetchHistory();
    } catch (err: any) {
      setPurchaseError(err.response?.data?.message || 'Failed to file purchase record.');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl w-full mx-auto space-y-6" id="purchases-panel">
      {/* Tab Selectors & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-[#3E3E3A] pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Stock Procurement
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#A1A09A] mt-1">
            Reorder wholesale stock from suppliers to top up product quantities
          </p>
        </div>

        <div className="flex gap-2 bg-gray-100 dark:bg-[#1b1b18] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white dark:bg-[#3E3E3A] text-gray-900 dark:text-[#EDEDEC] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Purchase Order
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              refetchHistory();
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-[#3E3E3A] text-gray-900 dark:text-[#EDEDEC] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Procurement Logs
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Product Selector (Catalog) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Wholesale Stock replenishment catalog
            </h3>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Lookup product by name or scan barcode..."
                className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-lg text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            {isLoadingProducts ? (
              <div className="py-20 flex justify-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto pr-1">
                {products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addToPCart.mutate(p.barcode)}
                    className="p-4 bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] hover:border-indigo-300 dark:hover:border-indigo-500 rounded-xl shadow-sm hover:shadow transition cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-[#EDEDEC] truncate max-w-[150px]">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">Barcode: {p.barcode}</p>
                      <p className="text-[10px] font-bold text-indigo-600 mt-2">
                        Retail Price: ${parseFloat(p.price as string).toFixed(2)}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded">
                      In Stock: {p.quantity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center bg-white dark:bg-[#161615] rounded-xl border border-dashed border-gray-200 dark:border-[#3E3E3A] text-gray-400 text-xs">
                No matching catalog items for wholesale replenishment.
              </div>
            )}
          </div>

          {/* Right Column: Reorder Cart & checkout details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] p-6 flex flex-col h-full shadow-sm">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-[#3E3E3A] pb-3 mb-4">
                <h3 className="font-bold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-1.5">
                  <PackagePlus className="w-5 h-5 text-indigo-500" />
                  <span>Procurement Order</span>
                </h3>
                {pCartItems.length > 0 && (
                  <button
                    onClick={() => emptyPCart.mutate()}
                    className="text-xs text-gray-400 hover:text-red-500 font-bold cursor-pointer"
                  >
                    Reset Cart
                  </button>
                )}
              </div>

              {/* Purchase Cart Items list */}
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] mb-4 pr-1">
                {isLoadingPCart ? (
                  <div className="py-4 flex justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : pCartItems.length > 0 ? (
                  pCartItems.map((item) => {
                    const itemQty = item.pivot?.quantity || 1;
                    const rawPrice = item.pivot?.purchase_price || item.price || 0;
                    const itemPrice = parseFloat(rawPrice as string);

                    return (
                      <div 
                        key={item.id}
                        className="p-3 bg-gray-50 dark:bg-[#1b1b18] rounded-lg border border-gray-100 dark:border-[#3E3E3A] space-y-2.5"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-[#EDEDEC] truncate max-w-[180px]">
                            {item.name}
                          </span>
                          <button
                            onClick={() => deletePCartItem.mutate(item.id)}
                            className="text-gray-400 hover:text-red-500 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex justify-between items-center gap-4">
                          {/* Unit cost input (PATCH price) */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Cost ($):</span>
                            <div className="flex items-center border-b border-gray-300 dark:border-gray-700 w-16">
                              <span className="text-xs text-gray-400">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={customPrices[item.id] ?? itemPrice.toFixed(2)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCustomPrices(prev => ({ ...prev, [item.id]: val }));
                                }}
                                onBlur={() => {
                                  const val = parseFloat(customPrices[item.id]);
                                  if (!isNaN(val) && val >= 0) {
                                    changePricePCart.mutate({ product_id: item.id, purchase_price: val });
                                  }
                                }}
                                className="w-full text-center text-xs font-bold bg-transparent text-gray-800 dark:text-[#EDEDEC] outline-none"
                              />
                            </div>
                          </div>

                          {/* Quantity control (PATCH quantity) */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (itemQty > 1) {
                                  changeQtyPCart.mutate({ product_id: item.id, quantity: itemQty - 1 });
                                } else {
                                  deletePCartItem.mutate(item.id);
                                }
                              }}
                              className="w-5 h-5 bg-white border border-gray-200 dark:bg-[#161615] dark:border-[#3E3E3A] rounded flex items-center justify-center text-gray-400 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center text-gray-800 dark:text-[#EDEDEC]">
                              {itemQty}
                            </span>
                            <button
                              onClick={() => {
                                changeQtyPCart.mutate({ product_id: item.id, quantity: itemQty + 1 });
                              }}
                              className="w-5 h-5 bg-white border border-gray-200 dark:bg-[#161615] dark:border-[#3E3E3A] rounded flex items-center justify-center text-gray-400 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-400 py-6 text-xs font-semibold">
                     Procure items by clicking on products on the left catalog.
                  </p>
                )}
              </div>

              {/* Total Summary & Supplier selection Form */}
              <div className="space-y-4 border-t border-gray-100 dark:border-[#3E3E3A] pt-4 mt-auto">
                <div className="flex justify-between items-center text-sm font-bold text-gray-900 dark:text-[#EDEDEC]">
                  <span>Total Order Cost:</span>
                  <span className="text-base text-indigo-600 dark:text-indigo-400">${cartTotal.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Select Wholesale Supplier *
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-gray-50 dark:bg-[#1b1b18] border border-gray-200 dark:border-[#3E3E3A] rounded-lg text-xs font-bold text-gray-900 dark:text-[#EDEDEC] outline-none"
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.contact_name || 'Agent'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Procurement notes (Optional)
                  </label>
                  <textarea
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-xs text-gray-900 dark:text-[#EDEDEC] h-14 resize-none outline-none"
                    placeholder="e.g. Replenishing beverage cooler stock..."
                  />
                </div>

                {purchaseError && (
                  <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs">
                    {purchaseError}
                  </div>
                )}

                <button
                  onClick={handleCheckoutPurchase}
                  disabled={isSubmittingPurchase || pCartItems.length === 0}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-md shadow-indigo-100 dark:shadow-none transition uppercase tracking-wider cursor-pointer"
                >
                  {isSubmittingPurchase ? 'Filing Procurement Record...' : 'Complete Wholesale Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Historical wholesale procurement list */
        <div className="space-y-4">
          {isLoadingHistory ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : historicalPurchases.length > 0 ? (
            <div className="bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left text-xs text-gray-500">
                <thead className="bg-gray-50 dark:bg-[#1b1b18] text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-[#3E3E3A]">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Supplier</th>
                    <th className="px-6 py-4">Filer Cashier</th>
                    <th className="px-6 py-4">Procured Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Procurement Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#3E3E3A] text-gray-700 dark:text-gray-300">
                  {historicalPurchases.map((purchase: any) => {
                    const totalCost = parseFloat(purchase.total_amount || purchase.amount || 0);
                    return (
                      <tr key={purchase.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1b1b18]/40 transition">
                        <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-[#EDEDEC]">
                          {purchase.id}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-[#EDEDEC]">
                          {purchase.supplier?.name || 'Unknown Supplier'}
                        </td>
                        <td className="px-6 py-4">
                          {purchase.user ? `${purchase.user.first_name} ${purchase.user.last_name}` : 'System'}
                        </td>
                        <td className="px-6 py-4">{new Date(purchase.created_at || purchase.date).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20">
                            {purchase.status || 'completed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-gray-900 dark:text-[#EDEDEC]">
                          ${totalCost.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-xl text-gray-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 stroke-1" />
              <p className="text-sm font-medium">No wholesale procurements recorded yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
