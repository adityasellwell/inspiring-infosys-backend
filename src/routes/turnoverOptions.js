import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getActiveTurnoverOptions,
  getAllTurnoverOptionsAdmin,
  createTurnoverOption,
  updateTurnoverOption,
  deleteTurnoverOption
} from '../controllers/turnoverController.js';

const router = Router();

router.get('/', getActiveTurnoverOptions);
router.get('/all', requireAuth, getAllTurnoverOptionsAdmin);
router.post('/', requireAuth, createTurnoverOption);
router.put('/:id', requireAuth, updateTurnoverOption);
router.delete('/:id', requireAuth, deleteTurnoverOption);

export default router;
