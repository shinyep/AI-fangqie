const path = await import('path');
const { fileURLToPath } = await import('url');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  port: process.env.PORT || 3001,
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', '..', '..', 'database', 'rankings.db'),
  // AES-128-CBC 加密配置
  crypto: {
    key: 'chloefuckityoall',
    iv: '9311019310287172',
    algorithm: 'aes-128-cbc'
  }
};
