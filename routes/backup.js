// routes/backup.js
const express = require('express');
const router = express.Router();
const autoBackup = require('../utils/autoBackup');
const fs = require('fs');
const path = require('path');

// Manual backup endpoint (admin only)
router.post('/backup', async (req, res) => {
    try {
        await autoBackup.createBackup();
        
        // Check if file exists and get info
        const stats = fs.statSync(autoBackup.backupFile);
        const fileSize = (stats.size / 1024).toFixed(2); // KB
        
        res.json({
            success: true,
            message: 'Backup created successfully',
            file: {
                path: autoBackup.backupFile,
                size: `${fileSize} KB`,
                modified: stats.mtime
            }
        });
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Backup failed',
            error: error.message
        });
    }
});

// Download backup
router.get('/backup/download', (req, res) => {
    const file = autoBackup.backupFile;
    res.download(file, 'database-backup.sql', (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(500).json({ success: false, message: 'Download failed' });
        }
    });
});

module.exports = router;