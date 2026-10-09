'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Lock,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  LogOut,
  ArrowRight,
  AlertCircle,
  Sparkles,
  KeyRound,
  Search,
  RotateCcw,
  IndianRupee,
  Calendar,
  Layers,
  Check,
  Building,
  GraduationCap,
  Activity,
  Cpu,
  Coffee,
  Trophy,
  SlidersHorizontal,
} from 'lucide-react';

interface TestUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  registrationNumber: string;
}

type DueCategory =
  | 'Administrative'
  | 'Academics'
  | 'Hostel & Dining'
  | 'Sports & Gym'
  | 'Labs & Practical'
  | 'Activities & Camp';

interface FeeDueItem {
  id: string;
  code: string;
  title: string;
  category: DueCategory;
  amount: number; // Strictly less than 100 for sideflow testing
  description: string;
  academicTerm: string;
  dueDate: string;
}

// 20 Candidate Fee Dues for Gateway Sideflow Testing (All amounts strictly < ₹100)
const TEST_FEE_DUES: FeeDueItem[] = [
  {
    id: 'DUE-01',
    code: 'FEE-VRF-01',
    title: 'Registration Verification Token',
    category: 'Administrative',
    amount: 2, // Explicitly requested ₹2 due
    description: 'Preliminary applicant digital identity and biometric verification charge.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '15 Oct 2026',
  },
  {
    id: 'DUE-02',
    code: 'FEE-DOC-02',
    title: 'Digital Document Authentication Fee',
    category: 'Administrative',
    amount: 5,
    description: 'Secure digital verification of prior school certificate & mark sheet records.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '18 Oct 2026',
  },
  {
    id: 'DUE-03',
    code: 'FEE-LIB-03',
    title: 'Library RFID Smart Card Due',
    category: 'Academics',
    amount: 10, // Explicitly requested ₹10 due
    description: 'Issuance and chip activation of the campus digital library access card.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '20 Oct 2026',
  },
  {
    id: 'DUE-04',
    code: 'FEE-SPT-04',
    title: 'Sports Facility & Kit Assessment Token',
    category: 'Sports & Gym',
    amount: 12,
    description: 'Athletics field equipment maintenance surcharge and fitness kit token.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '22 Oct 2026',
  },
  {
    id: 'DUE-05',
    code: 'FEE-SEC-05',
    title: 'Campus Security & Identity Badge Fee',
    category: 'Administrative',
    amount: 15,
    description: 'Smart campus ID lanyard, barcode chip, and automated gate security badge.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '25 Oct 2026',
  },
  {
    id: 'DUE-06',
    code: 'FEE-MED-06',
    title: 'Student Medical Fitness Record Charge',
    category: 'Administrative',
    amount: 18,
    description: 'Campus infirmary baseline health checkup and physical fitness record file.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '28 Oct 2026',
  },
  {
    id: 'DUE-07',
    code: 'FEE-HST-07',
    title: 'Hostel Utility & Linen Maintenance Token',
    category: 'Hostel & Dining',
    amount: 20,
    description: 'Residential dormitory utility upkeep, sanitation, and linen laundry token.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '30 Oct 2026',
  },
  {
    id: 'DUE-08',
    code: 'FEE-ICT-08',
    title: 'Computer Lab & ICT Induction Due',
    category: 'Labs & Practical',
    amount: 25,
    description: 'Dedicated computer lab terminal access and educational portal login credential.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '02 Nov 2026',
  },
  {
    id: 'DUE-09',
    code: 'FEE-VED-09',
    title: 'Vedic Studies & Sanskrit Handbook',
    category: 'Academics',
    amount: 30,
    description: 'Traditional The Gurukul character building compendium & daily prayer handbook.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '05 Nov 2026',
  },
  {
    id: 'DUE-10',
    code: 'FEE-SCI-10',
    title: 'Science Practical Lab Consumables',
    category: 'Labs & Practical',
    amount: 35,
    description: 'Physics, Chemistry & Biology laboratory experimental apparatus and reagents.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '08 Nov 2026',
  },
  {
    id: 'DUE-11',
    code: 'FEE-ACT-11',
    title: 'Cultural & Co-Curricular Activity Due',
    category: 'Activities & Camp',
    amount: 40,
    description: 'Debating society, fine arts, classical music, and annual festival participation.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '10 Nov 2026',
  },
  {
    id: 'DUE-12',
    code: 'FEE-DIN-12',
    title: 'Dining Hall Services & Maintenance',
    category: 'Hostel & Dining',
    amount: 45,
    description: 'Satvik kitchen dining hall cutlery, RO drinking water, and hygiene surcharge.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '12 Nov 2026',
  },
  {
    id: 'DUE-13',
    code: 'FEE-LAN-13',
    title: 'Language Lab & Audio Material Surcharge',
    category: 'Academics',
    amount: 50,
    description: 'English & Sanskrit speech clarity audio modules and acoustic lab headsets.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '15 Nov 2026',
  },
  {
    id: 'DUE-14',
    code: 'FEE-GYM-14',
    title: 'The Gurukul Swimming Pool & Gym Due',
    category: 'Sports & Gym',
    amount: 55,
    description: 'Certified swimming instructor sessions and indoor gymnasium equipment upkeep.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '18 Nov 2026',
  },
  {
    id: 'DUE-15',
    code: 'FEE-EXM-15',
    title: 'Mid-Term Examination Processing Fee',
    category: 'Academics',
    amount: 65,
    description: 'OMR answer sheet scanning, evaluation grading dossier, and report card print.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '20 Nov 2026',
  },
  {
    id: 'DUE-16',
    code: 'FEE-ROB-16',
    title: 'Robotics & STEM Innovation Workshop',
    category: 'Labs & Practical',
    amount: 75,
    description: 'Microcontroller hardware workshop components, breadboards, and STEM kit.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '25 Nov 2026',
  },
  {
    id: 'DUE-17',
    code: 'FEE-WLF-17',
    title: 'Annual Student Welfare Fund Surcharge',
    category: 'Administrative',
    amount: 80,
    description: 'Institutional emergency medical fund and student welfare amenity contribution.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '28 Nov 2026',
  },
  {
    id: 'DUE-18',
    code: 'FEE-ADM-18',
    title: 'Admit Card Re-generation & Courier Token',
    category: 'Administrative',
    amount: 85,
    description: 'Emergency laminated admit card dispatch, security hologram, and courier token.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '30 Nov 2026',
  },
  {
    id: 'DUE-19',
    code: 'FEE-CMP-19',
    title: 'Orientation Camp Logistics Surcharge',
    category: 'Activities & Camp',
    amount: 92,
    description: 'Annual outdoor spiritual camp logistics, tenting, and excursion transport.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '05 Dec 2026',
  },
  {
    id: 'DUE-20',
    code: 'FEE-DOS-20',
    title: 'Final Admission Dossier Processing Fee',
    category: 'Administrative',
    amount: 99,
    description: 'Permanent enrollment register sealing, board archival, and permanent file due.',
    academicTerm: 'Term 1 (2026-27)',
    dueDate: '10 Dec 2026',
  },
];

