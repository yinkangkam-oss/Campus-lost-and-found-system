// middleware/validation.js
const { body, validationResult } = require('express-validator');

// Validation rules for item submission
const validateItem = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ min: 3, max: 255 }).withMessage('Title must be between 3 and 255 characters')
        .escape(),
    
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ min: 10, max: 5000 }).withMessage('Description must be between 10 and 5000 characters')
        .escape(),
    
    body('category')
        .notEmpty().withMessage('Category is required')
        .isIn(['lost', 'found']).withMessage('Invalid category'),
    
    body('location')
        .trim()
        .notEmpty().withMessage('Location is required')
        .isLength({ max: 255 }).withMessage('Location too long')
        .escape(),
    
    body('date')
        .notEmpty().withMessage('Date is required')
        .isDate().withMessage('Invalid date format'),
    
    body('contact_info')
        .trim()
        .notEmpty().withMessage('Contact information is required')
        .isLength({ max: 255 }).withMessage('Contact info too long')
        .escape(),
    
    body('status')
        .optional()
        .isIn(['active', 'claimed', 'resolved']).withMessage('Invalid status'),
    
    // Handle validation results
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

// Validation for status update
const validateStatus = [
    body('status')
        .notEmpty().withMessage('Status is required')
        .isIn(['active', 'claimed', 'resolved']).withMessage('Invalid status'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

module.exports = {
    validateItem,
    validateStatus
};