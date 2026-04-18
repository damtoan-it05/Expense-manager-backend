const express = require('express');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

//  nhận các danh mục hiển thị cho người dùng hiện tại (mặc định + riêng)
const getUserCategories = (userId) => ({
  $or: [{ isDefault: true }, { userId }],
});

// ─── GET /api/categories Lấy danh sách danh mục ──────────────────────────────────────────────────────
// Query: ?type=income|expense
router.get('/', async (req, res) => {
  try {
    const filter = getUserCategories(req.user._id);
    if (req.query.type) filter.type = req.query.type;

    const categories = await Category.find(filter).sort({ isDefault: -1, name: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/categories Tạo danh mục mới ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Name and type are required' });
    }

    const category = await Category.create({
      name,
      type,
      icon,
      color,
      userId: req.user._id,
      isDefault: false,
    });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Category with this name already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/categories/:id Xem chi tiết 1 danh mục ──────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      ...getUserCategories(req.user._id),
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/categories/:id Cập nhật danh mục ──────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found or you do not have permission' });
    }

    const { name, icon, color } = req.body;
    if (name) category.name = name;
    if (icon) category.icon = icon;
    if (color) category.color = color;

    await category.save();
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/categories/:id Xóa danh mục ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found or you do not have permission' });
    }

    await category.deleteOne();
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
