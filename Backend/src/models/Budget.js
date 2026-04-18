const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2020,
    },
    limitAmount: {
      type: Number,
      required: [true, 'Limit amount is required'],
      min: [1, 'Limit amount must be greater than 0'],
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Đảm bảo: Mỗi user, trong 1 tháng, 1 năm, chỉ có 1 ngân sách cho 1 danh mục.
budgetSchema.index({ userId: 1, categoryId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
