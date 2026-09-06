import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
import { Branch, Warehouse } from '../types';

export const branchesRouter = Router();

// GET all branches
branchesRouter.get('/', requirePermission('branches', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const branches = db.getBranches(tenantId, req.user?.assignedBranchIds);
  res.json({ branches });
});

// Create Branch
branchesRouter.post('/', requirePermission('branches', 'create'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { name, code, address, phone } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'اسم الفرع وكوده مطلوبان' });
  }

  const branchCount = state.branches.filter(b => b.tenantId === tenantId).length + 1;
  const branch: Branch = {
    id: `br_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId,
    name,
    code: code || `BR-${branchCount.toString().padStart(2, '0')}`,
    address,
    phone,
    isMain: false,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  state.branches.push(branch);

  // Auto-create default warehouse for this branch
  const warehouse: Warehouse = {
    id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId,
    branchId: branch.id,
    name: `مستودع ${branch.name}`,
    code: `WH-${branch.code}`,
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  state.warehouses.push(warehouse);

  db.logAudit({
    tenantId,
    branchId: branch.id,
    userId: req.user?.id || 'sys',
    userName: req.user?.fullName || 'Manager',
    userRole: req.userRole?.name || 'Admin',
    action: 'branch.create',
    module: 'branches',
    entityType: 'branch',
    entityId: branch.id,
    description: `إنشاء فرع جديد: [${branch.name}] مع مستودعه الافتراضي`,
    status: 'success'
  });

  db.persist();

  res.status(201).json({ success: true, branch, warehouse });
});

// Warehouses list
branchesRouter.get('/warehouses', requirePermission('warehouses', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const { branchId } = req.query;
  const warehouses = db.getWarehouses(tenantId, branchId ? [branchId as string] : req.user?.assignedBranchIds);
  res.json({ warehouses });
});

// Create Warehouse
branchesRouter.post('/warehouses', requirePermission('warehouses', 'create'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { branchId, name, code, isDefault } = req.body;

  if (!name || !branchId) {
    return res.status(400).json({ error: 'اسم المستودع والفرع التابع له حقول مطلوبة' });
  }

  const warehouse: Warehouse = {
    id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId,
    branchId,
    name,
    code: code || `WH-${Date.now().toString().slice(-4)}`,
    isDefault: Boolean(isDefault),
    isActive: true,
    createdAt: new Date().toISOString()
  };

  state.warehouses.push(warehouse);
  db.persist();

  res.status(201).json({ success: true, warehouse });
});
