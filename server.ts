import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Determine directory safely in both ESM (tsx) and bundled CJS (dist/server.cjs) environments
const rootDir = process.cwd();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory OTP store for active email codes: email -> { otp: string, expiresAt: number }
  const activeOtps = new Map<string, { otp: string; expiresAt: number }>();

  // API Route: Send Real Admin OTP to Email
  app.post('/api/auth/send-admin-otp', async (req, res) => {
    try {
      const { email, buildingName, societyPayeeName } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !cleanEmail.includes('@')) {
        return res.status(400).json({ success: false, error: 'A valid email address is required.' });
      }

      const displayBuildingName = (buildingName || societyPayeeName || 'Society Management Portal').trim();
      const displayFooterName = (societyPayeeName || buildingName || 'Society Management').trim();

      // Generate 6-digit numeric OTP code
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      activeOtps.set(cleanEmail, { otp: generatedOtp, expiresAt });

      const resendApiKey = process.env.RESEND_API_KEY;

      if (!resendApiKey) {
        console.warn('RESEND_API_KEY is not configured in server environment.');
        return res.status(503).json({
          success: false,
          missingApiKey: true,
          error: 'Email delivery service is not configured. Please add RESEND_API_KEY in the environment / Settings panel to deliver live emails.',
        });
      }

      const resend = new Resend(resendApiKey);

      // Deliver actual email
      const { data, error } = await resend.emails.send({
        from: 'Society Admin <onboarding@resend.dev>',
        to: [cleanEmail],
        subject: `[${displayBuildingName}] Your Administrator One-Time Passcode: ${generatedOtp}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #0f172a; margin: 0 0 6px 0; font-size: 22px;">${displayBuildingName}</h2>
              <p style="color: #64748b; margin: 0; font-size: 14px;">Administrator Sign-In Verification</p>
            </div>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <p style="color: #334155; font-size: 14px; margin-top: 0; margin-bottom: 20px;">
                You requested a secure one-time passcode (OTP) to log in as <strong>Society Secretary / Administrator</strong> for <strong>${displayBuildingName}</strong>.
              </p>
              <div style="display: inline-block; background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 14px 28px; margin: 8px 0 20px 0;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1d4ed8;">${generatedOtp}</span>
              </div>
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
              </p>
            </div>
            <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
              ${displayFooterName} &bull; Automated System Notice
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('Resend email error:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to dispatch email via Resend.',
        });
      }

      console.log(`Live OTP email successfully dispatched to ${cleanEmail}, Resend ID:`, data?.id);
      return res.json({
        success: true,
        email: cleanEmail,
        message: `A 6-digit OTP has been sent to your email inbox: ${cleanEmail}`,
      });
    } catch (err: any) {
      console.error('Error sending OTP email:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Internal server error while sending email.',
      });
    }
  });

  // API Route: Verify Email OTP
  app.post('/api/auth/verify-admin-otp', (req, res) => {
    try {
      const { email, otp } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanOtp = (otp || '').trim().replace(/\D/g, '');

      if (!cleanEmail || !cleanOtp) {
        return res.status(400).json({ success: false, error: 'Email and 6-digit OTP are required.' });
      }

      const record = activeOtps.get(cleanEmail);

      if (!record) {
        return res.status(400).json({
          success: false,
          error: 'No active OTP request found for this email. Please request a new OTP.',
        });
      }

      if (Date.now() > record.expiresAt) {
        activeOtps.delete(cleanEmail);
        return res.status(400).json({
          success: false,
          error: 'OTP code has expired. Please request a fresh OTP.',
        });
      }

      if (record.otp !== cleanOtp) {
        return res.status(400).json({
          success: false,
          error: 'Incorrect OTP code. Please check your email inbox and try again.',
        });
      }

      // Valid OTP: delete to prevent reuse
      activeOtps.delete(cleanEmail);

      return res.json({
        success: true,
        verified: true,
        email: cleanEmail,
      });
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      return res.status(500).json({ success: false, error: 'Internal verification error.' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
