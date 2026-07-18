import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Search, RefreshCw, X, Eye, CreditCard, Banknote, Printer, RotateCcw } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/auth';
import { getFullName, OrderReceipt } from '../types';

export const Orders: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<OrderReceipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [refundingOrderId, setRefundingOrderId] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const userRoles = user?.roles?.map((r) => r.name) || [];
  const isAdmin = userRoles.some(role => role.toLowerCase() === 'admin');

  // Fetch orders history
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await api.get('/orders');
      // Returns { success: true, data: [...] } or array directly. Let's handle both.
      return response.data?.data || response.data || [];
    },
  });

  const handleViewReceipt = async (orderId: number) => {
    try {
      const response = await api.get(`/orders/${orderId}/receipt`);
      setSelectedReceipt(response.data);
      setShowReceiptModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to retrieve receipt.');
    }
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingOrderId) return;

    setIsRefunding(true);
    setRefundError(null);

    try {
      await api.post(`/orders/${refundingOrderId}/refund`, {
        reason: refundReason || 'Customer request',
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setRefundingOrderId(null);
      setRefundReason('');
      setShowReceiptModal(false);
      alert('Order successfully refunded and inventory replenished!');
    } catch (err: any) {
      setRefundError(err.response?.data?.message || 'Refund processing failed.');
    } finally {
      setIsRefunding(false);
    }
  };

  const filteredOrders = orders.filter((o: any) => {
    const term = search.toLowerCase();
    const idMatch = String(o.id).includes(term);
    const receiptMatch = o.receipt_number?.toLowerCase().includes(term);
    const customerMatch = o.customer?.toLowerCase().includes(term);
    const cashierMatch = o.cashier?.toLowerCase().includes(term);
    return idMatch || receiptMatch || customerMatch || cashierMatch;
  });

  return (
    <div className="p-8 max-w-6xl w-full mx-auto space-y-6" id="orders-panel">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-[#3E3E3A] pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Order Transaction Logs
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#A1A09A] mt-1">
            Browse complete sales transactions, print thermal receipts, and audit cash refunds
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 border border-gray-200 dark:border-[#3E3E3A] hover:bg-gray-50 dark:hover:bg-[#1b1b18] rounded-lg text-gray-500 transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input filter */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
          <Search className="w-5 h-5" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ID, receipt #, cashier, or customer..."
          className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-lg text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm"
          id="search-order-input"
        />
      </div>

      {/* Main transactions list */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-left text-xs text-gray-500" id="orders-table">
            <thead className="bg-gray-50 dark:bg-[#1b1b18] text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-[#3E3E3A]">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Receipt Number</th>
                <th className="px-6 py-4">Cashier</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Payment</th>
                <th className="px-6 py-4 text-right">Discount</th>
                <th className="px-6 py-4 text-right">Total Sale</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#3E3E3A] text-gray-700 dark:text-gray-300">
              {filteredOrders.map((order: any) => {
                const total = parseFloat(order.total || 0);
                const discount = parseFloat(order.discount_amount || 0);
                const status = order.status || 'completed';

                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1b1b18]/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-[#EDEDEC]">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-gray-900 dark:text-[#EDEDEC]">
                      {order.receipt_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {order.cashier || 'System'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800 dark:text-[#EDEDEC]">
                      {order.customer && order.customer !== 'walk_in' ? order.customer : 'Walk-In'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        status === 'refunded'
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/20'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center text-gray-400">
                        {order.payments?.[0]?.payment_method === 'card' ? (
                          <CreditCard className="w-4 h-4 text-indigo-500" title="Card" />
                        ) : (
                          <Banknote className="w-4 h-4 text-emerald-500" title="Cash" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {discount > 0 ? `-{selectedReceipt.currency_symbol}${discount.toFixed(2)}` : '0.00'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-gray-900 dark:text-[#EDEDEC]">
                      ${total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleViewReceipt(order.id)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1b1b18] text-indigo-600 dark:text-indigo-400 rounded-lg transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 stroke-1" />
          <p className="text-sm font-medium">No sales transactions logged yet.</p>
        </div>
      )}

      {/* Beautiful Thermal Receipt Modal */}
      <AnimatePresence>
        {showReceiptModal && selectedReceipt && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-[#000000] rounded-none max-w-[340px] w-full p-6 shadow-2xl border border-gray-300 relative font-mono text-xs leading-relaxed"
            >
              {/* Close receipt button (absolute top right, doesn't print) */}
              <button 
                onClick={() => {
                  setShowReceiptModal(false);
                  setRefundingOrderId(null);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 print:hidden cursor-pointer"
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
                  <span className="font-bold">{selectedReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{new Date(selectedReceipt.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span className="uppercase">{selectedReceipt.cashier}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span className="uppercase">{selectedReceipt.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span>STATUS:</span>
                  <span className="font-bold uppercase text-indigo-600">
                    {selectedReceipt.status || 'COMPLETED'}
                  </span>
                </div>
              </div>

              {/* Items breakdown list */}
              <div className="py-4 border-b border-dashed border-gray-300 space-y-2">
                <div className="flex font-bold text-[10px] text-gray-500">
                  <span className="flex-1">ITEM DESCRIPTION</span>
                  <span className="w-12 text-center">QTY</span>
                  <span className="w-16 text-right">TOTAL</span>
                </div>
                {selectedReceipt.items.map((item, index) => (
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
                  <span>{selectedReceipt.currency_symbol}{selectedReceipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>DISCOUNT ({selectedReceipt.discount_percent}%):</span>
                  <span>-{selectedReceipt.currency_symbol}{selectedReceipt.discount_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TAX RATE:</span>
                  <span>{selectedReceipt.tax_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>TAX AMOUNT:</span>
                  <span>{selectedReceipt.currency_symbol}{selectedReceipt.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-black pt-2 border-t border-dashed border-gray-200">
                  <span>TOTAL:</span>
                  <span>{selectedReceipt.currency_symbol}{selectedReceipt.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payments log */}
              <div className="py-4 border-b border-dashed border-gray-300 space-y-1.5 text-[10px] text-gray-600">
                <div className="font-bold text-gray-500 mb-1">PAYMENTS LOGGED</div>
                {selectedReceipt.payments.map((p, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="uppercase font-semibold">{p.payment_method} RECEIVED:</span>
                    <span>{selectedReceipt.currency_symbol}{p.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                  <span>TOTAL PAID:</span>
                  <span>{selectedReceipt.currency_symbol}{selectedReceipt.amount_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                  <span>CHANGE GIVEN:</span>
                  <span>
                    {selectedReceipt.amount_paid > selectedReceipt.total 
                      ? `{selectedReceipt.currency_symbol}${(selectedReceipt.amount_paid - selectedReceipt.total).toFixed(2)}` 
                      : '{selectedReceipt.currency_symbol}0.00'}
                  </span>
                </div>
              </div>

              {/* Admin Refund Trigger Section */}
              {isAdmin && selectedReceipt.status !== 'refunded' && (
                <div className="mt-4 pt-4 border-t border-dashed border-gray-300 print:hidden">
                  {refundingOrderId === null ? (
                    <button
                      onClick={() => setRefundingOrderId(selectedReceipt.id || null)}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded font-bold text-[10px] uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Issue Void/Refund</span>
                    </button>
                  ) : (
                    <form onSubmit={handleRefund} className="space-y-2">
                      <label className="block text-[10px] font-bold text-red-600 uppercase">
                        Reason for Refund
                      </label>
                      <input
                        type="text"
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="Voiding / Stock returned"
                        className="block w-full px-2 py-1.5 border border-red-200 bg-red-50/25 rounded text-[10px] outline-none"
                        required
                      />
                      {refundError && (
                        <p className="text-[9px] text-red-500 font-semibold">{refundError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRefundingOrderId(null)}
                          className="flex-1 py-1.5 bg-gray-100 text-gray-800 rounded font-bold text-[9px] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isRefunding}
                          className="flex-1 py-1.5 bg-red-600 text-white rounded font-bold text-[9px] cursor-pointer flex justify-center items-center"
                        >
                          {isRefunding ? 'Processing...' : 'Confirm Void'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Footer messages */}
              <div className="text-center pt-4 space-y-2 text-[10px] text-gray-500">
                <p className="font-black uppercase tracking-wider">THANK YOU FOR YOUR PATRONAGE</p>
                
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
