import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, requirePermission } from '../db/rls';

export const customersRouter = Router();

customersRouter.get('/', requirePermission('customers','view'), async (req: AuthenticatedRequest, res) => {
  let q = supabase.from('customers').select('*').order('name');
  if (req.activeBranchId) q = q.eq('branch_id', req.activeBranchId);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ customers: data || [] });
});

customersRouter.post('/', requirePermission('customers','create'), async (req: AuthenticatedRequest, res) => {
  const b=req.body;
  if (!b.name || !b.phone) return res.status(400).json({ error:'اسم العميل ورقم الهاتف مطلوبان' });
  const { data, error } = await supabase.from('customers').insert({
    name:b.name,name_en:b.nameEn||null,phone:b.phone,email:b.email||null,address:b.address||null,
    tax_number:b.taxNumber||null,balance:Number(b.currentBalance||0),notes:b.notes||null,
    branch_id:b.branchId||req.activeBranchId
  }).select().single();
  if(error) return res.status(500).json({error:error.message});
  res.status(201).json({success:true,customer:data});
});

customersRouter.post('/:id/payment', requirePermission('customers','edit'), async (req,res)=>{
  const amount=Number(req.body.amount||0); if(amount<=0)return res.status(400).json({error:'المبلغ يجب أن يكون أكبر من الصفر'});
  const {data:c,error:e}=await supabase.from('customers').select('balance').eq('id',req.params.id).single();
  if(e)return res.status(404).json({error:'العميل غير موجود'});
  const {data,error}=await supabase.from('customers').update({balance:Math.max(0,Number(c.balance||0)-amount)}).eq('id',req.params.id).select().single();
  if(error)return res.status(500).json({error:error.message});
  res.json({success:true,customer:data});
});
