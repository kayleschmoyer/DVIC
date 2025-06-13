import sql from 'mssql';
import { config } from '../config/database';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    const pool = await sql.connect({ ...config, database: 'Vastoffice' });
    
    // Seed Mechanics
    const mechanics = [
      { name: 'John Smith', email: 'john.smith@vastoffice.com', phone: '555-0101', certifications: 'ASE Certified, Master Technician' },
      { name: 'Sarah Johnson', email: 'sarah.johnson@vastoffice.com', phone: '555-0102', certifications: 'ASE Certified, Brake Specialist' },
      { name: 'Mike Davis', email: 'mike.davis@vastoffice.com', phone: '555-0103', certifications: 'ASE Certified, Engine Performance' },
      { name: 'Lisa Anderson', email: 'lisa.anderson@vastoffice.com', phone: '555-0104', certifications: 'ASE Certified, Electrical Systems' },
      { name: 'Robert Wilson', email: 'robert.wilson@vastoffice.com', phone: '555-0105', certifications: 'ASE Master Technician, Hybrid Specialist' }
    ];
    
    const defaultPassword = await bcrypt.hash('password123', 10);
    const mechanicIds = [];
    
    for (const mechanic of mechanics) {
      const result = await pool.request()
        .input('Name', sql.NVarChar(100), mechanic.name)
        .input('Email', sql.VarChar(100), mechanic.email)
        .input('PasswordHash', sql.VarChar(255), defaultPassword)
        .input('Phone', sql.VarChar(20), mechanic.phone)
        .input('Certifications', sql.NVarChar(sql.MAX), mechanic.certifications)
        .query(`
          IF NOT EXISTS (SELECT * FROM MECHANIC WHERE Email = @Email)
          BEGIN
            INSERT INTO MECHANIC (Name, Email, PasswordHash, Phone, Certifications, Active)
            VALUES (@Name, @Email, @PasswordHash, @Phone, @Certifications, 1);
            SELECT SCOPE_IDENTITY() AS MechanicID;
          END
          ELSE
          BEGIN
            SELECT MechanicID FROM MECHANIC WHERE Email = @Email;
          END
        `);
      
      mechanicIds.push(result.recordset[0].MechanicID);
    }
    
    console.log('✅ Mechanics seeded');
    
    // Seed Sample Inspections
    const vehicles = [
      { vin: '5YJ3E1EA1NF123456', type: '2023 Tesla Model 3', customerId: 1001 },
      { vin: 'WBAJR9C55N1234567', type: '2022 BMW X5', customerId: 1002 },
      { vin: '1FTFW1ET5NFC12345', type: '2024 Ford F-150', customerId: 1003 },
      { vin: 'JM1NDAL75M0123456', type: '2021 Mazda CX-30', customerId: 1004 },
      { vin: '2HGFC2F59MH123456', type: '2021 Honda Civic', customerId: 1005 },
      { vin: '5NPF34AF6LH123456', type: '2020 Hyundai Sonata', customerId: 1006 }
    ];
    
    const statuses = ['completed', 'in-progress', 'pending'];
    const inspectionIds = [];
    
    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      const mechanicId = mechanicIds[i % mechanicIds.length];
      const status = statuses[i % statuses.length];
      const daysAgo = Math.floor(Math.random() * 30);
      
      const result = await pool.request()
        .input('VehicleVIN', sql.VarChar(50), vehicle.vin)
        .input('CustomerID', sql.Int, vehicle.customerId)
        .input('MechanicID', sql.Int, mechanicId)
        .input('Status', sql.VarChar(20), status)
        .input('DaysAgo', sql.Int, daysAgo)
        .input('Notes', sql.VarChar(sql.MAX), `Sample inspection for ${vehicle.type}`)
        .query(`
          INSERT INTO ESTMTEHDR (VehicleVIN, CustomerID, InspectionDate, MechanicID, Status, Notes, CreatedAt, UpdatedAt)
          VALUES (@VehicleVIN, @CustomerID, DATEADD(DAY, -@DaysAgo, GETDATE()), @MechanicID, @Status, @Notes, 
                  DATEADD(DAY, -@DaysAgo, GETDATE()), DATEADD(DAY, -@DaysAgo, GETDATE()));
          SELECT SCOPE_IDENTITY() AS EstimateID;
        `);
      
      inspectionIds.push(result.recordset[0].EstimateID);
    }
    
    console.log('✅ Inspections seeded');
    
    // Seed Line Items
    const inspectionItems = [
      // Exterior items
      { type: 'Exterior', desc: 'Body Condition', severities: ['good', 'warning', 'critical'], costs: [0, 150, 500] },
      { type: 'Exterior', desc: 'Paint Quality', severities: ['good', 'warning', 'critical'], costs: [0, 200, 800] },
      { type: 'Exterior', desc: 'Glass & Mirrors', severities: ['good', 'warning', 'critical'], costs: [0, 100, 300] },
      { type: 'Exterior', desc: 'Lights', severities: ['good', 'warning', 'critical'], costs: [0, 50, 150] },
      { type: 'Exterior', desc: 'Wheels & Tires', severities: ['good', 'warning', 'critical'], costs: [0, 400, 1200] },
      
      // Interior items
      { type: 'Interior', desc: 'Seats & Upholstery', severities: ['good', 'warning', 'critical'], costs: [0, 100, 500] },
      { type: 'Interior', desc: 'Dashboard', severities: ['good', 'warning', 'critical'], costs: [0, 50, 200] },
      { type: 'Interior', desc: 'Controls', severities: ['good', 'warning', 'critical'], costs: [0, 75, 250] },
      { type: 'Interior', desc: 'Electronics', severities: ['good', 'warning', 'critical'], costs: [0, 150, 600] },
      
      // Engine items
      { type: 'Engine', desc: 'Oil Level', severities: ['good', 'warning', 'critical'], costs: [0, 50, 100] },
      { type: 'Engine', desc: 'Fluids', severities: ['good', 'warning', 'critical'], costs: [0, 75, 200] },
      { type: 'Engine', desc: 'Belts & Hoses', severities: ['good', 'warning', 'critical'], costs: [0, 150, 400] },
      { type: 'Engine', desc: 'Battery', severities: ['good', 'warning', 'critical'], costs: [0, 150, 200] },
      
      // Undercarriage items
      { type: 'Undercarriage', desc: 'Suspension', severities: ['good', 'warning', 'critical'], costs: [0, 500, 1500] },
      { type: 'Undercarriage', desc: 'Exhaust', severities: ['good', 'warning', 'critical'], costs: [0, 200, 800] },
      { type: 'Undercarriage', desc: 'Brakes', severities: ['good', 'warning', 'critical'], costs: [0, 300, 900] },
      { type: 'Undercarriage', desc: 'Frame', severities: ['good', 'warning', 'critical'], costs: [0, 0, 2000] }
    ];
    
    for (const inspectionId of inspectionIds) {
      // Add 5-10 random line items per inspection
      const itemCount = 5 + Math.floor(Math.random() * 6);
      const selectedItems = [...inspectionItems].sort(() => 0.5 - Math.random()).slice(0, itemCount);
      
      for (const item of selectedItems) {
        const severityIndex = Math.floor(Math.random() * 3);
        const severity = item.severities[severityIndex];
        const cost = item.costs[severityIndex];
        const status = severity === 'good' ? 'passed' : severity === 'warning' ? 'attention' : 'failed';
        
        await pool.request()
          .input('EstimateID', sql.Int, inspectionId)
          .input('ItemType', sql.VarChar(50), item.type)
          .input('Description', sql.VarChar(500), item.desc)
          .input('Severity', sql.VarChar(20), severity)
          .input('Cost', sql.Decimal(10, 2), cost)
          .input('Status', sql.VarChar(20), status)
          .input('Notes', sql.VarChar(sql.MAX), `Inspection notes for ${item.desc}`)
          .query(`
            INSERT INTO LINEITEM (EstimateID, ItemType, Description, Severity, Cost, Status, Notes)
            VALUES (@EstimateID, @ItemType, @Description, @Severity, @Cost, @Status, @Notes);
          `);
      }
    }
    
    console.log('✅ Line items seeded');
    
    // Update inspection totals
    await pool.request().query(`
      UPDATE ESTMTEHDR
      SET TotalAmount = (
        SELECT ISNULL(SUM(Cost), 0)
        FROM LINEITEM
        WHERE LINEITEM.EstimateID = ESTMTEHDR.EstimateID
      )
    `);
    
    console.log('✅ Inspection totals updated');
    
    await pool.close();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📧 Login credentials:');
    console.log('   Admin: admin@vastoffice.com / admin123');
    console.log('   Mechanics: [email] / password123');
    console.log('   - john.smith@vastoffice.com');
    console.log('   - sarah.johnson@vastoffice.com');
    console.log('   - mike.davis@vastoffice.com');
    console.log('   - lisa.anderson@vastoffice.com');
    console.log('   - robert.wilson@vastoffice.com');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();