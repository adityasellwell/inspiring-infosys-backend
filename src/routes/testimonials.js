import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getAllTestimonials,
  getGoogleReviews,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial
} from '../controllers/testimonialsController.js';

const router = Router();

router.get('/', getAllTestimonials);
router.get('/google', getGoogleReviews);
router.post('/', requireAuth, createTestimonial);
router.put('/:id', requireAuth, updateTestimonial);
router.delete('/:id', requireAuth, deleteTestimonial);

export default router;
