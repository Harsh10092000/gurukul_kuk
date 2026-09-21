/**
 * The Gurukul Nilokheri Portal - Shared Validation & Security Utilities
 * Canonical validation for names, occupations, marks, documents, phone, and Aadhaar.
 * Enforced on both Frontend and Backend API routes.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate Person Name (Candidate, Father, Mother)
 * - Must be between 3 and 60 characters
 * - Allows alphabets, spaces, and standard name punctuation ('. -)
 * - Rejects numbers, special symbols (@, #, $, etc.)
 * - Rejects repeated single-character junk (e.g., 'RRRRRRRR', 'QQQQQQQQ')
 * - Requires at least 2 distinct letters for names longer than 3 chars
 */
export function validateName(name: string | undefined | null, fieldLabel: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: `${fieldLabel} is required.` };
  }

  const trimmed = name.trim();

  if (trimmed.length < 3) {
    return { isValid: false, error: `${fieldLabel} must be at least 3 characters long.` };
  }

  if (trimmed.length > 60) {
    return { isValid: false, error: `${fieldLabel} cannot exceed 60 characters.` };
  }

  // Allow alphabets, spaces, periods, hyphens, and apostrophes
  const validNamePattern = /^[a-zA-Z\s.'-]+$/;
  if (!validNamePattern.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldLabel} can only contain alphabetic characters, spaces, hyphens, and apostrophes (no numbers or symbols).`,
    };
  }

  // Check for repeated single-character sequences (e.g. RRRRRRRR, AAAA, aaaaa)
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (lettersOnly.length >= 3) {
    const uniqueChars = new Set(lettersOnly);
    if (uniqueChars.size < 2) {
      return {
        isValid: false,
        error: `Please enter a valid, legitimate ${fieldLabel.toLowerCase()} (repetitive single-letter values are not accepted).`,
      };
    }
  }

  // Check for consecutive identical characters repeated 4 or more times (e.g., "Rrrrrr", "Johnnnnn")
  if (/([a-zA-Z])\1{3,}/i.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldLabel} contains an invalid sequence of repeated characters. Please enter a valid name.`,
    };
  }

  return { isValid: true };
}

/**
 * Validate Occupation (Father's, Mother's)
 * - Must be between 2 and 60 characters
 * - Meaningful text (letters, spaces, common punctuation: ., / & - ( ))
 * - Rejects numeric sequences / digit junk like 'Services2131' or '243423423423423434'
 */
export function validateOccupation(occupation: string | undefined | null, fieldLabel: string): ValidationResult {
  if (!occupation || typeof occupation !== 'string') {
    return { isValid: true }; // Optional or handled by mandatory check
  }

  const trimmed = occupation.trim();
  if (trimmed.length === 0) {
    return { isValid: true };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: `${fieldLabel} must be at least 2 characters long.` };
  }

  if (trimmed.length > 60) {
    return { isValid: false, error: `${fieldLabel} cannot exceed 60 characters.` };
  }

  // Strictly reject any digits/numbers in occupation
  if (/\d/.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldLabel} must not contain numbers or numeric sequences (e.g. '${trimmed}'). Please enter a valid occupation title.`,
    };
  }

  // Allow alphabetic, spaces, hyphens, slashes, ampersands, commas, periods, parentheses
  const validPattern = /^[a-zA-Z\s.,/&()-]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldLabel} contains invalid characters. Please enter legitimate occupation text.`,
    };
  }

  // Rejects repetitive character strings like 'AAAAAAAA'
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (lettersOnly.length >= 3) {
    const uniqueChars = new Set(lettersOnly);
    if (uniqueChars.size < 2) {
      return {
        isValid: false,
        error: `Please enter a valid ${fieldLabel.toLowerCase()} (repetitive letters are not accepted).`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate Phone Number (Father, Mother, Student)
 * - Must be 10 digits
 * - Must start with 6, 7, 8, or 9
 * - Rejects repeated single digit like '9999999999'
 */
export function validatePhone(phone: string | undefined | null, fieldLabel: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: `${fieldLabel} is required.` };
  }

  const clean = phone.replace(/\D/g, '');
  if (clean.length !== 10) {
    return { isValid: false, error: `${fieldLabel} must be exactly 10 digits.` };
  }

  if (!/^[6-9]\d{9}$/.test(clean)) {
    return { isValid: false, error: `${fieldLabel} must be a valid Indian mobile number starting with 6, 7, 8, or 9.` };
  }

  if (/^([6-9])\1{9}$/.test(clean)) {
    return { isValid: false, error: `${fieldLabel} cannot consist of the same repeated digit.` };
  }

  return { isValid: true };
}

/**
 * Validate Aadhaar Card Number
 * - Exactly 12 digits (numbers only)
 * - Rejects all-same digits (e.g., '000000000000', '111111111111')
 */
export function validateAadhaar(aadhaar: string | undefined | null): ValidationResult {
  if (!aadhaar || typeof aadhaar !== 'string') {
    return { isValid: false, error: 'Aadhaar card number is required.' };
  }

  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length !== 12) {
    return { isValid: false, error: 'Aadhaar card number must be exactly 12 digits.' };
  }

  if (/^(\d)\1{11}$/.test(clean)) {
    return { isValid: false, error: 'Please enter a valid 12-digit Aadhaar number.' };
  }

  return { isValid: true };
}

