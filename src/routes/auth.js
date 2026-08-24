// POST /api/auth/login
// Public route — verifies admin credentials and returns a JWT.

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find admin by email
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      // Return generic message — don't reveal whether email exists
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Compare against bcrypt hash
    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Sign JWT — expires in 7 days
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      name: admin.name,
    });

  } catch (error) {
    console.error('[auth/login]', error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});

// GET /api/auth/me — verify a token is still valid (used by frontend on page load)
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ success: true, name: decoded.name });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

export default router;
