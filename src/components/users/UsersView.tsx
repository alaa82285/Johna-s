import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { User, Role, Branch } from '../../types';
import {
  Shield,
  UserPlus,
  KeyRound,
  CheckCircle2,
  Lock,
  Building,
  User as UserIcon,
  X,
  RotateCcw,
  Check,
  BadgeCheck
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { tenant, activeBranchId, apiFetch, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { showSuccess, showError } = useNotification();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [loading, setLoading] = useState(false);

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRoleId, setUserRoleId] = useState('');
  const [userBranchId, setUserBranchId] = useState('');

  const loadData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [uData, rData, bData] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/users/roles'),
        apiFetch('/api/branches')
      ]);

      if (uData.users) setUsers(uData.users);
      if (rData.roles) {
        setRoles(rData.roles);
        if (rData.roles.length > 0) setUserRoleId(rData.roles[0].id);
      }
      if (bData.branches) {
        setBranches(bData.branches);
        if (bData.branches.length > 0) setUserBranchId(bData.branches[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      loadData();
    }
  }, [tenant?.id, apiFetch]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userPassword || !userRoleId) {
      showError('جميع الحقول مطلوبة لإنشاء الحساب');
      return;
    }

    try {
      const data = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          password: userPassword,
          roleId: userRoleId,
          branchId: userBranchId
        })
      });

      if (data.success) {
        showSuccess('تمت إضافة المستخدم بنجاح');
        setShowUserModal(false);
        setUserName('');
        setUserEmail('');
        setUserPassword('');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const permissionModules = [
    { key: 'pos', name: 'نقطة البيع (POS)' },
    { key: 'products', name: 'المنتجات وقوائم BOM' },
    { key: 'inventory', name: 'المخزون والتحويلات' },
    { key: 'manufacturing', name: 'التصنيع وتشغيل المطبخ' },
    { key: 'purchases', name: 'المشتريات والموردين' },
    { key: 'reports', name: 'التقارير والأرباح' },
    { key: 'branches', name: 'الفروع والمستودعات' },
    { key: 'users', name: 'المستخدمين والصلاحيات' },
    { key: 'audit', name: 'سجل الرقابة والتتبع' }
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              المستخدمين ومصفوفة الصلاحيات
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة حسابات الموظفين، ربط الفروع، والتحكم الدقيق في صلاحيات العمليات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasPermission('users', 'create') && (
            <button
              onClick={() => setShowUserModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة موظف جديد</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          حسابات الموظفين ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          مصفوفة الأدوار والصلاحيات ({roles.length})
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 text-start">اسم الموظف</th>
                  <th className="p-3.5 text-start">البريد الإلكتروني</th>
                  <th className="p-3.5 text-start">الدور الوظيفي</th>
                  <th className="p-3.5 text-start">الفرع المخصص</th>
                  <th className="p-3.5 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => {
                  const roleName = roles.find(r => r.id === u.roleId)?.name || u.roleId;
                  const branchName = branches.find(b => b.id === u.branchId)?.name || 'الفرع الرئيسي';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                          {u.name.charAt(0)}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{u.email}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200/60 text-xs">
                          {roleName}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">{branchName}</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          نشط
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles & Permissions Matrix */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs p-6">
            <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>مصفوفة الصلاحيات حسب الأدوار (RBAC Permission Matrix)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 text-start">الوحدة / الموديول</th>
                    {roles.map(r => (
                      <th key={r.id} className="p-3.5 text-center">
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissionModules.map(mod => (
                    <tr key={mod.key} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{mod.name}</td>
                      {roles.map(r => {
                        const hasRead = r.permissions?.some(
                          p => p.module === mod.key && (p.action === 'read' || p.action === 'create')
                        );
                        return (
                          <td key={r.id} className="p-3.5 text-center">
                            {hasRead ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                                <Check className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mx-auto border border-slate-200">
                                <Lock className="w-3 h-3" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="font-bold text-base text-slate-900">إضافة مستخدم وموظف جديد</h4>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="سالم الغامدي"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="salem@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">كلمة المرور *</label>
                <input
                  type="password"
                  required
                  value={userPassword}
                  onChange={e => setUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">الدور الوظيفي والصلاحيات *</label>
                <select
                  value={userRoleId}
                  onChange={e => setUserRoleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">الفرع المخصص</label>
                <select
                  value={userBranchId}
                  onChange={e => setUserBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
                >
                  إنشاء الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
