import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, requirePermission } from '../db/rls';

export const branchesRouter = Router();

branchesRouter.get('/', requirePermission('branches','view'), async (req: AuthenticatedRequest, res) => {
  const organizationId = req.tenant?.id;
  let q = supabase.from('branches').select('*').order('name');
  if (organizationId) q = q.eq('organization_id', organizationId);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ branches: data || [] });
});

branchesRouter.post('/', requirePermission('branches','create'), async (req: AuthenticatedRequest, res) => {
  const { name, nameEn, address, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الفرع مطلوب' });
  const { data: branch, error } = await supabase.from('branches').insert({
    name, name_en: nameEn || null, address: address || null, phone: phone || null,
    organization_id: req.tenant?.id, is_active: true
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  const { data: warehouse, error: whError } = await supabase.from('warehouses').insert({
    name: 'مخزن ' + name, branch_id: branch.id, is_active: true
  }).select().single();
  if (whError) return res.status(500).json({ error: whError.message });
  res.status(201).json({ success: true, branch, warehouse });
});

branchesRouter.get('/warehouses', requirePermission('warehouses','view'), async (req: AuthenticatedRequest, res) => {
  let q = supabase.from('warehouses').select('*').order('name');
  const branchId = req.query.branchId || req.activeBranchId;
  if (branchId) q = q.eq('branch_id', branchId);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ warehouses: data || [] });
});

branchesRouter.post('/warehouses', requirePermission('warehouses','create'), async (req: AuthenticatedRequest, res) => {
  const { name, branchId, address, warehouseType } = req.body;
  if (!name || !branchId) return res.status(400).json({ error: 'اسم المخزن والفرع مطلوبان' });
  const { data, error } = await supabase.from('warehouses').insert({
    name, branch_id: branchId, address: address || null, warehouse_type: warehouseType || 'general', is_active: true
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, warehouse: data });
});
