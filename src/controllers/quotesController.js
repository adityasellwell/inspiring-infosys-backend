import prisma from '../lib/prisma.js';

export const getAllQuotes = async (req, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: quotes });
  } catch (error) {
    console.error('[GET /api/quotes]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const submitQuote = async (req, res) => {
  try {
    const { name, email, phone, service, message, companyName, turnover, businessDesc } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Required fields missing: Name, Email, and Phone are required' });
    }

    const quote = await prisma.quote.create({
      data: {
        name,
        email,
        phone,
        service: service ?? '',
        message: message ?? '',
        companyName: companyName ?? '',
        turnover: turnover ?? '',
        businessDesc: businessDesc ?? '',
        status: 'new',
      },
    });

    return res.status(201).json({ success: true, data: quote });
  } catch (error) {
    console.error('[POST /api/quotes]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateQuoteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'in-progress', 'done'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be: new, in-progress, or done' });
    }

    const existingQuote = await prisma.quote.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingQuote) {
      return res.status(404).json({ success: false, message: 'Quote lead not found' });
    }

    const updated = await prisma.quote.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PUT /api/quotes/:id/status]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, service, message, companyName, turnover, businessDesc, status } = req.body;

    const existingQuote = await prisma.quote.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingQuote) {
      return res.status(404).json({ success: false, message: 'Quote lead not found' });
    }

    const updated = await prisma.quote.update({
      where: { id: parseInt(id) },
      data: {
        name: name ?? existingQuote.name,
        email: email ?? existingQuote.email,
        phone: phone ?? existingQuote.phone,
        service: service ?? existingQuote.service,
        message: message ?? existingQuote.message,
        companyName: companyName !== undefined ? companyName : existingQuote.companyName,
        turnover: turnover !== undefined ? turnover : existingQuote.turnover,
        businessDesc: businessDesc !== undefined ? businessDesc : existingQuote.businessDesc,
        status: status ?? existingQuote.status,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PUT /api/quotes/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteQuote = async (req, res) => {
  try {
    const { id } = req.params;

    const existingQuote = await prisma.quote.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingQuote) {
      return res.status(404).json({ success: false, message: 'Quote lead not found' });
    }

    await prisma.quote.delete({ where: { id: parseInt(id) } });
    return res.json({ success: true, message: 'Quote lead deleted' });
  } catch (error) {
    console.error('[DELETE /api/quotes/:id]', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
