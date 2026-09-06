import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest } from '../db/rls';
export const settingsRouter=Router();
settingsRouter.get('/tenant',async(req:AuthenticatedRequest,res)=>{if(!req.tenant)return res.status(401).json({error:'Unauthorized'});res.json({success:true,tenant:req.tenant,settings:req.tenant.settings||{}});});
settingsRouter.put('/tenant',async(req:AuthenticatedRequest,res)=>{if(!req.tenant)return res.status(401).json({error:'Unauthorized'});const b=req.body,patch:any={};const m:any={name:'name',legalName:'legal_name',taxNumber:'tax_number',currency:'currency',phone:'phone',email:'email',address:'address'};for(const[k,v]of Object.entries(m))if(b[k]!==undefined)patch[v]=b[k];const {data,error}=await supabase.from('organizations').update(patch).eq('id',req.tenant.id).select().single();if(error)return res.status(500).json({error:error.message});res.json({success:true,tenant:data,settings:data.settings||{}});});
