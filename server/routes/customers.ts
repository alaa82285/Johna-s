import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
import { Customer } from '../types';

export const customersRouter = Router();

// GET customers
customersRouter.get('/', requirePermission('customers', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const customers = db.getState().customers.filter(c => c.tenantId === tenantId);
  res.json({ customers });
});

// Create Customer
customersRouter.post('/', requirePermission('customers', 'create'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { name, phone, email, address, taxNumber, creditLimit } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'اسم العميل ورقم الهاتف حقول مطلوبة' });
  }

  const customer: Customer = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId,
    name,
    phone,
    email,
    address,
    taxNumber,
    loyaltyPoints: 0,
    currentBalance: 0,
    creditLimit: Number(creditLimit || 0),
    createdAt: new Date().toISOString()
  };

  state.customers.push(customer);

  db.logAudit({
    tenantId,
    userId: req.user?.id || 'sys',
    userName: req.user?.fullName || 'Manager',
    userRole: req.userRole?.name || 'Cashier',
    action: 'customer.create',
    module: 'customers',
    entityType: 'customer',
    entityId: customer.id,
    description: `إضافة عميل جديد: [${customer.name}]`,
    status: 'success'
  });

  db.persist();

  res.status(201).json({ success: true, customer });
});

// Settle customer debt / payment
customersRouter.post('/:id/payment', requirePermission('customers', 'edit'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const customer = state.customers.find(c => c.id === req.params.id && c.tenantId === tenantId);

  if (!customer) {
    return res.status(404).json({ error: 'العميل غير موجود' });
  }

  const { amount, notes } = req.body;
  const payAmt = Number(amount || 0);

  if (payAmt <= 0) {
    return res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من الصفر' });
  }

  customer.currentBalance = Math.max(0, customer.currentBalance - payAmt);

  db.logAudit({
    tenantId,
    userId: req.user?.id || 'sys',
    userName: req.user?.fullName || 'Manager',
    userRole: req.userRole?.name || 'Accountant',
    action: 'customer.payment',
    module: 'customers',
    entityType: 'customer',
    entityId: customer.id,
    description: `سداد دفعة من رصيد العميل [${customer.name}] بمبلغ ${payAmt.toFixed(2)}. الرصيد المتبقي: ${customer.currentBalance.toFixed(2)}`,
    status: 'success'
  });

  db.persist();

  res.json({ success: true, message: 'تم تسجيل الدفعة بنجاح', customer });
});
