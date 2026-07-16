require('dotenv/config');

const express = require('express');
const path = require('path');
const drinksRouter = require('./drinks');
const prisma = require('./lib/prisma');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware to parse JSON bodies (will be useful in later steps)
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/img', express.static(path.join(__dirname, '../img')));

// Frontend route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', drinksRouter);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
