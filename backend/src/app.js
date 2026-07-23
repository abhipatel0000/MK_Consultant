const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');
const Admin = require('./models/admin.model');
const logger = require('./utils/logger');

// Routes
const publicRoutes = require('./routes/public.routes');
const authRoutes = require('./routes/auth.routes');
const leadRoutes = require('./routes/lead.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const analyticsRoutes = require('./routes/analytics.routes');

// Middlewares
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

// Trust proxy for secure cookies behind proxies (e.g. Render, Railway)
if (process.env.TRUST_PROXY === '1') {
  app.enable('trust proxy');
}

// 1. Security headers (relaxed Content Security Policy for CSS & JS integration)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS setup
app.use(
  cors({
    origin: true, // Allow frontend origin
    credentials: true
  })
);

// 3. Request parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Session Store with MySQL
const sessionStore = new MySQLStore({}, db);
app.use(
  session({
    key: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'mk_consultant_session_secret_key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure in production (HTTPS)
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    }
  })
);

// 5. API Routes
app.use('/api', publicRoutes);
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/leads', leadRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/analytics', analyticsRoutes);

// 6. Secure Admin HTML pages redirection (Redirects to login if not authenticated)
app.use('/admin', (req, res, next) => {
  const isLoginPage = req.path === '/login.html' || req.path === '/login';
  const isAsset = req.path.includes('/css/') || req.path.includes('/js/') || req.path.includes('/images/');

  // Handle direct access to root /admin or /admin/
  if (req.path === '/' || req.path === '') {
    if (req.session && req.session.admin && req.session.admin.id) {
      return res.redirect('/admin/dashboard.html');
    } else {
      return res.redirect('/admin/login.html');
    }
  }

  if (isLoginPage || isAsset) {
    return next();
  }

  // Check session admin authentication
  if (req.session && req.session.admin && req.session.admin.id) {
    return next();
  }

  // Unauthorized - Redirect to Login
  return res.redirect('/admin/login.html');
});

// 7. Serve Static Frontend Files
app.use(express.static(path.join(__dirname, '../../frontend')));

// 8. Default fallback for SPA-like routes or invalid static requests
app.use((req, res, next) => {
  const err = new Error('Resource Not Found');
  err.status = 404;
  next(err);
});

// 9. Error Handler Middleware
app.use(errorMiddleware);

// Initialize Default Administrator
const initAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mkconsultant.in';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminPass123!';
    await Admin.createDefaultAdminIfNotExist(adminEmail, adminPassword);
  } catch (err) {
    logger.error('Failed to initialize default admin account', err);
  }
};
initAdmin();

module.exports = app;
