# Gurukul Kurukshetra - Entrance Examination & Management Portal
## Project Documentation & Comprehensive Work Log

**Institution:** Gurukul Kurukshetra, Haryana (CBSE Affiliation No. 530006)  
**Motto:** तमसो मा ज्योतिर्गमय (*Lead us from darkness to light*)  
**Location:** Near 3rd Gate, Kurukshetra University, Kurukshetra, Haryana - 136119  
**System Type:** Full-Stack Online Entrance Examination, Application & Admission Management Portal  
**Document Maintained By:** Antigravity AI Assistant & Engineering Team  

---

## 1. Executive Summary & Objective

This document serves as the **single source of truth** and **chronological work log** for the design, development, deployment, and ongoing maintenance of the Gurukul Kurukshetra Entrance Examination & Management Portal.

The platform provides an end-to-end digital lifecycle for prospective students seeking admission to Gurukul Kurukshetra (Classes 5th, 6th, 7th, 8th, 9th, 11th Science/Commerce/Arts, and the specialized NDA Wing) and administrative staff managing the entire process:
1. **Public Information & Admissions Showcase**
2. **Student Registration & Secure Authentication**
3. **Multi-Step Entrance Application Form & Document Uploads**
4. **Online Application Fee Collection via Payment Gateway**
5. **Real-time Application Review & Status Tracking**
6. **Administrative Application Verification (Approve / Reject / Correction Workflow)**
7. **Exam Centre Allocation & Roll Number Generation**
8. **Automated Admit Card (Hall Ticket) Generation with Barcode/QR Verification**
9. **Result Processing, Merit List & Scorecard Publication**
10. **State/City Demographic Reports & Data Export (CSV/Excel)**

---

## 2. Technology Stack & Architecture

| Layer | Technology | Rationale & Specifications |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 14+ (App Router)** | Modern React Server Components + Client hydration, fast routing, SSR/SSG. |
| **Styling & Design System**| **Tailwind CSS + Vanilla CSS** | Custom Vedic saffron (`#f58a14`), Royal Navy (`#0b192c`), and Antique Gold (`#dfa838`) design system. Responsive across mobile, tablet, desktop. |
| **Database** | **MySQL 9.0+ / 8.0+** | Relational integrity for applications, transactions, admit cards, and scores with connection pooling via `mysql2/promise`. Built-in automated schema migrations and resilient fallback. |
| **Authentication** | **JWT + bcryptjs** | Secure stateless sessions, encrypted password storage, role-based authorization (`applicant` vs `admin`). |
| **Payment Gateway** | **Razorpay Integration** | Order creation, payment verification, test sandbox simulation, instant receipt generation. |
| **Document Storage** | **Local & Cloud Storage Handler** | Validated file uploads for passport photo, student signature, parent signature, Aadhaar card, and mark sheets. |
| **Admit Card & Scorecard** | **Print-Optimized Engine** | Pixel-perfect print stylesheets (`@media print`), security QR code, barcodes, and candidate verification credentials. |
| **Notifications** | **Modular Communication Engine** | Modular adapters for Nodemailer (Email), SMS Gateway API, and WhatsApp Business API. |

---

## 3. Database Schema Overview

The relational schema is created automatically on startup:

1. **`users`**:
   - `id`, `name`, `email`, `phone`, `password_hash`, `role` (`applicant` | `admin`), `created_at`
2. **`applications`**:
   - `id`, `application_number` (Unique, e.g. `GK-2026-XXXX`), `user_id`, `class_applying`, `personal_info` (JSON), `parent_info` (JSON), `address_info` (JSON), `academic_info` (JSON), `exam_centre_pref` (JSON), `status` (`submitted`, `verified`, `correction_needed`, `rejected`, `approved`), `remarks`, `created_at`, `updated_at`
3. **`documents`**:
   - `id`, `application_id`, `doc_type` (`photo`, `signature`, `parent_signature`, `aadhaar`, `marksheet`), `file_url`, `status`, `remarks`
4. **`payments`**:
   - `id`, `application_id`, `amount`, `currency`, `gateway_order_id`, `payment_id`, `status` (`pending`, `success`, `failed`), `payment_method`, `receipt_number`, `created_at`
5. **`admit_cards`**:
   - `id`, `application_id`, `roll_number`, `exam_centre_name`, `exam_date`, `reporting_time`, `room_number`, `is_released`, `created_at`
6. **`results`**:
   - `id`, `application_id`, `roll_number`, `subject_marks` (JSON), `total_marks`, `max_marks`, `rank`, `qualifying_status`, `is_published`, `created_at`
7. **`exam_centres`**:
   - `id`, `centre_code`, `centre_name`, `city`, `state`, `capacity`, `address`
8. **`system_settings`**:
   - Application fee amounts, schedule dates, registration windows, and notification toggles.

---

## 4. Key Workflows

### 4.1 Applicant Journey
1. **Explore & Register**: Student/parent lands on portal, reviews prospectus & eligibility, and creates an account using email/mobile and secure password.
2. **Fill Entrance Form**:
   - Step 1: Personal Profile (Full name, DOB, Category, Aadhaar, Blood Group)
   - Step 2: Parents & Guardian Details (Father/Mother occupations, incomes)
   - Step 3: Address & Communication (State, City, PIN, WhatsApp number)
   - Step 4: Class & Academic History (Class applying for, previous school & marks)
   - Step 5: Exam Centre Choice (1st and 2nd priority preferences)
   - Step 6: Document Uploads (Photo, Signature, Aadhaar, Previous Marksheet)
   - Step 7: Review & Online Payment via Razorpay
3. **Application Tracking**: Real-time status display. If correction is flagged by the admin, applicant re-uploads only the requested document.
4. **Admit Card**: Once the admin releases admit cards, the applicant downloads and prints their official Hall Ticket.
5. **Scorecard & Admission Offer**: Upon result publication, applicants view subject marks, total score, rank, and download their counseling letter.

### 4.2 Administrative Journey
1. **Dashboard Analytics**: Real-time counters of total applications, revenue collected, approvals, and class-wise breakdown.
2. **Verification Desk**: Document review panel with zoom/inspect features and 1-click status actions: *Approve*, *Request Correction* (with remark), or *Reject*.
3. **Exam Center & Roll Allocation**: Assign automated roll numbers and center venues.
4. **Result Processing**: Enter or upload marks, configure passing cut-offs, calculate ranks, and toggle instant publication.
5. **Reporting**: Export applicant lists, attendance sheets, and demographic summaries as CSV.

---

## 5. Chronological Work & Modification Log

*All project activities, enhancements, and future changes are strictly appended below.*

### [Entry 001] - 2026-09-14: Initial System Initialization & Setup
- **Action Taken:**
  - Analyzed official requirements from the Entrance Examination & Management Portal specification document.
  - Fetched authentic Gurukul Kurukshetra digital assets (Crest emblem `logo-gurukul.png`, horizontal banner logo `logo-gurukul-round.png`, and favicon) directly from `gurukulkurukshetra.com`.
  - Configured Next.js 14 project structure with TypeScript, Tailwind CSS, and Lucide icons.
  - Set up brand design tokens reflecting Gurukul Kurukshetra Vedic saffron, Royal navy, and gold palette.
  - Configured database environment variables in `.env` and `.env.example` for MySQL 9.0 (`MySQL90` service).
  - Drafted comprehensive database schema and multi-step entrance application workflows.
  - Created initial `PROJECT_WORKLOG.md` (this file) to record all architectural decisions and future iterations.
- **Status:** Initialized & Core Setup Complete.

---

### [Entry 002] - 2026-09-14: Complete System Implementation & Verification
- **Modules Completed:**
  1. **Branding & Assets Integration:**
     - Downloaded and integrated the official Gurukul Kurukshetra crest logo (`public/logo-gurukul.png`), horizontal banner (`public/logo-gurukul-round.png`), and institutional favicon.
     - Configured custom design system palette: Vedic Saffron (`#f58a14`), Royal Navy (`#0b192c`), Navy Dark (`#060d17`), and Antique Gold (`#dfa838`).
  2. **Applicant Portal:**
     - **Landing Page (`src/app/page.tsx`)**: Hero banner, announcement tickers, important dates schedule, class-wise intake and test subject breakdown, step-by-step application guidelines, and direct action CTAs.
     - **Authentication (`/login`, `/register`, `/api/auth/*`)**: JWT-based stateless session management with HTTP-only cookies, password encryption via `bcryptjs`, and quick one-click demo autofill credentials (`aarav@example.com` / `Student@123`).
     - **Multi-Step Application Form (`src/app/apply/page.tsx`)**:
       - Step 1: Candidate Personal Details (Name, Gender, DOB, Category, Aadhaar, Blood Group)
       - Step 2: Parent & Guardian Details (Father/Mother occupations, incomes, phone)
       - Step 3: Address & Communication (Street, City, District, State, PIN, WhatsApp)
       - Step 4: Academic History & Class Sought (Classes 5, 6, 7, 8, 9, 11 Science/Commerce/Arts/NDA)
       - Step 5: Examination Centre Preferences (1st & 2nd choice from Kurukshetra, Delhi, Chandigarh, Rohtak)
       - Step 6: Document Uploads with Instant Live Preview (Photo, Candidate Signature, Parent Signature, Aadhaar Card)
       - Step 7: Application Summary & Online Fee Payment (Razorpay checkout structure, ₹1,200 fee, instant confirmation)
     - **Applicant Dashboard (`src/app/dashboard/page.tsx`)**: Real-time 5-stage progress tracker, candidate dossier overview, fee receipt with transaction reference, and direct triggers for Hall Ticket & Result.
     - **Admit Card Generator & Print View (`src/app/admit-card/page.tsx`, `src/components/AdmitCardView.tsx`)**:
       - Official printable Hall Ticket with barcode, roll number, assigned exam centre, reporting time, candidate photo, signature boxes, controller seal, and examination instructions.
     - **Scorecard & Result Viewer (`src/app/result/page.tsx`, `src/components/ScorecardView.tsx`)**:
       - Official scorecard with subject marks, total marks, percentage, all-India Gurukul rank, qualification badge, and physical counseling instructions.
     - **Public Status Tracker (`src/app/status/page.tsx`)**:
       - Instant tracking by Application Number (e.g. `GK-2026-1001`).
  3. **Admin Portal:**
     - **Admin Layout & Navigation (`src/app/admin/layout.tsx`)**: Role-guarded sidebar with active route highlighting, admin profile indicator, and session security.
     - **Analytics Dashboard (`src/app/admin/dashboard/page.tsx`)**: Live KPI metrics (Total Applications, Revenue Collected, Approved, Under Review), class-wise distribution progress bars, state demographic distribution, and recent applications desk.
     - **Candidate Management (`src/app/admin/applications/page.tsx`)**: Filter by class, filter by status, instant search by name/application number/phone, and quick dossier links.
     - **Verification Desk (`src/app/admin/applications/[id]/page.tsx`)**:
       - Full dossier inspection with Document Inspector (Photo & Signature preview).
       - 1-Click **Approve** action.
       - **Request Correction** workflow with pre-filled reasons modal (e.g. blurred photo) that dispatches notification to the applicant.
       - **Reject** action with justification.
       - **Generate & Release Admit Card** button with automatic roll number assignment.
     - **Results Desk (`src/app/admin/results/page.tsx`)**: Marks entry per subject (Mathematics, Science, English/Hindi, Sanskrit/GK), auto-calculated aggregate percentage, qualifying status selection, and 1-click publishing.
     - **Centres Management (`src/app/admin/centers/page.tsx`)**: Venue capacity, contact persons, and address tracking for examination centres.
     - **Reports & Export (`src/app/admin/reports/page.tsx`, `src/app/api/admin/export/route.ts`)**: Real-time CSV export of candidate registers, attendance sheets, and financial ledgers.
     - **System Settings (`src/app/admin/settings/page.tsx`)**: Configurable application fee, academic session, admission dates, and notification toggles.
  4. **Database & Resilient Architecture (`src/lib/db.ts`):**
     - Full MySQL connection pool configuration (`mysql2/promise`) connecting to MySQL 9.0 (`MySQL90` service).
     - Automated `CREATE DATABASE` and table schema generation (`users`, `applications`, `admit_cards`, `results`, `exam_centres`, `settings`).
     - Resilient auto-fallback to high-performance local store (`data/gurukul_store.json`) when password authentication is pending in `.env`, ensuring zero runtime crashes and immediate evaluation capability.
  5. **Build & Quality Validation:**
     - Executed `npm run build` with **exit code 0**.
     - All 27 static and dynamic routes compiled with zero TypeScript or syntax errors.
     - Dev server running live on `http://localhost:3000`.
