import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Admin from '../models/Admin.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-hazardlens-s32-change-in-prod'

/**
 * Generate a JWT for a user or admin account.
 */
export function signToken(accountId, accountType = 'user') {
  return jwt.sign({ id: accountId, accountType }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

/**
 * Verify and decode a JWT.
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

async function resolveAccount(decoded) {
  if (decoded.accountType === 'admin') {
    const admin = await Admin.findById(decoded.id)
    return admin ? { account: admin, isAdminAccount: true } : null
  }
  const user = await User.findById(decoded.id)
  return user ? { account: user, isAdminAccount: false } : null
}

/**
 * Middleware: Require authentication.
 * Attaches `req.user` (full Mongoose document from User or Admin collection).
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const token = header.split(' ')[1]
    const decoded = verifyToken(token)

    const resolved = await resolveAccount(decoded)
    if (!resolved) {
      return res.status(401).json({ error: 'Account not found' })
    }

    req.user = resolved.account
    req.isAdminAccount = resolved.isAdminAccount
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    next(err)
  }
}

/**
 * Middleware: Require a minimum role level.
 * Must be used AFTER requireAuth.
 *
 * Role hierarchy: community < reporter < verifier < corrector < admin
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (allowedRoles.includes('admin') && allowedRoles.length === 1 && !req.isAdminAccount) {
      return res.status(403).json({
        error: 'Admin collection authentication required',
        required: allowedRoles,
        current: req.user.role,
      })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      })
    }
    next()
  }
}

/**
 * Optional auth — sets req.user if token is present, but doesn't fail.
 */
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization
    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1]
      const decoded = verifyToken(token)
      const resolved = await resolveAccount(decoded)
      if (resolved) {
        req.user = resolved.account
        req.isAdminAccount = resolved.isAdminAccount
      }
    }
  } catch {
    // Ignore — user remains unauthenticated
  }
  next()
}
