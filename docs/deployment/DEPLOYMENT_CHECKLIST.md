# ✅ Deployment Checklist

Use this checklist to make sure everything is ready for deployment!

## Before Deployment

### Code Preparation
- [ ] All features working locally
- [ ] No console errors in browser
- [ ] Backend starts without errors
- [ ] Database migrations run successfully
- [ ] `.env` files configured (not committed to git!)
- [ ] All TypeScript builds without errors

### Git Setup
- [ ] Project committed to git
- [ ] Pushed to GitHub
- [ ] `.gitignore` includes `.env` files
- [ ] No sensitive data in code

### Documentation
- [ ] README.md updated
- [ ] Environment variables documented
- [ ] Deployment guide reviewed

---

## Database Setup

### Supabase / Vercel Postgres
- [ ] Database created
- [ ] Connection string copied
- [ ] Accessible from external sources
- [ ] Password saved securely

---

## Backend Deployment (Render.com)

### Configuration
- [ ] GitHub repo connected
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install && npx prisma generate && npm run build`
- [ ] Start command: `npm start`
- [ ] Free plan selected

### Environment Variables
- [ ] `DATABASE_URL` - Database connection string
- [ ] `NODE_ENV` - Set to `production`
- [ ] `JWT_SECRET` - Random secure string (32+ chars)
- [ ] `JWT_EXPIRY` - Set to `7d`
- [ ] `CORS_ORIGIN` - Vercel frontend URL
- [ ] `PORT` - Set to `5000`

### Post-Deployment
- [ ] Service deployed successfully
- [ ] Logs show no errors
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Test API: `curl https://your-api.onrender.com/api/health`
- [ ] Backend URL copied for frontend

---

## Frontend Deployment (Vercel)

### Configuration
- [ ] GitHub repo connected
- [ ] Framework preset: Vite
- [ ] Build settings auto-detected

### Environment Variables
- [ ] `VITE_API_URL` - Backend API URL with `/api` suffix

### Post-Deployment
- [ ] Frontend deployed successfully
- [ ] No build errors
- [ ] App loads in browser
- [ ] Frontend URL copied for CORS update

---

## Final Configuration

### Update CORS
- [ ] Go back to Render
- [ ] Update `CORS_ORIGIN` with Vercel URL
- [ ] Backend auto-redeploys
- [ ] CORS errors resolved

### Create Admin User
- [ ] Company created in database
- [ ] Super admin user created
- [ ] Login credentials saved
- [ ] Able to login successfully

---

## Testing Production

### Frontend
- [ ] App loads without errors
- [ ] Login page appears
- [ ] Can login with admin credentials
- [ ] Dashboard shows correctly
- [ ] No console errors

### API Integration
- [ ] Login works
- [ ] Dashboard fetches data
- [ ] Can create/edit records
- [ ] Excel import works
- [ ] All features functional

### Database
- [ ] Data persists across refreshes
- [ ] Queries execute successfully
- [ ] No connection errors

---

## Performance & Security

### Performance
- [ ] Page load < 3 seconds
- [ ] API responses < 1 second
- [ ] Images/assets optimized
- [ ] Lighthouse score > 80

### Security
- [ ] HTTPS enabled (automatic)
- [ ] JWT secrets are secure
- [ ] Database password is strong
- [ ] No sensitive data in logs
- [ ] CORS configured correctly
- [ ] Rate limiting enabled

---

## Monitoring

### Set Up Alerts
- [ ] Render email notifications enabled
- [ ] Vercel deployment notifications enabled
- [ ] Database usage monitored (Supabase dashboard)

### Regular Checks
- [ ] Backend uptime (Render dashboard)
- [ ] Frontend uptime (Vercel dashboard)
- [ ] Database size (Supabase dashboard)
- [ ] Error logs (Render logs)

---

## Backup Plan

### Database Backups
- [ ] Understand backup schedule (Supabase auto-backups)
- [ ] Know how to restore backup
- [ ] Test backup/restore process

### Rollback Strategy
- [ ] Previous deployment available in Render
- [ ] Previous deployment available in Vercel
- [ ] Can revert environment variables

---

## 🎉 Launch!

Once everything is checked:
- [ ] Share app URL with team
- [ ] Create initial data (companies, sites, users)
- [ ] Train users on the system
- [ ] Monitor for first 24 hours

---

## Need Help?

- **Render Issues**: https://render.com/docs
- **Vercel Issues**: https://vercel.com/docs
- **Supabase Issues**: https://supabase.com/docs
- **Prisma Issues**: https://www.prisma.io/docs

**Remember**: First deployment takes longest (10-15 min). Future updates are automatic via git push! 🚀
