// Cloudinary is optional infrastructure, not a hard requirement like
// JWT_SECRET — the app runs fine without it (product/team images just stay
// URL-only). Once the client's Cloudinary account exists, set
// CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET and
// uploads switch on automatically, no code change needed.
const cloudinary = require('cloudinary').v2;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isConfigured = !!(CLOUD_NAME && API_KEY && API_SECRET);

if (isConfigured) {
  cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET, secure: true });
} else {
  console.warn('[cloudinary] CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET not set — image upload is disabled (manual image URLs still work).');
}

module.exports = { cloudinary, isConfigured, CLOUD_NAME };
