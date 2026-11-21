export type Sex = "Unknown" | "Male" | "Female" | "Other";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type MissingCategory = "Absent" | "Missing";
export type EpisodeStatus = "Reported" | "Active" | "Located" | "Closed";
export type ReviewStatus = "NotScheduled" | "OnTrack" | "DueSoon" | "Overdue";
export type CaseTaskStatus = "Open" | "InProgress" | "Completed" | "Cancelled";
export type TaskCategory =
  | "Enquiry" | "HouseToHouse" | "Cctv" | "SocialMedia" | "Hospital"
  | "School" | "Transport" | "Digital" | "Forensic" | "Other";
export type TaskPriority = "Low" | "Normal" | "High" | "Urgent";
export type PlaceCategory =
  | "Home" | "Family" | "Friend" | "Work" | "School" | "Healthcare"
  | "Social" | "Transport" | "Other";
export type SearchPriority = "Low" | "Normal" | "High";
export type NoteCategory =
  | "General" | "Background" | "Family" | "Health" | "Risk" | "Intelligence" | "Exploitation";
export type IfindCategory =
  | "Health" | "Transport" | "Waterways" | "Associates" | "Digital" | "Cctv"
  | "Education" | "Retail" | "Exploitation" | "Environment" | "Media" | "Other";
export type IfindStatus = "NotStarted" | "InProgress" | "Done" | "NotApplicable";
export type CawnStatus = "Active" | "Expired" | "Revoked";
export type OutcomeType =
  | "LocatedSafe" | "ReturnedVoluntarily" | "FoundDeceased" | "Arrested" | "NotLocated";
export type OfficerRole = "Officer" | "Supervisor" | "Administrator";

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OfficerProfile {
  id: string;
  email: string;
  displayName: string;
  rank: string;
  collarNumber: string;
  role: OfficerRole;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
}

export interface OfficerSummary {
  id: string;
  displayName: string;
  rank: string;
  collarNumber: string;
  role: OfficerRole;
}

export interface OfficerListDto {
  items: OfficerSummary[];
}

export interface TenantLookup {
  id: string;
  code: string;
  name: string;
}

export interface PersonSummary {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  age: number | null;
  sex: Sex;
  isRepeatMissing: boolean;
  episodeCount: number;
  latestStatus: EpisodeStatus | null;
  latestRisk: RiskLevel | null;
  latestReportedAt: string | null;
  primaryImageId: string | null;
}

export interface Vulnerability {
  isLookedAfterChild: boolean;
  hasLearningDifficulty: boolean;
  hasMentalHealthConcerns: boolean;
  isKnownSubstanceUser: boolean;
  isAtRiskOfExploitation: boolean;
  summary: string | null;
}

export interface Associate {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isSignificantRisk: boolean;
  createdAt: string;
}

export interface Place {
  id: string;
  label: string;
  category: PlaceCategory;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  searchPriority: SearchPriority;
  notes: string | null;
  createdAt: string;
}

export interface Note {
  id: string;
  episodeId: string | null;
  category: NoteCategory;
  title: string;
  body: string;
  isSensitive: boolean;
  createdByOfficerId: string;
  createdAt: string;
}

