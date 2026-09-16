import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getCaptcha,
  getAllConsultations,
  submitConsultation,
  updateConsultationStatus,
  deleteConsultation
} from '../controllers/consultationsController.js';

const router = Router();

router.get('/captcha', getCaptcha);
router.get('/', requireAuth, getAllConsultations);
router.post('/', submitConsultation);
router.put('/:id/status', requireAuth, updateConsultationStatus);
router.delete('/:id', requireAuth, deleteConsultation);

export default router;