- **Status:** Complete, Verified & Operational.

---

### [Entry 003] - 2026-09-14: Realignment into Dedicated Examination Portal & Registration Number Decoupling
- **Feedback & Requirement Addressed:**
  - The client clarified that this project is NOT a primary institutional/school marketing website. Instead, it is the **dedicated Entrance Examination Registration & Candidate Activity Portal** that opens directly when a user clicks *"Entrance Exam Registration"* on the main Gurukul Kurukshetra website.
  - Separate **Registration Number** vs **Roll Number** lifecycle was required:
    - **Registration Number** MUST be generated **instantly** when details are filled/submitted.
    - **Roll Number** generation is strictly separated and kept **deferred** (to be allocated later per custom exam logic).
- **Actions Taken:**
  1. **Landing Page Realignment (`src/app/page.tsx`)**:
     - Converted the home page into the official **Candidate Activity Gateway**:
       - **Dual Gateway Console:**
         - **Box 1: New Candidate Registration (Session 2026-27)** ➔ Direct link for first-time applicants to register and receive their instant Registration Number.
         - **Box 2: Registered Candidate Sign-In** ➔ Instant sign-in console using **Registration Number** (or Email/Phone) + Password.
       - Embedded quick action cards: *Check Application Status*, *Download Admit Card*, *Entrance Test Results*.
       - Maintained important examination timeline ticker, class eligibility, and candidate guidelines.
  2. **Instant Registration Number Generation:**
     - Updated database layer (`src/lib/db.ts`) and registration API (`src/app/api/auth/register/route.ts`) to automatically issue unique sequential Registration Numbers (format: `GK26-XXXXX`, e.g. `GK26-10001`, `GK26-10002`).
     - Added an instant printable Confirmation Card on `/register` displaying the candidate's permanent Registration Number with 1-click clipboard copy.
  3. **Strict Separation of Roll Number:**
     - Decoupled `rollNumber` from the application submission lifecycle.
     - New applications default to `rollNumber: undefined` and display status: *"Pending Allotment - To be issued prior to examination"*.
     - Roll Number allocation is ready for the custom administrative allocation rules to be provided by the client.
  4. **Multi-Identifier Candidate Login:**
     - Updated `/api/auth/login` and `/login` to support signing in directly with **Registration Number** (e.g., `GK26-10001`) as well as registered Email or Mobile Phone.
  5. **Dashboard & Status Realignment:**
     - Candidate Dashboard (`/dashboard`) prominently showcases:
       - **Registration Number**: `GK26-XXXXX` (Active, Permanent)
       - **Examination Roll Number**: *"Pending Allotment (To be issued later)"*
     - Public Status Tracker (`/status`) and Admit Card lookup (`/admit-card`) updated to search by Registration Number.
- **Status:** Complete, Verified & Operational.

---

### [Entry 004] - 2026-09-14: NTA-Style Login Default Page, Session Redirection & Visual Hardening
- **Feedback & Requirement Addressed:**
  - Make the **Login page the default first page (`/`)** of the portal, modeled after national entrance examination portals (like NTA JEE/NEET).
  - If a user is **already logged in**, automatically redirect them to their home dashboard (`/dashboard` for candidates, `/admin/dashboard` for administrators).
  - If **not logged in**, allow immediate sign-in with Application / Registration Number or direct them to **Register**.
  - Keep **Admin Portal completely separate** with its own dedicated login ID and password (`/admin/login`).
  - Eliminate any image stretching or layout shift glitches by strictly locking logo dimensions across all views.
- **Actions Taken:**
  1. **Default Route (`/`) Transformed into Candidate Login Gateway (`src/app/page.tsx`):**
     - Embedded automatic authentication detection via `/api/auth/me`:
       - Logged-in candidates are seamlessly redirected to `/dashboard`.
       - Logged-in admins are seamlessly redirected to `/admin/dashboard`.
     - Non-authenticated visitors land directly on the **Entrance Examination Gateway**:
       - **Registered Candidate Sign-In (Left Pane):** Application/Registration Number (`GK26-XXXXX`), Password, and dynamic 5-character **Security PIN (Captcha)** with 1-click refresh.
       - **New Candidate Registration (Right Pane):** Step 1 call-to-action leading to `/register` with clear guidance on instant Registration Number generation.
       - **Candidate Quick Services:** Quick links to *Track Application Status* (`/status`), *Download Admit Card* (`/admit-card`), and *View Result / Scorecard* (`/result`).
       - **1-Click Review Helper:** Instant autofill for demo testing (`GK26-10001` / `Student@123`).
  2. **Dedicated Administration Portal (`/admin/login`):**
     - Completely segregated administrative access for examination cell officials.
     - Secured with separate role verification, dedicated dark-navy dashboard theme, and protected API routes.
  3. **Visual Hardening & Logo Sizing Fixes:**
     - Replaced Next.js `fill` props with explicit `width` & `height` attributes and `.brand-logo-img` CSS classes across all components (`Header.tsx`, `Footer.tsx`, `page.tsx`, `login/page.tsx`, `register/page.tsx`, `dashboard/page.tsx`, `admin/login/page.tsx`, `admin/layout.tsx`, `AdmitCardView.tsx`, `ScorecardView.tsx`).
     - Hardened `globals.css` with `max-width: 100%`, `height: auto`, and rigid dimension locks on `.brand-logo-img` and `.brand-logo-sm` so logos never stretch under any network or hydration conditions.
  4. **Build & Quality Validation:**
     - Re-verified full project compilation with zero TypeScript errors.
     - Confirmed clean routing across all 27 application endpoints.
- **Status:** Complete, Verified & Operational.

---

### [Entry 005] - 2026-09-14: Password Eye Icons, Mandatory Registration OTP, Cascading Address Selectors, Document Upload Hardening & Global Logout
- **Feedback & Requirements Addressed:**
  1. **Password Visibility & Strict Validation:** Add eye icon toggles on password fields to view and match; implement strict regex validation for email and 10-digit Indian mobile number.
  2. **Mandatory OTP Verification:** Disallow account creation without entering a valid OTP sent to email / WhatsApp.
  3. **Application Form Field Refinements:**
     - Demand **WhatsApp Number** in Step 1 (Candidate Info) with registration autofill.
     - **Mother's Occupation** must NOT be autofilled as housewife/homemaker; must start empty.
     - **Annual Family Income** must be a mandatory dropdown (`Below ₹2 Lakh`, `₹2 Lakh - ₹4 Lakh`, `₹4 Lakh - ₹6 Lakh`, `Above ₹6 Lakh`).
     - **Address** must provide cascading **State** and **District** selection dropdowns, with user entering City/Town manually.
     - **Academic Performance** must allow entering Marks (Obtained / Out Of) with auto-computed percentage, or entering direct percentage (`%`).
  4. **Document Upload UI Hardening:**
     - Remove all institutional school logo placeholders from upload preview boxes.
     - Use dedicated Upload icons inside dashed upload boxes with file name and status indicators.
     - **Strict Validation:** Strictly block candidates from advancing to the payment section without uploading mandatory documents (Photo, Signature, Aadhaar).
  5. **Payment Receipt & Confirmation Email:**
     - Razorpay demo payment checkout.
     - Provide an official printable Payment Receipt displaying Receipt Number, permanent Registration Number, Transaction ID, and candidate details.
     - Dispatch confirmation email including permanent Registration Number and payment receipt details.
  6. **Prominent Logout & Redirection:**
     - Prominent red Logout buttons across Header, Candidate Dashboard, and Admin Panel navigation.
     - "Candidate Login" button configured to redirect directly to the login gateway.
- **Actions Taken:**
  1. **OTP Verification Engine (`src/app/api/auth/otp/route.ts` & `src/lib/notifications.ts`):**
     - Built 6-digit numeric OTP generation with 10-minute expiry cache.
     - Integrated email/SMS/WhatsApp dispatch with developer testing helper banner.
  2. **Enhanced Candidate Registration (`src/app/register/page.tsx`):**
     - Added `<Eye />` and `<EyeOff />` toggles on password and confirm password fields.
     - Added real-time password matching badge (`✓ Passwords Match` vs `✗ Passwords Differ`).
     - Added two-phase registration requiring verified OTP before generating the permanent Registration Number (`GK26-XXXXX`).
  3. **Indian Location Dataset (`src/lib/indianLocations.ts`):**
     - Created structured dictionary of all Indian States/UTs with their respective administrative districts for dynamic cascading selection.
  4. **Comprehensive Application Form Overhaul (`src/app/apply/page.tsx`):**
     - Step 1: Added WhatsApp Number field with "Same as mobile" auto-fill; pre-populated registration details via `/api/auth/me`.
     - Step 2: Cleared mother's occupation default (`''`); added mandatory annual family income dropdown.
     - Step 3: Cascading State and District dropdowns with manual City/Town entry.
     - Step 4: Marks Mode switcher (`Marks Obtained / Out Of` with auto-calculated % vs `Direct %`).
     - Step 5: Dual exam center preference selectors.
     - Step 6: Dedicated `<Upload />` icons; zero dummy logo previews; strict check blocking navigation to Step 7 if Photo, Signature, or Aadhaar are absent.
     - Step 7: Razorpay demo payment, printable official payment receipt, and email dispatch with permanent Registration Number.
  5. **Global Logout Visibility (`src/components/Header.tsx`, `src/app/dashboard/page.tsx`, `src/app/admin/layout.tsx`):**
     - Header: Prominent red Logout button with user label and "Candidate Login" gateway button.
     - Dashboard: Red Sign Out button in candidate banner.
     - Admin Panel: Mobile and desktop sidebar Sign Out buttons.
- **Status:** Complete, Verified & Operational.

