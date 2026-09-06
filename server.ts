import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db/store';
import { seedInitialDataIfEmpty } from './server/db/seed';
import { authAndRlsMiddleware } from './server/db/rls';
import { authRouter } from './server/routes/auth';
import { posRouter } from './server/routes/pos';
import { productsRouter } from './server/routes/products';
import { inventoryRouter } from './server/routes/inventory';
import { manufacturingRouter } from './server/routes/manufacturing';
import { purchasesRouter } from './server/routes/purchases';
import { branchesRouter } from './server/routes/branches';
import { customersRouter } from './server/routes/customers';
import { usersRouter } from './server/routes/users';
import { reportsRouter } from './server/routes/reports';
import { auditRouter } from './server/routes/audit';
import { securityTestRouter } from './server/routes/security-test';
import { settingsRouter } from './server/routes/settings';
import { printersRouter } from './server/routes/printers';

async function startServer() {
  // 1. Initialize DB and seed demo data if empty
  seedInitialDataIfEmpty();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Premier POS/ERP Multi-Tenant Server',
      timestamp: new Date().toISOString()
    });
  });

  // Public/Auth routes (login, register tenant, tenants list)
  app.use('/api/auth', authRouter);

  // Apply Auth & RLS Middleware to all other API routes
  app.use('/api', authAndRlsMiddleware);

  // Protected Business Logic Routes
  app.use('/api/pos', posRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/manufacturing', manufacturingRouter);
  app.use('/api/purchases', purchasesRouter);
  app.use('/api/branches', branchesRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/security', securityTestRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/printers', printersRouter);

  // Vite development middleware vs production static bundle
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Premier POS/ERP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
