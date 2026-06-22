/**
 * Middleware phân quyền theo role.
 * Dùng SAU authMiddleware (vì cần req.user.role do authMiddleware gán).
 *
 * Cách dùng:
 *   router.post('/', authMiddleware, requireRole('Admin', 'Master', 'ChiefOfficer'), handler);
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user && req.user.role;

    if (!role) {
      return res.status(401).json({ message: 'Chưa xác thực người dùng.' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập chức năng này.' });
    }

    next();
  };
};

module.exports = requireRole;
