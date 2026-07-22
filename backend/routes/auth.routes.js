const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const DataStore = require('../models/data.model');
const ResetToken = require('../models/reset-token.model');
const { sendResetEmail } = require('../services/email.service');

// Generate a random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Format email consistently
function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

// Endpoint to request a password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = normalizeEmail(email);

    // 1. Find user in the um_users data store
    const usersDoc = await DataStore.findOne({ key: 'um_users' });
    if (!usersDoc || !Array.isArray(usersDoc.value)) {
      // Always return success even if not found to prevent user enumeration
      return res.json({ ok: true, message: 'Si el correo existe, se ha enviado un enlace.' });
    }

    const users = usersDoc.value;
    const user = users.find(u => normalizeEmail(u.email) === normalizedEmail && !u.isDeleted);

    if (!user) {
       // Always return success even if not found
       return res.json({ ok: true, message: 'Si el correo existe, se ha enviado un enlace.' });
    }

    // 2. Generate and save token
    const rawToken = generateToken();
    
    // Hash the token for storage
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await ResetToken.create({
      userId: user.id,
      email: normalizedEmail,
      token: hashedToken,
      expiresAt,
    });

    // 3. Send email
    // Link contains the raw token, backend validates against hashed token
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.actuaya.co';
    const resetLink = `${frontendUrl}/reset-password/${rawToken}`;
    
    await sendResetEmail(normalizedEmail, resetLink, user.name);

    return res.json({ ok: true, message: 'Si el correo existe, se ha enviado un enlace.' });
  } catch (error) {
    console.error('[Auth API] forgot-password error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint to reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Hash the incoming token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 1. Find valid token
    const resetRecord = await ResetToken.findOne({
      token: hashedToken,
      used: false,
      expiresAt: { $gt: new Date() } // Must not be expired
    });

    if (!resetRecord) {
      return res.status(400).json({ error: 'El enlace es inválido o ha expirado' });
    }

    // 2. Update user's password
    const usersDoc = await DataStore.findOne({ key: 'um_users' });
    if (!usersDoc || !Array.isArray(usersDoc.value)) {
      return res.status(500).json({ error: 'User data not found' });
    }

    const users = usersDoc.value;
    const userIndex = users.findIndex(u => u.id === resetRecord.userId && !u.isDeleted);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash the password with the same method as frontend (SHA-256 with salt)
    const salt = 'AcY_2026';
    const hash = crypto.createHash('sha256').update(newPassword + ':' + salt).digest('hex');
    const newHashedPassword = `sha256$${hash}`;

    // Use atomic update with retry to avoid race conditions with frontend sync.
    // Strategy: read-modify-write with a re-read before write to get latest data.
    let updated = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Re-read fresh data on each attempt to avoid stale data
      const freshDoc = await DataStore.findOne({ key: 'um_users' });
      if (!freshDoc || !Array.isArray(freshDoc.value)) {
        return res.status(500).json({ error: 'User data not found' });
      }

      const freshUsers = freshDoc.value;
      const idx = freshUsers.findIndex(u => u.id === resetRecord.userId && !u.isDeleted);
      if (idx === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      freshUsers[idx].password = newHashedPassword;
      freshUsers[idx].updatedAt = new Date().toISOString();

      // Use the document _id + updatedAt as a version check
      const result = await DataStore.findOneAndUpdate(
        { key: 'um_users', _id: freshDoc._id },
        { $set: { value: freshUsers, updatedAt: new Date() } },
        { new: true }
      );

      if (result) {
        updated = true;
        console.log(`[Auth API] Password updated for user ${resetRecord.userId} (attempt ${attempt})`);
        break;
      }

      // If result is null, document was modified between read and write — retry
      console.warn(`[Auth API] Race condition on attempt ${attempt}, retrying...`);
      await new Promise(r => setTimeout(r, 200 * attempt));
    }

    if (!updated) {
      return res.status(500).json({ error: 'No se pudo actualizar la contraseña. Intenta de nuevo.' });
    }

    // 3. Mark token as used
    resetRecord.used = true;
    await resetRecord.save();

    return res.json({ ok: true, message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('[Auth API] reset-password error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
