// routes/items.js
/* eslint-disable */
const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { validateItem, validateStatus } = require('../middleware/validation');
const upload = require('../config/upload');
const fs = require('fs');
const path = require('path');
const autoBackup = require('../utils/autoBackup');

// ============================================
// PUBLIC ROUTES (No login required)
// ============================================

// GET all items
router.get('/', async (req, res) => {
    try {
        const filters = {};
        if (req.query.category) filters.category = req.query.category;
        if (req.query.status) filters.status = req.query.status;
        
        const items = await Item.findAll(filters);
        res.json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching items'
        });
    }
});

// GET single item
router.get('/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }
        
        res.json({
            success: true,
            data: item
        });
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching item'
        });
    }
});

// GET search items
router.get('/search/advanced', async (req, res) => {
    try {
        const { q, category, status, fromDate, toDate } = req.query;
        
        const filters = {};
        if (category) filters.category = category;
        if (status) filters.status = status;
        if (fromDate) filters.fromDate = fromDate;
        if (toDate) filters.toDate = toDate;
        
        const items = await Item.search(q, filters);
        
        res.json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        console.error('Error searching items:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching items'
        });
    }
});

// ============================================
// PROTECTED ROUTES (Login required)
// ============================================

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ 
        success: false, 
        message: 'Please login first' 
    });
};

// POST create new item - WITH AUTO BACKUP
router.post('/', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        console.log('POST request received from user:', req.user?.id);
        
        // Validate required fields
        const requiredFields = ['title', 'description', 'category', 'location', 'date', 'contact_info'];
        for (let field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required field: ${field}`
                });
            }
        }
        
        const itemData = {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            location: req.body.location,
            date: req.body.date,
            contact_info: req.body.contact_info,
            status: req.body.status || 'active',
            image_path: req.file ? '/uploads/' + req.file.filename : null,
            user_id: req.user.id // Add the user ID from logged in user
        };
        
        const item = new Item(itemData);
        const id = await item.save();
        
        // AUTO BACKUP: Trigger backup after new item
        await autoBackup.onDatabaseChange('ITEM_CREATED', { 
            itemId: id, 
            title: itemData.title,
            userId: req.user.id 
        });
        
        res.status(201).json({
            success: true,
            message: 'Item created successfully',
            data: { id, ...itemData }
        });
    } catch (error) {
        console.error('Error creating item:', error);
        
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating item',
            error: error.message
        });
    }
});

// PUT update item - WITH AUTO BACKUP
router.put('/:id', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const existingItem = await Item.findById(req.params.id);
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }
        
        // Check if user owns this item
        if (existingItem.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own items'
            });
        }
        
        const itemData = {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            location: req.body.location,
            date: req.body.date,
            contact_info: req.body.contact_info,
            status: req.body.status
        };
        
        if (req.file) {
            itemData.image_path = '/uploads/' + req.file.filename;
            
            if (existingItem.image_path) {
                const oldImagePath = path.join(__dirname, '../', existingItem.image_path);
                fs.unlink(oldImagePath, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                });
            }
        }
        
        const updated = await Item.update(req.params.id, itemData);
        
        // AUTO BACKUP: Trigger backup after item update
        await autoBackup.onDatabaseChange('ITEM_UPDATED', { 
            itemId: req.params.id, 
            title: itemData.title,
            userId: req.user.id 
        });
        
        res.json({
            success: true,
            message: 'Item updated successfully'
        });
    } catch (error) {
        console.error('Error updating item:', error);
        
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error updating item',
            error: error.message
        });
    }
});

// PATCH update item status - WITH AUTO BACKUP
router.patch('/:id/status', isAuthenticated, validateStatus, async (req, res) => {
    try {
        const existingItem = await Item.findById(req.params.id);
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }
        
        // Check if user owns this item
        if (existingItem.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own items'
            });
        }
        
        const updated = await Item.updateStatus(req.params.id, req.body.status);
        
        // AUTO BACKUP: Trigger backup after status update
        await autoBackup.onDatabaseChange('ITEM_STATUS_UPDATED', { 
            itemId: req.params.id, 
            newStatus: req.body.status,
            userId: req.user.id 
        });
        
        res.json({
            success: true,
            message: 'Status updated successfully'
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating status'
        });
    }
});

// DELETE item - WITH AUTO BACKUP
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const existingItem = await Item.findById(req.params.id);
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }
        
        // Check if user owns this item
        if (existingItem.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own items'
            });
        }
        
        const result = await Item.delete(req.params.id);
        
        if (result.image_path) {
            const imagePath = path.join(__dirname, '../', result.image_path);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting image file:', err);
            });
        }
        
        // AUTO BACKUP: Trigger backup after item deletion
        await autoBackup.onDatabaseChange('ITEM_DELETED', { 
            itemId: req.params.id, 
            title: existingItem.title,
            userId: req.user.id 
        });
        
        res.json({
            success: true,
            message: 'Item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting item'
        });
    }
});

// Get items by current user
router.get('/user/me', isAuthenticated, async (req, res) => {
    try {
        const items = await Item.findByUserId(req.user.id);
        res.json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        console.error('Error fetching user items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching your items'
        });
    }
});

module.exports = router;