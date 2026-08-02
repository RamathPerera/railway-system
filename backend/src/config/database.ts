import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

if (!dbName || !dbUser || !dbPassword || !dbHost) {
  throw new Error('Missing required database environment variables (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST)');
}

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false, // To keep the console clean
  timezone: '+05:30', // Sri Lanka Standard Time (Asia/Colombo)
  pool: {
    max: 10,       // Maximum number of connections in the pool
    min: 0,        // Minimum number of connections in the pool
    acquire: 30000, // Maximum time (ms) to acquire a connection before throwing
    idle: 10000,   // Maximum time (ms) a connection can be idle before being released
  },
  define: {
    underscored: true, // Use snake_case for column names
    timestamps: true,  // Add createdAt/updatedAt to all models by default
  },
});

export default sequelize;
