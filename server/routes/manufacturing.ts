import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, requirePermission } from '../db/rls';

export const manufacturingRouter = Router();

manufacturingRouter.get('/orders', requirePermission('manufacturing','view'), async (req: AuthenticatedRequest,res)=>{
  let q=supabase.from('production_orders').select('*, products(name)').order('created_at',{ascending:false});
  if(req.query.status)q=q.eq('status',req.query.status);
  if(req.query.branchId||req.activeBranchId)q=q.eq('branch_id',req.query.branchId||req.activeBranchId);
  const {data,error}=await q;if(error)return res.status(500).json({error:error.message});res.json({workOrders:data||[]});
});

manufacturingRouter.post('/orders', requirePermission('manufacturing','create'), async (req: AuthenticatedRequest,res)=>{
  const b=req.body;const branchId=b.branchId||req.activeBranchId;const qty=Number(b.plannedQuantity||b.quantity||0);
  if(!b.targetProductId||!branchId||qty<=0)return res.status(400).json({error:'المنتج والفرع والكمية الموجبة مطلوبة'});
  const warehouseId=b.targetWarehouseId||b.warehouseId||b.sourceWarehouseId;
  if(!warehouseId)return res.status(400).json({error:'المخزن مطلوب'});
  const {data,error}=await supabase.from('production_orders').insert({order_number:'MFG-'+Date.now(),product_id:b.targetProductId,branch_id:branchId,warehouse_id:warehouseId,quantity:qty,status:b.autoExecute?'completed':'planned',total_cost:Number(b.totalCost||0),planned_at:new Date().toISOString(),completed_at:b.autoExecute?new Date().toISOString():null,notes:b.notes||null,created_by:req.user?.id||null}).select().single();
  if(error)return res.status(500).json({error:error.message});
  if(b.autoExecute){const {data:inv}=await supabase.from('inventory').select('*').eq('product_id',b.targetProductId).eq('warehouse_id',warehouseId).maybeSingle();if(inv)await supabase.from('inventory').update({quantity:Number(inv.quantity)+qty,updated_at:new Date().toISOString()}).eq('id',inv.id);else await supabase.from('inventory').insert({product_id:b.targetProductId,warehouse_id:warehouseId,branch_id:branchId,quantity:qty});await supabase.from('inventory_movements').insert({product_id:b.targetProductId,warehouse_id:warehouseId,branch_id:branchId,movement_type:'production',quantity:qty,reference_id:data.id,notes:data.order_number});}
  res.status(201).json({success:true,workOrder:data});
});

manufacturingRouter.post('/orders/:id/execute', requirePermission('manufacturing','approve'), async (_req,res)=>{
  const {data:order,error}=await supabase.from('production_orders').select('*').eq('id',_req.params.id).single();if(error)return res.status(404).json({error:'أمر التصنيع غير موجود'});
  const {data:inv}=await supabase.from('inventory').select('*').eq('product_id',order.product_id).eq('warehouse_id',order.warehouse_id).maybeSingle();
  if(inv)await supabase.from('inventory').update({quantity:Number(inv.quantity)+Number(order.quantity),updated_at:new Date().toISOString()}).eq('id',inv.id);else await supabase.from('inventory').insert({product_id:order.product_id,warehouse_id:order.warehouse_id,branch_id:order.branch_id,quantity:order.quantity});
  await supabase.from('inventory_movements').insert({product_id:order.product_id,warehouse_id:order.warehouse_id,branch_id:order.branch_id,movement_type:'production',quantity:order.quantity,reference_id:order.id,notes:order.order_number});
  const {data,error:updateError}=await supabase.from('production_orders').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',order.id).select().single();if(updateError)return res.status(500).json({error:updateError.message});
  res.json({success:true,workOrder:data});
});