/**
 * Validate Academic Marks Obtained and Maximum Marks
 * - 0 <= marksObtained <= marksTotal
 * - marksTotal > 0
 * - 0% <= percentage <= 100%
 * - Guards against NaN, Infinity, negative values, and malformed strings
 */
export function validateMarks(
  marksObtained: number | string | undefined | null,
  marksTotal: number | string | undefined | null
): { isValid: boolean; error?: string; percentage?: number } {
  if (marksObtained === undefined || marksObtained === null || marksObtained === '') {
    return { isValid: false, error: 'Marks obtained is required.' };
  }
  if (marksTotal === undefined || marksTotal === null || marksTotal === '') {
    return { isValid: false, error: 'Total maximum marks is required.' };
  }

  const obt = typeof marksObtained === 'number' ? marksObtained : parseFloat(String(marksObtained));
  const tot = typeof marksTotal === 'number' ? marksTotal : parseFloat(String(marksTotal));

  if (isNaN(obt) || !isFinite(obt)) {
    return { isValid: false, error: 'Marks obtained must be a valid number.' };
  }
  if (isNaN(tot) || !isFinite(tot)) {
    return { isValid: false, error: 'Total maximum marks must be a valid number.' };
  }

  if (obt < 0) {
    return { isValid: false, error: 'Marks obtained cannot be negative (must be 0 or greater).' };
  }
  if (tot <= 0) {
    return { isValid: false, error: 'Total maximum marks must be greater than 0.' };
  }
  if (obt > tot) {
    return { isValid: false, error: `Marks obtained (${obt}) cannot exceed total maximum marks (${tot}).` };
  }

  const pct = parseFloat(((obt / tot) * 100).toFixed(2));
  if (pct < 0 || pct > 100) {
    return { isValid: false, error: 'Computed percentage must be between 0% and 100%.' };
  }

  return { isValid: true, percentage: pct };
}

/**
 * Validate Date of Birth
 * - Required
 * - Must be a valid date
 * - Cannot be greater than today's date
 */
