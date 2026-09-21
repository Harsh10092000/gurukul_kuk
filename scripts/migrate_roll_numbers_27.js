const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'data', 'gurukul_store.json');
const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

// Helper to determine class code
function getClassCode(classApplying) {
  if (!classApplying) return '06';
  const num = String(classApplying).replace(/\D/g, '');
  if (!num) return '06';
  return num.padStart(2, '0');
}

// 1. Sort applications: by class code, then by registration number / application number
const classCounters = {};

// Specific mapping for existing candidates to guarantee exact sequential order
// 1. Aarav Sharma -> Class 6 -> 27060001
// 2. Rohan Sharma -> Class 6 -> 27060002
// 3. Ayushi -> Class 6 -> 27060003
// 4. Anshu Miglani -> Class 11 -> 27110001
const rollMap = {
  'GK26-10001': '27060001',
  'NILB-00001': '27060002',
  'NILG-00001': '27060003',
  'NILB-00002': '27110001',
};

// Update applications
(store.applications || []).forEach((app) => {
  const reg = app.registrationNumber || app.applicationNumber;
  if (rollMap[reg]) {
    app.rollNumber = rollMap[reg];
  } else {
    const classCode = getClassCode(app.classApplying);
    const prefix = `27${classCode}`;
    classCounters[classCode] = (classCounters[classCode] || 0) + 1;
    app.rollNumber = `${prefix}${String(classCounters[classCode]).padStart(4, '0')}`;
  }
  console.log(`Application [${app.id}] ${app.personalInfo?.fullName} (${app.classApplying}): Roll = ${app.rollNumber}`);
});

// Update admit cards
(store.admitCards || []).forEach((card) => {
  const matchingApp = (store.applications || []).find(
    (a) => a.id === card.applicationId || (a.registrationNumber && a.registrationNumber === card.applicationNumber)
  );
  if (matchingApp && matchingApp.rollNumber) {
    card.rollNumber = matchingApp.rollNumber;
  } else if (rollMap[card.applicationNumber]) {
    card.rollNumber = rollMap[card.applicationNumber];
  }
  console.log(`AdmitCard [${card.id}] ${card.candidateName} (${card.classApplying}): Roll = ${card.rollNumber}`);
});

// Update results
(store.results || []).forEach((res) => {
  const matchingApp = (store.applications || []).find(
    (a) => a.id === res.applicationId || (a.registrationNumber && a.registrationNumber === res.applicationNumber)
  );
  if (matchingApp && matchingApp.rollNumber) {
    res.rollNumber = matchingApp.rollNumber;
  } else if (rollMap[res.applicationNumber]) {
    res.rollNumber = rollMap[res.applicationNumber];
  }
  console.log(`Result [${res.id}] ${res.candidateName} (${res.classApplying}): Roll = ${res.rollNumber}`);
});

fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
console.log('Successfully updated gurukul_store.json with 27-series class-based sequential roll numbers!');
