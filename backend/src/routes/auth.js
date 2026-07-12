import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { ROLE_VALUES } from '../models/User.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw new HttpError(400, 'Email and password are required.');

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) throw new HttpError(401, 'Invalid email or password.');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid email or password.');

    res.json({ token: signToken(user), user: user.toPublicJSON() });
  })
);

// POST /api/auth/register  (helper for creating demo/test accounts; not part of the original spec's UI)
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password || !role) {
      throw new HttpError(400, 'Name, email, password and role are required.');
    }
    if (!ROLE_VALUES.includes(role)) {
      throw new HttpError(400, `Role must be one of: ${ROLE_VALUES.join(', ')}`);
    }
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) throw new HttpError(409, 'An account with that email already exists.', 'email');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase().trim(), passwordHash, role });

    res.status(201).json({ token: signToken(user), user: user.toPublicJSON() });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toPublicJSON() });
  })
);

export default router;
