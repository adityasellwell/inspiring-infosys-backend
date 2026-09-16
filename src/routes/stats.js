import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getVisitorCount,
  hitVisitorCount,
  getAllStats,
  createStat,
  updateStat,
  deleteStat
} from '../controllers/statsController.js';

const router = Router();

router.get('/visitor-count', getVisitorCount);
router.post('/visitor-count/hit', hitVisitorCount);
router.get('/', getAllStats);
router.post('/', requireAuth, createStat);
router.put('/:id', requireAuth, updateStat);
router.delete('/:id', requireAuth, deleteStat);

export default router;
