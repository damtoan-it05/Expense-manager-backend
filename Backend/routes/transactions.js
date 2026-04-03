const express = require('express');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ─── GET /api/transactions ────────────────────────────────────────────────────
// Query: ?type=income|expense &categoryId= &startDate= &endDate= &page= &limit=
router.get('/', async (req, res) => {
  try {
    const { type, categoryId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const filter = { userId: req.user._id };
    if (type) filter.type = type;
    if (categoryId) filter.categoryId = categoryId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('categoryId', 'name type icon color')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
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

// ─── POST /api/transactions ───────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { type, amount, categoryId, date, note } = req.body;

    if (!type || !amount || !categoryId) {
      return res.status(400).json({ success: false, message: 'type, amount, and categoryId are required' });
    }

    // Verify category belongs to user or is a default category
    const category = await Category.findOne({
      _id: categoryId,
      $or: [{ isDefault: true }, { userId: req.user._id }],
    });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (category.type !== type) {
      return res.status(400).json({ success: false, message: `Category type (${category.type}) does not match transaction type (${type})` });
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amount,
      categoryId,
      date: date || new Date(),
      note,
    });

    await transaction.populate('categoryId', 'name type icon color');
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/transactions/:id ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('categoryId', 'name type icon color');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/transactions/:id ────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const { amount, categoryId, date, note, type } = req.body;

    if (categoryId) {
      const category = await Category.findOne({
        _id: categoryId,
        $or: [{ isDefault: true }, { userId: req.user._id }],
      });
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      const txType = type || transaction.type;
      if (category.type !== txType) {
        return res.status(400).json({ success: false, message: `Category type does not match transaction type` });
      }
      transaction.categoryId = categoryId;
    }

    if (type) transaction.type = type;
    if (amount) transaction.amount = amount;
    if (date) transaction.date = date;
    if (note !== undefined) transaction.note = note;

    await transaction.save();
    await transaction.populate('categoryId', 'name type icon color');

    res.json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/transactions/:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
