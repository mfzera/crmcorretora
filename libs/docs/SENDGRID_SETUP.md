# SendGrid Email Setup Guide

✅ SendGrid package installed  
✅ API Key configured in `.env`  
✅ Email service updated to use SendGrid

## Next Steps to Start Sending Emails

### 1. Verify Your Sender Email Address

SendGrid requires you to verify the email address you send from:

1. Go to https://app.sendgrid.com/
2. Navigate to **Settings** → **Sender Authentication** → **Single Sender Verification**
3. Click **Create New Sender**
4. Fill in the form:
   - **From Name**: `EcoTech Sys` (or your company name)
   - **From Email Address**: Your actual email (e.g., `noreply@yourdomain.com` or `notifications@yourdomain.com`)
   - **Reply To**: Same as From Email or a support email
   - Fill in the address fields (required by SendGrid)
5. Click **Create**
6. Check your inbox and verify the email by clicking the link

### 2. Update Your `.env` File

After verifying, update the `FROM_EMAIL` in your `.env`:

```bash
FROM_EMAIL=your-verified-email@yourdomain.com
FROM_NAME=EcoTech Sys
```

### 3. Test the Password Recovery Flow

1. Start your API server:
   ```bash
   pnpm dev:api
   ```

2. Start your web server:
   ```bash
   pnpm dev:web
   ```

3. Go to `http://localhost:3000/recuperar-senha`

4. Enter a valid user email from your database

5. Check the user's inbox for the password recovery email!

## Development vs Production

### Development Mode (NODE_ENV !== 'production')
- Emails are logged to console
- No actual emails are sent
- Useful for testing without using SendGrid quota

### Production Mode (NODE_ENV === 'production')
- Real emails are sent via SendGrid
- Uses your API key and verified sender
- 100 emails/day free tier

## Important Notes

⚠️ **Security**: Never commit your SendGrid API key to git  
⚠️ **Sender Verification**: You must verify your sender email before SendGrid will send emails  
⚠️ **Free Tier**: 100 emails/day (upgrade for more)  
⚠️ **Domain Authentication**: For better deliverability, consider domain authentication (requires DNS setup)

## Troubleshooting

### Error: "Email service not configured"
- Make sure `SENDGRID_API_KEY` is set in your `.env`
- Restart your API server after updating `.env`

### Error: "The from address does not match a verified Sender Identity"
- You need to verify your sender email in SendGrid dashboard
- Make sure `FROM_EMAIL` in `.env` matches the verified email

### Emails not arriving
- Check spam folder
- Verify sender email in SendGrid
- Check SendGrid activity logs: https://app.sendgrid.com/email_activity

## Current Configuration

Your current `.env` settings:
```
SENDGRID_API_KEY=SG.-XMh15eSTsGLkHdrYbYjdw.***
FROM_EMAIL=noreply@yourdomain.com (⚠️ Change this!)
FROM_NAME=EcoTech Sys
```

## Upgrade SendGrid Plan

Free tier includes:
- 100 emails/day
- All email features

Paid plans start at $19.95/month:
- 40,000+ emails/month
- Better support
- Advanced features

Visit: https://sendgrid.com/pricing/
