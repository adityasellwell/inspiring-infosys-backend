import { Router } from 'express';
import { login, me } from '../controllers/authController.js';

const router = Router();

// Admin Authentication Routes
router.post('/login', login);
router.get('/me', me);

export default router;
