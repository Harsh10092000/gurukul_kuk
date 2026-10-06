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
  ContactEnquiryStatus,
  PaymentOrderRecord
} from './types';
import { getExamDetailsForGender } from './validations';

// Default configuration from environment (supports individual DB_* vars or DATABASE_URL)
function parseDbConfig() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      return {
        host: parsed.hostname || 'localhost',
        port: parseInt(parsed.port || '3306', 10),
        user: parsed.username || 'root',
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname.replace(/^\//, '') || 'gurukul_entrance',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      };
    } catch (e) {
      console.warn('Failed to parse DATABASE_URL, falling back to individual DB_* vars:', e);
    }
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gurukul_entrance',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

const DB_CONFIG = parseDbConfig();

let pool: mysql.Pool | null = (globalThis as any).__gurukul_mysql_pool || null;
let useFallbackStorage = false;

// Local fallback store file path
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'gurukul_store.json');

// In-memory / JSON fallback store structure
interface FallbackStore {
  users: (User & { passwordHash?: string })[];
  applications: Application[];
  admitCards: AdmitCard[];
  results: ExamResult[];
  examCentres: ExamCentre[];
  settings: SystemSettings;
  notifications?: AdminNotification[];
  enquiries?: ContactEnquiry[];
  paymentOrders?: PaymentOrderRecord[];
  tempApplications?: { [sessionId: string]: any };
}

const DEFAULT_SETTINGS: SystemSettings = {
  portalOpen: true,
  resultsDeclared: false,
  academicSession: '2027-2028',
  applicationFee: 800,
  registrationStartDate: '2026-09-01',
  registrationEndDate: '2027-01-31',
  admitCardReleaseDate: '2027-03-01',
  entranceExamDate: '2027-02-14',
  entranceExamTime: '9:30 AM (Boys) / 8:30 AM (Girls)',
  examVenueName: 'Aryakulam Nilokheri (Boys) / The Gurukul Nilokheri (Girls)',
  examVenueAddress: 'Nilokheri, Karnal, Haryana - 132117',
  resultDeclarationDate: '2027-03-01',
  counselingStartDate: '2027-03-10',
  helplinePhone: '+91 7027849858 / 59',
  helplineEmail: 'thegurukulnilokheri@gmail.com',
  activeStudyLocations: ['Gurukul Nilokheri', 'Gurukul Jyotisar', 'Aryakulam Nilokheri'],
};

const DEFAULT_CENTRES: ExamCentre[] = [
  {
    id: 'center-1',
    code: 'ARYA-01',
    name: 'Aryakulam Nilokheri (Boys Centre)',
    city: 'Nilokheri',
    state: 'Haryana',
    capacity: 3000,
    address: 'Nigdu Road, Nilokheri, Karnal, Haryana - 132117',
    contactPerson: 'Exam Superintendent',
    contactPhone: '+91 7027849858',
  },
  {
    id: 'center-2',
    code: 'GUR-01',
    name: 'The Gurukul Nilokheri (Girls Centre)',
    city: 'Nilokheri',
    state: 'Haryana',
    capacity: 2000,
    address: 'Sidhpur Minor, Nigdu Road, Nilokheri, Karnal, Haryana - 132117',
    contactPerson: 'Exam Superintendent',
    contactPhone: '+91 7027849859',
  },
];

export function toMySqlDatetime(date: Date | string = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

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
      if (!parsed.paymentOrders) {
        parsed.paymentOrders = [];
        changed = true;
      }
      if (!parsed.tempApplications) {
        parsed.tempApplications = {};
        changed = true;
      }
      if (!parsed.settings) {
        parsed.settings = { ...DEFAULT_SETTINGS };
        changed = true;
      } else {
        if (parsed.settings.applicationFee !== 800) {
          parsed.settings.applicationFee = 800;
          changed = true;
        }
        if (parsed.settings.entranceExamDate !== '2027-02-14') {
          parsed.settings.entranceExamDate = '2027-02-14';
          changed = true;
        }
        if (parsed.settings.entranceExamTime !== '9:30 AM (Boys) / 8:30 AM (Girls)') {
          parsed.settings.entranceExamTime = '9:30 AM (Boys) / 8:30 AM (Girls)';
          changed = true;
        }
        if (parsed.settings.helplinePhone !== '+91 7027849858 / 59') {
          parsed.settings.helplinePhone = '+91 7027849858 / 59';
          changed = true;
        }
        if (parsed.settings.examVenueName !== 'Aryakulam Nilokheri (Boys) / The Gurukul Nilokheri (Girls)') {
          parsed.settings.examVenueName = 'Aryakulam Nilokheri (Boys) / The Gurukul Nilokheri (Girls)';
          changed = true;
        }
        if (parsed.settings.examVenueAddress !== 'Nilokheri, Karnal, Haryana - 132117') {
          parsed.settings.examVenueAddress = 'Nilokheri, Karnal, Haryana - 132117';
          changed = true;
        }
      }

      if (Array.isArray(parsed.admitCards)) {
        for (const ac of parsed.admitCards) {
          const det = getExamDetailsForGender(ac.gender, ac.rollNumber || ac.applicationNumber);
          if (ac.examDate !== det.examDate || ac.reportingTime !== det.reportingTime || ac.examCentreName !== det.examCentreName) {
            ac.examDate = det.examDate;
            ac.reportingTime = det.reportingTime;
            ac.examCentreName = det.examCentreName;
            ac.examCentreAddress = det.examCentreAddress;
            changed = true;
          }
        }
      }

      if (changed) {
        fs.writeFileSync(STORE_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }
      return parsed;
    } catch (e) {
      console.error('Error reading fallback store, creating fresh one:', e);
    }
  }

  // Initial admin credentials: "Admin@Gurukul2026"
  const passwordHash = bcrypt.hashSync('Admin@Gurukul2026', 10);

  const initialStore: FallbackStore = {
    users: [
      {
        id: 'usr-admin-1',
        name: 'Principal / Exam Controller',
        email: 'admin@thegurukulnilokheri.com',
        phone: '+919896328329',
        role: 'admin',
        passwordHash,
        createdAt: new Date().toISOString(),
      },
    ],
    applications: [],
    admitCards: [],
    results: [],
    examCentres: DEFAULT_CENTRES,
    settings: DEFAULT_SETTINGS,
    notifications: [],
    enquiries: [],
  };

  saveFallbackStore(initialStore);
  return initialStore;
}

function saveFallbackStore(store: FallbackStore) {
  // Guard: If MySQL is active and connected, NEVER write to local JSON file
  if (pool && !useFallbackStorage) {
    return;
  }
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write to fallback store:', e);
  }
}

let initPromise: Promise<void> | null = (globalThis as any).__gurukul_mysql_init_promise || null;

export async function ensureDb(): Promise<mysql.Pool | null> {
  if (pool && !useFallbackStorage) return pool;
  if (!initPromise || useFallbackStorage) {
    initPromise = initDatabase();
    (globalThis as any).__gurukul_mysql_init_promise = initPromise;
  }
  try {
    await initPromise;
  } catch (e) {
    console.error('ensureDb error:', e);
  }
  return pool;
}

/**
 * Initialize Database tables in MySQL or initialize fallback JSON store
 */
