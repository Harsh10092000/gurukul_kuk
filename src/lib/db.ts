import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { 
  User, 
  Application, 
  AdmitCard, 
  ExamResult, 
  ExamCentre, 
  SystemSettings,
  AdminNotification,
  ContactEnquiry,
  ContactEnquiryStatus
} from './types';

// Default configuration from environment
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gurukul_entrance',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool: mysql.Pool | null = null;
let useFallbackStorage = false;

// Local fallback store file path
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'gurukul_store.json');

// In-memory / JSON fallback store structure
interface FallbackStore {
  users: User[];
  applications: Application[];
  admitCards: AdmitCard[];
  results: ExamResult[];
  examCentres: ExamCentre[];
  settings: SystemSettings;
  notifications?: AdminNotification[];
  enquiries?: ContactEnquiry[];
}

const DEFAULT_SETTINGS: SystemSettings = {
  portalOpen: true,
  resultsDeclared: false,
  academicSession: '2026-2027',
  applicationFee: 1200,
  registrationStartDate: '2026-09-01',
  registrationEndDate: '2026-10-31',
  admitCardReleaseDate: '2026-11-15',
  entranceExamDate: '2026-12-06',
  resultDeclarationDate: '2026-12-20',
  counselingStartDate: '2027-01-05',
  helplinePhone: '+91-1744-259114 / +91-9896328329',
  helplineEmail: 'admissions@gurukulkurukshetra.com',
};

const DEFAULT_CENTRES: ExamCentre[] = [
  {
    id: 'center-1',
    code: 'GK-01',
    name: 'Gurukul Kurukshetra Main Campus',
    city: 'Kurukshetra',
    state: 'Haryana',
    capacity: 2500,
    address: 'Near 3rd Gate, Kurukshetra University, Kurukshetra, Haryana - 136119',
    contactPerson: 'Exam Superintendent',
    contactPhone: '+91-1744-259114',
  },
  {
    id: 'center-2',
    code: 'GK-02',
    name: 'Arya Samaj Mandir Complex, Delhi NCR',
    city: 'New Delhi',
    state: 'Delhi',
    capacity: 1200,
    address: 'Hanuman Road, Connaught Place, New Delhi - 110001',
    contactPerson: 'Zonal Coordinator',
    contactPhone: '+91-9811002233',
  },
  {
    id: 'center-3',
    code: 'GK-03',
    name: 'DAV Senior Model School Centre',
    city: 'Chandigarh',
    state: 'Chandigarh (UT)',
    capacity: 800,
    address: 'Sector 15-A, Chandigarh - 160015',
    contactPerson: 'Regional Centre Head',
    contactPhone: '+91-9876543210',
  },
  {
    id: 'center-4',
    code: 'GK-04',
    name: 'Gurukul Rohtak Extension Center',
    city: 'Rohtak',
    state: 'Haryana',
    capacity: 900,
    address: 'Delhi Bypass Road, Rohtak, Haryana - 124001',
    contactPerson: 'Center Incharge',
    contactPhone: '+91-9416001122',
  },
];

function initFallbackFile(): FallbackStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(STORE_FILE)) {
    try {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      let changed = false;
      if (!parsed.notifications) {
        parsed.notifications = [];
        changed = true;
      }
      if (!parsed.enquiries) {
        parsed.enquiries = [];
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(STORE_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }
      return parsed;
    } catch (e) {
      console.error('Error reading fallback store, creating fresh one:', e);
    }
  }

  // Initial seed admin password: "Admin@Gurukul2026"
  const passwordHash = bcrypt.hashSync('Admin@Gurukul2026', 10);
  const applicantHash = bcrypt.hashSync('Student@123', 10);

  const initialStore: FallbackStore = {
    users: [
      {
        id: 'usr-admin-1',
        name: 'Principal / Exam Controller',
        email: 'admin@gurukulkurukshetra.com',
        phone: '+919896328329',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-student-demo',
        name: 'Aarav Sharma',
        email: 'aarav@example.com',
        phone: '+919876543210',
        role: 'applicant',
        registrationNumber: 'GK26-10001',
        createdAt: new Date().toISOString(),
      },
    ],
    applications: [
      {
        id: 'app-demo-1',
        registrationNumber: 'GK26-10001',
        applicationNumber: 'GK26-10001',
        rollNumber: undefined, // Roll number is strictly deferred per user instructions
        userId: 'usr-student-demo',
        classApplying: 'Class 6',
        personalInfo: {
          fullName: 'Aarav Sharma',
          dob: '2014-07-15',
          gender: 'Male',
          category: 'General',
          bloodGroup: 'B+',
          aadhaarNumber: '4839-2049-1928',
          nationality: 'Indian',
          religion: 'Hindu',
        },
        parentInfo: {
          fatherName: 'Dr. Rajesh Sharma',
          fatherOccupation: 'Professor',
          fatherPhone: '+919876543210',
          motherName: 'Sunita Sharma',
          motherOccupation: 'Teacher',
          annualIncome: '8,50,000',
        },
        addressInfo: {
          streetAddress: 'House No. 142, Model Town',
          city: 'Karnal',
          district: 'Karnal',
          state: 'Haryana',
          pincode: '132001',
          whatsappNumber: '+919876543210',
        },
        academicInfo: {
          applyingClass: 'Class 6',
          mediumOfInstruction: 'English',
          previousSchoolName: 'Tagore Bal Niketan',
          previousBoard: 'CBSE',
          previousClassMarksPercentage: '92%',
          passingYear: '2025',
        },
        examCentrePref: {
          preferredCenter1: 'Gurukul Kurukshetra Main Campus',
          preferredCenter2: 'Arya Samaj Mandir Complex, Delhi NCR',
        },
        documents: {
          photo: '/logo-gurukul.png',
          signature: '/logo-gurukul.png',
        },
        status: 'approved',
        paymentStatus: 'completed',
        amountPaid: 1200,
        transactionId: 'TXN_GK_DEMO_99812',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    admitCards: [
      {
        id: 'admit-demo-1',
        applicationId: 'app-demo-1',
        applicationNumber: 'GK-2026-1001',
        rollNumber: '2606001',
        candidateName: 'Aarav Sharma',
        fatherName: 'Dr. Rajesh Sharma',
        classApplying: 'Class 6',
        examCentreName: 'Gurukul Kurukshetra Main Campus',
        examCentreAddress: 'Near 3rd Gate, Kurukshetra University, Kurukshetra, Haryana - 136119',
        examDate: '06 December 2026',
        reportingTime: '08:30 AM',
        examDuration: '10:00 AM to 12:30 PM (2.5 Hours)',
        roomNumber: 'Hall-A, Desk 14',
        candidatePhotoUrl: '/logo-gurukul.png',
        isReleased: true,
        instructions: [
          'Bring printed copy of this Admit Card along with valid Aadhaar Card.',
          'Candidates must arrive at least 45 minutes prior to the examination time.',
          'Electronic gadgets, smart watches, and calculators are strictly prohibited.',
          'Blue/Black ballpoint pens only to be used for OMR / answer sheets.',
        ],
        createdAt: new Date().toISOString(),
      },
    ],
    results: [
      {
        id: 'res-demo-1',
        applicationId: 'app-demo-1',
        applicationNumber: 'GK-2026-1001',
        rollNumber: '2606001',
        candidateName: 'Aarav Sharma',
        classApplying: 'Class 6',
        subjects: [
          { subject: 'Mathematics', maxMarks: 50, marksObtained: 46 },
          { subject: 'Science', maxMarks: 50, marksObtained: 44 },
          { subject: 'English & Hindi', maxMarks: 50, marksObtained: 42 },
          { subject: 'Sanskrit & General Knowledge', maxMarks: 50, marksObtained: 45 },
        ],
        totalMarks: 177,
        maxTotalMarks: 200,
        percentage: 88.5,
        rank: 14,
        qualifyingStatus: 'Qualified for Admission',
        counselingDate: '10 January 2027 at 10:00 AM',
        counselingVenue: 'Main Administrative Block, Gurukul Kurukshetra',
        isPublished: true,
        remarks: 'Excellent performance. Selected in First Merit List.',
      },
    ],
    examCentres: DEFAULT_CENTRES,
    settings: DEFAULT_SETTINGS,
    notifications: [],
    enquiries: [],
  };

  saveFallbackStore(initialStore);
  return initialStore;
}

function saveFallbackStore(store: FallbackStore) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write to fallback store:', e);
  }
}

