import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
export const usersRouter=Router();

usersRouter.get('/',requirePermission('users','view'),async(req:AuthenticatedRequest,res)=>{
 let q=supabase.from('users').select('*').order('full_name');if(req.tenant?.id)q=q.eq('organization_id',req.tenant.id);
 const {data,error}=await q;if(error)return res.status(500).json({error:error.message});res.json({users:data||[]});
});
usersRouter.post('/',requirePermission('users','create'),async(req:AuthenticatedRequest,res)=>{
 const b=req.body;if(!b.username||!b.fullName)return res.status(400).json({error:'اسم المستخدم والاسم الكامل مطلوبان'});
 const {data,error}=await supabase.from('users').insert({organization_id:req.tenant?.id,username:b.username,email:b.email||null,full_name:b.fullName,phone:b.phone||null,role:b.role||b.roleName||'cashier',branch_id:b.branchId||req.activeBranchId,pin_code:b.pinCode||null,is_active:b.isActive!==false}).select().single();
 if(error)return res.status(500).json({error:error.message});res.status(201).json({success:true,user:data});
});
usersRouter.put('/:id',requirePermission('users','edit'),async(req,res)=>{
 const b=req.body;const patch:any={};const m:any={fullName:'full_name',email:'email',phone:'phone',role:'role',roleName:'role',branchId:'branch_id',pinCode:'pin_code',isActive:'is_active'};for(const[k,v]of Object.entries(m))if(b[k]!==undefined)patch[v]=b[k];
 const {data,error}=await supabase.from('users').update(patch).eq('id',req.params.id).select().single();if(error)return res.status(500).json({error:error.message});res.json({success:true,user:data});
});
usersRouter.get('/roles',requirePermission('users','view'),async(_req,res)=>res.json({roles:['admin','manager','cashier','salesperson']}));
