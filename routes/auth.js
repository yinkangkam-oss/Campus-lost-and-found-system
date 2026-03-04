// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const passport = require('passport');
const autoBackup = require('../utils/autoBackup');
const db = require('../config/database'); // Added for admin routes

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

        console.log('Registration attempt for:', username);

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
            console.log('Registration failed: User already exists');
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
        console.log('User registered successfully with ID:', userId);
        
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

// Login - WITH DEBUG LOGGING
router.post('/login', (req, res, next) => {
    console.log('===================================');
    console.log('Login attempt received:');
    console.log('Username/Email:', req.body.username);
    console.log('Password provided:', req.body.password ? 'Yes' : 'No');
    console.log('===================================');
    
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('❌ Login error:', err);
            return res.status(500).json({ success: false, message: 'Login error' });
        }
        
        if (!user) {
            console.log('❌ Login failed:', info ? info.message : 'No user found');
            return res.status(401).json({ 
                success: false, 
                message: info ? info.message : 'Invalid credentials' 
            });
        }
        
        console.log('✅ User found:', user.username);
        console.log('User ID:', user.id);
        
        req.logIn(user, (err) => {
            if (err) {
                console.error('❌ Session login error:', err);
                return res.status(500).json({ success: false, message: 'Login error' });
            }
            
            console.log('✅ Login successful for:', user.username);
            console.log('Session created');
            
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
    const username = req.user ? req.user.username : 'Unknown';
    console.log('Logout attempt for:', username);
    
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ success: false, message: 'Logout error' });
        }
        console.log('Logout successful for:', username);
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Get current user
router.get('/me', isAuthenticated, (req, res) => {
    console.log('Session check for user:', req.user ? req.user.username : 'No user');
    res.json({
        success: true,
        user: req.user
    });
});

// Get all users (admin only)
router.get('/users', isAuthenticated, async (req, res) => {
    try {
        console.log('Admin users list requested by:', req.user.username);
        
        // Check if user is admin
        if (req.user.role !== 'admin') {
            console.log('Access denied - not admin');
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        const [users] = await db.execute(
            'SELECT id, username, email, full_name, student_id, role, created_at FROM users'
        );
        
        console.log('Returning', users.length, 'users');
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
        console.log('Admin delete user requested by:', req.user.username);
        console.log('Target user ID:', req.params.id);
        
        if (req.user.role !== 'admin') {
            console.log('Access denied - not admin');
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        const [result] = await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            console.log('User not found:', req.params.id);
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        console.log('User deleted successfully:', req.params.id);
        
        // AUTO BACKUP: Trigger backup after user deletion
        await autoBackup.onDatabaseChange('USER_DELETED', { userId: req.params.id });
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Error deleting user' });
    }
});

module.exports = { router, isAuthenticated };