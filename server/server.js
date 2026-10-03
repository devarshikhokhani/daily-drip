require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const os = require('os');
const { Server } = require('socket.io');

const { initSchema } = require('./db/database');
const { initSocketIO } = require('./realtime/socketHandler');

// Routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const ordersRoutes = require('./routes/orders');
const deliveryRoutes = require('./routes/delivery');
const coffeeDnaRoutes = require('./routes/coffeeDna');
const passportRoutes = require('./routes/passport');
const cafeRoutes = require('./routes/cafe');
const tablesRoutes = require('./routes/tables');
const analyticsRoutes = require('./routes/analytics');
const favoritesRoutes = require('./routes/favorites');
const notificationsRoutes = require('./routes/notifications');
const { authenticateToken } = require('./middleware/auth');

// Initialize DB schema
initSchema();

const app = express();
const server = http.createServer(app);

// Cross-origin and Socket.IO configuration
const PORT = process.env.PORT || 5000;

// Allow requests from the Vercel frontend (production) and localhost (development)
const allowedOrigins = [
  'https://daily-drip-theta.vercel.app',
  'http://localhost:5000',
  'http://localhost:5173',
  process.env.CORS_ORIGIN
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Render health checks) or whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive fallback — tighten after confirming in production
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

app.set('io', io);
initSocketIO(io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Support cup design canvas data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(authenticateToken);

// Helper to get local network IP address
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalNetworkIp();

// System config endpoint for dynamic QR code generation
app.get('/api/config', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
  const publicAppUrl = process.env.PUBLIC_APP_URL || '';

  res.json({
    cafeName: 'DAILY DRIP',
    tagline: 'Your Coffee. Your Way.',
    baseUrl,
    publicAppUrl,
    localIp,
    port: PORT,
    networkUrl: `http://${localIp}:${PORT}`,
    env: process.env.NODE_ENV || 'development'
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/coffee-dna', coffeeDnaRoutes);
app.use('/api/passport', passportRoutes);
app.use('/api/cafe', cafeRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'Daily Drip Smart Café',
    time: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend in production or if client/dist exists
const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));

// Catch-all handler for SPA - Guaranteed to serve index.html across all OS platforms
app.use((req, res) => {
  // If request starts with /api, return 404 JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  // Cross-platform Express sendFile with { root: clientDist }
  res.sendFile('index.html', { root: clientDist }, (err) => {
    if (err) {
      // Fallback directly to fs.readFileSync to ensure no SendStream path issues ever block the SPA
      try {
        const html = fs.readFileSync(path.join(clientDist, 'index.html'), 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);
      } catch (readErr) {
        console.error('Error reading index.html:', readErr);
        res.status(500).send('Daily Drip client not built yet. Please run npm run build.');
      }
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`☕ Daily Drip Server listening on http://0.0.0.0:${PORT}`);
  console.log(`📡 Local Network Access URL: http://${localIp}:${PORT}`);
});
