import { Router } from 'express';
import { db } from '../db/store';
import { provisionTenant } from '../db/seed';
import { AuthenticatedRequest } from '../db/rls';

export const authRouter = Router();

// Register New Tenant (Company Onboarding Wizard)
authRouter.post('/register-tenant', (req, res) => {
  try {
    const { companyName, currency, taxNumber, ownerName, email, username } = req.body;
    if (!companyName || !ownerName || !email) {
      return res.status(400).json({ error: 'Company name, owner name, and email are required.' });
    }

    const { tenant, ownerUser, mainBranch, secondBranch, mainWarehouse } = provisionTenant({
      tenantName: companyName,
      currency: currency || 'SAR',
      taxNumber: taxNumber || '',
      ownerFullName: ownerName,
      ownerEmail: email,
      ownerUsername: username || 'admin',
      isDemo: false
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الشركة والحساب والفرع والمخازن والصلاحيات بنجاح!',
      tenant,
      user: ownerUser,
      mainBranch,
      secondBranch,
      mainWarehouse
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to register tenant' });
  }
});

// List all tenants (useful for demo & multi-tenant switcher)
authRouter.get('/tenants-list', (req, res) => {
  const state = db.getState();
  const list = state.tenants.map(t => {
    const branches = state.branches.filter(b => b.tenantId === t.id);
    const users = state.users.filter(u => u.tenantId === t.id);
    return {
      id: t.id,
      name: t.name,
      currency: t.currency,
      taxNumber: t.taxNumber,
      branchCount: branches.length,
      userCount: users.length,
      createdAt: t.createdAt
    };
  });
  res.json({ tenants: list });
});

// Login by username + pin/password
authRouter.post('/login', (req, res) => {
  try {
    const { tenantId, username, pinCode } = req.body;
    const state = db.getState();

    // If no tenantId provided, look up by username across tenants or default to first tenant
    let targetTenantId = tenantId;
    if (!targetTenantId) {
      const foundUser = state.users.find(u => u.username === username || u.email === username);
      if (foundUser) {
        targetTenantId = foundUser.tenantId;
      } else if (state.tenants.length > 0) {
        targetTenantId = state.tenants[0].id;
      }
    }

    const tenant = db.getTenant(targetTenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const user = state.users.find(u => 
      u.tenantId === targetTenantId && 
      (u.username.toLowerCase() === (username || '').toLowerCase() || u.email.toLowerCase() === (username || '').toLowerCase())
    );

    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم غير صحيح أو غير مسجل في هذه الشركة' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'هذا الحساب معطل، يرجى مراجعة إدارة النظام' });
    }

    if (pinCode && user.pinCode && user.pinCode !== pinCode) {
      return res.status(401).json({ error: 'رمز الدخول PIN غير صحيح' });
    }

    user.lastLoginAt = new Date().toISOString();
    db.persist();

    const role = state.roles.find(r => r.id === user.roleId && r.tenantId === targetTenantId);
    const branches = db.getBranches(targetTenantId, user.assignedBranchIds);

    db.logAudit({
      tenantId: targetTenantId,
      branchId: branches.length > 0 ? branches[0].id : undefined,
      userId: user.id,
      userName: user.fullName,
      userRole: role?.name || 'Unknown',
      action: 'auth.login',
      module: 'auth',
      entityType: 'user',
      entityId: user.id,
      description: `تسجيل دخول ناجح للمستخدم ${user.fullName} (${role?.name || ''})`,
      status: 'success'
    });

    res.json({
      success: true,
      tenant,
      user,
      role,
      allowedBranches: branches
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login error' });
  }
});

// Current authenticated state & profile
authRouter.get('/me', (req: AuthenticatedRequest, res) => {
  if (!req.tenant || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const state = db.getState();
  const branches = db.getBranches(req.tenant.id, req.user.assignedBranchIds);
  const warehouses = db.getWarehouses(req.tenant.id, req.user.assignedBranchIds);
  const shifts = state.cashierShifts.filter(s => s.tenantId === req.tenant!.id && s.status === 'open');

  res.json({
    tenant: req.tenant,
    user: req.user,
    role: req.userRole,
    branches,
    warehouses,
    activeShifts: shifts
  });
});

// Quick Switch Role (for testing RBAC instantly)
authRouter.post('/switch-demo-user', (req: AuthenticatedRequest, res) => {
  const { roleName, userId } = req.body;
  if (!req.tenant) return res.status(400).json({ error: 'Tenant context required' });

  const state = db.getState();
  let targetUser: any = null;

  if (userId) {
    targetUser = state.users.find(u => u.id === userId && u.tenantId === req.tenant!.id);
  } else if (roleName) {
    const role = state.roles.find(r => r.name.toLowerCase().includes(roleName.toLowerCase()) && r.tenantId === req.tenant!.id);
    if (role) {
      targetUser = state.users.find(u => u.roleId === role.id && u.tenantId === req.tenant!.id);
    }
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'Target user/role not found in this tenant' });
  }

  const role = state.roles.find(r => r.id === targetUser.roleId && r.tenantId === req.tenant!.id);
  const branches = db.getBranches(req.tenant.id, targetUser.assignedBranchIds);

  res.json({
    success: true,
    message: `تم التبديل إلى المستخدم: ${targetUser.fullName} (${role?.name})`,
    user: targetUser,
    role,
    allowedBranches: branches
  });
});
