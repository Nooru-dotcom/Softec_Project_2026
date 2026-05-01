const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://fairgig:fairgig@localhost:5432/fairgig';

const pool = new Pool({ connectionString });

module.exports = { pool };
