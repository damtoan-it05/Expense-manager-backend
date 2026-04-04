const express = require('express');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ─── GET /api/statistics/summary Tổng quan thu chi ─────────────────────────────────────────────
// Query: ?period=weekly|monthly|yearly &month=&year=&week=
router.get('/summary', async (req, res) => {
  try {
    const { period = 'monthly', month, year, week } = req.query;
    const now = new Date();
    let startDate, endDate;

    if (period === 'weekly') {
      // ISO week: week number in a year
      const y = Number(year) || now.getFullYear();
      const w = Number(week) || getISOWeek(now);
      ({ startDate, endDate } = getWeekRange(y, w));
    } else if (period === 'yearly') {
      const y = Number(year) || now.getFullYear();
      startDate = new Date(y, 0, 1);
      endDate = new Date(y, 11, 31, 23, 59, 59, 999);
    } else {
      // monthly (default)
      const m = Number(month) || now.getMonth() + 1;
      const y = Number(year) || now.getFullYear();
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59, 999);
    }

    const [results] = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
    const allGroups = await Transaction.aggregate([
      { $match: { userId: req.user._id, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    allGroups.forEach((g) => {
      if (g._id === 'income') {
        stats.income = g.total;
        stats.incomeCount = g.count;
      } else {
        stats.expense = g.total;
        stats.expenseCount = g.count;
      }
    });

    stats.balance = stats.income - stats.expense;

    res.json({ success: true, data: { period, startDate, endDate, ...stats } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/statistics/by-category Thống kê theo danh mục ─────────────────────────────────────────
// Query: ?type=income|expense &period=weekly|monthly|yearly &month=&year=&week=
router.get('/by-category', async (req, res) => {
  try {
    const { type = 'expense', period = 'monthly', month, year, week } = req.query;
    const now = new Date();
    let startDate, endDate;

    if (period === 'weekly') {
      const y = Number(year) || now.getFullYear();
      const w = Number(week) || getISOWeek(now);
      ({ startDate, endDate } = getWeekRange(y, w));
    } else if (period === 'yearly') {
      const y = Number(year) || now.getFullYear();
      startDate = new Date(y, 0, 1);
      endDate = new Date(y, 11, 31, 23, 59, 59, 999);
    } else {
      const m = Number(month) || now.getMonth() + 1;
      const y = Number(year) || now.getFullYear();
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59, 999);
    }

    const data = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: '$category.name',
          icon: '$category.icon',
          color: '$category.color',
          total: 1,
          count: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = data.reduce((sum, d) => sum + d.total, 0);
    const dataWithPercent = data.map((d) => ({
      ...d,
      percentage: grandTotal > 0 ? Math.round((d.total / grandTotal) * 100) : 0,
    }));

    res.json({ success: true, data: dataWithPercent, total: grandTotal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/statistics/trend Xu hướng theo tháng ────────────────────────────────────────────────
// Monthly income vs expense trend for a given year
// Query: ?year=
router.get('/trend', async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const data = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    // Build 12-month array
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
      balance: 0,
    }));

    data.forEach(({ _id, total }) => {
      const idx = _id.month - 1;
      months[idx][_id.type] = total;
    });

    months.forEach((m) => {
      m.balance = m.income - m.expense;
    });

    res.json({ success: true, data: months, year });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Utility: ISO Hàm helper xử lý tuần ────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getWeekRange(year, week) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getDay();
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { startDate: monday, endDate: sunday };
}

module.exports = router;
