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
  | 'correction_needed'
  | 'rejected'
  | 'approved'
  | 'admit_card_ready'
  | 'admitted';

export interface PersonalInfo {
  fullName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  category: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';
  bloodGroup?: string;
  aadhaarNumber: string;
  nationality: string;
  religion: string;
  whatsappNumber?: string;
  candidateEmail?: string;
  candidateMobile?: string;
}

export interface ParentInfo {
  fatherName: string;
  fatherOccupation: string;
  fatherPhone: string;
  motherName: string;
  motherOccupation: string;
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

export interface AcademicInfo {
  applyingClass: 'Class 5' | 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 11 Science' | 'Class 11 Commerce' | 'Class 11 Arts' | 'Class 11 NDA Wing';
  mediumOfInstruction: 'Hindi' | 'English';
  previousSchoolName: string;
  previousBoard: string;
  previousClassMarksPercentage: string;
  passingYear: string;
}

export interface ExamCentrePref {
  preferredCenter1: string;
  preferredCenter2: string;
}

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
  personalInfo: PersonalInfo;
  parentInfo: ParentInfo;
  addressInfo: AddressInfo;
  academicInfo: AcademicInfo;
  examCentrePref: ExamCentrePref;
  documents: DocumentUploads;
  status: ApplicationStatus;
  remarks?: string;
  currentStep?: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  amountPaid?: number;
  transactionId?: string;
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
  classApplying: string;
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
  academicSession: string;
  applicationFee: number;
  registrationStartDate: string;
  registrationEndDate: string;
  admitCardReleaseDate: string;
  entranceExamDate: string;
  resultDeclarationDate: string;
  counselingStartDate: string;
  helplinePhone: string;
  helplineEmail: string;
}
