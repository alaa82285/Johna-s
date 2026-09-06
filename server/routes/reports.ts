import { Router } from 'express';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, requirePermission } from '../db/rls';

export const reportsRouter = Router();

reportsRouter.get('/dashboard-kpis', requirePermission('reports','view'), async (req: AuthenticatedRequest,res)=>{
  const branchId=(req.query.branchId as string)||req.activeBranchId;
  let salesQ=supabase.from('sales').select('*').eq('status','completed');
  let purchasesQ=supabase.from('purchases').select('*').eq('status','received');
  if(branchId&&branchId!=='all'){salesQ=salesQ.eq('branch_id',branchId);purchasesQ=purchasesQ.eq('branch_id',branchId);}
  const [{data:sales,error:sErr},{data:purchases,error:pErr}]=await Promise.all([salesQ,purchasesQ]);
  if(sErr||pErr)return res.status(500).json({error:(sErr||pErr)?.message});
  const today=new Date().toISOString().slice(0,10);
  const todaySales=(sales||[]).filter((s:any)=>String(s.created_at).startsWith(today));
  const totalSalesRevenue=(sales||[]).reduce((a:number,s:any)=>a+Number(s.total||0),0);
  const todaySalesRevenue=todaySales.reduce((a:number,s:any)=>a+Number(s.total||0),0);
  const totalPurchasesAmount=(purchases||[]).reduce((a:number,p:any)=>a+Number(p.total||0),0);
  res.json({totalSalesRevenue,todaySalesRevenue,todaySalesCount:todaySales.length,averageTicket:todaySales.length?todaySalesRevenue/todaySales.length:0,totalPurchasesAmount,grossProfit:totalSalesRevenue-totalPurchasesAmount});
});

reportsRouter.get('/sales', requirePermission('reports','view'), async (req: AuthenticatedRequest,res)=>{
  let q=supabase.from('sales').select('*, sale_items(*), customers(name)').order('created_at',{ascending:false}).limit(Number(req.query.limit||500));
  if(req.activeBranchId)q=q.eq('branch_id',req.activeBranchId);
  const {data,error}=await q;if(error)return res.status(500).json({error:error.message});res.json({sales:data||[]});
});
