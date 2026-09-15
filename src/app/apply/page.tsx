'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Users, 
  MapPin, 
  GraduationCap, 
  Building, 
  Upload, 
  CreditCard, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle,
  ShieldCheck,
  Printer,
  FileCheck,
  Check,
  Percent,
  Calculator,
  MessageSquare,
  FileText,
  Save,
  BookmarkCheck
} from 'lucide-react';
import { INDIAN_STATES_AND_DISTRICTS } from '@/lib/indianLocations';

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState('');
  const [error, setError] = useState('');
  const [existingApp, setExistingApp] = useState<any>(null);
  const [submittedApp, setSubmittedApp] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [docErrors, setDocErrors] = useState<{ photo?: boolean; signature?: boolean; aadhaarCard?: boolean }>({});
  const [declarationAgreed, setDeclarationAgreed] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    fullName: '',
    dob: '',
    gender: 'Male',
    category: 'General',
    bloodGroup: 'B+',
    aadhaarNumber: '',
    nationality: 'Indian',
    religion: 'Hindu',
    candidateEmail: '',
    candidateMobile: '',
    whatsappNumber: '',
    sameAsMobile: true,

    // Step 2: Parent
    fatherName: '',
    fatherOccupation: 'Service',
    fatherPhone: '',
    motherName: '',
    motherOccupation: '', // Empty as requested, not defaulted to homemaker
    annualIncome: '',     // Mandatory option field

    // Step 3: Address
    streetAddress: '',
    city: '',
    district: 'Kurukshetra',
    state: 'Haryana',
    pincode: '',

    // Step 4: Academic
    applyingClass: 'Class 6',
    mediumOfInstruction: 'English',
    previousSchoolName: '',
    previousBoard: 'CBSE',
    marksMode: 'marks' as 'marks' | 'percentage',
    marksObtained: '',
    marksTotal: '500',
    previousClassMarksPercentage: '',
    passingYear: '2025',

    // Step 5: Centre
    preferredCenter1: 'Gurukul Kurukshetra Main Campus',
    preferredCenter2: 'Arya Samaj Mandir Complex, Delhi NCR',

    // Step 6: Documents (Empty initially, no dummy logo placeholders!)
    photo: '',
    photoName: '',
    signature: '',
    signatureName: '',
    parentSignature: '',
    parentSignatureName: '',
    aadhaarCard: '',
    aadhaarCardName: '',
    lastMarksheet: '',
    lastMarksheetName: '',
  });

  const [availableCentres, setAvailableCentres] = useState<any[]>([
    { id: 'c1', name: 'Gurukul Kurukshetra Main Campus', address: 'Kurukshetra (Haryana)' },
    { id: 'c2', name: 'Arya Samaj Mandir Complex, Delhi NCR', address: 'New Delhi' },
    { id: 'c3', name: 'DAV Senior Model School Centre', address: 'Chandigarh' },
    { id: 'c4', name: 'Gurukul Rohtak Extension Center', address: 'Rohtak (Haryana)' },
  ]);

  useEffect(() => {
    fetch('/api/centres')
      .then((res) => res.json())
      .then((data) => {
        if (data.centres && data.centres.length > 0) {
          setAvailableCentres(data.centres);
        }
      })
      .catch((e) => console.warn('Failed to load centres:', e));
  }, []);

  // Calculate marks percentage automatically when in marks mode
  useEffect(() => {
    if (formData.marksMode === 'marks') {
      const obt = parseFloat(formData.marksObtained);
      const tot = parseFloat(formData.marksTotal);
      if (!isNaN(obt) && !isNaN(tot) && tot > 0) {
        const pct = ((obt / tot) * 100).toFixed(2);
        setFormData((prev) => ({ ...prev, previousClassMarksPercentage: pct }));
      }
    }
  }, [formData.marksObtained, formData.marksTotal, formData.marksMode]);

  // Autofill user profile details on mount and restore draft
  useEffect(() => {
    let urlStep = 0;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      urlStep = parseInt(params.get('step') || '0', 10);
      if (urlStep >= 1 && urlStep <= 7) {
        setStep(urlStep);
      }
      // Purge any un-scoped legacy draft from shared storage
      try {
        localStorage.removeItem('gurukul_application_draft');
      } catch (e) {}
    }

    // 1. Fetch current authenticated user
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((authData) => {
        if (!authData.user) {
          window.location.href = '/login';
          return;
        }
        if (authData.user.role === 'admin') {
          // Admin shouldn't fill candidate form
          window.location.href = '/admin/dashboard';
          return;
        }

        const user = authData.user;
        setCurrentUser(user);

        // Pre-fill user profile details
        setFormData((prev) => ({
          ...prev,
          fullName: user.name || prev.fullName || '',
          candidateEmail: user.email || prev.candidateEmail || '',
          candidateMobile: user.phone || prev.candidateMobile || '',
          whatsappNumber: user.phone || prev.whatsappNumber || '',
          fatherPhone: prev.fatherPhone || user.phone || '',
        }));

        // 2. Fetch candidate's own application or draft from API
        fetch('/api/applications')
          .then((res) => res.json())
          .then((data) => {
            if (data.application && data.application.userId === user.id) {
              if (data.application.status === 'draft') {
                const app = data.application;
                setFormData((prev) => ({
                  ...prev,
                  fullName: app.personalInfo?.fullName || user.name || prev.fullName,
                  dob: app.personalInfo?.dob || prev.dob,
                  gender: app.personalInfo?.gender || prev.gender,
                  category: app.personalInfo?.category || prev.category,
                  bloodGroup: app.personalInfo?.bloodGroup || prev.bloodGroup,
                  aadhaarNumber: app.personalInfo?.aadhaarNumber || prev.aadhaarNumber,
                  nationality: app.personalInfo?.nationality || prev.nationality,
                  religion: app.personalInfo?.religion || prev.religion,
                  candidateEmail: app.personalInfo?.candidateEmail || user.email || prev.candidateEmail,
                  candidateMobile: app.personalInfo?.candidateMobile || user.phone || prev.candidateMobile,
                  whatsappNumber: app.personalInfo?.whatsappNumber || prev.whatsappNumber,
                  fatherName: app.parentInfo?.fatherName || prev.fatherName,
                  fatherOccupation: app.parentInfo?.fatherOccupation || prev.fatherOccupation,
                  fatherPhone: app.parentInfo?.fatherPhone || prev.fatherPhone,
                  motherName: app.parentInfo?.motherName || prev.motherName,
                  motherOccupation: app.parentInfo?.motherOccupation || prev.motherOccupation,
                  annualIncome: app.parentInfo?.annualIncome || prev.annualIncome,
                  streetAddress: app.addressInfo?.streetAddress || prev.streetAddress,
                  city: app.addressInfo?.city || prev.city,
                  district: app.addressInfo?.district || prev.district,
                  state: app.addressInfo?.state || prev.state,
                  pincode: app.addressInfo?.pincode || prev.pincode,
                  applyingClass: app.classApplying || prev.applyingClass,
                  mediumOfInstruction: app.academicInfo?.mediumOfInstruction || prev.mediumOfInstruction,
                  previousSchoolName: app.academicInfo?.previousSchoolName || prev.previousSchoolName,
                  previousBoard: app.academicInfo?.previousBoard || prev.previousBoard,
                  marksMode: app.academicInfo?.marksMode || prev.marksMode,
                  marksObtained: app.academicInfo?.marksObtained || prev.marksObtained,
                  marksTotal: app.academicInfo?.marksTotal || prev.marksTotal,
                  previousClassMarksPercentage: app.academicInfo?.previousClassMarksPercentage || prev.previousClassMarksPercentage,
                  passingYear: app.academicInfo?.passingYear || prev.passingYear,
                  preferredCenter1: app.examCentrePref?.preferredCenter1 || prev.preferredCenter1,
                  preferredCenter2: app.examCentrePref?.preferredCenter2 || prev.preferredCenter2,
                  photo: app.documents?.photo || prev.photo,
                  photoName: app.documents?.photo ? 'Uploaded-Photo.jpg' : prev.photoName,
                  signature: app.documents?.signature || prev.signature,
                  signatureName: app.documents?.signature ? 'Uploaded-Signature.jpg' : prev.signatureName,
                  parentSignature: app.documents?.parentSignature || prev.parentSignature,
                  parentSignatureName: app.documents?.parentSignature ? 'Uploaded-ParentSignature.jpg' : prev.parentSignatureName,
                  aadhaarCard: app.documents?.aadhaarCard || prev.aadhaarCard,
                  aadhaarCardName: app.documents?.aadhaarCard ? 'Uploaded-Aadhaar.pdf' : prev.aadhaarCardName,
                }));

                if (app.currentStep) {
                  setStep(app.currentStep);
                }
                setDraftSavedMsg('Resumed from your previously saved draft application.');
                setTimeout(() => setDraftSavedMsg(''), 5000);
              } else if (data.application.status === 'rejected' || (typeof window !== 'undefined' && window.location.search.includes('reapply=true'))) {
                // Rejected candidate re-applying: load previous application data for ease and start fresh submission
                const app = data.application;
                setFormData((prev) => ({
                  ...prev,
                  fullName: app.personalInfo?.fullName || user.name || prev.fullName,
                  dob: app.personalInfo?.dob || prev.dob,
                  gender: app.personalInfo?.gender || prev.gender,
                  category: app.personalInfo?.category || prev.category,
                  bloodGroup: app.personalInfo?.bloodGroup || prev.bloodGroup,
                  aadhaarNumber: app.personalInfo?.aadhaarNumber || prev.aadhaarNumber,
                  nationality: app.personalInfo?.nationality || prev.nationality,
                  religion: app.personalInfo?.religion || prev.religion,
                  candidateEmail: app.personalInfo?.candidateEmail || user.email || prev.candidateEmail,
                  candidateMobile: app.personalInfo?.candidateMobile || user.phone || prev.candidateMobile,
                  whatsappNumber: app.personalInfo?.whatsappNumber || prev.whatsappNumber,
                  fatherName: app.parentInfo?.fatherName || prev.fatherName,
                  fatherOccupation: app.parentInfo?.fatherOccupation || prev.fatherOccupation,
                  fatherPhone: app.parentInfo?.fatherPhone || prev.fatherPhone,
                  motherName: app.parentInfo?.motherName || prev.motherName,
                  motherOccupation: app.parentInfo?.motherOccupation || prev.motherOccupation,
                  annualIncome: app.parentInfo?.annualIncome || prev.annualIncome,
                  streetAddress: app.addressInfo?.streetAddress || prev.streetAddress,
                  city: app.addressInfo?.city || prev.city,
                  district: app.addressInfo?.district || prev.district,
                  state: app.addressInfo?.state || prev.state,
                  pincode: app.addressInfo?.pincode || prev.pincode,
                  applyingClass: app.classApplying || prev.applyingClass,
                  mediumOfInstruction: app.academicInfo?.mediumOfInstruction || prev.mediumOfInstruction,
                  previousSchoolName: app.academicInfo?.previousSchoolName || prev.previousSchoolName,
                  previousBoard: app.academicInfo?.previousBoard || prev.previousBoard,
                  marksMode: app.academicInfo?.marksMode || prev.marksMode,
                  marksObtained: app.academicInfo?.marksObtained || prev.marksObtained,
                  marksTotal: app.academicInfo?.marksTotal || prev.marksTotal,
                  previousClassMarksPercentage: app.academicInfo?.previousClassMarksPercentage || prev.previousClassMarksPercentage,
                  passingYear: app.academicInfo?.passingYear || prev.passingYear,
                  preferredCenter1: app.examCentrePref?.preferredCenter1 || prev.preferredCenter1,
                  preferredCenter2: app.examCentrePref?.preferredCenter2 || prev.preferredCenter2,
                  photo: app.documents?.photo || prev.photo,
                  photoName: app.documents?.photo ? 'Previous-Photo.jpg' : prev.photoName,
                  signature: app.documents?.signature || prev.signature,
                  signatureName: app.documents?.signature ? 'Previous-Signature.jpg' : prev.signatureName,
                  parentSignature: app.documents?.parentSignature || prev.parentSignature,
                  parentSignatureName: app.documents?.parentSignature ? 'Previous-ParentSignature.jpg' : prev.parentSignatureName,
                  aadhaarCard: app.documents?.aadhaarCard || prev.aadhaarCard,
                  aadhaarCardName: app.documents?.aadhaarCard ? 'Previous-Aadhaar.pdf' : prev.aadhaarCardName,
                  lastMarksheet: app.documents?.lastMarksheet || prev.lastMarksheet,
                  lastMarksheetName: app.documents?.lastMarksheet ? 'Previous-Marksheet.pdf' : prev.lastMarksheetName,
                }));
                setStep(1);
                setDraftSavedMsg('Re-Application Mode: Your previous particulars have been loaded for your convenience. Please update required fields and submit your new application.');
                setTimeout(() => setDraftSavedMsg(''), 8000);
              } else {
                setExistingApp(data.application);
              }
            } else {
              // Check user-scoped local storage for user.id ONLY
              try {
                const userDraft = localStorage.getItem(`gurukul_draft_${user.id}`);
                if (userDraft) {
                  const parsed = JSON.parse(userDraft);
                  if (parsed && typeof parsed === 'object') {
                    setFormData((prev) => ({
                      ...prev,
                      ...parsed,
                      fullName: user.name || parsed.fullName || prev.fullName,
                      candidateEmail: user.email || parsed.candidateEmail || prev.candidateEmail,
                      candidateMobile: user.phone || parsed.candidateMobile || prev.candidateMobile,
                    }));
                    if (!urlStep && parsed.currentStep) {
                      setStep(parsed.currentStep);
                    }
                  }
                }
              } catch (e) {}
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setError('');

    const payload = {
      classApplying: formData.applyingClass,
      currentStep: step,
      personalInfo: {
        fullName: formData.fullName,
        dob: formData.dob,
        gender: formData.gender,
        category: formData.category,
        bloodGroup: formData.bloodGroup,
        aadhaarNumber: formData.aadhaarNumber,
        nationality: formData.nationality,
        religion: formData.religion,
        candidateEmail: formData.candidateEmail,
        candidateMobile: formData.candidateMobile,
        whatsappNumber: formData.whatsappNumber,
      },
      parentInfo: {
        fatherName: formData.fatherName,
        fatherOccupation: formData.fatherOccupation,
        fatherPhone: formData.fatherPhone,
        motherName: formData.motherName,
        motherOccupation: formData.motherOccupation,
        annualIncome: formData.annualIncome,
      },
      addressInfo: {
        streetAddress: formData.streetAddress,
        city: formData.city,
        district: formData.district,
        state: formData.state,
        pincode: formData.pincode,
        whatsappNumber: formData.whatsappNumber,
      },
      academicInfo: {
        applyingClass: formData.applyingClass,
        mediumOfInstruction: formData.mediumOfInstruction,
        previousSchoolName: formData.previousSchoolName,
        previousBoard: formData.previousBoard,
        marksMode: formData.marksMode,
        marksObtained: formData.marksObtained,
        marksTotal: formData.marksTotal,
        previousClassMarksPercentage: formData.previousClassMarksPercentage,
        passingYear: formData.passingYear,
      },
      examCentrePref: {
        preferredCenter1: formData.preferredCenter1,
        preferredCenter2: formData.preferredCenter2,
      },
      documents: {
        photo: formData.photo,
        signature: formData.signature,
        parentSignature: formData.parentSignature,
        aadhaarCard: formData.aadhaarCard,
      },
    };

    // 1. Immediately store draft in user-scoped localStorage
    if (typeof window !== 'undefined' && currentUser?.id) {
      try {
        localStorage.setItem(`gurukul_draft_${currentUser.id}`, JSON.stringify({ ...formData, currentStep: step }));
        localStorage.removeItem('gurukul_application_draft');
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    }

    // 2. Persist to API
    try {
      await fetch('/api/applications/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('API draft save error:', e);
    }

    setSavingDraft(false);
    // 3. User requirement: "while doing save as draft, save as a draft, and show the dashboard, and show the step completed and continue filling option also."
    router.push(`/dashboard?draftSaved=true&step=${step}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'state') {
      // When state changes, update available districts
      const districts = INDIAN_STATES_AND_DISTRICTS[value] || ['Other'];
      setFormData({
        ...formData,
        state: value,
        district: districts[0] || '',
      });
    } else if (['fatherPhone', 'motherPhone', 'candidateMobile', 'alternatePhone', 'whatsappNumber'].includes(name)) {
      const clean = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: clean }));
    } else if (name === 'aadhaarNumber') {
      const clean = value.replace(/\D/g, '').slice(0, 12);
      setFormData((prev) => ({ ...prev, [name]: clean }));
    } else if (name === 'pincode') {
      const clean = value.replace(/\D/g, '').slice(0, 6);
      setFormData((prev) => ({ ...prev, [name]: clean }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string, nameField: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError(`File size exceeds 2MB limit for ${field}. Please select a smaller file.`);
        return;
      }
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          [field]: reader.result as string,
          [nameField]: file.name,
        }));
        setDocErrors((prev) => ({ ...prev, [field]: false }));
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    setError('');

    // Step 1 Validation: Personal Particulars
    if (step === 1) {
      if (!formData.fullName.trim() || !formData.dob || !formData.aadhaarNumber.trim()) {
        setError('Please fill in candidate full name, date of birth, and Aadhaar number.');
        return;
      }
      if (formData.fullName.trim().length < 5) {
        setError('Candidate Full Name must be at least 5 characters long.');
        return;
      }
      const dobParts = formData.dob.split('-');
      const dobYear = parseInt(dobParts[0], 10);
      if (isNaN(dobYear) || dobYear < 1990 || dobYear > 2026 || dobParts[0].length !== 4) {
        setError('Please enter a valid Date of Birth with a 4-digit year between 1990 and 2026.');
        return;
      }
      if (!/^\d{12}$/.test(formData.aadhaarNumber.trim())) {
        setError('Aadhaar card number must be exactly 12 digits (numbers only).');
        return;
      }
    }

    // Step 2 Validation: Parent particulars & Annual Income (Mandatory)
    if (step === 2) {
      if (!formData.fatherName.trim() || !formData.fatherPhone.trim() || !formData.motherName.trim()) {
        setError('Please enter father name, mobile number, and mother name.');
        return;
      }
      if (formData.fatherName.trim().length < 5) {
        setError("Father's Full Name must be at least 5 characters long.");
        return;
      }
      if (formData.motherName.trim().length < 5) {
        setError("Mother's Full Name must be at least 5 characters long.");
        return;
      }
      const fatherClean = formData.fatherPhone.replace(/\D/g, '');
      const validMobileRegex = /^[6-9]\d{9}$/;
      if (!validMobileRegex.test(fatherClean) || /^([6-9])\1{9}$/.test(fatherClean)) {
        setError("Father's Mobile Phone must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
        return;
      }
      if (!formData.annualIncome) {
        setError('Annual Family Income is mandatory. Please select an income bracket.');
        return;
      }
    }

    // Step 3 Validation: Address & State/District
    if (step === 3) {
      if (!formData.streetAddress.trim() || !formData.city.trim() || !formData.district || !formData.state || !formData.pincode.trim()) {
        setError('Please complete all address fields including Street Address, City/Town, District, State, and PIN code.');
        return;
      }
      if (!/^\d{6}$/.test(formData.pincode.trim())) {
        setError('Postal PIN Code must be exactly 6 digits (numbers only).');
        return;
      }
    }

    // Step 4 Validation: Academic
    if (step === 4) {
      if (!formData.previousSchoolName.trim() || !formData.previousClassMarksPercentage.trim()) {
        setError('Please enter previous school name and marks obtained/percentage.');
        return;
      }
    }

    // Step 6 Validation: Strict Document Upload Check (Must NOT allow moving to Payment without docs!)
    if (step === 6) {
      const missingErrors: { photo?: boolean; signature?: boolean; aadhaarCard?: boolean } = {};
      let hasMissing = false;
      if (!formData.photo) {
        missingErrors.photo = true;
        hasMissing = true;
      }
      if (!formData.signature) {
        missingErrors.signature = true;
        hasMissing = true;
      }
      if (!formData.aadhaarCard) {
        missingErrors.aadhaarCard = true;
        hasMissing = true;
      }

      if (hasMissing) {
        setDocErrors(missingErrors);
        setError('Mandatory documents are missing. Please upload the required documents (highlighted in red) to proceed.');
        return;
      }
      setDocErrors({});
    }

    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  // Submit application after simulated Razorpay payment
  const handleSubmitApplication = async () => {
    setError('');

    if (!declarationAgreed) {
      setError('Please accept and check the declaration checkbox before proceeding to fee payment.');
      return;
    }

    setLoading(true);

    try {
      const mobileNumber = formData.candidateMobile || currentUser?.phone || formData.fatherPhone || '';
      const payload = {
        classApplying: formData.applyingClass,
        personalInfo: {
          fullName: formData.fullName,
          dob: formData.dob,
          gender: formData.gender,
          category: formData.category,
          bloodGroup: formData.bloodGroup,
          aadhaarNumber: formData.aadhaarNumber,
          nationality: formData.nationality,
          religion: formData.religion,
          candidateEmail: formData.candidateEmail || currentUser?.email || '',
          candidateMobile: mobileNumber,
          whatsappNumber: formData.whatsappNumber || mobileNumber,
        },
        parentInfo: {
          fatherName: formData.fatherName,
          fatherOccupation: formData.fatherOccupation,
          fatherPhone: formData.fatherPhone,
          motherName: formData.motherName,
          motherOccupation: formData.motherOccupation,
          annualIncome: formData.annualIncome,
        },
        addressInfo: {
          streetAddress: formData.streetAddress,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode,
          whatsappNumber: formData.whatsappNumber,
        },
        academicInfo: {
          applyingClass: formData.applyingClass,
          mediumOfInstruction: formData.mediumOfInstruction,
          previousSchoolName: formData.previousSchoolName,
          previousBoard: formData.previousBoard,
          marksMode: formData.marksMode,
          marksObtained: formData.marksObtained,
          marksTotal: formData.marksTotal,
          previousClassMarksPercentage: formData.previousClassMarksPercentage,
          passingYear: formData.passingYear,
        },
        examCentrePref: {
          preferredCenter1: formData.preferredCenter1,
          preferredCenter2: formData.preferredCenter2,
        },
        documents: {
          photo: formData.photo,
          signature: formData.signature,
          parentSignature: formData.parentSignature,
          aadhaarCard: formData.aadhaarCard,
          lastMarksheet: formData.lastMarksheet || '',
        },
        amountPaid: 1200,
        transactionId: 'TXN_RZP_' + Date.now(),
      };

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login?redirect=/apply');
          return;
        }
        setError(data.error || 'Failed to submit application.');
        setLoading(false);
        return;
      }

      setSubmittedApp(data.application);
      setLoading(false);

      // Clean up saved drafts upon successful application submission
      try {
        if (currentUser?.id) {
          localStorage.removeItem(`gurukul_draft_${currentUser.id}`);
        }
        localStorage.removeItem('gurukul_application_draft');
      } catch (e) {}
    } catch {
      setError('An error occurred during submission. Please check your internet connection.');
      setLoading(false);
    }
  };

  const stepTitles = [
    { num: 1, title: 'Candidate', icon: User },
    { num: 2, title: 'Parents', icon: Users },
    { num: 3, title: 'Address', icon: MapPin },
    { num: 4, title: 'Academic', icon: GraduationCap },
    { num: 5, title: 'Exam Centre', icon: Building },
    { num: 6, title: 'Documents', icon: Upload },
    { num: 7, title: 'Payment', icon: CreditCard },
  ];

  const currentDistricts = INDIAN_STATES_AND_DISTRICTS[formData.state] || ['Other'];

  // SCREEN: Payment Successful & Printable Official Receipt
  if (submittedApp) {
    const regNo = currentUser?.registrationNumber || submittedApp.applicationNumber;
    return (
      <div className="max-w-3xl mx-auto my-12 px-4">
        <div className="bg-white border-2 border-emerald-500 rounded-3xl shadow-2xl p-6 sm:p-10 space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-mono font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              Payment & Application Confirmed
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gurukul-navy mt-3">
              Entrance Application Successfully Submitted!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              A confirmation email along with payment receipt and registration details has been dispatched to{' '}
              <strong>{currentUser?.email || formData.candidateEmail}</strong>.
            </p>
          </div>

          {/* Official Printable Fee Receipt Card */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-6 text-left space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b pb-3 font-sans">
              <div>
                <h4 className="font-black text-gurukul-navy text-base">GURUKUL KURUKSHETRA</h4>
                <p className="text-[11px] text-slate-500">Official E-Payment Receipt • Entrance Session 2026-27</p>
              </div>
              <div className="text-right">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  PAID - ₹1,200
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">Permanent Registration Number:</span>
                <span className="font-bold text-slate-900 text-sm">{regNo}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Application Form Number:</span>
                <span className="font-bold text-slate-900 text-sm">{submittedApp.applicationNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Candidate Full Name:</span>
                <span className="font-bold text-slate-900">{formData.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Class Applied:</span>
                <span className="font-bold text-slate-900">{formData.applyingClass}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Razorpay Transaction ID:</span>
                <span className="font-bold text-slate-900">{submittedApp.transactionId}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Payment Status:</span>
                <span className="font-bold text-emerald-600">Verified & Reconciled (Demo Gateway)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Payment Receipt</span>
            </button>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Go to Candidate Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN: Already Applied Notice
  if (existingApp) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white rounded-3xl shadow-xl border border-slate-200 text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
          <FileCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gurukul-navy">Application Already Submitted</h2>
        <p className="text-xs text-slate-600">
          You have already submitted an entrance application for Gurukul Kurukshetra.
          <br />
          Application Number: <strong>{existingApp.applicationNumber}</strong>
        </p>
        <div className="pt-4 flex flex-wrap justify-center gap-3">
          {existingApp.status === 'rejected' && (
            <button
              onClick={() => {
                setExistingApp(null);
                setStep(1);
              }}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-gurukul-navy font-black text-xs rounded-xl transition shadow"
            >
              Fill Application Form Again / Re-apply
            </button>
          )}
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold text-xs rounded-xl transition"
          >
            View in Dashboard
          </Link>
          <Link
            href="/status"
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Track Status
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 font-sans">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full">
            Academic Session 2026-27
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy mt-1">
            Gurukul Kurukshetra Online Entrance Application
          </h1>
          <p className="text-xs text-slate-500">
            Please fill all required particulars carefully according to candidate school records.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition flex-shrink-0 self-start sm:self-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Candidate Dashboard</span>
        </Link>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex items-center justify-between min-w-[620px] border-b border-slate-200 pb-4">
          {stepTitles.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                className={`flex items-center gap-2 cursor-pointer transition ${
                  isActive
                    ? 'text-gurukul-600 font-bold'
                    : isCompleted
                    ? 'text-emerald-600 font-semibold'
                    : 'text-slate-400 font-medium'
                }`}
                onClick={() => isCompleted && setStep(s.num)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    isActive
                      ? 'bg-gurukul-600 text-white font-bold shadow-md'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-xs">{s.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Draft Saved Banner */}
      {draftSavedMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm">
          <BookmarkCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{draftSavedMsg}</span>
        </div>
      )}

      {/* Error notification banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Form Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-10">

        {/* STEP 1: Personal Details & WhatsApp */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-gurukul-600" /> Step 1: Candidate Personal & Contact Particulars
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Candidate Full Name (As per School Record) *
                </label>
                <input
                  type="text"
                  name="fullName"
                  minLength={5}
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Aarav Sharma (Min 5 characters)"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Date of Birth (DD/MM/YYYY) *
                </label>
                <input
                  type="date"
                  name="dob"
                  min="1990-01-01"
                  max="2026-12-31"
                  value={formData.dob}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const yr = val.split('-')[0];
                      if (yr && yr.length > 4) return; // Prevent entering year with more than 4 digits (e.g. 122212)
                    }
                    handleChange(e);
                  }}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="Male">Male (All Wings)</option>
                  <option value="Female">Female (Eligible Wings)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Social Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Aadhaar Card Number *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="aadhaarNumber"
                  maxLength={12}
                  value={formData.aadhaarNumber}
                  onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                  placeholder="Enter 12-digit Aadhaar number"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Parents Particulars & Mandatory Annual Income */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-gurukul-600" /> Step 2: Parent & Guardian Particulars
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Father&apos;s Full Name *
                </label>
                <input
                  type="text"
                  name="fatherName"
                  minLength={5}
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="e.g. Dr. Rajesh Sharma (Min 5 characters)"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Father&apos;s Occupation
                </label>
                <input
                  type="text"
                  name="fatherOccupation"
                  value={formData.fatherOccupation}
                  onChange={handleChange}
                  placeholder="e.g. Business / Service / Agriculture"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Father&apos;s Mobile Phone *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  name="fatherPhone"
                  maxLength={10}
                  value={formData.fatherPhone}
                  onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mother&apos;s Full Name *
                </label>
                <input
                  type="text"
                  name="motherName"
                  minLength={5}
                  value={formData.motherName}
                  onChange={handleChange}
                  placeholder="e.g. Sunita Sharma (Min 5 characters)"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              {/* Mother's occupation without (Optional) or * */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mother&apos;s Occupation
                </label>
                <input
                  type="text"
                  name="motherOccupation"
                  value={formData.motherOccupation}
                  onChange={handleChange}
                  placeholder="Enter occupation (or leave blank)"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Annual Family Income Dropdown - Mandatory */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Annual Family Income (INR) *
                </label>
                <select
                  name="annualIncome"
                  required
                  value={formData.annualIncome}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-semibold text-slate-800"
                >
                  <option value="">-- Select Annual Family Income * --</option>
                  <option value="Below ₹2,00,000">Below ₹2,00,000 (Below 2 Lakh)</option>
                  <option value="₹2,00,000 - ₹4,00,000">₹2,00,000 - ₹4,00,000 (2 Lakh - 4 Lakh)</option>
                  <option value="₹4,00,000 - ₹6,00,000">₹4,00,000 - ₹6,00,000 (4 Lakh - 6 Lakh)</option>
                  <option value="Above ₹6,00,000">Above ₹6,00,000 (6 Lakh and Above)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Address with Cascading State & District Selectors */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gurukul-600" /> Step 3: Residential Address Particulars
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Permanent Street Address *
                </label>
                <input
                  type="text"
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleChange}
                  placeholder="House No., Street/Ward, Village/Locality"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* State Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  State / Union Territory *
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-semibold"
                >
                  {Object.keys(INDIAN_STATES_AND_DISTRICTS).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* District Dropdown Cascading based on State */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  District *
                </label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-semibold"
                >
                  {currentDistricts.map((dst) => (
                    <option key={dst} value={dst}>
                      {dst}
                    </option>
                  ))}
                </select>
              </div>

              {/* City / Town Text Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  City / Town / Tehsil *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Kurukshetra / Thanesar / Pehowa"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* PIN Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Postal PIN Code *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="pincode"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="136119"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Academic Details with Marks Out-Of vs Percentage Switcher */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-gurukul-600" /> Step 4: Academic History & Class Sought
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Admission Sought in Class *
                </label>
                <select
                  name="applyingClass"
                  value={formData.applyingClass}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg font-black text-gurukul-navy focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="Class 5">Class 5th</option>
                  <option value="Class 6">Class 6th</option>
                  <option value="Class 7">Class 7th</option>
                  <option value="Class 8">Class 8th</option>
                  <option value="Class 9">Class 9th</option>
                  <option value="Class 11 Science">Class 11th - Science (Medical / Non-Medical)</option>
                  <option value="Class 11 Commerce">Class 11th - Commerce</option>
                  <option value="Class 11 Arts">Class 11th - Arts / Humanities</option>
                  <option value="Class 11 NDA Wing">Class 11th - NDA Training Wing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Medium of Instruction Preferred *
                </label>
                <select
                  name="mediumOfInstruction"
                  value={formData.mediumOfInstruction}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="English">English Medium</option>
                  <option value="Hindi">Hindi Medium</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Previous School Name *
                </label>
                <input
                  type="text"
                  name="previousSchoolName"
                  value={formData.previousSchoolName}
                  onChange={handleChange}
                  placeholder="e.g. DAV Public School"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Previous Educational Board *
                </label>
                <select
                  name="previousBoard"
                  value={formData.previousBoard}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="CBSE">CBSE (Central Board of Secondary Education)</option>
                  <option value="ICSE">ICSE / CISCE</option>
                  <option value="Haryana Board">BSEH (Haryana Board)</option>
                  <option value="Punjab Board">PSEB (Punjab Board)</option>
                  <option value="UP Board">UPMSP (Uttar Pradesh Board)</option>
                  <option value="Rajasthan Board">RBSE (Rajasthan Board)</option>
                  <option value="Other State Board">Other State Education Board</option>
                </select>
              </div>

              {/* Marks vs Percentage Mode Selection */}
              <div className="sm:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 uppercase">
                    Previous Class Evaluation Format *
                  </label>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, marksMode: 'marks' })}
                      className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                        formData.marksMode === 'marks'
                          ? 'bg-gurukul-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Calculator className="w-3.5 h-3.5" /> Marks
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, marksMode: 'percentage' })}
                      className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                        formData.marksMode === 'percentage'
                          ? 'bg-gurukul-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" /> Percentage
                    </button>
                  </div>
                </div>

                {formData.marksMode === 'marks' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Marks Obtained *
                      </label>
                      <input
                        type="number"
                        name="marksObtained"
                        value={formData.marksObtained}
                        onChange={handleChange}
                        placeholder="e.g. 450"
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Total Maximum Marks (Out Of) *
                      </label>
                      <input
                        type="number"
                        name="marksTotal"
                        value={formData.marksTotal}
                        onChange={handleChange}
                        placeholder="e.g. 500"
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono font-bold"
                      />
                    </div>
                    <div className="pt-4 sm:pt-0">
                      <span className="block text-[11px] font-bold text-slate-500 uppercase">Computed Percentage</span>
                      <span className="text-base font-black text-gurukul-600">
                        {formData.previousClassMarksPercentage ? `${formData.previousClassMarksPercentage}%` : '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Aggregate Percentage (%) *
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="text"
                        name="previousClassMarksPercentage"
                        value={formData.previousClassMarksPercentage}
                        onChange={handleChange}
                        placeholder="e.g. 88.5"
                        className="w-full pr-8 pl-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono font-bold"
                      />
                      <span className="absolute right-3 top-2 text-sm font-bold text-slate-400">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Examination Centre Preference */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building className="w-5 h-5 text-gurukul-600" /> Step 5: Examination Centre Preferences
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  1st Preference Exam Centre *
                </label>
                <select
                  name="preferredCenter1"
                  value={formData.preferredCenter1}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-sm border rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {availableCentres.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.city || c.address})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  2nd Preference Exam Centre (Alternative) *
                </label>
                <select
                  name="preferredCenter2"
                  value={formData.preferredCenter2}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                >
                  {availableCentres.map((c) => (
                    <option key={`pref2-${c.id}`} value={c.name}>
                      {c.name} ({c.city || c.address})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Document Upload */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-gurukul-600" /> Step 6: Upload Photograph, Signatures & Documents
              </h2>
            </div>

            <p className="text-xs text-slate-500">
              Please upload clear scanned copies. Maximum size 2MB per file (JPG, PNG, PDF).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* 1. Candidate Photo */}
              <div className={`border-2 rounded-2xl p-4 space-y-3 transition ${
                formData.photo
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : docErrors.photo
                  ? 'border-red-500 bg-red-50/40 ring-2 ring-red-400'
                  : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex justify-between items-center">
                  <label className={`block text-xs font-bold uppercase ${docErrors.photo && !formData.photo ? 'text-red-700' : 'text-slate-800'}`}>
                    Candidate Passport Photograph *
                  </label>
                  {formData.photo ? (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Uploaded
                    </span>
                  ) : docErrors.photo ? (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Upload Required *
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-4">
                  {/* Preview container - dedicated upload icon when empty */}
                  <div className={`w-24 h-28 border-2 border-dashed rounded-xl bg-white flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0 ${
                    docErrors.photo && !formData.photo ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                  }`}>
                    {formData.photo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={formData.photo}
                        alt="Candidate Photo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Upload className={`w-7 h-7 mx-auto mb-1 ${docErrors.photo ? 'text-red-500' : 'text-amber-500'}`} />
                        <span className={`text-[9px] font-bold block leading-tight ${docErrors.photo ? 'text-red-600' : 'text-slate-500'}`}>
                          Upload Photo
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <label className={`inline-block bg-white hover:bg-slate-50 border text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition ${
                      docErrors.photo && !formData.photo ? 'border-red-400 text-red-700' : 'border-slate-300 text-slate-800'
                    }`}>
                      <span>{formData.photo ? 'Change Photo' : 'Choose Photo File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'photo', 'photoName')}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 truncate">
                      {formData.photoName || 'White background, max 2MB (JPG/PNG)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Candidate Signature */}
              <div className={`border-2 rounded-2xl p-4 space-y-3 transition ${
                formData.signature
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : docErrors.signature
                  ? 'border-red-500 bg-red-50/40 ring-2 ring-red-400'
                  : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex justify-between items-center">
                  <label className={`block text-xs font-bold uppercase ${docErrors.signature && !formData.signature ? 'text-red-700' : 'text-slate-800'}`}>
                    Candidate Signature *
                  </label>
                  {formData.signature ? (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Uploaded
                    </span>
                  ) : docErrors.signature ? (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Upload Required *
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-4">
                  <div className={`w-28 h-20 border-2 border-dashed rounded-xl bg-white flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0 ${
                    docErrors.signature && !formData.signature ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                  }`}>
                    {formData.signature ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={formData.signature}
                        alt="Candidate Signature"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Upload className={`w-6 h-6 mx-auto mb-1 ${docErrors.signature ? 'text-red-500' : 'text-amber-500'}`} />
                        <span className={`text-[9px] font-bold block leading-tight ${docErrors.signature ? 'text-red-600' : 'text-slate-500'}`}>
                          Upload Sign
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <label className={`inline-block bg-white hover:bg-slate-50 border text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition ${
                      docErrors.signature && !formData.signature ? 'border-red-400 text-red-700' : 'border-slate-300 text-slate-800'
                    }`}>
                      <span>{formData.signature ? 'Change Signature' : 'Choose Signature'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'signature', 'signatureName')}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 truncate">
                      {formData.signatureName || 'Black/Blue ink on white paper'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Parent / Guardian Signature */}
              <div className={`border-2 rounded-2xl p-4 space-y-3 transition ${
                formData.parentSignature ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-800 uppercase">
                    Parent / Guardian Signature
                  </label>
                  {formData.parentSignature && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Uploaded
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-28 h-20 border-2 border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0">
                    {formData.parentSignature ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={formData.parentSignature}
                        alt="Parent Signature"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                        <span className="text-[9px] font-bold block leading-tight text-slate-500">
                          Parent Sign
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <label className="inline-block bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition">
                      <span>{formData.parentSignature ? 'Change Sign' : 'Choose File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'parentSignature', 'parentSignatureName')}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 truncate">
                      {formData.parentSignatureName || 'Father/Mother/Guardian sign'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Aadhaar Card / ID Proof */}
              <div className={`border-2 rounded-2xl p-4 space-y-3 transition ${
                formData.aadhaarCard
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : docErrors.aadhaarCard
                  ? 'border-red-500 bg-red-50/40 ring-2 ring-red-400'
                  : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex justify-between items-center">
                  <label className={`block text-xs font-bold uppercase ${docErrors.aadhaarCard && !formData.aadhaarCard ? 'text-red-700' : 'text-slate-800'}`}>
                    Candidate Aadhaar Copy / ID Proof *
                  </label>
                  {formData.aadhaarCard ? (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Uploaded
                    </span>
                  ) : docErrors.aadhaarCard ? (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Upload Required *
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-4">
                  <div className={`w-28 h-20 border-2 border-dashed rounded-xl bg-white flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0 ${
                    docErrors.aadhaarCard && !formData.aadhaarCard ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                  }`}>
                    {formData.aadhaarCard ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={formData.aadhaarCard}
                        alt="Aadhaar Copy"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Upload className={`w-6 h-6 mx-auto mb-1 ${docErrors.aadhaarCard ? 'text-red-500' : 'text-amber-500'}`} />
                        <span className={`text-[9px] font-bold block leading-tight ${docErrors.aadhaarCard ? 'text-red-600' : 'text-slate-500'}`}>
                          Aadhaar Proof
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <label className={`inline-block bg-white hover:bg-slate-50 border text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition ${
                      docErrors.aadhaarCard && !formData.aadhaarCard ? 'border-red-400 text-red-700' : 'border-slate-300 text-slate-800'
                    }`}>
                      <span>{formData.aadhaarCard ? 'Change Aadhaar' : 'Choose File'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, 'aadhaarCard', 'aadhaarCardName')}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 truncate">
                      {formData.aadhaarCardName || 'Scanned front/back copy (Max 2MB)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Previous Class Marksheet (Optional / As Applicable) */}
              <div className={`border-2 rounded-2xl p-4 space-y-3 transition ${
                formData.lastMarksheet ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase text-slate-800">
                    Previous Marksheet / Report Card (Optional)
                  </label>
                  {formData.lastMarksheet && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Uploaded
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-28 h-20 border-2 border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0">
                    {formData.lastMarksheet ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={formData.lastMarksheet}
                        alt="Marksheet"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <FileText className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                        <span className="text-[9px] font-bold block leading-tight text-slate-500">
                          Marksheet
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <label className="inline-block bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition">
                      <span>{formData.lastMarksheet ? 'Change File' : 'Choose Marksheet'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, 'lastMarksheet', 'lastMarksheetName')}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 truncate">
                      {formData.lastMarksheetName || 'Official marksheet or report card (Max 2MB)'}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* STEP 7: Application Review & Razorpay Demo Payment */}
        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gurukul-600" /> Step 7: Application Review & Fee Payment
            </h2>

            {/* Summary Review Card */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-500 block">Candidate:</span>
                  <span className="font-bold text-slate-900 text-sm">{formData.fullName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Applying Class:</span>
                  <span className="font-bold text-gurukul-700 text-sm bg-amber-100 px-2 py-0.5 rounded inline-block">
                    {formData.applyingClass}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Registered Mobile:</span>
                  <span className="font-bold text-slate-900 text-sm font-mono">
                    {(() => {
                      const p = formData.candidateMobile || currentUser?.phone || formData.fatherPhone || '';
                      const digits = p.replace(/\D/g, '').slice(-10);
                      return digits.length === 10 ? `+91-${digits}` : (digits ? `+91-${digits}` : 'Not Provided');
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Annual Income:</span>
                  <span className="font-bold text-slate-900 text-sm">{formData.annualIncome || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">1st Choice Centre:</span>
                  <span className="font-semibold text-slate-800">{formData.preferredCenter1}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Permanent Residence:</span>
                  <span className="font-semibold text-slate-800">{formData.city}, {formData.district}, {formData.state} - {formData.pincode}</span>
                </div>
              </div>
            </div>

            {/* Fee Breakdown Box */}
            <div className="border-2 border-amber-300 bg-amber-50/70 rounded-xl p-5">
              <div className="flex justify-between items-center pb-3 border-b border-amber-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Entrance Examination Application Fee</h3>
                  <p className="text-xs text-slate-600">Includes examination processing, hall ticket generation, and evaluation</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 line-through mr-2">₹1,500</span>
                  <span className="text-2xl font-black text-gurukul-navy">₹1,200</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between text-xs text-slate-700">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-4 h-4" /> 256-Bit Encrypted Secure Payment
                </div>
                <span className="text-[11px] text-slate-500">Supports UPI, NetBanking, Debit/Credit Cards</span>
              </div>
            </div>

            {/* Declaration Checkbox */}
            <label className="flex items-start gap-2.5 pt-2 text-xs text-slate-700 cursor-pointer select-none bg-white p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 transition shadow-sm">
              <input 
                type="checkbox" 
                checked={declarationAgreed} 
                onChange={(e) => {
                  setDeclarationAgreed(e.target.checked);
                  if (e.target.checked) setError('');
                }} 
                className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer flex-shrink-0" 
              />
              <span className={declarationAgreed ? 'text-slate-900 font-semibold' : 'text-slate-600 font-normal'}>
                I hereby declare that the information provided in this application is true and complete to the best of my knowledge. I understand that admission in Gurukul Kurukshetra is strictly based on performance in the Entrance Examination and physical verification. <span className="text-red-500 font-bold">*</span>
              </span>
            </label>
          </div>
        )}

        {/* Action Controls Navigation */}
        <div className="mt-8 pt-5 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            )}

            {step < 7 && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="px-4 py-2.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                title="Save current details as draft and resume anytime"
              >
                <Save className="w-3.5 h-3.5 text-amber-700" />
                <span>{savingDraft ? 'Saving Draft...' : 'Save as Draft'}</span>
              </button>
            )}
          </div>

          {step < 7 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <span>Save & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || !declarationAgreed}
              onClick={handleSubmitApplication}
              className={`px-8 py-3 rounded-xl shadow-lg transition flex items-center gap-2 font-extrabold text-sm ${
                !declarationAgreed || loading
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white hover:shadow-xl'
              }`}
            >
              {loading ? (
                <span>Processing Payment...</span>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹1,200 & Complete Payment</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
