/**
 * Seed default categories into the database.
 * Run with: node src/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

const defaultCategories = [
  // ── Income ──────────────────────────────────────────────────────────────────
  { name: 'Lương',           type: 'income',  icon: 'briefcase',    color: '#22c55e', isDefault: true },
  { name: 'Thưởng',          type: 'income',  icon: 'gift',         color: '#16a34a', isDefault: true },
  { name: 'Đầu tư',          type: 'income',  icon: 'trending-up',  color: '#15803d', isDefault: true },
  { name: 'Làm thêm',   type: 'income',  icon: 'plus-circle',  color: '#4ade80', isDefault: true },

  // ── Expense ──────────────────────────────────────────────────────────────────
  { name: 'Ăn uống',         type: 'expense', icon: 'utensils',     color: '#f97316', isDefault: true },
  { name: 'Di chuyển',       type: 'expense', icon: 'car',          color: '#3b82f6', isDefault: true },
  { name: 'Mua sắm',         type: 'expense', icon: 'shopping-bag', color: '#a855f7', isDefault: true },
  { name: 'Tiền nhà',           type: 'expense', icon: 'home',         color: '#06b6d4', isDefault: true },
  { name: 'Sức khỏe',            type: 'expense', icon: 'heart',        color: '#ef4444', isDefault: true },
  { name: 'Giáo dục',        type: 'expense', icon: 'book',         color: '#eab308', isDefault: true },
  { name: 'Giải trí',        type: 'expense', icon: 'music',        color: '#ec4899', isDefault: true },
  { name: 'Hóa đơn', type: 'expense', icon: 'zap',      color: '#f59e0b', isDefault: true },
];
// cài đặt mặc định danh mục thu nhập và danh mục chi tiêu cho người dùng mới, giúp họ dễ dàng bắt đầu mà không phải tạo danh mục từ đầu.
async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ExpenseManageDB');
    console.log('✅ Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const cat of defaultCategories) {
      const exists = await Category.findOne({ name: cat.name, type: cat.type, isDefault: true });
      if (!exists) {
        await Category.create(cat);
        created++;
      } else {
        skipped++;
      }
    }

    console.log(`✅ Seed complete: ${created} created, ${skipped} already existed`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
