import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, Edit2, Search, X, UserPlus, Phone, Mail, MapPin } from 'lucide-react';
import api from '../lib/axios';
import { Customer, getFullName } from '../types';

export const Customers: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data as Customer[] || [];
    },
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setError(null);
    setEditingCustomer(null);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFirstName(customer.first_name);
    setLastName(customer.last_name);
    setEmail(customer.email || '');
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      setError('First name and Last name are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      address: address || null,
    };

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'An error occurred while saving the customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (confirm('Are you sure you want to delete this customer?')) {
        await api.delete(`/customers/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete customer.');
    },
  });

  const filteredCustomers = customers.filter(c => 
    getFull.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="p-8 max-w-6xl w-full mx-auto space-y-6" id="customers-panel">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-[#3E3E3A] pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDEC] flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Customer Registry
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#A1A09A] mt-1">
            Manage your store loyalty members and customer contacts
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-100 dark:shadow-none transition cursor-pointer"
          id="add-customer-btn"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Loyalty Customer</span>
        </button>
      </div>

      {/* Search Filter bar */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
          <Search className="w-5 h-5" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, or email..."
          className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#161615] border border-gray-200 dark:border-[#3E3E3A] rounded-lg text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm"
          id="search-customer-input"
        />
      </div>

      {/* Customer Registry List */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="customers-grid">
          {filteredCustomers.map((cust) => (
            <motion.div
              layout
              key={cust.id}
              className="bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-[#3E3E3A] flex items-center justify-center text-indigo-600 dark:text-[#EDEDEC] font-bold text-sm uppercase">
                    {cust.first_name[0]}{cust.last_name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-[#EDEDEC]">
                      {getFullName(cust)}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono">ID: {cust.id}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-600 dark:text-[#A1A09A] border-t border-gray-100 dark:border-[#3E3E3A] pt-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{cust.phone || 'No phone registered'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{cust.email || 'No email registered'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{cust.address || 'No address registered'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-50 dark:border-[#3E3E3A]">
                <button
                  onClick={() => handleOpenEdit(cust)}
                  className="p-2 hover:bg-gray-50 dark:hover:bg-[#1b1b18] text-gray-500 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteMutation.mutate(cust.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-[#161615] rounded-xl border border-gray-200 dark:border-[#3E3E3A] text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 stroke-1" />
          <p className="text-sm font-medium">No customers registered yet.</p>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#161615] rounded-xl max-w-md w-full border border-gray-200 dark:border-[#3E3E3A] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 dark:border-[#3E3E3A] flex justify-between items-center bg-gray-50 dark:bg-[#1b1b18]/30">
                <h3 className="text-base font-bold text-gray-900 dark:text-[#EDEDEC]">
                  {editingCustomer ? 'Edit Loyalty Customer' : 'Add New Loyalty Customer'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="customer@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="+1 555-0199"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Physical Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full px-3.5 py-2 border border-gray-200 dark:border-[#3E3E3A] rounded-lg bg-gray-50 dark:bg-[#1b1b18] text-sm text-gray-900 dark:text-[#EDEDEC] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="City, Country"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#3E3E3A] dark:hover:bg-gray-600 text-gray-800 dark:text-[#EDEDEC] font-semibold text-sm rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-indigo-100 dark:shadow-none transition disabled:opacity-50 cursor-pointer flex justify-center items-center"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Save Customer'
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
