// utils/autoBackup.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

class AutoBackup {
    constructor() {
        this.backupFile = path.join(__dirname, '../database-backup.sql');
        this.mysqlPath = '"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump"';
        this.dbName = process.env.DB_NAME || 'lost_found_db';
        this.dbUser = process.env.DB_USER || 'root';
        this.dbPassword = process.env.DB_PASSWORD || 'admin123';
    }

    // Create backup
    async createBackup() {
        return new Promise((resolve, reject) => {
            const command = `${this.mysqlPath} -u ${this.dbUser} -p${this.dbPassword} ${this.dbName} > "${this.backupFile}"`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Backup failed:', error);
                    reject(error);
                } else {
                    console.log('✅ Database backup updated successfully');
                    resolve();
                }
            });
        });
    }

    // Trigger backup on changes
    async onDatabaseChange(action, details = {}) {
        console.log(`📝 Database change detected: ${action}`, details);
        await this.createBackup();
    }
}

module.exports = new AutoBackup();