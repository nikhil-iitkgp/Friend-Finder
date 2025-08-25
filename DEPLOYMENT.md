# FriendFinder MVP - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- Node.js 18+ 
- npm or yarn
- Docker (for containerized deployment)
- MongoDB Atlas account (or local MongoDB)
- Google Cloud Console account (for OAuth & Maps)
- Cloudinary account (for file uploads)

### Required Services
- MongoDB Atlas cluster
- Google OAuth application
- Google Maps API key
- Cloudinary account
- Domain with SSL certificate (production)

## Environment Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd FriendFinder
npm install
```

### 2. Environment Variables

Create `.env.local` file:

```env
# Database
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-maps-api-key>

# Cloudinary
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# Security (production)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Optional
NODE_ENV=development
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### 4. Google Maps API Setup

1. Enable Maps JavaScript API
2. Enable Geolocation API
3. Create API key with restrictions:
   - HTTP referrers (web sites)
   - Add your domain(s)

### 5. MongoDB Setup

1. Create MongoDB Atlas cluster
2. Create database user
3. Whitelist IP addresses (0.0.0.0/0 for development)
4. Get connection string

## Local Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Run Tests

```bash
# Unit tests
npm test

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Database Seeding (Optional)

```bash
npm run seed
```

## Docker Deployment

### 1. Build Docker Image

```bash
docker build -t friendfinder .
```

### 2. Run with Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
docker-compose up -d
```

## Production Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard

### AWS/GCP/Azure

1. Build production bundle:
```bash
npm run build
```

2. Use Docker image or deploy built files
3. Configure load balancer with SSL
4. Set up monitoring and logging

### Environment Variables (Production)

```env
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
```

## Monitoring & Health Checks

### Health Check Endpoint

The application provides a health check at `/api/health`:

```bash
curl https://yourdomain.com/api/health
```

Response:
```json
{
  "status": "OK",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "FriendFinder",
  "version": "1.0.0",
  "environment": "production",
  "database": "connected",
  "checks": {
    "database": "healthy",
    "environment": "configured"
  }
}
```

### Performance Monitoring

1. **Application Metrics**:
   - Response times
   - Error rates
   - Database query performance
   - Socket.io connection counts

2. **Infrastructure Metrics**:
   - CPU usage
   - Memory usage
   - Network I/O
   - Disk usage

### Logging

Production logs should include:
- Authentication events
- Friend request activities
- Message sending/receiving
- WebRTC connection events
- Error stack traces

## Security Considerations

### HTTPS
- Always use HTTPS in production
- Configure HSTS headers
- Use SSL certificates from trusted CA

### API Security
- Rate limiting implemented
- Input validation with Zod
- Authentication required for protected routes
- CORS properly configured

### Data Protection
- User data encrypted in transit
- Passwords hashed with bcrypt
- Sensitive data not logged
- Regular security updates

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check connection string
   - Verify network access
   - Check database user permissions

2. **Google OAuth Not Working**
   - Verify client ID/secret
   - Check redirect URI configuration
   - Ensure Google+ API is enabled

3. **Maps Not Loading**
   - Check API key validity
   - Verify domain restrictions
   - Ensure Maps JavaScript API is enabled

4. **Socket.io Connection Issues**
   - Check CORS configuration
   - Verify WebSocket support
   - Check firewall settings

5. **File Upload Failures**
   - Verify Cloudinary credentials
   - Check file size limits
   - Ensure proper CORS setup

### Debug Mode

Enable debug mode with:

```env
DEBUG=*
```

### Performance Issues

1. **Database Optimization**:
   - Ensure proper indexes
   - Monitor slow queries
   - Consider connection pooling

2. **Frontend Optimization**:
   - Enable Next.js optimizations
   - Use image optimization
   - Implement proper caching

### Getting Help

- Check application logs
- Use health check endpoint
- Monitor database performance
- Review error tracking

## Backup and Recovery

### Database Backup
```bash
mongodump --uri="<MONGODB_URI>" --out=backup/
```

### Application Backup
- Source code in version control
- Environment variables documented
- SSL certificates backed up

## Scaling Considerations

### Horizontal Scaling
- Use load balancer
- Implement session affinity for Socket.io
- Consider Redis for rate limiting
- Database read replicas

### Performance Optimization
- CDN for static assets
- Database query optimization
- Image compression
- Gzip compression

This guide provides comprehensive instructions for deploying FriendFinder MVP in various environments with proper security, monitoring, and troubleshooting procedures.