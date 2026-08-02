import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;

if (!dbName || !dbUser || !dbPassword || !dbHost) {
  throw new Error('Missing required database environment variables (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST)');
}

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  dialect: 'mysql',
  logging: false, // To keep the console clean
});

export default sequelize;
