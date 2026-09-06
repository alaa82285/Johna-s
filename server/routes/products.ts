import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
import { Product, Category, Unit, RecipeItem } from '../types';

export const productsRouter = Router();

// GET all products for active tenant
productsRouter.get('/', requirePermission('products', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { type, categoryId, search } = req.query;

  let list = state.products.filter(p => p.tenantId === tenantId);

  if (type) {
    list = list.filter(p => p.type === type);
  }
  if (categoryId) {
    list = list.filter(p => p.categoryId === categoryId);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      (p.barcode && p.barcode.includes(q))
    );
  }

  res.json({ products: list });
});

// GET single product
productsRouter.get('/:id', requirePermission('products', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const product = state.products.find(p => p.id === req.params.id && p.tenantId === tenantId);
  if (!product) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }
  res.json({ product });
});

// Create product (Standard, Recipe_based, Raw_material)
productsRouter.post('/', requirePermission('products', 'create'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const state = db.getState();
    const {
      name,
      nameEn,
      sku,
      barcode,
      categoryId,
      type,
      unitId,
      sellingPrice,
      costPrice,
      minStockLevel,
      hasRecipe,
      recipe,
      recipeNotes,
      initialStock,
      warehouseId
    } = req.body;

    if (!name || !categoryId || !unitId) {
      return res.status(400).json({ error: 'الاسم والتصنيف والوحدة حقول مطلوبة' });
    }

    const category = state.categories.find(c => c.id === categoryId && c.tenantId === tenantId);
    const unit = state.units.find(u => u.id === unitId && u.tenantId === tenantId);

    // Auto-generate SKU if empty
    const finalSku = sku || `${type === 'raw_material' ? 'RAW' : type === 'recipe_based' ? 'REC' : 'STD'}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Calculate recipe cost if recipe provided
    let calculatedCost = Number(costPrice || 0);
    let recipeItems: RecipeItem[] = [];

    if (hasRecipe && Array.isArray(recipe) && recipe.length > 0) {
      calculatedCost = 0;
      recipeItems = recipe.map((r: any) => {
        const rawMat = state.products.find(p => p.id === r.rawMaterialId && p.tenantId === tenantId);
        const itemCost = Number(r.unitCost ?? rawMat?.costPrice ?? 0);
        const qty = Number(r.quantity || 0);
        const tot = qty * itemCost;
        calculatedCost += tot;
        return {
          id: `rec_item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          rawMaterialId: r.rawMaterialId,
          rawMaterialName: rawMat?.name || r.rawMaterialName || 'مادة خام',
          quantity: qty,
          unitId: r.unitId || rawMat?.unitId || unitId,
          unitSymbol: r.unitSymbol || rawMat?.unitSymbol || '',
          unitCost: itemCost,
          totalCost: tot
        };
      });
    }

    const product: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      name,
      nameEn,
      sku: finalSku,
      barcode,
      categoryId,
      categoryName: category?.name,
      type: type || 'standard',
      unitId,
      unitSymbol: unit?.symbol,
      sellingPrice: Number(sellingPrice || 0),
      costPrice: calculatedCost,
      minStockLevel: Number(minStockLevel || 0),
      isActive: true,
      hasRecipe: Boolean(hasRecipe),
      recipe: recipeItems,
      recipeNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.products.push(product);

    // Initial stock injection if specified
    if (initialStock && Number(initialStock) > 0) {
      const targetWarehouseId = warehouseId || db.getWarehouses(tenantId)[0]?.id;
      if (targetWarehouseId) {
        db.setProductStock(tenantId, product.id, targetWarehouseId, Number(initialStock), calculatedCost);
        state.inventoryMovements.push({
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tenantId,
          branchId: db.getBranches(tenantId)[0]?.id || '',
          warehouseId: targetWarehouseId,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          type: 'initial_balance',
          referenceType: 'manual',
          referenceId: product.id,
          referenceNumber: 'INITIAL-STOCK',
          quantityChange: Number(initialStock),
          quantityBefore: 0,
          quantityAfter: Number(initialStock),
          unitCost: calculatedCost,
          totalCost: Number(initialStock) * calculatedCost,
          notes: 'رصيد مخزون افتتاحي عند تعريف الصنف',
          performedByUserId: req.user?.id || 'sys',
          performedByUserName: req.user?.fullName || 'Manager',
          createdAt: new Date().toISOString()
        });
      }
    }

    db.logAudit({
      tenantId,
      userId: req.user?.id || 'sys',
      userName: req.user?.fullName || 'Manager',
      userRole: req.userRole?.name || 'Manager',
      action: 'product.create',
      module: 'products',
      entityType: 'product',
      entityId: product.id,
      entityNumber: product.sku,
      description: `إضافة منتج جديد: [${product.name}] نوع (${product.type}) بسعر بيع ${product.sellingPrice}`,
      status: 'success'
    });

    db.persist();

    res.status(201).json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error creating product' });
  }
});

