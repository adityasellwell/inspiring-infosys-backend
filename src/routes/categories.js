// Service Categories & Specific Filings CRUD Routes
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/categories — Public (loads dynamic categories + filings in GetQuote)
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: {
        filings: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error('[GET /api/categories]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/categories/all — Protected (returns active and inactive categories for Admin panel)
router.get('/all', requireAuth, async (req, res) => {
  try {
    const categories = await prisma.serviceCategory.findMany({
      include: {
        filings: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error('[GET /api/categories/all]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/categories — Protected (Admin adds category)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { id, title, desc, iconName, sortOrder, isActive } = req.body;

    if (!id || !title || !desc) {
      return res.status(400).json({ success: false, message: 'ID, Title, and Description are required' });
    }

    const category = await prisma.serviceCategory.create({
      data: {
        id: id.toLowerCase().trim(),
        title,
        desc,
        iconName: iconName ?? 'FiPackage',
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });

    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('[POST /api/categories]', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Category ID already exists' });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/categories/:id — Protected (Admin edits category)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, desc, iconName, sortOrder, isActive } = req.body;

    const existingCat = await prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!existingCat) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const updated = await prisma.serviceCategory.update({
      where: { id },
      data: {
        title: title ?? existingCat.title,
        desc: desc ?? existingCat.desc,
        iconName: iconName ?? existingCat.iconName,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existingCat.sortOrder,
        isActive: isActive !== undefined ? !!isActive : existingCat.isActive,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PUT /api/categories/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/categories/:id — Protected
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existingCat = await prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!existingCat) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await prisma.serviceCategory.delete({ where: { id } });
    return res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('[DELETE /api/categories/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Service Filings Endpoints (Protected CRUD under categories) ───

// POST /api/categories/filings — Protected (Admin adds a filing to a category)
router.post('/filings', requireAuth, async (req, res) => {
  try {
    const { categoryId, name, sortOrder, isActive } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({ success: false, message: 'Category ID and Name are required' });
    }

    const filing = await prisma.serviceFiling.create({
      data: {
        categoryId,
        name,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });

    return res.status(201).json({ success: true, data: filing });
  } catch (error) {
    console.error('[POST /api/categories/filings]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/categories/filings/:id — Protected (Admin edits a filing option)
router.put('/filings/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sortOrder, isActive } = req.body;

    const existingFiling = await prisma.serviceFiling.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingFiling) {
      return res.status(404).json({ success: false, message: 'Service option not found' });
    }

    const updated = await prisma.serviceFiling.update({
      where: { id: parseInt(id) },
      data: {
        name: name ?? existingFiling.name,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existingFiling.sortOrder,
        isActive: isActive !== undefined ? !!isActive : existingFiling.isActive,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PUT /api/categories/filings/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/categories/filings/:id — Protected
router.delete('/filings/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existingFiling = await prisma.serviceFiling.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingFiling) {
      return res.status(404).json({ success: false, message: 'Service option not found' });
    }

    await prisma.serviceFiling.delete({ where: { id: parseInt(id) } });
    return res.json({ success: true, message: 'Service option deleted' });
  } catch (error) {
    console.error('[DELETE /api/categories/filings/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
