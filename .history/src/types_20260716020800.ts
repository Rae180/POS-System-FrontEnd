export interface Role {
  id: number;
  name: string;
  guard_name: string;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  email_verified_at: string | null;
  roles?: Role[];
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  barcode: string;
  price: string | number; // Laravel returns decimals as strings sometimes
  purchase_price: string | number | null;
  quantity: number;
  status: boolean;
  image_url: string;
  category: string | null;
}

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar: string | null;
  avatar_url: string;
  full_name: string;
}

export const getFullName = (person: { first_name: string; last_name: string }): string =>
  `${person.first_name} ${person.last_name}`.trim();

export interface Supplier {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar: string | null;
  avatar_url: string;
  full_name: string;
}

export interface OrderItem {
  id: number;
  price: string | number;
  quantity: number;
  product_id: number;
  order_id: number;
  product?: Product;
}

export interface Payment {
  id: number;
  amount: string | number;
  payment_method: 'cash' | 'card';
  order_id: number;
  user_id: number;
  shift_id: number | null;
  created_at: string;
}

export interface Order {
  id: number;
  customer_id: number | null;
  user_id: number;
  status: 'completed' | 'refunded';
  refunded_at: string | null;
  refund_reason: string | null;
  discount_percent: string | number;
  tax_rate: string | number;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
  user?: User;
  items?: OrderItem[];
  payments?: Payment[];
}

export interface OrderReceiptItem {
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderReceiptPayment {
  amount: number;
  payment_method: 'cash' | 'card';
  paid_at: string;
}

export interface OrderReceipt {
  receipt_number: string;
  date: string;
  cashier: string;
  customer: string;
  items: OrderReceiptItem[];
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  payments: OrderReceiptPayment[];
  amount_paid: number;
  balance_due: number;
  is_fully_paid: boolean;
  currency_symbol: string;
  status: 'completed' | 'refunded';
  is_refunded: boolean;
  refunded_at: string | null;
}

export interface Shift {
  id: number;
  opened_by: number;
  closed_by: number | null;
  opening_float: string | number;
  closing_cash_counted: string | number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  opened_by_user?: User;
  closed_by_user?: User;
}

export interface CurrentShiftInfo {
  id: number;
  opened_by: string;
  opening_float: number;
  opened_at: string;
  total_payments_so_far: number;
  expected_cash_so_far: number;
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  quantity: number;
  purchase_price: string | number;
  subtotal: number;
  product?: Product;
}

export interface Purchase {
  id: number;
  supplier_id: number;
  user_id: number;
  purchase_date: string;
  total_amount: string | number;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  supplier?: Supplier;
  user?: User;
  items?: PurchaseItem[];
  items_count?: number;
}
