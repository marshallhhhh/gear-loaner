import prisma from '../config/prisma.js';
import { parsePagination } from '../utils/pagination.js';

export async function listUsers(req, res, next) {
  try {
    const { search, role, isActive } = req.query;
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const where = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.profile.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await prisma.profile.findUnique({
      where: { id: req.params.id },
      include: {
        loans: {
          where: { status: 'ACTIVE' },
          include: { gearItem: { select: { id: true, name: true } } },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { role, isActive, fullName } = req.body;
    const data = {};

    if (role !== undefined) {
      if (req.params.id === req.profile.id && role !== 'ADMIN') {
        return res.status(400).json({ error: 'Cannot demote yourself' });
      }
      data.role = role;
    }
    if (isActive !== undefined) data.isActive = isActive;
    if (fullName !== undefined) data.fullName = fullName;

    const user = await prisma.profile.update({
      where: { id: req.params.id },
      data,
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getMyProfile(req, res) {
  res.json(req.profile);
}

export async function updateMyProfile(req, res, next) {
  try {
    const { fullName } = req.body;
    const profile = await prisma.profile.update({
      where: { id: req.profile.id },
      data: { fullName },
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
}
