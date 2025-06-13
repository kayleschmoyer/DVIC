import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export class StorageService {
  private uploadDir = path.join(__dirname, '../../../uploads');
  
  constructor() {
    this.ensureUploadDir();
  }
  
  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }
  
  public upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
      }
    },
  });
  
  async saveImage(buffer: Buffer, originalName: string): Promise<string> {
    const fileExt = path.extname(originalName);
    const fileName = `${crypto.randomBytes(16).toString('hex')}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);
    
    // Resize and optimize image
    await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toFile(filePath);
    
    // Create thumbnail
    const thumbName = `thumb_${fileName}`;
    const thumbPath = path.join(this.uploadDir, thumbName);
    
    await sharp(buffer)
      .resize(300, 300, {
        fit: 'cover',
      })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);
    
    return fileName;
  }
  
  async deleteImage(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, fileName);
      const thumbPath = path.join(this.uploadDir, `thumb_${fileName}`);
      
      await Promise.all([
        fs.unlink(filePath),
        fs.unlink(thumbPath),
      ]);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }
}