export async function initDatabase(): Promise<void> {
  try {
    let currentPool: mysql.Pool;
    try {
      currentPool = (globalThis as any).__gurukul_mysql_pool || mysql.createPool(DB_CONFIG);
      // Validate direct connection to configured database
      await currentPool.query('SELECT 1');
      (globalThis as any).__gurukul_mysql_pool = currentPool;
      pool = currentPool;
    } catch (directConnErr) {
      // If direct connection failed (e.g. fresh local installation where DB does not exist yet)
      try {
        const connection = await mysql.createConnection({
          host: DB_CONFIG.host,
          port: DB_CONFIG.port,
          user: DB_CONFIG.user,
          password: DB_CONFIG.password,
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`;`);
        await connection.end();
        currentPool = mysql.createPool(DB_CONFIG);
        (globalThis as any).__gurukul_mysql_pool = currentPool;
        pool = currentPool;
      } catch {
        throw directConnErr;
      }
    }

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

    await pool.query(
      'CREATE TABLE IF NOT EXISTS results (' +
      '  id VARCHAR(64) PRIMARY KEY,' +
      '  application_id VARCHAR(64) UNIQUE NOT NULL,' +
      '  application_number VARCHAR(64) NOT NULL,' +
      '  roll_number VARCHAR(64) UNIQUE NOT NULL,' +
      '  candidate_name VARCHAR(255) NOT NULL,' +
      '  class_applying VARCHAR(64) NOT NULL,' +
      '  subjects JSON NOT NULL,' +
      '  total_marks DECIMAL(6, 2) NOT NULL,' +
      '  max_total_marks DECIMAL(6, 2) NOT NULL,' +
      '  percentage DECIMAL(5, 2) NOT NULL,' +
      '  `rank` INT NOT NULL,' +
      '  qualifying_status VARCHAR(64) NOT NULL,' +
      '  counseling_date VARCHAR(128),' +
      '  counseling_venue TEXT,' +
      '  is_published BOOLEAN DEFAULT FALSE,' +
      '  remarks TEXT,' +
      '  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,' +
      '  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE' +
      ');'
    );

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) UNIQUE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 800.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        customer_email VARCHAR(255),
        customer_phone VARCHAR(32),
        customer_id VARCHAR(64),
        application_id VARCHAR(64),
        registration_number VARCHAR(64),
        application_payload JSON,
        payment_response JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS temp_applications (
        session_id VARCHAR(128) PRIMARY KEY,
        data JSON NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Connected to MySQL database successfully and initialized schema.');

    // Ensure default admin account exists and has valid credentials in MySQL
    try {
      const defaultAdminHash = bcrypt.hashSync('Admin@Gurukul2026', 10);
      const [existingAdmins]: any = await pool.query(
        "SELECT id, email, password_hash FROM users WHERE role = 'admin' LIMIT 1"
      );
      if (!existingAdmins || existingAdmins.length === 0) {
        await pool.query(
          "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)",
          [
            'usr-admin-1',
            'Principal / Exam Controller',
            'admin@thegurukulnilokheri.com',
            '+919896328329',
            defaultAdminHash,
            'admin'
          ]
        );
      } else {
        const adminRec = existingAdmins[0];
        if (!adminRec.password_hash) {
          await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [defaultAdminHash, adminRec.id]);
        }
        if (adminRec.email === 'admin@gurukulkurukshetra.com') {
          await pool.query("UPDATE users SET email = 'admin@thegurukulnilokheri.com' WHERE id = ?", [adminRec.id]);
        }
      }
    } catch (adminErr) {
      console.warn('Admin account initialization check notice:', adminErr);
    }

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
    await ensureDb();
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

        const isAdminAlias =
          u.role === 'admin' &&
          (trimmed === 'admin@thegurukulnilokheri.com' ||
            trimmed === 'admin@gurukulnilokheri.com' ||
            trimmed === 'admin@gurukulkurukshetra.com' ||
            trimmed === 'admin');

        return (
          isAdminAlias ||
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

    const isAdminIdentifier =
      trimmed === 'admin@thegurukulnilokheri.com' ||
      trimmed === 'admin@gurukulnilokheri.com' ||
      trimmed === 'admin@gurukulkurukshetra.com' ||
      trimmed === 'admin';

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
          OR (? = 1 AND u.role = 'admin')
       ORDER BY (u.role = 'admin') DESC
       LIMIT 1`,
      [trimmed, trimmed, cleanAlphaNum, cleanPhone, trimmed, cleanAlphaNum, trimmed, isAdminIdentifier ? 1 : 0]
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
      passwordHash: r.password_hash || (r.role === 'admin' ? bcrypt.hashSync('Admin@Gurukul2026', 10) : undefined),
      createdAt: r.created_at,
    };
  },

  async findUserByEmail(email: string): Promise<(User & { passwordHash?: string }) | null> {
    await ensureDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;
    const isAdminIdentifier =
      cleanEmail === 'admin@thegurukulnilokheri.com' ||
      cleanEmail === 'admin@gurukulnilokheri.com' ||
      cleanEmail === 'admin@gurukulkurukshetra.com' ||
      cleanEmail === 'admin';

    if (pool && !useFallbackStorage) {
      try {
        const [rows]: any = await pool.query(
          `SELECT u.*, COALESCE(u.registration_number, a.registration_number, a.application_number) as resolved_reg_no 
           FROM users u 
           LEFT JOIN applications a ON u.id = a.user_id 
           WHERE LOWER(u.email) = ? 
              OR (? = 1 AND u.role = 'admin')
           ORDER BY (u.role = 'admin') DESC
           LIMIT 1`,
          [cleanEmail, isAdminIdentifier ? 1 : 0]
        );
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            role: r.role,
            registrationNumber: r.resolved_reg_no || r.registration_number,
            passwordHash: r.password_hash || (r.role === 'admin' ? bcrypt.hashSync('Admin@Gurukul2026', 10) : undefined),
            createdAt: r.created_at,
          };
        }
        return null;
      } catch (e) {
        console.warn('MySQL findUserByEmail error:', e);
      }
    }
    return this.findUserByIdentifier(email);
  },

  async ensureAdminUser(): Promise<(User & { passwordHash?: string }) | null> {
    await ensureDb();
    const defaultAdminHash = bcrypt.hashSync('Admin@Gurukul2026', 10);
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      let admin = store.users.find((u: any) => u.role === 'admin');
      if (!admin) {
        admin = {
          id: 'usr-admin-1',
          name: 'Principal / Exam Controller',
          email: 'admin@thegurukulnilokheri.com',
          phone: '+919896328329',
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        store.users.unshift(admin);
        saveFallbackStore(store);
      }
      return {
        ...admin,
        passwordHash: (admin as any).passwordHash || defaultAdminHash,
      };
    }

    try {
      const [rows]: any = await pool.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
      if (rows && rows.length > 0) {
        const r = rows[0];
        if (!r.password_hash) {
          await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [defaultAdminHash, r.id]);
        }
        return {
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          role: r.role,
          registrationNumber: r.registration_number,
          passwordHash: r.password_hash || defaultAdminHash,
          createdAt: r.created_at,
        };
      }
      await pool.query(
        "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)",
        [
          'usr-admin-1',
          'Principal / Exam Controller',
          'admin@thegurukulnilokheri.com',
          '+919896328329',
          defaultAdminHash,
          'admin'
        ]
      );
      return {
        id: 'usr-admin-1',
        name: 'Principal / Exam Controller',
        email: 'admin@thegurukulnilokheri.com',
        phone: '+919896328329',
        role: 'admin',
        registrationNumber: undefined,
        passwordHash: defaultAdminHash,
        createdAt: new Date().toISOString(),
      };
    } catch (e) {
      console.warn('ensureAdminUser error:', e);
      return null;
    }
  },

  async getUserById(id: string): Promise<(User & { passwordHash?: string }) | null> {
    await ensureDb();
    return this.findUserByIdentifier(id);
  },

  async findUserByPhone(phone: string): Promise<(User & { passwordHash?: string }) | null> {
    await ensureDb();
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

  async getAllUsers(): Promise<User[]> {
    if (pool && !useFallbackStorage) {
      try {
        const [rows]: any = await pool.query(
          'SELECT id, name, email, phone, role, registration_number as registrationNumber, created_at as createdAt FROM users'
        );
        return rows;
      } catch (e) {
        console.error('MySQL getAllUsers error:', e);
        return [];
      }
    }
    const store = initFallbackFile();
    return store.users || [];
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
    await ensureDb();
    if (pool && !useFallbackStorage) {
      try {
        if ('registrationNumber' in updates) {
          await pool.query('UPDATE users SET registration_number = ? WHERE id = ?', [updates.registrationNumber || null, id]);
        }
        if (updates.name) {
          await pool.query('UPDATE users SET name = ? WHERE id = ?', [updates.name, id]);
        }
        return true;
      } catch (e) {
        console.warn('MySQL updateUser error:', e);
        return false;
      }
    }

    const store = initFallbackFile();
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      store.users[idx] = { ...store.users[idx], ...updates };
      saveFallbackStore(store);
      return true;
    }
    return false;
  },

  async deleteUser(id: string): Promise<boolean> {
    if (pool && !useFallbackStorage) {
      try {
        const [res]: any = await pool.query('DELETE FROM users WHERE id = ? OR registration_number = ? OR email = ?', [id, id, id]);
        return res.affectedRows > 0;
      } catch (e) {
        console.error('MySQL deleteUser error:', e);
        return false;
      }
    }

    const store = initFallbackFile();
    const initialCount = store.users.length;
    store.users = store.users.filter((u) => u.id !== id && u.registrationNumber !== id && u.email !== id && u.phone !== id);
    if (store.users.length !== initialCount) {
      saveFallbackStore(store);
      return true;
    }
    return false;
  },

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'registrationNumber'> & { passwordHash: string; registrationNumber?: string }): Promise<User> {
    await ensureDb();
    const id = 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const createdAt = new Date().toISOString();

    // Enforce Unique Email Address per candidate
    if (user.email) {
      const cleanEmail = user.email.trim().toLowerCase();
      const existingEmailUser = await this.findUserByEmail(cleanEmail);
      if (existingEmailUser) {
        throw new Error(`Email address "${cleanEmail}" is already registered. Duplicate email accounts are prohibited.`);
      }
    }

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

    if (pool && !useFallbackStorage) {
      await pool.query(
        'INSERT INTO users (id, name, email, phone, password_hash, role, registration_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, user.name, user.email, user.phone, user.passwordHash, user.role, registrationNumber || null, toMySqlDatetime(createdAt)]
      );
      return newUser;
    }

    const store = initFallbackFile();
    store.users.push(newUser);
    saveFallbackStore(store);
    return newUser;
  },

  // Applications
  async getApplications(): Promise<Application[]> {
    await ensureDb();
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const officialApps = store.applications.filter(
        a => a.status !== 'draft'
      );
      return officialApps.map(a => {
        const user = store.users.find(u => u.id === a.userId);
        const resolvedName = (a.personalInfo?.fullName && a.personalInfo.fullName !== 'Temp Delete Test' && a.personalInfo.fullName.trim() !== '')
          ? a.personalInfo.fullName
          : (user?.name || 'Applicant');

        return {
          ...a,
          registrationNumber: a.registrationNumber || a.applicationNumber,
          applicationNumber: a.applicationNumber || a.registrationNumber,
          studyLocationPref: a.studyLocationPref || a.examCentrePref,
          examCentrePref: a.examCentrePref || a.studyLocationPref,
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
      WHERE a.status != 'draft'
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
    await ensureDb();
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
      studyLocationPref: typeof r.exam_centre_pref === 'string' ? JSON.parse(r.exam_centre_pref) : (r.exam_centre_pref || { firstPreference: 'Gurukul Nilokheri' }),
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
    await ensureDb();
    if (pool && !useFallbackStorage) {
      try {
        const [rows]: any = await pool.query(
          'SELECT id FROM applications WHERE user_id = ? OR application_number = ? OR registration_number = ? ORDER BY created_at DESC LIMIT 1',
          [userId, userId, userId]
        );
        if (!rows.length) return null;
        return this.getApplicationById(rows[0].id);
      } catch (e) {
        console.error('MySQL getApplicationByUserId error:', e);
        return null;
      }
    }

    const store = initFallbackFile();
    let a = store.applications.find((app) => app.userId === userId);
    const user = store.users.find(u => u.id === userId || u.email === userId || u.registrationNumber === userId);
    if (!a && user) {
      const userEmail = user.email ? user.email.toLowerCase() : '';
      const userPhone = user.phone ? user.phone.replace(/\D/g, '').slice(-10) : '';
      a = store.applications.find(app =>
        app.userId === user.id ||
        (userEmail && app.personalInfo?.candidateEmail?.toLowerCase() === userEmail) ||
        (user.registrationNumber && (app.registrationNumber === user.registrationNumber || app.applicationNumber === user.registrationNumber)) ||
        (userPhone && (app.personalInfo?.candidateMobile?.replace(/\D/g, '').slice(-10) === userPhone || app.parentInfo?.fatherPhone?.replace(/\D/g, '').slice(-10) === userPhone))
      );
    }
    if (!a) return null;
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
  },

  async findApplicationByAadhaar(aadhaarNumber: string): Promise<Application | null> {
    await ensureDb();
    const clean = aadhaarNumber ? aadhaarNumber.replace(/\D/g, '') : '';
    if (!clean) return null;

    const allApps = await this.getApplications();
    const found = allApps.find((a) => {
      const aClean = (a.personalInfo?.aadhaarNumber || '').replace(/\D/g, '');
      return aClean === clean && a.status !== 'rejected';
    });
    return found || null;
  },

  async findApplicationByEmail(email: string): Promise<Application | null> {
    await ensureDb();
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;
    if (pool && !useFallbackStorage) {
      try {
        const [rows]: any = await pool.query(
          `SELECT a.*, u.email as user_email, u.phone as user_phone
           FROM applications a
           LEFT JOIN users u ON a.user_id = u.id
           WHERE LOWER(u.email) = ? OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(a.personal_info, '$.candidateEmail'))) = ?
           ORDER BY a.created_at DESC
           LIMIT 1`,
          [cleanEmail, cleanEmail]
        );
        if (rows && rows.length > 0) {
          return this.getApplicationById(rows[0].id);
        }
        return null;
      } catch (e) {
        console.warn('MySQL findApplicationByEmail error:', e);
        return null;
      }
    }
    const store = initFallbackFile();
    const found = store.applications.find(a => 
      (a.personalInfo?.candidateEmail && a.personalInfo.candidateEmail.toLowerCase() === cleanEmail)
    );
    return found || null;
  },


  async getNextRegistrationNumber(gender: 'Male' | 'Female'): Promise<string> {
    await ensureDb();
    const isFemale = (gender || '').toLowerCase() === 'female';
    const prefix = isFemale ? 'NILG-' : 'NILB-';
    const regex = new RegExp(`^${prefix}(\\d+)`, 'i');
    let maxSeq = 0;

    const checkReg = (val?: string | null) => {
      if (!val) return;
      const m = val.match(regex);
      if (m && m[1]) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    };

    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      store.users.forEach(u => checkReg(u.registrationNumber));
      store.applications.forEach(a => {
        checkReg(a.registrationNumber);
        checkReg(a.applicationNumber);
      });
      const nextSeq = maxSeq + 1;
      return `${prefix}${String(nextSeq).padStart(5, '0')}`;
    }

    try {
      const [userRows]: any = await pool.query('SELECT registration_number FROM users WHERE registration_number LIKE ?', [`${prefix}%`]);
      const [appRows]: any = await pool.query('SELECT application_number FROM applications WHERE application_number LIKE ?', [`${prefix}%`]);
      userRows.forEach((r: any) => checkReg(r.registration_number));
      appRows.forEach((r: any) => checkReg(r.application_number));
      const nextSeq = maxSeq + 1;
      return `${prefix}${String(nextSeq).padStart(5, '0')}`;
    } catch {
      const nextSeq = maxSeq + 1;
      return `${prefix}${String(nextSeq).padStart(5, '0')}`;
    }
  },

  getClassCode(classApplying?: string | null): string {
    if (!classApplying) return '06';
    const num = String(classApplying).replace(/\D/g, '');
    if (!num) return '06';
    return num.padStart(2, '0');
  },

  async getNextRollNumber(classApplyingOrGender?: string, genderParam?: string, streamParam?: string): Promise<string> {
    let classApplying = 'Class 6';
    let gender = genderParam;
    let stream = streamParam;

    if (classApplyingOrGender) {
      if (/\d/.test(classApplyingOrGender)) {
        classApplying = classApplyingOrGender;
      } else if (!gender) {
        gender = classApplyingOrGender;
      }
    }

    const classCode = this.getClassCode(classApplying);
    const isFemale =
      (gender || '').trim().toLowerCase() === 'female' ||
      (gender || '').trim().toLowerCase() === 'girl' ||
      (gender || '').trim().toUpperCase().startsWith('NILG');

    const prefix = `27${classCode}`;
    const regex = new RegExp(`^${prefix}(\\d{4,})$`);

    let minSeq = 0;
    let maxLimit = 5000;

    if (classCode === '11') {
      // Class 11 Stream-wise and Gender-wise Roll Number ranges:
      // Non Medical: Boys 0001 - 1000 (starts 27110001), Girls 1001 - 2000 (starts 27111001)
      // Medical:     Boys 2001 - 3000 (starts 27112001), Girls 3001 - 4000 (starts 27113001)
      // Commerce:    Boys 4001 - 5000 (starts 27114001), Girls 5001 - 6000 (starts 27115001)
      // Humanities:  Boys 6001 - 7000 (starts 27116001), Girls 7001 - 8000 (starts 27117001)
      const normStream = (stream || '').trim().toLowerCase().replace(/[^a-z]/g, '');

      if (normStream.includes('nonmed')) {
        minSeq = isFemale ? 1000 : 0;
        maxLimit = isFemale ? 2000 : 1000;
      } else if (normStream.includes('med')) {
        minSeq = isFemale ? 3000 : 2000;
        maxLimit = isFemale ? 4000 : 3000;
      } else if (normStream.includes('com')) {
        minSeq = isFemale ? 5000 : 4000;
        maxLimit = isFemale ? 6000 : 5000;
      } else if (normStream.includes('human') || normStream.includes('art')) {
        minSeq = isFemale ? 7000 : 6000;
        maxLimit = isFemale ? 8000 : 7000;
      } else {
        // Fallback default: Non Medical range
        minSeq = isFemale ? 1000 : 0;
        maxLimit = isFemale ? 2000 : 1000;
      }
    } else {
      // Other classes (5, 6, 7, 8, 9, 10):
      // Boys: starts from 0001 up to 5000 (Centre: Aryakulam Nilokheri)
      // Girls: starts from 5001 up to 10000 (Centre: The Gurukul Nilokheri)
      minSeq = isFemale ? 5000 : 0;
      maxLimit = isFemale ? 10000 : 5000;
    }

    let maxSeq = minSeq;

    const checkRoll = (val?: string | null) => {
      if (!val) return;
      const m = String(val).trim().match(regex);
      if (m && m[1]) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxSeq && num <= maxLimit && num > minSeq) {
          maxSeq = num;
        }
      }
    };

    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      (store.admitCards || []).forEach(c => checkRoll(c.rollNumber));
      (store.applications || []).forEach(a => checkRoll(a.rollNumber));
      const nextSeq = Math.min(maxSeq + 1, maxLimit);
      return `${prefix}${String(nextSeq).padStart(4, '0')}`;
    }

    try {
      const [admitRows]: any = await pool.query('SELECT roll_number FROM admit_cards WHERE roll_number LIKE ?', [`${prefix}%`]);
      const [appRows]: any = await pool.query('SELECT roll_number FROM applications WHERE roll_number LIKE ?', [`${prefix}%`]);
      admitRows.forEach((r: any) => checkRoll(r.roll_number));
      appRows.forEach((r: any) => checkRoll(r.roll_number));
      const nextSeq = Math.min(maxSeq + 1, maxLimit);
      return `${prefix}${String(nextSeq).padStart(4, '0')}`;
    } catch {
      const nextSeq = Math.min(maxSeq + 1, maxLimit);
      return `${prefix}${String(nextSeq).padStart(4, '0')}`;
    }
  },

  async saveTempApplication(sessionId: string, data: any): Promise<void> {
    await ensureDb();
    if (pool && !useFallbackStorage) {
      try {
        await pool.query(
          `INSERT INTO temp_applications (session_id, data, updated_at) 
           VALUES (?, ?, NOW()) 
           ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()`,
          [sessionId, JSON.stringify(data)]
        );
        return;
      } catch (e) {
        console.warn('MySQL saveTempApplication error:', e);
      }
    }

    const store = initFallbackFile();
    if (!store.tempApplications) store.tempApplications = {};
    store.tempApplications[sessionId] = {
      ...(store.tempApplications[sessionId] || {}),
      ...data,
      sessionId,
      updatedAt: new Date().toISOString(),
    };
    saveFallbackStore(store);
  },

  async getTempApplication(sessionId: string): Promise<any | null> {
    await ensureDb();
    if (pool && !useFallbackStorage) {
      try {
        const [rows]: any = await pool.query('SELECT data FROM temp_applications WHERE session_id = ? LIMIT 1', [sessionId]);
        if (rows && rows.length > 0) {
          return typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        }
        return null;
      } catch (e) {
        console.warn('MySQL getTempApplication error:', e);
      }
    }

    const store = initFallbackFile();
    if (!store.tempApplications) return null;
    return store.tempApplications[sessionId] || null;
  },

  async deleteTempApplication(sessionId: string): Promise<void> {
    await ensureDb();
    if (pool && !useFallbackStorage) {
      try {
        await pool.query('DELETE FROM temp_applications WHERE session_id = ?', [sessionId]);
      } catch (e) {
        console.warn('MySQL deleteTempApplication error:', e);
      }
      return;
    }

    const store = initFallbackFile();
    if (store.tempApplications && store.tempApplications[sessionId]) {
      delete store.tempApplications[sessionId];
      saveFallbackStore(store);
    }
  },

  async createApplication(app: Omit<Application, 'id' | 'registrationNumber' | 'applicationNumber' | 'createdAt' | 'updatedAt'> & { registrationNumber?: string }): Promise<Application> {
    await ensureDb();
    const gender = (app.personalInfo?.gender || 'Male') as 'Male' | 'Female';
    const id = 'app-' + Date.now();
    const now = new Date().toISOString();
    const studyLocation = app.studyLocationPref || app.examCentrePref || { firstPreference: 'Gurukul Nilokheri' };

    let user: User | null = null;
    if (app.userId) {
      user = (await this.getUserById(app.userId)) || (await this.findUserByIdentifier(app.userId));
    }

    const regNumber = app.registrationNumber || user?.registrationNumber || await this.getNextRegistrationNumber(gender);
    const candidateName = (app.personalInfo?.fullName && app.personalInfo.fullName !== 'Temp Delete Test' && app.personalInfo.fullName.trim() !== '')
      ? app.personalInfo.fullName
      : (user?.name || 'Applicant');

    const newApp: Application = {
      ...app,
      id,
      registrationNumber: regNumber,
      applicationNumber: regNumber,
      rollNumber: app.rollNumber || undefined,
      studyLocationPref: studyLocation,
      examCentrePref: studyLocation,
      amountPaid: (app.amountPaid && app.amountPaid >= 500) ? app.amountPaid : 800,
      personalInfo: {
        ...app.personalInfo,
        fullName: candidateName,
        candidateEmail: app.personalInfo?.candidateEmail || user?.email || '',
        candidateMobile: app.personalInfo?.candidateMobile || user?.phone || '',
      } as any,
      createdAt: now,
      updatedAt: now,
    };

    if (pool && !useFallbackStorage) {
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
            JSON.stringify(newApp.personalInfo),
            JSON.stringify(app.parentInfo),
            JSON.stringify(app.addressInfo),
            JSON.stringify(app.academicInfo),
            JSON.stringify(newApp.examCentrePref),
            JSON.stringify(app.documents || {}),
            app.status,
            app.remarks || null,
            app.paymentStatus,
            newApp.amountPaid,
            app.transactionId || null,
            toMySqlDatetime(),
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
          JSON.stringify(newApp.personalInfo),
          JSON.stringify(app.parentInfo),
          JSON.stringify(app.addressInfo),
          JSON.stringify(app.academicInfo),
          JSON.stringify(newApp.examCentrePref),
          JSON.stringify(app.documents || {}),
          app.status,
          app.remarks || null,
          app.paymentStatus,
          newApp.amountPaid,
          app.transactionId || null,
          toMySqlDatetime(),
          toMySqlDatetime(),
        ]
      );
      return newApp;
    }

    const store = initFallbackFile();
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
  },

  async saveDraftApplication(draft: Partial<Application> & { userId: string }): Promise<Application> {
    await ensureDb();
    const now = new Date().toISOString();

    if (pool && !useFallbackStorage) {
      const user = (await this.getUserById(draft.userId)) || (await this.findUserByIdentifier(draft.userId));
      const [existingRows]: any = await pool.query('SELECT * FROM applications WHERE user_id = ? LIMIT 1', [draft.userId]);

      if (existingRows.length > 0) {
        const r = existingRows[0];
        const existingPersonal = typeof r.personal_info === 'string' ? JSON.parse(r.personal_info) : (r.personal_info || {});
        const mergedPersonal = {
          ...existingPersonal,
          ...(draft.personalInfo || {}),
        };
        if (!mergedPersonal.fullName || mergedPersonal.fullName === 'Temp Delete Test' || mergedPersonal.fullName.trim() === '') {
          mergedPersonal.fullName = user?.name || existingPersonal.fullName || 'Applicant';
        }
        if (!mergedPersonal.candidateEmail) mergedPersonal.candidateEmail = user?.email || '';
        if (!mergedPersonal.candidateMobile) mergedPersonal.candidateMobile = user?.phone || '';

        const existingParent = typeof r.parent_info === 'string' ? JSON.parse(r.parent_info) : (r.parent_info || {});
        const existingAddress = typeof r.address_info === 'string' ? JSON.parse(r.address_info) : (r.address_info || {});
        const existingAcademic = typeof r.academic_info === 'string' ? JSON.parse(r.academic_info) : (r.academic_info || {});
        const existingCentre = typeof r.exam_centre_pref === 'string' ? JSON.parse(r.exam_centre_pref) : (r.exam_centre_pref || {});
        const existingDocs = typeof r.documents === 'string' ? JSON.parse(r.documents) : (r.documents || {});

        const updatedApp: Application = {
          id: r.id,
          userId: r.user_id,
          registrationNumber: r.registration_number || r.application_number,
          applicationNumber: r.application_number || r.registration_number,
          rollNumber: r.roll_number || undefined,
          classApplying: draft.classApplying || r.class_applying,
          personalInfo: mergedPersonal,
          parentInfo: draft.parentInfo ? { ...existingParent, ...draft.parentInfo } : existingParent,
          addressInfo: draft.addressInfo ? { ...existingAddress, ...draft.addressInfo } : existingAddress,
          academicInfo: draft.academicInfo ? { ...existingAcademic, ...draft.academicInfo } : existingAcademic,
          examCentrePref: draft.examCentrePref ? { ...existingCentre, ...draft.examCentrePref } : existingCentre,
          studyLocationPref: (draft.studyLocationPref || draft.examCentrePref || existingCentre || { firstPreference: 'Gurukul Nilokheri' }) as any,
          documents: draft.documents ? { ...existingDocs, ...draft.documents } : existingDocs,
          status: (r.status === 'submitted' || r.status === 'approved') ? r.status : 'draft',
          currentStep: draft.currentStep || 1,
          paymentStatus: r.payment_status || 'pending',
          amountPaid: parseFloat(r.amount_paid || 0),
          transactionId: r.transaction_id || undefined,
          createdAt: r.created_at,
          updatedAt: now,
        };

        await pool.query(
          `UPDATE applications SET
            class_applying = ?, personal_info = ?, parent_info = ?,
            address_info = ?, academic_info = ?, exam_centre_pref = ?,
            documents = ?, updated_at = ?
           WHERE id = ?`,
          [
            updatedApp.classApplying,
            JSON.stringify(updatedApp.personalInfo),
            JSON.stringify(updatedApp.parentInfo),
            JSON.stringify(updatedApp.addressInfo),
            JSON.stringify(updatedApp.academicInfo),
            JSON.stringify(updatedApp.examCentrePref),
            JSON.stringify(updatedApp.documents || {}),
            now,
            r.id,
          ]
        );
        return updatedApp;
      }

      // No existing draft in MySQL: insert new draft
      const id = 'app-draft-' + Date.now();
      const [countRows]: any = await pool.query('SELECT COUNT(*) as count FROM applications');
      const tempNumber = `DRAFT-${(countRows[0]?.count || 0) + 10001}`;
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
        studyLocationPref: (draft.studyLocationPref || draft.examCentrePref || { firstPreference: 'Gurukul Nilokheri' }) as any,
        documents: draft.documents || {},
        status: 'draft',
        currentStep: draft.currentStep || 1,
        paymentStatus: 'pending',
        amountPaid: 0,
        createdAt: now,
        updatedAt: now,
      };

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
          JSON.stringify(newDraft.documents || {}),
          'draft',
          null,
          'pending',
          0,
          null,
          toMySqlDatetime(),
          toMySqlDatetime(),
        ]
      );
      return newDraft;
    }

    const store = initFallbackFile();
    const user = store.users.find(u => u.id === draft.userId);
    const existingIndex = store.applications.findIndex(a => a.userId === draft.userId);

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
      studyLocationPref: (draft.studyLocationPref || draft.examCentrePref || { firstPreference: 'Gurukul Nilokheri' }) as any,
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

    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      const idx = store.applications.findIndex((a) => a.id === id || a.applicationNumber === id || a.registrationNumber === id);
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
      return updated;
    }

    // Database mode (MySQL)
    const existing = await this.getApplicationById(id);
    if (!existing) return null;

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

    try {
      await pool.query(
        `UPDATE applications SET
          status = ?, remarks = ?, personal_info = ?, academic_info = ?,
          documents = ?, updated_at = ?
         WHERE id = ? OR application_number = ? OR registration_number = ?`,
        [
          updated.status,
          updated.remarks || null,
          JSON.stringify(updated.personalInfo),
          JSON.stringify(updated.academicInfo),
          JSON.stringify(updated.documents || {}),
          now,
          existing.id,
          existing.applicationNumber || existing.id,
          existing.registrationNumber || existing.id,
        ]
      );
    } catch (e) {
      console.warn('MySQL updateApplicationDetails error:', e);
      return null;
    }

    return updated;
  },

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application | null> {
    return this.updateApplicationDetails(id, updates);
  },

  async deleteApplication(id: string): Promise<boolean> {
    if (pool && !useFallbackStorage) {
      try {
        await pool.query('DELETE FROM admit_cards WHERE application_id = ? OR application_number = ?', [id, id]);
        const [res]: any = await pool.query('DELETE FROM applications WHERE id = ? OR application_number = ? OR registration_number = ?', [id, id, id]);
        return res.affectedRows > 0;
      } catch (e) {
        console.error('MySQL deleteApplication error:', e);
        return false;
      }
    }

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
    let card: AdmitCard | null = null;
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      card = store.admitCards.find((c) => c.applicationId === applicationId || c.applicationNumber === applicationId || c.rollNumber === applicationId) || null;
    } else {
      const [rows]: any = await pool.query('SELECT * FROM admit_cards WHERE application_id = ? OR application_number = ? OR roll_number = ? LIMIT 1', [applicationId, applicationId, applicationId]);
      if (rows.length) {
        const r = rows[0];
        card = {
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
      }
    }

    if (!card) return null;

    // Fetch matching application to enrich details
    try {
      const app = await this.getApplicationById(card.applicationId) || 
                  (await this.getApplications()).find(a => 
                    a.registrationNumber === card?.applicationNumber || 
                    a.applicationNumber === card?.applicationNumber ||
                    a.rollNumber === card?.rollNumber
                  );
      if (app) {
        card.motherName = app.parentInfo?.motherName || 'MEENA';
        card.previousSchoolName = app.academicInfo?.previousSchoolName || app.personalInfo?.previousSchoolName || 'KL INTERNATIONAL SCHOOL';
        card.aadhaarNumber = app.personalInfo?.aadhaarNumber || '740766742979';
        const addressParts = [
          app.addressInfo?.streetAddress,
          app.addressInfo?.city,
          app.addressInfo?.district,
          app.addressInfo?.state,
          app.addressInfo?.pincode
        ].filter(Boolean);
        card.address = addressParts.length > 0 ? addressParts.join(', ') : 'HOME NO- 45, KRISHNA GADARN COLONY, THANA- GANGANAGAR, AMEDA ROAD';
        if (app.documents?.photo) {
          card.candidatePhotoUrl = app.documents.photo;
        }
      }
      // Gender-based exam center, reporting time, and date rules:
      // Boys: 14 Feb 2027, 9:30 AM, Aryakulam Nilokheri
      // Girls: 14 Feb 2027, 8:30 AM, The Gurukul Nilokheri
      const examGender = app?.personalInfo?.gender;
      const examRegNo = card.applicationNumber || app?.registrationNumber;
      const examDetails = getExamDetailsForGender(examGender, examRegNo);

      card.examCentreName = examDetails.examCentreName;
      card.examCentreAddress = examDetails.examCentreAddress;
      card.examDate = examDetails.examDate;
      card.reportingTime = examDetails.reportingTime;
      card.examDuration = examDetails.examDuration;
    } catch (err) {
      console.warn('Admit card enrichment error:', err);
    }

    return card;
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

  async getAllResults(): Promise<ExamResult[]> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      return store.results || [];
    }
    try {
      const [rows]: any = await pool.query('SELECT * FROM results ORDER BY id DESC');
      return rows.map((r: any) => ({
        id: r.id,
        applicationId: r.application_id,
        applicationNumber: r.application_number,
        rollNumber: r.roll_number,
        candidateName: r.candidate_name,
        dob: r.dob,
        classApplying: r.class_applying,
        subjects: typeof r.subjects === 'string' ? JSON.parse(r.subjects) : (r.subjects || []),
        totalMarks: parseFloat(r.total_marks) || 0,
        maxTotalMarks: parseFloat(r.max_total_marks) || 0,
        percentage: parseFloat(r.percentage) || 0,
        rank: parseInt(r.rank, 10) || 0,
        qualifyingStatus: r.qualifying_status,
        counselingDate: r.counseling_date,
        counselingVenue: r.counseling_venue,
        isPublished: Boolean(r.is_published),
        remarks: r.remarks,
      }));
    } catch {
      const store = initFallbackFile();
      return store.results || [];
    }
  },

  async getResultByRollAndDob(rollNumber: string, dob?: string): Promise<ExamResult | null> {
    const cleanRoll = rollNumber.trim().toLowerCase();
    const normalizeDate = (d: string) => d.trim().replace(/[/.-]/g, '');
    const cleanDob = dob ? normalizeDate(dob) : '';

    const results = await this.getAllResults();
    const found = results.find((r) => {
      const rRoll = (r.rollNumber || '').trim().toLowerCase();
      const rApp = (r.applicationNumber || '').trim().toLowerCase();
      const matchRoll = rRoll === cleanRoll || rApp === cleanRoll;
      if (!matchRoll) return false;

      if (!cleanDob) return true;

      const rDob = r.dob ? normalizeDate(r.dob) : '';
      if (rDob) {
        // Match formatted YYYYMMDD vs DDMMYYYY or direct
        if (rDob === cleanDob) return true;
        // Check reverse date components (YYYYMMDD vs DDMMYYYY)
        const d1 = cleanDob;
        const d2 = rDob;
        if (d1.length === 8 && d2.length === 8) {
          // If d1 is YYYYMMDD (20140512) and d2 is DDMMYYYY (12052014)
          const rev1 = d1.slice(6, 8) + d1.slice(4, 6) + d1.slice(0, 4);
          const rev2 = d2.slice(6, 8) + d2.slice(4, 6) + d2.slice(0, 4);
          if (rDob === rev1 || cleanDob === rev2) return true;
        }
        return false;
      }

      return true;
    });

    return found || null;
  },

  async clearResults(): Promise<void> {
    if (useFallbackStorage || !pool) {
      const store = initFallbackFile();
      store.results = [];
      saveFallbackStore(store);
      return;
    }
    try {
      await pool.query('DELETE FROM results');
    } catch {
      const store = initFallbackFile();
      store.results = [];
      saveFallbackStore(store);
    }
  },

  async bulkSaveResults(results: ExamResult[]): Promise<{ count: number }> {
    for (const r of results) {
      await this.publishResult(r);
    }
    return { count: results.length };
  },

  async createResult(result: ExamResult): Promise<ExamResult> {
    return this.publishResult(result);
  },

  async areResultsDeclared(): Promise<boolean> {
    if (pool && !useFallbackStorage) {
      try {
        const [rows]: any = await pool.query(
          "SELECT results_declared FROM system_settings LIMIT 1"
        );
        return Boolean(rows[0]?.results_declared);
      } catch (e) {
        console.warn('MySQL areResultsDeclared error:', e);
        return false;
      }
    }
    const store = initFallbackFile();
    return store.settings?.resultsDeclared === true;
  },

  // Settings & Exam Centres
  async getSettings(): Promise<SystemSettings> {
    await ensureDb();
    if (pool && !useFallbackStorage) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM system_settings LIMIT 1');
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            portalOpen: Boolean(r.portal_open),
            resultsDeclared: Boolean(r.results_declared),
            admitCardsReleased: Boolean(r.admit_cards_released),
            admitCardsReleasedAt: r.admit_cards_released_at ? new Date(r.admit_cards_released_at).toISOString() : undefined,
            academicSession: r.academic_session || DEFAULT_SETTINGS.academicSession,
            applicationFee: parseFloat(r.application_fee || DEFAULT_SETTINGS.applicationFee),
            registrationStartDate: r.registration_start_date || DEFAULT_SETTINGS.registrationStartDate,
            registrationEndDate: r.registration_end_date || DEFAULT_SETTINGS.registrationEndDate,
            admitCardReleaseDate: r.admit_card_release_date || DEFAULT_SETTINGS.admitCardReleaseDate,
            entranceExamDate: r.entrance_exam_date || DEFAULT_SETTINGS.entranceExamDate,
            entranceExamTime: r.entrance_exam_time || DEFAULT_SETTINGS.entranceExamTime,
            examVenueName: r.exam_venue_name || DEFAULT_SETTINGS.examVenueName,
            examVenueAddress: r.exam_venue_address || DEFAULT_SETTINGS.examVenueAddress,
            resultDeclarationDate: r.result_declaration_date || DEFAULT_SETTINGS.resultDeclarationDate,
            counselingStartDate: r.counseling_start_date || DEFAULT_SETTINGS.counselingStartDate,
            helplinePhone: r.helpline_phone || DEFAULT_SETTINGS.helplinePhone,
            helplineEmail: r.helpline_email || DEFAULT_SETTINGS.helplineEmail,
            activeStudyLocations: r.active_study_locations ? (typeof r.active_study_locations === 'string' ? JSON.parse(r.active_study_locations) : r.active_study_locations) : DEFAULT_SETTINGS.activeStudyLocations,
          };
        }
      } catch (e) {
        console.warn('MySQL getSettings error:', e);
      }
    }
    const store = initFallbackFile();
    return store.settings || DEFAULT_SETTINGS;
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    await ensureDb();
    if (pool && !useFallbackStorage) {
      try {
        const [rows]: any = await pool.query('SELECT id FROM system_settings LIMIT 1');
        const now = new Date().toISOString();
        const setClauses: string[] = ['updated_at = ?'];
        const values: any[] = [now];

        if (settings.portalOpen !== undefined) {
          setClauses.push('portal_open = ?');
          values.push(settings.portalOpen ? 1 : 0);
        }
        if (settings.resultsDeclared !== undefined) {
          setClauses.push('results_declared = ?');
          values.push(settings.resultsDeclared ? 1 : 0);
        }
        if (settings.admitCardsReleased !== undefined) {
          setClauses.push('admit_cards_released = ?');
          values.push(settings.admitCardsReleased ? 1 : 0);
        }
        if (settings.admitCardsReleasedAt !== undefined) {
          setClauses.push('admit_cards_released_at = ?');
          values.push(settings.admitCardsReleasedAt);
        }
        if (settings.academicSession !== undefined) {
          setClauses.push('academic_session = ?');
          values.push(settings.academicSession);
        }
        if (settings.applicationFee !== undefined) {
          setClauses.push('application_fee = ?');
          values.push(settings.applicationFee);
        }
        if (settings.registrationStartDate !== undefined) {
          setClauses.push('registration_start_date = ?');
          values.push(settings.registrationStartDate);
        }
        if (settings.registrationEndDate !== undefined) {
          setClauses.push('registration_end_date = ?');
          values.push(settings.registrationEndDate);
        }
        if (settings.admitCardReleaseDate !== undefined) {
          setClauses.push('admit_card_release_date = ?');
          values.push(settings.admitCardReleaseDate);
        }
        if (settings.entranceExamDate !== undefined) {
          setClauses.push('entrance_exam_date = ?');
          values.push(settings.entranceExamDate);
        }
        if (settings.resultDeclarationDate !== undefined) {
          setClauses.push('result_declaration_date = ?');
          values.push(settings.resultDeclarationDate);
        }
        if (settings.counselingStartDate !== undefined) {
          setClauses.push('counseling_start_date = ?');
          values.push(settings.counselingStartDate);
        }
        if (settings.helplinePhone !== undefined) {
          setClauses.push('helpline_phone = ?');
          values.push(settings.helplinePhone);
        }
        if (settings.helplineEmail !== undefined) {
          setClauses.push('helpline_email = ?');
          values.push(settings.helplineEmail);
        }

        if (rows && rows.length > 0) {
          values.push(rows[0].id);
          await pool.query(`UPDATE system_settings SET ${setClauses.join(', ')} WHERE id = ?`, values);
        } else {
          await pool.query(
            `INSERT INTO system_settings (portal_open, results_declared, academic_session, application_fee, registration_start_date, registration_end_date, admit_card_release_date, entrance_exam_date, result_declaration_date, counseling_start_date, helpline_phone, helpline_email)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              settings.portalOpen ? 1 : 0,
              settings.resultsDeclared ? 1 : 0,
              settings.academicSession || '2027-2028',
              settings.applicationFee || 800,
              settings.registrationStartDate || '2026-09-01',
              settings.registrationEndDate || '2027-01-31',
              settings.admitCardReleaseDate || '2027-03-01',
              settings.entranceExamDate || '2027-02-14',
              settings.resultDeclarationDate || '2027-03-01',
              settings.counselingStartDate || '2027-03-10',
              settings.helplinePhone || '+91 7027849858 / 59',
              settings.helplineEmail || 'thegurukulnilokheri@gmail.com',
            ]
          );
        }
        return await this.getSettings();
      } catch (e) {
        console.warn('MySQL updateSettings error:', e);
      }
    }
    const store = initFallbackFile();
    store.settings = { ...store.settings, ...settings };
    saveFallbackStore(store);
    return store.settings;
  },

  async getCentres(): Promise<ExamCentre[]> {
    await ensureDb();
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
    await ensureDb();
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
      return newCentre;
    }

    const store = initFallbackFile();
    if (!store.examCentres) store.examCentres = [...DEFAULT_CENTRES];
    store.examCentres.push(newCentre);
    saveFallbackStore(store);
    return newCentre;
  },

  async updateCentre(id: string, updates: Partial<ExamCentre>): Promise<ExamCentre | null> {
    await ensureDb();
    if (pool && !useFallbackStorage) {
      const existing = await this.getCentreById(id);
      if (!existing) return null;
      const updated: ExamCentre = {
        ...existing,
        ...updates,
        capacity: updates.capacity !== undefined ? Number(updates.capacity) : existing.capacity,
      };
      try {
        await pool.query(
          `UPDATE exam_centres SET
            code = ?, name = ?, city = ?, state = ?, capacity = ?,
            address = ?, contact_person = ?, contact_phone = ?
           WHERE id = ?`,
          [updated.code, updated.name, updated.city, updated.state, updated.capacity, updated.address, updated.contactPerson, updated.contactPhone, id]
        );
      } catch (e) {
        console.warn('MySQL updateCentre error:', e);
      }
      return updated;
    }

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
    return updated;
  },

  async deleteCentre(id: string): Promise<boolean> {
    await ensureDb();
    if (pool && !useFallbackStorage) {
      try {
        const [res]: any = await pool.query('DELETE FROM exam_centres WHERE id = ? OR code = ?', [id, id]);
        return res.affectedRows > 0;
      } catch (e) {
        console.warn('MySQL deleteCentre error:', e);
        return false;
      }
    }

    const store = initFallbackFile();
    if (!store.examCentres) store.examCentres = [...DEFAULT_CENTRES];
    const initialLen = store.examCentres.length;
    store.examCentres = store.examCentres.filter((c) => c.id !== id && c.code !== id);
    if (store.examCentres.length === initialLen) return false;
    saveFallbackStore(store);
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
    await ensureDb();
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();
    const newNotification: AdminNotification = {
      ...data,
      id,
      isRead: false,
      createdAt: now,
    };

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
            toMySqlDatetime(),
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
      return newNotification;
    }

    const store = initFallbackFile();
    if (!store.notifications) store.notifications = [];
    store.notifications.unshift(newNotification);
    if (store.notifications.length > 100) {
      store.notifications = store.notifications.slice(0, 100);
    }
    saveFallbackStore(store);
    return newNotification;
  },

  async markAdminNotificationAsRead(id: string): Promise<boolean> {
    await ensureDb();
    if (pool && !useFallbackStorage) {
      try {
        await pool.query('UPDATE admin_notifications SET is_read = TRUE WHERE id = ?', [id]);
        return true;
      } catch (e) {
        console.warn('MySQL markAdminNotificationAsRead error:', e);
        return false;
      }
    }

    const store = initFallbackFile();
    if (!store.notifications) store.notifications = [];
    const notif = store.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      saveFallbackStore(store);
      return true;
    }
    return false;
  },

  async markAllAdminNotificationsAsRead(): Promise<boolean> {
    await ensureDb();
    if (pool && !useFallbackStorage) {
      try {
        await pool.query('UPDATE admin_notifications SET is_read = TRUE');
        return true;
      } catch (e) {
        console.warn('MySQL markAllAdminNotificationsAsRead error:', e);
        return false;
      }
    }

    const store = initFallbackFile();
    if (!store.notifications) store.notifications = [];
    store.notifications.forEach((n) => {
      n.isRead = true;
    });
    saveFallbackStore(store);
    return true;
  },

  // ==========================================
  // --- Contact Enquiries ---
  // ==========================================
  async getContactEnquiries(status?: string): Promise<ContactEnquiry[]> {
    if (pool && !useFallbackStorage) {
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
      }
    }

    const store = initFallbackFile();
    let enqs = store.enquiries || [];
    if (status && status !== 'all') {
      enqs = enqs.filter((e) => e.status === status);
    }
    return [...enqs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getContactEnquiryById(id: string): Promise<ContactEnquiry | null> {
    await ensureDb();
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
        return null;
      } catch (e) {
        console.warn('MySQL getContactEnquiryById error:', e);
        return null;
      }
    }

    const store = initFallbackFile();
    const enq = (store.enquiries || []).find((e) => e.id === id);
    return enq || null;
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
    await ensureDb();
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
            toMySqlDatetime(),
            toMySqlDatetime(),
          ]
        );
      } catch (e) {
        console.warn('MySQL createContactEnquiry error:', e);
      }

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
    }

    const store = initFallbackFile();
    if (!store.enquiries) store.enquiries = [];
    store.enquiries.unshift(newEnq);
    saveFallbackStore(store);

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
    await ensureDb();
    const now = new Date().toISOString();

    if (pool && !useFallbackStorage) {
      try {
        await pool.query(
          'UPDATE contact_enquiries SET status = ?, admin_remarks = ?, updated_at = ? WHERE id = ?',
          [status, remarks || null, now, id]
        );
        return await this.getContactEnquiryById(id);
      } catch (e) {
        console.warn('MySQL updateContactEnquiryStatus error:', e);
        return null;
      }
    }

    const store = initFallbackFile();
    if (!store.enquiries) store.enquiries = [];
    const idx = store.enquiries.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    store.enquiries[idx].status = status;
    if (remarks !== undefined) store.enquiries[idx].adminRemarks = remarks;
    store.enquiries[idx].updatedAt = now;
    const updated = store.enquiries[idx];
    saveFallbackStore(store);
    return updated;
  },

  async createPaymentOrderRecord(record: Omit<PaymentOrderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentOrderRecord> {
    await ensureDb();
    const id = 'pord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    const newRecord: PaymentOrderRecord = {
      ...record,
      id,
      amount: record.amount !== undefined ? record.amount : 1,
      currency: record.currency || 'INR',
      status: record.status || 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    if (pool && !useFallbackStorage) {
      try {
        await pool.query(
          `INSERT INTO payment_orders (
            id, order_id, amount, currency, status, customer_email,
            customer_phone, customer_id, application_id, registration_number,
            application_payload, payment_response, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newRecord.id,
            newRecord.orderId,
            newRecord.amount,
            newRecord.currency,
            newRecord.status,
            newRecord.customerEmail || null,
            newRecord.customerPhone || null,
            newRecord.customerId || null,
            newRecord.applicationId || null,
            newRecord.registrationNumber || null,
            newRecord.applicationPayload ? JSON.stringify(newRecord.applicationPayload) : null,
            newRecord.paymentResponse ? JSON.stringify(newRecord.paymentResponse) : null,
            toMySqlDatetime(),
            toMySqlDatetime(),
          ]
        );
      } catch (e) {
        console.warn('MySQL createPaymentOrderRecord error:', e);
      }
      return newRecord;
    }

    const store = initFallbackFile();
    if (!store.paymentOrders) store.paymentOrders = [];
    store.paymentOrders.push(newRecord);
    saveFallbackStore(store);

    return newRecord;
  },

  async getPaymentOrderByOrderId(orderId: string): Promise<PaymentOrderRecord | null> {
    await ensureDb();
    if (!orderId) return null;

    if (pool && !useFallbackStorage) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM payment_orders WHERE order_id = ? LIMIT 1', [orderId]);
        if (rows && rows.length > 0) {
          const r = rows[0];
          const rec: PaymentOrderRecord = {
            id: r.id,
            orderId: r.order_id,
            amount: parseFloat(r.amount),
            currency: r.currency,
            status: r.status,
            customerEmail: r.customer_email,
            customerPhone: r.customer_phone,
            customerId: r.customer_id,
            applicationId: r.application_id,
            registrationNumber: r.registration_number,
            applicationPayload: typeof r.application_payload === 'string' ? JSON.parse(r.application_payload) : r.application_payload,
            paymentResponse: typeof r.payment_response === 'string' ? JSON.parse(r.payment_response) : r.payment_response,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
          };
          return rec;
        }
        return null;
      } catch (e) {
        console.warn('MySQL getPaymentOrderByOrderId error:', e);
        return null;
      }
    }

    const store = initFallbackFile();
    if (!store.paymentOrders) return null;
    return store.paymentOrders.find(p => p.orderId === orderId) || null;
  },

  async updatePaymentOrderRecord(orderId: string, updates: Partial<PaymentOrderRecord>): Promise<PaymentOrderRecord | null> {
    await ensureDb();
    const now = new Date().toISOString();

    if (pool && !useFallbackStorage) {
      try {
        const setClauses: string[] = ['updated_at = ?'];
        const values: any[] = [toMySqlDatetime()];

        if (updates.status !== undefined) {
          setClauses.push('status = ?');
          values.push(updates.status);
        }
        if (updates.applicationId !== undefined) {
          setClauses.push('application_id = ?');
          values.push(updates.applicationId);
        }
        if (updates.registrationNumber !== undefined) {
          setClauses.push('registration_number = ?');
          values.push(updates.registrationNumber);
        }
        if (updates.paymentResponse !== undefined) {
          setClauses.push('payment_response = ?');
          values.push(JSON.stringify(updates.paymentResponse));
        }

        values.push(orderId);
        await pool.query(`UPDATE payment_orders SET ${setClauses.join(', ')} WHERE order_id = ?`, values);
        return await this.getPaymentOrderByOrderId(orderId);
      } catch (e) {
        console.warn('MySQL updatePaymentOrderRecord error:', e);
        return null;
      }
    }

    const store = initFallbackFile();
    if (!store.paymentOrders) store.paymentOrders = [];
    const idx = store.paymentOrders.findIndex(p => p.orderId === orderId);

    let updatedRecord: PaymentOrderRecord | null = null;
    if (idx !== -1) {
      store.paymentOrders[idx] = {
        ...store.paymentOrders[idx],
        ...updates,
        updatedAt: now,
      };
      updatedRecord = store.paymentOrders[idx];
      saveFallbackStore(store);
    }

    return updatedRecord;
  },
};

// Automatically execute schema init on module load
initDatabase().catch((e) => console.error('Database auto-init error:', e));

