// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const passport = require('passport');
const autoBackup = require('../utils/autoBackup');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Please login first' });
};

// Register new user - WITH AUTO BACKUP
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, full_name, student_id } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide all required fields' 
            });
        }

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
        
        // AUTO BACKUP: Trigger backup after new user
        await autoBackup.onDatabaseChange('USER_CREATED', { userId, username });
        
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

// Get all users (admin only)
router.get('/users', isAuthenticated, async (req, res) => {
    try {
        // Check if user is admin (you can add role check)
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        const [users] = await db.execute('SELECT id, username, email, full_name, student_id, role, created_at FROM users');
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

// Delete user (admin only)
router.delete('/users/:id', isAuthenticated, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        const [result] = await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // AUTO BACKUP: Trigger backup after user deletion
        await autoBackup.onDatabaseChange('USER_DELETED', { userId: req.params.id });
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Error deleting user' });
    }
});

module.exports = { router, isAuthenticated };