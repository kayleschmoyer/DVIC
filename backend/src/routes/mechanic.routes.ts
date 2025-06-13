import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import sql from 'mssql';
import { poolPromise } from '../config/database';

const router = Router();

// Get all mechanics
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT MechanicID, Name, Email, Phone, Certifications, Active, CreatedAt
        FROM MECHANIC
        WHERE Active = 1
        ORDER BY Name
      `);
    
    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    next(error);
  }
});

// Get mechanic by ID
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('MechanicID', sql.Int, parseInt(req.params.id))
      .query(`
        SELECT m.*, 
               COUNT(DISTINCT e.EstimateID) as TotalInspections,
               COUNT(DISTINCT CASE WHEN e.Status = 'completed' THEN e.EstimateID END) as CompletedInspections
        FROM MECHANIC m
        LEFT JOIN ESTMTEHDR e ON m.MechanicID = e.MechanicID
        WHERE m.MechanicID = @MechanicID
        GROUP BY m.MechanicID, m.Name, m.Email, m.Phone, m.Certifications, m.Active, m.CreatedAt
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Mechanic not found',
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

// Update mechanic
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, certifications } = req.body;
    const mechanicId = parseInt(req.params.id);
    
    const pool = await poolPromise;
    const request = pool.request()
      .input('MechanicID', sql.Int, mechanicId);
    
    let updateFields = [];
    
    if (name !== undefined) {
      updateFields.push('Name = @Name');
      request.input('Name', sql.NVarChar(100), name);
    }
    
    if (phone !== undefined) {
      updateFields.push('Phone = @Phone');
      request.input('Phone', sql.VarChar(20), phone);
    }
    
    if (certifications !== undefined) {
      updateFields.push('Certifications = @Certifications');
      request.input('Certifications', sql.NVarChar(sql.MAX), certifications);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }
    
    const query = `
      UPDATE MECHANIC 
      SET ${updateFields.join(', ')}
      WHERE MechanicID = @MechanicID
    `;
    
    await request.query(query);
    
    res.json({
      success: true,
      message: 'Mechanic updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get mechanic statistics
router.get('/:id/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await poolPromise;
    const mechanicId = parseInt(req.params.id);
    
    const result = await pool.request()
      .input('MechanicID', sql.Int, mechanicId)
      .query(`
        SELECT 
          COUNT(DISTINCT e.EstimateID) as TotalInspections,
          COUNT(DISTINCT CASE WHEN e.Status = 'completed' THEN e.EstimateID END) as CompletedInspections,
          COUNT(DISTINCT CASE WHEN e.Status = 'in-progress' THEN e.EstimateID END) as InProgressInspections,
          AVG(DATEDIFF(MINUTE, e.CreatedAt, e.UpdatedAt)) as AvgInspectionTime,
          COUNT(DISTINCT CASE WHEN e.InspectionDate >= DATEADD(DAY, -7, GETDATE()) THEN e.EstimateID END) as WeeklyInspections,
          COUNT(DISTINCT CASE WHEN e.InspectionDate >= DATEADD(DAY, -30, GETDATE()) THEN e.EstimateID END) as MonthlyInspections
        FROM ESTMTEHDR e
        WHERE e.MechanicID = @MechanicID
      `);
    
    res.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;