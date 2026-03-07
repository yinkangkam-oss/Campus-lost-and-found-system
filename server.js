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

dotenv.config();

const db = require('./config/database');

const User = require('./models/User');
const itemRoutes = require('./routes/items');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Needed for Render / reverse proxy so secure cookies work
app.set('trust proxy', 1);

// ====== SECURITY ======
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        scriptSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
      },
    },
  })
);

// ====== CORS (FIXED) ======
const ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'https://yinkangkam-oss.github.io',
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow non-browser requests (Postman/curl) where origin is undefined
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

    return callback(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// IMPORTANT: preflight must use the SAME config (not cors())
app.options('*', cors(corsOptions));

// ====== SESSION & PASSPORT (FIXED) ======
const isProd = process.env.NODE_ENV === 'production';

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,

    // Helps secure cookies behind proxy on Render
    proxy: isProd,

    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      secure: isProd,                 // MUST be true on HTTPS production
      sameSite: isProd ? 'none' : 'lax', // cross-site cookies require none+secure
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = (await User.findByEmail(username)) || (await User.findByUsername(username));
      if (!user) return done(null, false, { message: 'Incorrect username or email.' });

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return done(null, false, { message: 'Incorrect password.' });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// ====== GENERAL MIDDLEWARE ======
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true,
  })
);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====== DB TEST ======
db.getConnection()
  .then((connection) => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

// ====== ROUTES ======
app.use('/api/auth', authRoutes.router);
app.use('/api/items', itemRoutes);

// (Only if backend serves html pages)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'docs', 'index.html')));
app.get('/add-item', (req, res) => res.sendFile(path.join(__dirname, 'docs', 'add-item.html')));
app.get('/item/:id', (req, res) => res.sendFile(path.join(__dirname, 'docs', 'item-detail.html')));
app.get('/auth', (req, res) => res.sendFile(path.join(__dirname, 'docs', 'auth.html')));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'docs', '404.html'));
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  const error = isProd ? 'Internal Server Error' : err.message;
  res.status(500).json({ success: false, message: 'Something went wrong!', error });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});