import 'dotenv/config';

function require(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // In production Render sets RENDER_EXTERNAL_URL automatically.
  // In dev it falls back to Vite's dev server.
  clientUrl:
    process.env.CLIENT_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    'http://localhost:5173',
  mongoUri: require('MONGODB_URI'),
  jwtSecret: require('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
};