/**
 * Initialize Database tables in MySQL or initialize fallback JSON store
 */
export async function initDatabase(): Promise<void> {
  try {
    // 1. First attempt to connect to MySQL server
    const connection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
    });

    // Create database if it does not exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`;`);
    await connection.end();

    // Create connection pool
    pool = mysql.createPool(DB_CONFIG);

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(32) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('applicant', 'admin', 'verifier', 'accounts') DEFAULT 'applicant',
        registration_number VARCHAR(64),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(64) PRIMARY KEY,
        application_number VARCHAR(64) UNIQUE NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        class_applying VARCHAR(64) NOT NULL,
        personal_info JSON NOT NULL,
        parent_info JSON NOT NULL,
        address_info JSON NOT NULL,
        academic_info JSON NOT NULL,
        exam_centre_pref JSON NOT NULL,
        documents JSON,
        status ENUM('draft', 'submitted', 'under_review', 'correction_needed', 'rejected', 'approved', 'admit_card_ready', 'admitted') DEFAULT 'submitted',
        remarks TEXT,
        payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        amount_paid DECIMAL(10, 2) DEFAULT 0.00,
        transaction_id VARCHAR(128),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admit_cards (
        id VARCHAR(64) PRIMARY KEY,
        application_id VARCHAR(64) UNIQUE NOT NULL,
        application_number VARCHAR(64) NOT NULL,
        roll_number VARCHAR(64) UNIQUE NOT NULL,
        candidate_name VARCHAR(255) NOT NULL,
        father_name VARCHAR(255) NOT NULL,
        class_applying VARCHAR(64) NOT NULL,
        exam_centre_name VARCHAR(255) NOT NULL,
        exam_centre_address TEXT NOT NULL,
        exam_date VARCHAR(64) NOT NULL,
        reporting_time VARCHAR(64) NOT NULL,
        exam_duration VARCHAR(64) NOT NULL,
        room_number VARCHAR(64),
        candidate_photo_url TEXT,
        is_released BOOLEAN DEFAULT FALSE,
        instructions JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS results (
        id VARCHAR(64) PRIMARY KEY,
        application_id VARCHAR(64) UNIQUE NOT NULL,
        application_number VARCHAR(64) NOT NULL,
        roll_number VARCHAR(64) UNIQUE NOT NULL,
        candidate_name VARCHAR(255) NOT NULL,
        class_applying VARCHAR(64) NOT NULL,
        subjects JSON NOT NULL,
        total_marks DECIMAL(6, 2) NOT NULL,
        max_total_marks DECIMAL(6, 2) NOT NULL,
        percentage DECIMAL(5, 2) NOT NULL,
        rank INT NOT NULL,
        qualifying_status VARCHAR(64) NOT NULL,
        counseling_date VARCHAR(128),
        counseling_venue TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS exam_centres (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(32) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(128) NOT NULL,
        state VARCHAR(128) NOT NULL,
        capacity INT NOT NULL,
        address TEXT NOT NULL,
        contact_person VARCHAR(128),
        contact_phone VARCHAR(32)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_value JSON NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id VARCHAR(64) PRIMARY KEY,
        type VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        entity_id VARCHAR(64),
        entity_type VARCHAR(32),
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_enquiries (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(32) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        application_number VARCHAR(64),
        source VARCHAR(32) DEFAULT 'public_contact',
        status VARCHAR(32) DEFAULT 'new',
        admin_remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Connected to MySQL database successfully and initialized schema.');
    useFallbackStorage = false;
  } catch (err) {
    console.warn(
      '⚠️ Notice: Could not connect to local MySQL with current credentials. Automatically activating High-Performance JSON/Memory Data Store. Set DB_PASSWORD in .env anytime to use MySQL.',
      err instanceof Error ? err.message : err
    );
    useFallbackStorage = true;
    initFallbackFile();
  }
}

// Database helper functions supporting both MySQL and fallback storage
export const db = {
  // Users
  async findUserByIdentifier(identifier: string): Promise<(User & { passwordHash?: string }) | null> {
    const trimmed = identifier.trim().toLowerCase();
    const cleanAlphaNum = trimmed.replace(/[^a-z0-9]/g, '');
    const cleanPhone = trimmed.replace(/\D/g, '').slice(-10);

    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      let user: any = store.users.find((u: any) => {
        const uEmail = u.email ? u.email.toLowerCase() : '';
        const uRegNo = u.registrationNumber ? u.registrationNumber.toLowerCase() : '';
        const uRegNoClean = uRegNo.replace(/[^a-z0-9]/g, '');
        const uPhone = u.phone ? u.phone.toLowerCase() : '';
        const uPhoneClean = u.phone ? u.phone.replace(/\D/g, '').slice(-10) : '';

        return (
          u.id === identifier ||
          u.id === trimmed ||
          uEmail === trimmed ||
          (uRegNo && (uRegNo === trimmed || uRegNoClean === cleanAlphaNum)) ||
          uPhone === trimmed ||
          (cleanPhone.length === 10 && uPhoneClean === cleanPhone)
        );
      });

      // If not directly found on user object, search applications (in case registrationNumber was assigned to application)
      if (!user) {
        const matchedApp = store.applications.find((a: any) => {
          const aRegNo = a.registrationNumber ? a.registrationNumber.toLowerCase() : '';
          const aRegNoClean = aRegNo.replace(/[^a-z0-9]/g, '');
          const aAppNo = a.applicationNumber ? a.applicationNumber.toLowerCase() : '';
          const aAppNoClean = aAppNo.replace(/[^a-z0-9]/g, '');

          return (
            (aRegNo && (aRegNo === trimmed || aRegNoClean === cleanAlphaNum)) ||
            (aAppNo && (aAppNo === trimmed || aAppNoClean === cleanAlphaNum))
          );
        });

        if (matchedApp && matchedApp.userId) {
          user = store.users.find((u: any) => u.id === matchedApp.userId);
        }
      }

      if (!user) return null;

      // Ensure registrationNumber is synchronized on the returned user object
      if (!user.registrationNumber) {
        const linkedApp = store.applications.find((a: any) => a.userId === user.id && (a.registrationNumber || a.applicationNumber));
        if (linkedApp) {
          user.registrationNumber = linkedApp.registrationNumber || linkedApp.applicationNumber;
        }
      }

      // Read real password hash if available
      let pass = user.passwordHash;
      if (!pass) {
        if (user.role === 'admin') {
          pass = bcrypt.hashSync('Admin@Gurukul2026', 10);
        } else if (user.id === 'usr-student-demo') {
          pass = bcrypt.hashSync('Student@123', 10);
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        registrationNumber: user.registrationNumber,
        passwordHash: pass,
        createdAt: user.createdAt,
      };
    }

    const [rows]: any = await pool.query(
      `SELECT u.*, COALESCE(u.registration_number, a.registration_number, a.application_number) as resolved_reg_no 
       FROM users u 
       LEFT JOIN applications a ON u.id = a.user_id 
       WHERE LOWER(u.email) = ? 
          OR LOWER(u.registration_number) = ? 
          OR REPLACE(LOWER(COALESCE(u.registration_number, '')), '-', '') = ?
          OR RIGHT(u.phone, 10) = ? 
          OR LOWER(a.registration_number) = ? 
          OR REPLACE(LOWER(COALESCE(a.registration_number, '')), '-', '') = ?
          OR LOWER(a.application_number) = ? 
       LIMIT 1`,
      [trimmed, trimmed, cleanAlphaNum, cleanPhone, trimmed, cleanAlphaNum, trimmed]
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      registrationNumber: r.resolved_reg_no || r.registration_number,
      passwordHash: r.password_hash,
      createdAt: r.created_at,
    };
  },

  async findUserByEmail(email: string): Promise<(User & { passwordHash?: string }) | null> {
    return this.findUserByIdentifier(email);
  },

  async getUserById(id: string): Promise<(User & { passwordHash?: string }) | null> {
    return this.findUserByIdentifier(id);
  },

  async findUserByPhone(phone: string): Promise<(User & { passwordHash?: string }) | null> {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const u = store.users.find(user => {
        const uClean = user.phone ? user.phone.replace(/\D/g, '').slice(-10) : '';
        return uClean === clean;
      });
      if (!u) return null;
      return {
        ...u,
        passwordHash: (u as any).passwordHash || (u.role === 'admin' ? bcrypt.hashSync('Admin@Gurukul2026', 10) : bcrypt.hashSync('Student@123', 10)),
      };
    }
    const [rows]: any = await pool.query('SELECT * FROM users WHERE RIGHT(phone, 10) = ? LIMIT 1', [clean]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      registrationNumber: r.registration_number,
      createdAt: r.created_at,
      passwordHash: r.password_hash,
    };
  },

  async updateUserPassword(emailOrPhone: string, newPasswordHash: string): Promise<boolean> {
    const user = (await this.findUserByIdentifier(emailOrPhone)) || (await this.findUserByPhone(emailOrPhone));
    if (!user) return false;

    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const idx = store.users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        (store.users[idx] as any).passwordHash = newPasswordHash;
        saveFallbackStore(store);
        return true;
      }
      return false;
    }

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, user.id]);
    return true;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<boolean> {
    const store = initFallbackFile();
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      store.users[idx] = { ...store.users[idx], ...updates };
      saveFallbackStore(store);
    }

    if (pool && !useFallbackStorage) {
      try {
        if ('registrationNumber' in updates) {
          await pool.query('UPDATE users SET registration_number = ? WHERE id = ?', [updates.registrationNumber || null, id]);
        }
        if (updates.name) {
          await pool.query('UPDATE users SET name = ? WHERE id = ?', [updates.name, id]);
        }
      } catch (e) {
        console.warn('MySQL updateUser error:', e);
      }
    }
    return true;
  },

  async deleteUser(id: string): Promise<boolean> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const initialCount = store.users.length;
      store.users = store.users.filter((u) => u.id !== id && u.registrationNumber !== id && u.email !== id && u.phone !== id);
      if (store.users.length !== initialCount) {
        saveFallbackStore(store);
        return true;
      }
      return false;
    }

    try {
      const [res]: any = await pool.query('DELETE FROM users WHERE id = ? OR registration_number = ? OR email = ?', [id, id, id]);
      return res.affectedRows > 0;
    } catch (e) {
      console.error('MySQL deleteUser error:', e);
      return false;
    }
  },

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'registrationNumber'> & { passwordHash: string; registrationNumber?: string }): Promise<User> {
    const id = 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const createdAt = new Date().toISOString();

    const store = initFallbackFile();
    // Enforce Unique Mobile Number per candidate
    if (user.phone) {
      const cleanPhone = user.phone.replace(/\D/g, '').slice(-10);
      const existingPhoneUser = await this.findUserByPhone(cleanPhone);
      if (existingPhoneUser) {
        throw new Error(`Mobile number +91-${cleanPhone} is already registered. Duplicate phone numbers are prohibited.`);
      }
    }

    // Registration numbers are NOT generated during initial registration; they are generated upon application fee payment
    const registrationNumber = user.registrationNumber || undefined;

    const newUser: User & { passwordHash?: string } = {
      id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      passwordHash: user.passwordHash,
      registrationNumber,
      createdAt,
    };

    if (useFallbackStorage || !pool) {
      store.users.push(newUser);
      saveFallbackStore(store);
      return newUser;
    }

    await pool.query(
      'INSERT INTO users (id, name, email, phone, password_hash, role, registration_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, user.name, user.email, user.phone, user.passwordHash, user.role, registrationNumber || null, createdAt]
    );
    return newUser;
  },

  // Applications
  async getApplications(): Promise<Application[]> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      return store.applications.map(a => {
        const user = store.users.find(u => u.id === a.userId);
        const resolvedName = (a.personalInfo?.fullName && a.personalInfo.fullName !== 'Temp Delete Test' && a.personalInfo.fullName.trim() !== '')
          ? a.personalInfo.fullName
          : (user?.name || 'Applicant');

        return {
          ...a,
          registrationNumber: a.registrationNumber || a.applicationNumber,
          applicationNumber: a.applicationNumber || a.registrationNumber,
          personalInfo: {
            ...a.personalInfo,
            fullName: resolvedName,
            candidateEmail: a.personalInfo?.candidateEmail || user?.email || '',
            candidateMobile: a.personalInfo?.candidateMobile || user?.phone || '',
          },
          parentInfo: {
            ...a.parentInfo,
            fatherPhone: a.parentInfo?.fatherPhone || a.personalInfo?.candidateMobile || user?.phone || '',
          }
        };
      });
    }
    const [rows]: any = await pool.query(`
      SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `);
    return rows.map((r: any) => {
      const parsedPersonal = typeof r.personal_info === 'string' ? JSON.parse(r.personal_info) : (r.personal_info || {});
      const resolvedName = (parsedPersonal.fullName && parsedPersonal.fullName !== 'Temp Delete Test' && parsedPersonal.fullName.trim() !== '')
        ? parsedPersonal.fullName
        : (r.user_name || 'Applicant');
      parsedPersonal.fullName = resolvedName;
      if (!parsedPersonal.candidateEmail) parsedPersonal.candidateEmail = r.user_email || '';
      if (!parsedPersonal.candidateMobile) parsedPersonal.candidateMobile = r.user_phone || '';

      const parsedParent = typeof r.parent_info === 'string' ? JSON.parse(r.parent_info) : (r.parent_info || {});
      if (!parsedParent.fatherPhone) parsedParent.fatherPhone = parsedPersonal.candidateMobile || r.user_phone || '';

      return {
        id: r.id,
        registrationNumber: r.registration_number || r.application_number,
        applicationNumber: r.application_number || r.registration_number,
        rollNumber: r.roll_number || undefined,
        userId: r.user_id,
        classApplying: r.class_applying,
        personalInfo: parsedPersonal,
        parentInfo: parsedParent,
        addressInfo: typeof r.address_info === 'string' ? JSON.parse(r.address_info) : r.address_info,
        academicInfo: typeof r.academic_info === 'string' ? JSON.parse(r.academic_info) : r.academic_info,
        examCentrePref: typeof r.exam_centre_pref === 'string' ? JSON.parse(r.exam_centre_pref) : r.exam_centre_pref,
        documents: typeof r.documents === 'string' ? JSON.parse(r.documents) : r.documents,
        status: r.status,
        remarks: r.remarks,
        paymentStatus: r.payment_status,
        amountPaid: parseFloat(r.amount_paid || 0),
        transactionId: r.transaction_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  },

  async getApplicationById(id: string): Promise<Application | null> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const a = store.applications.find((app) => app.id === id || app.applicationNumber === id || app.registrationNumber === id);
      if (!a) return null;
      return {
        ...a,
        registrationNumber: a.registrationNumber || a.applicationNumber,
        applicationNumber: a.applicationNumber || a.registrationNumber,
      };
    }
    const [rows]: any = await pool.query('SELECT * FROM applications WHERE id = ? OR application_number = ? OR registration_number = ? LIMIT 1', [id, id, id]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      registrationNumber: r.registration_number || r.application_number,
      applicationNumber: r.application_number || r.registration_number,
      rollNumber: r.roll_number || undefined,
      userId: r.user_id,
      classApplying: r.class_applying,
      personalInfo: typeof r.personal_info === 'string' ? JSON.parse(r.personal_info) : r.personal_info,
      parentInfo: typeof r.parent_info === 'string' ? JSON.parse(r.parent_info) : r.parent_info,
      addressInfo: typeof r.address_info === 'string' ? JSON.parse(r.address_info) : r.address_info,
      academicInfo: typeof r.academic_info === 'string' ? JSON.parse(r.academic_info) : r.academic_info,
      examCentrePref: typeof r.exam_centre_pref === 'string' ? JSON.parse(r.exam_centre_pref) : r.exam_centre_pref,
      documents: typeof r.documents === 'string' ? JSON.parse(r.documents) : r.documents,
      status: r.status,
      remarks: r.remarks,
      paymentStatus: r.payment_status,
      amountPaid: parseFloat(r.amount_paid || 0),
      transactionId: r.transaction_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  async getApplicationByUserId(userId: string): Promise<Application | null> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const a = store.applications.find((app) => app.userId === userId);
      if (!a) return null;
      const user = store.users.find(u => u.id === userId);
      const resolvedName = (a.personalInfo?.fullName && a.personalInfo.fullName !== 'Temp Delete Test' && a.personalInfo.fullName.trim() !== '')
        ? a.personalInfo.fullName
        : (user?.name || 'Applicant');
      return {
        ...a,
        registrationNumber: a.registrationNumber || a.applicationNumber,
        applicationNumber: a.applicationNumber || a.registrationNumber,
        personalInfo: {
          ...a.personalInfo,
          fullName: resolvedName,
          candidateEmail: a.personalInfo?.candidateEmail || user?.email || '',
          candidateMobile: a.personalInfo?.candidateMobile || user?.phone || '',
        },
      };
    }
    const [rows]: any = await pool.query('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
    if (!rows.length) return null;
    return this.getApplicationById(rows[0].id);
  },

  async findApplicationByAadhaar(aadhaarNumber: string): Promise<Application | null> {
    const clean = aadhaarNumber ? aadhaarNumber.replace(/\D/g, '') : '';
    if (!clean) return null;

    const allApps = await this.getApplications();
    const found = allApps.find((a) => {
      const aClean = (a.personalInfo?.aadhaarNumber || '').replace(/\D/g, '');
      return aClean === clean && a.status !== 'rejected';
    });
    return found || null;
  },


  async createApplication(app: Omit<Application, 'id' | 'registrationNumber' | 'applicationNumber' | 'createdAt' | 'updatedAt'> & { registrationNumber?: string }): Promise<Application> {
    const store = initFallbackFile();
    const user = store.users.find(u => u.id === app.userId);
    const count = store.applications.length + 10001;
    const regNumber = app.registrationNumber || user?.registrationNumber || `GK26-${count}`;
    const id = 'app-' + Date.now();
    const now = new Date().toISOString();

    const candidateName = (app.personalInfo?.fullName && app.personalInfo.fullName !== 'Temp Delete Test' && app.personalInfo.fullName.trim() !== '')
      ? app.personalInfo.fullName
      : (user?.name || 'Applicant');

    const newApp: Application = {
      ...app,
      id,
      registrationNumber: regNumber,
      applicationNumber: regNumber,
      rollNumber: undefined, // Roll number is strictly deferred per user instructions
      personalInfo: {
        ...app.personalInfo,
        fullName: candidateName,
        candidateEmail: app.personalInfo?.candidateEmail || user?.email || '',
        candidateMobile: app.personalInfo?.candidateMobile || user?.phone || '',
      } as any,
      createdAt: now,
      updatedAt: now,
    };

    if (useFallbackStorage || !pool) {
      if (user && !user.registrationNumber) {
        user.registrationNumber = regNumber;
      }
      const existingDraftIdx = store.applications.findIndex(a => a.userId === app.userId);
      if (existingDraftIdx !== -1) {
        store.applications[existingDraftIdx] = newApp;
      } else {
        store.applications.push(newApp);
      }
      saveFallbackStore(store);
      return newApp;
    }

    // Persist registration number to user record in MySQL if not already set
    await pool.query('UPDATE users SET registration_number = ? WHERE id = ? AND registration_number IS NULL', [regNumber, app.userId]);

    const [existingAppRows]: any = await pool.query('SELECT id FROM applications WHERE user_id = ?', [app.userId]);
    if (existingAppRows.length > 0) {
      await pool.query(
        `UPDATE applications SET
          application_number = ?, class_applying = ?, personal_info = ?, parent_info = ?,
          address_info = ?, academic_info = ?, exam_centre_pref = ?, documents = ?,
          status = ?, remarks = ?, payment_status = ?, amount_paid = ?, transaction_id = ?,
          updated_at = ?
         WHERE id = ?`,
        [
          regNumber,
          app.classApplying,
          JSON.stringify(app.personalInfo),
          JSON.stringify(app.parentInfo),
          JSON.stringify(app.addressInfo),
          JSON.stringify(app.academicInfo),
          JSON.stringify(app.examCentrePref),
          JSON.stringify(app.documents || {}),
          app.status,
          app.remarks || null,
          app.paymentStatus,
          app.amountPaid || 0,
          app.transactionId || null,
          now,
          existingAppRows[0].id,
        ]
      );
      return { ...newApp, id: existingAppRows[0].id };
    }

    await pool.query(
      `INSERT INTO applications (
        id, application_number, user_id, class_applying, 
        personal_info, parent_info, address_info, academic_info, 
        exam_centre_pref, documents, status, remarks, 
        payment_status, amount_paid, transaction_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        regNumber,
        app.userId,
        app.classApplying,
        JSON.stringify(app.personalInfo),
        JSON.stringify(app.parentInfo),
        JSON.stringify(app.addressInfo),
        JSON.stringify(app.academicInfo),
        JSON.stringify(app.examCentrePref),
        JSON.stringify(app.documents || {}),
        app.status,
        app.remarks || null,
        app.paymentStatus,
        app.amountPaid || 0,
        app.transactionId || null,
        now,
        now,
      ]
    );

    return newApp;
  },

  async saveDraftApplication(draft: Partial<Application> & { userId: string }): Promise<Application> {
    const store = initFallbackFile();
    const user = store.users.find(u => u.id === draft.userId);
    const existingIndex = store.applications.findIndex(a => a.userId === draft.userId);
    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      const existing = store.applications[existingIndex];
      const mergedPersonal = {
        ...(existing.personalInfo || {}),
        ...(draft.personalInfo || {}),
      };
      if (!mergedPersonal.fullName || mergedPersonal.fullName === 'Temp Delete Test' || mergedPersonal.fullName.trim() === '') {
        mergedPersonal.fullName = user?.name || existing.personalInfo?.fullName || 'Applicant';
      }
      if (!mergedPersonal.candidateEmail) mergedPersonal.candidateEmail = user?.email || '';
      if (!mergedPersonal.candidateMobile) mergedPersonal.candidateMobile = user?.phone || '';

      const updated: Application = {
        ...existing,
        ...draft,
        id: existing.id,
        userId: existing.userId,
        registrationNumber: existing.registrationNumber,
        applicationNumber: existing.applicationNumber,
        personalInfo: mergedPersonal,
        currentStep: draft.currentStep || existing.currentStep || 1,
        status: (existing.status === 'submitted' || existing.status === 'approved') ? existing.status : 'draft',
        updatedAt: now,
      } as Application;

      store.applications[existingIndex] = updated;
      saveFallbackStore(store);

      if (pool && !useFallbackStorage) {
        try {
          await pool.query(
            `UPDATE applications SET
              class_applying = ?, personal_info = ?, parent_info = ?,
              address_info = ?, academic_info = ?, exam_centre_pref = ?,
              documents = ?, updated_at = ?
             WHERE user_id = ? AND status = 'draft'`,
            [
              updated.classApplying,
              JSON.stringify(updated.personalInfo),
              JSON.stringify(updated.parentInfo),
              JSON.stringify(updated.addressInfo),
              JSON.stringify(updated.academicInfo),
              JSON.stringify(updated.examCentrePref),
              JSON.stringify(updated.documents || {}),
              now,
              draft.userId,
            ]
          );
        } catch (err) {
          console.warn('Draft save MySQL update error (fallback used):', err);
        }
      }

      return updated;
    }

    const id = 'app-draft-' + Date.now();
    const count = store.applications.length + 10001;
    const tempNumber = `DRAFT-${count}`;
    const newDraftPersonal = {
      fullName: user?.name || '',
      candidateEmail: user?.email || '',
      candidateMobile: user?.phone || '',
      whatsappNumber: user?.phone || '',
      ...(draft.personalInfo || {}),
    };
    if (!newDraftPersonal.fullName || newDraftPersonal.fullName === 'Temp Delete Test' || newDraftPersonal.fullName.trim() === '') {
      newDraftPersonal.fullName = user?.name || 'Applicant';
    }

    const newDraft: Application = {
      id,
      registrationNumber: tempNumber,
      applicationNumber: tempNumber,
      userId: draft.userId,
      classApplying: draft.classApplying || 'Class 6',
      personalInfo: newDraftPersonal as any,
      parentInfo: {
        fatherPhone: draft.parentInfo?.fatherPhone || '',
        ...(draft.parentInfo || {}),
      } as any,
      addressInfo: draft.addressInfo || {} as any,
      academicInfo: draft.academicInfo || {} as any,
      examCentrePref: draft.examCentrePref || {} as any,
      documents: draft.documents || {},
      status: 'draft',
      currentStep: draft.currentStep || 1,
      paymentStatus: 'pending',
      amountPaid: 0,
      createdAt: now,
      updatedAt: now,
    };

    store.applications.push(newDraft);
    saveFallbackStore(store);

    if (pool && !useFallbackStorage) {
      try {
        await pool.query(
          `INSERT INTO applications (
            id, application_number, user_id, class_applying, 
            personal_info, parent_info, address_info, academic_info, 
            exam_centre_pref, documents, status, remarks, 
            payment_status, amount_paid, transaction_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            tempNumber,
            draft.userId,
            newDraft.classApplying,
            JSON.stringify(newDraft.personalInfo),
            JSON.stringify(newDraft.parentInfo),
            JSON.stringify(newDraft.addressInfo),
            JSON.stringify(newDraft.academicInfo),
            JSON.stringify(newDraft.examCentrePref),
            JSON.stringify(newDraft.documents),
            'draft',
            null,
            'pending',
            0,
            null,
            now,
            now,
          ]
        );
      } catch (err) {
        console.warn('Draft save MySQL error (fallback used):', err);
      }
    }

    return newDraft;
  },

  async updateApplicationStatus(id: string, status: Application['status'], remarks?: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const app = store.applications.find((a) => a.id === id);
      if (app) {
        app.status = status;
        if (remarks !== undefined) app.remarks = remarks;
        app.updatedAt = now;

        // If rejected, automatically revoke and delete any issued Admit Card
        if (status === 'rejected') {
          store.admitCards = store.admitCards.filter((c) => c.applicationId !== id);
        }

        saveFallbackStore(store);
        return true;
      }
      return false;
    }

    await pool.query(
      'UPDATE applications SET status = ?, remarks = ?, updated_at = ? WHERE id = ?',
      [status, remarks || null, now, id]
    );

    if (status === 'rejected') {
      await pool.query('DELETE FROM admit_cards WHERE application_id = ?', [id]);
    }

    return true;
  },

  async updateApplicationDetails(id: string, updates: Partial<Application>): Promise<Application | null> {
    const now = new Date().toISOString();
    const store = initFallbackFile();
    const idx = store.applications.findIndex((a) => a.id === id);
    if (idx === -1) return null;

    const existing = store.applications[idx];
    const updated: Application = {
      ...existing,
      ...updates,
      personalInfo: updates.personalInfo ? { ...existing.personalInfo, ...updates.personalInfo } : existing.personalInfo,
      parentInfo: updates.parentInfo ? { ...existing.parentInfo, ...updates.parentInfo } : existing.parentInfo,
      addressInfo: updates.addressInfo ? { ...existing.addressInfo, ...updates.addressInfo } : existing.addressInfo,
      academicInfo: updates.academicInfo ? { ...existing.academicInfo, ...updates.academicInfo } : existing.academicInfo,
      examCentrePref: updates.examCentrePref ? { ...existing.examCentrePref, ...updates.examCentrePref } : existing.examCentrePref,
      documents: updates.documents ? { ...existing.documents, ...updates.documents } : existing.documents,
      updatedAt: now,
    };

    store.applications[idx] = updated;
    saveFallbackStore(store);

    if (pool && !useFallbackStorage) {
      try {
        await pool.query(
          `UPDATE applications SET
            status = ?, remarks = ?, personal_info = ?, academic_info = ?,
            documents = ?, updated_at = ?
           WHERE id = ?`,
          [
            updated.status,
            updated.remarks || null,
            JSON.stringify(updated.personalInfo),
            JSON.stringify(updated.academicInfo),
            JSON.stringify(updated.documents || {}),
            now,
            id,
          ]
        );
      } catch (e) {
        console.warn('MySQL updateApplicationDetails error (fallback saved):', e);
      }
    }

    return updated;
  },

  async deleteApplication(id: string): Promise<boolean> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const initialCount = store.applications.length;
      store.applications = store.applications.filter(
        (a) => a.id !== id && a.applicationNumber !== id && a.registrationNumber !== id
      );
      // Also cleanup any linked admit card
      store.admitCards = store.admitCards.filter(
        (ac) => ac.applicationId !== id && ac.applicationNumber !== id
      );
      if (store.applications.length !== initialCount) {
        saveFallbackStore(store);
        return true;
      }
      return false;
    }

    try {
      await pool.query('DELETE FROM admit_cards WHERE application_id = ?', [id]);
      const [res]: any = await pool.query('DELETE FROM applications WHERE id = ? OR application_number = ?', [id, id]);
      return res.affectedRows > 0;
    } catch (e) {
      console.error('MySQL deleteApplication error:', e);
      return false;
    }
  },

  // Admit Cards
  async getAdmitCards(): Promise<AdmitCard[]> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      return store.admitCards;
    }
    const [rows]: any = await pool.query('SELECT * FROM admit_cards ORDER BY roll_number ASC');
    return rows.map((r: any) => ({
      id: r.id,
      applicationId: r.application_id,
      applicationNumber: r.application_number,
      rollNumber: r.roll_number,
      candidateName: r.candidate_name,
      fatherName: r.father_name,
      classApplying: r.class_applying,
      examCentreName: r.exam_centre_name,
      examCentreAddress: r.exam_centre_address,
      examDate: r.exam_date,
      reportingTime: r.reporting_time,
      examDuration: r.exam_duration,
      roomNumber: r.room_number,
      candidatePhotoUrl: r.candidate_photo_url,
      isReleased: Boolean(r.is_released),
      instructions: typeof r.instructions === 'string' ? JSON.parse(r.instructions) : r.instructions,
      createdAt: r.created_at,
    }));
  },

  async getAdmitCard(applicationId: string): Promise<AdmitCard | null> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      return store.admitCards.find((c) => c.applicationId === applicationId || c.applicationNumber === applicationId) || null;
    }
    const [rows]: any = await pool.query('SELECT * FROM admit_cards WHERE application_id = ? OR application_number = ? LIMIT 1', [applicationId, applicationId]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      applicationId: r.application_id,
      applicationNumber: r.application_number,
      rollNumber: r.roll_number,
      candidateName: r.candidate_name,
      fatherName: r.father_name,
      classApplying: r.class_applying,
      examCentreName: r.exam_centre_name,
      examCentreAddress: r.exam_centre_address,
      examDate: r.exam_date,
      reportingTime: r.reporting_time,
      examDuration: r.exam_duration,
      roomNumber: r.room_number,
      candidatePhotoUrl: r.candidate_photo_url,
      isReleased: Boolean(r.is_released),
      instructions: typeof r.instructions === 'string' ? JSON.parse(r.instructions) : r.instructions,
      createdAt: r.created_at,
    };
  },

  async generateOrReleaseAdmitCard(admitCard: AdmitCard): Promise<AdmitCard> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const idx = store.admitCards.findIndex((a) => a.applicationId === admitCard.applicationId);
      if (idx >= 0) {
        store.admitCards[idx] = admitCard;
      } else {
        store.admitCards.push(admitCard);
      }
      saveFallbackStore(store);
      return admitCard;
    }

    await pool.query(
      `INSERT INTO admit_cards (
        id, application_id, application_number, roll_number, candidate_name, father_name, 
        class_applying, exam_centre_name, exam_centre_address, exam_date, reporting_time, 
        exam_duration, room_number, candidate_photo_url, is_released, instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        roll_number = VALUES(roll_number), 
        exam_centre_name = VALUES(exam_centre_name), 
        is_released = VALUES(is_released)`,
      [
        admitCard.id,
        admitCard.applicationId,
        admitCard.applicationNumber,
        admitCard.rollNumber,
        admitCard.candidateName,
        admitCard.fatherName,
        admitCard.classApplying,
        admitCard.examCentreName,
        admitCard.examCentreAddress,
        admitCard.examDate,
        admitCard.reportingTime,
        admitCard.examDuration,
        admitCard.roomNumber,
        admitCard.candidatePhotoUrl || null,
        admitCard.isReleased,
        JSON.stringify(admitCard.instructions),
      ]
    );

    return admitCard;
  },

  // Results
  async getResult(applicationId: string): Promise<ExamResult | null> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      return store.results.find((r) => r.applicationId === applicationId || r.applicationNumber === applicationId || r.rollNumber === applicationId) || null;
    }
    const [rows]: any = await pool.query('SELECT * FROM results WHERE application_id = ? OR application_number = ? OR roll_number = ? LIMIT 1', [applicationId, applicationId, applicationId]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      applicationId: r.application_id,
      applicationNumber: r.application_number,
      rollNumber: r.roll_number,
      candidateName: r.candidate_name,
      classApplying: r.class_applying,
      subjects: typeof r.subjects === 'string' ? JSON.parse(r.subjects) : r.subjects,
      totalMarks: parseFloat(r.total_marks),
      maxTotalMarks: parseFloat(r.max_total_marks),
      percentage: parseFloat(r.percentage),
      rank: parseInt(r.rank, 10),
      qualifyingStatus: r.qualifying_status,
      counselingDate: r.counseling_date,
      counselingVenue: r.counseling_venue,
      isPublished: Boolean(r.is_published),
      remarks: r.remarks,
    };
  },

  async publishResult(result: ExamResult): Promise<ExamResult> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const idx = store.results.findIndex((r) => r.applicationId === result.applicationId);
      if (idx >= 0) {
        store.results[idx] = result;
      } else {
        store.results.push(result);
      }
      saveFallbackStore(store);
      return result;
    }

    await pool.query(
      `INSERT INTO results (
        id, application_id, application_number, roll_number, candidate_name, class_applying, 
        subjects, total_marks, max_total_marks, percentage, \`rank\`, qualifying_status, 
        counseling_date, counseling_venue, is_published, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        total_marks = VALUES(total_marks), 
        percentage = VALUES(percentage), 
        \`rank\` = VALUES(\`rank\`), 
        is_published = VALUES(is_published)`,
      [
        result.id,
        result.applicationId,
        result.applicationNumber,
        result.rollNumber,
        result.candidateName,
        result.classApplying,
        JSON.stringify(result.subjects),
        result.totalMarks,
        result.maxTotalMarks,
        result.percentage,
        result.rank,
        result.qualifyingStatus,
        result.counselingDate || null,
        result.counselingVenue || null,
        result.isPublished,
        result.remarks || null,
      ]
    );

    return result;
  },

  async createResult(result: ExamResult): Promise<ExamResult> {
    return this.publishResult(result);
  },

  async areResultsDeclared(): Promise<boolean> {
    // Uses the admin-controlled resultsDeclared flag in settings.
    // Merely having published result records does NOT expose them to candidates.
    // Admin must explicitly toggle Settings > Declare Results = ON.
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      return store.settings?.resultsDeclared === true;
    }
    try {
      const [rows]: any = await pool.query(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'resultsDeclared' LIMIT 1"
      );
      return rows[0]?.setting_value === 'true' || rows[0]?.setting_value === true;
    } catch {
      const store = initFallbackFile();
      return store.settings?.resultsDeclared === true;
    }
  },

  // Settings & Exam Centres
  async getSettings(): Promise<SystemSettings> {
    const store = initFallbackFile();
    return store.settings || DEFAULT_SETTINGS;
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const store = initFallbackFile();
    store.settings = { ...store.settings, ...settings };
    saveFallbackStore(store);
    return store.settings;
  },

  async getCentres(): Promise<ExamCentre[]> {
    if (pool && !useFallbackStorage) {
      try {
        const [rows] = await pool.query('SELECT * FROM exam_centres ORDER BY code ASC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            city: r.city,
            state: r.state,
            capacity: Number(r.capacity),
            address: r.address,
            contactPerson: r.contact_person,
            contactPhone: r.contact_phone,
          }));
        }
      } catch (e) {
        console.warn('MySQL getCentres error (using fallback store):', e);
      }
    }
    const store = initFallbackFile();
    return store.examCentres || DEFAULT_CENTRES;
  },

  async getCentreById(id: string): Promise<ExamCentre | null> {
    const centres = await this.getCentres();
    return centres.find((c) => c.id === id || c.code === id) || null;
  },

  async addCentre(data: Omit<ExamCentre, 'id'> & { id?: string }): Promise<ExamCentre> {
    const id = data.id || `center-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newCentre: ExamCentre = {
      id,
      code: (data.code || 'GK-NEW').trim().toUpperCase(),
      name: data.name.trim(),
      city: (data.city || 'Kurukshetra').trim(),
      state: (data.state || 'Haryana').trim(),
      capacity: Number(data.capacity) || 500,
      address: data.address.trim(),
      contactPerson: (data.contactPerson || 'Exam Coordinator').trim(),
      contactPhone: (data.contactPhone || '+91-1744-259114').trim(),
    };

    const store = initFallbackFile();
    if (!store.examCentres) store.examCentres = [...DEFAULT_CENTRES];
    store.examCentres.push(newCentre);
    saveFallbackStore(store);

    if (pool && !useFallbackStorage) {
      try {
        await pool.query(
          `INSERT INTO exam_centres (id, code, name, city, state, capacity, address, contact_person, contact_phone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), capacity = VALUES(capacity), address = VALUES(address)`,
          [newCentre.id, newCentre.code, newCentre.name, newCentre.city, newCentre.state, newCentre.capacity, newCentre.address, newCentre.contactPerson, newCentre.contactPhone]
        );
      } catch (e) {
        console.warn('MySQL addCentre error:', e);
      }
    }

    return newCentre;
  },

  async updateCentre(id: string, updates: Partial<ExamCentre>): Promise<ExamCentre | null> {
    const store = initFallbackFile();
    if (!store.examCentres) store.examCentres = [...DEFAULT_CENTRES];
    const idx = store.examCentres.findIndex((c) => c.id === id || c.code === id);
    if (idx === -1) return null;

    const updated: ExamCentre = {
      ...store.examCentres[idx],
      ...updates,
      id: store.examCentres[idx].id,
      capacity: updates.capacity !== undefined ? Number(updates.capacity) : store.examCentres[idx].capacity,
    };
    store.examCentres[idx] = updated;
    saveFallbackStore(store);

    if (pool && !useFallbackStorage) {
      try {
        await pool.query(
          `UPDATE exam_centres SET
            code = ?, name = ?, city = ?, state = ?, capacity = ?,
            address = ?, contact_person = ?, contact_phone = ?
           WHERE id = ?`,
          [updated.code, updated.name, updated.city, updated.state, updated.capacity, updated.address, updated.contactPerson, updated.contactPhone, updated.id]
        );
      } catch (e) {
        console.warn('MySQL updateCentre error:', e);
      }
    }

    return updated;
  },

  async deleteCentre(id: string): Promise<boolean> {
    const store = initFallbackFile();
    if (!store.examCentres) store.examCentres = [...DEFAULT_CENTRES];
    const initialLen = store.examCentres.length;
    store.examCentres = store.examCentres.filter((c) => c.id !== id && c.code !== id);
    if (store.examCentres.length === initialLen) return false;
    saveFallbackStore(store);

    if (pool && !useFallbackStorage) {
      try {
        await pool.query('DELETE FROM exam_centres WHERE id = ? OR code = ?', [id, id]);
      } catch (e) {
        console.warn('MySQL deleteCentre error:', e);
      }
    }

    return true;
  },

  // ==========================================
  // --- Admin Notifications ---
  // ==========================================
  async getAdminNotifications(limit: number = 50): Promise<AdminNotification[]> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const notifs = store.notifications || [];
      return [...notifs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    }

    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      return rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        message: r.message,
        entityId: r.entity_id || undefined,
        entityType: r.entity_type || undefined,
        link: r.link || undefined,
        isRead: Boolean(r.is_read),
        metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('MySQL getAdminNotifications error, falling back to JSON:', e);
      const store = initFallbackFile();
      return [...(store.notifications || [])]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    }
  },

  async getUnreadAdminNotificationCount(): Promise<number> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      return (store.notifications || []).filter((n) => !n.isRead).length;
    }

    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) as unread_count FROM admin_notifications WHERE is_read = FALSE'
      );
      return rows[0]?.unread_count || 0;
    } catch (e) {
      const store = initFallbackFile();
      return (store.notifications || []).filter((n) => !n.isRead).length;
    }
  },

  async createAdminNotification(data: Omit<AdminNotification, 'id' | 'isRead' | 'createdAt'>): Promise<AdminNotification> {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();
    const newNotification: AdminNotification = {
      ...data,
      id,
      isRead: false,
      createdAt: now,
    };

    const store = initFallbackFile();
    if (!store.notifications) store.notifications = [];
    store.notifications.unshift(newNotification);
    // Strict max 100 notifications FIFO queue limit (delete oldest when incoming exceeds 100)
    if (store.notifications.length > 100) {
      store.notifications = store.notifications.slice(0, 100);
    }
    saveFallbackStore(store);

    if (pool && !useFallbackStorage) {
      try {
        await pool.query(
          `INSERT INTO admin_notifications (id, type, title, message, entity_id, entity_type, link, is_read, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
          [
            newNotification.id,
            newNotification.type,
            newNotification.title,
            newNotification.message,
            newNotification.entityId || null,
            newNotification.entityType || null,
            newNotification.link || null,
            newNotification.metadata ? JSON.stringify(newNotification.metadata) : null,
            now,
          ]
        );

        // Enforce max 100 notifications in MySQL by pruning oldest records
        await pool.query(
          `DELETE FROM admin_notifications WHERE id NOT IN (
            SELECT id FROM (
              SELECT id FROM admin_notifications ORDER BY created_at DESC LIMIT 100
            ) AS latest_queue
          )`
        );
      } catch (e) {
        console.warn('MySQL createAdminNotification error:', e);
      }
    }

    return newNotification;
  },

  async markAdminNotificationAsRead(id: string): Promise<boolean> {
    const store = initFallbackFile();
    if (!store.notifications) store.notifications = [];
    const notif = store.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      saveFallbackStore(store);
    }

    if (pool && !useFallbackStorage) {
      try {
        await pool.query('UPDATE admin_notifications SET is_read = TRUE WHERE id = ?', [id]);
      } catch (e) {
        console.warn('MySQL markAdminNotificationAsRead error:', e);
      }
    }

    return true;
  },

  async markAllAdminNotificationsAsRead(): Promise<boolean> {
    const store = initFallbackFile();
    if (!store.notifications) store.notifications = [];
    store.notifications.forEach((n) => {
      n.isRead = true;
    });
    saveFallbackStore(store);

    if (pool && !useFallbackStorage) {
      try {
        await pool.query('UPDATE admin_notifications SET is_read = TRUE');
      } catch (e) {
        console.warn('MySQL markAllAdminNotificationsAsRead error:', e);
      }
    }

    return true;
  },

  // ==========================================
  // --- Contact Enquiries ---
  // ==========================================
  async getContactEnquiries(status?: string): Promise<ContactEnquiry[]> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      let enqs = store.enquiries || [];
      if (status && status !== 'all') {
        enqs = enqs.filter((e) => e.status === status);
      }
      return [...enqs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    try {
      let query = 'SELECT * FROM contact_enquiries';
      const params: any[] = [];
      if (status && status !== 'all') {
        query += ' WHERE status = ?';
        params.push(status);
      }
      query += ' ORDER BY created_at DESC';
      const [rows] = await pool.query<mysql.RowDataPacket[]>(query, params);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        subject: r.subject,
        message: r.message,
        applicationNumber: r.application_number || undefined,
        source: (r.source as any) || 'public_contact',
        status: (r.status as any) || 'new',
        adminRemarks: r.admin_remarks || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('MySQL getContactEnquiries error, falling back:', e);
      const store = initFallbackFile();
      let enqs = store.enquiries || [];
      if (status && status !== 'all') {
        enqs = enqs.filter((e) => e.status === status);
      }
      return [...enqs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  async getContactEnquiryById(id: string): Promise<ContactEnquiry | null> {
    const store = initFallbackFile();
    const enq = (store.enquiries || []).find((e) => e.id === id);
    if (enq) return enq;

    if (pool && !useFallbackStorage) {
      try {
        const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM contact_enquiries WHERE id = ?', [id]);
        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            subject: r.subject,
            message: r.message,
            applicationNumber: r.application_number || undefined,
            source: (r.source as any) || 'public_contact',
            status: (r.status as any) || 'new',
            adminRemarks: r.admin_remarks || undefined,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
          };
        }
      } catch (e) {
        console.warn('MySQL getContactEnquiryById error:', e);
      }
    }
    return null;
  },

  async createContactEnquiry(data: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    applicationNumber?: string;
    source?: 'public_contact' | 'candidate_grievance';
  }): Promise<ContactEnquiry> {
    const id = `enq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();
    const newEnq: ContactEnquiry = {
      id,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      subject: data.subject.trim(),
      message: data.message.trim(),
      applicationNumber: data.applicationNumber?.trim() || undefined,
      source: data.source || 'public_contact',
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };

    const store = initFallbackFile();
    if (!store.enquiries) store.enquiries = [];
    store.enquiries.unshift(newEnq);
    saveFallbackStore(store);

    if (pool && !useFallbackStorage) {
      try {
        await pool.query(
          `INSERT INTO contact_enquiries (id, name, email, phone, subject, message, application_number, source, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
          [
            newEnq.id,
            newEnq.name,
            newEnq.email,
            newEnq.phone,
            newEnq.subject,
            newEnq.message,
            newEnq.applicationNumber || null,
            newEnq.source,
            now,
            now,
          ]
        );
      } catch (e) {
        console.warn('MySQL createContactEnquiry error:', e);
      }
    }

    // Automatically generate Admin Notification for new enquiry
    await db.createAdminNotification({
      type: 'CONTACT_ENQUIRY',
      title: `New Enquiry: ${newEnq.name}`,
      message: `${newEnq.name} (${newEnq.email}) submitted an enquiry: "${newEnq.subject}". Mobile: ${newEnq.phone}`,
      entityId: newEnq.id,
      entityType: 'enquiry',
      link: `/admin/enquiries?id=${newEnq.id}`,
      metadata: {
        enquiryId: newEnq.id,
        name: newEnq.name,
        email: newEnq.email,
        phone: newEnq.phone,
        subject: newEnq.subject,
        applicationNumber: newEnq.applicationNumber,
      },
    });

    return newEnq;
  },

  async updateContactEnquiryStatus(id: string, status: ContactEnquiryStatus, remarks?: string): Promise<ContactEnquiry | null> {
    const now = new Date().toISOString();
    const store = initFallbackFile();
    if (!store.enquiries) store.enquiries = [];
    const idx = store.enquiries.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    store.enquiries[idx].status = status;
    if (remarks !== undefined) store.enquiries[idx].adminRemarks = remarks;
    store.enquiries[idx].updatedAt = now;
    const updated = store.enquiries[idx];
    saveFallbackStore(store);

    if (pool && !useFallbackStorage) {
      try {
        await pool.query(
          'UPDATE contact_enquiries SET status = ?, admin_remarks = ?, updated_at = ? WHERE id = ?',
          [status, remarks || null, now, id]
        );
      } catch (e) {
        console.warn('MySQL updateContactEnquiryStatus error:', e);
      }
    }

    return updated;
  },
};

// Automatically execute schema init on module load
initDatabase().catch((e) => console.error('Database auto-init error:', e));

