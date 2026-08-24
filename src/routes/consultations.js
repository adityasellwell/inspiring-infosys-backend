// Consultations Lead Inbox Routes
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { issueCaptcha, verifyCaptcha } from '../utils/captcha.js';
import { sendContactFormEmail } from '../utils/mailer.js';

const router = Router();

// GET /api/consultations/captcha — Public (issues a text captcha challenge)
router.get('/captcha', (_req, res) => {
  const { code, token } = issueCaptcha();
  return res.json({ success: true, code, token });
});

// GET /api/consultations — Protected (Admin reads lead submissions)
router.get('/', requireAuth, async (req, res) => {
  try {
    const consultations = await prisma.consultation.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: consultations });
  } catch (error) {
    console.error('[GET /api/consultations]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/consultations — Public (submitted from Contact form)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, message, captchaToken, captchaAnswer } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Required fields missing: Name, Email, and Message are required' });
    }

    if (!verifyCaptcha(captchaToken, captchaAnswer)) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code. Please try again.' });
    }

    const consultation = await prisma.consultation.create({
      data: {
        name,
        email,
        phone: phone ?? '',
        company: company ?? '',
        message,
        status: 'new',
      },
    });

    // Send confirmation emails (async, don't wait)
    sendContactFormEmail(name, email, phone ?? '', company ?? '', message).catch(err => {
      console.error('Failed to send email:', err.message);
    });

    return res.status(201).json({ success: true, data: consultation });
  } catch (error) {
    console.error('[POST /api/consultations]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/consultations/:id/status — Protected (Admin updates lead status)
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'in-progress', 'done'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be: new, in-progress, or done' });
    }

    const existingConsultation = await prisma.consultation.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingConsultation) {
      return res.status(404).json({ success: false, message: 'Consultation lead not found' });
    }

    const updated = await prisma.consultation.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PUT /api/consultations/:id/status]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/consultations/:id — Protected
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existingConsultation = await prisma.consultation.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingConsultation) {
      return res.status(404).json({ success: false, message: 'Consultation lead not found' });
    }

    await prisma.consultation.delete({ where: { id: parseInt(id) } });
    return res.json({ success: true, message: 'Consultation lead deleted' });
  } catch (error) {
    console.error('[DELETE /api/consultations/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
