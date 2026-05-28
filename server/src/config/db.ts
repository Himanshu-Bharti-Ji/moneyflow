import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';

// Force Google DNS — local DNS doesn't resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => console.log('[db] connected to MongoDB'));
  mongoose.connection.on('error', (err) => console.error('[db] error:', err));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));

  await mongoose.connect(env.mongoUri, {
    dbName: 'moneyflow',
  });
}

export function dbStatus(): 'connected' | 'disconnected' {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}
