import 'dotenv/config';
import express from 'express';
import createCheckout from './api/create-checkout';
import paymongoWebhook from './api/paymongo-webhook';
import verifyPayment from './api/verify-payment';

const app = express();
app.use(express.json());

// Mount the Vercel serverless functions as Express routes
app.post('/api/create-checkout', (req, res) => createCheckout(req, res));
app.post('/api/paymongo-webhook', (req, res) => paymongoWebhook(req, res));
app.post('/api/verify-payment', (req, res) => verifyPayment(req, res));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ API dev server running on http://localhost:${PORT}`);
  console.log(`   POST /api/create-checkout`);
  console.log(`   POST /api/paymongo-webhook`);
  console.log(`   PAYMONGO_SECRET_KEY: ${process.env.PAYMONGO_SECRET_KEY ? '✅ loaded' : '❌ missing'}`);
});
