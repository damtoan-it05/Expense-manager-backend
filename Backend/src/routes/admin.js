const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

// ─── GET /api/admin/users Lấy danh sách users──────────────────
// Query: ?page=&limit=&search=
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/admin/users/:id Xem chi tiết 1 user ────────────────────────
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // thống kê tổng thu nhập, chi tiêu và số lượng giao dịch của user này
    const [incomeData, expenseData] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: user._id, type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { userId: user._id, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        stats: {
          totalIncome: incomeData[0]?.total || 0,
          totalExpense: expenseData[0]?.total || 0,
          transactionCount: (incomeData[0]?.count || 0) + (expenseData[0]?.count || 0),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/admin/users/:id/role Đổi quyền user ─────────────────────
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be "user" or "admin"' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/admin/stats Thống kê toàn hệ thống ────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalTransactions, revenueData] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      Transaction.aggregate([
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
    ]);

    const stats = { totalIncome: 0, totalExpense: 0 };
    revenueData.forEach((r) => {
      if (r._id === 'income') stats.totalIncome = r.total;
      else stats.totalExpense = r.total;
    });

    res.json({
      success: true,
      data: { totalUsers, totalTransactions, ...stats },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
