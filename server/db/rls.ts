import { Request, Response, NextFunction } from 'express';
import { db } from './store';
import { User, Tenant, Role, SystemModule, PermissionAction } from '../types';

export interface AuthenticatedRequest extends Request {
  tenant?: Tenant;
  user?: User;
  userRole?: Role;
  activeBranchId?: string;
  activeWarehouseId?: string;
}

export function authAndRlsMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Public endpoints (health, tenant signup, login, tenants-list)
  const fullPath = (req.originalUrl || req.url || '').split('?')[0];
  const reqPath = req.path || '';
  if (
    fullPath === '/api/health' ||
    fullPath === '/api/auth/login' ||
    fullPath === '/api/auth/register-tenant' ||
    fullPath === '/api/auth/tenants-list' ||
    reqPath === '/health' ||
    reqPath === '/auth/login' ||
    reqPath === '/auth/register-tenant' ||
    reqPath === '/auth/tenants-list'
  ) {
    return next();
  }

  let tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string);
  let userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
  const branchId = (req.headers['x-branch-id'] as string) || (req.query.branchId as string);

  // If no tenantId provided, check if we have a default seeded tenant for graceful fallback
  if (!tenantId) {
    const state = db.getState();
    if (state.tenants && state.tenants.length > 0) {
      tenantId = state.tenants[0].id;
    }
  }

  if (!tenantId) {
    return res.status(401).json({
      error: 'Tenant ID is required (Missing x-tenant-id header)',
      code: 'UNAUTHENTICATED_NO_TENANT'
    });
  }

  const tenant = db.getTenant(tenantId);
  if (!tenant) {
    return res.status(404).json({
      error: 'Company/Tenant not found',
      code: 'TENANT_NOT_FOUND'
    });
  }

  req.tenant = tenant;

  const state = db.getState();

  // If no userId provided, fallback to tenant's first active user
  if (!userId) {
    const defaultUser = state.users.find(u => u.tenantId === tenantId && u.isActive);
    if (defaultUser) {
      userId = defaultUser.id;
    }
  }

  // If userId provided, verify user exists in THIS tenant
  if (userId) {
    const user = state.users.find(u => u.id === userId && u.tenantId === tenantId);
    if (!user) {
      db.logAudit({
        tenantId,
        userId: userId || 'unknown',
        userName: 'Unknown Intruder',
        userRole: 'None',
        action: 'security.idor_blocked',
        module: 'security',
        entityType: 'user',
        entityId: userId,
        description: `Blocked cross-tenant or invalid user ID access attempt: ${userId}`,
        status: 'denied'
      });
      return res.status(403).json({
        error: 'Unauthorized: User does not belong to this tenant (RLS Security Block)',
        code: 'CROSS_TENANT_USER_VIOLATION'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'User account is deactivated',
        code: 'USER_DEACTIVATED'
      });
    }

    req.user = user;
    const role = state.roles.find(r => r.id === user.roleId && r.tenantId === tenantId);
    req.userRole = role;

    // Verify branch isolation if branchId is requested
    if (branchId) {
      const allowed = user.assignedBranchIds.includes('*') || 
                      user.assignedBranchIds.length === 0 || 
                      user.assignedBranchIds.includes(branchId);
      if (!allowed) {
        db.logAudit({
          tenantId,
          userId: user.id,
          userName: user.fullName,
          userRole: role?.name || 'Unknown',
          action: 'security.branch_isolation_violation',
          module: 'security',
          entityType: 'branch',
          entityId: branchId,
          description: `Blocked unauthorized cross-branch access to branch ${branchId}`,
          status: 'denied'
        });
        return res.status(403).json({
          error: 'Access denied: You do not have permission to access this branch.',
          code: 'BRANCH_ACCESS_DENIED'
        });
      }
      req.activeBranchId = branchId;
    } else {
      // Default to first assigned branch or main branch
      const branches = db.getBranches(tenantId, user.assignedBranchIds);
      if (branches.length > 0) {
        req.activeBranchId = branches[0].id;
      }
    }
  }

  next();
}

export function requirePermission(module: SystemModule, action: PermissionAction) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.userRole) {
      return res.status(403).json({
        error: 'Access denied: No role assigned',
        code: 'NO_ROLE_ASSIGNED'
      });
    }

    // Owner role has full wildcard permissions
    if (req.userRole.name === 'Owner' || req.userRole.name === 'المالك') {
      return next();
    }

    const modulePermissions = req.userRole.permissions[module] || [];
    if (!modulePermissions.includes(action)) {
      db.logAudit({
        tenantId: req.tenant!.id,
        branchId: req.activeBranchId,
        userId: req.user.id,
        userName: req.user.fullName,
        userRole: req.userRole.name,
        action: 'security.permission_denied',
        module: 'security',
        entityType: module,
        description: `Permission denied: User attempted [${action}] on module [${module}]`,
        details: { requiredAction: action, requiredModule: module, userPermissions: modulePermissions },
        status: 'denied'
      });

      return res.status(403).json({
        error: `Permission denied: Missing permission '${action}' for module '${module}'`,
        code: 'PERMISSION_DENIED',
        requiredModule: module,
        requiredAction: action
      });
    }

    next();
  };
}

export function requireBranchAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const branchId = req.body.branchId || req.query.branchId || req.params.branchId || req.activeBranchId;
  if (!branchId) return next();

  if (req.user && req.tenant) {
    const isAllowed = req.user.assignedBranchIds.includes('*') || 
                      req.user.assignedBranchIds.length === 0 || 
                      req.user.assignedBranchIds.includes(branchId);
    if (!isAllowed) {
      db.logAudit({
        tenantId: req.tenant.id,
        userId: req.user.id,
        userName: req.user.fullName,
        userRole: req.userRole?.name || 'Unknown',
        action: 'security.branch_isolation_violation',
        module: 'security',
        entityType: 'branch',
        entityId: branchId,
        description: `Security block: Attempted mutation on unauthorized branch [${branchId}]`,
        status: 'denied'
      });
      return res.status(403).json({
        error: 'Forbidden: You do not have authorization for this branch',
        code: 'UNAUTHORIZED_BRANCH_ACCESS'
      });
    }
  }
  next();
}
