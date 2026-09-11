import type {
  ActivityType,
  ExportFormat,
  ImportStatus,
  ProjectStatus,
  UserRole,
} from "./database";

export type {
  ActivityType,
  ExportFormat,
  ImportStatus,
  ProjectStatus,
  UserRole,
};

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  region: string | null;
  isActive: boolean;
};

export type Client = {
  id: string;
  ownerId: string;
  name: string;
  industrySegment: string;
  plantName: string | null;
  city: string | null;
  country: string | null;
  contactName: string | null;
  contactPosition: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  currentCompetitor: string | null;
  annualPotentialUsd: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  ownerId: string;
  clientId: string;
  name: string;
  industrySegment: string;
  coatingType: string;
  status: ProjectStatus;
  estimatedValue: number;
  currency: string;
  winProbability: number;
  estimatedCloseDate: string | null;
  competitor: string | null;
  technicalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectWithClient = Project & {
  clientName: string;
};

export type Activity = {
  id: string;
  ownerId: string;
  clientId: string | null;
  projectId: string | null;
  activityType: ActivityType;
  activityDate: string;
  result: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityWithRelations = Activity & {
  clientName: string | null;
  projectName: string | null;
  ownerName: string;
};

export type ImportRecord = {
  id: string;
  importedBy: string;
  fileName: string;
  entity: string;
  status: ImportStatus;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorLog: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type ExportRecord = {
  id: string;
  ownerId: string;
  format: ExportFormat;
  entity: string;
  recordCount: number;
  createdAt: string;
};

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };
