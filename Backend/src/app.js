const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });


const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const statisticsRoutes = require('./routes/statistics');
const adminRoutes = require('./routes/admin');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets',      budgetRoutes);
app.use('/api/statistics',   statisticsRoutes);
app.use('/api/admin',        adminRoutes);

// ─── kiểm tra server có hoạt động không: ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Expense Manager API is running 🚀' });
});

// ─── bắt lỗi toàn cục ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── Kết nối DB & khời động server ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ExpenseManageDB';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