export function validateDob(dob: string | undefined | null): ValidationResult {
  if (!dob || typeof dob !== 'string' || !dob.trim()) {
    return { isValid: false, error: 'Date of Birth is required.' };
  }

  const trimmed = dob.trim();
  const dobDate = new Date(trimmed);
  if (isNaN(dobDate.getTime())) {
    return { isValid: false, error: 'Please enter a valid Date of Birth.' };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (dobDate > today) {
    return { isValid: false, error: 'Date of Birth cannot be greater than today’s date.' };
  }

  // Basic sanity check: year should not be earlier than 1990
  if (dobDate.getFullYear() < 1990) {
    return { isValid: false, error: 'Please enter a valid Date of Birth (year 1990 or later).' };
  }

  return { isValid: true };
}

export const CAMPUS_STREAMS_MAP: Record<string, string[]> = {
  'Gurukul Nilokheri': ['Commerce', 'Humanities', 'Non Medical', 'Medical'],
  'Gurukul Jyotisar': ['Commerce', 'Non Medical', 'Medical'],
  'Aryakulam Nilokheri': ['Commerce', 'Non Medical', 'Medical'],
};

export function getStreamsForCampus(campus?: string | null): string[] {
  if (!campus) return ['Commerce', 'Humanities', 'Non Medical', 'Medical'];
  return CAMPUS_STREAMS_MAP[campus] || ['Commerce', 'Non Medical', 'Medical'];
}

/**
 * Validate Class and Stream
 * - Allowed classes: 6, 7, 8, 9, 11 (or 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 11')
 * - Stream:
 *   - For Class 11:
 *     - Gurukul Nilokheri: Commerce, Humanities, Non Medical, Medical
 *     - Gurukul Jyotisar & Aryakulam Nilokheri: Commerce, Non Medical, Medical
 *   - For Class 6, 7, 8, 9: Stream must NOT be selected
 */
export function validateClassAndStream(
  classApplying: string | undefined | null,
  stream?: string | null,
  studyLocation?: string | null
): ValidationResult {
  if (!classApplying || typeof classApplying !== 'string' || !classApplying.trim()) {
    return { isValid: false, error: 'Class applying for is required.' };
  }

  const cleanClass = classApplying.replace(/^Class\s*/i, '').trim();
  const allowedClasses = ['6', '7', '8', '9', '11'];

  if (!allowedClasses.includes(cleanClass)) {
    return {
      isValid: false,
      error: `Invalid Class '${classApplying}'. Applications are accepted ONLY for Classes 6, 7, 8, 9, and 11.`,
    };
  }

  if (cleanClass === '11') {
    const cleanStream = (stream || '').trim();
    const cleanLocation = (studyLocation || '').trim();

    if (!cleanStream) {
      return {
        isValid: false,
        error: 'Stream selection is mandatory for Class 11.',
      };
    }

    if (cleanStream === 'Humanities' && cleanLocation && cleanLocation !== 'Gurukul Nilokheri') {
      return {
        isValid: false,
        error: `Humanities stream is offered exclusively at The Gurukul Nilokheri campus. It is not available for ${cleanLocation}.`,
      };
    }

    const allAllowed = ['Non Medical', 'Medical', 'Commerce', 'Humanities', 'Arts'];
    if (!allAllowed.includes(cleanStream)) {
      return {
        isValid: false,
        error: `Invalid stream '${cleanStream}'. Allowed streams: Commerce, Humanities, Non Medical, Medical.`,
      };
    }
  } else {
    if (stream && stream.trim().length > 0 && stream !== 'None') {
      return {
        isValid: false,
        error: `Stream is not applicable for Class ${cleanClass}. It must be left blank.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate Preferred Study Location
 * BOYS:
 * 1. Gurukul Nilokheri
 * 2. Gurukul Jyotisar
 * 3. Aryakulam Nilokheri
 *
 * GIRLS:
 * 1. Gurukul Nilokheri
 *
 * Preference rules:
 * - First Preference = REQUIRED
 * - Second Preference = OPTIONAL
 * - For GIRLS: First preference must be Gurukul Nilokheri; second preference not needed or Gurukul Nilokheri.
 * - For BOYS: First preference required; Second preference optional. Second cannot be identical to First.
 */
export const STUDY_LOCATIONS_BOYS = [
  'Gurukul Jyotisar',
  'Aryakulam Nilokheri',
] as const;

export const STUDY_LOCATIONS_GIRLS = [
  'Gurukul Nilokheri',
] as const;

export function validateStudyLocation(
  gender: string | undefined | null,
  firstPreference: string | undefined | null,
  secondPreference?: string | null,
  activeLocations?: string[] | null
): ValidationResult {
  if (!firstPreference || typeof firstPreference !== 'string' || !firstPreference.trim()) {
    return { isValid: false, error: 'First Preferred Study Location is required.' };
  }

  const first = firstPreference.trim();
  const second = secondPreference ? secondPreference.trim() : '';
  const isFemale = (gender || '').toLowerCase() === 'female';

  if (isFemale) {
    if (first !== 'Gurukul Nilokheri') {
      return {
        isValid: false,
        error: 'For female candidates, the available study location is The Gurukul Nilokheri.',
      };
    }
    return { isValid: true };
  }

  // Boys: The Gurukul Nilokheri is strictly not available for male candidates
  if (first === 'Gurukul Nilokheri' || second === 'Gurukul Nilokheri') {
    return {
      isValid: false,
      error: 'The Gurukul Nilokheri campus is exclusively for female candidates. Male candidates can apply for The Gurukul Jyotisar or Aryakulam Nilokheri.',
    };
  }

  const defaultBoysLocations = ['Gurukul Jyotisar', 'Aryakulam Nilokheri'];
  const validBoys = Array.isArray(activeLocations) && activeLocations.length > 0
    ? defaultBoysLocations.filter((l) => activeLocations.includes(l))
    : defaultBoysLocations;

  const effectiveBoys = validBoys.length > 0 ? validBoys : defaultBoysLocations;

  if (!effectiveBoys.includes(first)) {
    return {
      isValid: false,
      error: `Invalid First Preferred Study Location. For male candidates, must be one of: ${effectiveBoys.join(', ')}.`,
    };
  }

  if (second && second.length > 0 && second !== 'None') {
    if (!effectiveBoys.includes(second)) {
      return {
        isValid: false,
        error: `Invalid Second Preferred Study Location. Must be one of: ${effectiveBoys.join(', ')}.`,
      };
    }
    if (first === second) {
      return {
        isValid: false,
        error: 'Second Preferred Study Location cannot be the same as First Preferred Study Location.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate Uploaded File (Base64 Data URL or Buffer)
 * - Maximum file size 2 MB (2,097,152 bytes)
 * - Photo & Signatures: JPEG/JPG, PNG only
 * - Documents (Aadhaar): JPEG/JPG, PNG, PDF only
 * - Server-side Magic Bytes validation to reject renamed executables (MZ, ELF)
 */
export function validateUploadedFile(
  dataUrl: string | undefined | null,
  fieldKey: string
): ValidationResult {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { isValid: false, error: `Document file for '${fieldKey}' is missing or empty.` };
  }

  // Parse Data URL scheme
  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!match) {
    return { isValid: false, error: `Invalid file format for '${fieldKey}'. File must be a valid data URI.` };
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];

  // Calculate byte size: (base64Length * 3) / 4 minus padding
  const padding = (base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0);
  const byteSize = Math.floor((base64Data.length * 3) / 4) - padding;

  const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
  if (byteSize > MAX_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds 2 MB limit for '${fieldKey}'. (Actual size: ${(byteSize / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  const isPhotoOrSignature = ['photo', 'signature', 'parentSignature'].includes(fieldKey);
  const isDocument = ['aadhaarCard', 'lastMarksheet'].includes(fieldKey);

  // Validate allowed MIME types
  if (isPhotoOrSignature) {
    const allowedPhotoMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedPhotoMimes.includes(mimeType)) {
      return {
        isValid: false,
        error: `'${fieldKey}' must be an image in JPG or PNG format only (PDF and other documents are not allowed for photographs/signatures).`,
      };
    }
  } else if (isDocument) {
    const allowedDocMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedDocMimes.includes(mimeType)) {
      return {
        isValid: false,
        error: `'${fieldKey}' must be in JPG, PNG, or PDF format only.`,
      };
    }
  }

  // Server-side Magic Byte check (first 16 bytes decoded)
  try {
    const sampleLength = Math.min(base64Data.length, 64);
    const headerBuffer = Buffer.from(base64Data.slice(0, sampleLength), 'base64');

    if (headerBuffer.length >= 2) {
      // Check for Windows Executable (MZ = 0x4D, 0x5A)
      if (headerBuffer[0] === 0x4d && headerBuffer[1] === 0x5a) {
        return { isValid: false, error: `Security Warning: Dangerous executable file detected in '${fieldKey}'. Upload rejected.` };
      }

      // Check for Linux ELF executable (0x7F 'E' 'L' 'F')
      if (headerBuffer[0] === 0x7f && headerBuffer[1] === 0x45 && headerBuffer[2] === 0x4c && headerBuffer[3] === 0x46) {
        return { isValid: false, error: `Security Warning: Dangerous executable file detected in '${fieldKey}'. Upload rejected.` };
      }

      // Validate JPEG (FF D8 FF)
      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        if (!(headerBuffer[0] === 0xff && headerBuffer[1] === 0xd8 && headerBuffer[2] === 0xff)) {
          return { isValid: false, error: `Corrupt or mismatched JPEG image content in '${fieldKey}'.` };
        }
      }

      // Validate PNG (89 50 4E 47 = .PNG)
      if (mimeType.includes('png')) {
        if (!(headerBuffer[0] === 0x89 && headerBuffer[1] === 0x50 && headerBuffer[2] === 0x4e && headerBuffer[3] === 0x47)) {
          return { isValid: false, error: `Corrupt or mismatched PNG image content in '${fieldKey}'.` };
        }
      }

      // Validate PDF (%PDF = 25 50 44 46)
      if (mimeType.includes('pdf')) {
        if (!(headerBuffer[0] === 0x25 && headerBuffer[1] === 0x50 && headerBuffer[2] === 0x44 && headerBuffer[3] === 0x46)) {
          return { isValid: false, error: `Corrupt or mismatched PDF document content in '${fieldKey}'.` };
        }
      }
    }
  } catch {
    return { isValid: false, error: `Could not verify file integrity for '${fieldKey}'.` };
  }

  return { isValid: true };
}

/**
 * Validate All 4 Required Documents for Final Submission
 * 1. Candidate Photograph
 * 2. Candidate Signature
 * 3. Parent/Guardian Signature
 * 4. Candidate Aadhaar / ID Proof
 * (Previous Marksheet completely removed per specification)
 */
export function validateAllFourDocuments(documents: any): {
  isValid: boolean;
  missingFields: string[];
  error?: string;
} {
  const required = [
    { key: 'photo', label: 'Candidate Photograph' },
    { key: 'signature', label: 'Candidate Signature' },
    { key: 'parentSignature', label: 'Parent / Guardian Signature' },
    { key: 'aadhaarCard', label: 'Aadhaar / ID Proof' },
  ];

  const missingFields: string[] = [];
  const missingLabels: string[] = [];

  for (const doc of required) {
    const val = documents?.[doc.key];
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      missingFields.push(doc.key);
      missingLabels.push(doc.label);
    }
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      missingFields,
      error: `All 4 documents are mandatory before payment. Missing: ${missingLabels.join(', ')}.`,
    };
  }

  return { isValid: true, missingFields: [] };
}

// Backward compatibility alias
export const validateAllFiveDocuments = validateAllFourDocuments;

/**
 * Official contact and address constants
 */
export const OFFICIAL_HELPLINE_PHONE = '+91 7027849858 / 59';
export const OFFICIAL_FOOTER_ADDRESS = 'SIDHPUR MINOR, NIGDU ROAD, NILOKHERI 132117';

/**
 * Exam center, timing and date rules based on candidate gender:
 * - Exam Date: 14 Feb 2027 for both boys and girls
 * - Boys: Reporting Time 9:30 AM, Exam Center Aryakulam Nilokheri
 * - Girls: Reporting Time 8:30 AM, Exam Center The Gurukul Nilokheri
 */
export function getExamDetailsForGender(gender?: string, regNo?: string) {
  const isFemale =
    (gender || '').trim().toLowerCase() === 'female' ||
    (regNo || '').trim().toUpperCase().startsWith('NILG');

  if (isFemale) {
    return {
      examDate: '14 February 2027',
      examDateISO: '2027-02-14',
      reportingTime: '8:30 AM',
      examDuration: '09:00 AM to 11:30 AM (2.5 Hours)',
      examCentreName: 'The Gurukul Nilokheri',
      examCentreAddress: 'Sidhpur Minor, Nigdu Road, Nilokheri, Karnal, Haryana - 132117',
    };
  } else {
    return {
      examDate: '14 February 2027',
      examDateISO: '2027-02-14',
      reportingTime: '9:30 AM',
      examDuration: '10:00 AM to 12:30 PM (2.5 Hours)',
      examCentreName: 'Aryakulam Nilokheri',
      examCentreAddress: 'Nigdu Road, Nilokheri, Karnal, Haryana - 132117',
    };
  }
}