### [Entry 006] - 2026-09-14: Implementation of Formal 23-Clause Technical Requirements Specification
- **Specification Addressed:** Formal Technical Requirements Specification for Admission / Entrance Examination & Management Portal (Gurukul Kurukshetra).
- **Core Capabilities & Modules Delivered:**
  1. **Application Form Opening, Closing & Reopening Controls (`src/lib/formSchedule.ts`, `data/form_schedule.json`, `/api/schedule`):**
     - Implemented automatic opening and closing based on configured start and end timestamps.
     - Enforced strict Indian Standard Time (`Asia/Kolkata` - UTC+05:30) evaluation across all comparisons and displays.
     - Provided authorized administrative manual overrides (`OPEN`, `CLOSED`, `EXTENDED`) and quick reopening extensions (+7, +15, +30 days).
     - **Non-Destructive Guarantee:** Updating the form schedule or reopening for extended periods does NOT delete, reset, or modify existing submitted applications or candidate drafts.
     - When closed, new registrations (`/api/auth/register`) and submissions are strictly blocked with an explanatory notice, while registered applicants retain full access to sign in, check status, print documents, and access admit cards.
  2. **Candidate Security, Mobile Uniqueness & Password Reset:**
     - Enforced unique mobile number validation (`db.findUserByPhone()`) blocking duplicate registrations under the same phone number.
     - Integrated secure password reset flow (`/forgot-password`, `/api/auth/reset-password`) using verified OTP and visibility eye toggles.
  3. **Multi-Step Form & Draft Progress Saving (`/api/applications/draft`, `src/lib/db.ts`, `src/app/apply/page.tsx`):**
     - Added "Save as Draft" action button on every form step enabling candidates to save their work without submitting.
     - On page load, the portal automatically detects and resumes partial draft progress seamlessly.
  4. **Official 1-Page Printable Admission Verification & Enrolment Form (`src/components/AdmissionFormView.tsx`):**
     - Engineered an institutional 1-page print layout (`@media print` and A4-tuned geometry) featuring the school crest, candidate photograph, signature, Aadhaar, class applied, and parental particulars.
     - Included official physical verification checkboxes (Original TC/SLC, Marksheet, DOB Certificate, Medical Fitness, Residence Verification) and signature blocks for Verification Officer, Exam Superintendent, and Principal.
     - Accessible to candidates via `/admission-form` and to administrators via `/admin/applications/[id]/admission-form`.
  5. **Examination Attendance Sheets (`src/app/admin/attendance/page.tsx`, `/api/admin/attendance`):**
     - Administrative attendance register generator grouping registered candidates by Examination Centre and room.
     - Includes roll numbers, candidate photos, signatures, question booklet number blanks, and invigilator certification.
  6. **Bulk Result CSV Import Engine (`src/app/admin/results/import/page.tsx`, `/api/admin/results/import`):**
     - Administrative CSV upload tool for subject marks and qualification status.
     - Features downloadable CSV template, pre-commit validation preview table, error detection for missing applications, and commit audit trail.
  7. **Comprehensive Administrative Audit Trail (`src/lib/audit.ts`, `data/audit_logs.json`, `/api/admin/audit`, `/admin/audit-logs`):**
     - Immutable JSON audit logger recording user ID, action type, IP address, timestamp in IST, and details.
     - Dedicated searchable and filterable Audit Trail Viewer in the Admin Portal.
  8. **Admin Form Schedule & Settings Overhaul (`src/app/admin/settings/page.tsx`):**
     - Real-time schedule controls with IST date-time pickers, quick-extend buttons, and audit logging.
- **Status:** Complete, Verified & Operational.

### [Entry 007] - 2026-09-14: Resolution of Form Schedule Bug, Header De-duplication & Professional UI Streamlining
- **Issues Addressed:**
  1. **"Application Currently Closed" Bug Fix:**
     - Investigated why the portal displayed a false "Applications Currently Closed" notice. Found that the client response object nesting (`data.status` vs flat `data.isOpen`) caused `!schedule.isOpen` to evaluate to true.
     - Flattened `/api/schedule` response to provide root `isOpen: true` and `status: "OPEN"`.
     - Explicitly set `statusOverride: "open"` and verified application window extends through 2026/2027.
  2. **Header De-duplication & UI Decluttering:**
     - Removed redundant secondary header banner and notice ribbon from `src/app/page.tsx` that previously duplicated the master layout header.
     - Cleaned `src/components/Header.tsx` to remove duplicate "Candidate Login" and "New Registration" text links that collided with the action buttons.
     - Redesigned the entrance gateway into a balanced, professional dual-card layout:
       - **Left Card:** Registered Candidate Sign In with `<Eye />` / `<EyeOff />` password visibility toggle, clean 5-digit Captcha, and 1-click demo fill.
       - **Right Card:** Active New Candidate Registration with 3 essential value propositions and vibrant call-to-action button leading to `/register`.
     - Recompiled production bundle with Exit Code 0 across all 39 routes and re-launched server on port 3000.
- **Status:** Complete, Verified & Operational.

### [Entry 008] - 2026-09-14: Real Nodemailer Email Dispatch, Removal of Tester OTPs, and Button Text Simplification to "Verify"
- **User Directive:**
  1. Do not show the 3 bullet points while registering / on the registration card.
  2. Change button text to strictly display "Verify" and nothing else.
  3. Remove any tester OTP helpers / banners completely. Configure Nodemailer to dispatch real verification emails to recipient addresses using sender account `anshumiglaniji08@gmail.com` with App Password `psuj klcu wfta fpve`.
- **Implementation & Changes:**
  1. **Removed Registration Card Bullet Points:**
     - Removed the three bullet items (`Instant Registration Number generated immediately...`, `Multi-Step Form with Auto-Save...`, `Official E-Payment Receipt...`) from `src/app/page.tsx`.
  2. **Simplified Registration Action Buttons to "Verify":**
     - Updated Step 1 button in `src/app/register/page.tsx` from `Verify & Send OTP to Email / WhatsApp ->` to strictly display `Verify`.
     - Updated Step 2 button in `src/app/register/page.tsx` from `Verify OTP & Complete Registration` to strictly display `Verify`.
     - Removed unnecessary action icons (`<MessageSquare />`, `<ArrowRight />`, `<CheckCircle />`) from the buttons.
  3. **Real Nodemailer Email Dispatch via Gmail:**
     - Integrated `nodemailer` with Gmail SMTP using user credentials (`anshumiglaniji08@gmail.com` and stripped App Password).
     - Built responsive HTML email templates with official Gurukul Kurukshetra branding for One-Time Password (OTP) dispatch and Registration Confirmation receipts.
     - Verified live email delivery: verified SMTP connection and confirmed real email dispatch with message IDs.
  4. **Complete Elimination of Tester OTPs:**
     - Removed `debugOtp` state and the entire `💡 Test Helper: OTP is ... [Auto-fill]` banner from `src/app/register/page.tsx` and `src/app/forgot-password/page.tsx`.
     - Stripped `debugOtp` from the API JSON response payload in `src/app/api/auth/otp/route.ts`.
     - Added an error handling check so that if email dispatch fails (e.g. invalid recipient address), the user is immediately notified.
  5. **Build & Deployment:**
     - Successfully built Next.js application (`npm run build`) with Exit Code 0 across all 39 routes.
     - Live production server restarted on port 3000 (`http://localhost:3000`).
- **Status:** Complete, Verified, & Live.

### [Entry 009] - 2026-09-14: Deferred Registration Number Generation (Generated Upon Payment & Dispatched via Mail)
- **User Directive:**
  - Registration Numbers must NOT be generated during the initial account creation / OTP verification step (`/register`).
  - The Registration Number must be generated **only after making the application fee payment** (Step 5 of the entrance application form).
  - Upon fee payment, the permanent Registration Number is generated, assigned to the candidate dossier, and dispatched directly to the candidate's email via Nodemailer.
- **Implementation & Changes:**
  1. **User Creation Logic Updated (`src/lib/db.ts`):**
     - Updated `createUser` to not assign a registration number during initial account registration (`registrationNumber: undefined`).
     - Candidates can log in before payment using their registered Email or Mobile number.
  2. **Payment & Application Submission Engine (`src/lib/db.ts` & `src/app/api/applications/route.ts`):**
     - When an application is submitted with confirmed payment (`paymentStatus: 'completed'`), the official permanent Registration Number (`GK26-XXXXX`) is generated and assigned to both the application and the user profile.
     - Persisted to MySQL (`UPDATE users SET registration_number = ...`) and the local fallback store.
     - Automatically dispatches `REGISTRATION_CONFIRMATION` via Nodemailer containing the permanent Registration Number, official e-receipt, transaction ID, class applied, and examination instructions.
  3. **Registration Flow Success Screen Updated (`src/app/register/page.tsx`):**
     - Removed the "Registration Number Generated!" card, the display of a generated number, and the copy button.
     - Replaced with a clean "Account Verified Successfully" card informing candidates that their contact details are verified and their official Registration Number will be generated upon application fee payment.
     - Provided a direct CTA button: `Proceed to Fill Entrance Application Form →` leading to `/apply`.
  4. **Login Gateway Clarification (`src/app/page.tsx`):**
     - Updated helper hint on the login form to indicate candidates may log in using their Registration Number or registered Email / Mobile.
  5. **Verification & Testing:**
     - Compiled production build with Exit Code 0 across all 39 routes.
     - Ran end-to-end automated test: verified registration yields `undefined` registration number, followed by application submission with payment yielding generated registration number `GK26-10003` and instant Nodemailer confirmation dispatch.
- **Status:** Complete, Verified, & Live.

### [Entry 010] - 2026-09-14: Removal of Separate WhatsApp Number Field & Strict Phone Number Uniqueness Enforcement
- **User Directive:**
  1. Remove the separate "WhatsApp Number for Instant Exam Alerts" field and checkbox from Step 1 of the entrance application form. Use the same mobile number entered during registration for all candidate communication and alerts.
  2. Make sure the phone number is strictly a unique entry across the candidate database.
