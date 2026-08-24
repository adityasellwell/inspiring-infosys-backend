// Stats CRUD Routes
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/stats — Public (used by homepage)
router.get('/', async (req, res) => {
  try {
    const stats = await prisma.stat.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[GET /api/stats]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/stats — Protected (Admin adds a stat)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { label, value, suffix, sortOrder, isActive } = req.body;

    if (!label || !value) {
      return res.status(400).json({ success: false, message: 'Label and Value are required' });
    }

    const stat = await prisma.stat.create({
      data: {
        label,
        value,
        suffix: suffix ?? '+',
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });

    return res.status(201).json({ success: true, data: stat });
  } catch (error) {
    console.error('[POST /api/stats]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/stats/:id — Protected (Admin edits a stat)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, value, suffix, sortOrder, isActive } = req.body;

    const existingStat = await prisma.stat.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingStat) {
      return res.status(404).json({ success: false, message: 'Stat not found' });
    }

    const updated = await prisma.stat.update({
      where: { id: parseInt(id) },
      data: {
        label: label ?? existingStat.label,
        value: value ?? existingStat.value,
        suffix: suffix ?? existingStat.suffix,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existingStat.sortOrder,
        isActive: isActive !== undefined ? !!isActive : existingStat.isActive,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PUT /api/stats/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/stats/:id — Protected (Admin deletes a stat)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existingStat = await prisma.stat.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingStat) {
      return res.status(404).json({ success: false, message: 'Stat not found' });
    }

    await prisma.stat.delete({ where: { id: parseInt(id) } });
    return res.json({ success: true, message: 'Stat deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/stats/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
