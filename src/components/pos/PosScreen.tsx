import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { Product, Category, Customer, CashierShift, SaleInvoice, SaleInvoiceItem, RoutedPrintTicket } from '../../types';
import { InvoiceReceiptModal } from './InvoiceReceiptModal';
import { HeldOrdersModal } from './HeldOrdersModal';
import { ShiftSummaryModal } from './ShiftSummaryModal';
import { TicketPreviewModal } from '../printers/TicketPreviewModal';
import { PrinterManagementModal } from '../printers/PrinterManagementModal';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  PlayCircle,
  CreditCard,
  Banknote,
  Receipt,
  User,
  Tag,
  Clock,
  Boxes,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  PlusCircle,
  X,
  Printer,
  Utensils,
  Coffee,
  FileText
} from 'lucide-react';

export const PosScreen: React.FC = () => {
  const { tenant, activeBranchId, apiFetch, user } = useAuth();
  const { t, isRtl } = useLanguage();
  const { showSuccess, showError, showWarning } = useNotification();

  const currency = tenant?.currency || 'SAR';

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<SaleInvoiceItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [heldOrdersCount, setHeldOrdersCount] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [tableNumber, setTableNumber] = useState<string>('طاولة 1');

  // Printer & Routing Modals
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [routedTickets, setRoutedTickets] = useState<RoutedPrintTicket[]>([]);
  const [showTicketPreview, setShowTicketPreview] = useState(false);
  const [isRoutingTickets, setIsRoutingTickets] = useState(false);

  // Modals
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<SaleInvoice | null>(null);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch initial POS data
  const loadPosData = async () => {
    if (!tenant?.id) return;
    try {
      const [prodData, catData, custData, shiftData, heldData] = await Promise.all([
        apiFetch(`/api/products?type=finished_good,recipe_based&branchId=${activeBranchId}`),
        apiFetch('/api/products/meta/categories'),
        apiFetch('/api/customers'),
        apiFetch(`/api/pos/shifts/active?branchId=${activeBranchId}`),
        apiFetch(`/api/pos/held-orders?branchId=${activeBranchId}`)
      ]);

      if (prodData.products) setProducts(prodData.products);
      if (catData.categories) setCategories(catData.categories);
      if (custData.customers) setCustomers(custData.customers);
      if (shiftData.shift) setActiveShift(shiftData.shift);
      else setActiveShift(null);
      if (heldData.heldOrders) setHeldOrdersCount(heldData.heldOrders.length);
    } catch (e) {
      console.error('POS load error:', e);
    }
  };

  useEffect(() => {
    if (tenant?.id && activeBranchId) {
      loadPosData();
    }
  }, [tenant?.id, activeBranchId, apiFetch]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleHoldOrder();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) handleQuickPay('cash');
      } else if (e.key === 'Escape') {
        setShowReceiptModal(false);
        setShowHeldModal(false);
        setShowShiftModal(false);
        setShowPaymentModal(false);
        setShowDiscountModal(false);
        setShowQuickCustomerModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer, discountValue]);

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const discountAmount =
    discountType === 'percent'
      ? (subtotal * discountValue) / 100
      : Math.min(subtotal, discountValue);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = tenant?.settings.enableTax ? 15 : 0;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  // Add Item to Cart
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(it => it.productId === product.id);

    if (existingIndex > -1) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + 1;
      const itemSub = newQty * updated[existingIndex].unitPrice;
      const itemTax = (itemSub * (taxRate / 100));

      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        subtotal: itemSub,
        taxAmount: itemTax,
        total: itemSub + itemTax
      };
      setCart(updated);
    } else {
      const itemSub = 1 * product.sellingPrice;
      const itemTax = (itemSub * (taxRate / 100));

      const newItem: SaleInvoiceItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productType: product.type,
        unitSymbol: product.unitSymbol || 'قطعة',
        quantity: 1,
        unitPrice: product.sellingPrice,
        originalPrice: product.sellingPrice,
        discountPercent: 0,
        subtotal: itemSub,
        discountAmount: 0,
        taxRate: taxRate,
        taxAmount: itemTax,
        total: itemSub + itemTax,
        hasRecipe: product.hasRecipe,
        recipe: product.recipe
      };
      setCart([...cart, newItem]);
    }
  };

  // Stepper
  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;

    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      const itemSub = newQty * updated[index].unitPrice;
      const itemTax = (itemSub * (taxRate / 100));
      updated[index] = {
        ...updated[index],
        quantity: newQty,
        subtotal: itemSub,
        taxAmount: itemTax,
        total: itemSub + itemTax
      };
    }
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Hold Order
  const handleHoldOrder = async () => {
    if (cart.length === 0) {
      showWarning('السلة فارغة، لا يوجد طلب لتعليقه');
      return;
    }
    try {
      const data = await apiFetch('/api/pos/hold-order', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name,
          items: cart,
          totalAmount: grandTotal,
          notes: orderNotes
        })
      });
      if (data.success) {
        showSuccess(data.message);
        setCart([]);
        setSelectedCustomer(null);
        setOrderNotes('');
        setHeldOrdersCount(prev => prev + 1);
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Resume Order
  const handleResumeHeldOrder = (order: any) => {
    setCart(order.items || []);
    if (order.customerId) {
      const found = customers.find(c => c.id === order.customerId);
      if (found) setSelectedCustomer(found);
    }
    setOrderNotes(order.notes || '');
    showSuccess(`تم استرجاع الطلب #${order.orderReference}`);
    setHeldOrdersCount(prev => Math.max(0, prev - 1));
  };

  // Complete Sale (Cash / Card / Credit)
  const handleQuickPay = async (paymentMethod: 'cash' | 'card' | 'credit_account') => {
    if (cart.length === 0) {
      showWarning('يرجى اختيار أصناف لإتمام الفاتورة');
      return;
    }

    if (paymentMethod === 'credit_account' && !selectedCustomer) {
      showError('يجب تحديد عميل لديه حساب آجل لإتمام البيع الآجل');
      return;
    }

    setIsProcessingSale(true);
    try {
      const payload = {
        branchId: activeBranchId,
        customerId: selectedCustomer?.id,
        items: cart,
        paymentMethod,
        discountAmount,
        paidAmount: paymentMethod === 'credit_account' ? 0 : grandTotal,
        notes: orderNotes,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        orderType
      };

      const data = await apiFetch('/api/pos/sale', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data.success && data.invoice) {
        setLastInvoice(data.invoice);
        setShowReceiptModal(true);
        showSuccess('تم إصدار الفاتورة وخصم المخزون بنجاح!');

        // Reset cart
        setCart([]);
        setSelectedCustomer(null);
        setDiscountValue(0);
        setOrderNotes('');
        setShowPaymentModal(false);

        // Refresh shift and stocks
        loadPosData();
      }
    } catch (err: any) {
      showError(err.message, 'فشل إتمام عملية البيع');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Routing: Send Cart to Kitchen & Barista
  const handleSendToKitchenAndBarista = async () => {
    if (cart.length === 0) {
      showWarning('السلة فارغة، أضف مأكولات أو مشروبات أولاً للإرسال');
      return;
    }
    setIsRoutingTickets(true);
    try {
      const res = await apiFetch('/api/printers/route-order', {
        method: 'POST',
        body: JSON.stringify({
          items: cart,
          orderNumber: `ORD-${Date.now().toString().slice(-4)}`,
          customerName: selectedCustomer?.name,
          tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
          orderType,
          notes: orderNotes
        })
      });
      if (res.success && res.tickets && res.tickets.length > 0) {
        setRoutedTickets(res.tickets);
        setShowTicketPreview(true);
        showSuccess(res.summary || 'تم فرز الأصناف وتوجيهها بنجاح للمطبخ والباريستا');
      } else {
        showWarning('لم يتم العثور على طابعات نشطة أو أصناف موجهة');
      }
    } catch (err: any) {
      showError(err.message || 'تعذر إرسال الطلب لمحطات التشغيل');
    } finally {
      setIsRoutingTickets(false);
    }
  };

  // Routing: Print Guest Check Bill
  const handlePrintGuestCheck = async () => {
    if (cart.length === 0) {
      showWarning('السلة فارغة، أضف أصنافاً أولاً لطباعة الشيك');
      return;
    }
    try {
      const res = await apiFetch('/api/printers/route-order', {
        method: 'POST',
        body: JSON.stringify({
          items: cart,
          orderNumber: `CHK-${Date.now().toString().slice(-4)}`,
          customerName: selectedCustomer?.name,
          tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
          orderType,
          notes: orderNotes,
          isGuestCheck: true
        })
      });
      if (res.success && res.tickets && res.tickets.length > 0) {
        const guestTicket = res.tickets.find((t: any) => t.ticketType === 'guest_check') || res.tickets[0];
        setRoutedTickets([guestTicket]);
        setShowTicketPreview(true);
      }
    } catch (err: any) {
      showError(err.message || 'فشل توليد شيك العميل');
    }
  };

  // Quick Add Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerPhone) return;
    try {
      const data = await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: newCustomerName,
          phone: newCustomerPhone
        })
      });
      if (data.success && data.customer) {
        setCustomers(prev => [...prev, data.customer]);
        setSelectedCustomer(data.customer);
        setShowQuickCustomerModal(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        showSuccess('تم إضافة العميل واختياره بنجاح');
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchCategory && matchSearch;
  });

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex flex-col bg-slate-100 overflow-hidden text-slate-900">
      {/* Top Action Bar */}
      <div className="h-14 border-b border-slate-200 bg-white/90 px-4 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Shift Indicator Button */}
          <button
            onClick={() => setShowShiftModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeShift
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {activeShift ? `الوردية #${activeShift.shiftNumber} (مفتوحة)` : 'الوردية مغلقة - اضغط للفتح'}
            </span>
          </button>

          {/* Held Orders Count */}
          <button
            onClick={() => setShowHeldModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
          >
            <PauseCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>المعلق ({heldOrdersCount})</span>
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو الباركود أو الصنف (F1)..."
            className="w-full ps-9 pe-4 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrinterSettings(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1.5 shadow-xs"
            title="إدارة وتوجيه الطابعات الحرارية"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span className="hidden md:inline text-xs font-bold">الطابعات</span>
          </button>

          <button
            onClick={loadPosData}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            title="تحديث البيانات"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content: Products Grid + Side Cart */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Middle: Categories & Product Cards Grid */}
        <div className="flex-1 flex flex-col min-w-0 border-e border-slate-200 bg-slate-50/70">
          {/* Categories Tab Bar */}
          <div className="p-3 border-b border-slate-200 bg-white flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              جميع الأصناف ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Items Touch Grid */}
          <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5 content-start">
            {filteredProducts.map(product => {
              const inCartItem = cart.find(c => c.productId === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`p-4 rounded-2xl border text-start flex flex-col justify-between h-40 transition-all relative group select-none active:scale-95 shadow-xs ${
                    inCartItem
                      ? 'bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                      : 'bg-white border-slate-200/90 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  {/* Badge */}
                  <div className="flex items-center justify-between w-full">
                    {product.hasRecipe ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>وصفة BOM</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 font-mono">
                        {product.sku}
                      </span>
                    )}

                    {inCartItem && (
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {inCartItem.quantity}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug">
                    {product.name}
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="font-mono font-bold text-sm text-blue-600">
                      {product.sellingPrice.toFixed(2)}{' '}
                      <span className="text-[10px] font-sans font-normal text-slate-500">{currency}</span>
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Cart & Checkout Panel */}
        <div className="w-80 md:w-96 flex flex-col bg-white shrink-0 border-s border-slate-200 shadow-sm">
          {/* Cart Header & Customer selector */}
          <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs text-slate-900">
                  سلة الطلب ({cart.reduce((s, i) => s + i.quantity, 0)} قطعة)
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[11px] text-rose-600 hover:underline font-bold"
                >
                  مسح السلة
                </button>
              )}
            </div>

            {/* Customer Dropdown */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={e => {
                    const cust = customers.find(c => c.id === e.target.value);
                    setSelectedCustomer(cust || null);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">عميل نقدي افتراضي (Walk-in Customer)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.currentBalance > 0 ? `(آجل: ${c.currentBalance} ${currency})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowQuickCustomerModal(true)}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 shadow-xs"
                title="إضافة عميل جديد"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Order Type & Table Selection */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={orderType}
                onChange={e => setOrderType(e.target.value as any)}
                className="flex-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="dine_in">🍽️ محلي (صالة - طاولة)</option>
                <option value="takeaway">🥡 سفري (Takeaway)</option>
                <option value="delivery">🛵 توصيل (Delivery)</option>
              </select>

              {orderType === 'dine_in' && (
                <input
                  type="text"
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  placeholder="رقم الطاولة"
                  className="w-24 px-2 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-blue-500"
                  title="رقم الطاولة"
                />
              )}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-white">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2 p-6 text-center">
                <ShoppingCart className="w-10 h-10 text-slate-200" />
                <p>السلة فارغة، اضغط على الأصناف لإضافتها</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div
                  key={item.id || index}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-slate-900 truncate">{item.productName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {item.unitPrice.toFixed(2)} {currency} × {item.quantity} ={' '}
                      <span className="text-blue-600 font-bold">{(item.unitPrice * item.quantity).toFixed(2)} {currency}</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-slate-900 font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 ps-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Payment Actions */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2.5">
            {/* Discount & Order Notes */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                onClick={() => setShowDiscountModal(true)}
                className="flex items-center gap-1 text-blue-600 font-bold hover:underline"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>
                  {discountValue > 0
                    ? `خصم: ${discountType === 'percent' ? `${discountValue}%` : `${discountValue} ${currency}`}`
                    : 'إضافة خصم (F3)'}
                </span>
              </button>

              <input
                type="text"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                placeholder="ملاحظات الطلب..."
                className="w-36 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-bold text-slate-900">{subtotal.toFixed(2)} {currency}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>الخصم المطبق:</span>
                  <span className="font-mono">-{discountAmount.toFixed(2)} {currency}</span>
                </div>
              )}
              {tenant?.settings.enableTax && (
                <div className="flex justify-between">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono font-bold text-slate-900">{taxAmount.toFixed(2)} {currency}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>الإجمالي النهائي:</span>
                <span className="font-mono text-blue-600 text-lg font-bold">{grandTotal.toFixed(2)} {currency}</span>
              </div>
            </div>

            {/* Multi-Station Routing & Guest Check Dispatch */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleSendToKitchenAndBarista}
                disabled={cart.length === 0 || isRoutingTickets}
                className="py-2 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-40 transition-all active:scale-[0.98]"
                title="فرز المأكولات للمطبخ والمشروبات للباريستا وطباعتها حرارياً"
              >
                <Utensils className="w-3.5 h-3.5" />
                <Coffee className="w-3.5 h-3.5" />
                <span>إرسال للمطبخ/الباريستا</span>
              </button>

              <button
                type="button"
                onClick={handlePrintGuestCheck}
                disabled={cart.length === 0}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-40 transition-all active:scale-[0.98]"
                title="طباعة شيك العميل الأولي على طابعة الكاشير"
              >
                <FileText className="w-3.5 h-3.5 text-slate-300" />
                <span>شيك العميل (Check)</span>
              </button>
            </div>

            {/* Fast Payment Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleQuickPay('cash')}
                disabled={cart.length === 0 || isProcessingSale}
                className="py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                <Banknote className="w-4 h-4" />
                <span>نقدي فوري (F4)</span>
              </button>

              <button
                onClick={() => handleQuickPay('card')}
                disabled={cart.length === 0 || isProcessingSale}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/15 disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                <CreditCard className="w-4 h-4" />
                <span>شبكة / مدى</span>
              </button>
            </div>

            {/* Secondary actions: Hold & Credit Account */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleHoldOrder}
                disabled={cart.length === 0}
                className="py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-40 shadow-xs"
              >
                <PauseCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>تعليق الطلب (F2)</span>
              </button>

              <button
                onClick={() => handleQuickPay('credit_account')}
                disabled={cart.length === 0 || !selectedCustomer || isProcessingSale}
                className="py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-blue-600 text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-40 shadow-xs"
                title="تسجيل المبلغ على حساب العميل الآجل"
              >
                <User className="w-3.5 h-3.5" />
                <span>بيع آجل للعميل</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs p-6 space-y-4 shadow-2xl">
            <h4 className="font-bold text-base text-slate-900">تطبيق خصم على الفاتورة</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  discountType === 'fixed' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                مبلغ ثابت (SAR)
              </button>
              <button
                onClick={() => setDiscountType('percent')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  discountType === 'percent' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                نسبة مئوية (%)
              </button>
            </div>

            <input
              type="number"
              step="0.1"
              value={discountValue || ''}
              onChange={e => setDiscountValue(Number(e.target.value))}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-base focus:outline-none focus:border-blue-500 focus:bg-white"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setDiscountValue(0);
                  setShowDiscountModal(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600"
              >
                إلغاء الخصم
              </button>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-500/25"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-base text-slate-900">إضافة عميل سريع</h4>
              <button onClick={() => setShowQuickCustomerModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={e => setNewCustomerName(e.target.value)}
                  placeholder="محمد السعيد"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={newCustomerPhone}
                  onChange={e => setNewCustomerPhone(e.target.value)}
                  placeholder="0501234567"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/25"
                >
                  حفظ واختيار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modals */}
      <InvoiceReceiptModal
        invoice={lastInvoice}
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        currency={tenant?.currency || 'SAR'}
      />

      <HeldOrdersModal
        isOpen={showHeldModal}
        onClose={() => setShowHeldModal(false)}
        onResume={handleResumeHeldOrder}
      />

      <ShiftSummaryModal
        shift={activeShift}
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onShiftClosed={() => {
          setActiveShift(null);
          loadPosData();
        }}
        onShiftOpened={newShift => {
          setActiveShift(newShift);
          loadPosData();
        }}
      />

      {/* Ticket Preview & Stations Dispatch Modal */}
      {showTicketPreview && (
        <TicketPreviewModal
          isOpen={showTicketPreview}
          onClose={() => setShowTicketPreview(false)}
          tickets={routedTickets}
          title="معاينة وطباعة التذاكر الحرارية لمحطات التشغيل"
        />
      )}

      {/* Printer Configuration & Testing Modal */}
      {showPrinterSettings && (
        <PrinterManagementModal
          isOpen={showPrinterSettings}
          onClose={() => setShowPrinterSettings(false)}
        />
      )}
    </div>
  );
};
