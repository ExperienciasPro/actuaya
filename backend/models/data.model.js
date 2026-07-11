/**
 * ActuaYa — Generic Key-Value Data Model (Mongoose)
 *
 * Replaces the PHP flat-file JSON persistence with MongoDB.
 * Each document stores a key (e.g. "um_goals", "um_users") and its data payload.
 */
const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'data_store',
});

module.exports = mongoose.model('DataStore', dataSchema);
