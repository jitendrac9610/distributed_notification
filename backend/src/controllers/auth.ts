import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../config/db';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { registerSchema, loginSchema } from '../validators/auth';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

// POST /api/auth/register
export const register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validationResult = registerSchema.safeParse(req.body);
  if (!validationResult.success) {
    return ApiResponse.error(res, validationResult.error.errors[0].message, null, 400);
  }

  const { email, password, role } = validationResult.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return ApiResponse.error(res, 'User with this email already exists', null, 400);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: role as 'USER' | 'ADMIN',
    },
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return ApiResponse.success(
    res,
    'User registered successfully',
    {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    },
    201
  );
});

// POST /api/auth/login
export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validationResult = loginSchema.safeParse(req.body);
  if (!validationResult.success) {
    return ApiResponse.error(res, validationResult.error.errors[0].message, null, 400);
  }

  const { email, password } = validationResult.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return ApiResponse.error(res, 'Invalid email or password', null, 400);
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    return ApiResponse.error(res, 'Invalid email or password', null, 400);
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return ApiResponse.success(res, 'User logged in successfully', {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Unauthorized', null, 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return ApiResponse.error(res, 'User not found', null, 404);
  }

  return ApiResponse.success(res, 'User profile retrieved successfully', { user });
});
