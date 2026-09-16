import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getActiveCategories,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  createFiling,
  updateFiling,
  deleteFiling
} from '../controllers/categoriesController.js';

const router = Router();

router.get('/', getActiveCategories);
router.get('/all', requireAuth, getAllCategoriesAdmin);
router.post('/', requireAuth, createCategory);
router.put('/:id', requireAuth, updateCategory);
router.delete('/:id', requireAuth, deleteCategory);

router.post('/filings', requireAuth, createFiling);
router.put('/filings/:id', requireAuth, updateFiling);
router.delete('/filings/:id', requireAuth, deleteFiling);

export default router;
