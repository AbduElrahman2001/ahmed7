const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: './config.env' });

// Import routes
const authRoutes = require('./routes/auth');
const turnRoutes = require('./routes/turns');
const adminRoutes = require('./routes/admin');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? true // Allow all origins in production for Vercel
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة مرة أخرى لاحقاً.',
        ar: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة مرة أخرى لاحقاً.'
    }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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
        environment: process.env.NODE_ENV
    });
});

// Serve the main HTML file for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use(errorHandler);

// MongoDB connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.NODE_ENV === 'production' 
            ? process.env.MONGODB_URI_PROD 
            : process.env.MONGODB_URI;
            
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ MongoDB connected successfully');
        
        // Initialize default admin user
        await initializeDefaultAdmin();
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Initialize default admin user
const initializeDefaultAdmin = async () => {
    try {
        const User = require('./models/User');
        
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

// Start server
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📱 Environment: ${process.env.NODE_ENV}`);
        console.log(`🌐 API URL: http://localhost:${PORT}/api`);
        console.log(`🎨 Frontend: http://localhost:${PORT}`);
    });
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error('❌ Unhandled Promise Rejection:', err.message);
    // Close server & exit process
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    // Close server & exit process
    process.exit(1);
});
