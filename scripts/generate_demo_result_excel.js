const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Data matching actual database candidates + test cases
const demoResults = [
  {
    'Candidate Name': 'Aarav Sharma',
    'Roll Number': '27060001',
    'DOB': '15/07/2014',
    'Remark': 'Qualified for Admission. Selected in First Merit List.',
  },
  {
    'Candidate Name': 'Rohan Sharma',
    'Roll Number': '27060002',
    'DOB': '10/05/2014',
    'Remark': 'Qualified - Selected for Class 6th Nilokheri Wing.',
  },
  {
    'Candidate Name': 'Ayushi',
    'Roll Number': '27060003',
    'DOB': '08/08/2004',
    'Remark': 'Qualified - Selected for Class 6th Girls Wing.',
  },
  {
    'Candidate Name': 'Anshu Miglani',
    'Roll Number': '27110001',
    'DOB': '08/08/2003',
    'Remark': 'Qualified for Class 11th Science Stream.',
  },
  {
    'Candidate Name': 'Kavya Verma',
    'Roll Number': '27060004',
    'DOB': '20/08/2014',
    'Remark': 'Qualified for Admission.',
  },
  {
    'Candidate Name': 'Rohan Gupta',
    'Roll Number': '27060005',
    'DOB': '15/01/2014',
    'Remark': 'Not Qualified for current admission session.',
  },
  {
    'Candidate Name': 'Aditi Singh',
    'Roll Number': '27060006',
    'DOB': '03/11/2014',
    'Remark': 'Qualified for Admission.',
  },
  {
    'Candidate Name': 'Daksh Kumar',
    'Roll Number': '27060007',
    'DOB': '19/04/2014',
    'Remark': 'Not Qualified.',
  }
];

// 1. Create worksheet
const worksheet = XLSX.utils.json_to_sheet(demoResults);

// 2. Set optimal column widths
worksheet['!cols'] = [
  { wch: 22 }, // Candidate Name
  { wch: 16 }, // Roll Number
  { wch: 14 }, // DOB
  { wch: 48 }, // Remark
];

// 3. Create workbook
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

// 4. Save to public directory for direct download in browser
const publicPath = path.join(__dirname, '..', 'public', 'Gurukul_Results_Demo.xlsx');
XLSX.writeFile(workbook, publicPath);
console.log('Saved demo excel file to:', publicPath);

// Also save to root workspace for easy direct access
const rootPath = path.join(__dirname, '..', 'Gurukul_Results_Demo.xlsx');
XLSX.writeFile(workbook, rootPath);
console.log('Saved demo excel file to:', rootPath);
