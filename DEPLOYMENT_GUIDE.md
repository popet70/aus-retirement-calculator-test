# Deployment Guide: Australian Retirement Calculator

## What You'll Get
A live website at a URL like: `https://retirement-calculator-yourname.vercel.app`
- Free hosting forever
- Automatic HTTPS
- Fast global CDN
- Easy updates

## Prerequisites (5 minutes)
1. **GitHub account** - Sign up at https://github.com (free)
2. **Vercel account** - Sign up at https://vercel.com with your GitHub account (free)
3. **GitHub Desktop** (optional but recommended) - Download from https://desktop.github.com

---

## Method 1: Using GitHub Desktop (Recommended for Non-Developers)

### Step 1: Download the Calculator Files
1. You should have a folder called `retirement-calculator` with all the files
2. Make sure it contains: `package.json`, `next.config.js`, `app/` folder, etc.

### Step 2: Create GitHub Repository
1. Open GitHub Desktop
2. Click "File" → "Add Local Repository"
3. Navigate to your `retirement-calculator` folder
4. Click "Add Repository"
5. If prompted "not a git repository", click "Create a Repository"
6. Click "Publish Repository" button
7. Uncheck "Keep this code private" if you want it public (either works)
8. Click "Publish Repository"

### Step 3: Deploy to Vercel
1. Go to https://vercel.com
2. Click "Sign Up" and choose "Continue with GitHub"
3. Authorize Vercel to access your GitHub account
4. Click "New Project"
5. You'll see your `retirement-calculator` repository - click "Import"
6. **Don't change any settings** - Vercel auto-detects everything
7. Click "Deploy"
8. Wait 2-3 minutes while it builds
9. 🎉 Done! Click "Visit" to see your live calculator

Your URL will be something like: `https://retirement-calculator.vercel.app`

---

## Method 2: Using Command Line (For Developers)

### Step 1: Install Git (if not already installed)
```bash
# Mac (using Homebrew)
brew install git

# Windows
# Download from https://git-scm.com/download/win

# Linux
sudo apt-get install git
```

### Step 2: Create GitHub Repository
```bash
cd retirement-calculator

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create repository on GitHub.com first (via web interface)
# Then link it:
git remote add origin https://github.com/YOUR-USERNAME/retirement-calculator.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Login when prompted (will open browser)
# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? retirement-calculator (or press Enter)
# - Directory? ./ (press Enter)
# - Override settings? No (press Enter)

# Wait for deployment...
# You'll get a URL like: https://retirement-calculator.vercel.app
```

---

## Updating Your Calculator

### Using GitHub Desktop:
1. Make changes to your files
2. Open GitHub Desktop
3. You'll see changed files on the left
4. Add a commit message (e.g., "Updated default values")
5. Click "Commit to main"
6. Click "Push origin"
7. Vercel automatically redeploys in ~2 minutes!

### Using Command Line:
```bash
git add .
git commit -m "Description of changes"
git push

# Vercel redeploys automatically
```

---

## Custom Domain (Optional)

If you own a domain (e.g., `myretirement.com`):

1. Go to your Vercel project
2. Click "Settings" → "Domains"
3. Add your domain
4. Follow DNS instructions
5. Wait for DNS propagation (~24 hours)

---

## Troubleshooting

### Build Failed
- Check the build logs in Vercel dashboard
- Most common issue: Missing dependency
- Solution: Make sure `package.json` is correct

### Calculator Not Working
- Check browser console for errors (F12)
- Try clearing cache and hard refresh (Ctrl+Shift+R)

### Can't Push to GitHub
- Make sure you're signed into GitHub Desktop
- Check you have permission to the repository

---

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- GitHub Docs: https://docs.github.com

---

## Cost

- **Free tier includes:**
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS
  - Global CDN
  
This is more than enough for personal/family use. Commercial use requires Pro ($20/month).
