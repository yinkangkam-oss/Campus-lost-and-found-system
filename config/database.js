// config/database.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// 🔍 Debug: Show what environment variables are being used
console.log('========== DATABASE CONFIG ==========');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_USER:', process.env.DB_USER || 'root');
console.log('DB_NAME:', process.env.DB_NAME || 'lost_found_db');
console.log('DB_PORT:', process.env.DB_PORT || '3306');
console.log('DB_PASSWORD exists:', process.env.DB_PASSWORD ? '✅ YES' : '❌ NO');
console.log('=====================================');

// SSL configuration for TiDB Cloud
let sslConfig = {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
};

// Optional: Try to load CA certificate if needed (commented out by default)
// try {
//     const caPath = path.join(__dirname, '../certs/isrgrootx1.pem');
//     if (fs.existsSync(caPath)) {
//         sslConfig.ca = fs.readFileSync(caPath);
//         console.log('✅ CA certificate loaded');
//     }
// } catch (err) {
//     console.log('ℹ️ No CA certificate file found, using system defaults');
// }

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 4000, // Ensure port is a number
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, // Increased for cloud connections
    // 🔐 SSL configuration for TiDB Cloud (required)
    ssl: sslConfig
});

// Test connection and create tables
const initializeDatabase = async () => {
    try {
        console.log('Attempting to connect to database...');
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