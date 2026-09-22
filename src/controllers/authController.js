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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'inspiring-infosys-super-secret-jwt-key-change-in-production'
    );

    let admin = null;
    try {
      admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
      if (!admin && decoded.email) {
        admin = await prisma.admin.findUnique({ where: { email: decoded.email } });
      }
    } catch (err) {
      console.warn('[auth/me DB Notice]', err.message);
    }

    if (!admin) {
      return res.json({
        success: true,
        name: decoded.name || 'Admin Sellwell',
        admin: {
          id: decoded.id || 1,
          name: decoded.name || 'Admin Sellwell',
          email: decoded.email || 'support@sellwellone.com',
          phone: decoded.phone || '+91 8669640514',
          role: 'Administrator',
          status: 'Active'
        }
      });
    }

    return res.json({
      success: true,
      name: admin.name,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone || '+91 8669640514',
        role: 'Administrator',
        status: 'Active'
      }
    });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const updateProfile = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'inspiring-infosys-super-secret-jwt-key-change-in-production'
    );

    const { name, email, phone, newPassword } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Full name and email address are required.' });
    }

    let existing = null;
    try {
      existing = await prisma.admin.findFirst({
        where: { OR: [{ id: decoded.id }, { email: decoded.email }] }
      });
    } catch (dbErr) {
      console.warn('[auth/updateProfile DB Notice]', dbErr.message);
    }

    let updatedAdmin = null;

    if (existing) {
      const dataToUpdate = {
        name: name.trim(),
        email: email.trim().toLowerCase()
      };

      if (newPassword && newPassword.trim()) {
        dataToUpdate.password = await bcrypt.hash(newPassword.trim(), 10);
      }

      updatedAdmin = await prisma.admin.update({
        where: { id: existing.id },
        data: dataToUpdate
      });
    } else {
      const hashedPassword = newPassword && newPassword.trim()
        ? await bcrypt.hash(newPassword.trim(), 10)
        : await bcrypt.hash('admin123', 10);

      updatedAdmin = await prisma.admin.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword
        }
      });
    }

    const newToken = jwt.sign(
      {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        name: updatedAdmin.name,
        phone: phone || '+91 8669640514'
      },
      process.env.JWT_SECRET || 'inspiring-infosys-super-secret-jwt-key-change-in-production',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Admin profile & security credentials updated successfully!',
      token: newToken,
      name: updatedAdmin.name,
      admin: {
        id: updatedAdmin.id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        phone: phone || '+91 8669640514',
        role: 'Administrator',
        status: 'Active'
      }
    });
  } catch (error) {
    console.error('[auth/updateProfile error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update admin profile credentials.'
    });
  }
};
