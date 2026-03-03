// models/Item.js
const db = require('../config/database');
const sanitizeHtml = require('sanitize-html');

class Item {
    constructor(itemData) {
        this.title = itemData.title;
        this.description = itemData.description;
        this.category = itemData.category;
        this.location = itemData.location;
        this.date = itemData.date;
        this.contact_info = itemData.contact_info;
        this.status = itemData.status || 'active';
        this.image_path = itemData.image_path || null;
        this.user_id = itemData.user_id || null;
    }

    // Sanitize input data to prevent XSS
    static sanitize(input) {
        if (typeof input === 'string') {
            return sanitizeHtml(input, {
                allowedTags: [],
                allowedAttributes: {}
            });
        }
        return input;
    }

    // Create new item
    async save() {
        try {
            console.log('Saving item with user_id:', this.user_id);
            
            const [result] = await db.execute(
                `INSERT INTO items (title, description, category, location, date, contact_info, status, image_path, user_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    Item.sanitize(this.title),
                    Item.sanitize(this.description),
                    this.category,
                    Item.sanitize(this.location),
                    this.date,
                    Item.sanitize(this.contact_info),
                    this.status,
                    this.image_path,
                    this.user_id
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error in save:', error);
            throw error;
        }
    }

    // Get all items with optional filters - INCLUDES USER INFO
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT items.*, users.username, users.full_name 
                FROM items 
                LEFT JOIN users ON items.user_id = users.id 
                WHERE 1=1
            `;
            const params = [];

            if (filters.category) {
                query += ' AND category = ?';
                params.push(filters.category);
            }

            if (filters.status) {
                query += ' AND status = ?';
                params.push(filters.status);
            }

            query += ' ORDER BY items.created_at DESC';

            const [rows] = await db.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    // Find item by ID - INCLUDES USER INFO - FIXED VERSION
    static async findById(id) {
        try {
            const [rows] = await db.execute(
                `SELECT items.*, users.username, users.full_name 
                 FROM items 
                 LEFT JOIN users ON items.user_id = users.id 
                 WHERE items.id = ?`,
                [id]
            );
            
            // Return the item if found, otherwise return null
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error in findById:', error);
            throw error;
        }
    }

    // Update item
    static async update(id, itemData) {
        try {
            let query = `UPDATE items SET title = ?, description = ?, category = ?, 
                         location = ?, date = ?, contact_info = ?, status = ?`;
            const params = [
                Item.sanitize(itemData.title),
                Item.sanitize(itemData.description),
                itemData.category,
                Item.sanitize(itemData.location),
                itemData.date,
                Item.sanitize(itemData.contact_info),
                itemData.status
            ];

            if (itemData.image_path) {
                query += ', image_path = ?';
                params.push(itemData.image_path);
            }

            query += ' WHERE id = ?';
            params.push(id);

            const [result] = await db.execute(query, params);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in update:', error);
            throw error;
        }
    }

    // Update status only
    static async updateStatus(id, status) {
        try {
            const [result] = await db.execute(
                'UPDATE items SET status = ? WHERE id = ?',
                [status, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in updateStatus:', error);
            throw error;
        }
    }

    // Delete item
    static async delete(id) {
        try {
            const [item] = await db.execute('SELECT image_path FROM items WHERE id = ?', [id]);
            
            const [result] = await db.execute(
                'DELETE FROM items WHERE id = ?',
                [id]
            );
            
            return { success: result.affectedRows > 0, image_path: item[0]?.image_path };
        } catch (error) {
            console.error('Error in delete:', error);
            throw error;
        }
    }

    // Search items - INCLUDES USER INFO
    static async search(searchTerm, filters = {}) {
        try {
            let query = `
                SELECT items.*, users.username, users.full_name 
                FROM items 
                LEFT JOIN users ON items.user_id = users.id 
                WHERE 1=1
            `;
            const params = [];

            if (searchTerm && searchTerm.trim() !== '') {
                query += ` AND (items.title LIKE ? OR items.description LIKE ? OR items.location LIKE ?)`;
                const searchPattern = `%${searchTerm}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }

            if (filters.category) {
                query += ' AND items.category = ?';
                params.push(filters.category);
            }

            if (filters.status) {
                query += ' AND items.status = ?';
                params.push(filters.status);
            }

            if (filters.fromDate) {
                query += ' AND items.date >= ?';
                params.push(filters.fromDate);
            }
            if (filters.toDate) {
                query += ' AND items.date <= ?';
                params.push(filters.toDate);
            }

            query += ' ORDER BY items.created_at DESC';

            const [rows] = await db.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error in search:', error);
            throw error;
        }
    }

    // Get items by user
    static async findByUserId(userId) {
        try {
            const [rows] = await db.execute(
                `SELECT items.*, users.username, users.full_name 
                 FROM items 
                 LEFT JOIN users ON items.user_id = users.id 
                 WHERE items.user_id = ? 
                 ORDER BY items.created_at DESC`,
                [userId]
            );
            return rows;
        } catch (error) {
            console.error('Error in findByUserId:', error);
            throw error;
        }
    }
}

module.exports = Item;