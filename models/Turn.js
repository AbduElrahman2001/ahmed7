const mongoose = require('mongoose');

const turnSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: [true, 'اسم العميل مطلوب'],
        trim: true,
        minlength: [2, 'اسم العميل يجب أن يكون حرفين على الأقل'],
        maxlength: [50, 'اسم العميل لا يمكن أن يتجاوز 50 حرف']
    },
    mobileNumber: {
        type: String,
        required: [true, 'رقم الجوال مطلوب'],
        trim: true,
        match: [/^[0-9+\-\s()]+$/, 'رقم الجوال غير صحيح'],
        minlength: [8, 'رقم الجوال يجب أن يكون 8 أرقام على الأقل'],
        maxlength: [15, 'رقم الجوال لا يمكن أن يتجاوز 15 رقم']
    },
    serviceType: {
        type: String,
        required: [true, 'نوع الخدمة مطلوب'],
        enum: {
            values: ['haircut', 'beard-trim', 'haircut-beard', 'shampoo', 'styling'],
            message: 'نوع الخدمة غير صحيح'
        }
    },
    turnNumber: {
        type: Number,
        required: [true, 'رقم الدور مطلوب'],
        min: [1, 'رقم الدور يجب أن يكون 1 على الأقل']
    },
    status: {
        type: String,
        required: [true, 'حالة الدور مطلوبة'],
        enum: {
            values: ['waiting', 'confirmed', 'completed', 'cancelled'],
            message: 'حالة الدور غير صحيحة'
        },
        default: 'waiting'
    },
    estimatedWaitTime: {
        type: Number, // in minutes
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    cancelledAt: {
        type: Date,
        default: null
    },
    cancelledBy: {
        type: String,
        enum: ['customer', 'admin', null],
        default: null
    },
    notes: {
        type: String,
        maxlength: [500, 'الملاحظات لا يمكن أن تتجاوز 500 حرف']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for service name in Arabic
turnSchema.virtual('serviceNameArabic').get(function() {
    const serviceNames = {
        'haircut': 'قص شعر',
        'beard-trim': 'قص لحية',
        'haircut-beard': 'قص شعر + لحية',
        'shampoo': 'غسيل شعر',
        'styling': 'تسريحة'
    };
    return serviceNames[this.serviceType] || this.serviceType;
});

// Virtual for status name in Arabic
turnSchema.virtual('statusNameArabic').get(function() {
    const statusNames = {
        'waiting': 'في الانتظار',
        'confirmed': 'مؤكد',
        'completed': 'مكتمل',
        'cancelled': 'ملغي'
    };
    return statusNames[this.status] || this.status;
});

// Virtual for wait time in minutes
turnSchema.virtual('waitTimeMinutes').get(function() {
    if (this.status === 'completed' || this.status === 'cancelled') {
        return null;
    }
    
    const now = new Date();
    const createdAt = new Date(this.createdAt);
    const diffMs = now - createdAt;
    return Math.floor(diffMs / (1000 * 60));
});

// Virtual for formatted wait time
turnSchema.virtual('formattedWaitTime').get(function() {
    const minutes = this.waitTimeMinutes;
    if (minutes === null) return null;
    
    if (minutes < 60) {
        return `${minutes} دقيقة`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours} ساعة و ${remainingMinutes} دقيقة`;
    }
});

// Indexes for better query performance
turnSchema.index({ status: 1 });
turnSchema.index({ turnNumber: 1 });
turnSchema.index({ mobileNumber: 1 });
turnSchema.index({ createdAt: -1 });
turnSchema.index({ completedAt: -1 });
turnSchema.index({ status: 1, createdAt: 1 });

// Pre-save middleware to validate turn number uniqueness for waiting turns
turnSchema.pre('save', async function(next) {
    if (this.isModified('turnNumber') && this.status === 'waiting') {
        const existingTurn = await this.constructor.findOne({
            turnNumber: this.turnNumber,
            status: 'waiting',
            _id: { $ne: this._id }
        });
        
        if (existingTurn) {
            return next(new Error('رقم الدور مستخدم بالفعل'));
        }
    }
    next();
});

// Pre-save middleware to set completedAt when status changes to completed
turnSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
        this.completedAt = new Date();
    }
    
    if (this.isModified('status') && this.status === 'cancelled' && !this.cancelledAt) {
        this.cancelledAt = new Date();
    }
    
    next();
});

// Static method to get next available turn number
turnSchema.statics.getNextTurnNumber = async function() {
    const waitingTurns = await this.find({ status: 'waiting' });
    
    if (waitingTurns.length === 0) {
        return 1;
    }
    
    const maxTurnNumber = Math.max(...waitingTurns.map(turn => turn.turnNumber));
    return maxTurnNumber + 1;
};

// Static method to reorder turn numbers
turnSchema.statics.reorderTurnNumbers = async function() {
    const waitingTurns = await this.find({ status: 'waiting' })
        .sort({ createdAt: 1 });
    
    for (let i = 0; i < waitingTurns.length; i++) {
        await this.findByIdAndUpdate(waitingTurns[i]._id, {
            turnNumber: i + 1
        });
    }
    
    return waitingTurns.length;
};

// Static method to get waiting turns count
turnSchema.statics.getWaitingCount = function() {
    return this.countDocuments({ status: 'waiting' });
};

// Static method to get average wait time
turnSchema.statics.getAverageWaitTime = async function() {
    const completedTurns = await this.find({
        status: 'completed',
        completedAt: { $exists: true }
    });
    
    if (completedTurns.length === 0) {
        return 0;
    }
    
    const totalWaitTime = completedTurns.reduce((total, turn) => {
        const waitTime = new Date(turn.completedAt) - new Date(turn.createdAt);
        return total + waitTime;
    }, 0);
    
    return Math.floor(totalWaitTime / (completedTurns.length * 1000 * 60)); // in minutes
};

// Instance method to complete turn
turnSchema.methods.complete = async function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return await this.save();
};

// Instance method to cancel turn
turnSchema.methods.cancel = async function(cancelledBy = 'customer') {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = cancelledBy;
    return await this.save();
};


module.exports = mongoose.model('Turn', turnSchema);



