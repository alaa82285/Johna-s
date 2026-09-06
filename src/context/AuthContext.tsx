import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Tenant, User, Role, Branch, Warehouse, SystemModule, PermissionAction } from '../types';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  tenant: Tenant | null;
  user: User | null;
  role: Role | null;
  branches: Branch[];
  warehouses: Warehouse[];
  activeBranchId: string;
  activeWarehouseId: string;
  tenantsList: { id: string; name: string; currency: string }[];
  isLoading: boolean;
  setActiveBranchId: (id: string) => void;
  setActiveWarehouseId: (id: string) => void;
  hasPermission: (module: SystemModule, action: PermissionAction) => boolean;
  hasBranchAccess: (branchId: string) => boolean;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
  switchDemoRole: (roleName: string) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateTenant: (updatedTenant: Tenant) => void;
  login: (username: string, pinCode?: string, targetTenantId?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string>('');
  const [activeWarehouseId, setActiveWarehouseIdState] = useState<string>('');
  const [tenantsList, setTenantsList] = useState<{ id: string; name: string; currency: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authenticated API Fetch wrapper that automatically injects tenant and branch headers
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    const activeTenantId = tenant?.id || localStorage.getItem('premier_tenant_id');
    const activeUserId = user?.id || localStorage.getItem('premier_user_id');

    if (activeTenantId) {
      headers['x-tenant-id'] = activeTenantId;
    }
    if (activeUserId) {
      headers['x-user-id'] = activeUserId;
    }
    if (activeBranchId) {
      headers['x-branch-id'] = activeBranchId;
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || `HTTP error ${res.status}`;
      if (res.status === 403 && data.code === 'BRANCH_ACCESS_DENIED') {
        showError(errorMsg, 'ممنوع: عزل الفروع');
      } else if (res.status === 403 && data.code === 'PERMISSION_DENIED') {
        showWarning(errorMsg, 'صلاحية غير كافية');
      }
      throw new Error(errorMsg);
    }

    return data;
  }, [tenant?.id, user?.id, activeBranchId, showError, showWarning]);

  // Load Tenants List
  const fetchTenantsList = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/tenants-list');
      const data = await res.json();
      if (data.tenants) {
        setTenantsList(data.tenants);
      }
    } catch (e) {
      console.error('Error fetching tenants:', e);
    }
  }, []);

  // Initial bootstrap: login as default admin/owner of first tenant or cached tenant
  const initAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchTenantsList();
      const cachedTenantId = localStorage.getItem('premier_tenant_id') || undefined;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', tenantId: cachedTenantId })
      });
      const data = await res.json();
      if (data.success && data.tenant && data.user) {
        setTenant(data.tenant);
        setUser(data.user);
        setRole(data.role);
        setBranches(data.allowedBranches || []);
        localStorage.setItem('premier_tenant_id', data.tenant.id);
        localStorage.setItem('premier_user_id', data.user.id);
        if (data.allowedBranches && data.allowedBranches.length > 0) {
          setActiveBranchIdState(data.allowedBranches[0].id);
        }
      }
    } catch (err) {
      console.error('Init auth error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTenantsList]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Fetch warehouses whenever tenant or active branch changes
  useEffect(() => {
    if (tenant && activeBranchId) {
      apiFetch(`/api/branches/warehouses?branchId=${activeBranchId}`)
        .then(data => {
          if (data.warehouses) {
            setWarehouses(data.warehouses);
            if (data.warehouses.length > 0) {
              setActiveWarehouseIdState(data.warehouses[0].id);
            }
          }
        })
        .catch(console.error);
    }
  }, [tenant, activeBranchId, apiFetch]);

  const setActiveBranchId = (id: string) => {
    setActiveBranchIdState(id);
  };

  const setActiveWarehouseId = (id: string) => {
    setActiveWarehouseIdState(id);
  };

  const hasPermission = useCallback((module: SystemModule, action: PermissionAction): boolean => {
    if (!role) return false;
    if (role.name === 'Owner' || role.name === 'المالك') return true;
    const actions = role.permissions[module] || [];
    return actions.includes(action);
  }, [role]);

  const hasBranchAccess = useCallback((branchId: string): boolean => {
    if (!user) return false;
    return user.assignedBranchIds.includes('*') || 
           user.assignedBranchIds.length === 0 || 
           user.assignedBranchIds.includes(branchId);
  }, [user]);

  const switchDemoRole = async (roleName: string) => {
    try {
      const data = await apiFetch('/api/auth/switch-demo-user', {
        method: 'POST',
        body: JSON.stringify({ roleName })
      });
      if (data.success && data.user) {
        setUser(data.user);
        setRole(data.role);
        setBranches(data.allowedBranches || []);
        if (data.allowedBranches && data.allowedBranches.length > 0) {
          setActiveBranchIdState(data.allowedBranches[0].id);
        }
        showSuccess(data.message, 'تم تبديل الدور');
      }
    } catch (err: any) {
      showError(err.message, 'فشل تبديل الدور');
    }
  };

  const switchTenant = async (tenantId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, username: 'admin' })
      });
      const data = await res.json();
      if (data.success && data.tenant && data.user) {
        setTenant(data.tenant);
        setUser(data.user);
        setRole(data.role);
        setBranches(data.allowedBranches || []);
        localStorage.setItem('premier_tenant_id', data.tenant.id);
        localStorage.setItem('premier_user_id', data.user.id);
        if (data.allowedBranches && data.allowedBranches.length > 0) {
          setActiveBranchIdState(data.allowedBranches[0].id);
        }
        showSuccess(`تم الانتقال إلى شركة: ${data.tenant.name} مع عزل كامل للبيانات`, 'عزل الشركات Multi-Tenant');
      }
    } catch (err: any) {
      showError(err.message, 'فشل التبديل');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, pinCode?: string, targetTenantId?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pinCode, tenantId: targetTenantId })
      });
      const data = await res.json();
      if (data.success && data.tenant && data.user) {
        setTenant(data.tenant);
        setUser(data.user);
        setRole(data.role);
        setBranches(data.allowedBranches || []);
        localStorage.setItem('premier_tenant_id', data.tenant.id);
        localStorage.setItem('premier_user_id', data.user.id);
        if (data.allowedBranches && data.allowedBranches.length > 0) {
          setActiveBranchIdState(data.allowedBranches[0].id);
        }
        showSuccess(`مرحباً ${data.user.fullName}`, 'تم تسجيل الدخول');
        return true;
      }
      showError(data.error || 'فشل تسجيل الدخول');
      return false;
    } catch (err: any) {
      showError(err.message);
      return false;
    }
  };

  const refreshAuth = async () => {
    if (!tenant || !user) return;
    try {
      const data = await apiFetch('/api/auth/me');
      if (data.tenant) {
        setTenant(data.tenant);
      }
      if (data.user) {
        setUser(data.user);
        setRole(data.role);
        setBranches(data.branches || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateTenant = (updatedTenant: Tenant) => {
    setTenant(updatedTenant);
  };

  const logout = () => {
    setUser(null);
    setTenant(null);
    setRole(null);
    localStorage.removeItem('premier_tenant_id');
    localStorage.removeItem('premier_user_id');
    showSuccess('تم تسجيل الخروج بنجاح');
  };

  return (
    <AuthContext.Provider
      value={{
        tenant,
        user,
        role,
        branches,
        warehouses,
        activeBranchId,
        activeWarehouseId,
        tenantsList,
        isLoading,
        setActiveBranchId,
        setActiveWarehouseId,
        hasPermission,
        hasBranchAccess,
        apiFetch,
        switchDemoRole,
        switchTenant,
        refreshAuth,
        updateTenant,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
