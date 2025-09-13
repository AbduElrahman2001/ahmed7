# Vercel Deployment Guide

## Environment Variables Required

Set these environment variables in your Vercel dashboard:

```
MONGODB_URI_PROD=mongodb+srv://abdelrahmanadel20012023_db_user:<db_password>@cluster0.li3exar.mongodb.net/balha-barbershop?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=ksdfgjsgfjsfjsfvjsy734856tft6st6f?:>PKFKGKGP_(*%*@_)
JWT_EXPIRE=24h
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Deployment Steps

1. Connect your GitHub repository to Vercel
2. Set the environment variables in Vercel dashboard
3. Deploy the project
4. The API will be available at `https://your-domain.vercel.app/api/`

## Default Admin Credentials

- Username: admin
- Password: admin123

## API Endpoints

- Health Check: `/api/health`
- Auth: `/api/auth/login`
- Turns: `/api/turns`
- Admin: `/api/admin/turns/waiting`

## Troubleshooting

If you get JSON parsing errors:
1. Check that all environment variables are set
2. Ensure MongoDB connection string is correct
3. Check Vercel function logs for detailed error messages
