import express from 'express';
console.log('Server process starting...');
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Parser } from 'json2csv';

// Initialize Firebase Admin inside startServer for better error handling
async function startServer() {
  console.log('startServer function called.');
  const app = express();
  const PORT = 3000;

  try {
    // Initialize Firebase Admin inside startServer for better error handling
    console.log('Loading firebase-applet-config.json...');
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found at ${configPath}`);
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Config loaded for project:', firebaseConfig.projectId);

    if (getApps().length === 0) {
      console.log('Initializing Firebase Admin with config projectId...');
      try {
        initializeApp({
          projectId: firebaseConfig.projectId
        });
        console.log(`Firebase Admin initialized with project ID: ${firebaseConfig.projectId}`);
      } catch (e) {
        console.error('Firebase Admin initialization failed:', e);
        // Fallback to auto-init only if explicit init failed
        try {
          initializeApp();
          console.log(`Firebase Admin initialized with environment defaults`);
        } catch (e2) {
          console.error('Environment default init also failed:', e2);
        }
      }
    }

    const firebaseAdminApp = getApps()[0];
    const currentProjectId = firebaseAdminApp.options.projectId || firebaseConfig.projectId;
    const configDatabaseId = firebaseConfig.firestoreDatabaseId;

    console.log(`[FIREBASE] App Project ID: ${currentProjectId}`);
    console.log(`[FIREBASE] Config Database ID: ${configDatabaseId}`);
    console.log(`[FIREBASE] Process env GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT}`);

    // If the databaseId is the same as the projectId, we should use the default database instance.
    // Otherwise, use the named instance.
    let db;
    try {
      db = (configDatabaseId === currentProjectId || !configDatabaseId)
        ? getFirestore(firebaseAdminApp)
        : getFirestore(firebaseAdminApp, configDatabaseId);
      console.log(`Firestore instance obtained for Project: ${currentProjectId}, Database: ${configDatabaseId || '(default)'}`);
    } catch (dbInitErr: any) {
      console.error('[FIREBASE] Error getting Firestore instance:', dbInitErr.message);
      db = getFirestore(firebaseAdminApp);
    }
    
    // IF there's no auth/service account, Firebase Admin will attempt to use default compute credentials 
    // which won't work in AI Studio to connect to the user's project, so we skip startup check
    // to avoid falling back to the wrong database automatically.
    
    app.use(express.json());

    // Request logging
    app.use((req, res, next) => {
      console.log(`[SERVER] ${req.method} ${req.url}`);
      next();
    });

    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] Listening on 0.0.0.0:${PORT}`);
      console.log(`[SERVER] Health check: http://localhost:${PORT}/api/health`);
    });

    // In-memory store for OTPs
    const otpStore = new Map<string, { otp: string, expiresAt: number }>();

    // API routes
    app.post('/api/send-otp', async (req, res) => {
      try {
        const { email } = req.body;
        console.log(`[OTP] Request for email: ${email}`);
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        otpStore.set(email, { otp, expiresAt });

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
          console.warn('SMTP credentials not configured. OTP is:', otp);
          return res.json({ success: true, message: 'OTP generated (check server logs)', devOtp: otp });
        }

        await transporter.sendMail({
          from: `"PredictKey Pro" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Action Required: Verify your email for PredictKey Pro',
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #0f172a; text-align: center;">Welcome to PredictKey Pro!</h2>
            <p style="color: #334155; font-size: 16px;">To complete your registration, please use the following One-Time Password (OTP):</p>
            <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10b981;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
          </div>`,
        });
        console.log(`[OTP] Sent to ${email}`);
        res.json({ success: true, message: 'OTP sent successfully' });
      } catch (error: any) {
        console.error('Error in /api/send-otp:', error);
        res.status(500).json({ error: error.message || 'Failed to send OTP email' });
      }
    });

    app.post('/api/verify-otp', (req, res) => {
      try {
        const { email, otp } = req.body;
        console.log(`[OTP] Verifying for ${email}: ${otp}`);
        const storedData = otpStore.get(email);
        if (!storedData || Date.now() > storedData.expiresAt || storedData.otp !== otp) {
          return res.status(400).json({ error: 'Invalid or expired OTP' });
        }
        otpStore.delete(email);
        res.json({ success: true, message: 'OTP verified successfully' });
      } catch (error: any) {
        console.error('Error in /api/verify-otp:', error);
        res.status(500).json({ error: error.message || 'Failed to verify OTP' });
      }
    });

    app.get('/api/debug-env', (req, res) => {
      res.json({
        googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT,
        firebaseConfigProjectId: firebaseConfig.projectId,
        firebaseConfigDatabaseId: firebaseConfig.firestoreDatabaseId,
        adminProjectId: firebaseAdminApp.options.projectId,
      });
    });

    app.post('/api/verify-task', async (req, res) => {
      const { userId, taskId, screenshotBase64 } = req.body;
      if (!userId || !taskId || !screenshotBase64) return res.status(400).json({ error: 'Missing fields' });

      console.log(`[TASK] Verifying task ${taskId} for user ${userId}`);
      
      // Simulate AI verification
      setTimeout(async () => {
        const isVerified = Math.random() > 0.1;
        if (isVerified) {
          try {
            // In a real app, you'd track individual tasks. 
            // Here we'll just set the flag if it's the last task or just set it for demo.
            await db.collection('users').doc(userId).update({
              isGiveawayEligible: true
            });
            console.log(`[TASK] User ${userId} marked as giveaway eligible`);
          } catch (err) {
            console.error('[TASK] Error updating user eligibility:', err);
          }
        }
        res.json({ success: isVerified, message: isVerified ? 'Task verified successfully by AI' : 'AI could not verify. Please try again.' });
      }, 2000);
    });

    app.get('/api/export-transactions', async (req, res) => {
      const { userId, format } = req.query;
      if (!userId) return res.status(400).json({ error: 'User ID required' });

      try {
        const snapshot = await db.collection('transactions').where('userId', '==', userId).orderBy('createdAt', 'desc').get();
        const transactions = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            Date: data.createdAt?.toDate().toLocaleString() || 'N/A',
            Type: data.type,
            Amount: `₹${data.amount}`,
            Status: data.status,
            Notes: data.notes || ''
          };
        });

        if (format === 'csv') {
          const parser = new Parser();
          const csv = parser.parse(transactions);
          res.header('Content-Type', 'text/csv');
          res.attachment(`transactions_${userId}.csv`);
          return res.send(csv);
        }

        // For PDF, we'd normally use a library like pdfkit, but for simplicity we'll just support CSV here
        res.json(transactions);
      } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to export transactions' });
      }
    });

    app.post('/api/admin/draw-giveaway', async (req, res) => {
      console.log('[GIVEAWAY] Draw requested');
      try {
        console.log('[GIVEAWAY] Fetching eligible users...');
        // Use a query instead of fetching all users
        const eligibleUsersSnapshot = await db.collection('users')
          .where('isGiveawayEligible', '==', true)
          .get();
        
        console.log(`[GIVEAWAY] Found ${eligibleUsersSnapshot.size} eligible users`);
        
        if (eligibleUsersSnapshot.empty) {
          console.log('[GIVEAWAY] No eligible users found');
          return res.json({ success: false, message: 'No eligible users found for today\'s draw.' });
        }

        const eligibleDocs = eligibleUsersSnapshot.docs;
        const winner = eligibleDocs[Math.floor(Math.random() * eligibleDocs.length)];
        const winnerData = winner.data();
        console.log(`[GIVEAWAY] Winner selected: ${winnerData.email} (${winner.id})`);

        // 2. Reward winner
        console.log('[GIVEAWAY] Updating winner wallet...');
        await winner.ref.update({
          walletBalance: FieldValue.increment(1000),
          isGiveawayEligible: false // Reset for next day
        });

        console.log('[GIVEAWAY] Adding transaction record...');
        await db.collection('transactions').add({
          userId: winner.id,
          userEmail: winnerData.email || 'N/A',
          type: 'deposit',
          amount: 1000,
          status: 'approved',
          notes: 'Daily Giveaway Winner Reward',
          createdAt: FieldValue.serverTimestamp()
        });

        // Give 1 month free plan
        console.log('[GIVEAWAY] Adding plan record...');
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        
        await db.collection('plans').add({
          userId: winner.id,
          name: 'Pro',
          price: 0,
          isActive: true,
          predictionsUsedToday: 0,
          dailyPredictionLimit: 100,
          expiresAt: expiresAt,
          createdAt: FieldValue.serverTimestamp()
        });

        // 3. Record giveaway result
        console.log('[GIVEAWAY] Recording giveaway result...');
        await db.collection('giveaways').add({
          winnerId: winner.id,
          winnerEmail: winnerData.email || 'N/A',
          prize: '₹1000 + 1 Month Pro Plan',
          drawnAt: FieldValue.serverTimestamp()
        });

        // 4. Notify winner
        try {
          await db.collection('notifications').add({
            userId: winner.id,
            title: '🎉 Congratulations!',
            message: 'You won the daily giveaway! ₹1000 and 1 Month Pro Plan have been added to your account.',
            type: 'success',
            read: false,
            timestamp: FieldValue.serverTimestamp()
          });
        } catch (notifyErr) {
          console.error('[GIVEAWAY] Error sending notification:', notifyErr);
        }

        console.log('[GIVEAWAY] Draw completed successfully');
        res.json({ success: true, winner: winnerData.email });
      } catch (err: any) {
        console.error('[GIVEAWAY] Draw error:', err);
        res.status(500).json({ 
          success: false, 
          message: 'Internal server error during draw.',
          error: err.message,
          code: err.code
        });
      }
    });

    app.post('/api/staking/sync', async (req, res) => {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'User ID required' });

      try {
        const now = new Date();
        const stakesSnapshot = await db.collection('stakes')
          .where('userId', '==', userId)
          .where('status', '==', 'active')
          .get();

        let totalReturned = 0;
        const batch = db.batch();

        for (const doc of stakesSnapshot.docs) {
          const data = doc.data();
          const endDate = data.endDate.toDate();

          if (now >= endDate) {
            const days = data.durationMonths === 1 ? 30 : data.durationMonths === 6 ? 180 : 365;
            const returnAmount = data.amount * Math.pow(1 + data.dailyRate, days);
            
            totalReturned += returnAmount;

            // Mark stake as completed
            batch.update(doc.ref, { status: 'completed', returnedAmount: returnAmount });

            // Add transaction record
            const txRef = db.collection('transactions').doc();
            batch.set(txRef, {
              userId,
              type: 'deposit',
              amount: returnAmount,
              status: 'approved',
              notes: `Staking Return (Principal + Interest) - ${data.durationMonths}m`,
              createdAt: FieldValue.serverTimestamp()
            });
          }
        }

        if (totalReturned > 0) {
          const userRef = db.collection('users').doc(userId);
          batch.update(userRef, {
            walletBalance: FieldValue.increment(totalReturned)
          });
          await batch.commit();
        }

        res.json({ success: true, returned: totalReturned });
      } catch (err) {
        console.error('Staking sync error:', err);
        res.status(500).json({ error: 'Failed to sync stakes' });
      }
    });

    // Catch-all for undefined API routes
    app.all('/api/*', (req, res) => {
      console.warn(`[SERVER] 404 API Not Found: ${req.method} ${req.url}`);
      res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
    });

    // Vite middleware
    if (process.env.NODE_ENV !== 'production') {
      console.log('Starting Vite dev server in middleware mode...');
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
      console.log('Vite dev server started.');
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    }

    // Global error handler
    app.use((err: any, req: any, res: any, next: any) => {
      console.error('[SERVER] Unhandled error:', err);
      if (res.headersSent) {
        return next(err);
      }
      res.status(500).json({ 
        error: 'Internal server error', 
        message: err.message,
        path: req.url 
      });
    });
  } catch (err: any) {
    console.error('Failed to initialize server components:', err);
    throw err;
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
