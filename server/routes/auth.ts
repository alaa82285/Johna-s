import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest } from '../db/rls';

export const authRouter = Router();

authRouter.get('/tenants-list', async (_req,res)=>{
  const {data,error}=await supabase.from('organizations').select('*').order('name');
  if(error)return res.status(500).json({error:error.message});
  res.json({tenants:data||[]});
});

authRouter.post('/login', async (req,res)=>{
  const {username,pinCode}=req.body;
  if(!username)return res.status(400).json({error:'اسم المستخدم مطلوب'});
  const {data:user,error}=await supabase.from('users').select('*').or('username.eq.'+username+',email.eq.'+username).eq('is_active',true).maybeSingle();
  if(error)return res.status(500).json({error:error.message});
  if(!user)return res.status(401).json({error:'اسم المستخدم غير صحيح أو الحساب غير نشط'});
  if(pinCode&&user.pin_code&&user.pin_code!==pinCode)return res.status(401).json({error:'رمز الدخول PIN غير صحيح'});
  await supabase.from('users').update({last_login_at:new Date().toISOString()}).eq('id',user.id);
  const {data:branches}=await supabase.from('branches').select('*').eq('organization_id',user.organization_id);
  const tenant=(await supabase.from('organizations').select('*').eq('id',user.organization_id).maybeSingle()).data;
  res.json({success:true,tenant,user,role:{name:user.role||'User'},allowedBranches:branches||[]});
});

authRouter.get('/me', async (req:AuthenticatedRequest,res)=>{
  if(!req.user)return res.status(401).json({error:'Not authenticated'});
  const branchId=req.activeBranchId;
  const [branches,warehouses]=await Promise.all([
    supabase.from('branches').select('*').eq('organization_id',req.tenant?.id),
    branchId?supabase.from('warehouses').select('*').eq('branch_id',branchId):supabase.from('warehouses').select('*')
  ]);
  res.json({tenant:req.tenant,user:req.user,role:req.userRole,branches:branches.data||[],warehouses:warehouses.data||[],activeShifts:[]});
});
