const { body, validationResult } = require('express-validator');

const validateItem = [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ min: 3, max: 255 }).escape(),
    body('description').trim().notEmpty().withMessage('Description is required').isLength({ min: 10 }).escape(),
    body('category').notEmpty().withMessage('Category is required').isIn(['lost', 'found']),
    body('location').trim().notEmpty().withMessage('Location is required').escape(),
    body('date').notEmpty().withMessage('Date is required').isDate(),
    body('contact_info').trim().notEmpty().withMessage('Contact information is required').escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
        next();
    }
];

const validateStatus = [
    body('status').notEmpty().withMessage('Status is required').isIn(['active', 'claimed', 'resolved']),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
        next();
    }
];

module.exports = { validateItem, validateStatus };