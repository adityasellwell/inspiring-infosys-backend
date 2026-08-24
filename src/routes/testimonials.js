// Testimonials CRUD Routes
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/testimonials — Public (admin-curated testimonials, managed in the CMS)
router.get('/', async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return res.json({ success: true, data: testimonials });
  } catch (error) {
    console.error('[GET /api/testimonials]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/testimonials — Protected
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, initials, timeAgo, rating, text, colorClass, sortOrder, isActive } = req.body;

    if (!name || !text) {
      return res.status(400).json({ success: false, message: 'Name and Text are required' });
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        name,
        initials: initials ?? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
        timeAgo: timeAgo ?? 'Just now',
        rating: rating ? parseInt(rating) : 5,
        text,
        colorClass: colorClass ?? 'badge-blue',
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });

    return res.status(201).json({ success: true, data: testimonial });
  } catch (error) {
    console.error('[POST /api/testimonials]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/testimonials/:id — Protected
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, initials, timeAgo, rating, text, colorClass, sortOrder, isActive } = req.body;

    const existingTestimonial = await prisma.testimonial.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingTestimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    const updated = await prisma.testimonial.update({
      where: { id: parseInt(id) },
      data: {
        name: name ?? existingTestimonial.name,
        initials: initials ?? existingTestimonial.initials,
        timeAgo: timeAgo ?? existingTestimonial.timeAgo,
        rating: rating !== undefined ? parseInt(rating) : existingTestimonial.rating,
        text: text ?? existingTestimonial.text,
        colorClass: colorClass ?? existingTestimonial.colorClass,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existingTestimonial.sortOrder,
        isActive: isActive !== undefined ? !!isActive : existingTestimonial.isActive,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PUT /api/testimonials/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/testimonials/:id — Protected
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existingTestimonial = await prisma.testimonial.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingTestimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    await prisma.testimonial.delete({ where: { id: parseInt(id) } });
    return res.json({ success: true, message: 'Testimonial deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/testimonials/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
