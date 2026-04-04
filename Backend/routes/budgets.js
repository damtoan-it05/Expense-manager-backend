const express = require('express');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// tính toán tổng chi tiêu của user trong 1 category ở 1 tháng nhất định
const getSpentAmount = async (userId, categoryId, month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999); // ngày cuối tháng

  const result = await Transaction.aggregate([
    {
      $match: {
        userId,
        categoryId,
        type: 'expense',
        date: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return result[0]?.total || 0;
};

// ─── GET /api/budgets Lấy danh sách ngân sách ──────────────────────────────────────
// Query: ?month=&year=  (mặc định hiện tại month/year)
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    const budgets = await Budget.find({
      userId: req.user._id,
      month,
      year,
    }).populate('categoryId', 'name type icon color');

    // Đính kèm số tiền chi tiêu và trạng thái cảnh báo cho từng ngân sách
    const budgetsWithStatus = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await getSpentAmount(req.user._id, budget.categoryId._id, month, year);
        const percentage = budget.limitAmount > 0 ? (spent / budget.limitAmount) * 100 : 0;
        const isAlert = percentage >= budget.alertThreshold;
        const isExceeded = spent > budget.limitAmount;

        return {
          ...budget.toObject(),
          spent,
          remaining: Math.max(budget.limitAmount - spent, 0),
          percentage: Math.round(percentage),
          isAlert,
          isExceeded,
        };
      })
    );

    res.json({ success: true, data: budgetsWithStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/budgets Tạo ngân sách mới ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { categoryId, month, year, limitAmount, alertThreshold } = req.body;

    if (!categoryId || !month || !year || !limitAmount) {
      return res.status(400).json({ success: false, message: 'categoryId, month, year, and limitAmount are required' });
    }

    // Xác minh danh mục là một danh mục chi phí thuộc về user hoặc là danh mục mặc định
    const category = await Category.findOne({
      _id: categoryId,
      type: 'expense',
      $or: [{ isDefault: true }, { userId: req.user._id }],
    });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Expense category not found' });
    }

    const budget = await Budget.create({
      userId: req.user._id,
      categoryId,
      month,
      year,
      limitAmount,
      alertThreshold: alertThreshold ?? 80,
    });

    await budget.populate('categoryId', 'name type icon color');
    res.status(201).json({ success: true, data: budget });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Budget for this category/month/year already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/budgets/:id Cập nhật ngân sách ─────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    const { limitAmount, alertThreshold, isActive } = req.body;
    if (limitAmount !== undefined) budget.limitAmount = limitAmount;
    if (alertThreshold !== undefined) budget.alertThreshold = alertThreshold;
    if (isActive !== undefined) budget.isActive = isActive;

    await budget.save();
    await budget.populate('categoryId', 'name type icon color');

    res.json({ success: true, data: budget });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/budgets/:id Xóa ngân sách ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    res.json({ success: true, message: 'Budget deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/budgets/alerts Lấy danh sách cảnh báo ──────────────────────────────────────────────────
// Trả về tất cả ngân sách đang hoạt động trong tháng hiện tại đã vượt quá ngưỡng cảnh báo
router.get('/alerts', async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const budgets = await Budget.find({
      userId: req.user._id,
      month,
      year,
      isActive: true,
    }).populate('categoryId', 'name type icon color');

    const alerts = [];
    for (const budget of budgets) {
      const spent = await getSpentAmount(req.user._id, budget.categoryId._id, month, year);
      const percentage = (spent / budget.limitAmount) * 100;

      if (percentage >= budget.alertThreshold) {
        alerts.push({
          budget,
          spent,
          percentage: Math.round(percentage),
          isExceeded: spent > budget.limitAmount,
        });
      }
    }

    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