// Update product
productsRouter.put('/:id', requirePermission('products', 'edit'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const state = db.getState();
    const product = state.products.find(p => p.id === req.params.id && p.tenantId === tenantId);

    if (!product) {
      return res.status(404).json({ error: 'المنتج غير موجود' });
    }

    const {
      name,
      nameEn,
      sku,
      barcode,
      categoryId,
      type,
      unitId,
      sellingPrice,
      costPrice,
      minStockLevel,
      isActive,
      hasRecipe,
      recipe,
      recipeNotes
    } = req.body;

    const category = categoryId ? state.categories.find(c => c.id === categoryId && c.tenantId === tenantId) : undefined;
    const unit = unitId ? state.units.find(u => u.id === unitId && u.tenantId === tenantId) : undefined;

    if (name) product.name = name;
    if (nameEn !== undefined) product.nameEn = nameEn;
    if (sku) product.sku = sku;
    if (barcode !== undefined) product.barcode = barcode;
    if (categoryId) {
      product.categoryId = categoryId;
      product.categoryName = category?.name || product.categoryName;
    }
    if (type) product.type = type;
    if (unitId) {
      product.unitId = unitId;
      product.unitSymbol = unit?.symbol || product.unitSymbol;
    }
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (minStockLevel !== undefined) product.minStockLevel = Number(minStockLevel);
    if (isActive !== undefined) product.isActive = Boolean(isActive);
    if (recipeNotes !== undefined) product.recipeNotes = recipeNotes;

    // Recalculate BOM recipe if supplied
    if (hasRecipe !== undefined) {
      product.hasRecipe = Boolean(hasRecipe);
      if (product.hasRecipe && Array.isArray(recipe)) {
        let calcCost = 0;
        product.recipe = recipe.map((r: any) => {
          const rawMat = state.products.find(p => p.id === r.rawMaterialId && p.tenantId === tenantId);
          const itemCost = Number(r.unitCost ?? rawMat?.costPrice ?? 0);
          const qty = Number(r.quantity || 0);
          const tot = qty * itemCost;
          calcCost += tot;
          return {
            id: r.id || `rec_item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            rawMaterialId: r.rawMaterialId,
            rawMaterialName: rawMat?.name || r.rawMaterialName,
            quantity: qty,
            unitId: r.unitId || rawMat?.unitId,
            unitSymbol: r.unitSymbol || rawMat?.unitSymbol || '',
            unitCost: itemCost,
            totalCost: tot
          };
        });
        product.costPrice = calcCost;
      }
    } else if (costPrice !== undefined) {
      product.costPrice = Number(costPrice);
    }

    product.updatedAt = new Date().toISOString();

    db.logAudit({
      tenantId,
      userId: req.user?.id || 'sys',
      userName: req.user?.fullName || 'Manager',
      userRole: req.userRole?.name || 'Manager',
      action: 'product.update',
      module: 'products',
      entityType: 'product',
      entityId: product.id,
      entityNumber: product.sku,
      description: `تحديث بيانات المنتج: [${product.name}]`,
      status: 'success'
    });

    db.persist();

    res.json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error updating product' });
  }
});

// Delete product
productsRouter.delete('/:id', requirePermission('products', 'delete'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const index = state.products.findIndex(p => p.id === req.params.id && p.tenantId === tenantId);

  if (index === -1) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }

  const deleted = state.products.splice(index, 1)[0];

  db.logAudit({
    tenantId,
    userId: req.user?.id || 'sys',
    userName: req.user?.fullName || 'Manager',
    userRole: req.userRole?.name || 'Manager',
    action: 'product.delete',
    module: 'products',
    entityType: 'product',
    entityId: deleted.id,
    entityNumber: deleted.sku,
    description: `حذف المنتج: [${deleted.name}]`,
    status: 'warning'
  });

  db.persist();

  res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
});

// Categories & Units CRUD
productsRouter.get('/meta/categories', (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const categories = db.getState().categories.filter(c => c.tenantId === tenantId).sort((a, b) => a.sortOrder - b.sortOrder);
  res.json({ categories });
});

productsRouter.post('/meta/categories', requirePermission('products', 'create'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { name, nameEn, color, icon, sortOrder } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم التصنيف مطلوب' });

  const cat: Category = {
    id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    tenantId,
    name,
    nameEn,
    color: color || '#3b82f6',
    icon: icon || 'Tag',
    sortOrder: Number(sortOrder || state.categories.length + 1)
  };
  state.categories.push(cat);
  db.persist();
  res.status(201).json({ success: true, category: cat });
});

productsRouter.get('/meta/units', (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const units = db.getState().units.filter(u => u.tenantId === tenantId);
  res.json({ units });
});

productsRouter.post('/meta/units', requirePermission('products', 'create'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { name, symbol, isDecimalAllowed } = req.body;
  if (!name || !symbol) return res.status(400).json({ error: 'اسم الوحدة ورمزها مطلوبان' });

  const unit: Unit = {
    id: `unit_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    tenantId,
    name,
    symbol,
    isDecimalAllowed: Boolean(isDecimalAllowed)
  };
  state.units.push(unit);
  db.persist();
  res.status(201).json({ success: true, unit });
});
