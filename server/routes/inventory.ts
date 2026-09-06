import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, requirePermission } from '../db/rls';

export const inventoryRouter = Router();

inventoryRouter.get('/stocks', requirePermission('inventory','view'), async (req: AuthenticatedRequest,res)=>{
  req.url=req.url.replace('/stocks','/levels');
  let q=supabase.from('inventory').select('*, products(*), warehouses(*)'); const warehouseId=req.query.warehouseId as string|undefined; const branchId=(req.query.branchId as string|undefined)||req.activeBranchId; if(warehouseId)q=q.eq('warehouse_id',warehouseId);else if(branchId)q=q.eq('branch_id',branchId); const {data,error}=await q;if(error)return res.status(500).json({error:error.message});res.json({stockLevels:(data||[]).map((x:any)=>({id:x.id,productId:x.product_id,productName:x.products?.name,productSku:x.products?.sku,warehouseId:x.warehouse_id,warehouseName:x.warehouses?.name,quantity:Number(x.quantity||0),minStockLevel:Number(x.products?.low_stock_threshold||0),unitCost:Number(x.products?.cost_price||0),totalValue:Number(x.quantity||0)*Number(x.products?.cost_price||0),isLowStock:Number(x.quantity||0)<=Number(x.products?.low_stock_threshold||0),updatedAt:x.updated_at}))});
});

inventoryRouter.get('/levels', requirePermission('inventory','view'), async (req: AuthenticatedRequest,res)=>{
  const warehouseId=req.query.warehouseId as string|undefined;
  const branchId=(req.query.branchId as string|undefined)||req.activeBranchId;
  let q=supabase.from('inventory').select('*, products(*), warehouses(*)');
  if(warehouseId) q=q.eq('warehouse_id',warehouseId); else if(branchId) q=q.eq('branch_id',branchId);
  const {data,error}=await q;
  if(error)return res.status(500).json({error:error.message});
  let levels=(data||[]).map((x:any)=>({
    id:x.id,productId:x.product_id,productName:x.products?.name,productSku:x.products?.sku,
    warehouseId:x.warehouse_id,warehouseName:x.warehouses?.name,branchId:x.branch_id,
    quantity:Number(x.quantity||0),minStockLevel:Number(x.products?.low_stock_threshold||0),
    unitCost:Number(x.products?.cost_price||0),totalValue:Number(x.quantity||0)*Number(x.products?.cost_price||0),
    isLowStock:Number(x.quantity||0)<=Number(x.products?.low_stock_threshold||0),updatedAt:x.updated_at
  }));
  if(req.query.lowStockOnly==='true')levels=levels.filter((x:any)=>x.isLowStock);
  res.json({stockLevels:levels});
});

inventoryRouter.get('/movements', requirePermission('inventory','view'), async (req: AuthenticatedRequest,res)=>{
  let q=supabase.from('inventory_movements').select('*, products(name,sku), warehouses(name)').order('created_at',{ascending:false}).limit(Number(req.query.limit||300));
  if(req.query.warehouseId)q=q.eq('warehouse_id',req.query.warehouseId);
  if(req.query.productId)q=q.eq('product_id',req.query.productId);
  if(req.query.type)q=q.eq('movement_type',req.query.type);
  if(req.activeBranchId)q=q.eq('branch_id',req.activeBranchId);
  const {data,error}=await q;if(error)return res.status(500).json({error:error.message});
  res.json({movements:data||[]});
});

inventoryRouter.post('/adjust', requirePermission('inventory','edit'), async (req: AuthenticatedRequest,res)=>{
  const {productId,warehouseId,quantity,notes}=req.body;
  if(!productId||!warehouseId||quantity===undefined)return res.status(400).json({error:'المنتج والمخزن والكمية مطلوبة'});
  const branchId=req.activeBranchId||req.body.branchId;
  const {data:existing,error:findErr}=await supabase.from('inventory').select('*').eq('product_id',productId).eq('warehouse_id',warehouseId).maybeSingle();
  if(findErr)return res.status(500).json({error:findErr.message});
  const payload:any={product_id:productId,warehouse_id:warehouseId,branch_id:branchId,quantity:Number(quantity),updated_at:new Date().toISOString()};
  const result=existing?await supabase.from('inventory').update(payload).eq('id',existing.id).select().single():await supabase.from('inventory').insert(payload).select().single();
  if(result.error)return res.status(500).json({error:result.error.message});
  await supabase.from('inventory_movements').insert({product_id:productId,warehouse_id:warehouseId,branch_id:branchId,movement_type:'adjustment',quantity:Number(quantity)-(Number(existing?.quantity)||0),notes:notes||'Inventory adjustment'});
  res.json({success:true,inventory:result.data});
});
