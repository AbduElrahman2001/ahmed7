# 🚀 Vercel Deployment Guide for BALHA Barbershop

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **MongoDB Atlas**: Set up a cloud MongoDB database
3. **Git Repository**: Your project should be in a Git repository (GitHub, GitLab, etc.)

## 🗄️ Database Setup (MongoDB Atlas)

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (free tier available)
3. Create a database user with read/write permissions
4. Get your connection string
5. Update the `MONGODB_URI_PROD` in your Vercel environment variables

## 🔧 Environment Variables Setup

In your Vercel project dashboard, add these environment variables:

```bash
NODE_ENV=production
MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/balha-barbershop
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=24h
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
VERCEL=true
```

## 📦 Deployment Steps

### Option 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new
   - Set project name
   - Confirm deployment

### Option 2: GitHub Integration

1. **Push your code to GitHub**
2. **Connect your GitHub repo to Vercel**:
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository
   - Configure build settings

## ⚙️ Build Configuration

Your `vercel.json` is already configured for:
- ✅ Node.js runtime
- ✅ API routes (`/api/*`)
- ✅ Static file serving
- ✅ SPA fallback
- ✅ Function timeout (30 seconds)

## 🔍 Post-Deployment

1. **Test your API endpoints**:
   ```
   https://your-project.vercel.app/api/health
   ```

2. **Test the frontend**:
   ```
   https://your-project.vercel.app
   ```

3. **Check MongoDB connection** in Vercel logs

## 🚨 Important Notes

### Database Connection
- **MongoDB Atlas**: Use connection string with `?retryWrites=true&w=majority`
- **IP Whitelist**: Add `0.0.0.0/0` to MongoDB Atlas IP access list for Vercel

### CORS Configuration
Update the CORS origins in `server.js` with your actual Vercel domain:
```javascript
origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-actual-domain.vercel.app'] 
    : ['http://localhost:3000']
```

### Environment Variables
- Never commit sensitive data to Git
- Use Vercel's environment variable system
- Test locally with `.env` file

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**:
   - Check connection string
   - Verify IP whitelist
   - Check database user permissions

2. **Build Errors**:
   - Check Node.js version compatibility
   - Verify all dependencies are in `package.json`

3. **API Not Working**:
   - Check CORS configuration
   - Verify environment variables
   - Check Vercel function logs

### Debug Commands

```bash
# Check Vercel status
vercel ls

# View deployment logs
vercel logs

# Redeploy
vercel --prod
```

## 🔄 Updates & Redeployment

1. **Push changes to Git**
2. **Vercel auto-deploys** (if GitHub integration enabled)
3. **Manual deployment**:
   ```bash
   vercel --prod
   ```

## 📱 Custom Domain (Optional)

1. **Add custom domain** in Vercel dashboard
2. **Update CORS origins** in `server.js`
3. **Configure DNS** as per Vercel instructions

## 🎯 Performance Optimization

- ✅ Compression middleware enabled
- ✅ Rate limiting configured
- ✅ Security headers with Helmet
- ✅ Static file serving optimized

## 🔐 Security Checklist

- [ ] JWT secret changed from default
- [ ] Admin password changed from default
- [ ] MongoDB connection string secured
- [ ] CORS origins restricted
- [ ] Rate limiting enabled
- [ ] Security headers configured

---

## 🎉 Success!

Your BALHA Barbershop is now deployed on Vercel! 

**Next Steps**:
1. Test all functionality
2. Update CORS with your actual domain
3. Change default admin credentials
4. Monitor performance and logs
5. Set up monitoring and alerts

For support, check [Vercel Documentation](https://vercel.com/docs) or your project logs.
