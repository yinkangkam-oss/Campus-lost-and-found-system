// config/database.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

console.log('========== DATABASE CONFIG ==========');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_USER:', process.env.DB_USER || 'root');
console.log('DB_NAME:', process.env.DB_NAME || 'lost_found_db');
console.log('DB_PORT:', process.env.DB_PORT || '3306');
console.log('DB_PASSWORD exists:', process.env.DB_PASSWORD ? '✅ YES' : '❌ NO');
console.log('=====================================');

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
    keepAliveInitialDelay: 10000
});

// Test connection
const initializeDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully to:', process.env.DB_HOST);
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
    }
};

initializeDatabase();

module.exports = pool;