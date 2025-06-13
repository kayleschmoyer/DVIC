import { Router, Request, Response, NextFunction } from 'express';
import { InspectionService } from '../services/inspection.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';
import multer from 'multer';
import { StorageService } from '../services/storage.service';

const router = Router();
const inspectionService = new InspectionService();
const storageService = new StorageService();

// Validation schemas
const createInspectionSchema = Joi.object({
  VehicleVIN: Joi.string().alphanum().length(17).required(),
  CustomerID: Joi.number().integer().positive().required(),
  MechanicID: Joi.number().integer().positive().optional(),
  Notes: Joi.string().max(1000).optional(),
});

const updateInspectionSchema = Joi.object({
  Status: Joi.string().valid('pending', 'in-progress', 'completed').optional(),
  TotalAmount: Joi.number().precision(2).min(0).optional(),
  Notes: Joi.string().max(1000).optional(),
});

const lineItemSchema = Joi.object({
  ItemType: Joi.string().max(50).required(),
  Description: Joi.string().max(500).required(),
  Severity: Joi.string().valid('good', 'warning', 'critical').required(),
  Cost: Joi.number().precision(2).min(0).optional(),
  Status: Joi.string().valid('passed', 'attention', 'failed').required(),
  Notes: Joi.string().max(1000).optional(),
  Photos: Joi.string().optional(),
});

// Get all inspections with filters
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      status: req.query.status as string,
      mechanicId: req.query.mechanicId ? parseInt(req.query.mechanicId as string) : undefined,
      search: req.query.search as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const inspections = await inspectionService.getInspections(filters);
    
    res.json({
      success: true,
      data: inspections,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: inspections.length, // In real implementation, get total count from DB
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get inspection by ID with line items
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inspectionId = parseInt(req.params.id);
    
    if (isNaN(inspectionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid inspection ID',
      });
    }

    const inspection = await inspectionService.getInspectionById(inspectionId);
    const lineItems = await inspectionService.getLineItems(inspectionId);
    
    res.json({
      success: true,
      data: {
        ...inspection,
        lineItems,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create new inspection
router.post('/', authenticate, validate(createInspectionSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inspectionData = {
      ...req.body,
      MechanicID: req.body.MechanicID || req.user?.id,
    };

    const inspectionId = await inspectionService.createInspection(inspectionData);
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('inspection-created', {
        inspectionId,
        mechanicId: inspectionData.MechanicID,
        vehicleVIN: inspectionData.VehicleVIN,
      });
    }
    
    res.status(201).json({
      success: true,
      data: { 
        inspectionId,
        message: 'Inspection created successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update inspection
router.put('/:id', authenticate, validate(updateInspectionSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inspectionId = parseInt(req.params.id);
    
    if (isNaN(inspectionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid inspection ID',
      });
    }

    await inspectionService.updateInspection(inspectionId, req.body);
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`inspection-${inspectionId}`).emit('inspection-updated', {
        inspectionId,
        updates: req.body,
      });
    }
    
    res.json({
      success: true,
      message: 'Inspection updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Add line item to inspection
router.post('/:id/items', authenticate, validate(lineItemSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inspectionId = parseInt(req.params.id);
    
    if (isNaN(inspectionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid inspection ID',
      });
    }

    const lineItemData = {
      ...req.body,
      EstimateID: inspectionId,
    };

    const lineItemId = await inspectionService.addLineItem(lineItemData);
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`inspection-${inspectionId}`).emit('lineitem-added', {
        inspectionId,
        lineItemId,
        lineItem: lineItemData,
      });
    }
    
    res.status(201).json({
      success: true,
      data: { 
        lineItemId,
        message: 'Line item added successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update line item
router.put('/:id/items/:itemId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inspectionId = parseInt(req.params.id);
    const lineItemId = parseInt(req.params.itemId);
    
    if (isNaN(inspectionId) || isNaN(lineItemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
      });
    }

    await inspectionService.updateLineItem(lineItemId, req.body);
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`inspection-${inspectionId}`).emit('lineitem-updated', {
        inspectionId,
        lineItemId,
        updates: req.body,
      });
    }
    
    res.json({
      success: true,
      message: 'Line item updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Delete line item
router.delete('/:id/items/:itemId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inspectionId = parseInt(req.params.id);
    const lineItemId = parseInt(req.params.itemId);
    
    if (isNaN(inspectionId) || isNaN(lineItemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
      });
    }

    await inspectionService.deleteLineItem(lineItemId);
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`inspection-${inspectionId}`).emit('lineitem-deleted', {
        inspectionId,
        lineItemId,
      });
    }
    
    res.json({
      success: true,
      message: 'Line item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Upload photo for line item
router.post(
  '/:id/items/:itemId/photo',
  authenticate,
  storageService.upload.single('photo'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const inspectionId = parseInt(req.params.id);
      const lineItemId = parseInt(req.params.itemId);
      
      if (isNaN(inspectionId) || isNaN(lineItemId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No photo provided',
        });
      }

      const fileName = await storageService.saveImage(
        req.file.buffer,
        req.file.originalname
      );

      // Update line item with photo
      await inspectionService.addPhotoToLineItem(lineItemId, fileName);

      res.json({
        success: true,
        data: {
          fileName,
          url: `/uploads/${fileName}`,
          thumbnail: `/uploads/thumb_${fileName}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get inspection statistics
router.get('/stats/overview', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await inspectionService.getInspectionStats(req.user?.id);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// Get inspection report (PDF generation could be added)
router.get('/:id/report', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inspectionId = parseInt(req.params.id);
    
    if (isNaN(inspectionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid inspection ID',
      });
    }

    const inspection = await inspectionService.getInspectionById(inspectionId);
    const lineItems = await inspectionService.getLineItems(inspectionId);
    
    // In a real implementation, you would generate a PDF here
    // For now, return the data in a report format
    const report = {
      inspection,
      lineItems,
      summary: {
        totalItems: lineItems.length,
        passedItems: lineItems.filter(item => item.Status === 'passed').length,
        attentionItems: lineItems.filter(item => item.Status === 'attention').length,
        failedItems: lineItems.filter(item => item.Status === 'failed').length,
        totalCost: lineItems.reduce((sum, item) => sum + (item.Cost || 0), 0),
      },
      generatedAt: new Date().toISOString(),
    };
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

// Complete inspection
router.post('/:id/complete', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const inspectionId = parseInt(req.params.id);
    
    if (isNaN(inspectionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid inspection ID',
      });
    }

    // Update status to completed
    await inspectionService.updateInspection(inspectionId, {
      Status: 'completed',
    });

    // Get the completed inspection data
    const inspection = await inspectionService.getInspectionById(inspectionId);
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('inspection-completed', {
        inspectionId,
        inspection,
      });
    }
    
    res.json({
      success: true,
      message: 'Inspection completed successfully',
      data: {
        inspectionId,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;