// server.js
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// Import database connection
const db = require('./config/database');

// Import models and routes
const User = require('./models/User');
const itemRoutes = require('./routes/items');
const authRoutes = require('./routes/auth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// IMPORTANT: TRUST PROXY (Render/Railway/etc.)
// ============================================
// Needed so secure cookies work correctly behind a proxy
app.set('trust proxy', 1);

// ============================================
// SECURITY MIDDLEWARE
// ============================================
// If your backend is API-only, you can simplify CSP.
// Keeping your existing CSP but safe for API usage.
app.use(
  helmet({
    contentSecurityPolicy: false, // API server doesn't need CSP
  })
);

// ============================================
// CORS CONFIG (CRITICAL FOR GITHUB PAGES LOGIN)
// ============================================
// Your GitHub Pages origin (frontend)
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || 'https://yinkangkam-oss.github.io';

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true, // ✅ MUST be true to allow cookies
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Preflight support
app.options('*', cors());

// ============================================
// GENERAL MIDDLEWARE
// ============================================
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use('/api/', limiter);

// ============================================
// SESSION & PASSPORT CONFIGURATION
// ============================================
// IMPORTANT NOTES:
// - For GitHub Pages (different origin), cookie must be SameSite=None
// - SameSite=None requires Secure=true (HTTPS) in production
const isProduction = process.env.NODE_ENV === 'production';

app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    proxy: true, // ✅ helps secure cookie on Render/Railway
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      secure: isProduction, // ✅ must be true when deployed on HTTPS
      sameSite: isProduction ? 'none' : 'lax', // ✅ cross-site cookies need "none"
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Find user by email or username
      const user =
        (await User.findByEmail(username)) || (await User.findByUsername(username));

      if (!user) {
        return done(null, false, { message: 'Incorrect username or email.' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// ============================================
// STATIC FILES (optional)
// ============================================
// If backend also serves uploads (images), keep this
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// If you still want backend to serve local static frontend (optional):
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// DATABASE CONNECTION TEST
// ============================================
db.getConnection()
  .then((connection) => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes.router);
app.use('/api/items', itemRoutes);

// ============================================
// HEALTH CHECK (helpful for deploy)
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// ============================================
// 404 HANDLER (API)
// ============================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);

  const error = isProduction ? 'Internal Server Error' : err.message;

  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: error,
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS allowed origin: ${FRONTEND_ORIGIN}`);
});