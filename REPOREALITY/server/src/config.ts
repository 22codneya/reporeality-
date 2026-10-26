import dotenv from 'dotenv';
import path from 'node:path';
import { loadConfig, type AppConfig } from './validators/schemas.js';

// Load .env from project root
dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') });

export const config: AppConfig = loadConfig();
export default config;
