const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            error: {
                message: 'غير مصرح لك بالوصول إلى هذا المورد',
                statusCode: 401
            }
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        const user = await User.findById(decoded.id).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'المستخدم غير موجود',
                    statusCode: 401
                }
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'الحساب معطل',
                    statusCode: 401
                }
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: {
                message: 'رمز الوصول غير صحيح',
                statusCode: 401
            }
        });
    }
};

// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.type)) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'غير مصرح لك بالوصول إلى هذا المورد',
                    statusCode: 403
                }
            });
        }
        next();
    };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (user && user.isActive) {
                req.user = user;
            }
        } catch (error) {
            // Token is invalid, but we don't fail the request
            console.log('Invalid token in optional auth:', error.message);
        }
    }

    next();
};

module.exports = {
    protect,
    authorize,
    optionalAuth
};



