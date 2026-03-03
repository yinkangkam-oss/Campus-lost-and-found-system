// middleware/auth.js
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ 
        success: false, 
        message: 'Please login first' 
    });
};

module.exports = { isAuthenticated };