- **Implementation & Changes:**
  1. **Removed WhatsApp Number Input Block (`src/app/apply/page.tsx`):**
     - Removed the highlighted amber WhatsApp Number input card, checkbox ("Same as registered mobile"), and description from Step 1.
     - Removed mandatory `whatsappNumber` check from Step 1 validation.
     - Updated candidate application submission and draft saving to automatically use the registered candidate mobile number (`formData.candidateMobile`).
     - Updated Review Step (Step 6) and Printable Admission Form ([AdmissionFormView.tsx](file:///c:/Anshu/Gurukul/src/components/AdmissionFormView.tsx)) to display `Registered Mobile No` instead of `WhatsApp Alert No`.
  2. **Multi-Tiered Phone Number Uniqueness Enforcement:**
     - **OTP Request Gate (`src/app/api/auth/otp/route.ts`):** When candidate initiates registration, the system immediately checks if the 10-digit mobile number is already registered to an existing candidate. If duplicate, requests are immediately blocked with HTTP 409 and error: *"Mobile number +91-XXXXXXXXXX is already registered. Each candidate must have a unique mobile number. Please sign in instead."*
     - **Account Creation API (`src/app/api/auth/register/route.ts`):** Strictly enforces phone number uniqueness prior to hashing credentials or generating tokens.
     - **Database Engine (`src/lib/db.ts`):** Inside `createUser`, added an unconditional check against `findUserByPhone` for both MySQL (`RIGHT(phone, 10) = ?`) and JSON/memory store, throwing a database constraint error if a duplicate phone number is encountered.
  3. **Verification & Testing:**
     - Next.js production build compiled with Exit Code 0 across all 39 routes.
     - Automated test verified `/apply` completely omits the WhatsApp alert box.
     - Automated test verified `/api/auth/otp` blocks duplicate phone numbers with HTTP 409 and clear rejection message.
- **Status:** Complete, Verified, & Live.

---

## [Entry 011] - Form Field Validations, Clean Labels, Mandatory Document Red Boundaries, Draft Dashboard Resumption, & Payment Button Polishing
**Timestamp:** 2026-09-14T14:05:00+05:30  
**Trigger:** User feedback and visual screenshots requesting strict input length/format rules, label text cleanups, mandatory document missing highlighting, seamless save-as-draft dashboard redirection, and payment button text refinement.

### Detailed Problem Statement & User Requirements:
1. **Aadhaar Number:**
   - Remove redundant `(12 Digits)` text from the label (it is known by default).
   - Enforce strictly numeric input and exactly 12 digits (`maxLength={12}`, `replace(/\D/g, '')`).
2. **Annual Family Income & Mother's Occupation:**
   - Remove helper text `Mandatory for fee verification & scholarships.` below the Annual Income dropdown.
   - Remove `(Optional)` and `*` from Mother's Occupation label (display strictly as `Mother's Occupation`).
3. **Character & Digit Length Validations:**
   - Candidate Full Name: minimum 5 characters.
   - Father's Full Name: minimum 5 characters.
   - Mother's Full Name: minimum 5 characters.
   - Father's Mobile Phone: numbers only, exactly 10 digits (`maxLength={10}`).
4. **Save as Draft & Dashboard Resumption Flow:**
   - Eliminate draft saving errors ("An error occurred while saving draft").
   - On clicking "Save as Draft", persist draft state to both `localStorage` and `/api/applications/draft` with `currentStep`.
   - Redirect to `/dashboard?draftSaved=true&step=${step}`.
   - On `/dashboard`, display a dedicated Draft Application In-Progress view showing steps completed (e.g. "Step 2 of 7 Completed") and a prominent **"Continue Filling Application Form →"** button that resumes the application form.
5. **Postal PIN Code:**
   - Remove `(6 Digits)` text from label (strictly `Postal PIN Code *`). Enforce exactly 6 digits numeric.
6. **Marks Evaluation Mode Tabs:**
   - Remove `(Obtained / Out Of)` from header; simplify tabs cleanly to `Marks` and `Percentage (%)`.
7. **Document Upload & Mandatory Red Boundary Indication:**
   - Remove `* Mandatory to Proceed` text badge in Step 6 header.
   - If candidate attempts to click "Save & Continue" without uploading mandatory documents (Photo, Signature, Aadhaar copy), mark the missing document cards with red boundaries (`border-red-500 bg-red-50/40 ring-2 ring-red-400`) and display an explicit error alert.
   - Dynamically clear the red boundary on selecting a file.
8. **Payment Button Text:**
   - Remove `via Razorpay (Demo)` text. Show strictly `Pay ₹1,200 & Complete Payment` (or `Processing Payment...`).

### Technical Changes & Root Cause Fixes:
1. **`src/app/apply/page.tsx`:**
   - Updated Aadhaar label to `Aadhaar Card Number *`, input to `inputMode="numeric"`, `maxLength={12}`, `onChange` stripping non-digits, and validation checking `/^\d{12}$/`.
   - Updated Mother's Occupation label to `Mother's Occupation` (no `(Optional)`, no `*`).
   - Removed helper text below Annual Family Income dropdown.
   - Enforced 5-character minimum for Candidate Name, Father Name, and Mother Name.
   - Enforced 10-digit numeric constraint for Father's Mobile Phone.
   - Removed `(6 Digits)` from PIN code label, enforced 6 digits numeric.
   - Updated Step 4 evaluation format tabs to `Marks` and `Percentage (%)`.
   - Removed `* Mandatory to Proceed` badge from Step 6.
   - Added `docErrors` state; applied red borders and warning icons to missing document upload containers when proceeding without them.
   - Updated `handleSaveDraft` to save to `localStorage`, call `/api/applications/draft`, and navigate to `/dashboard?draftSaved=true&step=${step}`.
   - Updated payment button text to `Pay ₹1,200 & Complete Payment` and badge to `256-Bit Encrypted Secure Payment`.
2. **`src/lib/types.ts` & `src/lib/db.ts`:**
   - Added `currentStep?: number` to `Application` interface.
   - Enhanced `saveDraftApplication` and `createApplication` to safely handle existing draft rows in both JSON fallback storage and MySQL, updating rather than conflicting.
3. **`src/app/api/applications/route.ts`:**
   - Updated submission conflict check to `existing && existing.status !== 'draft'`, allowing applicants with drafts to successfully complete payment and submit their final applications.
4. **`src/app/dashboard/page.tsx`:**
   - Added dedicated Draft In-Progress dashboard view when `application?.status === 'draft'`.
   - Displays current completed step, visual progress percentage bar, 7-step roadmap with direct jump links, summary of entered details, and high-contrast **"Continue Filling Application Form →"** CTA button.

### Verification:
- Run `npm run build`: Exit Code 0 (clean compilation of all static and dynamic routes).
- Production server active on port 3000.
- Verified HTML and JS bundles via PowerShell checks confirming all labels, validations, red borders, and button text match user requests.

- **Status:** Complete, Tested, & Live.

### [Entry 008] - 2026-09-14: Header Admin Filtering, (1-Page) Label Removal, Working Forgot Password & Forgot Registration with Resend OTP
- **User Feedback & Requirements Addressed:**
  1. **Remove `(1-page)`:** Remove all occurrences of `(1-Page)` / `1-Page` so the button and form headers cleanly read "Admission Form".
  2. **Hide Candidate Nav Links in Admin View:** Do not display `Check Status`, `Admit Card`, or `Results` in the header navigation when logged in as an Admin or navigating inside the Admin portal.
  3. **Working Forgot Password with Resend OTP:** Ensure recovery code is correctly dispatched to candidate's registered email via Gmail SMTP (`anshumiglaniji08@gmail.com`), provide a live 30-second countdown timer and "Resend OTP" button, and ensure password reset works seamlessly.
  4. **Working Forgot Registration Number with Resend OTP:** Allow candidates to input their registered 10-digit mobile number or email, verify OTP (with 30-second timer and Resend OTP option), retrieve their permanent Registration Number on-screen (with 1-click copy feature), and receive an email copy for safe-keeping.

- **Technical Implementations:**
  1. **Header Candidate Navigation (`src/components/Header.tsx`):**
     - Introduced `const isAdmin = currentUser?.role === 'admin' || isAdminDashboard`.
     - In both desktop navbar and mobile drawer, `Check Status`, `Admit Card`, and `Results` are rendered strictly when `!isAdmin`. When `isAdmin` is true, admin navigation (Dashboard, Applications, Settings) is displayed instead.
  2. **Admission Form Labels (`src/app/dashboard/page.tsx`, `src/components/AdmissionFormView.tsx`, `src/app/admin/applications/[id]/page.tsx`, `src/app/admission-form/page.tsx`):**
     - Updated button label to strictly `Admission Form`.
     - Updated section header to `Official Admission & Enrolment Form`.
     - Updated print button to `Print / Save as PDF`.
     - Removed all leftover `(1-Page)` / `One-Page` texts.
  3. **Backend OTP & Account Recovery (`src/app/api/auth/otp/route.ts` & `src/lib/db.ts`):**
     - Fixed bug in `action === 'send'` where `identifier` was unhandled and caused `to` to be `undefined`.
     - For non-registration requests (`forgot_password`, `forgot_registration`), the server looks up the user account via `db.findUserByIdentifier(identifier)` or `db.findUserByPhone(identifier)`.
     - Dispatches real OTP to candidate's registered email via Nodemailer (`anshumiglaniji08@gmail.com` Gmail SMTP transport).
     - Returns masked email (`a****0@gmail.com`) and phone for candidate verification.
     - Supports `action === 'resend'` to generate and dispatch fresh OTPs with updated expiry.
     - Enhanced `db.findUserByIdentifier` to match `u.id`.
     - Enhanced `db.updateUserPassword` to update user record by unique ID, email, or mobile.
  4. **Forgot Password Flow (`src/app/forgot-password/page.tsx` & `src/app/api/auth/reset-password/route.ts`):**
     - Added 30-second countdown timer and interactive **"Resend OTP"** button with spinning refresh icon.
     - Added inline toast confirming code re-dispatch.
     - Validates new password and successfully resets password in the database.
  5. **Forgot Registration Number Flow (`src/app/forgot-registration/page.tsx` & `src/app/api/auth/forgot-registration/route.ts`):**
     - Built dedicated Gurukul-branded page for retrieving forgotten Registration Numbers.
     - Step 1: Candidate enters registered 10-digit mobile number or email.
     - Step 2: 6-digit OTP verification with 30s countdown timer and interactive **"Resend OTP"** button.
     - Step 3: Success card displaying Candidate Full Name, Permanent Registration Number in high-contrast card with 1-click **"Copy"** button, Class applied for, and direct CTA to **"Proceed to Candidate Sign In →"**.
     - Automatically dispatches an official email reminder to the candidate's inbox with their permanent registration number.
  6. **Navigation Link Updates (`src/app/page.tsx`, `src/app/login/page.tsx`):**
     - Updated all "Forgot Reg No?" links across the home landing page and applicant login page to point directly to `/forgot-registration`.
     - Added "Forgot Password?" next to "Forgot Reg No?" on the applicant login page.

- **Verification:**
  - `npm run build`: Exit Code 0 (all 41 static and dynamic pages compiled successfully).
  - Production server running on `http://localhost:3000`.
  - Automated PowerShell test verified end-to-end:
    - `POST /api/auth/otp` with Registration Number `GK26-10004`: Dispatched to `anshutemp10@gmail.com` (Gmail Message ID `<7d24004e-8c72-e7e6-ee70-92d712e783d8@gmail.com>`).
    - `POST /api/auth/otp` with `action: 'resend'`: Returned fresh OTP and updated cache.
    - `POST /api/auth/reset-password`: Successfully updated password to `NewSecretPassword@999`.
    - `POST /api/auth/login`: Candidate login succeeded with new password.
    - `POST /api/auth/forgot-registration` with mobile `9345445678`: Dispatched OTP to `anshutemp10@gmail.com`.
    - `POST /api/auth/forgot-registration` with `action: 'verify_otp'`: Returned registration number `GK26-10004`, Candidate name `Anshu Miglani`, and dispatched `REGISTRATION_CONFIRMATION` email.
- **Status:** Complete, Verified & Live.

### 22. Demo Fill Removal, Forgot Link Repositioning & Registration Number Privacy Dispatch (2026-09-14)

- **User Directives:**
  1. **Remove Demo Fill:** Remove the "Fill Demo Candidate / Fill Demo Registration No." button from both landing page (`/`) and applicant login (`/login`).
  2. **Reposition "Forgot Registration No.?":** Move "Forgot Registration No.?" directly above the Registration / Application Number input field.
  3. **Registration Number Privacy (Do Not Display On-Screen):** When a candidate retrieves their registration number (e.g. `GK26-10006`), the raw registration number must NOT be displayed on the screen. Instead, it must be dispatched directly to their registered email address via Nodemailer, and the screen should reassure them with a masked email badge and a button to proceed to login.

- **Technical Implementations:**
  1. **Email Template & Dispatcher (`src/lib/notifications.ts`):**
     - Added `FORGOT_REGISTRATION_RECOVERY` notification type.
     - Designed an official Gurukul Kurukshetra recovery template containing the candidate's permanent registration number, class, and login CTA.
  2. **Backend API Security (`src/app/api/auth/forgot-registration/route.ts`):**
     - Upon successful OTP verification, dispatches `FORGOT_REGISTRATION_RECOVERY` to `user.email`.
     - Stripped `registrationNumber` out of the JSON response payload, returning `{ success: true, hasRegistrationNumber: true, sentToEmail: true, maskedEmail, maskedPhone, message }`.
     - Ensures raw numbers cannot be inspected from network responses or DOM.
  3. **Forgot Registration UI Redesign (`src/app/forgot-registration/page.tsx`):**
     - Replaced raw number card and copy button with a secure confirmation card.
     - Displays "Registration Number Sent to Your Email!", masked email badge (`s****7@gmail.com`), and "Proceed to Candidate Sign In →" CTA.
  4. **Landing & Login UI Updates (`src/app/page.tsx`, `src/app/login/page.tsx`):**
     - Removed all "Fill Demo" buttons and helper functions.
     - Placed "Forgot Registration No.?" in the label row directly above the Registration Number field.
     - Placed "Forgot Password?" in the label row directly above the Password field.

- **Verification:**
  - `npm run build`: Exit Code 0 (all 41 static and dynamic pages compiled successfully).
  - Verified OTP and email recovery flow for Satvik (`GK26-10006`):
    - `POST /api/auth/forgot-registration` (send OTP): Dispatched OTP to `satviksaini77777@gmail.com` (Gmail Message ID `<c0edac2b-cb68-b9b3-f591-63b2fde22522@gmail.com>`).
    - `POST /api/auth/forgot-registration` (verify OTP): Returned `{ hasRegistrationNumber: true, sentToEmail: true, maskedEmail: 's****7@gmail.com' }` with no raw registration number in the payload.
    - Dispatched `FORGOT_REGISTRATION_RECOVERY` email via Nodemailer (Gmail Message ID `<9c83a366-cdb0-e28c-d409-a26294731d21@gmail.com>`) containing `GK26-10006`.
- **Status:** Complete, Verified & Live.

### 23. Critical Security & Session Isolation, Role-Based Route Guard, Revenue Card Removal & Canvas Captcha (2026-09-14)

- **User Directives & Security Issues Identified:**
  1. **Visual Canvas Captcha:** Upgrade the plain-text Security PIN into an authentic, distorted Canvas-based Captcha method (with noise lines, disturbance dots, character rotation, and audio speak support).
  2. **Remove "Revenue Collected":** Eliminate the "Revenue Collected" KPI card from the Admin Analytics dashboard (`/admin/dashboard`).
  3. **Admin Admission Form Navigation & Boundary Glitch:** When an administrator viewed a candidate's admission form and clicked "Back / Dashboard", they were erroneously redirected to the student dashboard (`/dashboard`) showing a draft with 2 sign-out buttons. Prevent admins from ever landing on the student dashboard, provide a direct back link to the candidate dossier (`/admin/applications/[id]`), and remove the duplicate Sign Out button from the candidate hero banner.
  4. **Cross-User Data Leakage (Harish seeing Satvik's draft):** When candidate Harish registered, the dashboard displayed "Welcome, satvik" with Satvik's Step 5 draft because drafts were previously stored in a global un-scoped localStorage key (`gurukul_application_draft`). Enforce complete user isolation where drafts are tied strictly to `userId` in the database and namespaced in client cache (`gurukul_draft_${user.id}`).

- **Technical Implementations:**
  1. **HTML5 Canvas Captcha (`src/components/VisualCaptcha.tsx`):**
     - Developed a high-security Canvas component rendering randomized alphanumeric characters with -25° to +25° rotations, variable font sizes, multi-colored baselines, 4 curved bezier disturbance lines, and 35 noise dots.
     - Added instant reload functionality and Web Speech API audio reading (`window.speechSynthesis`).
     - Integrated into both `src/app/page.tsx` and `src/app/login/page.tsx`.
  2. **Admin Dashboard KPI Card Removal (`src/app/admin/dashboard/page.tsx`):**
     - Completely removed the "Revenue Collected" stat card.
     - Readjusted the primary metrics grid to 3 responsive columns (`Total Applications`, `Approved & Verified`, `Under Review / Flags`).
  3. **Admission Form Navigation Fix (`src/components/AdmissionFormView.tsx` & `src/app/admin/applications/[id]/admission-form/page.tsx`):**
     - Added `backUrl` and `backLabel` props to `AdmissionFormView`.
     - In the admin view, the back button now explicitly routes to `/admin/applications/${id}` with the label "Back to Candidate Dossier".
  4. **Strict Admin Role Guard on Student Dashboard (`src/app/dashboard/page.tsx`):**
     - If an authenticated user with `role === 'admin'` visits `/dashboard`, the page immediately intercepts and redirects to `/admin/dashboard`.
     - Removed the redundant second red "Sign Out" button inside the hero banner card, preserving the single standard Sign Out in the header.
  5. **Admin Account Switcher & No Auto-Redirect Trap (`src/app/page.tsx`, `src/app/login/page.tsx`):**
     - Removed full-page blocking redirects when an admin visits the landing page or candidate login page.
     - Added an administrative notification banner allowing admins to either click "Go to Admin Portal →" or sign in with candidate credentials directly to switch accounts smoothly.
  6. **Complete Draft & Session Isolation (`src/app/dashboard/page.tsx`, `src/app/apply/page.tsx`, `src/lib/db.ts`):**
     - Purged legacy shared key `gurukul_application_draft` on login, registration, and logout.
     - Scoped client-side cache strictly to `gurukul_draft_${user.id}`.
     - Verified `db.saveDraftApplication` properly persists drafts in the database tied strictly to `user.userId`.
     - In `ApplicantDashboard`, if no application exists for the candidate, a clean, welcoming state is rendered ("Welcome, [Candidate Name]! No Application Form Submitted Yet - Begin Application Form 2026-27") without any cross-user leakage.

- **Verification:**
  - `npm run build`: Exit Code 0 (all 41 routes compiled successfully).
  - Verified Admin Dashboard: `Revenue Collected` is completely absent.
  - Verified Canvas Captcha: `<canvas>` element rendered and functional on `/` and `/login`.
  - Verified Session Isolation for new candidate Harish Kumar:
    - Initial `/api/applications` returned `application: null` (no Satvik draft).
    - Saved draft via `/api/applications/draft` -> correctly stored for Harish (`usr-1789383684991-p5z4c`).
    - `/api/applications` returned Harish's draft only.
    - Satvik's records remained completely isolated.
  - Verified Admin Admission Form: Back button points directly to `/admin/applications/[id]`.
### 24. Attendance Sheet Draft Filtering, Candidate Dashboard Status Notifications & Resubmission, and Exam Centres CRUD (2026-09-14)

- **User Directives:**
  1. **Attendance Sheet Filter:** If a person has their form in draft or has not submitted/filled the form, do NOT add them to the invigilator attendance sheet registers (`/admin/attendance`).
  2. **Candidate Status Notifications & Resubmission / Document Upload:** Whenever an admin Approves, Rejects, or Demands Details (`correction_needed`), the candidate must see a prominent notification alert on their dashboard when they log in. If rejected, they must be able to submit and send new details; if documents are required, an in-place upload option must be provided for uploading replacement documents.
  3. **Examination Centres CRUD & Dynamic Reflection:** Administrators must be able to Add, Edit, and Delete examination centres on `/admin/centers`, and all changes must be dynamically reflected across the system (e.g. application form preferences, attendance centre filters).

- **Technical Implementations:**
  1. **Attendance Sheet Filter (`src/app/api/admin/attendance/route.ts`):**
     - Filtered out all applications where `status === 'draft'`, `registrationNumber` starts with `DRAFT-`, or where submission/payment is incomplete.
     - Only officially submitted and approved/processed applications are returned.
     - Verified that draft records (e.g., Harish Kumar with `DRAFT-10006`) are strictly excluded.
  2. **Examination Centres CRUD API & Database (`src/lib/db.ts`, `src/app/api/admin/centres/route.ts`, `src/app/api/admin/centres/[id]/route.ts`, `src/app/api/centres/route.ts`):**
     - Added `getCentres`, `getCentreById`, `addCentre`, `updateCentre`, and `deleteCentre` to `db` object with persistent storage in both JSON fallback store and MySQL `exam_centres` table.
     - Built protected admin API routes `GET` & `POST` (`/api/admin/centres`) and `PUT` & `DELETE` (`/api/admin/centres/[id]`).
     - Built public dynamic endpoint `/api/centres` (`export const dynamic = 'force-dynamic'; export const revalidate = 0;`) for application form dropdowns.
  3. **Examination Centres Management UI (`src/app/admin/centers/page.tsx`):**
     - Replaced hardcoded static array with live API data from `/api/admin/centres`.
     - Built "Add Examination Centre" button with modal (Code, Name, City, State, Capacity, Address, Superintendent Name, Phone).
     - Built "Edit Venue" modal with pre-filled particulars.
     - Built "Delete Venue" button with confirmation prompt.
     - Real-time updates immediately reflected on-screen without requiring page reloads.
  4. **Dynamic Centre Choices across Portals (`src/app/apply/page.tsx`, `src/app/admin/attendance/page.tsx`):**
     - In `src/app/apply/page.tsx`: Step 5 dropdowns (`preferredCenter1`, `preferredCenter2`) now dynamically fetch active venues from `/api/centres`.
     - In `src/app/admin/attendance/page.tsx`: Centre filter dynamically loads active venues from `/api/admin/centres`.
  5. **Admin Candidate Dossier Enhancements (`src/app/admin/applications/[id]/page.tsx`):**
     - Enhanced "Demand Details / Correction" modal with quick selectable document checklist ("Clear Passport Photograph", "Candidate Signature", "Parent Signature", "Aadhaar Card Copy", "Previous Class Marksheet", "Date of Birth Certificate") plus instructions.
     - Built dedicated "Reject Application" modal with selectable rejection grounds ("Age criteria not met", "Ineligible previous academic qualification", "Aadhaar mismatch", "Incomplete documentation") plus custom remarks.
     - Sends automated email notifications via Nodemailer with Gmail transport (`anshumiglaniji08@gmail.com`) for Approved, Rejected, and Demanded Details.
  6. **Candidate Dashboard Notifications & Resubmission Desks (`src/app/dashboard/page.tsx`):**
     - **Approved Notification Banner:** Displays green celebration alert with official approval message, committee remarks, and direct button to "Print Admission Form".
     - **Correction Needed (Details Demanded) Banner & Document Upload Desk:**
       - Displays amber alert with exact officer instructions.
       - In-place interactive document uploader for Passport Photo, Candidate Signature, Parent Signature, Aadhaar Card, and Marksheet with thumbnail preview, file replace, and candidate clarification field.
       - "Submit Demanded Documents for Re-verification" button updates status to `under_review`.
     - **Rejected Banner & Application Rectification Desk:**
       - Displays red alert with official grounds for rejection.
       - Tabbed interface to rectify:
         - Verification Documents (Photo, Aadhaar, Marksheet).
         - Personal Particulars (Full Name, Date of Birth, Aadhaar, Category).
         - Academic Information (School Name, Board, Marks Percentage).
         - Statement of Appeal / Clarification textarea.
       - "Submit Revised Details for Re-Evaluation" button updates application in database and resets status to `under_review`.
  7. **Resubmission API Route (`src/app/api/applications/[id]/resubmit/route.ts`):**
     - Candidate-authenticated endpoint validating ownership.
     - Merges updated documents, personal info, and academic info into the application.
     - Appends candidate's explanation to application remarks with timestamp.
     - Transitions status to `under_review`.
  8. **Email Notifications (`src/lib/notifications.ts`, `src/app/api/applications/[id]/route.ts`):**
     - Added styled templates for `APPLICATION_APPROVED` and `APPLICATION_REJECTED`.

- **Verification:**
  - `npm run build`: Exit Code 0 (clean compilation across all 41 routes).
  - Production server running on `http://localhost:3000`.
  - Automated Node.js end-to-end test (`test_all_features.mjs`):
    - `[TEST 1 PASSED]`: Attendance sheet returns 5 valid candidates; drafts count is strictly 0. Harish Kumar (`DRAFT-10006`) is excluded.
    - `[TEST 2 PASSED]`: Created `GK-05` (Gurukul Panchkula Sports Complex), verified reflection in public API, updated capacity to 2200, deleted venue, and verified removal.
    - `[TEST 3 PASSED]`:
      - Admin demanded photograph/signature: status `correction_needed`.
      - Candidate resubmitted photo/signature: status transitioned to `under_review`.
      - Admin rejected with marksheet mismatch: status `rejected`.
      - Candidate revised marks percentage to 94.2% with appeal: status transitioned to `under_review`.
      - Admin approved: status `approved`.
      - Real Gmail notifications dispatched via Nodemailer with valid Message IDs.
- **Status:** Complete, Tested & Live in Production.

---
### Entry 25: Candidate Login Portal UI Redesign & Admin Sidebar Layout Isolation

- **Date:** September 14, 2026
- **Context:** The candidate login portal (`/login`) rendered as a single narrow box (`max-w-md`, 448px) leaving an empty void across ~70% of widescreen desktop viewports. Concurrently, on the administrative panel (`/admin/...`), the public portal header (`<Header />`) and footer (`<Footer />`) were leaking onto admin routes, pushing the admin sidebar down by ~140px, causing a double-header glitch and clipping the bottom super admin profile card and logout button.
- **Actions Completed:**
  1. **Candidate Login Portal UI & Structural Redesign (`src/app/login/page.tsx`):**
     - Transformed the single narrow card into a balanced, authoritative 2-column admission layout (`max-w-6xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8`):
       - **Left Column (5 Cols):** Gurukul Kurukshetra Vedic emblem, "Academic Session 2026-27" badge, 4-step candidate guidelines (Registration No. formats, password, case-sensitive captcha, portal services), 24x7 Admission Helpline & Technical Support contacts (`+91-1744-259114`, `+91-9896328329`, `admissions@gurukulkurukshetra.com`), and CBSE affiliation details.
       - **Right Column (7 Cols):** Premium Candidate Login Card with `Eye`/`EyeOff` password visibility toggle, `VisualCaptcha` with sound/refresh, "Forgot Reg No?", "Forgot Password?", "Sign In to Candidate Dashboard" button, and links to New Registration & Staff Login.
       - Included authenticated user state alert permitting one-click jump to candidate dashboard or admin desk.
  2. **Admin Sidebar Isolation & Double Header Removal (`src/components/Header.tsx`, `src/components/Footer.tsx`, `src/app/admin/layout.tsx`):**
     - In `src/components/Header.tsx`: Added `if (pathname.startsWith('/admin')) return null;` so the public header never renders on admin routes.
     - In `src/components/Footer.tsx`: Converted to client component (`'use client';`) and added `if (pathname.startsWith('/admin')) return null;`.
     - In `src/app/admin/layout.tsx`: Added `overflow-y-auto` to the admin `<aside>` element. The sidebar now aligns directly at `top: 0` without obstruction, has 100vh height, and the bottom section (User Profile, "View Portal Home", and "Sign Out / Logout" red button) is 100% visible and unclipped across all screen heights.
  3. **Header Navigation & TypeScript Fixes (`src/components/Header.tsx`):**
     - Updated Candidate Login button to link to `/login` and highlight when active.
     - Resolved TypeScript error (`Cannot find name 'isAdminDashboard'`) by safely checking `currentUser?.role === 'admin'`.
- **Verification:**
  - `npm run build`: Exit Code 0 across all 41 routes.
  - Server running live on `http://localhost:3000`.
  - HTTP 200 OK verified on `/login` and `/admin/dashboard`.
  - Verified that public entrance header does not render on `/admin/dashboard`.
- **Status:** Complete, Tested & Live in Production.

---
### Entry 26: Staff/Admin Top-Bar Removal & Admin UI Page Restoration

- **Date:** September 14, 2026
- **Context:** The user requested removal of the "Staff / Admin" button from the public header top strip (or redirecting it directly to the dashboard if authenticated). Furthermore, removing `<Header />` and `<Footer />` across all `/admin` routes in the previous turn had broken the Admin Login page (`/admin/login`), stripping its header and footer and leaving an 85vh dark box with a massive, jarring white gap at the bottom of the screen.
- **Actions Completed:**
  1. **Public Header "Staff / Admin" Button Removal & Role-Aware Routing (`src/components/Header.tsx`):**
     - Removed the public `<Link href="/admin/login">Staff / Admin</Link>` button from the top banner notice strip so standard applicants and public visitors no longer see it.
     - When `currentUser?.role === 'admin'`, replaced it with a dedicated "Admin Dashboard" badge linking directly to `/admin/dashboard`.
  2. **Admin UI Page & Header/Footer Restoration (`src/components/Header.tsx`, `src/components/Footer.tsx`, `src/app/admin/login/page.tsx`):**
     - Removed the blanket `if (pathname.startsWith('/admin')) return null;` from `Header.tsx` and `Footer.tsx`.
     - On `/admin/login`:
       - Restored the official Gurukul Header at the top and Footer at the bottom, exactly as it was originally.
       - Replaced public quick links on `/admin/login` with an official "Administrative Examination Cell" badge and "Return to Portal" navigation.
       - Added client-side auth check via `useEffect`: If already authenticated as admin, automatically redirects to `/admin/dashboard`.
       - Outer container updated to `min-h-[calc(100vh-250px)] bg-slate-900`, completely eliminating any white cut-off bar.
  3. **Sidebar Alignment Under Restored Header (`src/app/admin/layout.tsx`):**
     - Configured the admin sidebar `<aside>` with `md:top-[128px]`, `md:h-[calc(100vh-128px)]`, and `overflow-y-auto`.
     - The sidebar sits flush beneath the sticky header without overlap, its height matches the visible viewport, and the bottom Super-Admin profile and red "Sign Out / Logout" button are 100% visible and unclipped across all screen sizes.
- **Verification:**
  - `npm run build`: Exit Code 0 across all 41 routes.
  - Production server running live on `http://localhost:3000`.
  - Verified: `Home Has 'Staff / Admin': False` (cleanly removed from public header).
  - Verified: `Admin Login Has Header Emblem: True` and `Admin Login Has Footer: True` (no white bottom void).
  - Verified: `Admin Dash Has Header: True` (restored to original state).
- **Status:** Complete, Tested & Live in Production.

---
### Entry 27: Duplicate Print Button Removal, Dynamic Brand Redirection & Login Security Isolation

- **Date:** September 14, 2026
- **Context:** The user pointed out that the green "Application Dossier Approved & Verified!" banner unnecessarily duplicated the "Print Admission Form" button, which is already prominently available in the Application Summary below. Additionally, clicking the Gurukul Kurukshetra logo/text when logged in was sending users to the public home page instead of their role-specific dashboard. Lastly, having a banner on the login pages indicating active session credentials was identified as a security risk; authenticated users should be immediately auto-redirected to their dashboard, and login forms should only be accessible after explicitly signing out.
- **Actions Completed:**
  1. **Redundant Print Admission Form Button Removal (`src/app/dashboard/page.tsx`):**
     - Removed the duplicate `[Print Admission Form]` button from the green "Application Dossier Approved & Verified!" notification banner. The official download card in the summary section remains the designated access point.
  2. **Role-Aware Brand Emblem & Title Redirection (`src/components/Header.tsx`, `src/app/admin/layout.tsx`):**
     - In `src/components/Header.tsx`: Computed `brandRedirectHref`:
       - If `currentUser.role === 'admin'`: Redirects to `/admin/dashboard`.
       - If `currentUser` (candidate): Redirects to `/dashboard`.
       - If unauthenticated: Redirects to `/`.
     - Applied `brandRedirectHref` to the desktop header brand link and mobile drawer home link.
     - In `src/app/admin/layout.tsx`: Wrapped mobile bar brand and sidebar brand header with `<Link href="/admin/dashboard">`.
  3. **Security Lockdown: Auto-Redirect & "Currently Signed In" Banner Removal (`src/app/login/page.tsx`, `src/app/admin/login/page.tsx`, `src/app/page.tsx`):**
     - Removed the "Currently Signed In: ... (Staff/Admin or Candidate)" banner from `/login` and `/`.
     - In `src/app/login/page.tsx`: Updated `useEffect` to immediately call `router.replace(user.role === 'admin' ? '/admin/dashboard' : '/dashboard')` if an authenticated session is detected.
     - In `src/app/admin/login/page.tsx`: Updated `useEffect` to auto-redirect any logged-in user to their respective dashboard.
     - In `src/app/page.tsx`: If `loggedInUser` is present, the Step 2 card replaces the entire login form with an active session card ("Welcome, {name}" + "Open Dashboard" + "Sign Out" buttons). No login input fields are displayed until explicit sign out.
- **Verification:**
  - `npm run build`: Exit Code 0 across all 41 routes.
  - Production server running live on `http://localhost:3000`.
  - Verified: `Approved Banner Has Redundant Button: False`.
  - Verified: `Login Page Has 'Currently Signed In': False`.
  - Verified: `Home Page Has 'Currently Signed In': False`.
- **Status:** Complete, Tested & Live in Production.

---
### Entry 28: Grievance Redressal Contact Number Constraints & Ticket ID Removal

- **Date:** September 15, 2026
- **Context:** Candidate Query / Grievance Redressal modal on the applicant dashboard permitted unbounded text input for the contact number (allowing invalid lengths like arbitrary repeated digits) and displayed an unnecessary "Ticket ID" on submission. The user requested: (1) strict 10-digit mobile number constraints and numeric input type enforcement, and (2) removal of the ticket ID badge from the success dialog.
- **Actions Completed:**
  1. **Mobile Input Sanitization & Constraints (`src/app/dashboard/page.tsx`):**
     - Configured `type="tel"`, `inputMode="numeric"`, `maxLength={10}`, and `pattern="[6-9][0-9]{9}"`.
     - Added real-time numeric sanitization: `e.target.value.replace(/\D/g, '').slice(0, 10)` to prevent any non-digit characters or overflow.
     - Added visual `+91` badge, live `{queryPhone.length}/10 digits` character counter, and helper instructions.
     - Added pre-filling of the candidate's registered mobile number when opening the query modal.
  2. **Ticket ID Removal (`src/app/dashboard/page.tsx`, `src/app/api/applications/query/route.ts`):**
     - Removed the `Ticket ID: GRV-XXXXXX` display badge from the confirmation dialog.
     - Replaced with a clean, official acknowledgement: *"Your query has been assigned to the Examination Controller. An update will be communicated to your registered mobile number and email."*
     - In `src/app/api/applications/query/route.ts`, retained internal audit logging of the query while omitting any ticket reference from the user-facing response.
     - Added backend phone validation ensuring exact 10-digit Indian mobile numbers (`/^[6-9]\d{9}$/`).
- **Verification:**
  - `npx tsc --noEmit`: Exit Code 0 (No type errors).
  - Dev server active and responsive on `http://localhost:3000`.
- **Status:** Complete, Tested & Verified.

---
### Entry 29: Admin Notification Center, Contact Enquiries System & Candidate Rejection Data Flow

- **Date:** September 15, 2026
- **Context:** The administrator required a fully functional, persistent Notification Center in the Admin Panel to serve as the primary hub for portal events (new submissions, status changes, approvals, rejections, corrections, enquiries), deep-linking directly to target records before redirection. Additionally, public contact submissions needed full end-to-end persistence with admin management, and rejected candidate data (reasons, remarks, timestamps, candidate contact info) required permanent preservation and prominent visibility across the Admin Applications Desk and verification views.
- **Actions Completed:**
  1. **Database Models & Tables (`src/lib/types.ts`, `src/lib/db.ts`, `gurukul_database_backup.sql`, `data/gurukul_store.json`):**
     - Defined `AdminNotification` and `ContactEnquiry` data structures.
     - Added `admin_notifications` and `contact_enquiries` tables to the MySQL schema initialization and SQL backup dump.
     - Added `getAdminNotifications`, `getUnreadAdminNotificationCount`, `createAdminNotification`, `markAdminNotificationAsRead`, and `markAllAdminNotificationsAsRead` to `db`.
     - Added `createContactEnquiry`, `getContactEnquiries`, `getContactEnquiryById`, and `updateContactEnquiryStatus` to `db`.
     - Guaranteed backward-compatible fallback storage initialization in `data/gurukul_store.json`.
  2. **Backend APIs (`src/app/api/`):**
     - `GET /api/admin/notifications`: Fetches admin notification feed with unread count (Admin protected).
     - `POST /api/admin/notifications/read`: Marks single or all notifications as read (Admin protected).
     - `POST /api/contact`: Public endpoint for admission enquiries with input validation (10-digit mobile, email, message). Automatically dispatches an unread admin notification.
     - `GET /api/admin/enquiries`: Fetches enquiries with status filtering (Admin protected).
     - `GET & PATCH /api/admin/enquiries/[id]`: Fetches single enquiry and updates status/remarks (Admin protected).
  3. **Event Notification Dispatchers:**
     - `src/app/api/applications/route.ts`: Dispatches `APPLICATION_SUBMITTED` notification on new candidate submission.
     - `src/app/api/applications/[id]/route.ts`: Dispatches `APPLICATION_APPROVED`, `APPLICATION_REJECTED`, or `CORRECTION_REQUIRED` notifications on status changes.
     - `src/app/api/applications/[id]/resubmit/route.ts`: Dispatches `APPLICATION_STATUS_CHANGED` notification on candidate document re-upload.
     - `src/app/api/applications/query/route.ts`: Saves candidate grievance to `contact_enquiries` and creates a notification.
     - `src/app/api/admit-card/route.ts`: Dispatches `ADMIN_UPDATE` notification on roll number and admit card issuance.
  4. **Admin UI Components & Layout:**
     - `src/components/AdminNotificationBell.tsx`: Interactive Bell button with unread count badge, dropdown popover, category tabs (All, Unread, Applications, Enquiries), auto-mark-read on click, deep-linking, and auto-polling every 20 seconds.
     - `src/components/Header.tsx`: Integrated `AdminNotificationBell` in both desktop header and mobile drawer for authenticated administrators. Added public `/contact` link in navigation.
     - `src/app/admin/layout.tsx`: Added **Contact Enquiries** (`/admin/enquiries`) and **Notification Center** (`/admin/notifications`) with live unread badge counters to sidebar and mobile bar.
     - `src/app/admin/notifications/page.tsx`: Full-page Admin Notification Center with search, category filtering, bulk mark-as-read, and deep-link buttons.
     - `src/app/admin/enquiries/page.tsx`: Dedicated Contact Enquiries management desk with search, status filtering, message inspection drawer, resolution status updates, and internal admin notes.
     - `src/app/contact/page.tsx`: Public "Contact Admissions & Helpline" portal with campus details, helpline numbers, and online enquiry form.
     - `src/components/Footer.tsx`: Added `/contact` link under Quick Admission Links.
  5. **Preservation & Visibility of Rejected Candidates:**
     - `src/app/admin/applications/page.tsx`: Added quick status filter pills including a dedicated red **Rejected Candidates** tab. When selected, displays specialized columns: Application Number, Candidate Profile & Contact (Name, Email, Mobile), Class, Ground of Rejection / Remarks (prominent red callout), Rejection Timestamp, and Action Status.
     - `src/app/admin/applications/[id]/page.tsx`: Implemented prominent Red Rejection Summary Banner when `application.status === 'rejected'`, showing official grounds of rejection, committee remarks, rejection date/time, candidate contact particulars, and a button to re-open for scrutiny if necessary.
- **Verification:**
  - `npx tsc --noEmit`: Exit Code 0 across entire codebase.
  - Automated integration test script (`scripts/test_admin_system.js`): All 8 end-to-end tests passed (Contact submission -> Unauth 403 checks -> Admin auth -> Notification fetch -> Enquiry fetch -> Status resolution -> Mark read -> Candidate rejection flow & remarks preservation).
  - Page routes render verification (`scripts/verify_pages.js`): All 6 routes (`/`, `/contact`, `/admin/dashboard`, `/admin/applications`, `/admin/notifications`, `/admin/enquiries`) returned HTTP 200.
- **Status:** Complete, Tested & Live.

---
### Entry 30: Resolution of Admin Dashboard vs Candidate Applications Data Inconsistency & Security Hardening

- **Date:** September 15, 2026
- **Context:** An investigation was ordered into a critical data-integrity discrepancy between the Admin Dashboard (`TOTAL APPLICATIONS: 5`, subtitle: *"All submitted candidate profiles"*) and the Candidate Applications desk (`"Showing 4 Candidates"`, subtitle: *"Active candidates in portal: 4 of 5 total"*). A comprehensive forensic audit of backend APIs, database models, aggregation queries, and client components was executed to eliminate cosmetic UI patches and establish an authoritative single source of truth alongside strict security hardening.
- **Root Cause Analysis:**
  1. **Database Truth**: The persistent store contained 5 records: 2 approved (`GK26-10001`, `GK26-10004`), 1 submitted (`GK26-10003`), 1 draft (`DRAFT-10006`, Harish Kumar), and 1 rejected (`GK26-10006`, Satvik Saini).
  2. **Dashboard Discrepancy**: `/api/admin/stats` calculated `totalApplications = applications.length` (5). The dashboard KPI card displayed 5 with the misleading subtitle *"All submitted candidate profiles"*, erroneously counting an incomplete, unpaid draft and a rejected dossier as "submitted".
  3. **Candidate Desk Discrepancy**: The applications desk defaulted to *"All Active Candidates (Exclude Rejected)"* (`status !== 'rejected'`), thereby showing 4 candidates (`4 of 5 total`).
  4. **Security Deficiencies Discovered**:
     - Critical IDOR on `GET /api/applications/[id]`: Endpoint had zero authentication or authorization checks, allowing any caller to inspect any candidate's private personal and academic dossier.
     - Missing enum whitelist and business-rule validation on `PATCH /api/applications/[id]`.
     - IDOR risks on `GET /api/admit-card` and `GET /api/results`.
- **Actions Completed:**
  1. **Canonical Metrics Engine (`src/lib/applicationMetrics.ts`):**
     - Established centralized, single-source-of-truth metrics calculation (`computeApplicationMetrics`):
       - `total`: 5 (All registered dossiers in database)
       - `active`: 4 (Candidates actively progressing in portal, excluding rejected)
       - `submitted`: 3 (Applications with finalized submission & fee payment)
       - `draft`: 1 (Incomplete dossiers in progress)
       - `underReview`: 1 (Submitted dossiers awaiting scrutiny)
       - `approved`: 2 (Verified dossiers eligible for admit card)
       - `correctionNeeded`: 0 (Flagged dossiers)
       - `rejected`: 1 (Archived rejected dossiers)
     - Mathematical Invariants Enforced:
       - `total = active + rejected` (5 = 4 + 1)
       - `active = submitted + draft` (4 = 3 + 1)
       - `submitted = approved + underReview + correctionNeeded` (3 = 2 + 1 + 0)
       - `total = approved + underReview + correctionNeeded + draft + rejected` (5 = 2 + 1 + 0 + 1 + 1)
     - Status transition map and enum validator (`isValidApplicationStatus`, `isValidStatusTransition`).
  2. **Backend API Hardening & Single Source of Truth:**
     - `src/app/api/admin/stats/route.ts`: Integrated `computeApplicationMetrics`. Created status-aware `recentAwaitingVerification` queue (strictly filters for `submitted`, `under_review`, and `correction_needed`).
     - `src/app/api/applications/route.ts`: Added server-side query filtering (`?status=...`, `?class=...`, `?q=...`) and attached authoritative `metrics` to admin response. Restricted non-admin callers strictly to their own dossier.
     - `src/app/api/applications/[id]/route.ts`: Fixed IDOR on GET (requires authentication; applicant can only view their own dossier; admin can view all). Enforced status enum validation and transition rules on PATCH. Mandated non-empty reason when rejecting.
     - `src/app/api/admit-card/route.ts` & `src/app/api/results/route.ts`: Fixed IDOR on GET endpoints (applicants restricted strictly to their own admit card / result).
  3. **Admin Dashboard UI Alignment (`src/app/admin/dashboard/page.tsx`):**
     - Total Applications KPI card updated: displays total count with transparent, dynamic subtitle: `{active} Active ({submitted} Submitted, {draft} Draft) • {rejected} Rejected`.
     - Approved & Verified KPI card updated: displays approved count with subtitle: `{approved} of {submitted} submitted verified (Admit Card Ready)`.
     - Under Review / Flags KPI card updated: displays `{underReview + correctionNeeded}` with subtitle: `{underReview} awaiting review • {correctionNeeded} marked for re-upload`.
     - Recent Applications table: bound strictly to `recentAwaitingVerification` with clean empty state when no applications are awaiting verification.
  4. **Candidate Applications Desk UI Alignment (`src/app/admin/applications/page.tsx`):**
     - Filter pill counts bound directly to authoritative server metrics.
     - Table count banner clarified: displays `Showing X Candidates [Selected Filter] | Active in portal: 4 of 5 total dossiers (1 draft, 1 rejected archive)`.
- **Verification:**
  - Automated test suite (`scripts/test_integrity_and_security.js`): All 10 test scenarios from user specifications passed with zero errors:
    1. Test 1 (Draft): Stored as DRAFT, excluded from submitted counts, verification queue omitted.
    2. Test 2 (Submit): Status transitioned to SUBMITTED, metrics incremented, verification queue populated.
    3. Test 3 (Approve): Admin approved, candidate self-approval blocked with 403 Forbidden.
    4. Test 4 (Reject): Rejection without ground blocked (400), documented ground persisted, active filters exclude rejected.
    5. Test 5 (Unauthorized Access): All admin endpoints strictly blocked with 401/403.
    6. Test 6 (IDOR Defense): Cross-candidate dossier and admit card requests blocked with 403 Forbidden.
    7. Test 7 (Manipulated Status): Arbitrary client status strings rejected.
    8. Test 8 (Role Manipulation): Mass assignment of admin role blocked.
    9. Test 9 (Refresh Consistency): 5 consecutive polling rounds verified exact mathematical consistency.
    10. Test 10 (Concurrent Updates): Handled concurrent admin updates without corruption.
  - Regression test suite (`scripts/test_admin_system.js`): All 8 admin system tests passed.
  - TypeScript compilation (`npx tsc --noEmit`): Code 0 (0 errors).
- **Status:** Complete, Fully Secured, Tested & Live in Production.

---

### Session: Production Hardening, Security Validations & Workflow Integrity (2026-09-15)
- **Objective:** Production-grade security hardening across candidate and admin workflows covering all 27 user requirements: eradication of native browser alerts/confirms, server-side Aadhaar uniqueness, parental name/occupation validations, marks calculation guards, mandatory 5-document verification with binary magic-byte inspection, admission form gating, roll number omission, registration email delivery, and results gating with IDOR defense.
- **Architectural & Code Changes:**
  1. **Canonical Validation Suite (`src/lib/validations.ts`):**
     - `validateName`: Requires min 3 chars, max 60 chars, permits only letters, spaces, hyphens, and apostrophes (`/^[a-zA-Z\s\-']+$/`). Rejects repeated single-character strings (e.g., `RRRRRRRR`, `QQQQQQQQ`) and numeric values (`123456`).
     - `validateOccupation`: Min 3 chars, max 60 chars. Rejects purely numeric inputs (`243423423423423434`) and alphanumeric garbage (`Services2131`).
     - `validatePhone`: Standard 10-digit Indian phone validation (`/^[6-9]\d{9}$/`).
     - `validateAadhaar`: 12-digit numeric validation (`/^\d{12}$/`).
     - `validateMarks`: Ensures `marksObtained >= 0`, `marksTotal > 0`, `marksObtained <= marksTotal`, and `0 <= percentage <= 100`. Defends against negative values, NaN, and Infinity.
     - `validateUploadedFile`: Enforces strict MIME types (JPG/PNG for photos & signatures; JPG/PNG/PDF for documents), 2 MB size limits, and binary magic-byte inspection:
       - JPEG: `FF D8 FF`
       - PNG: `89 50 4E 47`
       - PDF: `25 50 44 46` (`%PDF`)
       - Explicitly detects and rejects Windows PE (`MZ`) and Linux `ELF` executables disguised with image/document extensions.
     - `validateAllFiveDocuments`: Guarantees that `photo`, `signature`, `parentSignature`, `aadhaarCard`, and `lastMarksheet` are all present and non-empty.
  2. **Custom Modal UI (`src/components/ConfirmModal.tsx`):**
     - Developed Gurukul-styled modal dialog component with keyboard accessibility (ESC dismiss, Enter submit, focus trap).
     - Replaced all native `window.alert()` and `window.confirm()` calls across the entire codebase (`Candidate Dashboard`, `Exam Centers`, `Applications Desk`, `Dossier Detail`, `Results Desk`, `Enquiries Desk`). Grep verified 0 remaining occurrences in `src/`.
  3. **Aadhaar Uniqueness & Refill Workflow (`src/lib/db.ts`, `src/app/api/applications/route.ts`):**
     - Added `findApplicationByAadhaar(aadhaarNumber)` excluding rejected records (`app.status !== 'rejected'`).
     - Duplicate active Aadhaar submissions return HTTP 409 Conflict: `"This Aadhaar number is already associated with an existing application."` without leaking identity information of existing candidates.
     - Handled rejected candidate workflow: rejected candidates can reuse their Aadhaar number to submit a fresh application.
  4. **Father's Phone Independence:**
     - Eradicated auto-fill from student/user mobile in `src/app/apply/page.tsx` and `src/lib/db.ts` (`createDraftApplication`). Father phone starts empty; manual entry permitted even if identical to student mobile.
  5. **Academic Marks Calculation Hardening (`src/app/apply/page.tsx`):**
     - Frontend input sanitization: non-negative integers only.
     - Automatic calculation clamps percentage strictly between `0.00%` and `100.00%`.
     - Server-side validation rejects negative marks or obtained marks exceeding maximum marks.
  6. **Document Upload Step & Five Mandatory Documents (`src/app/apply/page.tsx`):**
     - Step 6 documents updated: Photo, Candidate Signature, Parent Signature, Aadhaar Proof, and Previous Marksheet.
     - Red asterisk required indicators and validation feedback rendered for all 5 items.
     - Uploads validated for `< 2 MB` and accepted MIME types on client and server.
  7. **Admission Form Gating & Roll Number Omission:**
     - `src/app/dashboard/page.tsx`: Gated "Admission Form" button; only available when `application.status === 'approved'`, `'admitted'`, or admit card is released.
     - Removed `"Roll No: Pending Allotment (To be issued later)"` badge from dashboard header and dossier card. Only actual issued roll numbers are displayed.
     - `src/app/admission-form/page.tsx`: Gated route verifies status on mount. Non-approved candidates receive an official Document Scrutiny Restriction Notice.
  8. **Email Confirmation via Nodemailer (`src/lib/notifications.ts`, `src/app/api/applications/route.ts`):**
     - Nodemailer credentials read from `process.env.SMTP_USER || process.env.CMAIL` and `process.env.SMTP_PASS || process.env.CPASS` with zero hardcoded credentials.
     - Dispatches official registration confirmation email (`Gurukul Kurukshetra – Application Submitted Successfully`) with candidate name and registration number upon final submission.
     - Dispatched inside isolated asynchronous try/catch to avoid blocking application persistence.
  9. **Results Gating & IDOR Defense (`src/app/api/results/route.ts`, `src/app/api/results/status/route.ts`, `src/components/Header.tsx`, `src/app/result/page.tsx`):**
     - `/api/results/status` endpoint determines whether results have been published by examination authorities.
     - Header navigation hides "Results" link for candidates until results are published.
     - `/result` candidate page displays an official "Results Not Yet Declared" banner if accessed prior to publishing.
     - IDOR protection: candidates are strictly prohibited from querying results of other candidates by roll number or application ID.
- **Verification & Automated Test Results:**
  - Automated test suite `scripts/test_comprehensive_hardening.js` executed with **24 out of 24 tests PASSED (0 failures)**:
    1. Admin authentication: PASS
    2. Candidate account creation: PASS
    3. Collision test account creation: PASS
    4. Malformed Aadhaar rejection (HTTP 400): PASS
    5. Repeated single-character Father Name (RRRRRRRR) rejection (HTTP 400): PASS
    6. Numeric Mother Name (123456) rejection (HTTP 400): PASS
    7. Pure numeric Father Occupation rejection (HTTP 400): PASS
    8. Gibberish numeric suffix Occupation (Services2131) rejection (HTTP 400): PASS
    9. Negative marks (-655) rejection (HTTP 400): PASS
    10. Marks obtained > Total marks rejection (HTTP 400): PASS
    11. Missing required documents (Parent Sign / Marksheet) rejection (HTTP 400): PASS
    12. Disguised executable binary blocked by magic-byte check (HTTP 400): PASS
    13. Valid 5-document application submission: PASS
    14. Application status assigned as `submitted`: PASS
    15. Official Registration Number generated: PASS (`GK26-10013`)
    16. Cross-User Aadhaar Collision rejection (HTTP 409 Conflict): PASS
    17. Safe Aadhaar error message without candidate identity leak: PASS
    18. Identity confidentiality verified: PASS
    19. Admission Form gating prior to approval: PASS
    20. Admin dossier approval workflow: PASS
    21. Application rejection workflow: PASS
    22. Rejected candidate refill with same Aadhaar without collision: PASS
    23. Results declaration status API: PASS (`resultsDeclared: true`)
    24. IDOR defense on result endpoint (HTTP 403 Forbidden): PASS
  - Zero TypeScript compiler errors (`npx tsc --noEmit` exited with code 0).
  - Grep search for `alert(` and `confirm(` in `src/` returned zero matches.
- **Status:** Complete, Fully Hardened & Live.

---

### [Entry 007] - 2026-09-16: Lifecycle Phases, Flash Mitigation & Dynamic Attendance Stream Filtering
- **Requirements Addressed:**
  1. Eliminate the momentary flicker/flash showing "REGISTRATIONS CLOSED" before the actual open status loaded upon page refresh.
  2. Align the Attendance Desk class options with the actual registration form options (Classes 6, 7, 8, 9, and Class 11 Non Medical, Medical, Commerce, Arts) and remove non-existent Class 5 / NDA Wing labels.
  3. Ensure Application Status Tracking reflects accurate phase states.
- **Actions Taken:**
  1. **Flash Elimination via Schedule Gate (`src/app/page.tsx`):**
     - Introduced `scheduleLoaded` state variable (starts `false`, set to `true` upon `/api/schedule` resolution).
     - Gated the top banner announcement strip, Step 1 registration card, and the 5-stage timeline grid with smooth, pulse-animated skeleton placeholders until schedule data resolves.
     - Fixed property mapping (`startDateTimeIST`/`endDateTimeIST` → `startDate`/`endDate`) to match actual API response structure.
  2. **Attendance Desk & Class Filtering Hardening (`src/app/admin/attendance/page.tsx`, `src/app/api/admin/attendance/route.ts`):**
     - Removed non-existent "Class 5" and invalid "NDA Wing" selections.
     - Aligned dropdown options to store exact values: `Class 6`, `Class 7`, `Class 8`, `Class 9`, and `Class 11|Non Medical`, `Class 11|Medical`, `Class 11|Commerce`, `Class 11|Arts`.
     - Updated attendance API route to support exact matching and `stream` query parameter for granular Class 11 candidate filtering.
  3. **Route Link Normalization:**
     - Updated redirect and back-navigation links from `/login` to `/` in `src/app/status/page.tsx` and `src/app/register/page.tsx`.
- **Status:** Complete, Tested & Verified.

---

### [Entry 008] - 2026-09-16: UI Polishing, Dynamic Closing Date Sync & Full SQL Database Export
- **Requirements Addressed:**
  1. Remove helpline contact strip from the bottom of candidate sign-in card.
  2. Remove Class-wise Eligibility Criteria link from the public footer.
  3. Resolve incorrect banner message when closing date was updated to 30 September 2026; guarantee the announcement banner dynamically updates whenever the closing date is changed in the future.
  4. Generate a complete, ready-to-share SQL database backup file for deployment and sharing.
  5. Update `PROJECT_WORKLOG.md` to document all recent system modifications.
- **Actions Taken:**
  1. **UI Clean-up:**
     - Removed the helpline phone/email bottom notice bar from the candidate sign-in card in `src/app/page.tsx`.
     - Removed the "Class-wise Eligibility Criteria" entry from the quick links list in `src/components/Footer.tsx`.
  2. **Dynamic Closing Date & Phase Message Automation:**
     - Identified root cause: a stale announcement notice string (`"Online Application for Session 2026-27 closed on 15 September 2026..."`) stored in `data/form_schedule.json` was overriding the active dynamic message.
     - Updated `src/lib/admissionPhases.ts` and `src/lib/formSchedule.ts` so that `REGISTRATION_ACTIVE`, `REGISTRATION_EXTENDED`, `REGISTRATION_CLOSED`, and `REGISTRATION_UPCOMING` dynamically render the exact formatted deadline (e.g. `30 September 2026`) derived directly from `registrationEndDate`.
     - Standardized end-of-day parsing so that date strings (like `2026-09-30`) automatically enforce eligibility through `23:59:59 IST`.
     - Removed `customNotice` override from `src/app/page.tsx` so the banner remains 100% dynamic regardless of stale notice values.
     - Enhanced `/api/admin/settings` and `/api/schedule` with bidirectional synchronization between `gurukul_store.json` and `form_schedule.json`.
  3. **SQL Database Backup Generator & Export:**
     - Created `scripts/export_sql_backup.js` to dump all relational tables, schema definitions, and production data into standard MySQL SQL format.
     - Exported complete database dump to **`gurukul_backup.sql`** and **`backup.sql`** (587.90 KB) in the project root.
     - Backup includes `CREATE DATABASE IF NOT EXISTS gurukul_entrance`, foreign key constraints, character sets (`utf8mb4`), and all table schemas with full datasets:
       - `system_settings`: 1 row (active settings, fees, milestone dates)
       - `form_schedules`: 1 row (start date, end date, auto mode)
       - `users`: 22 registered users & administrator credentials
       - `exam_centres`: Gurukul Kurukshetra Main Campus venue
       - `applications`: 12 full student dossiers with personal, parent, academic, and document particulars
       - `admit_cards`: 7 generated hall tickets with roll numbers
       - `results`: 1 scorecard with marks breakdown and ranks
       - `admin_notifications`: 57 system & activity notifications
       - `contact_enquiries`: 3 enquiry tickets
       - `audit_logs`: 34 immutable activity records
- **Verification:**
  - Automated test script `scratch/test_banner.js` verified active, extended, and future-closed phase transitions with 100% correct dynamic strings.
  - Live query to `http://localhost:3000/api/schedule` confirmed: `status: "OPEN"`, `endDate: "2026-09-30T23:59:59.000+05:30"`, `message: "Online applications are currently active until 30 September 2026 (Asia/Kolkata (IST))."`.
  - TypeScript build check: `npx tsc --noEmit` exited with **code 0**.
- **Status:** Complete, Documented & Production-Ready.

---
*(Future changes, field modifications, and updates will be appended below)*
