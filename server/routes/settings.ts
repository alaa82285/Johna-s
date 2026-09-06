import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest } from '../db/rls';

export const settingsRouter = Router();

// Get tenant settings
settingsRouter.get('/tenant', (req: AuthenticatedRequest, res) => {
  if (!req.tenant) return res.status(401).json({ error: 'Unauthorized' });
  res.json({
    success: true,
    tenant: req.tenant,
    settings: req.tenant.settings
  });
});

// Update tenant settings and currency
settingsRouter.put('/tenant', (req: AuthenticatedRequest, res) => {
  if (!req.tenant) return res.status(401).json({ error: 'Unauthorized' });

  const {
    name,
    legalName,
    taxNumber,
    currency,
    phone,
    email,
    address,
    defaultTaxRate,
    enableTax,
    enableLoyalty,
    allowNegativeStock,
    receiptHeader,
    receiptFooter
  } = req.body;

  const state = db.getState();
  const tenant = state.tenants.find(t => t.id === req.tenant!.id);

  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  // Update tenant properties
  if (name !== undefined) tenant.name = name;
  if (legalName !== undefined) tenant.legalName = legalName;
  if (taxNumber !== undefined) tenant.taxNumber = taxNumber;
  if (currency !== undefined && currency.trim() !== '') tenant.currency = currency.trim().toUpperCase();
  if (phone !== undefined) tenant.phone = phone;
  if (email !== undefined) tenant.email = email;
  if (address !== undefined) tenant.address = address;
  tenant.updatedAt = new Date().toISOString();

  // Update tenant.settings
  tenant.settings = {
    ...tenant.settings,
    ...(defaultTaxRate !== undefined ? { defaultTaxRate: Number(defaultTaxRate) } : {}),
    ...(enableTax !== undefined ? { enableTax: Boolean(enableTax) } : {}),
    ...(enableLoyalty !== undefined ? { enableLoyalty: Boolean(enableLoyalty) } : {}),
    ...(allowNegativeStock !== undefined ? { allowNegativeStock: Boolean(allowNegativeStock) } : {}),
    ...(receiptHeader !== undefined ? { defaultReceiptHeader: receiptHeader } : {}),
    ...(receiptFooter !== undefined ? { defaultReceiptFooter: receiptFooter } : {})
  };

  db.logAudit({
    tenantId: tenant.id,
    userId: req.user?.id || 'system',
    userName: req.user?.fullName || 'System',
    userRole: req.userRole?.name || 'Admin',
    action: 'settings.update',
    module: 'settings',
    entityType: 'tenant',
    entityId: tenant.id,
    description: `تحديث إعدادات المنشأة والعملة إلى (${tenant.currency})`,
    status: 'success'
  });

  db.persist();

  res.json({
    success: true,
    message: 'تم تحديث إعدادات المنشأة والعملة بنجاح',
    tenant
  });
});
