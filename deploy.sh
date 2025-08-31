#!/bin/bash

# 🚀 BALHA Barbershop Vercel Deployment Script

echo "🚀 Starting BALHA Barbershop deployment to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel first:"
    vercel login
fi

# Deploy to Vercel
echo "📦 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo "🌐 Your app should be available at the URL shown above"
echo "📋 Don't forget to:"
echo "   1. Set environment variables in Vercel dashboard"
echo "   2. Update CORS origins with your actual domain"
echo "   3. Test all functionality"
echo "   4. Change default admin credentials"
