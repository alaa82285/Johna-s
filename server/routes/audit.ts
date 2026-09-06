import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';

export const auditRouter = Router();

// GET Audit Logs
auditRouter.get('/', requirePermission('audit_logs', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const { module, status, search, limit } = req.query;

  let logs = db.getState().auditLogs.filter(l => l.tenantId === tenantId);

  if (module) {
    logs = logs.filter(l => l.module === module);
  }
  if (status) {
    logs = logs.filter(l => l.status === status);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    logs = logs.filter(l => 
      l.description.toLowerCase().includes(q) || 
      l.userName.toLowerCase().includes(q) || 
      l.action.toLowerCase().includes(q) ||
      (l.entityNumber && l.entityNumber.toLowerCase().includes(q))
    );
  }

  const maxItems = limit ? parseInt(limit as string, 10) : 300;
  res.json({ logs: logs.slice(0, maxItems) });
});
