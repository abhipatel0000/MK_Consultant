const bcrypt = require('bcryptjs');
const Admin = require('../models/admin.model');
const AuditLog = require('../models/audit.model');
const response = require('../utils/response');

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  const ipAddress = req.ip;

  try {
    if (!email || !password) {
      return response.error(res, 'Email and password are required.', 400);
    }

    const admin = await Admin.findByEmail(email);

    if (!admin) {
      await Admin.recordLoginAttempt(email, ipAddress, false);
      return response.error(res, 'Invalid email or password.', 401);
    }

    if (!admin.is_active) {
      await Admin.recordLoginAttempt(email, ipAddress, false);
      return response.error(res, 'Account is deactivated.', 403);
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      await Admin.recordLoginAttempt(email, ipAddress, false);
      return response.error(res, 'Invalid email or password.', 401);
    }

    // Login successful
    await Admin.recordLoginAttempt(email, ipAddress, true);
    await Admin.updateLastLogin(admin.id);

    // Save admin in session
    req.session.admin = {
      id: admin.id,
      full_name: admin.full_name,
      email: admin.email,
      role: admin.role,
      is_active: admin.is_active
    };

    // Log the audit event
    await AuditLog.create({
      admin_id: admin.id,
      action: 'LOGIN',
      entity_type: 'admin',
      entity_id: admin.id,
      details_json: { email: admin.email },
      ip_address: ipAddress
    });

    return response.success(res, {
      admin: {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email,
        role: admin.role
      }
    }, 'Login successful.');
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  const adminId = req.session?.admin?.id;
  const ipAddress = req.ip;

  try {
    if (adminId) {
      await AuditLog.create({
        admin_id: adminId,
        action: 'LOGOUT',
        entity_type: 'admin',
        entity_id: adminId,
        details_json: {},
        ip_address: ipAddress
      });
    }

    req.session.destroy(err => {
      if (err) {
        return response.error(res, 'Failed to log out.', 500);
      }
      res.clearCookie('connect.sid'); // default express session cookie name
      return response.success(res, null, 'Logged out successfully.');
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.session.admin.id);
    if (!admin) {
      return response.error(res, 'Admin profile not found.', 404);
    }

    const db = require('../config/database');
    const [attempts] = await db.execute(
      'SELECT attempt_time, ip_address, was_successful FROM login_attempts WHERE email = ? ORDER BY attempt_time DESC LIMIT 10',
      [admin.email]
    );

    return response.success(res, { admin, loginAttempts: attempts }, 'Admin profile retrieved.');
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.session.admin.id;
  const ipAddress = req.ip;

  try {
    if (!currentPassword || !newPassword) {
      return response.error(res, 'Current password and new password are required.', 400);
    }

    const admin = await Admin.findByEmail(req.session.admin.email);
    const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isMatch) {
      return response.error(res, 'Current password is incorrect.', 400);
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return response.error(res, 'New password must be at least 8 characters long.', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await Admin.updatePassword(adminId, hashedPassword);

    await AuditLog.create({
      admin_id: adminId,
      action: 'PASSWORD_CHANGED',
      entity_type: 'admin',
      entity_id: adminId,
      details_json: {},
      ip_address: ipAddress
    });

    return response.success(res, null, 'Password changed successfully. Please log in again.');
  } catch (err) {
    next(err);
  }
};
