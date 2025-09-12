import { Request, Response, NextFunction } from 'express';

export const validateTaskCreation = (req: Request, res: Response, next: NextFunction) => {
  const { title, deadline, priority } = req.body;
  const errors: string[] = [];

  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!deadline) {
    errors.push('Deadline is required');
  } else if (new Date(deadline) <= new Date()) {
    errors.push('Deadline must be in the future');
  }

  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    errors.push('Priority must be low, medium, or high');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

export const validateGroupCreation = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push('Group name is required');
  }

  if (name && name.length > 50) {
    errors.push('Group name must be less than 50 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};