// config/database.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// 🔍 CRITICAL DEBUGGING - SHOWS WHAT ENV VARIABLES ARE RECEIVED
console.log('========== DATABASE DEBUG ==========');
console.log('DB_HOST:', process.env.DB_HOST || '❌ NOT SET');
console.log('DB_USER:', process.env.DB_USER || '❌ NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || '❌ NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || '❌ NOT SET');
console.log('DB_PASSWORD exists:', process.env.DB_PASSWORD ? '✅ YES' : '❌ NO');
console.log('====================================');

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lost_found_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // SSL configuration for TiDB Cloud
    ssl: process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com') ? {
        rejectUnauthorized: true
    } : false
});

// Test connection and create tables
const initializeDatabase = async () => {
    try {
        console.log('Attempting to connect to:', process.env.DB_HOST || 'localhost');
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully to:', process.env.DB_HOST);
        
        // Create users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                student_id VARCHAR(20),
                role ENUM('student', 'staff', 'admin') DEFAULT 'student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Users table ready');
        
        // Create items table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
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
                INDEX idx_date (date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Items table ready');
        
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
            console.log('✅ Added image_path column to items table');
        }
        
        connection.release();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        throw error;
    }
};

// Initialize database on startup
initializeDatabase().catch(console.error);

module.exports = pool;

// config/database.js - Add this after dotenv.config()
console.log('========== RUNTIME ENV CHECK ==========');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD exists?', process.env.DB_PASSWORD ? 'YES' : 'NO');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('=======================================');