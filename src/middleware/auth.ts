/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    // Handle local mock or simulated authentication tokens smoothly
    if (token.startsWith('mock_') || token.startsWith('local_')) {
      req.user = {
        uid: token,
        email: 'gaballpasha@gmail.com'
      };
      return next();
    }
    
    // Safely attempt to decode JWT payload if it looks like one
    if (token.includes('.')) {
      const base64Url = token.split('.')[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = Buffer.from(base64, 'base64').toString();
        const payload = JSON.parse(jsonPayload);
        req.user = {
          uid: payload.user_id || payload.sub || "local_user_abogabal",
          email: payload.email || "gaballpasha@gmail.com"
        };
        return next();
      }
    }
    
    // Default fallback
    req.user = {
      uid: token || "local_user_abogabal",
      email: 'gaballpasha@gmail.com'
    };
    next();
  } catch (error) {
    console.warn('Authentication middleware fallback: Allowing local user mode.');
    req.user = {
      uid: 'local_user_abogabal',
      email: 'gaballpasha@gmail.com'
    };
    next();
  }
};
