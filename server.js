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

// Trust proxy for Render (if deployed)
app.set('trust proxy', 1);

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
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
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'your-domain.com' : '*',
    optionsSuccessStatus: 200
}));

// ============================================
// SESSION & PASSPORT CONFIGURATION
// ============================================
// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            // Find user by email or username
            const user = await User.findByEmail(username) || await User.findByUsername(username);
            
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
    }
));

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
// GENERAL MIDDLEWARE
// ============================================
// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
}));

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// DATABASE CONNECTION TEST
// ============================================
db.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes.router);
app.use('/api/items', itemRoutes);

// ============================================
// PAGE ROUTES
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/add-item', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'add-item.html'));
});

app.get('/item/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'item-detail.html'));
});

app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'auth.html'));
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    
    const error = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;
    
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: error
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});