import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
import { User, Role } from '../types';

export const usersRouter = Router();

// GET all users in current tenant
usersRouter.get('/', requirePermission('users', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const users = state.users.filter(u => u.tenantId === tenantId).map(u => {
    const role = state.roles.find(r => r.id === u.roleId && r.tenantId === tenantId);
    return {
      ...u,
      roleName: role?.name || u.roleName
    };
  });

  res.json({ users });
});

// Create User
usersRouter.post('/', requirePermission('users', 'create'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { username, email, fullName, phone, roleId, assignedBranchIds, pinCode } = req.body;

  if (!username || !fullName || !roleId) {
    return res.status(400).json({ error: 'اسم المستخدم والاسم الكامل والدور حقول مطلوبة' });
  }

  // Check username uniqueness in this tenant
  const exists = state.users.some(u => u.tenantId === tenantId && u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً في هذه الشركة' });
  }

  const role = state.roles.find(r => r.id === roleId && r.tenantId === tenantId);

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId,
    username,
    email: email || `${username}@example.com`,
    fullName,
    phone,
    roleId,
    roleName: role?.name || 'User',
    assignedBranchIds: Array.isArray(assignedBranchIds) && assignedBranchIds.length > 0 ? assignedBranchIds : ['*'],
    isActive: true,
    pinCode: pinCode || '1234',
    createdAt: new Date().toISOString()
  };

  state.users.push(newUser);

  db.logAudit({
    tenantId,
    userId: req.user?.id || 'sys',
    userName: req.user?.fullName || 'Manager',
    userRole: req.userRole?.name || 'Owner',
    action: 'user.create',
    module: 'users',
    entityType: 'user',
    entityId: newUser.id,
    description: `إنشاء مستخدم جديد: [${newUser.fullName}] بدور (${role?.name})`,
    status: 'success'
  });

  db.persist();

  res.status(201).json({ success: true, user: newUser });
});

// Update User
usersRouter.put('/:id', requirePermission('users', 'edit'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const user = state.users.find(u => u.id === req.params.id && u.tenantId === tenantId);

  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  const { fullName, email, phone, roleId, assignedBranchIds, isActive, pinCode } = req.body;

  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (roleId) {
    user.roleId = roleId;
    const role = state.roles.find(r => r.id === roleId && r.tenantId === tenantId);
    if (role) user.roleName = role.name;
  }
  if (assignedBranchIds) user.assignedBranchIds = assignedBranchIds;
  if (isActive !== undefined) user.isActive = Boolean(isActive);
  if (pinCode) user.pinCode = pinCode;

  db.logAudit({
    tenantId,
    userId: req.user?.id || 'sys',
    userName: req.user?.fullName || 'Manager',
    userRole: req.userRole?.name || 'Owner',
    action: 'user.update',
    module: 'users',
    entityType: 'user',
    entityId: user.id,
    description: `تحديث بيانات المستخدم: [${user.fullName}]`,
    status: 'success'
  });

  db.persist();

  res.json({ success: true, user });
});

// Roles & Permissions matrix
usersRouter.get('/roles', requirePermission('users', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const roles = db.getState().roles.filter(r => r.tenantId === tenantId);
  res.json({ roles });
});

usersRouter.put('/roles/:id', requirePermission('users', 'edit'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const role = state.roles.find(r => r.id === req.params.id && r.tenantId === tenantId);

  if (!role) {
    return res.status(404).json({ error: 'الدور غير موجود' });
  }

  const { permissions, description } = req.body;
  if (permissions) role.permissions = permissions;
  if (description) role.description = description;

  db.logAudit({
    tenantId,
    userId: req.user?.id || 'sys',
    userName: req.user?.fullName || 'Manager',
    userRole: req.userRole?.name || 'Owner',
    action: 'role.update',
    module: 'users',
    entityType: 'role',
    entityId: role.id,
    description: `تحديث مصفوفة صلاحيات الدور: [${role.name}]`,
    status: 'success'
  });

  db.persist();

  res.json({ success: true, role });
});
