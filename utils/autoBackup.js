// utils/autoBackup.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
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
        console.log('🔄 Attempting to create database backup...');
        console.log('📁 Backup file:', this.backupFile);
        console.log('🗄️  Database:', this.dbName);
        
        // Check if mysqldump exists
        const fs = require('fs');
        const mysqlDumpPath = this.mysqlPath.replace(/"/g, '');
        if (!fs.existsSync(mysqlDumpPath)) {
            console.error('❌ mysqldump not found at:', mysqlDumpPath);
            console.log('💡 Please check your MySQL installation path');
            return;
        }

        return new Promise((resolve, reject) => {
            const command = `${this.mysqlPath} -u ${this.dbUser} -p${this.dbPassword} ${this.dbName} > "${this.backupFile}"`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Backup failed:', error.message);
                    if (stderr) console.error('📝 Error details:', stderr);
                    
                    // Try alternative without password in command (will prompt)
                    console.log('💡 Trying alternative method...');
                    const altCommand = `echo ${this.dbPassword} | ${this.mysqlPath} -u ${this.dbUser} -p ${this.dbName} > "${this.backupFile}"`;
                    
                    exec(altCommand, (err2, stdout2, stderr2) => {
                        if (err2) {
                            console.error('❌ Alternative backup also failed:', err2.message);
                            reject(err2);
                        } else {
                            console.log('✅ Database backup updated successfully!');
                            resolve();
                        }
                    });
                } else {
                    console.log('✅ Database backup updated successfully!');
                    resolve();
                }
            });
        });
    }

    // Trigger backup on changes
    async onDatabaseChange(action, details = {}) {
        console.log(`📝 Database change detected: ${action}`, details);
        try {
            await this.createBackup();
        } catch (error) {
            console.error('❌ Auto-backup failed:', error.message);
        }
    }
}

module.exports = new AutoBackup();