import prisma from '../lib/prisma.js';

export const getActiveTurnoverOptions = async (req, res) => {
  try {
    const options = await prisma.turnoverOption.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: options });
  } catch (error) {
    console.error('[GET /api/turnover-options]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAllTurnoverOptionsAdmin = async (req, res) => {
  try {
    const options = await prisma.turnoverOption.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: options });
  } catch (error) {
    console.error('[GET /api/turnover-options/all]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createTurnoverOption = async (req, res) => {
  try {
    const { label, sortOrder, isActive } = req.body;

    if (!label) {
      return res.status(400).json({ success: false, message: 'Label is required' });
    }

    const option = await prisma.turnoverOption.create({
      data: {
        label,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });

    return res.status(201).json({ success: true, data: option });
  } catch (error) {
    console.error('[POST /api/turnover-options]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateTurnoverOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, sortOrder, isActive } = req.body;

    const existing = await prisma.turnoverOption.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Turnover option not found' });
    }

    const updated = await prisma.turnoverOption.update({
      where: { id: parseInt(id) },
      data: {
        label: label ?? existing.label,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existing.sortOrder,
        isActive: isActive !== undefined ? !!isActive : existing.isActive,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PUT /api/turnover-options/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteTurnoverOption = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.turnoverOption.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Turnover option not found' });
    }

    await prisma.turnoverOption.delete({ where: { id: parseInt(id) } });
    return res.json({ success: true, message: 'Turnover option deleted' });
  } catch (error) {
    console.error('[DELETE /api/turnover-options/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
