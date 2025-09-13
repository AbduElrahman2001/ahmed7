const express = require('express');
const { body, validationResult } = require('express-validator');
const Turn = require('../models/Turn');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(protect);
router.use(authorize('admin'));

// @desc    Get all turns with filtering and pagination
// @route   GET /api/admin/turns
// @access  Private (Admin only)
router.get('/turns', async (req, res) => {
    try {
        const { 
            status, 
            page = 1, 
            limit = 10, 
            sortBy = 'createdAt', 
            sortOrder = 'desc' 
        } = req.query;

        // Build filter object
        const filter = {};
        if (status) {
            filter.status = status;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query
        const turns = await Turn.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Turn.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                turns: turns.map(turn => ({
                    id: turn._id,
                    customerName: turn.customerName,
                    mobileNumber: turn.mobileNumber,
                    serviceType: turn.serviceType,
                    serviceNameArabic: turn.serviceNameArabic,
                    turnNumber: turn.turnNumber,
                    status: turn.status,
                    statusNameArabic: turn.statusNameArabic,
                    createdAt: turn.createdAt,
                    completedAt: turn.completedAt,
                    cancelledAt: turn.cancelledAt,
                    cancelledBy: turn.cancelledBy,
                    waitTimeMinutes: turn.waitTimeMinutes,
                    formattedWaitTime: turn.formattedWaitTime,
                })),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get turns error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Get waiting turns only
// @route   GET /api/admin/turns/waiting
// @access  Private (Admin only)
router.get('/turns/waiting', async (req, res) => {
    try {
        const waitingTurns = await Turn.find({ status: 'waiting' })
            .sort({ turnNumber: 1 });

        res.status(200).json({
            success: true,
            data: {
                turns: waitingTurns.map(turn => ({
                    id: turn._id,
                    customerName: turn.customerName,
                    mobileNumber: turn.mobileNumber,
                    serviceType: turn.serviceType,
                    serviceNameArabic: turn.serviceNameArabic,
                    turnNumber: turn.turnNumber,
                    status: turn.status,
                    statusNameArabic: turn.statusNameArabic,
                    createdAt: turn.createdAt,
                    waitTimeMinutes: turn.waitTimeMinutes,
                    formattedWaitTime: turn.formattedWaitTime
                }))
            }
        });

    } catch (error) {
        console.error('Get waiting turns error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Complete a turn
// @route   PUT /api/admin/turns/:id/complete
// @access  Private (Admin only)
router.put('/turns/:id/complete', async (req, res) => {
    try {
        const turn = await Turn.findById(req.params.id);

        if (!turn) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'الدور غير موجود',
                    statusCode: 404
                }
            });
        }

        if (turn.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'لا يمكن إكمال دور غير منتظر',
                    statusCode: 400
                }
            });
        }

        // Complete the turn
        await turn.complete();

        // Reorder remaining turn numbers
        await Turn.reorderTurnNumbers();

        res.status(200).json({
            success: true,
            data: {
                turn: {
                    id: turn._id,
                    customerName: turn.customerName,
                    turnNumber: turn.turnNumber,
                    status: turn.status,
                    completedAt: turn.completedAt
                }
            },
            message: `تم إكمال الدور #${turn.turnNumber} بنجاح`
        });

    } catch (error) {
        console.error('Complete turn error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Cancel a turn (admin)
// @route   PUT /api/admin/turns/:id/cancel
// @access  Private (Admin only)
router.put('/turns/:id/cancel', async (req, res) => {
    try {
        const turn = await Turn.findById(req.params.id);

        if (!turn) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'الدور غير موجود',
                    statusCode: 404
                }
            });
        }

        if (turn.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'لا يمكن إلغاء دور غير منتظر',
                    statusCode: 400
                }
            });
        }

        // Cancel the turn
        await turn.cancel('admin');

        // Reorder remaining turn numbers
        await Turn.reorderTurnNumbers();

        res.status(200).json({
            success: true,
            message: `تم إلغاء الدور #${turn.turnNumber} بنجاح`
        });

    } catch (error) {
        console.error('Cancel turn error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});


// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
    try {
        // Get various statistics
        const waitingCount = await Turn.getWaitingCount();
        const averageWaitTime = await Turn.getAverageWaitTime();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayTurns = await Turn.countDocuments({
            createdAt: { $gte: today }
        });
        
        const todayCompleted = await Turn.countDocuments({
            status: 'completed',
            completedAt: { $gte: today }
        });
        
        const todayCancelled = await Turn.countDocuments({
            status: 'cancelled',
            cancelledAt: { $gte: today }
        });

        // Get service type distribution
        const serviceStats = await Turn.aggregate([
            { $match: { status: 'waiting' } },
            { $group: { _id: '$serviceType', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                waitingCount,
                averageWaitTime,
                todayStats: {
                    total: todayTurns,
                    completed: todayCompleted,
                    cancelled: todayCancelled
                },
                serviceStats: serviceStats.map(stat => ({
                    serviceType: stat._id,
                    count: stat.count
                }))
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Get turn by ID (admin view)
// @route   GET /api/admin/turns/:id
// @access  Private (Admin only)
router.get('/turns/:id', async (req, res) => {
    try {
        const turn = await Turn.findById(req.params.id);

        if (!turn) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'الدور غير موجود',
                    statusCode: 404
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                turn: {
                    id: turn._id,
                    customerName: turn.customerName,
                    mobileNumber: turn.mobileNumber,
                    serviceType: turn.serviceType,
                    serviceNameArabic: turn.serviceNameArabic,
                    turnNumber: turn.turnNumber,
                    status: turn.status,
                    statusNameArabic: turn.statusNameArabic,
                    createdAt: turn.createdAt,
                    completedAt: turn.completedAt,
                    cancelledAt: turn.cancelledAt,
                    cancelledBy: turn.cancelledBy,
                    waitTimeMinutes: turn.waitTimeMinutes,
                    formattedWaitTime: turn.formattedWaitTime,
,
                    notes: turn.notes
                }
            }
        });

    } catch (error) {
        console.error('Get turn by ID error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Update turn notes
// @route   PUT /api/admin/turns/:id/notes
// @access  Private (Admin only)
router.put('/turns/:id/notes', [
    body('notes')
        .trim()
        .isLength({ max: 500 })
        .withMessage('الملاحظات لا يمكن أن تتجاوز 500 حرف')
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

        const turn = await Turn.findById(req.params.id);
        const { notes } = req.body;

        if (!turn) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'الدور غير موجود',
                    statusCode: 404
                }
            });
        }

        turn.notes = notes;
        await turn.save();

        res.status(200).json({
            success: true,
            message: 'تم تحديث الملاحظات بنجاح'
        });

    } catch (error) {
        console.error('Update notes error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Log call attempt
// @route   POST /api/admin/turns/:id/call
// @access  Private (Admin only)
router.post('/turns/:id/call', async (req, res) => {
    try {
        const turn = await Turn.findById(req.params.id);

        if (!turn) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'الدور غير موجود',
                    statusCode: 404
                }
            });
        }

        if (turn.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'لا يمكن الاتصال بدور غير منتظر',
                    statusCode: 400
                }
            });
        }

        // Log the call attempt
        console.log(`Call initiated to ${turn.customerName} (${turn.mobileNumber}) for turn #${turn.turnNumber}`);

        res.status(200).json({
            success: true,
            message: `تم الاتصال بـ ${turn.customerName} بنجاح`
        });

    } catch (error) {
        console.error('Call logging error:', error);
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



