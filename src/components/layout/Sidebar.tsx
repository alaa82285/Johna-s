import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  ChefHat,
  Boxes,
  Truck,
  Building,
  Users2,
  ShieldAlert,
  BarChart3,
  FileText,
  Lock,
  Sparkles,
  Layers,
  Settings,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'manufacturing'
  | 'inventory'
  | 'purchases'
  | 'branches'
  | 'customers'
  | 'users'
  | 'reports'
  | 'audit'
  | 'settings';

export interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab?: (tab: ActiveTab) => void;
  setActiveTab?: (tab: ActiveTab) => void;
  collapsed?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  setIsCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  onOpenSecurityModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  setActiveTab,
  collapsed = false,
  isCollapsed,
  onToggleCollapse,
  setIsCollapsed,
  onOpenSecurityModal
}) => {
  const { role, hasPermission } = useAuth();
  const { t } = useLanguage();

  const isActuallyCollapsed = isCollapsed !== undefined ? isCollapsed : collapsed;

  const handleSelect = (tab: ActiveTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    } else if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else if (setIsCollapsed) {
      setIsCollapsed(prev => !prev);
    }
  };

  const menuItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    requiredModule?: any;
    badge?: string;
  }[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'pos', label: t('nav.pos'), icon: ShoppingCart, requiredModule: 'pos', badge: 'Touch' },
    { id: 'products', label: t('nav.products'), icon: UtensilsCrossed, requiredModule: 'products' },
    { id: 'manufacturing', label: t('nav.manufacturing'), icon: ChefHat, requiredModule: 'manufacturing' },
    { id: 'inventory', label: t('nav.inventory'), icon: Boxes, requiredModule: 'inventory' },
    { id: 'purchases', label: t('nav.purchases'), icon: Truck, requiredModule: 'purchases' },
    { id: 'branches', label: t('nav.branches'), icon: Building, requiredModule: 'branches' },
    { id: 'customers', label: t('nav.customers'), icon: Users2, requiredModule: 'customers' },
    { id: 'users', label: t('nav.users'), icon: ShieldAlert, requiredModule: 'users' },
    { id: 'reports', label: t('nav.reports'), icon: BarChart3, requiredModule: 'reports' },
    { id: 'audit', label: t('nav.audit'), icon: FileText, requiredModule: 'audit_logs' },
    { id: 'settings', label: t('nav.settings') || 'الإعدادات والربط', icon: Settings }
  ];

  return (
    <aside
      className={`bg-[#0B1120] text-slate-300 border-e border-slate-800/80 flex flex-col justify-between transition-all duration-300 z-20 shrink-0 shadow-xl relative ${
        isActuallyCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-3 space-y-1 overflow-y-auto flex-1">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
          {!isActuallyCollapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-500/20">
                P
              </div>
              <div className="text-base font-bold text-white tracking-tight">
                PREMIER <span className="text-blue-400 font-mono text-xs">ERP</span>
                <span className="text-[10px] block font-sans font-normal text-slate-400 uppercase tracking-wider mt-0.5">
                  Enterprise Cloud Suite
                </span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-500/20">
              P
            </div>
          )}

          <button
            onClick={handleToggle}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isActuallyCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          >
            {isActuallyCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {!isActuallyCollapsed && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-1 pb-1">
            القائمة الرئيسية
          </div>
        )}

        {menuItems.map(item => {
          const Icon = item.icon;
          const allowed = !item.requiredModule || hasPermission(item.requiredModule, 'view');
          const isSelected = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => allowed && handleSelect(item.id)}
              disabled={!allowed}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : allowed
                  ? 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  : 'text-slate-600 cursor-not-allowed opacity-40'
              }`}
              title={!allowed ? 'ليس لديك صلاحية لعرض هذا القسم' : item.label}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                  isSelected
                    ? 'bg-white'
                    : allowed
                    ? 'bg-transparent border border-slate-600 group-hover:border-blue-400'
                    : 'bg-transparent border border-slate-700'
                }`}
              />

              <Icon
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isSelected ? 'text-white' : allowed ? 'text-slate-400 group-hover:text-blue-400' : 'text-slate-600'
                }`}
              />

              {!isActuallyCollapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0 text-start">
                  <span className="truncate">{item.label}</span>
                  {!allowed ? (
                    <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  ) : item.badge ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-950/80 text-blue-400 border border-blue-800/50'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info & Quick POS Action */}
      {!isActuallyCollapsed ? (
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {hasPermission('pos', 'create') && (
            <button
              onClick={() => handleSelect('pos')}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>نقطة بيع سريعة (POS)</span>
            </button>
          )}

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] mb-1">
              <span>RLS Isolation</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                نشط ومعزول
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              تشفير وعزل تام للمستأجر والفروع
            </p>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-800 flex justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" title="RLS Active" />
        </div>
      )}
    </aside>
  );
};
