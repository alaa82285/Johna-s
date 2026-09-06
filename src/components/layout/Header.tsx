import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Building2,
  GitBranch,
  ShieldCheck,
  Globe,
  UserCheck,
  ChevronDown,
  PlusCircle,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  onOpenSecurityModal: () => void;
  onOpenOnboardingModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSecurityModal, onOpenOnboardingModal }) => {
  const {
    tenant,
    user,
    role,
    branches,
    activeBranchId,
    setActiveBranchId,
    tenantsList,
    switchTenant,
    switchDemoRole
  } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const activeBranch = branches.find(b => b.id === activeBranchId);

  return (
    <header className="h-16 md:h-18 bg-white/95 border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 backdrop-blur-md shadow-xs">
      {/* Left / Start: Brand & Tenant Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold text-lg tracking-tight">
            P
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-slate-900">Premier</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                POS/ERP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">Tenant: #{tenant?.id || 'TN-101'}</p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />

        {/* Tenant Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setTenantMenuOpen(!tenantMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition-all shadow-xs active:scale-[0.98]"
            title="الشركة الحالية (بيئة معزولة بالكامل)"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="max-w-[140px] truncate">{tenant?.name || 'جاري التحميل...'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {tenantMenuOpen && (
            <div className="absolute start-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                الشركات والمستأجرين (Tenants)
              </div>
              <div className="space-y-1 my-1 max-h-48 overflow-y-auto">
                {tenantsList.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      switchTenant(t.id);
                      setTenantMenuOpen(false);
                    }}
                    className={`w-full text-start px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      t.id === tenant?.id
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 bg-slate-100 rounded">{t.currency}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-2 mt-1">
                <button
                  onClick={() => {
                    setTenantMenuOpen(false);
                    onOpenOnboardingModal();
                  }}
                  className="w-full text-start px-3 py-2 rounded-xl text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-bold transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>تسجيل شركة جديدة (New Tenant)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Branch Selector */}
        {branches.length > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <GitBranch className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={activeBranchId}
              onChange={e => setActiveBranchId(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id} className="bg-white text-slate-800">
                  {b.name} {b.isMain ? '(الفرع الرئيسي)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right / End Actions */}
      <div className="flex items-center gap-2.5">
        {/* Live Security & Isolation Test Runner Button */}
        <button
          onClick={onOpenSecurityModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-700 transition-all shadow-xs active:scale-[0.98]"
          title="تشغيل فحص العزل والأمان والـ RLS الآلي"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">فحص الأمان والعزل</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px]">RLS 100%</span>
        </button>

        {/* Demo Role Switcher (Owner, Manager, Cashier, Kitchen, Warehouse) */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-colors shadow-xs"
            title="تبديل الدور للتجربة وفحص الصلاحيات"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline text-slate-500 font-normal">الدور:</span>
            <span className="font-bold text-slate-900">{role?.name || 'Owner'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute end-0 mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400">تبديل المستخدم للتجربة (RBAC):</div>
              <div className="space-y-1 my-1">
                {[
                  { name: 'Owner', label: 'المالك (صلاحيات كاملة)' },
                  { name: 'General Manager', label: 'المدير العام' },
                  { name: 'Cashier', label: 'كاشير (صلاحيات البيع فقط)' },
                  { name: 'Kitchen', label: 'المطبخ والتصنيع (أوامر BOM)' },
                  { name: 'Warehouse', label: 'مسؤول المخازن والجرد' }
                ].map(r => (
                  <button
                    key={r.name}
                    onClick={() => {
                      switchDemoRole(r.name);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-start px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      role?.name.includes(r.name) ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
          title="تبديل اللغة (Arabic / English)"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 ps-2 border-s border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="hidden xl:block text-start">
            <div className="text-xs font-bold text-slate-900 leading-none">{user?.fullName}</div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">{activeBranch?.name}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
