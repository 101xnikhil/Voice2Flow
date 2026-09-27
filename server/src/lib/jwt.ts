import jwt, { Secret } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

export interface JwtAccessTokenPayload {
  userId: string;
  email: string;
}

export function generateAccessToken(payload: JwtAccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, {
    expiresIn: '15m',
    issuer: 'voice2flow-api',
  });
}

export function verifyAccessToken(token: string): JwtAccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET as Secret, {
      issuer: 'voice2flow-api',
    }) as JwtAccessTokenPayload;
    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Access token has expired');
    }
    throw AppError.unauthorized('Invalid access token');
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
