import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Search, Plus, Trash2, Edit, X, RefreshCw, AlertCircle, ShoppingBag } from 'lucide-react';
import api from '../lib/axios';
import { Product } from '../types';

export const Products: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Beverages');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [status, setStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch products
  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['products-admin', search],
    queryFn: async () => {
      const response = await api.get('/products', { params: { search } });
      return response.data?.data?.data as Product[] || [];
    },
  });

  const categories = ['Beverages', 'Snacks', 'Dairy', 'Produce', 'Bakery'];
  const filterCategories = ['All', ...categories];

  const resetForm = () => {
    setName('');
    setBarcode('');
    setCategory('Beverages');
    setPrice('');
    setQuantity('');
    setStatus(true);
    setError(null);
    setEditingProduct(null);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setBarcode(p.barcode);
    setCategory(p.category || 'Beverages');
    setPrice(parseFloat(p.price as string).toString());
    setQuantity(p.quantity.toString());
    setStatus(p.status);
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !barcode || !price) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      name,
      barcode,
      category,
      price: parseFloat(price),
      quantity: parseInt(quantity) || 0,
      status,
    };

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowFormModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while saving the product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (confirm('Are you sure you want to delete this product?')) {
        await api.delete(`/products/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete product.');
    },
  });

  const filteredProducts = (productsData || []).filter(p => {
    if (selectedCategory === 'All') return true;
    return p.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="p-8 max-w-6xl w-full mx-auto space-y-6" id="products-panel">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-[#3E3E3A] pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Product Catalog Catalog
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#A1A09A] mt-1">
            Manage barcodes, classifications, pricing tiers, and active levels of retail stock
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowFormModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-100 dark:shadow-none transition cursor-pointer"
          id="add-product-btn"
        >
          <Plus className="w-4 h-4" />
          <span>Create Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or barcode..."
            className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-lg text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm"
            id="search-product-input"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
          {filterCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-[#161615] border-gray-200 dark:border-[#3E3E3A] text-gray-600 dark:text-[#A1A09A] hover:bg-gray-50 dark:hover:bg-[#1b1b18]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="products-admin-grid">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.quantity === 0;
            return (
              <motion.div
                layout
                key={p.id}
                className="bg-white dark:bg-[#161615] p-5 rounded-xl border border-gray-200 dark:border-[#3E3E3A] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
                      {p.category || 'Unclassified'}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${p.status ? 'bg-emerald-500' : 'bg-red-400'}`} title={p.status ? 'Active' : 'Deactivated'} />
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-[#EDEDEC] truncate mb-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-4">Barcode: {p.barcode}</p>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-[#1b1b18] p-3 rounded-lg border border-gray-100 dark:border-transparent">
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide">Sale Price</span>
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-400">${parseFloat(p.price as string).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide">Stock Level</span>
                      <span className={`text-base font-black ${isOutOfStock ? 'text-red-500' : 'text-gray-800 dark:text-[#EDEDEC]'}`}>{p.quantity} units</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-50 dark:border-[#3E3E3A]">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-[#1b1b18] text-gray-500 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMutation.mutate(p.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-xl text-gray-400">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 stroke-1" />
          <p className="text-sm font-medium">No products match your description.</p>
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#161615] rounded-xl max-w-md w-full border border-gray-200 dark:border-[#3E3E3A] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 dark:border-[#3E3E3A] flex justify-between items-center bg-gray-50 dark:bg-[#1b1b18]/30">
                <h3 className="text-base font-bold text-gray-900 dark:text-[#EDEDEC]">
                  {editingProduct ? 'Edit Product Parameters' : 'Create Store Product'}
                </h3>
                <button
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-400 font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-semibold"
                    placeholder="e.g. Diet Sprite Can 330ml"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Product Barcode *
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono font-semibold"
                    placeholder="e.g. 5449000000996"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="block w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-semibold"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Retail Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-semibold"
                      placeholder="1.99"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Quantity in Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-semibold"
                      placeholder="50"
                    />
                  </div>

                  <div className="pt-5 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={status}
                      onChange={(e) => setStatus(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      id="status-checkbox"
                    />
                    <label htmlFor="status-checkbox" className="text-xs font-bold text-gray-700 dark:text-[#EDEDEC] select-none cursor-pointer">
                      Active Catalog Sale
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFormModal(false);
                      resetForm();
                    }}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#3E3E3A] dark:hover:bg-gray-600 text-gray-800 dark:text-[#EDEDEC] font-semibold text-sm rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-indigo-100 dark:shadow-none transition disabled:opacity-50 cursor-pointer flex justify-center items-center"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Save Product'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
