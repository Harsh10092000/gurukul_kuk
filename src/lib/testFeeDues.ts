/**
 * Server-side source of truth for the HDFC SmartGateway audit "fee due" catalog.
 *
 * This mirrors the TEST_FEE_DUES list shown in src/app/payment/page.tsx. The amount for a
 * given dueId must NEVER be taken from the client/request body — the bank's security audit
 * flagged exactly that as a "Parameter Manipulation - Request Amount Tampering" vulnerability.
 * The client may only tell us *which* due it wants to pay (dueId); the amount is always
 * looked up here, server-side.
 */
export interface TestFeeDue {
  id: string;
  code: string;
  title: string;
  amount: number;
}

export const TEST_FEE_DUES: TestFeeDue[] = [
  { id: 'DUE-01', code: 'FEE-VRF-01', title: 'Registration Verification Token', amount: 2 },
  { id: 'DUE-02', code: 'FEE-DOC-02', title: 'Digital Document Authentication Fee', amount: 5 },
  { id: 'DUE-03', code: 'FEE-LIB-03', title: 'Library RFID Smart Card Due', amount: 10 },
  { id: 'DUE-04', code: 'FEE-SPT-04', title: 'Sports Facility & Kit Assessment Token', amount: 12 },
  { id: 'DUE-05', code: 'FEE-SEC-05', title: 'Campus Security & Identity Badge Fee', amount: 15 },
  { id: 'DUE-06', code: 'FEE-MED-06', title: 'Student Medical Fitness Record Charge', amount: 18 },
  { id: 'DUE-07', code: 'FEE-HST-07', title: 'Hostel Utility & Linen Maintenance Token', amount: 20 },
  { id: 'DUE-08', code: 'FEE-ICT-08', title: 'Computer Lab & ICT Induction Due', amount: 25 },
  { id: 'DUE-09', code: 'FEE-VED-09', title: 'Vedic Studies & Sanskrit Handbook', amount: 30 },
  { id: 'DUE-10', code: 'FEE-SCI-10', title: 'Science Practical Lab Consumables', amount: 35 },
  { id: 'DUE-11', code: 'FEE-ACT-11', title: 'Cultural & Co-Curricular Activity Due', amount: 40 },
  { id: 'DUE-12', code: 'FEE-DIN-12', title: 'Dining Hall Services & Maintenance', amount: 45 },
  { id: 'DUE-13', code: 'FEE-LAN-13', title: 'Language Lab & Audio Material Surcharge', amount: 50 },
  { id: 'DUE-14', code: 'FEE-GYM-14', title: 'The Gurukul Swimming Pool & Gym Due', amount: 55 },
  { id: 'DUE-15', code: 'FEE-EXM-15', title: 'Mid-Term Examination Processing Fee', amount: 65 },
  { id: 'DUE-16', code: 'FEE-ROB-16', title: 'Robotics & STEM Innovation Workshop', amount: 75 },
  { id: 'DUE-17', code: 'FEE-WLF-17', title: 'Annual Student Welfare Fund Surcharge', amount: 80 },
  { id: 'DUE-18', code: 'FEE-ADM-18', title: 'Admit Card Re-generation & Courier Token', amount: 85 },
  { id: 'DUE-19', code: 'FEE-CMP-19', title: 'Orientation Camp Logistics Surcharge', amount: 92 },
  { id: 'DUE-20', code: 'FEE-DOS-20', title: 'Final Admission Dossier Processing Fee', amount: 99 },
];

export function getTestFeeDue(dueId: string): TestFeeDue | undefined {
  return TEST_FEE_DUES.find((d) => d.id === dueId);
}
