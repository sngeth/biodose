# 🚀 BioDose Deployment Guide

## Quick Start (5 minutes)

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `biodose` (or whatever you prefer)
3. Description: "Daily evidence-based health optimization articles"
4. **Make it Public** (required for free GitHub Pages)
5. Click "Create repository"

### Step 2: Upload Files

Option A - **Via GitHub Web Interface** (Easiest):

1. On your new repository page, click "uploading an existing file"
2. Drag and drop ALL files from the `biodose-site` folder
3. Commit message: "Initial commit"
4. Click "Commit changes"

Option B - **Via Command Line** (if you have git installed):

```bash
cd /workspace/group/biodose-site
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/biodose.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository Settings
2. Click "Pages" in the left sidebar
3. Under "Source", select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click "Save"
5. Wait 1-2 minutes for deployment

### Step 4: Access Your Site! 🎉

Your site will be live at:
```
https://YOUR-USERNAME.github.io/biodose/
```

GitHub will show you the URL in the Pages settings.

## Automatic Daily Updates

The site will automatically update every day at 7:00 AM UTC (2:00 AM EST) via GitHub Actions!

### To verify automation is working:

1. Go to your repository
2. Click "Actions" tab
3. You should see "Daily Article Update" workflow
4. It will run automatically, or you can click "Run workflow" to test immediately

### Change Update Time

Edit `.github/workflows/daily-update.yml`:

```yaml
schedule:
  - cron: '0 7 * * *'  # Format: minute hour day month weekday
  # Examples:
  # '0 12 * * *' = Noon UTC (7 AM EST)
  # '0 0 * * *'  = Midnight UTC (7 PM EST)
```

Use https://crontab.guru/ to help create cron schedules.

## Custom Domain (Optional)

### Step 1: Buy a Domain

Use Namecheap, Google Domains, or any registrar (~$10-15/year)

### Step 2: Configure DNS

In your domain registrar's DNS settings, add:

```
Type: CNAME
Host: www (or @)
Value: YOUR-USERNAME.github.io
```

### Step 3: Update GitHub Pages

1. Go to repository Settings → Pages
2. Under "Custom domain", enter your domain (e.g., `biodose.com`)
3. Click "Save"
4. Check "Enforce HTTPS"

Wait 24-48 hours for DNS to propagate.

## Troubleshooting

### Site not loading?

- Check Settings → Pages - is it enabled?
- Wait a few minutes after enabling
- Check Actions tab for any errors

### Articles not updating?

- Go to Actions tab
- Check if workflow is running
- Look for error messages
- Try "Run workflow" manually

### Wrong time zone?

- Cron schedules use UTC
- Convert your desired time to UTC
- Example: 7 AM EST = 12 PM UTC (noon)

## File Structure

```
biodose/
├── index.html              # Main website
├── fetch-articles.js       # Article fetcher script
├── latest-article.json     # Current article data
├── package.json           # Node.js config
├── README.md              # Documentation
├── .github/
│   └── workflows/
│       └── daily-update.yml  # Automation config
└── .gitignore             # Git ignore rules
```

## Need Help?

- GitHub Pages Docs: https://docs.github.com/en/pages
- GitHub Actions Docs: https://docs.github.com/en/actions
- PubMed API Docs: https://www.ncbi.nlm.nih.gov/books/NBK25501/

## What's Next?

Ideas for enhancement:
- Add RSS feed
- Email newsletter signup
- Archive page with past articles
- Social sharing buttons
- Analytics (Google Analytics, Plausible)
- Dark mode toggle
- Category filters

---

**You're all set!** Your site will now automatically update with new health optimization research every single day. 🎉
