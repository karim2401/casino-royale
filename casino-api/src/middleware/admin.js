/**
 * Middleware: allow only admin users past this point.
 * Must be used AFTER authenticate().
 */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAdmin };
