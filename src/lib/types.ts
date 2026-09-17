export type UserRole = 'applicant' | 'admin' | 'verifier' | 'accounts';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  registrationNumber?: string;
  createdAt: string;
}

export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'correction_needed'
  | 'admit_card_ready'
  | 'admitted'
  | 'rejected';

export interface PersonalInfo {
  fullName: string;
  dob: string;
  gender: 'Male' | 'Female';
  category: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';
  aadhaarNumber: string;
  panNumber?: string;
  familyId?: string;
  previousSchoolName?: string;
  previousBoard?: string;
  otherBoard?: string;
  nationality?: string;
  religion?: string;
  whatsappNumber?: string;
  candidateEmail?: string;
  candidateMobile?: string;
  email?: string;
  bloodGroup?: string;
}

export interface ParentInfo {
  fatherName: string;
  fatherOccupation?: string;
  fatherPhone: string;
  motherName: string;
  motherOccupation?: string;
  motherPhone?: string;
  annualIncome: string;
  guardianName?: string;
  guardianRelation?: string;
}

export interface AddressInfo {
  streetAddress: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  whatsappNumber: string;
  alternatePhone?: string;
}

export type EligibleClass = 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 11' | '6' | '7' | '8' | '9' | '11';
export type Class11Stream = 'Non Medical' | 'Medical' | 'Commerce' | 'Arts';

export interface AcademicInfo {
  applyingClass: EligibleClass;
  stream?: Class11Stream;
  previousSchoolName?: string;
  previousBoard?: string;
  otherBoard?: string;
  mediumOfInstruction?: string;
  previousClassMarksPercentage?: string;
  passingYear?: string;
}

export interface StudyLocationPref {
  firstPreference?: string;
  secondPreference?: string;
  preferredCenter1?: string;
  preferredCenter2?: string;
}

// Alias for backwards compatibility
export type ExamCentrePref = StudyLocationPref;

export interface DocumentUploads {
  photo?: string;
  signature?: string;
  parentSignature?: string;
  aadhaarCard?: string;
  lastMarksheet?: string;
}

export interface Application {
  id: string;
  registrationNumber: string;
  applicationNumber: string; // Alias for registrationNumber
  rollNumber?: string; // Strictly allotted later per admin exam logic
  userId: string;
  classApplying: string;
  stream?: string;
  personalInfo: PersonalInfo;
  parentInfo: ParentInfo;
  addressInfo: AddressInfo;
  academicInfo: AcademicInfo;
  studyLocationPref?: StudyLocationPref;
  studyLocation?: StudyLocationPref;
  examCentrePref?: StudyLocationPref;
  documents: DocumentUploads;
  status: ApplicationStatus;
  remarks?: string;
  currentStep?: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  amountPaid?: number;
  transactionId?: string;
  paymentInfo?: {
    transactionId?: string;
    amount?: number;
    date?: string;
    paidAt?: string;
    method?: string;
    orderId?: string;
    paymentId?: string;
    status?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdmitCard {
  id: string;
  applicationId: string;
  applicationNumber: string;
  rollNumber: string;
  candidateName: string;
  fatherName: string;
  motherName?: string;
  previousSchoolName?: string;
  aadhaarNumber?: string;
  address?: string;
  classApplying: string;
  stream?: string;
  examCentreName: string;
  examCentreAddress: string;
  examDate: string;
  reportingTime: string;
  examDuration: string;
  roomNumber: string;
  candidatePhotoUrl?: string;
  candidateSignatureUrl?: string;
  isReleased: boolean;
  instructions: string[];
  createdAt: string;
}

export interface SubjectMark {
  subject: string;
  maxMarks: number;
  marksObtained: number;
}

export interface ExamResult {
  id: string;
  applicationId: string;
  applicationNumber: string;
  rollNumber: string;
  candidateName: string;
  classApplying: string;
  subjects: SubjectMark[];
  totalMarks: number;
  maxTotalMarks: number;
  percentage: number;
  rank: number;
  qualifyingStatus: 'Qualified for Admission' | 'Waitlisted' | 'Not Qualified';
  counselingDate?: string;
  counselingVenue?: string;
  isPublished: boolean;
  remarks?: string;
  createdAt?: string;
}

export interface ExamCentre {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  capacity: number;
  address: string;
  contactPerson: string;
  contactPhone: string;
}

export interface SystemSettings {
  portalOpen: boolean;
  resultsDeclared: boolean;
  admitCardsReleased?: boolean;
  admitCardsReleasedAt?: string;
  academicSession: string;
  applicationFee: number;
  registrationStartDate: string;
  registrationEndDate: string;
  admitCardReleaseDate: string;
  entranceExamDate: string;
  entranceExamTime?: string;
  examVenueName?: string;
  examVenueAddress?: string;
  resultDeclarationDate: string;
  counselingStartDate: string;
  helplinePhone: string;
  helplineEmail: string;
}

export type AdminNotificationType =
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_STATUS_CHANGED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'CORRECTION_REQUIRED'
  | 'CONTACT_ENQUIRY'
  | 'ADMIN_UPDATE';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  entityId?: string;
  entityType?: 'application' | 'enquiry' | 'user' | 'system';
  link?: string;
  isRead: boolean;
  metadata?: {
    candidateName?: string;
    applicationNumber?: string;
    classApplying?: string;
    email?: string;
    phone?: string;
    rejectionReason?: string;
    remarks?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export type ContactEnquiryStatus = 'new' | 'read' | 'in_progress' | 'resolved';

export interface ContactEnquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  applicationNumber?: string;
  source: 'public_contact' | 'candidate_grievance';
  status: ContactEnquiryStatus;
  adminRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

