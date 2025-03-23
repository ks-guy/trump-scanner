import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Quote } from './Quote.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 3306,
  username: process.env.MYSQL_USER || 'scanner_user',
  password: process.env.MYSQL_PASSWORD || 'dev_user_password',
  database: process.env.MYSQL_DATABASE || 'trump_scanner',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const models = {
  Quote
};

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

export { sequelize, Quote }; 