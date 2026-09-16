import prisma from '../lib/prisma.js';

async function getVisitorStatRecord() {
  let record = await prisma.stat.findFirst({
    where: { label: 'Visitor Count' },
  });

  if (!record) {
    record = await prisma.stat.create({
      data: {
        label: 'Visitor Count',
        value: '50215',
        suffix: '+',
        sortOrder: 999,
        isActive: true,
      },
    });
  }
  return record;
}

export const getVisitorCount = async (req, res) => {
  try {
    const stat = await getVisitorStatRecord();
    const count = parseInt(stat.value, 10) || 50215;
    return res.json({ success: true, count });
  } catch (error) {
    console.error('[GET /api/stats/visitor-count]', error);
    return res.json({ success: true, count: 50215 });
  }
};

export const hitVisitorCount = async (req, res) => {
  try {
    const stat = await getVisitorStatRecord();
    const currentVal = parseInt(stat.value, 10) || 50215;
    const newVal = currentVal + 1;

    await prisma.stat.update({
      where: { id: stat.id },
      data: { value: String(newVal) },
    });

    return res.json({ success: true, count: newVal });
  } catch (error) {
    console.error('[POST /api/stats/visitor-count/hit]', error);
    return res.json({ success: true, count: 50216 });
  }
};

export const getAllStats = async (req, res) => {
  try {
    const stats = await prisma.stat.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[GET /api/stats]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createStat = async (req, res) => {
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
};

export const updateStat = async (req, res) => {
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
};

export const deleteStat = async (req, res) => {
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
};
