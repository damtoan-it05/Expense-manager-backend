const jwt = require('jsonwebtoken');
const User = require('../models/User');
// xác thực người dùng bằng JWT token và kiểm tra quyền admin nếu cần thiết
// ─── Verify JWT ───────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    //Kiểm tra token có tồn tại không và có đúng định dạng không
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
    // tách token từ header và giải mã nó để lấy thông tin người dùng
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
  }
};
//Kiểm tra role của user đã được gán trong req.user
// ─── Admin only ───────────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Access denied: Admins only' });
};

module.exports = { protect, adminOnly };
