import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { Product, Category, UnitOfMeasure, RecipeIngredient } from '../../types';
import {
  Plus,
  Search,
  UtensilsCrossed,
  Sparkles,
  Edit2,
  Trash2,
  Boxes,
  Tag,
  Scale,
  X,
  CheckCircle2,
  AlertCircle,
  PlusCircle
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { tenant, activeBranchId, apiFetch, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { showSuccess, showError, showWarning } = useNotification();

  const [activeTab, setActiveTab] = useState<'finished' | 'raw' | 'categories' | 'units'>('finished');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    sku: string;
    barcode: string;
    categoryId: string;
    type: 'finished_good' | 'raw_material' | 'recipe_based' | 'manufactured';
    unitId: string;
    costPrice: number;
    sellingPrice: number;
    minStockLevel: number;
    hasRecipe: boolean;
    recipe: RecipeIngredient[];
  }>({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    type: 'finished_good',
    unitId: '',
    costPrice: 0,
    sellingPrice: 0,
    minStockLevel: 5,
    hasRecipe: false,
    recipe: []
  });

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');

  const loadData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [pData, cData, uData] = await Promise.all([
        apiFetch(`/api/products?branchId=${activeBranchId}`),
        apiFetch('/api/products/meta/categories'),
        apiFetch('/api/products/meta/units')
      ]);
      if (pData.products) setProducts(pData.products);
      if (cData.categories) setCategories(cData.categories);
      if (uData.units) setUnits(uData.units);
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
  }, [tenant?.id, activeBranchId, apiFetch]);

  const rawMaterialsList = products.filter(p => p.type === 'raw_material');

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      barcode: '',
      categoryId: categories[0]?.id || '',
      type: activeTab === 'raw' ? 'raw_material' : 'recipe_based',
      unitId: units[0]?.id || '',
      costPrice: 0,
      sellingPrice: 0,
      minStockLevel: 5,
      hasRecipe: activeTab !== 'raw',
      recipe: []
    });
    setShowProductModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      categoryId: product.categoryId,
      type: product.type,
      unitId: product.unitId || '',
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      minStockLevel: product.minStockLevel,
      hasRecipe: Boolean(product.hasRecipe),
      recipe: product.recipe || []
    });
    setShowProductModal(true);
  };

  // Recipe calculation
  const totalRecipeCost = (formData.recipe || []).reduce(
    (acc, r) => acc + (r.unitCost || 0) * (r.quantity || 0),
    0
  );

  const calculatedProfitMargin =
    formData.sellingPrice > 0
      ? (((formData.sellingPrice - (formData.hasRecipe ? totalRecipeCost : formData.costPrice)) /
          formData.sellingPrice) *
        100)
      : 0;

  const handleAddIngredient = () => {
    if (rawMaterialsList.length === 0) {
      showWarning('يرجى إنشاء مواد خام أولاً لإضافتها إلى شجرة الوصفة');
      return;
    }
    const firstRaw = rawMaterialsList[0];
    const newIngredient: RecipeIngredient = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      rawMaterialId: firstRaw.id,
      rawMaterialName: firstRaw.name,
      quantity: 1,
      unitId: firstRaw.unitId || '',
      unitSymbol: firstRaw.unitSymbol || 'كجم',
      unitCost: firstRaw.costPrice || 0,
      totalCost: (firstRaw.costPrice || 0) * 1
    };
    setFormData({
      ...formData,
      recipe: [...formData.recipe, newIngredient]
    });
  };

  const handleUpdateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...formData.recipe];
    if (field === 'rawMaterialId') {
      const raw = rawMaterialsList.find(r => r.id === value);
      if (raw) {
        updated[index] = {
          ...updated[index],
          rawMaterialId: raw.id,
          rawMaterialName: raw.name,
          unitId: raw.unitId || '',
          unitSymbol: raw.unitSymbol || 'كجم',
          unitCost: raw.costPrice || 0,
          totalCost: (raw.costPrice || 0) * (updated[index].quantity || 1)
        };
      }
    } else if (field === 'quantity') {
      const qty = Number(value);
      updated[index] = {
        ...updated[index],
        quantity: qty,
        totalCost: (updated[index].unitCost || 0) * qty
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }
    setFormData({ ...formData, recipe: updated });
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData({
      ...formData,
      recipe: formData.recipe.filter((_, i) => i !== index)
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId) {
      showError('اسم المنتج والتصنيف حقول مطلوبة');
      return;
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        costPrice: formData.hasRecipe ? totalRecipeCost : formData.costPrice
      };

      const data = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (data.success) {
        showSuccess(editingProduct ? 'تم تعديل المنتج بنجاح' : 'تم إضافة المنتج بنجاح');
        setShowProductModal(false);
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المنتج [${name}]؟`)) return;
    try {
      const data = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      if (data.success) {
        showSuccess('تم حذف المنتج بنجاح');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      const data = await apiFetch('/api/products/meta/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName, code: newCatCode })
      });
      if (data.success) {
        showSuccess('تم إضافة التصنيف بنجاح');
        setCategories(prev => [...prev, data.category]);
        setShowCategoryModal(false);
        setNewCatName('');
        setNewCatCode('');
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const filteredProducts = products.filter(p => {
    const isRaw = p.type === 'raw_material';
    const matchTab = activeTab === 'raw' ? isRaw : !isRaw;
    const matchSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-blue-600" />
            <span>إدارة المنتجات وقوائم المواد والوصفات (BOM)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تعريف الأصناف، المواد الخام، وبناء شجرة المكونات وتكاليف الإنتاج
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('products', 'create') && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('finished')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'finished'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          الأصناف النهائية والوجبات ({products.filter(p => p.type !== 'raw_material').length})
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'raw'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          المواد الخام والمكونات ({rawMaterialsList.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'categories'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          التصنيفات ({categories.length})
        </button>
      </div>

      {/* Products Tab Content */}
      {activeTab !== 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="max-w-xs w-full relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الرمز (SKU)..."
                className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-start">رمز الصنف (SKU)</th>
                    <th className="p-3 text-start">اسم الصنف</th>
                    <th className="p-3 text-start">التصنيف</th>
                    <th className="p-3 text-start">النوع / الوصفة</th>
                    <th className="p-3 text-end">سعر التكلفة</th>
                    <th className="p-3 text-end">سعر البيع</th>
                    <th className="p-3 text-end">حد الطلب</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        لا توجد أصناف تطابق هذا البحث
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-500">{prod.sku}</td>
                        <td className="p-3 text-slate-900 font-bold">{prod.name}</td>
                        <td className="p-3 text-slate-500">
                          {categories.find(c => c.id === prod.categoryId)?.name || 'عام'}
                        </td>
                        <td className="p-3">
                          {prod.hasRecipe ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit font-semibold">
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              <span>وصفة ({prod.recipe?.length || 0} مكونات)</span>
                            </span>
                          ) : prod.type === 'raw_material' ? (
                            <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                              مادة خام ({prod.unitSymbol})
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              منتج مباشر
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-end font-mono text-slate-500">
                          {prod.costPrice.toFixed(2)} SAR
                        </td>
                        <td className="p-3 text-end font-mono font-bold text-blue-600">
                          {prod.sellingPrice.toFixed(2)} SAR
                        </td>
                        <td className="p-3 text-end font-mono text-slate-500">
                          {prod.minStockLevel} {prod.unitSymbol}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(prod)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="تعديل الصنف والوصفة"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="حذف الصنف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab Content */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تصنيف جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => {
              const count = products.filter(p => p.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-mono text-slate-400">{cat.code}</span>
                  </div>
                  <h4 className="font-bold text-base text-slate-900">{cat.name}</h4>
                  <div className="text-xs text-slate-500">{count} منتجات تحت هذا التصنيف</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Product & Recipe Builder Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-base text-slate-900">
                  {editingProduct ? 'تعديل الصنف والوصفة (BOM)' : 'إضافة صنف جديد وقائمة المواد'}
                </h4>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">اسم الصنف *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: برجر دبل لحم"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-semibold mb-1">رمز الصنف (SKU) *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">التصنيف *</label>
                  <select
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-800 font-semibold mb-1">نوع الصنف *</label>
                  <select
                    value={formData.type}
                    onChange={e => {
                      const val = e.target.value as any;
                      setFormData({
                        ...formData,
                        type: val,
                        hasRecipe: val === 'recipe_based' || val === 'manufactured'
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="finished_good">منتج نهائي مباشر (جاهز للبيع)</option>
                    <option value="recipe_based">منتج يعتمد على وصفة (BOM Recipe)</option>
                    <option value="raw_material">مادة خام ومكون للمخازن</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-800 font-semibold mb-1">حد إعادة الطلب</label>
                  <input
                    type="number"
                    value={formData.minStockLevel}
                    onChange={e => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">سعر البيع (SAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-semibold mb-1">
                    {formData.hasRecipe ? 'سعر التكلفة (محسوب آلياً من الوصفة)' : 'سعر التكلفة المباشر'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={formData.hasRecipe}
                    value={formData.hasRecipe ? totalRecipeCost.toFixed(2) : formData.costPrice}
                    onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-mono ${
                      formData.hasRecipe
                        ? 'bg-slate-100 border-slate-200 text-blue-700 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Recipe / BOM Builder Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h5 className="font-bold text-slate-900">قائمة المواد الخام والوصفة (Recipe BOM)</h5>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] text-slate-500">تفعيل شجرة الوصفة</span>
                    <input
                      type="checkbox"
                      checked={formData.hasRecipe}
                      onChange={e => setFormData({ ...formData, hasRecipe: e.target.checked })}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>
                </div>

                {formData.hasRecipe && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500">
                      عند بيع هذا المنتج من الـ POS أو تصنيعه، سيتم خصم المقادير المحددة هنا من رصيد المواد الخام تلقائياً.
                    </p>

                    {formData.recipe.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs"
                      >
                        <select
                          value={ing.rawMaterialId}
                          onChange={e => handleUpdateIngredient(idx, 'rawMaterialId', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs"
                        >
                          {rawMaterialsList.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.costPrice} SAR / {r.unitSymbol})
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1 w-28">
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={ing.quantity}
                            onChange={e =>
                              handleUpdateIngredient(idx, 'quantity', Number(e.target.value))
                            }
                            className="w-16 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs"
                          />
                          <span className="text-[11px] text-slate-500">{ing.unitSymbol}</span>
                        </div>

                        <span className="text-[11px] font-mono font-semibold text-blue-600 w-20 text-end">
                          {((ing.unitCost || 0) * (ing.quantity || 0)).toFixed(2)} SAR
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-blue-600 text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة مكون للوصفة</span>
                    </button>

                    <div className="flex justify-between items-center pt-2 text-xs font-bold">
                      <span className="text-slate-900">إجمالي تكلفة المكونات (BOM Cost):</span>
                      <span className="text-emerald-600 font-mono text-sm font-black">{totalRecipeCost.toFixed(2)} SAR</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold shadow-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 active:scale-[0.98]"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Create Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h4 className="font-bold text-base text-slate-900">إضافة تصنيف جديد</h4>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-800 font-semibold mb-1">اسم التصنيف *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="مثال: مشروبات ساخنة"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-semibold mb-1">كود التصنيف</label>
                <input
                  type="text"
                  value={newCatCode}
                  onChange={e => setNewCatCode(e.target.value)}
                  placeholder="CAT-HOT"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold shadow-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md active:scale-[0.98]"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
