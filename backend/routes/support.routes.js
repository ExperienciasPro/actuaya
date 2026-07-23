const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/ticket.model');

// Middleware to check authentication token
function authCheck(req, res, next) {
  let token = req.headers['x-auth-token'] || req.query.token || '';
  const expected = process.env.AUTH_TOKEN || 'um_api_2026';
  if (token !== expected) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

router.use(authCheck);

// GET /api/support
// Get tickets. If userId is provided, get only their tickets. Otherwise, get all (for admin).
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};
    // Sort by createdAt descending
    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    console.error('[Support API] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
});

// POST /api/support
// Create a new support ticket
router.post('/', async (req, res) => {
  try {
    const { userId, userName, userEmail, subject, description, screenshot } = req.body;
    if (!userId || !subject || !description) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const ticket = new SupportTicket({
      userId,
      userName: userName || 'Usuario Anónimo',
      userEmail,
      subject,
      description,
      screenshot, // Can be large Base64
      status: 'open',
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    console.error('[Support API] POST error:', err.message);
    res.status(500).json({ error: 'Error al crear ticket' });
  }
});

// POST /api/support/:id/reply
// Add a reply to a ticket
router.post('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { sender, message } = req.body; // sender: 'user' | 'admin'

    if (!sender || !message) {
      return res.status(400).json({ error: 'Remitente y mensaje son obligatorios' });
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    ticket.replies.push({ sender, message });
    ticket.updatedAt = new Date();
    
    // Automatically reopen ticket if user replies
    if (sender === 'user' && ticket.status === 'closed') {
      ticket.status = 'open';
    }

    await ticket.save();
    res.json(ticket);
  } catch (err) {
    console.error('[Support API] POST reply error:', err.message);
    res.status(500).json({ error: 'Error al añadir respuesta' });
  }
});

// PUT /api/support/:id/status
// Update ticket status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'open' | 'closed'

    if (!status) {
      return res.status(400).json({ error: 'El estado es obligatorio' });
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      id, 
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json(ticket);
  } catch (err) {
    console.error('[Support API] PUT status error:', err.message);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

module.exports = router;
