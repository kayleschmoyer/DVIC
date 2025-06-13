import sql from 'mssql';
import { config } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

const runMigration = async () => {
  try {
    console.log('🚀 Starting database migration...');
    
    const pool = await sql.connect(config);
    
    // Create database if not exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'Vastoffice')
      BEGIN
        CREATE DATABASE Vastoffice;
      END
    `);
    
    console.log('✅ Database created/verified');
    
    // Switch to Vastoffice database
    await pool.close();
    const newConfig = { ...config, database: 'Vastoffice' };
    const newPool = await sql.connect(newConfig);
    
    // Create MECHANIC table
    await newPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MECHANIC' AND xtype='U')
      BEGIN
        CREATE TABLE MECHANIC (
          MechanicID INT IDENTITY(1,1) PRIMARY KEY,
          Name NVARCHAR(100) NOT NULL,
          Email NVARCHAR(100) UNIQUE NOT NULL,
          PasswordHash NVARCHAR(255),
          Phone NVARCHAR(20),
          Certifications NVARCHAR(MAX),
          Role NVARCHAR(50) DEFAULT 'mechanic',
          Active BIT DEFAULT 1,
          CreatedAt DATETIME DEFAULT GETDATE()
        );
      END
    `);
    
    console.log('✅ MECHANIC table created/verified');
    
    // Create ESTMTEHDR table
    await newPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ESTMTEHDR' AND xtype='U')
      BEGIN
        CREATE TABLE ESTMTEHDR (
          EstimateID INT IDENTITY(1,1) PRIMARY KEY,
          VehicleVIN NVARCHAR(50) NOT NULL,
          CustomerID INT,
          InspectionDate DATETIME NOT NULL DEFAULT GETDATE(),
          MechanicID INT FOREIGN KEY REFERENCES MECHANIC(MechanicID),
          Status NVARCHAR(20) DEFAULT 'pending' CHECK (Status IN ('pending', 'in-progress', 'completed')),
          TotalAmount DECIMAL(10,2) DEFAULT 0,
          Notes NVARCHAR(MAX),
          CreatedAt DATETIME DEFAULT GETDATE(),
          UpdatedAt DATETIME DEFAULT GETDATE()
        );
      END
    `);
    
    console.log('✅ ESTMTEHDR table created/verified');
    
    // Create LINEITEM table
    await newPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LINEITEM' AND xtype='U')
      BEGIN
        CREATE TABLE LINEITEM (
          LineItemID INT IDENTITY(1,1) PRIMARY KEY,
          EstimateID INT FOREIGN KEY REFERENCES ESTMTEHDR(EstimateID) ON DELETE CASCADE,
          ItemType NVARCHAR(50) NOT NULL,
          Description NVARCHAR(500) NOT NULL,
          Severity NVARCHAR(20) CHECK (Severity IN ('good', 'warning', 'critical')),
          Cost DECIMAL(10,2) DEFAULT 0,
          Photos NVARCHAR(MAX),
          Status NVARCHAR(20) CHECK (Status IN ('passed', 'attention', 'failed')),
          Notes NVARCHAR(MAX),
          CreatedAt DATETIME DEFAULT GETDATE()
        );
      END
    `);
    
    console.log('✅ LINEITEM table created/verified');
    
    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS IX_ESTMTEHDR_VehicleVIN ON ESTMTEHDR(VehicleVIN);',
      'CREATE INDEX IF NOT EXISTS IX_ESTMTEHDR_MechanicID ON ESTMTEHDR(MechanicID);',
      'CREATE INDEX IF NOT EXISTS IX_ESTMTEHDR_Status ON ESTMTEHDR(Status);',
      'CREATE INDEX IF NOT EXISTS IX_ESTMTEHDR_InspectionDate ON ESTMTEHDR(InspectionDate);',
      'CREATE INDEX IF NOT EXISTS IX_LINEITEM_EstimateID ON LINEITEM(EstimateID);',
      'CREATE INDEX IF NOT EXISTS IX_LINEITEM_Severity ON LINEITEM(Severity);'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await newPool.request().query(indexQuery.replace('IF NOT EXISTS ', ''));
      } catch (err) {
        // Index might already exist
      }
    }
    
    console.log('✅ Indexes created/verified');
    
    // Add column if missing (for password support)
    await newPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MECHANIC') AND name = 'PasswordHash')
      BEGIN
        ALTER TABLE MECHANIC ADD PasswordHash NVARCHAR(255);
      END
    `);
    
    await newPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MECHANIC') AND name = 'Role')
      BEGIN
        ALTER TABLE MECHANIC ADD Role NVARCHAR(50) DEFAULT 'mechanic';
      END
    `);
    
    console.log('✅ Additional columns added/verified');
    
    // Create default admin user
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await newPool.request()
      .input('Name', sql.NVarChar(100), 'Admin User')
      .input('Email', sql.VarChar(100), 'admin@vastoffice.com')
      .input('PasswordHash', sql.VarChar(255), adminPassword)
      .input('Role', sql.VarChar(50), 'admin')
      .query(`
        IF NOT EXISTS (SELECT * FROM MECHANIC WHERE Email = 'admin@vastoffice.com')
        BEGIN
          INSERT INTO MECHANIC (Name, Email, PasswordHash, Role, Active)
          VALUES (@Name, @Email, @PasswordHash, @Role, 1);
        END
      `);
    
    console.log('✅ Default admin user created');
    console.log('   Email: admin@vastoffice.com');
    console.log('   Password: admin123');
    
    await newPool.close();
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
runMigration();