import { Router } from 'express';
import { login, me, updateProfile } from '../controllers/authController.js';

const router = Router();

// Admin Authentication Routes
router.post('/login', login);
router.get('/me', me);
router.put('/profile', updateProfile);

export default router;
