import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getAllQuotes,
  submitQuote,
  updateQuoteStatus,
  updateQuote,
  deleteQuote
} from '../controllers/quotesController.js';

const router = Router();

router.get('/', requireAuth, getAllQuotes);
router.post('/', submitQuote);
router.put('/:id/status', requireAuth, updateQuoteStatus);
router.put('/:id', requireAuth, updateQuote);
router.delete('/:id', requireAuth, deleteQuote);

export default router;
