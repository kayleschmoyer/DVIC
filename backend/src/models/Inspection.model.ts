// models/Inspection.model.ts

// Main inspection/estimate header
export interface Inspection {
    EstimateID: number;
    VehicleVIN: string;
    CustomerID: number;
    InspectionDate: Date;
    MechanicID: number;
    Status: 'pending' | 'in-progress' | 'completed';
    TotalAmount: number;
    Notes?: string;
    CreatedAt: Date;
    UpdatedAt: Date;
    // Additional fields from joins
    MechanicName?: string;
  }
  
  // Line items for each inspection
  export interface LineItem {
    LineItemID: number;
    EstimateID: number;
    ItemType: string;
    Description: string;
    Severity: 'good' | 'warning' | 'critical';
    Cost: number;
    Photos?: string; // JSON string array of photo filenames
    Status: 'passed' | 'attention' | 'failed';
    Notes?: string;
    CreatedAt?: Date;
  }
  
  // Mechanic/technician
  export interface Mechanic {
    MechanicID: number;
    Name: string;
    Email: string;
    PasswordHash?: string;
    Phone?: string;
    Certifications?: string;
    Role?: 'mechanic' | 'admin' | 'supervisor';
    Active: boolean;
    CreatedAt: Date;
    // Statistics fields (from joins)
    TotalInspections?: number;
    CompletedInspections?: number;
  }
  
  // Customer (for future expansion)
  export interface Customer {
    CustomerID: number;
    Name: string;
    Email: string;
    Phone: string;
    Address?: string;
    CreatedAt: Date;
  }
  
  // Vehicle (for future expansion)
  export interface Vehicle {
    VehicleID: number;
    VIN: string;
    Make: string;
    Model: string;
    Year: number;
    Color?: string;
    Mileage?: number;
    CustomerID: number;
  }
  
  // DTOs (Data Transfer Objects) for API requests/responses
  
  export interface CreateInspectionDTO {
    VehicleVIN: string;
    CustomerID: number;
    MechanicID?: number;
    Notes?: string;
  }
  
  export interface UpdateInspectionDTO {
    Status?: 'pending' | 'in-progress' | 'completed';
    TotalAmount?: number;
    Notes?: string;
  }
  
  export interface CreateLineItemDTO {
    ItemType: string;
    Description: string;
    Severity: 'good' | 'warning' | 'critical';
    Cost?: number;
    Status: 'passed' | 'attention' | 'failed';
    Notes?: string;
    Photos?: string;
  }
  
  export interface UpdateLineItemDTO {
    ItemType?: string;
    Description?: string;
    Severity?: 'good' | 'warning' | 'critical';
    Cost?: number;
    Status?: 'passed' | 'attention' | 'failed';
    Notes?: string;
  }
  
  export interface InspectionFilters {
    status?: 'pending' | 'in-progress' | 'completed';
    mechanicId?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
  
  export interface InspectionStats {
    totalInspections: number;
    completedInspections: number;
    inProgressInspections: number;
    pendingInspections: number;
    avgCompletionTime: number; // in minutes
    dailyInspections: number;
    weeklyInspections: number;
    monthlyInspections: number;
    totalRevenue: number;
    avgInspectionValue: number;
    severityDistribution: {
      severity: string;
      count: number;
    }[];
  }
  
  export interface InspectionReport {
    inspection: Inspection;
    lineItems: LineItem[];
    summary: {
      totalItems: number;
      passedItems: number;
      attentionItems: number;
      failedItems: number;
      totalCost: number;
    };
    generatedAt: string;
  }
  
  // Authentication models
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface RegisterData {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }
  
  export interface AuthResponse {
    token: string;
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
    };
  }
  
  // Pagination response wrapper
  export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages?: number;
    };
  }
  
  // Generic API response
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }
  
  // Socket.io event types
  export interface SocketEvents {
    'inspection-created': {
      inspectionId: number;
      mechanicId: number;
      vehicleVIN: string;
    };
    'inspection-updated': {
      inspectionId: number;
      updates: UpdateInspectionDTO;
    };
    'inspection-completed': {
      inspectionId: number;
      inspection: Inspection;
    };
    'lineitem-added': {
      inspectionId: number;
      lineItemId: number;
      lineItem: LineItem;
    };
    'lineitem-updated': {
      inspectionId: number;
      lineItemId: number;
      updates: UpdateLineItemDTO;
    };
    'lineitem-deleted': {
      inspectionId: number;
      lineItemId: number;
    };
  }
  
  // Enums for better type safety
  export enum InspectionStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed'
  }
  
  export enum Severity {
    GOOD = 'good',
    WARNING = 'warning',
    CRITICAL = 'critical'
  }
  
  export enum ItemStatus {
    PASSED = 'passed',
    ATTENTION = 'attention',
    FAILED = 'failed'
  }
  
  export enum UserRole {
    MECHANIC = 'mechanic',
    ADMIN = 'admin',
    SUPERVISOR = 'supervisor'
  }
  
  // Type guards
  export function isInspection(obj: any): obj is Inspection {
    return obj && 
      typeof obj.EstimateID === 'number' &&
      typeof obj.VehicleVIN === 'string' &&
      typeof obj.Status === 'string';
  }
  
  export function isLineItem(obj: any): obj is LineItem {
    return obj &&
      typeof obj.LineItemID === 'number' &&
      typeof obj.EstimateID === 'number' &&
      typeof obj.ItemType === 'string';
  }
  
  // Export everything
  export default {
    InspectionStatus,
    Severity,
    ItemStatus,
    UserRole
  };