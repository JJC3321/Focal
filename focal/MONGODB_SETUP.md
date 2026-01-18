# MongoDB Atlas Setup Guide

This guide will help you set up MongoDB Atlas for the Focal application to enable separate user accounts.

## Prerequisites

- A MongoDB Atlas account (free tier is sufficient)
- Your `.env.local` file in the project root

## Step 1: Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Try Free" or "Sign In"
3. Create a new account or sign in with existing credentials

## Step 2: Create a New Cluster

1. After logging in, click "Build a Database"
2. Choose the **FREE** tier (M0 Sandbox)
3. Select your preferred cloud provider and region
4. Click "Create Cluster"

## Step 3: Configure Database Access

1. In the left sidebar, click "Database Access" under the Security section
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and a strong password (save these!)
5. Set user privileges to "Atlas admin" (or "Read and write to any database")
6. Click "Add User"

## Step 4: Configure Network Access

1. In the left sidebar, click "Network Access" under the Security section
2. Click "Add IP Address"
3. For development, you can click "Allow Access from Anywhere" (0.0.0.0/0)
   - **Note**: For production, restrict this to your server's IP address
4. Click "Confirm"

## Step 5: Get Your Connection String

1. Go back to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" as your driver and the latest version
5. Copy the connection string (it looks like this):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 6: Update Your .env.local File

1. Open the `.env.local` file in your project root
2. Replace the placeholder values:
   ```env
   MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/focal?retryWrites=true&w=majority
   JWT_SECRET=your-very-secure-random-string-here
   ```

3. Important replacements:
   - Replace `<username>` with your database username
   - Replace `<password>` with your database password
   - Replace `cluster0.xxxxx` with your actual cluster address
   - Add `/focal` after `.mongodb.net` to specify the database name
   - Replace `JWT_SECRET` with a long random string (you can generate one with `openssl rand -base64 32`)

## Step 7: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:3000`
3. Click "Login / Sign Up"
4. Create a new account
5. If successful, you're connected!

## What's Been Added?

### User Accounts
- **Sign up**: Create a new account with email, password, and name
- **Login**: Authenticate with existing credentials
- **Logout**: End your session
- **Password Security**: Passwords are hashed with bcrypt before storage

### Session Persistence
- All focus sessions are automatically saved to your account
- Session data includes:
  - Start and end times
  - Total focused/distracted time
  - Distraction count
  - Maximum escalation level reached

### API Key Storage
- Your Gemini API key is securely stored in your account
- Automatically loaded when you log in
- No need to re-enter it each session

## Database Collections

The application uses two main collections:

1. **users** - Stores user account information
   - email (unique)
   - password (hashed)
   - name
   - geminiApiKey (encrypted)

2. **sessions** - Stores focus session history
   - userId (reference to user)
   - startTime, endTime
   - totalFocusedTime, totalDistractedTime
   - distractionCount
   - maxEscalationLevel

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use strong passwords** for your MongoDB users
3. **Rotate your JWT_SECRET** periodically
4. **Restrict IP access** in production
5. **Enable MongoDB Atlas encryption** at rest (enabled by default)

## Troubleshooting

### "MongooseError: Operation buffering timed out"
- Check your IP is whitelisted in Network Access
- Verify your connection string is correct
- Ensure your cluster is running

### "Authentication failed"
- Double-check your username and password in the connection string
- Make sure special characters in the password are URL-encoded
  - Example: `p@ssw0rd` becomes `p%40ssw0rd`

### "Cannot connect to database"
- Verify your internet connection
- Check if MongoDB Atlas is experiencing downtime
- Try pinging your cluster address

## Need Help?

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Next.js API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
