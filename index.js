const express = require('express');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');

const app = express();

// Middleware
app.use(express.json());
app.use(morgan('dev')); // logs every request to the console

// Routes
app.use('/auth', authRoutes);
app.use('/items', itemRoutes);

// Health endpoint (Sprint 2 - monitoring)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Global error handler (Sprint 2 - error messages)
app.use((err, req, res, next) => {
  console.error(err.stack); // log full error server-side
  const status = err.status || 500;
  const message = err.message || 'Something went wrong';
  res.status(status).json({ error: message }); // never expose stack trace to user
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // needed for supertest in tests