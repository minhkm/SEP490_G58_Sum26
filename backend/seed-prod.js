// seed-prod.js - Chạy seed lên production DB (Railway) từ máy local
// Usage: npm run seed:prod
'use strict';

// Load .env.production thay vì .env mặc định
require('dotenv').config({ path: '.env.production' });

// Pass --confirm để bypass safety guard trong seed.js
process.argv.push('--confirm');

// Chạy seed script bình thường
require('./src/seed');
