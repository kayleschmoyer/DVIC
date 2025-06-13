import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validate } from '../middleware/validation';
import Joi from 'joi';
import sql from 'mssql';
import { poolPromise } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().optional(),
});

// Login
router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Email', sql.VarChar(100), email)
      .query('SELECT * FROM MECHANIC WHERE Email = @Email AND Active = 1');
    
    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }
    
    const mechanic = result.recordset[0];
    
    // For demo purposes, using simple password check
    // In production, store hashed passwords
    if (!mechanic.PasswordHash || !await bcrypt.compare(password, mechanic.PasswordHash)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }
    
    const token = jwt.sign(
      {
        id: mechanic.MechanicID,
        email: mechanic.Email,
        role: mechanic.Role || 'mechanic',
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: mechanic.MechanicID,
          name: mechanic.Name,
          email: mechanic.Email,
          role: mechanic.Role || 'mechanic',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register
router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const pool = await poolPromise;
    
    // Check if email exists
    const existingUser = await pool.request()
      .input('Email', sql.VarChar(100), email)
      .query('SELECT MechanicID FROM MECHANIC WHERE Email = @Email');
    
    if (existingUser.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }
    
    // Create new mechanic
    const result = await pool.request()
      .input('Name', sql.NVarChar(100), name)
      .input('Email', sql.VarChar(100), email)
      .input('PasswordHash', sql.VarChar(255), hashedPassword)
      .input('Phone', sql.VarChar(20), phone)
      .query(`
        INSERT INTO MECHANIC (Name, Email, PasswordHash, Phone, Active, CreatedAt)
        VALUES (@Name, @Email, @PasswordHash, @Phone, 1, GETDATE());
        SELECT SCOPE_IDENTITY() AS MechanicID;
      `);
    
    const mechanicId = result.recordset[0].MechanicID;
    
    const token = jwt.sign(
      {
        id: mechanicId,
        email: email,
        role: 'mechanic',
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: mechanicId,
          name,
          email,
          role: 'mechanic',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('MechanicID', sql.Int, req.user?.id)
      .query('SELECT MechanicID, Name, Email, Phone, Certifications FROM MECHANIC WHERE MechanicID = @MechanicID');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    res.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;