const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('../routes/auth');
const turnRoutes = require('../routes/turns');
const adminRoutes = require('../routes/admin');

// Import middleware
const { errorHandler } = require('../middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
    origin: true, // Allow all origins for Vercel
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة مرة أخرى لاحقاً.',
        ar: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة مرة أخرى لاحقاً.'
    }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/turns', turnRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'BALHA Barbershop API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// Error handling middleware
app.use(errorHandler);

// MongoDB connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;
        
        if (!mongoURI) {
            throw new Error('MongoDB URI not found in environment variables');
        }
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ MongoDB connected successfully');
        
        // Initialize default admin user
        await initializeDefaultAdmin();
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
};

// Initialize default admin user
const initializeDefaultAdmin = async () => {
    try {
        const User = require('../models/User');
        
        const adminExists = await User.findOne({ 
            username: process.env.DEFAULT_ADMIN_USERNAME || 'admin' 
        });
        
        if (!adminExists) {
            await User.create({
                username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
                type: 'admin',
                isActive: true
            });
            
            console.log('✅ Default admin user created');
        }
    } catch (error) {
        console.error('❌ Error creating default admin:', error.message);
    }
};

// Initialize database connection
let isConnected = false;
const initDB = async () => {
    if (!isConnected) {
        await connectDB();
        isConnected = true;
    }
};

// Export the app for Vercel
module.exports = async (req, res) => {
    await initDB();
    return app(req, res);
};
