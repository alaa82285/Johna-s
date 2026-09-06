import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, requirePermission } from '../db/rls';

export const productsRouter = Router();

productsRouter.get('/', requirePermission('products','view'), async (req: AuthenticatedRequest, res) => {
  const { type, categoryId, search, branchId } = req.query;
  let q = supabase.from('products').select('*, categories(name)').order('name');
  if (branchId || req.activeBranchId) q = q.eq('branch_id', branchId || req.activeBranchId);
  if (type) q = q.eq('product_type', type);
  if (categoryId) q = q.eq('category_id', categoryId);
  if (search) q = q.or('name.ilike.%'+search+'%,sku.ilike.%'+search+'%,barcode.ilike.%'+search+'%');
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data || [] });
});

productsRouter.get('/:id', requirePermission('products','view'), async (req, res) => {
  const { data, error } = await supabase.from('products').select('*, categories(name)').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'المنتج غير موجود' });
  res.json({ product: data });
});

productsRouter.post('/', requirePermission('products','create'), async (req: AuthenticatedRequest, res) => {
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: 'اسم المنتج مطلوب' });
  const payload = {
    name: b.name, name_en: b.nameEn || null, sku: b.sku || null, barcode: b.barcode || null,
    category_id: b.categoryId || null, description: b.description || null,
    cost_price: Number(b.costPrice || 0), sale_price: Number(b.sellingPrice ?? b.salePrice ?? 0),
    low_stock_threshold: Number(b.minStockLevel ?? b.minStock ?? 0),
    product_type: b.type || b.productType || 'standard', branch_id: b.branchId || req.activeBranchId,
    is_active: b.isActive !== false
  };
  const { data, error } = await supabase.from('products').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  if (Number(b.initialStock || 0) > 0 && b.warehouseId) {
    const { error: invError } = await supabase.from('inventory').insert({
      product_id: data.id, warehouse_id: b.warehouseId, branch_id: payload.branch_id,
      quantity: Number(b.initialStock)
    });
    if (invError) return res.status(500).json({ error: invError.message });
  }
  res.status(201).json({ success: true, product: data });
});

productsRouter.put('/:id', requirePermission('products','edit'), async (req, res) => {
  const b = req.body;
  const patch: any = {};
  const map: any = { name:'name', nameEn:'name_en', sku:'sku', barcode:'barcode', categoryId:'category_id', description:'description', costPrice:'cost_price', sellingPrice:'sale_price', salePrice:'sale_price', minStockLevel:'low_stock_threshold', isActive:'is_active', type:'product_type' };
  for (const [k,v] of Object.entries(map)) if (b[k] !== undefined) patch[v] = b[k];
  const { data, error } = await supabase.from('products').update(patch).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, product: data });
});

productsRouter.delete('/:id', requirePermission('products','delete'), async (req, res) => {
  const { error } = await supabase.from('products').update({ is_active: false }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});
