import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, requirePermission } from '../db/rls';

export const purchasesRouter = Router();

purchasesRouter.get('/suppliers', requirePermission('suppliers','view'), async (req: AuthenticatedRequest,res)=>{
  let q=supabase.from('suppliers').select('*').order('name'); if(req.activeBranchId)q=q.eq('branch_id',req.activeBranchId);
  const {data,error}=await q;if(error)return res.status(500).json({error:error.message});res.json({suppliers:data||[]});
});

purchasesRouter.post('/suppliers', requirePermission('suppliers','create'), async (req: AuthenticatedRequest,res)=>{
  const b=req.body;if(!b.name)return res.status(400).json({error:'اسم المورد مطلوب'});
  const {data,error}=await supabase.from('suppliers').insert({name:b.name,name_en:b.nameEn||null,phone:b.phone||null,email:b.email||null,address:b.address||null,tax_number:b.taxNumber||null,balance:0,notes:b.notes||null,branch_id:b.branchId||req.activeBranchId}).select().single();
  if(error)return res.status(500).json({error:error.message});res.status(201).json({success:true,supplier:data});
});

purchasesRouter.get('/invoices', requirePermission('purchases','view'), async (req: AuthenticatedRequest,res)=>{
  let q=supabase.from('purchases').select('*, suppliers(name), purchase_items(*)').order('created_at',{ascending:false});
  if(req.activeBranchId)q=q.eq('branch_id',req.activeBranchId);if(req.query.supplierId)q=q.eq('supplier_id',req.query.supplierId);if(req.query.status)q=q.eq('status',req.query.status);
  const {data,error}=await q;if(error)return res.status(500).json({error:error.message});res.json({invoices:data||[]});
});

purchasesRouter.post('/invoices', requirePermission('purchases','create'), async (req: AuthenticatedRequest,res)=>{
  const b=req.body,items=Array.isArray(b.items)?b.items:[];const branchId=b.branchId||req.activeBranchId;
  if(!branchId||!b.warehouseId||!items.length)return res.status(400).json({error:'الفرع والمخزن والأصناف مطلوبة'});
  const subtotal=items.reduce((s:any,i:any)=>s+Number(i.quantity)*Number(i.unitCost??i.cost??0),0);
  const {data:purchase,error}=await supabase.from('purchases').insert({invoice_number:b.invoiceNumber||('PUR-'+Date.now()),supplier_id:b.supplierId||null,branch_id:branchId,warehouse_id:b.warehouseId,buyer_id:req.user?.id||null,subtotal,total:subtotal,paid_amount:Number(b.paidAmount||0),payment_method:b.paymentMethod||'cash',status:'received',notes:b.notes||null}).select().single();
  if(error)return res.status(500).json({error:error.message});
  const rows=items.map((i:any)=>({purchase_id:purchase.id,product_id:i.productId||null,raw_material_id:i.rawMaterialId||null,unit_name:i.unitName||'unit',quantity:Number(i.quantity),unit_cost:Number(i.unitCost??i.cost??0),total:Number(i.quantity)*Number(i.unitCost??i.cost??0),received_quantity:Number(i.quantity)}));
  const {error:ie}=await supabase.from('purchase_items').insert(rows);if(ie)return res.status(500).json({error:ie.message});
  for(const i of items){if(!i.productId)continue;const {data:inv}=await supabase.from('inventory').select('*').eq('product_id',i.productId).eq('warehouse_id',b.warehouseId).maybeSingle();const q=Number(i.quantity);if(inv)await supabase.from('inventory').update({quantity:Number(inv.quantity)+q,updated_at:new Date().toISOString()}).eq('id',inv.id);else await supabase.from('inventory').insert({product_id:i.productId,warehouse_id:b.warehouseId,branch_id:branchId,quantity:q});await supabase.from('inventory_movements').insert({product_id:i.productId,warehouse_id:b.warehouseId,branch_id:branchId,movement_type:'purchase',quantity:q,reference_id:purchase.id,notes:purchase.invoice_number});}
  res.status(201).json({success:true,purchase});
});
