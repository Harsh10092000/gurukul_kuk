const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'data', 'gurukul_store.json');
const auditPath = path.join(__dirname, '..', 'data', 'audit_logs.json');
const schedulePath = path.join(__dirname, '..', 'data', 'form_schedule.json');
const outputPath = path.join(__dirname, '..', 'gurukul_backup.sql');
const outputCopyPath = path.join(__dirname, '..', 'backup.sql');

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'object') {
    return "'" + JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  }
  return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
}

function generateBackup() {
  const store = fs.existsSync(storePath) ? JSON.parse(fs.readFileSync(storePath, 'utf-8')) : {};
  const auditLogs = fs.existsSync(auditPath) ? JSON.parse(fs.readFileSync(auditPath, 'utf-8')) : [];
  const schedule = fs.existsSync(schedulePath) ? JSON.parse(fs.readFileSync(schedulePath, 'utf-8')) : {};

  const lines = [];

  lines.push('-- ====================================================================');
  lines.push('-- Gurukul Kurukshetra - Official Entrance Examination & Management Portal');
  lines.push('-- Complete MySQL Database Backup & Data Dump');
  lines.push(`-- Generated: ${new Date().toISOString()} (IST: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
  lines.push('-- Target Database: gurukul_entrance');
  lines.push('-- Compatible with: MySQL 8.0+, MySQL 9.0+, MariaDB 10.5+, phpMyAdmin');
  lines.push('-- ====================================================================');
  lines.push('');
  lines.push('SET FOREIGN_KEY_CHECKS = 0;');
  lines.push('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";');
  lines.push('SET NAMES utf8mb4;');
  lines.push('');
  lines.push('CREATE DATABASE IF NOT EXISTS `gurukul_entrance` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
  lines.push('USE `gurukul_entrance`;');
  lines.push('');

  // 1. system_settings
  lines.push('-- --------------------------------------------------------------------');
  lines.push('-- Table structure and data for `system_settings`');
  lines.push('-- --------------------------------------------------------------------');
  lines.push('DROP TABLE IF EXISTS `system_settings`;');
  lines.push('CREATE TABLE `system_settings` (');
  lines.push('  `id` INT PRIMARY KEY AUTO_INCREMENT,');
  lines.push('  `portal_open` TINYINT(1) DEFAULT 1,');
  lines.push('  `academic_session` VARCHAR(32) DEFAULT "2026-2027",');
  lines.push('  `application_fee` DECIMAL(10,2) DEFAULT 800.00,');
  lines.push('  `registration_start_date` VARCHAR(32) DEFAULT "2026-09-01",');
  lines.push('  `registration_end_date` VARCHAR(32) DEFAULT "2026-09-30",');
  lines.push('  `admit_card_release_date` VARCHAR(32) DEFAULT "2026-11-20",');
  lines.push('  `entrance_exam_date` VARCHAR(32) DEFAULT "2026-12-10",');
  lines.push('  `result_declaration_date` VARCHAR(32) DEFAULT "2026-12-25",');
  lines.push('  `counseling_start_date` VARCHAR(32) DEFAULT "2027-01-10",');
  lines.push('  `helpline_phone` VARCHAR(64) DEFAULT "+91-1744-259114 / +91-9896328329",');
  lines.push('  `helpline_email` VARCHAR(128) DEFAULT "admissions@gurukulkurukshetra.com",');
  lines.push('  `results_declared` TINYINT(1) DEFAULT 0,');
  lines.push('  `admit_cards_released` TINYINT(1) DEFAULT 0,');
  lines.push('  `admit_cards_released_at` VARCHAR(64) NULL,');
  lines.push('  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  lines.push('');

  const s = store.settings || {};
  lines.push(`INSERT INTO \`system_settings\` (\`id\`, \`portal_open\`, \`academic_session\`, \`application_fee\`, \`registration_start_date\`, \`registration_end_date\`, \`admit_card_release_date\`, \`entrance_exam_date\`, \`result_declaration_date\`, \`counseling_start_date\`, \`helpline_phone\`, \`helpline_email\`, \`results_declared\`, \`admit_cards_released\`, \`admit_cards_released_at\`) VALUES (1, ${escapeSql(s.portalOpen)}, ${escapeSql(s.academicSession || '2026-2027')}, ${escapeSql(s.applicationFee || 800)}, ${escapeSql(s.registrationStartDate || '2026-09-01')}, ${escapeSql(s.registrationEndDate || '2026-09-30')}, ${escapeSql(s.admitCardReleaseDate || '2026-11-20')}, ${escapeSql(s.entranceExamDate || '2026-12-10')}, ${escapeSql(s.resultDeclarationDate || '2026-12-25')}, ${escapeSql(s.counselingStartDate || '2027-01-10')}, ${escapeSql(s.helplinePhone)}, ${escapeSql(s.helplineEmail)}, ${escapeSql(s.resultsDeclared)}, ${escapeSql(s.admitCardsReleased)}, ${escapeSql(s.admitCardsReleasedAt)});`);
  lines.push('');

  // 2. form_schedules
  lines.push('-- --------------------------------------------------------------------');
  lines.push('-- Table structure and data for `form_schedules`');
  lines.push('-- --------------------------------------------------------------------');
  lines.push('DROP TABLE IF EXISTS `form_schedules`;');
  lines.push('CREATE TABLE `form_schedules` (');
  lines.push('  `id` INT PRIMARY KEY AUTO_INCREMENT,');
  lines.push('  `start_date` VARCHAR(64) NOT NULL,');
  lines.push('  `end_date` VARCHAR(64) NOT NULL,');
  lines.push('  `status_override` VARCHAR(32) DEFAULT "auto",');
  lines.push('  `timezone` VARCHAR(64) DEFAULT "Asia/Kolkata (IST)",');
  lines.push('  `announcement_notice` TEXT,');
  lines.push('  `reopened_count` INT DEFAULT 0,');
  lines.push('  `last_updated` VARCHAR(64),');
  lines.push('  `updated_by` VARCHAR(128)');
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  lines.push('');
  lines.push(`INSERT INTO \`form_schedules\` (\`id\`, \`start_date\`, \`end_date\`, \`status_override\`, \`timezone\`, \`announcement_notice\`, \`reopened_count\`, \`last_updated\`, \`updated_by\`) VALUES (1, ${escapeSql(schedule.startDate)}, ${escapeSql(schedule.endDate)}, ${escapeSql(schedule.statusOverride)}, ${escapeSql(schedule.timezone)}, ${escapeSql(schedule.announcementNotice)}, ${escapeSql(schedule.reopenedCount)}, ${escapeSql(schedule.lastUpdated)}, ${escapeSql(schedule.updatedBy)});`);
  lines.push('');

  // 3. users
  lines.push('-- --------------------------------------------------------------------');
  lines.push('-- Table structure and data for `users`');
  lines.push('-- --------------------------------------------------------------------');
  lines.push('DROP TABLE IF EXISTS `users`;');
  lines.push('CREATE TABLE `users` (');
  lines.push('  `id` VARCHAR(64) PRIMARY KEY,');
  lines.push('  `name` VARCHAR(255) NOT NULL,');
  lines.push('  `email` VARCHAR(255) NOT NULL,');
  lines.push('  `phone` VARCHAR(32) NOT NULL,');
  lines.push('  `password_hash` VARCHAR(255) NOT NULL,');
  lines.push('  `role` VARCHAR(32) DEFAULT "applicant",');
  lines.push('  `registration_number` VARCHAR(64) DEFAULT NULL,');
  lines.push('  `created_at` VARCHAR(64) DEFAULT NULL');
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  lines.push('');

  const users = store.users || [];
  if (users.length > 0) {
    lines.push('INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `registration_number`, `created_at`) VALUES');
    const userVals = users.map((u) => {
      return `  (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.phone)}, ${escapeSql(u.passwordHash)}, ${escapeSql(u.role)}, ${escapeSql(u.registrationNumber)}, ${escapeSql(u.createdAt)})`;
    });
    lines.push(userVals.join(',\n') + ';');
    lines.push('');
  }

  // 4. exam_centres
  lines.push('-- --------------------------------------------------------------------');
  lines.push('-- Table structure and data for `exam_centres`');
  lines.push('-- --------------------------------------------------------------------');
  lines.push('DROP TABLE IF EXISTS `exam_centres`;');
  lines.push('CREATE TABLE `exam_centres` (');
  lines.push('  `id` VARCHAR(64) PRIMARY KEY,');
  lines.push('  `code` VARCHAR(32) NOT NULL,');
  lines.push('  `name` VARCHAR(255) NOT NULL,');
  lines.push('  `city` VARCHAR(128) NOT NULL,');
  lines.push('  `state` VARCHAR(128) NOT NULL,');
  lines.push('  `capacity` INT DEFAULT 1000,');
  lines.push('  `address` TEXT,');
  lines.push('  `contact_person` VARCHAR(128),');
  lines.push('  `contact_phone` VARCHAR(32)');
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  lines.push('');

  const centres = store.examCentres || [];
  if (centres.length > 0) {
    lines.push('INSERT INTO `exam_centres` (`id`, `code`, `name`, `city`, `state`, `capacity`, `address`, `contact_person`, `contact_phone`) VALUES');
    const centreVals = centres.map((c) => {
      return `  (${escapeSql(c.id)}, ${escapeSql(c.code)}, ${escapeSql(c.name)}, ${escapeSql(c.city)}, ${escapeSql(c.state)}, ${escapeSql(c.capacity)}, ${escapeSql(c.address)}, ${escapeSql(c.contactPerson)}, ${escapeSql(c.contactPhone)})`;
    });
    lines.push(centreVals.join(',\n') + ';');
    lines.push('');
  }

  // 5. applications
  lines.push('-- --------------------------------------------------------------------');
  lines.push('-- Table structure and data for `applications`');
  lines.push('-- --------------------------------------------------------------------');
  lines.push('DROP TABLE IF EXISTS `applications`;');
  lines.push('CREATE TABLE `applications` (');
  lines.push('  `id` VARCHAR(64) PRIMARY KEY,');
  lines.push('  `application_number` VARCHAR(64) NOT NULL,');
  lines.push('  `registration_number` VARCHAR(64) DEFAULT NULL,');
  lines.push('  `roll_number` VARCHAR(64) DEFAULT NULL,');
  lines.push('  `user_id` VARCHAR(64) NOT NULL,');
  lines.push('  `class_applying` VARCHAR(64) NOT NULL,');
  lines.push('  `stream` VARCHAR(64) DEFAULT NULL,');
  lines.push('  `study_location` VARCHAR(128) DEFAULT NULL,');
  lines.push('  `personal_info` LONGTEXT,');
  lines.push('  `parent_info` LONGTEXT,');
  lines.push('  `address_info` LONGTEXT,');
  lines.push('  `academic_info` LONGTEXT,');
  lines.push('  `exam_centre_pref` LONGTEXT,');
  lines.push('  `documents` LONGTEXT,');
  lines.push('  `status` VARCHAR(32) DEFAULT "submitted",');
  lines.push('  `remarks` TEXT,');
  lines.push('  `payment_status` VARCHAR(32) DEFAULT "pending",');
  lines.push('  `amount_paid` DECIMAL(10,2) DEFAULT 0.00,');
  lines.push('  `transaction_id` VARCHAR(128),');
  lines.push('  `created_at` VARCHAR(64),');
  lines.push('  `updated_at` VARCHAR(64)');
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  lines.push('');

  const applications = store.applications || [];
  if (applications.length > 0) {
    lines.push('INSERT INTO `applications` (`id`, `application_number`, `registration_number`, `roll_number`, `user_id`, `class_applying`, `stream`, `study_location`, `personal_info`, `parent_info`, `address_info`, `academic_info`, `exam_centre_pref`, `documents`, `status`, `remarks`, `payment_status`, `amount_paid`, `transaction_id`, `created_at`, `updated_at`) VALUES');
    const appVals = applications.map((a) => {
      return `  (${escapeSql(a.id)}, ${escapeSql(a.applicationNumber)}, ${escapeSql(a.registrationNumber || a.applicationNumber)}, ${escapeSql(a.rollNumber)}, ${escapeSql(a.userId)}, ${escapeSql(a.classApplying)}, ${escapeSql(a.stream)}, ${escapeSql(a.studyLocation)}, ${escapeSql(a.personalInfo)}, ${escapeSql(a.parentInfo)}, ${escapeSql(a.addressInfo)}, ${escapeSql(a.academicInfo)}, ${escapeSql(a.examCentrePref)}, ${escapeSql(a.documents)}, ${escapeSql(a.status)}, ${escapeSql(a.remarks)}, ${escapeSql(a.paymentStatus)}, ${escapeSql(a.amountPaid)}, ${escapeSql(a.transactionId)}, ${escapeSql(a.createdAt)}, ${escapeSql(a.updatedAt)})`;
    });
    lines.push(appVals.join(',\n') + ';');
    lines.push('');
  }

  // 6. admit_cards
  lines.push('-- --------------------------------------------------------------------');
  lines.push('-- Table structure and data for `admit_cards`');
  lines.push('-- --------------------------------------------------------------------');
  lines.push('DROP TABLE IF EXISTS `admit_cards`;');
  lines.push('CREATE TABLE `admit_cards` (');
  lines.push('  `id` VARCHAR(64) PRIMARY KEY,');
  lines.push('  `application_id` VARCHAR(64) NOT NULL,');
  lines.push('  `application_number` VARCHAR(64) NOT NULL,');
  lines.push('  `roll_number` VARCHAR(64) NOT NULL,');
  lines.push('  `candidate_name` VARCHAR(255) NOT NULL,');
  lines.push('  `father_name` VARCHAR(255) NOT NULL,');
  lines.push('  `class_applying` VARCHAR(64) NOT NULL,');
  lines.push('  `exam_centre_name` VARCHAR(255) NOT NULL,');
  lines.push('  `exam_centre_address` TEXT,');
  lines.push('  `exam_date` VARCHAR(64) NOT NULL,');
  lines.push('  `reporting_time` VARCHAR(64) NOT NULL,');
  lines.push('  `exam_duration` VARCHAR(64) NOT NULL,');
  lines.push('  `room_number` VARCHAR(64),');
  lines.push('  `candidate_photo_url` LONGTEXT,');
  lines.push('  `is_released` TINYINT(1) DEFAULT 0,');
  lines.push('  `instructions` LONGTEXT,');
  lines.push('  `created_at` VARCHAR(64)');
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  lines.push('');

  const admitCards = store.admitCards || [];
  if (admitCards.length > 0) {
    lines.push('INSERT INTO `admit_cards` (`id`, `application_id`, `application_number`, `roll_number`, `candidate_name`, `father_name`, `class_applying`, `exam_centre_name`, `exam_centre_address`, `exam_date`, `reporting_time`, `exam_duration`, `room_number`, `candidate_photo_url`, `is_released`, `instructions`, `created_at`) VALUES');
    const admitVals = admitCards.map((ac) => {
      return `  (${escapeSql(ac.id)}, ${escapeSql(ac.applicationId)}, ${escapeSql(ac.applicationNumber)}, ${escapeSql(ac.rollNumber)}, ${escapeSql(ac.candidateName)}, ${escapeSql(ac.fatherName)}, ${escapeSql(ac.classApplying)}, ${escapeSql(ac.examCentreName)}, ${escapeSql(ac.examCentreAddress)}, ${escapeSql(ac.examDate)}, ${escapeSql(ac.reportingTime)}, ${escapeSql(ac.examDuration)}, ${escapeSql(ac.roomNumber)}, ${escapeSql(ac.candidatePhotoUrl)}, ${escapeSql(ac.isReleased)}, ${escapeSql(ac.instructions)}, ${escapeSql(ac.createdAt)})`;
    });
    lines.push(admitVals.join(',\n') + ';');
    lines.push('');
  }

  // 7. results
  lines.push('-- --------------------------------------------------------------------');
  lines.push('-- Table structure and data for `results`');
  lines.push('-- --------------------------------------------------------------------');
  lines.push('DROP TABLE IF EXISTS `results`;');
  lines.push('CREATE TABLE `results` (');
  lines.push('  `id` VARCHAR(64) PRIMARY KEY,');
  lines.push('  `application_id` VARCHAR(64) NOT NULL,');
  lines.push('  `application_number` VARCHAR(64) NOT NULL,');
  lines.push('  `roll_number` VARCHAR(64) NOT NULL,');
  lines.push('  `candidate_name` VARCHAR(255) NOT NULL,');
  lines.push('  `class_applying` VARCHAR(64) NOT NULL,');
  lines.push('  `subjects` LONGTEXT,');
  lines.push('  `total_marks` DECIMAL(8,2) DEFAULT 0.00,');
  lines.push('  `max_total_marks` DECIMAL(8,2) DEFAULT 0.00,');
  lines.push('  `percentage` DECIMAL(5,2) DEFAULT 0.00,');
  lines.push('  `rank` INT DEFAULT 0,');
  lines.push('  `qualifying_status` VARCHAR(128) DEFAULT "Under Evaluation",');
  lines.push('  `counseling_date` VARCHAR(128),');
  lines.push('  `counseling_venue` TEXT,');
  lines.push('  `is_published` TINYINT(1) DEFAULT 0,');
  lines.push('  `remarks` TEXT,');
  lines.push('  `created_at` VARCHAR(64)');
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  lines.push('');

  const results = store.results || [];
  if (results.length > 0) {
    lines.push('INSERT INTO `results` (`id`, `application_id`, `application_number`, `roll_number`, `candidate_name`, `class_applying`, `subjects`, `total_marks`, `max_total_marks`, `percentage`, `rank`, `qualifying_status`, `counseling_date`, `counseling_venue`, `is_published`, `remarks`, `created_at`) VALUES');
    const resVals = results.map((r) => {
      return `  (${escapeSql(r.id)}, ${escapeSql(r.applicationId)}, ${escapeSql(r.applicationNumber)}, ${escapeSql(r.rollNumber)}, ${escapeSql(r.candidateName)}, ${escapeSql(r.classApplying)}, ${escapeSql(r.subjects)}, ${escapeSql(r.totalMarks)}, ${escapeSql(r.maxTotalMarks)}, ${escapeSql(r.percentage)}, ${escapeSql(r.rank)}, ${escapeSql(r.qualifyingStatus)}, ${escapeSql(r.counselingDate)}, ${escapeSql(r.counselingVenue)}, ${escapeSql(r.isPublished)}, ${escapeSql(r.remarks)}, ${escapeSql(r.createdAt)})`;
    });
    lines.push(resVals.join(',\n') + ';');
    lines.push('');
  }

  // 8. admin_notifications
  lines.push('-- --------------------------------------------------------------------');
  lines.push('-- Table structure and data for `admin_notifications`');
  lines.push('-- --------------------------------------------------------------------');
  lines.push('DROP TABLE IF EXISTS `admin_notifications`;');
  lines.push('CREATE TABLE `admin_notifications` (');
  lines.push('  `id` VARCHAR(64) PRIMARY KEY,');
  lines.push('  `type` VARCHAR(64) NOT NULL,');
  lines.push('  `title` VARCHAR(255) NOT NULL,');
  lines.push('  `message` TEXT NOT NULL,');
  lines.push('  `entity_id` VARCHAR(64),');
  lines.push('  `entity_type` VARCHAR(64),');
  lines.push('  `link` VARCHAR(255),');
  lines.push('  `is_read` TINYINT(1) DEFAULT 0,');
  lines.push('  `created_at` VARCHAR(64)');
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  lines.push('');

  const notifs = store.notifications || [];
  if (notifs.length > 0) {
    lines.push('INSERT INTO `admin_notifications` (`id`, `type`, `title`, `message`, `entity_id`, `entity_type`, `link`, `is_read`, `created_at`) VALUES');
    const notifVals = notifs.map((n) => {
      return `  (${escapeSql(n.id)}, ${escapeSql(n.type)}, ${escapeSql(n.title)}, ${escapeSql(n.message)}, ${escapeSql(n.entityId)}, ${escapeSql(n.entityType)}, ${escapeSql(n.link)}, ${escapeSql(n.isRead)}, ${escapeSql(n.createdAt)})`;
    });
    lines.push(notifVals.join(',\n') + ';');
    lines.push('');
  }

  // 9. contact_enquiries
  lines.push('-- --------------------------------------------------------------------');
  lines.push('-- Table structure and data for `contact_enquiries`');
  lines.push('-- --------------------------------------------------------------------');
  lines.push('DROP TABLE IF EXISTS `contact_enquiries`;');
  lines.push('CREATE TABLE `contact_enquiries` (');
  lines.push('  `id` VARCHAR(64) PRIMARY KEY,');
  lines.push('  `name` VARCHAR(255) NOT NULL,');
  lines.push('  `email` VARCHAR(255) NOT NULL,');
  lines.push('  `phone` VARCHAR(32) NOT NULL,');
  lines.push('  `category` VARCHAR(64),');
  lines.push('  `subject` VARCHAR(255),');
  lines.push('  `message` TEXT,');
  lines.push('  `status` VARCHAR(32) DEFAULT "new",');
  lines.push('  `created_at` VARCHAR(64)');
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  lines.push('');

  const enquiries = store.enquiries || [];
  if (enquiries.length > 0) {
    lines.push('INSERT INTO `contact_enquiries` (`id`, `name`, `email`, `phone`, `category`, `subject`, `message`, `status`, `created_at`) VALUES');
    const enqVals = enquiries.map((e) => {
      return `  (${escapeSql(e.id)}, ${escapeSql(e.name)}, ${escapeSql(e.email)}, ${escapeSql(e.phone)}, ${escapeSql(e.category)}, ${escapeSql(e.subject)}, ${escapeSql(e.message)}, ${escapeSql(e.status)}, ${escapeSql(e.createdAt)})`;
    });
    lines.push(enqVals.join(',\n') + ';');
    lines.push('');
  }

  // 10. audit_logs
  lines.push('-- --------------------------------------------------------------------');
  lines.push('-- Table structure and data for `audit_logs`');
  lines.push('-- --------------------------------------------------------------------');
  lines.push('DROP TABLE IF EXISTS `audit_logs`;');
  lines.push('CREATE TABLE `audit_logs` (');
  lines.push('  `id` VARCHAR(64) PRIMARY KEY,');
  lines.push('  `user_id` VARCHAR(64),');
  lines.push('  `user_name` VARCHAR(255),');
  lines.push('  `user_role` VARCHAR(32),');
  lines.push('  `action` VARCHAR(128) NOT NULL,');
  lines.push('  `entity` VARCHAR(64),');
  lines.push('  `details` LONGTEXT,');
  lines.push('  `timestamp` VARCHAR(64)');
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  lines.push('');

  if (auditLogs.length > 0) {
    lines.push('INSERT INTO `audit_logs` (`id`, `user_id`, `user_name`, `user_role`, `action`, `entity`, `details`, `timestamp`) VALUES');
    const logVals = auditLogs.map((l) => {
      return `  (${escapeSql(l.id)}, ${escapeSql(l.userId)}, ${escapeSql(l.userName)}, ${escapeSql(l.userRole)}, ${escapeSql(l.action)}, ${escapeSql(l.entity)}, ${escapeSql(l.details)}, ${escapeSql(l.timestamp)})`;
    });
    lines.push(logVals.join(',\n') + ';');
    lines.push('');
  }

  lines.push('SET FOREIGN_KEY_CHECKS = 1;');
  lines.push('');
  lines.push('-- ====================================================================');
  lines.push('-- End of Backup Dump');
  lines.push('-- ====================================================================');

  const sqlContent = lines.join('\n');
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');
  fs.writeFileSync(outputCopyPath, sqlContent, 'utf-8');

  console.log(`✅ Backup successfully created at:`);
  console.log(`   1) ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB)`);
  console.log(`   2) ${outputCopyPath}`);
  console.log(`📊 Backup Summary:`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Applications: ${applications.length}`);
  console.log(`   - Admit Cards: ${admitCards.length}`);
  console.log(`   - Results: ${results.length}`);
  console.log(`   - Exam Centres: ${centres.length}`);
  console.log(`   - Audit Logs: ${auditLogs.length}`);
  console.log(`   - Notifications: ${notifs.length}`);
  console.log(`   - Enquiries: ${enquiries.length}`);
}

generateBackup();
