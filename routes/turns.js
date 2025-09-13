const express = require('express');
const { body, validationResult } = require('express-validator');
const Turn = require('../models/Turn');

const router = express.Router();

// @desc    Create new turn (customer booking)
// @route   POST /api/turns
// @access  Public
router.post('/', [
    body('customerName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('اسم العميل يجب أن يكون بين 2 و 50 حرف'),
    body('mobileNumber')
        .trim()
        .isLength({ min: 8, max: 15 })
        .withMessage('رقم الجوال يجب أن يكون بين 8 و 15 رقم')
        .matches(/^[0-9+\-\s()]+$/)
        .withMessage('رقم الجوال غير صحيح'),
    body('serviceType')
        .isIn(['haircut', 'beard-trim', 'haircut-beard', 'shampoo', 'styling'])
        .withMessage('نوع الخدمة غير صحيح')
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

        const { customerName, mobileNumber, serviceType } = req.body;

        // Check if customer already has a waiting turn
        const existingTurn = await Turn.findOne({
            mobileNumber,
            status: 'waiting'
        });

        if (existingTurn) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'لديك دور بالفعل في الطابور!',
                    statusCode: 400
                }
            });
        }

        // Get next available turn number
        const turnNumber = await Turn.getNextTurnNumber();

        // Create new turn
        const turn = await Turn.create({
            customerName,
            mobileNumber,
            serviceType,
            turnNumber
        });

        res.status(201).json({
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
                    waitTimeMinutes: turn.waitTimeMinutes,
                    formattedWaitTime: turn.formattedWaitTime
                }
            },
            message: `تم تأكيد الدور ${turn.turnNumber}! ستستلم رسالة نصية عندما يحين دورك.`
        });

    } catch (error) {
        console.error('Create turn error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Get turn by mobile number
// @route   GET /api/turns/customer/:mobileNumber
// @access  Public
router.get('/customer/:mobileNumber', async (req, res) => {
    try {
        const { mobileNumber } = req.params;

        // Find turn for this mobile number (including cancelled/completed)
        const turn = await Turn.findOne({
            mobileNumber,
            status: { $in: ['waiting', 'confirmed', 'completed', 'cancelled'] }
        }).sort({ createdAt: -1 }); // Get the most recent turn

        if (!turn) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'لم يتم العثور على دور لهذا الرقم',
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
                    formattedWaitTime: turn.formattedWaitTime
                }
            }
        });

    } catch (error) {
        console.error('Get turn by mobile error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Cancel turn by mobile number
// @route   PUT /api/turns/cancel/:mobileNumber
// @access  Public
router.put('/cancel/:mobileNumber', async (req, res) => {
    try {
        const { mobileNumber } = req.params;

        // Find active turn for this mobile number
        const turn = await Turn.findOne({
            mobileNumber,
            status: { $in: ['waiting', 'confirmed'] }
        });

        if (!turn) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'لم يتم العثور على دور نشط لهذا الرقم',
                    statusCode: 404
                }
            });
        }

        // Cancel the turn
        await turn.cancel('customer');

        // Reorder remaining turn numbers
        await Turn.reorderTurnNumbers();

        res.status(200).json({
            success: true,
            message: 'تم إلغاء دورك بنجاح'
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

// @desc    Get turn statistics
// @route   GET /api/turns/stats
// @access  Public
router.get('/stats', async (req, res) => {
    try {
        const waitingCount = await Turn.getWaitingCount();
        const averageWaitTime = await Turn.getAverageWaitTime();

        res.status(200).json({
            success: true,
            data: {
                waitingCount,
                averageWaitTime,
                estimatedWaitTime: waitingCount * 15 // Assuming 15 minutes per customer
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'خطأ في الخادم',
                statusCode: 500
            }
        });
    }
});

// @desc    Get all waiting turns (for display board)
// @route   GET /api/turns/waiting
// @access  Public
router.get('/waiting', async (req, res) => {
    try {
        const waitingTurns = await Turn.find({ status: 'waiting' })
            .sort({ turnNumber: 1 })
            .select('turnNumber customerName serviceType createdAt');

        res.status(200).json({
            success: true,
            data: {
                turns: waitingTurns.map(turn => ({
                    turnNumber: turn.turnNumber,
                    customerName: turn.customerName,
                    serviceType: turn.serviceType,
                    serviceNameArabic: turn.serviceNameArabic,
                    createdAt: turn.createdAt
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

// @desc    Get turn by ID
// @route   GET /api/turns/:id
// @access  Public
router.get('/:id', async (req, res) => {
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
                    smsSent: turn.smsSent,
                    smsSentAt: turn.smsSentAt,
                    smsMessage: turn.smsMessage
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

module.exports = router;
