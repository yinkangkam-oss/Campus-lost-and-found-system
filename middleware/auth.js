// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const passport = require('passport');
const bcrypt = require('bcryptjs');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Please login first' });
};

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, full_name, student_id } = req.body;

        // Check if user exists
        const existingUser = await User.findByEmail(email) || await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username or email already exists' 
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            full_name,
            student_id
        });

        const userId = await user.save();
        
        res.status(201).json({
            success: true,
            message: 'Registration successful! Please login.',
            userId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error during registration' 
        });
    }
});

// Login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Login error' });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: info.message });
        }
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Login error' });
            }
            return res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role
                }
            });
        });
    })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout error' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Get current user
router.get('/me', isAuthenticated, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

module.exports = { router, isAuthenticated };