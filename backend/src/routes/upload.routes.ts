import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { StorageService } from '../services/storage.service';

const router = Router();
const storageService = new StorageService();

// Upload image
router.post(
  '/image',
  authenticate,
  storageService.upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image provided',
        });
      }
      
      const fileName = await storageService.saveImage(
        req.file.buffer,
        req.file.originalname
      );
      
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

// Delete image
router.delete('/:fileName', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await storageService.deleteImage(req.params.fileName);
    
    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
