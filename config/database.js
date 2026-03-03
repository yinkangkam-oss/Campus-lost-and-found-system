// config/database.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lost_found_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection and create table if not exists
const initializeDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        
        // Create items table if it doesn't exist (with image_path column)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                category ENUM('lost', 'found') NOT NULL,
                location VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                contact_info VARCHAR(255) NOT NULL,
                image_path VARCHAR(255) NULL,
                status ENUM('active', 'claimed', 'resolved') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_category (category),
                INDEX idx_status (status),
                INDEX idx_date (date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Check if image_path column exists (for existing databases)
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'items' 
            AND COLUMN_NAME = 'image_path'
            AND TABLE_SCHEMA = ?
        `, [process.env.DB_NAME || 'lost_found_db']);
        
        if (columns.length === 0) {
            // Add image_path column if it doesn't exist
            await connection.execute(`
                ALTER TABLE items 
                ADD COLUMN image_path VARCHAR(255) NULL AFTER contact_info
            `);
            console.log('Added image_path column to items table');
        }
        
        connection.release();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
};

// Initialize database on startup
initializeDatabase().catch(console.error);

module.exports = pool;