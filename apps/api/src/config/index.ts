export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://creatorops:creatorops_password@localhost:5432/creatorops',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
  jwtExpiresIn: '7d',

  // Session
  sessionSecret: process.env.SESSION_SECRET || 'your_session_secret_key_change_in_production',

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback',
  },

  // MinIO / S3
  storage: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'creatorops-videos',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },

  // Python service
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // App URLs
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // AI Providers
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',

  // AI Configuration
  ai: {
    defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'openai',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  },
} as const;
