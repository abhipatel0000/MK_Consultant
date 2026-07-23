const response = require('../utils/response');

/**
 * Middleware to check if the user is authenticated as an administrator.
 */
exports.requireAdmin = (req, res, next) => {
  if (req.session && req.session.admin && req.session.admin.id) {
    if (req.session.admin.is_active) {
      return next();
    } else {
      return response.error(res, 'Administrator account is deactivated.', 403);
    }
  }

  return response.error(res, 'Unauthorized access. Please log in.', 401);
};
