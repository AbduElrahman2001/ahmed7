const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '24h'
    });
};

// @desc    Admin login
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('اسم المستخدم يجب أن يكون بين 3 و 30 حرف')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('اسم المستخدم يمكن أن يحتوي على أحرف وأرقام وشرطة سفلية فقط'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: errors.array()[0].msg,
                    statusCode: 400
                }
            });
        }

        const { username, password } = req.body;

        // Find user by username
        const user = await User.findOne({ username }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'بيانات الدخول غير صحيحة',
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

        // Check if account is locked
        if (user.isLocked) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'الحساب مقفل مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً',
                    statusCode: 401
                }
            });
        }

        // Check if password matches
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            // Increment login attempts
            await user.incLoginAttempts();
            
            return res.status(401).json({
                success: false,
                error: {
                    message: 'بيانات الدخول غير صحيحة',
                    statusCode: 401
                }
            });
        }

        // Reset login attempts on successful login
        await user.resetLoginAttempts();

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    type: user.type,
                    isActive: user.isActive,
                    lastLogin: user.lastLogin
                },
                token
            },
            message: `مرحباً بك ${user.username}!`
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    type: user.type,
                    isActive: user.isActive,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                }
            }
        });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
    try {
        // In a real application, you might want to blacklist the token
        // For now, we'll just return a success message
        res.status(200).json({
            success: true,
            message: 'تم تسجيل الخروج بنجاح'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', [
    protect,
    authorize('admin'),
    body('currentPassword')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور الحالية يجب أن تكون 6 أحرف على الأقل'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('كلمة المرور الجديدة يجب أن تحتوي على حرف كبير وحرف صغير ورقم')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: errors.array()[0].msg,
                    statusCode: 400
                }
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'كلمة المرور الحالية غير صحيحة',
                    statusCode: 400
                }
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'تم تغيير كلمة المرور بنجاح'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Create new admin (protected route)
// @route   POST /api/auth/register
// @access  Private (Admin only)
router.post('/register', [
    protect,
    authorize('admin'),
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('اسم المستخدم يجب أن يكون بين 3 و 30 حرف')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('اسم المستخدم يمكن أن يحتوي على أحرف وأرقام وشرطة سفلية فقط'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),
    body('type')
        .isIn(['admin', 'customer'])
        .withMessage('نوع المستخدم غير صحيح')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: errors.array()[0].msg,
                    statusCode: 400
                }
            });
        }

        const { username, password, type } = req.body;

        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'اسم المستخدم موجود بالفعل',
                    statusCode: 400
                }
            });
        }

        // Create new user
        const user = await User.create({
            username,
            password,
            type: type || 'admin'
        });

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    type: user.type,
                    isActive: user.isActive,
                    createdAt: user.createdAt
                }
            },
            message: 'تم إنشاء المستخدم بنجاح'
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

module.exports = router;



