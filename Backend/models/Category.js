const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Category type is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = default/system category
    },
    icon: {
      type: String,
      default: 'tag',
    },
    color: {
      type: String,
      default: '#6366f1',
      match: [/^#([0-9A-F]{3}){1,2}$/i, 'Please enter a valid hex color'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// A user cannot have two categories with the same name & type
categorySchema.index({ name: 1, type: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
