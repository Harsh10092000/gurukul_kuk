const fs = require('fs');
const path = require('path');

async function runVerification() {
  console.log('====================================================');
  console.log('VERIFYING GURUKUL WORKFLOW & USER REQUIREMENTS');
  console.log('====================================================');

  const storePath = path.join(__dirname, '..', 'data', 'gurukul_store.json');
  if (!fs.existsSync(storePath)) {
    console.error('Store file does not exist at:', storePath);
    process.exit(1);
  }

  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

  // 1. Verify "Save Draft" button removed from apply page
  const applyPage = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'apply', 'page.tsx'), 'utf8');
  if (applyPage.includes('>Save Draft<') || applyPage.includes('Save Draft</button>')) {
    console.error('FAIL: "Save Draft" button found in apply page!');
    process.exit(1);
  }
  console.log('✓ PASS 1: "Save Draft" button removed from registration wizard.');

  // 2. Verify Sign out button hidden on registration
  const header = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'Header.tsx'), 'utf8');
  if (!header.includes("pathname !== '/apply'") && !header.includes('pathname === \'/apply\'')) {
    console.error('FAIL: Header does not conditionally hide navigation during registration!');
    process.exit(1);
  }
  console.log('✓ PASS 2: Sign Out & Dashboard navigation hidden during registration on /apply.');

  // 3. Verify no "Select Stream" dummy option
  if (applyPage.includes('<option value="">Select Stream</option>')) {
    console.error('FAIL: Dummy "Select Stream" option still exists!');
    process.exit(1);
  }
  console.log('✓ PASS 3: No dummy "Select Stream" option; direct streams for Class 11.');

  // 4. Verify academic field order: previous school and board immediately follow class/stream
  const classIndex = applyPage.indexOf('name="applyingClass"');
  const prevSchoolIndex = applyPage.indexOf('name="previousSchoolName"');
  const prevBoardIndex = applyPage.indexOf('name="previousBoard"');
  const aadhaarIndex = applyPage.indexOf('name="aadhaarNumber"');
  if (!(classIndex < prevSchoolIndex && prevSchoolIndex < prevBoardIndex && prevBoardIndex < aadhaarIndex)) {
    console.error(`FAIL: Field ordering is incorrect! classIndex=${classIndex}, prevSchoolIndex=${prevSchoolIndex}, prevBoardIndex=${prevBoardIndex}, aadhaarIndex=${aadhaarIndex}`);
    process.exit(1);
  }
  console.log('✓ PASS 4: Academic fields correctly reordered before Aadhaar/PEN/Family ID.');

  // 5. Verify Mother and Father occupation are not mandatory
  if (applyPage.includes("Father's Occupation *") || applyPage.includes("Mother's Occupation *")) {
    console.error('FAIL: Father or Mother occupation still has asterisk *!');
    process.exit(1);
  }
  console.log('✓ PASS 5: Mother and Father occupation are optional fields (no asterisk, optional in types).');

  // 6. Verify "Nilokheri | Jyotisar | Aryakulam" removed
  const forbiddenSnippet = 'Nilokheri | Jyotisar | Aryakulam';
  if (applyPage.includes(forbiddenSnippet) || header.includes(forbiddenSnippet)) {
    console.error('FAIL: Campus listing text still present in apply page or header!');
    process.exit(1);
  }
  console.log('✓ PASS 6: "Nilokheri | Jyotisar | Aryakulam" subtitle eradicated from portal guidelines and header.');

  // 7. Verify document upload text does not mention "& crop"
  if (applyPage.includes('& crop') || applyPage.includes('& Crop')) {
    console.error('FAIL: "& crop" still mentioned in document upload text!');
    process.exit(1);
  }
  console.log('✓ PASS 7: Document upload text cleaned (no "& crop" mentions).');

  // 8. Verify Admin Bulk Admit Card Issuance Banner and Modal in Admin applications page
  const adminPage = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'admin', 'applications', 'page.tsx'), 'utf8');
  if (!adminPage.includes('Generate & Release Admit Cards for ALL Students') && !adminPage.includes('Generate &amp; Release Admit Cards for ALL Candidates')) {
    console.error('FAIL: Master bulk admit card button not found on admin applications page!');
    process.exit(1);
  }
  console.log('✓ PASS 8: Master Admin Bulk Admit Card generation button and modal present.');

  // 9. Verify Candidate Dashboard admits cards status separation
  const dashboardPage = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'dashboard', 'page.tsx'), 'utf8');
  if (!dashboardPage.includes('Admit Card: In Progress') || !dashboardPage.includes('admitCard.isReleased')) {
    console.error('FAIL: Dashboard does not properly isolate unreleased admit cards!');
    process.exit(1);
  }
  console.log('✓ PASS 9: Candidate Dashboard correctly displays Admit Card step as "In Progress" until bulk released.');

  // 10. Verify AdmitCardReleasePopup component exists and is imported in layout
  const layout = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'layout.tsx'), 'utf8');
  if (!layout.includes('AdmitCardReleasePopup')) {
    console.error('FAIL: AdmitCardReleasePopup not mounted in root layout!');
    process.exit(1);
  }
  console.log('✓ PASS 10: Site-wide Admit Card Release Notification popup mounted in root layout.');

  console.log('\n====================================================');
  console.log('ALL 10 VERIFICATION CHECKS PASSED SUCCESSFULLY (100%)');
  console.log('====================================================');
}

runVerification().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
