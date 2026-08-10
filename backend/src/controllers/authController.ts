import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'mmit-secure-jwt-secret-2026';

// Simple in-memory rate limiting map for failed login attempts
const failedAttemptsMap = new Map<string, { count: number; resetTime: number }>();

export const login = async (req: Request, res: Response) => {
  try {
    const rawId = req.body.adminId || req.body.username || req.body.email;
    const password = req.body.password;

    if (!rawId || !password) {
      return res.status(401).json({ message: 'Invalid administrator credentials.' });
    }

    const identifier = String(rawId).trim().toLowerCase();

    // Check rate limit
    const now = Date.now();
    const attempts = failedAttemptsMap.get(identifier);
    if (attempts && attempts.resetTime > now) {
      if (attempts.count >= 5) {
        return res.status(429).json({ 
          message: 'Too many failed login attempts. Please wait 1 minute before trying again.' 
        });
      }
    } else {
      failedAttemptsMap.set(identifier, { count: 0, resetTime: now + 60000 });
    }

    // Lookup user by email/username (e.g. 'admin' or 'admin@mmit.edu.in')
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { email: `${identifier}@mmit.edu.in` },
          { name: identifier }
        ]
      }
    });

    if (!user) {
      // Record failed attempt
      const current = failedAttemptsMap.get(identifier) || { count: 0, resetTime: now + 60000 };
      failedAttemptsMap.set(identifier, { ...current, count: current.count + 1 });
      return res.status(401).json({ message: 'Invalid administrator credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const current = failedAttemptsMap.get(identifier) || { count: 0, resetTime: now + 60000 };
      failedAttemptsMap.set(identifier, { ...current, count: current.count + 1 });
      return res.status(401).json({ message: 'Invalid administrator credentials.' });
    }

    // Reset failed attempts on success
    failedAttemptsMap.delete(identifier);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, departmentId: user.departmentId },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to authenticate. Please try again.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, departmentId } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role || 'SUPER_ADMIN',
        departmentId: departmentId || null
      }
    });

    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
