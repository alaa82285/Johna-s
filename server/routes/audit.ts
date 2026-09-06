import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
export const auditRouter=Router();
auditRouter.get('/',requirePermission('audit_logs','view'),async(req:AuthenticatedRequest,res)=>{
 let q=supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(Number(req.query.limit||300));
 if(req.tenant?.id)q=q.eq('organization_id',req.tenant.id);
 if(req.query.module)q=q.eq('module',req.query.module);
 if(req.query.status)q=q.eq('status',req.query.status);
 const {data,error}=await q;if(error)return res.status(500).json({error:error.message});
 const search=String(req.query.search||'').toLowerCase();const logs=search?(data||[]).filter((x:any)=>JSON.stringify(x).toLowerCase().includes(search)):data||[];
 res.json({logs});
});
