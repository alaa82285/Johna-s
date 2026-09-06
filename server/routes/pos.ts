import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, requirePermission } from '../db/rls';

export const posRouter = Router();

posRouter.get('/init', async (req: AuthenticatedRequest,res)=>{
  const branchId=(req.query.branchId as string)||req.activeBranchId;
  const [products,categories,customers,warehouses]=await Promise.all([
    supabase.from('products').select('*').eq('is_active',true).eq('branch_id',branchId),
    supabase.from('categories').select('*').eq('branch_id',branchId).order('name'),
    supabase.from('customers').select('*').eq('branch_id',branchId).order('name'),
    supabase.from('warehouses').select('*').eq('branch_id',branchId).eq('is_active',true)
  ]);
  const warehouse=(warehouses.data||[])[0];
  const inventory=warehouse?await supabase.from('inventory').select('*').eq('warehouse_id',warehouse.id):{data:[],error:null};
  const errors=[products.error,categories.error,customers.error,warehouses.error,inventory.error].filter(Boolean);
  if(errors.length)return res.status(500).json({error:(errors[0] as any).message});
  res.json({products:products.data||[],categories:categories.data||[],customers:customers.data||[],warehouses:warehouses.data||[],currentWarehouse:warehouse,stockLevels:inventory.data||[]});
});

posRouter.post('/sale', requirePermission('pos','create'), async (req: AuthenticatedRequest,res)=>{
  const b=req.body; const branchId=b.branchId||req.activeBranchId;
  const warehouseId=b.warehouseId;
  const items=Array.isArray(b.items)?b.items:[];
  if(!branchId||!warehouseId||!items.length)return res.status(400).json({error:'الفرع والمخزن والأصناف مطلوبة'});
  const subtotal=items.reduce((s:any,i:any)=>s+Number(i.quantity||0)*Number(i.unitPrice??i.price??0),0);
  const discount=Number(b.discountAmount||b.discountValue||0);
  const total=Math.max(0,subtotal-discount);
  const invoiceNumber='SAL-'+Date.now();
  const {data:sale,error}=await supabase.from('sales').insert({
    invoice_number:invoiceNumber,branch_id:branchId,warehouse_id:warehouseId,customer_id:b.customerId||null,
    cashier_id:req.user?.id||null,subtotal,discount_amount:discount,discount_type:b.discountType||'amount',
    tax_amount:Number(b.taxAmount||0),total,paid_amount:Number(b.paidAmount??total),
    payment_method:b.paymentMethod||'cash',status:'completed',notes:b.notes||null
  }).select().single();
  if(error)return res.status(500).json({error:error.message});
  const saleItems=items.map((i:any)=>({sale_id:sale.id,product_id:i.productId,unit_name:i.unitName||'unit',quantity:Number(i.quantity),unit_price:Number(i.unitPrice??i.price??0),discount_amount:Number(i.discountAmount||0),total:Number(i.quantity)*Number(i.unitPrice??i.price??0)}));
  const {error:itemError}=await supabase.from('sale_items').insert(saleItems);
  if(itemError)return res.status(500).json({error:itemError.message});
  for(const i of items){
    const {data:inv,error:ie}=await supabase.from('inventory').select('*').eq('product_id',i.productId).eq('warehouse_id',warehouseId).maybeSingle();
    if(ie)return res.status(500).json({error:ie.message});
    const qty=Number(i.quantity);
    if(!inv||Number(inv.quantity)<qty)return res.status(400).json({error:'المخزون غير كافٍ للمنتج '+i.productId});
    const {error:ue}=await supabase.from('inventory').update({quantity:Number(inv.quantity)-qty,updated_at:new Date().toISOString()}).eq('id',inv.id);
    if(ue)return res.status(500).json({error:ue.message});
    await supabase.from('inventory_movements').insert({product_id:i.productId,warehouse_id:warehouseId,branch_id:branchId,movement_type:'sale',quantity:-qty,reference_id:sale.id,notes:invoiceNumber});
  }
  res.status(201).json({success:true,sale,invoiceNumber});
});
