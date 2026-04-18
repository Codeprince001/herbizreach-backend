export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  publicFilesBaseUrl: (process.env.PUBLIC_FILES_BASE_URL ?? 'http://localhost:4000').replace(
    /\/$/,
    '',
  ),
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  /** When true and Cloudinary is not configured, images save to local disk (dev). */
  useLocalImageUpload: process.env.USE_LOCAL_IMAGE_UPLOAD === 'true',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    folder: process.env.CLOUDINARY_FOLDER ?? 'herbizreach',
  },
  redisUrl: process.env.REDIS_URL ?? '',
  /** Product description AI via Google Gemini. */
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    /** Imagen model for product image enhancement (`models.editImage`, not `generateContent`). */
    imageModel: process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image',
  },
  /** Legacy provider config kept temporarily while testing Gemini. */
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
    httpReferer: process.env.OPENROUTER_HTTP_REFERER ?? '',
    appTitle: process.env.OPENROUTER_APP_TITLE ?? 'HerBizReach',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  },
  throttle: {
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
  },
  aiThrottle: {
    limit: parseInt(process.env.AI_THROTTLE_LIMIT ?? '20', 10),
  },
  adminBootstrap: {
    email: (process.env.ADMIN_BOOTSTRAP_EMAIL ?? '').toLowerCase().trim(),
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD ?? '',
  },
});
