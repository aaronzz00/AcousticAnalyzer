# AWS Deployment Guide - Acoustic Analyzer

This guide will walk you through deploying the Acoustic Test Data Analysis System to AWS.

## Overview

We'll cover two deployment options:
1. **AWS Amplify** (Recommended) - Easiest, managed solution with CI/CD
2. **S3 + CloudFront** - Cost-effective, more control

---

## Prerequisites

Before starting, ensure you have:
- [ ] AWS Account ([Sign up here](https://aws.amazon.com/))
- [ ] GitHub account (for Amplify option)
- [ ] AWS CLI installed (optional, for S3 option)
- [ ] Node.js and npm installed locally

---

## Option 1: AWS Amplify (Recommended - Easiest)

### Why Amplify?
- ✅ Automatic builds and deployments
- ✅ Free SSL certificate
- ✅ Global CDN included
- ✅ CI/CD pipeline out of the box
- ✅ Easy environment management

### Cost Estimate
- ~$0.01 per build minute
- ~$0.15 per GB served
- First 1000 build minutes/month free
- First 15 GB served/month free

### Step 1: Push Code to GitHub

```bash
# Navigate to your project directory
cd /Users/zz-orka/Desktop/Github/AcousticAnalyzer

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit for AWS deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/AcousticAnalyzer.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy with AWS Amplify

1. **Go to AWS Amplify Console**
   - Open [AWS Amplify Console](https://console.aws.amazon.com/amplify)
   - Click "Get Started" under "Amplify Hosting"

2. **Connect Repository**
   - Select "GitHub"
   - Click "Continue"
   - Authorize AWS Amplify to access your GitHub
   - Select your repository: `AcousticAnalyzer`
   - Select branch: `main`
   - Click "Next"

3. **Configure Build Settings**
   - App name: `acoustic-analyzer`
   - Environment: `production`
   - Build settings should auto-detect. Verify:
   
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
   
   - Click "Next"

4. **Review and Deploy**
   - Review all settings
   - Click "Save and deploy"
   - Wait for build to complete (~3-5 minutes)

5. **Access Your App**
   - You'll get a URL like: `https://main.d1234567890.amplifyapp.com`
   - Your app is now live! 🎉

### Step 3: Custom Domain (Optional)

1. In Amplify Console, click "Domain management"
2. Click "Add domain"
3. Follow the wizard to connect your domain
4. AWS will automatically provision SSL certificate

---

## Option 2: S3 + CloudFront (Cost-Effective)

### Why S3 + CloudFront?
- ✅ Lower cost for high traffic
- ✅ More control over configuration
- ✅ Can use existing AWS infrastructure

### Cost Estimate
- S3: ~$0.023 per GB stored
- CloudFront: ~$0.085 per GB transferred
- Very low cost for typical usage (~$1-5/month)

### Step 1: Build the Application

```bash
cd /Users/zz-orka/Desktop/Github/AcousticAnalyzer

# Install dependencies if needed
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with your production files.

### Step 2: Create S3 Bucket

1. **Open S3 Console**
   - Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
   - Click "Create bucket"

2. **Configure Bucket**
   - Bucket name: `acoustic-analyzer-app` (must be globally unique)
   - Region: Choose closest to your users (e.g., `us-west-2`)
   - Uncheck "Block all public access" ⚠️
   - Acknowledge the warning
   - Click "Create bucket"

3. **Enable Static Website Hosting**
   - Click on your bucket
   - Go to "Properties" tab
   - Scroll to "Static website hosting"
   - Click "Edit"
   - Enable "Static website hosting"
   - Index document: `index.html`
   - Error document: `index.html` (for SPA routing)
   - Click "Save changes"

4. **Upload Files**
   
   **Option A: Using AWS Console**
   - Go to "Objects" tab
   - Click "Upload"
   - Click "Add files" and "Add folder"
   - Select ALL files from `dist/` folder
   - Click "Upload"
   
   **Option B: Using AWS CLI** (Faster)
   ```bash
   # Install AWS CLI if needed
   # brew install awscli
   
   # Configure AWS CLI
   aws configure
   # Enter AWS Access Key ID
   # Enter AWS Secret Access Key
   # Default region: us-west-2
   # Default output: json
   
   # Upload files
   aws s3 sync dist/ s3://acoustic-analyzer-app/ --delete
   ```

5. **Set Bucket Policy**
   - Go to "Permissions" tab
   - Click "Bucket policy"
   - Paste this policy (replace `acoustic-analyzer-app` with your bucket name):
   
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::acoustic-analyzer-app/*"
       }
     ]
   }
   ```
   
   - Click "Save"

### Step 3: Create CloudFront Distribution

1. **Open CloudFront Console**
   - Go to [AWS CloudFront Console](https://console.aws.amazon.com/cloudfront/)
   - Click "Create distribution"

2. **Configure Distribution**
   - **Origin domain**: Select your S3 bucket website endpoint
     - Don't use the auto-suggested bucket, use the website endpoint from S3 properties
     - Format: `acoustic-analyzer-app.s3-website-us-west-2.amazonaws.com`
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS
   - **Cache policy**: CachingOptimized
   - **Price class**: Use all edge locations (or choose based on your region)
   - **Alternate domain name (CNAME)**: Add your custom domain if you have one
   - **Custom SSL certificate**: Request new certificate (if using custom domain)
   - **Default root object**: `index.html`
   - Click "Create distribution"

3. **Configure Error Pages** (Important for SPA)
   - After distribution is created, go to "Error pages" tab
   - Click "Create custom error response"
   - HTTP error code: `403`
   - Customize error response: Yes
   - Response page path: `/index.html`
   - HTTP response code: `200`
   - Click "Create"
   - Repeat for error code `404`

4. **Wait for Deployment**
   - Status will change from "Deploying" to "Enabled" (~10-15 minutes)
   - You'll get a CloudFront URL like: `d111111abcdef8.cloudfront.net`

### Step 4: Access Your App

Your app is now live at the CloudFront URL! 🎉

---

## Updating Your Deployment

### For Amplify:
- Just push to your GitHub repository
- Amplify automatically rebuilds and deploys

```bash
git add .
git commit -m "Update feature"
git push origin main
```

### For S3 + CloudFront:

```bash
# Rebuild
npm run build

# Upload to S3
aws s3 sync dist/ s3://acoustic-analyzer-app/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## Custom Domain Setup

### For Amplify:
1. Amplify Console → Domain management → Add domain
2. Follow the wizard (AWS handles DNS automatically)

### For CloudFront:
1. **Get SSL Certificate** (AWS Certificate Manager)
   - Go to ACM in `us-east-1` region (required for CloudFront)
   - Request public certificate
   - Add domain name (e.g., `analyzer.yourdomain.com`)
   - Choose DNS validation
   - Add CNAME records to your DNS provider
   - Wait for validation

2. **Update CloudFront Distribution**
   - Edit distribution
   - Add alternate domain name
   - Select SSL certificate
   - Save changes

3. **Update DNS**
   - Add CNAME record in your DNS provider:
   - Name: `analyzer`
   - Value: Your CloudFront domain

---

## Security Considerations

> **IMPORTANT**: This app handles potentially sensitive test data. Consider:

1. **Add Authentication** (AWS Cognito + Amplify)
   - Requires code changes to add login
   - ~$0.0055 per monthly active user

2. **Restrict Access by IP**
   - Use CloudFront geographic restrictions
   - Or use AWS WAF rules

3. **Enable CloudFront Access Logging**
   - Monitor who's accessing your app

---

## Troubleshooting

### "Bucket name already exists"
- S3 bucket names are globally unique
- Try: `acoustic-analyzer-YOUR_COMPANY_NAME`

### "403 Forbidden" on S3
- Check bucket policy is set correctly
- Verify static website hosting is enabled
- Check index document is `index.html`

### "404 on page refresh" (SPA routing)
- For S3: Set error document to `index.html`
- For CloudFront: Configure custom error responses

### "Amplify build fails"
- Check build settings match Vite configuration
- Verify `package.json` has correct build script
- Check build logs for specific errors

### "Charts not rendering after deployment"
- Verify all dependencies are in `dependencies` (not `devDependencies`)
- Check browser console for errors
- Large datasets may need more time to load

---

## Cost Optimization

1. **Use Amplify free tier** for low-traffic apps
2. **Enable CloudFront compression** to reduce bandwidth
3. **Set appropriate cache policies** to minimize origin requests
4. **Use S3 Intelligent-Tiering** for stored data
5. **Monitor AWS Cost Explorer** regularly

---

## Next Steps After Deployment

- [ ] Test all functionality in production
- [ ] Set up monitoring (AWS CloudWatch)
- [ ] Configure custom domain
- [ ] Add authentication if needed
- [ ] Set up automated backups
- [ ] Document access URLs for your team

---

## Support

If you encounter issues:
1. Check AWS service health dashboard
2. Review CloudWatch logs (Amplify) or S3/CloudFront logs
3. AWS Support (requires support plan)

**Estimated Total Time**: 20-30 minutes for Amplify, 45-60 minutes for S3+CloudFront
