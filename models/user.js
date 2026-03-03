const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    constructor(userData) {
        this.username = userData.username;
        this.email = userData.email;
        this.password = userData.password;
        this.full_name = userData.full_name || null;
        this.student_id = userData.student_id || null;
        this.role = userData.role || 'student';
    }

    // Hash password before saving
    async hashPassword() {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    // Compare password for login
    async comparePassword(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
    }

    // Save user to database
    async save() {
        try {
            await this.hashPassword();
            const [result] = await db.execute(
                `INSERT INTO users (username, email, password, full_name, student_id, role) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [this.username, this.email, this.password, this.full_name, this.student_id, this.role]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    }

    // Find user by email
    static async findByEmail(email) {
        try {
            const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Find user by username
    static async findByUsername(username) {
        try {
            const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Find user by ID
    static async findById(id) {
        try {
            const [rows] = await db.execute('SELECT id, username, email, full_name, student_id, role FROM users WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }
}

module.exports = User;