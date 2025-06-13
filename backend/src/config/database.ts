import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

export const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'Vastoffice',
  user: process.env.DB_USER || 'vastoffice',
  password: process.env.DB_PASSWORD || 'snowdrift',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

export const poolPromise = new sql.ConnectionPool(config).connect();