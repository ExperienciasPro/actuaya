const mongoose = require('mongoose');

const ticketReplySchema = new mongoose.Schema({
  sender: {
    type: String, // 'user' or 'admin'
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const ticketSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
  },
  subject: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  screenshot: {
    type: String, // Base64 image
  },
  status: {
    type: String, // 'open', 'closed'
    default: 'open',
    index: true,
  },
  replies: [ticketReplySchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
  collection: 'support_tickets',
});

module.exports = mongoose.model('SupportTicket', ticketSchema);
