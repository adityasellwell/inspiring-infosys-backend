import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    let admin = null;
    try {
      admin = await prisma.admin.findUnique({ where: { email } });
    } catch (dbErr) {
      console.warn('[auth/login DB Notice]', dbErr.message);
    }

    // Fallback for admin if database is initializing or table is empty
    if (!admin && email === 'admin@inspiringinfosys.com' && (password === 'admin123' || password === 'admin@123')) {
      const token = jwt.sign(
        { id: 1, email: 'admin@inspiringinfosys.com', name: 'Admin' },
        process.env.JWT_SECRET || 'inspiring-infosys-super-secret-jwt-key-change-in-production',
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        token,
        name: 'Admin',
      });
    }

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET || 'inspiring-infosys-super-secret-jwt-key-change-in-production',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      name: admin.name,
    });
  } catch (error) {
    console.error('[auth/login]', error);
    return res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
  }
};

export const me = async (req, res) => {
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
};
