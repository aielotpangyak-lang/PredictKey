import express from 'express';
console.log('Server process starting...');
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Parser } from 'json2csv';

// Initialize Firebase Admin
// Note: In this environment, we can often initialize without credentials if running on GCP
// or by reading the config file. For AI Studio, we'll try to initialize with the project ID.
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);
console.log('Firebase Admin initialized.');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // In-memory store for OTPs
  const otpStore = new Map<string, { otp: string, expiresAt: number }>();

  // API routes FIRST
  app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
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

    try {
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
      res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send OTP email' });
    }
  });

  app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const storedData = otpStore.get(email);
    if (!storedData || Date.now() > storedData.expiresAt || storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    otpStore.delete(email);
    res.json({ success: true, message: 'OTP verified successfully' });
  });

  app.post('/api/spin', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const rand = Math.random() * 100;
    let prizeIndex = 0; // Default: Try Again
    let reward: any = null;

    if (rand < 0.01) {
      prizeIndex = 3; // ₹5000
      reward = { type: 'wallet', amount: 5000 };
    } else if (rand < 1.01) {
      prizeIndex = 2; // 1 Week Free Plan
      reward = { type: 'plan', duration: '1w' };
    } else if (rand < 26.01) {
      prizeIndex = 1; // ₹2
      reward = { type: 'wallet', amount: 2 };
    }

    if (reward) {
      try {
        const userRef = db.collection('users').doc(userId);
        if (reward.type === 'wallet') {
          await userRef.update({
            walletBalance: admin.firestore.FieldValue.increment(reward.amount)
          });
          // Add transaction record
          await db.collection('transactions').add({
            userId,
            type: 'deposit',
            amount: reward.amount,
            status: 'approved',
            notes: 'Daily Spin Reward',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else if (reward.type === 'plan') {
          // Logic to extend plan (simplified: set/extend active plan)
          const plans = await db.collection('plans').where('userId', '==', userId).where('isActive', '==', true).get();
          if (!plans.empty) {
            const planDoc = plans.docs[0];
            const currentExpires = planDoc.data().expiresAt.toDate();
            const newExpires = new Date(currentExpires.getTime() + 7 * 24 * 60 * 60 * 1000);
            await planDoc.ref.update({ expiresAt: newExpires });
          } else {
            await db.collection('plans').add({
              userId,
              name: 'Pro',
              price: 0,
              isActive: true,
              predictionsUsedToday: 0,
              dailyPredictionLimit: 50,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      } catch (err) {
        console.error('Error applying spin reward:', err);
      }
    }

    res.json({ prizeIndex });
  });

  app.post('/api/verify-task', (req, res) => {
    const { userId, taskId, screenshotBase64 } = req.body;
    if (!userId || !taskId || !screenshotBase64) return res.status(400).json({ error: 'Missing fields' });

    setTimeout(() => {
      const isVerified = Math.random() > 0.1;
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
    // 1. Get all eligible users (those who completed tasks)
    // In a real app, you'd have a collection 'giveaway_entries'
    try {
      const usersSnapshot = await db.collection('users').get();
      const eligibleUsers = usersSnapshot.docs.filter(doc => doc.data().isGiveawayEligible);
      
      if (eligibleUsers.length === 0) return res.json({ success: false, message: 'No eligible users' });

      const winner = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
      const winnerData = winner.data();

      // 2. Reward winner
      await winner.ref.update({
        walletBalance: FieldValue.increment(1000),
        isGiveawayEligible: false // Reset for next day
      });

      await db.collection('transactions').add({
        userId: winner.id,
        type: 'deposit',
        amount: 1000,
        status: 'approved',
        notes: 'Daily Giveaway Winner Reward',
        createdAt: FieldValue.serverTimestamp()
      });

      // Give 1 month free plan
      await db.collection('plans').add({
        userId: winner.id,
        name: 'Pro',
        price: 0,
        isActive: true,
        predictionsUsedToday: 0,
        dailyPredictionLimit: 100,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: FieldValue.serverTimestamp()
      });

      // 3. Record giveaway result
      await db.collection('giveaways').add({
        winnerId: winner.id,
        winnerEmail: winnerData.email,
        prize: '₹1000 + 1 Month Pro',
        drawnAt: FieldValue.serverTimestamp()
      });

      res.json({ success: true, winner: winnerData.email });
    } catch (err) {
      console.error('Giveaway draw error:', err);
      res.status(500).json({ error: 'Failed to draw giveaway' });
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

  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