interface PaidDueRecord {
  dueId: string;
  orderId: string;
  txnId: string;
  amount: number;
  dueTitle: string;
  paidAt: string;
}

function PaymentTestingPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stepParam = searchParams.get('step');
  const orderId = searchParams.get('orderId') || searchParams.get('order_id') || '';
  const txnId = searchParams.get('txnId') || searchParams.get('txn_id') || '';
  const amountParam = searchParams.get('amount') || '1';
  const statusParam = searchParams.get('status') || '';
  const dueIdParam = searchParams.get('dueId') || '';
  const dueTitleParam = searchParams.get('dueTitle') || '';

  // Auth & UI State
  const [currentUser, setCurrentUser] = useState<TestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingDueId, setPayingDueId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Form State for Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Dues Dashboard Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [paidDues, setPaidDues] = useState<Record<string, PaidDueRecord>>({});
  const [toastMessage, setToastMessage] = useState<string>('');

  // Helper storage key
  const storageKey = currentUser?.registrationNumber
    ? `gurukul_test_dues_${currentUser.registrationNumber}`
    : 'gurukul_test_dues_guest';

  // Read stored test session on mount
  useEffect(() => {
    try {
      const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith('payment_test_session='));
      if (match) {
        const decoded = decodeURIComponent(match.split('=')[1]);
        const parsed = JSON.parse(decoded);
        if (parsed?.name) {
          setCurrentUser(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    } finally {
      setLoading(false);
    }
  }, []);

  // Load paid dues for the logged in user
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setPaidDues(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, [storageKey]);

  // Handle successful return from payment gateway (Recording payment)
  useEffect(() => {
    const isSuccess = stepParam === 'thankyou' || statusParam === 'success';
    if (!isSuccess) return;

    // Resolve paid due info
    let targetDueId = dueIdParam;
    let targetDueTitle = dueTitleParam;

    try {
      const pendingStr = sessionStorage.getItem('last_test_due_pending');
      if (pendingStr) {
        const pending = JSON.parse(pendingStr);
        if (!targetDueId && pending.dueId) targetDueId = pending.dueId;
        if (!targetDueTitle && pending.dueTitle) targetDueTitle = pending.dueTitle;
      }
    } catch {
      // Ignore
    }

    if (targetDueId) {
      const parsedAmount = parseFloat(amountParam) || 0;
      const newRecord: PaidDueRecord = {
        dueId: targetDueId,
        orderId: orderId || `ORD_${Date.now()}`,
        txnId: txnId || `TXN_${Date.now()}`,
        amount: parsedAmount,
        dueTitle: targetDueTitle || 'Fee Due Surcharge',
        paidAt: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setPaidDues((prev) => {
        const updated = { ...prev, [targetDueId]: newRecord };
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });

      // Clear pending
      try {
        sessionStorage.removeItem('last_test_due_pending');
      } catch {
        // Ignore
      }
    }
  }, [stepParam, statusParam, dueIdParam, dueTitleParam, amountParam, orderId, txnId, storageKey]);

  // Handle Login Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/payment/test/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid credentials. Please try again.');
        setLoginLoading(false);
        return;
      }

      setCurrentUser(data.user);
      router.replace('/payment?step=pay');
    } catch {
      setErrorMsg('Failed to connect to authentication service. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Quick 1-Click Fill Test Account
  const handleQuickFill = () => {
    setUsername('test@gurukul.com');
    setPassword('Test@123');
    setErrorMsg('');
  };

  // Initiate Payment for a Specific Due
  const handleProceedToPayDue = async (due: FeeDueItem) => {
    if (!currentUser) return;
    setPayingDueId(due.id);
    setErrorMsg('');

    try {
      // Store pending due locally so return page can attribute it accurately
      try {
        sessionStorage.setItem(
          'last_test_due_pending',
          JSON.stringify({
            dueId: due.id,
            dueTitle: due.title,
            amount: due.amount,
          })
        );
      } catch {
        // Ignore
      }

      const res = await fetch('/api/payment/test/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone,
          registrationNumber: currentUser.registrationNumber,
          amount: due.amount,
          dueId: due.id,
          dueTitle: due.title,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.paymentUrl) {
        setErrorMsg(data.error || 'Failed to initialize HDFC payment session.');
        setPayingDueId(null);
        return;
      }

      // Open official HDFC SmartGateway checkout page (or mock gateway fallback)
      window.location.href = data.paymentUrl;
    } catch {
      setErrorMsg('Could not reach payment gateway service. Please check your connection.');
      setPayingDueId(null);
    }
  };

  // Reset All Dues (Test Helper)
  const handleResetDues = () => {
    if (window.confirm('Reset all paid dues back to unpaid for fresh testing?')) {
      setPaidDues({});
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore
      }
      setToastMessage('All dues have been reset to Unpaid state.');
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  // Handle Logout (Clear test session and return to login)
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/payment/test/logout', { method: 'POST' });
    } catch { }

    setCurrentUser(null);
    document.cookie = 'payment_test_session=; path=/; max-age=0;';
    setLoggingOut(false);
    router.replace('/payment');
  };

  // Filtered Dues Calculation
  const filteredDues = useMemo(() => {
    return TEST_FEE_DUES.filter((due) => {
      const isPaid = Boolean(paidDues[due.id]);

      // Category filter
      if (selectedCategory === 'Pending' && isPaid) return false;
      if (selectedCategory === 'Paid' && !isPaid) return false;
      if (
        selectedCategory !== 'All' &&
        selectedCategory !== 'Pending' &&
        selectedCategory !== 'Paid' &&
        due.category !== selectedCategory
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = due.title.toLowerCase().includes(query);
        const matchesCode = due.code.toLowerCase().includes(query);
        const matchesDesc = due.description.toLowerCase().includes(query);
        const matchesAmount = due.amount.toString().includes(query);
        if (!matchesTitle && !matchesCode && !matchesDesc && !matchesAmount) {
          return false;
        }
      }

      return true;
    });
  }, [paidDues, selectedCategory, searchQuery]);

  // Statistics
  const totalDuesCount = TEST_FEE_DUES.length;
  const paidDuesCount = Object.keys(paidDues).length;
  const pendingDuesCount = totalDuesCount - paidDuesCount;
  const totalPendingAmount = TEST_FEE_DUES.filter((d) => !paidDues[d.id]).reduce(
    (sum, d) => sum + d.amount,
    0
  );
  const totalPaidAmount = Object.values(paidDues).reduce((sum, d) => sum + d.amount, 0);

  const isThankYouStep = stepParam === 'thankyou' || statusParam === 'success';

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-portal-navy border-t-amber-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Initializing Payment Test Portal...</p>
        </div>
      </div>
    );
  }

  // Get matching due for Thank You page if known
  const matchedThankYouDue =
    dueIdParam
      ? TEST_FEE_DUES.find((d) => d.id === dueIdParam)
      : TEST_FEE_DUES.find((d) => d.amount === parseFloat(amountParam));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white py-8 px-4 sm:px-6 font-sans text-slate-800">
      <div className={`mx-auto space-y-6 ${currentUser && !isThankYouStep ? 'max-w-5xl' : 'max-w-xl'}`}>
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-portal-navy/10 flex items-center justify-center border border-portal-navy/20 p-1.5 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/the-gurukul-nilokheri-logo.png"
                alt="The Gurukul Crest"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as any).src = '/logo-gurukul.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-portal-navy bg-portal-navy/10 px-2 py-0.5 rounded font-mono">
                  Testing Flow
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> HDFC SmartGateway
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold hidden sm:inline-block">
                  All Dues &lt; ₹100
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 pt-0.5">
                Payment Gateway Testing Portal
              </h1>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 font-mono block">MERCHANT MID</span>
            <span className="text-xs font-bold font-mono text-slate-800">SG6256</span>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* STEP 3: THANK YOU SCREEN */}
        {isThankYouStep ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top Banner Strip */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-8 text-white text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest bg-white/20 px-3 py-0.5 rounded-full inline-block mb-1.5">
                Transaction Verified
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Payment Successful!
              </h2>
              <p className="text-xs text-emerald-100 max-w-sm mx-auto mt-1">
                The banking gateway has successfully processed and authorized your payment.
              </p>
            </div>

            {/* Receipt Particulars */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Due / Fee Head Settled
                  </span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {dueTitleParam || matchedThankYouDue?.title || 'Candidate Fee Due Token'}
                    </span>
                    {(dueIdParam || matchedThankYouDue?.code) && (
                      <span className="text-[11px] font-mono bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-bold">
                        {dueIdParam || matchedThankYouDue?.code}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Bank Status
                  </span>
                  <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    CHARGED / SUCCESS
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block tracking-wider">
                    Amount Paid
                  </span>
                  <span className="font-black text-emerald-900 text-base mt-0.5 block font-mono">
                    ₹{parseFloat(amountParam || '1').toFixed(2)} INR
                  </span>
                </div>

                {txnId && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      HDFC Bank Transaction ID
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-[11px] mt-0.5 block break-all">
                      {txnId}
                    </span>
                  </div>
                )}

                {orderId && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Merchant Order ID
                    </span>
                    <span className="font-mono text-slate-700 text-[11px] mt-0.5 block break-all">
                      {orderId}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Continue Testing Dues & Logout */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.replace('/payment?step=pay')}
                  className="w-full btn-primary text-xs h-12 justify-center gap-2 bg-portal-gold hover:bg-amber-600 text-slate-900 font-bold shadow-md rounded-xl transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Test Next Due ({pendingDuesCount} Left)</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full btn-primary text-xs h-12 justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold shadow-md rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loggingOut ? 'Signing Out...' : 'Sign Out / Logout'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : !currentUser ? (
          /* STEP 1: LOGIN SCREEN (WHEN NOT LOGGED IN) */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-elevated p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5 text-center">
              <div className="w-12 h-12 rounded-full bg-portal-navy/10 text-portal-navy flex items-center justify-center mx-auto border border-portal-navy/20">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Payment Test Portal Login
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Sign in with test credentials to access the 20 testing fee dues (&lt; ₹100) and initiate HDFC SmartGateway sessions.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Username / Email / Mobile / Reg No.
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="test@gurukul.com"
                  className="input-field text-xs py-2.5 w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="input-field text-xs pl-9 py-2.5 w-full"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full btn-primary text-xs py-3 font-bold justify-center shadow-md bg-portal-navy hover:bg-slate-900 text-white rounded-xl gap-2"
              >
                {loginLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Access Dues</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Fill Test Account */}
            <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Quick Test Credentials:</span>
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>test@gurukul.com / Test@123 (Click to auto-fill)</span>
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: DUES DASHBOARD SCREEN (LOGGED IN) */
          <div className="space-y-6">
            {/* Authenticated User Banner */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-portal-navy text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{currentUser.name}</span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                      {currentUser.registrationNumber}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{currentUser.email} • {currentUser.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDues}
                  title="Reset all dues to unpaid for testing"
                  className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-colors border border-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Dues</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-xs text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors border border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Error or Cancellation Banner */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {statusParam === 'cancelled' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Payment was cancelled at the banking gateway. You can re-attempt paying any due below.</span>
              </div>
            )}

            {/* Summary Statistics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Dues
                </span>
                <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-1">
                  <span>{totalDuesCount}</span>
                  <span className="text-[10px] text-slate-400 font-normal">items</span>
                </div>
              </div>

              <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs bg-amber-50/30">
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                  Pending Dues
                </span>
                <div className="text-xl font-bold text-amber-700 mt-1 flex items-baseline gap-1">
                  <span>{pendingDuesCount}</span>
                  <span className="text-[10px] text-amber-600 font-mono">₹{totalPendingAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs bg-emerald-50/30">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Settled / Paid
                </span>
                <div className="text-xl font-bold text-emerald-700 mt-1 flex items-baseline gap-1">
                  <span>{paidDuesCount}</span>
                  <span className="text-[10px] text-emerald-600 font-mono">₹{totalPaidAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs text-white">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Testing Ceiling
                </span>
                <div className="text-xl font-bold text-amber-400 mt-1 flex items-baseline gap-1 font-mono">
                  <span>&lt; ₹100</span>
                  <span className="text-[10px] text-slate-400 font-sans">Strict</span>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dues by fee title, code, or amount (e.g. '10', '2', 'Library')..."
                    className="input-field text-xs pl-10 py-2.5 w-full bg-slate-50 border-slate-200"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Showing {filteredDues.length} of {totalDuesCount} dues</span>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs no-scrollbar">
                {[
                  { label: 'All Dues', value: 'All', count: totalDuesCount },
                  { label: 'Pending Only', value: 'Pending', count: pendingDuesCount },
                  { label: 'Paid / Settled', value: 'Paid', count: paidDuesCount },
                  { label: 'Administrative', value: 'Administrative' },
                  { label: 'Academics', value: 'Academics' },
                  { label: 'Hostel & Dining', value: 'Hostel & Dining' },
                  { label: 'Sports & Gym', value: 'Sports & Gym' },
                  { label: 'Labs & Practical', value: 'Labs & Practical' },
                  { label: 'Activities & Camp', value: 'Activities & Camp' },
                ].map((tab) => {
                  const isActive = selectedCategory === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setSelectedCategory(tab.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-portal-navy text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {typeof tab.count === 'number' && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dues Cards Grid */}
            {filteredDues.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No matching fee dues found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try clearing your search query or switching the category filter tab above.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="btn-secondary text-xs px-4 py-2 mx-auto"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDues.map((due) => {
                  const isPaid = Boolean(paidDues[due.id]);
                  const paidRecord = paidDues[due.id];
                  const isPayingThis = payingDueId === due.id;

                  return (
                    <div
                      key={due.id}
                      className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between p-5 relative overflow-hidden ${
                        isPaid
                          ? 'border-emerald-200 shadow-xs bg-gradient-to-br from-white via-emerald-50/15 to-white'
                          : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                      }`}
                    >
                      {/* Top Ribbon & Status */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {due.code}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-portal-navy/5 text-portal-navy border border-portal-navy/10">
                              {due.category}
                            </span>
                          </div>

                          {isPaid ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 font-mono">
                              <Check className="w-3 h-3 text-emerald-700" />
                              PAID
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 font-mono">
                              PENDING
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-snug">
                            {due.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {due.description}
                          </p>
                        </div>
                      </div>

                      {/* Middle Particulars */}
                      <div className="my-3 py-2.5 border-y border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Term / Session</span>
                          <span className="font-medium text-slate-800">{due.academicTerm}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Due Date</span>
                          <span className="font-medium text-slate-800">{due.dueDate}</span>
                        </div>
                      </div>

                      {/* Bottom Pricing & Action */}
                      <div className="pt-1 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Amount Due
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-black font-mono ${isPaid ? 'text-emerald-700' : 'text-slate-900'}`}>
                              ₹{due.amount.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium">INR</span>
                          </div>
                        </div>

                        {isPaid ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleProceedToPayDue(due)}
                              disabled={isPayingThis || payingDueId !== null}
                              title="Re-test payment gateway for this due"
                              className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-bold transition-all border border-slate-300 flex items-center gap-1"
                            >
                              {isPayingThis ? (
                                <div className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3 text-slate-500" />
                              )}
                              <span>Re-Pay</span>
                            </button>

                            <div className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Settled</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleProceedToPayDue(due)}
                            disabled={isPayingThis || payingDueId !== null}
                            className="btn-primary text-xs py-2.5 px-4 font-bold justify-center shadow-md bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 transition-all"
                          >
                            {isPayingThis ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Opening Gateway...</span>
                              </div>
                            ) : (
                              <>
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay ₹{due.amount.toFixed(2)}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Settled Reference Banner if Paid */}
                      {isPaid && paidRecord?.txnId && (
                        <div className="mt-2.5 pt-2 border-t border-emerald-100 flex items-center justify-between text-[10px] font-mono text-emerald-800">
                          <span className="truncate max-w-[200px]">Ref: {paidRecord.txnId}</span>
                          <span>{paidRecord.paidAt}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Minimal Footer */}
        <div className="text-center text-xs text-slate-400 pt-4">
          <p className="flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>256-Bit SSL Encrypted Banking • HDFC SmartGateway Sandbox</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentTestingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-portal-navy border-t-amber-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading Payment Gateway Test Portal...</p>
          </div>
        </div>
      }
    >
      <PaymentTestingPortalContent />
    </Suspense>
  );
}
