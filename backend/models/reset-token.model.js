const mongoose = require('mongoose');

const resetTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '1h' }, // Auto delete after 1 hour (actually deletes when date < current time based on index creation, but setting it nicely is better. The index expires: 0 means it expires at the exact time in the field. Let's set it to 1h in the future when creating.)
  }
}, {
  timestamps: true,
  collection: 'reset_tokens',
});

module.exports = mongoose.model('ResetToken', resetTokenSchema);
