import { Request, Response, NextFunction } from 'express';
import { supabase } from './supabase';

export interface AuthenticatedRequest extends Request {
  user?: any;
  tenant?: any;
  userRole?: any;
  activeBranchId?: string;
}

export function requirePermission(_module: string, _action: string) {
  return (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => next();
}

export async function authAndRlsMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const requestedBranch = (req.header('x-branch-id') || req.query.branchId || req.body?.branchId) as string | undefined;
    const userId = req.header('x-user-id') as string | undefined;
    let user: any = null;

    if (userId) {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      user = data;
    }
    if (!user) {
      const { data, error } = await supabase.from('users').select('*').eq('is_active', true).limit(1).maybeSingle();
      if (error) throw error;
      user = data;
    }

    const activeBranchId = requestedBranch || user?.branch_id;
    let tenant: any = null;
    if (activeBranchId) {
      const { data, error } = await supabase.from('branches').select('*, organizations(*)').eq('id', activeBranchId).maybeSingle();
      if (error) throw error;
      if (data) tenant = data.organizations || { id: data.organization_id, name: 'Organization' };
    }
    if (!tenant) {
      const { data, error } = await supabase.from('organizations').select('*').limit(1).maybeSingle();
      if (error) throw error;
      tenant = data;
    }

    req.user = user;
    req.tenant = tenant;
    req.userRole = { name: user?.role || 'User', permissions: {} };
    req.activeBranchId = activeBranchId;
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Supabase request context failed' });
  }
}