export interface ImageRecord {
  id: string;
  episodeId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  caption: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface PersonDetail {
  id: string;
  firstName: string;
  middleNames: string | null;
  lastName: string;
  fullName: string;
  dateOfBirth: string | null;
  age: number | null;
  sex: Sex;
  ethnicity: string | null;
  nationality: string | null;
  languages: string | null;
  heightCm: number | null;
  build: string | null;
  hairColour: string | null;
  eyeColour: string | null;
  distinguishingFeatures: string | null;
  description: string | null;
  isRepeatMissing: boolean;
  vulnerabilities: Vulnerability;
  createdAt: string;
  associates: Associate[];
  placesOfInterest: Place[];
  notes: Note[];
  images: ImageRecord[];
  episodes: CaseSummary[];
}

export interface CaseSummary {
  id: string;
  caseNumber: string;
  personId: string;
  personName: string;
  personAge: number | null;
  sex: Sex;
  status: EpisodeStatus;
  category: MissingCategory;
  riskLevel: RiskLevel;
  reviewStatus: ReviewStatus;
  nextReviewDueAt: string | null;
  reportedAt: string;
  lastSeenLocation: string | null;
  isRepeat: boolean;
  isChild: boolean;
  primaryImageId: string | null;
  openTaskCount: number;
}

export interface CaseTask {
  id: string;
  episodeId: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: CaseTaskStatus;
  assignedToOfficerId: string | null;
  dueAt: string | null;
  completedAt: string | null;
  completedByOfficerId: string | null;
  outcome: string | null;
  placeOfInterestId: string | null;
  associateId: string | null;
  locationText: string | null;
  createdByOfficerId: string;
  createdAt: string;
}

export interface TaskDuplicateMatch {
  taskId: string;
  title: string;
  status: CaseTaskStatus;
  similarity: number;
  distance: number;
  locationText: string | null;
}

export interface Review {
  id: string;
  reviewedByOfficerId: string;
  reviewedAt: string;
  riskLevelAtReview: RiskLevel;
  notes: string;
  nextReviewDueAt: string;
}

export interface AuditEntry {
  id: string;
  actorOfficerId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  occurredAt: string;
}

export interface IfindEntry {
  id: string;
  ifindItemId: string | null;
  title: string;
  category: IfindCategory;
  status: IfindStatus;
  notes: string | null;
  addedByOfficerId: string;
  completedByOfficerId: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface IfindItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: IfindCategory;
  appliesToChildren: boolean;
  appliesToAdults: boolean;
  minimumRisk: RiskLevel;
  guidance: string | null;
}

export interface CaseDetail {
  id: string;
  caseNumber: string;
  person: PersonDetail;
  isRepeatAtReport: boolean;
  status: EpisodeStatus;
  category: MissingCategory;
  riskLevel: RiskLevel;
  reportedAt: string;
  reportedByOfficerId: string;
  assignedOfficerId: string | null;
  circumstances: string;
  lastSeenAt: string | null;
  lastSeenLocation: string | null;
  lastSeenWearing: string | null;
  lastSeenWith: string | null;
  isChildAtReport: boolean;
  localAuthorityNotified: boolean;
  localAuthorityNotifiedAt: string | null;
  lastReviewedAt: string | null;
  nextReviewDueAt: string | null;
  reviewStatus: ReviewStatus;
  locatedAt: string | null;
  locatedLocation: string | null;
  outcome: OutcomeType | null;
  closedAt: string | null;
  closureNotes: string | null;
  tasks: CaseTask[];
  reviews: Review[];
  ifind: IfindEntry[];
  notes: Note[];
  audit: AuditEntry[];
}

export interface CountByRisk { risk: RiskLevel; count: number }
export interface CountByStatus { status: EpisodeStatus; count: number }
export interface OutcomeCount { outcome: OutcomeType; count: number }
export interface MonthlyCount { month: string; reported: number; located: number }
export interface LocationHotspot { location: string; caseCount: number; repeatCount: number; childCount: number }

export interface RepeatPerson {
  personId: string;
  fullName: string;
  age: number | null;
  episodeCount: number;
  lastReportedAt: string;
  latestLocation: string | null;
  latestRisk: RiskLevel;
}

export interface DashboardStats {
  activeCases: number;
  highRiskCases: number;
  overdueReviews: number;
  dueSoonReviews: number;
  childrenMissing: number;
  repeatMissingPersons: number;
  openTasks: number;
  reportedLast30Days: number;
}

export interface Dashboard {
  stats: DashboardStats;
  reviewQueue: CaseSummary[];
  recentCases: CaseSummary[];
  riskBreakdown: CountByRisk[];
  statusBreakdown: CountByStatus[];
  topLocations: LocationHotspot[];
  repeatPersons: RepeatPerson[];
  generatedAt: string;
}

export interface ReportStats {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  locatedCases: number;
  childCases: number;
  repeatPersons: number;
  repeatCases: number;
  riskBreakdown: CountByRisk[];
  statusBreakdown: CountByStatus[];
  outcomes: OutcomeCount[];
  monthlyTrend: MonthlyCount[];
  generatedAt: string;
}

export interface ReportsOverview {
  stats: ReportStats;
  repeatPersons: RepeatPerson[];
  locations: LocationHotspot[];
}

export interface Cawn {
  id: string;
  reference: string;
  childPersonId: string;
  childName: string;
  subjectAssociateId: string | null;
  subjectName: string;
  subjectDateOfBirth: string | null;
  issuedAt: string;
  expiresAt: string;
  status: CawnStatus;
  reason: string;
  issuedByOfficerId: string;
  revokedAt: string | null;
  revocationReason: string | null;
}

export interface IntelligenceReport {
  person: PersonDetail;
  riskFactors: string[];
  keyLocations: Place[];
  keyPeople: Associate[];
  intelligence: Note[];
  episodes: CaseSummary[];
  searchConsiderations: string[];
  generatedAt: string;
}

export interface ApiProblem {
  title?: string;
  status?: number;
  detail?: string;
  duplicates?: TaskDuplicateMatch[];
}
