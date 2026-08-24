// Projects CRUD Routes
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/projects — Public (used by Portfolio)
router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: projects });
  } catch (error) {
    console.error('[GET /api/projects]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/projects — Protected
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, category, imgUrl, link, description, sortOrder, isActive } = req.body;

    if (!title || !category || !imgUrl || !description) {
      return res.status(400).json({ success: false, message: 'Title, Category, Image URL, and Description are required' });
    }

    const project = await prisma.project.create({
      data: {
        title,
        category,
        imgUrl,
        link: link ?? '',
        description,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });

    return res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error('[POST /api/projects]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/projects/:id — Protected
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, imgUrl, link, description, sortOrder, isActive } = req.body;

    const existingProject = await prisma.project.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const updated = await prisma.project.update({
      where: { id: parseInt(id) },
      data: {
        title: title ?? existingProject.title,
        category: category ?? existingProject.category,
        imgUrl: imgUrl ?? existingProject.imgUrl,
        link: link !== undefined ? link : existingProject.link,
        description: description ?? existingProject.description,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existingProject.sortOrder,
        isActive: isActive !== undefined ? !!isActive : existingProject.isActive,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PUT /api/projects/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/projects/:id — Protected
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existingProject = await prisma.project.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await prisma.project.delete({ where: { id: parseInt(id) } });
    return res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/projects/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
