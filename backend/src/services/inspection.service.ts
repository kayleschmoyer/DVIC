import sql from 'mssql';
import { poolPromise } from '../config/database';
import { Inspection, LineItem } from '../models/Inspection.model';

export class InspectionService {
  async createInspection(inspection: Partial<Inspection>): Promise<number> {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('VehicleVIN', sql.VarChar(50), inspection.VehicleVIN)
        .input('CustomerID', sql.Int, inspection.CustomerID)
        .input('MechanicID', sql.Int, inspection.MechanicID)
        .input('Status', sql.VarChar(20), inspection.Status || 'pending')
        .input('Notes', sql.VarChar(sql.MAX), inspection.Notes)
        .query(`
          INSERT INTO ESTMTEHDR (VehicleVIN, CustomerID, InspectionDate, MechanicID, Status, TotalAmount, Notes, CreatedAt, UpdatedAt)
          VALUES (@VehicleVIN, @CustomerID, GETDATE(), @MechanicID, @Status, 0, @Notes, GETDATE(), GETDATE());
          SELECT SCOPE_IDENTITY() AS EstimateID;
        `);
      
      return result.recordset[0].EstimateID;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create inspection: ${error.message}`);
      } else {
        throw new Error('Failed to create inspection: Unknown error');
      }
    }
  }

  async getInspections(filters?: any): Promise<Inspection[]> {
    try {
      const pool = await poolPromise;
      let query = `
        SELECT e.*, m.Name as MechanicName 
        FROM ESTMTEHDR e
        LEFT JOIN MECHANIC m ON e.MechanicID = m.MechanicID
        WHERE 1=1
      `;
      
      const request = pool.request();
      
      if (filters?.status) {
        query += ' AND e.Status = @Status';
        request.input('Status', sql.VarChar(20), filters.status);
      }
      
      if (filters?.mechanicId) {
        query += ' AND e.MechanicID = @MechanicID';
        request.input('MechanicID', sql.Int, filters.mechanicId);
      }
      
      if (filters?.search) {
        query += ' AND (e.VehicleVIN LIKE @Search OR e.Notes LIKE @Search)';
        request.input('Search', sql.VarChar(100), `%${filters.search}%`);
      }
      
      if (filters?.startDate) {
        query += ' AND e.InspectionDate >= @StartDate';
        request.input('StartDate', sql.DateTime, new Date(filters.startDate));
      }
      
      if (filters?.endDate) {
        query += ' AND e.InspectionDate <= @EndDate';
        request.input('EndDate', sql.DateTime, new Date(filters.endDate));
      }
      
      query += ' ORDER BY e.InspectionDate DESC';
      
      // Pagination
      if (filters?.limit && filters?.page) {
        const offset = (filters.page - 1) * filters.limit;
        query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
      }
      
      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get inspections: ${error.message}`);
      } else {
        throw new Error('Failed to get inspections: Unknown error');
      }
    }
  }

  async getInspectionById(id: number): Promise<Inspection> {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('EstimateID', sql.Int, id)
        .query(`
          SELECT e.*, m.Name as MechanicName 
          FROM ESTMTEHDR e
          LEFT JOIN MECHANIC m ON e.MechanicID = m.MechanicID
          WHERE e.EstimateID = @EstimateID
        `);
      
      if (result.recordset.length === 0) {
        throw new Error('Inspection not found');
      }
      
      return result.recordset[0];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get inspection: ${error.message}`);
      } else {
        throw new Error('Failed to get inspection: Unknown error');
      }
    }
  }

  async updateInspection(id: number, updates: Partial<Inspection>): Promise<void> {
    try {
      const pool = await poolPromise;
      const request = pool.request()
        .input('EstimateID', sql.Int, id);
      
      let updateFields = [];
      
      if (updates.Status !== undefined) {
        updateFields.push('Status = @Status');
        request.input('Status', sql.VarChar(20), updates.Status);
      }
      
      if (updates.TotalAmount !== undefined) {
        updateFields.push('TotalAmount = @TotalAmount');
        request.input('TotalAmount', sql.Decimal(10, 2), updates.TotalAmount);
      }
      
      if (updates.Notes !== undefined) {
        updateFields.push('Notes = @Notes');
        request.input('Notes', sql.VarChar(sql.MAX), updates.Notes);
      }
      
      updateFields.push('UpdatedAt = GETDATE()');
      
      const query = `
        UPDATE ESTMTEHDR 
        SET ${updateFields.join(', ')}
        WHERE EstimateID = @EstimateID
      `;
      
      await request.query(query);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update inspection: ${error.message}`);
      } else {
        throw new Error('Failed to update inspection: Unknown error');
      }
    }
  }

  async addLineItem(lineItem: Partial<LineItem>): Promise<number> {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('EstimateID', sql.Int, lineItem.EstimateID)
        .input('ItemType', sql.VarChar(50), lineItem.ItemType)
        .input('Description', sql.VarChar(500), lineItem.Description)
        .input('Severity', sql.VarChar(20), lineItem.Severity)
        .input('Cost', sql.Decimal(10, 2), lineItem.Cost || 0)
        .input('Photos', sql.VarChar(sql.MAX), lineItem.Photos)
        .input('Status', sql.VarChar(20), lineItem.Status)
        .input('Notes', sql.VarChar(sql.MAX), lineItem.Notes)
        .query(`
          INSERT INTO LINEITEM (EstimateID, ItemType, Description, Severity, Cost, Photos, Status, Notes, CreatedAt)
          VALUES (@EstimateID, @ItemType, @Description, @Severity, @Cost, @Photos, @Status, @Notes, GETDATE());
          SELECT SCOPE_IDENTITY() AS LineItemID;
        `);
      
      // Update total amount in ESTMTEHDR
      if (typeof lineItem.EstimateID === 'number') {
        await this.updateInspectionTotal(lineItem.EstimateID);
      }
      
      return result.recordset[0].LineItemID;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to add line item: ${error.message}`);
      } else {
        throw new Error('Failed to add line item: Unknown error');
      }
    }
  }

  async updateLineItem(id: number, updates: Partial<LineItem>): Promise<void> {
    try {
      const pool = await poolPromise;
      const request = pool.request()
        .input('LineItemID', sql.Int, id);
      
      let updateFields = [];
      
      if (updates.ItemType !== undefined) {
        updateFields.push('ItemType = @ItemType');
        request.input('ItemType', sql.VarChar(50), updates.ItemType);
      }
      
      if (updates.Description !== undefined) {
        updateFields.push('Description = @Description');
        request.input('Description', sql.VarChar(500), updates.Description);
      }
      
      if (updates.Severity !== undefined) {
        updateFields.push('Severity = @Severity');
        request.input('Severity', sql.VarChar(20), updates.Severity);
      }
      
      if (updates.Cost !== undefined) {
        updateFields.push('Cost = @Cost');
        request.input('Cost', sql.Decimal(10, 2), updates.Cost);
      }
      
      if (updates.Status !== undefined) {
        updateFields.push('Status = @Status');
        request.input('Status', sql.VarChar(20), updates.Status);
      }
      
      if (updates.Notes !== undefined) {
        updateFields.push('Notes = @Notes');
        request.input('Notes', sql.VarChar(sql.MAX), updates.Notes);
      }
      
      if (updateFields.length === 0) {
        return;
      }
      
      const query = `
        UPDATE LINEITEM 
        SET ${updateFields.join(', ')}
        WHERE LineItemID = @LineItemID
      `;
      
      await request.query(query);
      
      // Get EstimateID and update total
      const estimateResult = await pool.request()
        .input('LineItemID', sql.Int, id)
        .query('SELECT EstimateID FROM LINEITEM WHERE LineItemID = @LineItemID');
      
      if (estimateResult.recordset.length > 0) {
        await this.updateInspectionTotal(estimateResult.recordset[0].EstimateID);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update line item: ${error.message}`);
      } else {
        throw new Error('Failed to update line item: Unknown error');
      }
    }
  }

  async deleteLineItem(id: number): Promise<void> {
    try {
      const pool = await poolPromise;
      
      // Get EstimateID before deletion
      const result = await pool.request()
        .input('LineItemID', sql.Int, id)
        .query('SELECT EstimateID FROM LINEITEM WHERE LineItemID = @LineItemID');
      
      const estimateId = result.recordset[0]?.EstimateID;
      
      // Delete line item
      await pool.request()
        .input('LineItemID', sql.Int, id)
        .query('DELETE FROM LINEITEM WHERE LineItemID = @LineItemID');
      
      // Update total if we had an EstimateID
      if (estimateId) {
        await this.updateInspectionTotal(estimateId);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete line item: ${error.message}`);
      } else {
        throw new Error('Failed to delete line item: Unknown error');
      }
    }
  }

  async getLineItems(inspectionId: number): Promise<LineItem[]> {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('EstimateID', sql.Int, inspectionId)
        .query(`
          SELECT * FROM LINEITEM 
          WHERE EstimateID = @EstimateID 
          ORDER BY LineItemID
        `);
      
      return result.recordset;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get line items: ${error.message}`);
      } else {
        throw new Error('Failed to get line items: Unknown error');
      }
    }
  }

  async addPhotoToLineItem(lineItemId: number, fileName: string): Promise<void> {
    try {
      const pool = await poolPromise;
      
      // Get existing photos
      const result = await pool.request()
        .input('LineItemID', sql.Int, lineItemId)
        .query('SELECT Photos FROM LINEITEM WHERE LineItemID = @LineItemID');
      
      const existingPhotos = result.recordset[0]?.Photos;
      const photos = existingPhotos ? JSON.parse(existingPhotos) : [];
      photos.push(fileName);
      
      // Update with new photos array
      await pool.request()
        .input('LineItemID', sql.Int, lineItemId)
        .input('Photos', sql.VarChar(sql.MAX), JSON.stringify(photos))
        .query('UPDATE LINEITEM SET Photos = @Photos WHERE LineItemID = @LineItemID');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to add photo: ${error.message}`);
      } else {
        throw new Error('Failed to add photo: Unknown error');
      }
    }
  }

  async getInspectionStats(mechanicId?: number): Promise<any> {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      
      let whereClause = '';
      if (mechanicId) {
        whereClause = 'WHERE e.MechanicID = @MechanicID';
        request.input('MechanicID', sql.Int, mechanicId);
      }
      
      const query = `
        SELECT 
          COUNT(DISTINCT e.EstimateID) as totalInspections,
          COUNT(DISTINCT CASE WHEN e.Status = 'completed' THEN e.EstimateID END) as completedInspections,
          COUNT(DISTINCT CASE WHEN e.Status = 'in-progress' THEN e.EstimateID END) as inProgressInspections,
          COUNT(DISTINCT CASE WHEN e.Status = 'pending' THEN e.EstimateID END) as pendingInspections,
          AVG(CASE WHEN e.Status = 'completed' THEN DATEDIFF(MINUTE, e.CreatedAt, e.UpdatedAt) END) as avgCompletionTime,
          COUNT(DISTINCT CASE WHEN e.InspectionDate >= DATEADD(DAY, -1, GETDATE()) THEN e.EstimateID END) as dailyInspections,
          COUNT(DISTINCT CASE WHEN e.InspectionDate >= DATEADD(DAY, -7, GETDATE()) THEN e.EstimateID END) as weeklyInspections,
          COUNT(DISTINCT CASE WHEN e.InspectionDate >= DATEADD(DAY, -30, GETDATE()) THEN e.EstimateID END) as monthlyInspections,
          SUM(e.TotalAmount) as totalRevenue,
          AVG(e.TotalAmount) as avgInspectionValue
        FROM ESTMTEHDR e
        ${whereClause}
      `;
      
      const statsResult = await request.query(query);
      
      // Get severity distribution
      const severityQuery = `
        SELECT 
          l.Severity,
          COUNT(*) as count
        FROM LINEITEM l
        INNER JOIN ESTMTEHDR e ON l.EstimateID = e.EstimateID
        ${whereClause}
        GROUP BY l.Severity
      `;
      
      const severityResult = await request.query(severityQuery);
      
      return {
        ...statsResult.recordset[0],
        severityDistribution: severityResult.recordset,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get stats: ${error.message}`);
      } else {
        throw new Error('Failed to get stats: Unknown error');
      }
    }
  }

  private async updateInspectionTotal(inspectionId: number): Promise<void> {
    try {
      const pool = await poolPromise;
      await pool.request()
        .input('EstimateID', sql.Int, inspectionId)
        .query(`
          UPDATE ESTMTEHDR 
          SET TotalAmount = (
            SELECT ISNULL(SUM(Cost), 0) 
            FROM LINEITEM 
            WHERE EstimateID = @EstimateID
          ),
          UpdatedAt = GETDATE()
          WHERE EstimateID = @EstimateID
        `);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update inspection total: ${error.message}`);
      } else {
        throw new Error('Failed to update inspection total: Unknown error');
      }
    }
  }
}

export default InspectionService;