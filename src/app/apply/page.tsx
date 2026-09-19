'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle,
  AlertCircle,
  Trash2,
  Upload
} from 'lucide-react';
import { INDIAN_STATES_AND_DISTRICTS } from '@/lib/indianLocations';
import {
  validateName,
  validateOccupation,
  validatePhone,
  validateAadhaar,
  validateDob,
  validateClassAndStream,
  validateStudyLocation,
  validateAllFourDocuments,
  STUDY_LOCATIONS_BOYS,
  STUDY_LOCATIONS_GIRLS,
} from '@/lib/validations';
import ImageCropperModal from '@/components/ImageCropperModal';

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingApp, setExistingApp] = useState<any>(null);
  const [submittedApp, setSubmittedApp] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [declarationAgreed, setDeclarationAgreed] = useState(false);
  const [ntaCheckbox, setNtaCheckbox] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Cropper Modal State
  const [cropModal, setCropModal] = useState<{
    isOpen: boolean;
    imageSrc: string;
    field: 'photo' | 'signature' | 'parentSignature';
    title: string;
    aspectRatio: number;
  }>({
    isOpen: false,
    imageSrc: '',
    field: 'photo',
    title: '',
    aspectRatio: 3.5 / 4.5,
  });

  // Form State
  const [formData, setFormData] = useState({
    // Step 2: Candidate Details
    fullName: '',
    dob: '',
    gender: 'Male' as 'Male' | 'Female',
    category: 'General' as 'General' | 'OBC' | 'SC' | 'ST' | 'EWS',
    aadhaarNumber: '',
    applyingClass: 'Class 6',
    stream: '',
    panNumber: '',
    familyId: '',
    previousSchoolName: '',
    previousBoard: 'CBSE',
    otherBoard: '',
    nationality: 'Indian',
    religion: 'Hindu',
    candidateEmail: '',
    candidateMobile: '',
    whatsappNumber: '',

    // Step 3: Parent/Guardian Details
    fatherName: '',
    fatherOccupation: 'Service',
    fatherPhone: '',
    motherName: '',
    motherOccupation: '',
    annualIncome: '',
    guardianName: '',
    guardianRelation: '',

    // Step 4: Address
    streetAddress: '',
    city: '',
    district: 'Kurukshetra',
    state: 'Haryana',
    pincode: '',

    // Step 5: Preferred Study Location
    firstPreference: 'Gurukul Nilokheri',
    secondPreference: 'Gurukul Jyotisar',

    // Step 6: 4 Mandatory Documents
    photo: '',
    photoName: '',
    signature: '',
    signatureName: '',
    parentSignature: '',
    parentSignatureName: '',
    aadhaarCard: '',
    aadhaarCardName: '',
  });

  // Calculate today's date formatted as YYYY-MM-DD for max DOB validation
  const todayString = new Date().toISOString().split('T')[0];

  // Adjust study locations when gender changes
  useEffect(() => {
    if (formData.gender === 'Female') {
      setFormData((prev) => ({
        ...prev,
        firstPreference: 'Gurukul Nilokheri',
        secondPreference: '',
      }));
    } else {
      setFormData((prev) => {
        if (prev.firstPreference === prev.secondPreference) {
          return {
            ...prev,
            firstPreference: 'Gurukul Nilokheri',
            secondPreference: 'Gurukul Jyotisar',
          };
        }
        return prev;
      });
    }
  }, [formData.gender]);

  // Adjust stream when class changes
  useEffect(() => {
    if (!formData.applyingClass.includes('11') && formData.applyingClass !== '11') {
      if (formData.stream) {
        setFormData((prev) => ({ ...prev, stream: '' }));
      }
    } else {
      if (!formData.stream) {
        setFormData((prev) => ({ ...prev, stream: 'Non Medical' }));
      }
    }
  }, [formData.applyingClass]);

  // Restore contact info and pre-fill on mount
  useEffect(() => {
    // 1. Check session storage from registration step
    try {
      const stored = sessionStorage.getItem('gurukul_reg_info');
      if (stored) {
        const regInfo = JSON.parse(stored);
        setFormData((prev) => ({
          ...prev,
          fullName: regInfo.fullName || prev.fullName,
          candidateEmail: regInfo.candidateEmail || prev.candidateEmail,
          candidateMobile: regInfo.candidateMobile || prev.candidateMobile,
          whatsappNumber: regInfo.candidateMobile || prev.whatsappNumber,
        }));
      }
    } catch { }

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((authData) => {
        if (authData.user) {
          if (authData.user.role === 'admin') {
            window.location.href = '/admin/dashboard';
            return;
          }

          const user = authData.user;
          setCurrentUser(user);

          // Pre-fill registered contact info
          setFormData((prev) => ({
            ...prev,
            fullName: user.name || prev.fullName || '',
            candidateEmail: user.email || prev.candidateEmail || '',
            candidateMobile: user.phone || prev.candidateMobile || '',
            whatsappNumber: user.phone || prev.whatsappNumber || '',
            fatherPhone: prev.fatherPhone || '',
          }));
        }

        // Fetch draft application if any (optional)
        fetch('/api/applications/draft')
          .then((res) => res.json())
          .then((data) => {
            if (data?.application) {
              const app = data.application;
              setFormData((prev) => ({
                ...prev,
                fullName: app.personalInfo?.fullName || prev.fullName,
                dob: app.personalInfo?.dob || prev.dob,
                gender: app.personalInfo?.gender || prev.gender,
                category: app.personalInfo?.category || prev.category,
                aadhaarNumber: app.personalInfo?.aadhaarNumber || prev.aadhaarNumber,
                panNumber: app.personalInfo?.panNumber || prev.panNumber,
                familyId: app.personalInfo?.familyId || prev.familyId,
                previousSchoolName: app.personalInfo?.previousSchoolName || prev.previousSchoolName,
                previousBoard: app.personalInfo?.previousBoard || prev.previousBoard,
                otherBoard: app.personalInfo?.otherBoard || prev.otherBoard,
                applyingClass: app.classApplying || prev.applyingClass,
                stream: app.stream || prev.stream,
                fatherName: app.parentInfo?.fatherName || prev.fatherName,
                fatherOccupation: app.parentInfo?.fatherOccupation || prev.fatherOccupation,
                fatherPhone: app.parentInfo?.fatherPhone || prev.fatherPhone,
                motherName: app.parentInfo?.motherName || prev.motherName,
                motherOccupation: app.parentInfo?.motherOccupation || prev.motherOccupation,
                annualIncome: app.parentInfo?.annualIncome || prev.annualIncome,
                guardianName: app.parentInfo?.guardianName || prev.guardianName,
                guardianRelation: app.parentInfo?.guardianRelation || prev.guardianRelation,
                streetAddress: app.addressInfo?.streetAddress || prev.streetAddress,
                city: app.addressInfo?.city || prev.city,
                district: app.addressInfo?.district || prev.district,
                state: app.addressInfo?.state || prev.state,
                pincode: app.addressInfo?.pincode || prev.pincode,
                firstPreference: app.studyLocationPref?.firstPreference || app.examCentrePref?.firstPreference || prev.firstPreference,
                secondPreference: app.studyLocationPref?.secondPreference || app.examCentrePref?.secondPreference || prev.secondPreference,
                photo: app.documents?.photo || prev.photo,
                photoName: app.documents?.photo ? 'Photo-Ready.jpg' : prev.photoName,
                signature: app.documents?.signature || prev.signature,
                signatureName: app.documents?.signature ? 'Signature-Ready.jpg' : prev.signatureName,
                parentSignature: app.documents?.parentSignature || prev.parentSignature,
                parentSignatureName: app.documents?.parentSignature ? 'ParentSignature-Ready.jpg' : prev.parentSignatureName,
                aadhaarCard: app.documents?.aadhaarCard || prev.aadhaarCard,
                aadhaarCardName: app.documents?.aadhaarCard ? 'Aadhaar-Document.pdf' : prev.aadhaarCardName,
              }));

              if (app.currentStep && app.currentStep > 1 && app.currentStep <= 7) {
                setStep(app.currentStep);
                setNtaCheckbox(true);
              }
            }
          })
          .catch(() => { });
      })
      .catch(() => {
        // No redirection to login: applicants fill and pay without prior authentication
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'applyingClass') {
      const is11 = value.includes('11');
      setFormData((prev) => ({
        ...prev,
        applyingClass: value,
        stream: is11 ? (prev.stream && prev.stream !== 'None' ? prev.stream : 'Non Medical') : '',
      }));
    } else if (name === 'state') {
      const districts = INDIAN_STATES_AND_DISTRICTS[value] || ['Other'];
      setFormData({
        ...formData,
        state: value,
        district: districts[0] || '',
      });
    } else if (['fatherPhone', 'motherPhone', 'candidateMobile', 'whatsappNumber'].includes(name)) {
      const clean = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: clean }));
    } else if (name === 'aadhaarNumber') {
      const clean = value.replace(/\D/g, '').slice(0, 12);
      setFormData((prev) => ({ ...prev, [name]: clean }));
    } else if (name === 'pincode') {
      const clean = value.replace(/\D/g, '').slice(0, 6);
      setFormData((prev) => ({ ...prev, [name]: clean }));
    } else if (name === 'gender') {
      const isFem = value === 'Female';
      const genValue = (value === 'Female' ? 'Female' : 'Male') as 'Male' | 'Female';
      setFormData((prev) => ({
        ...prev,
        gender: genValue,
        firstPreference: isFem ? 'Gurukul Nilokheri' : prev.firstPreference,
        secondPreference: isFem ? '' : prev.secondPreference,
      }));
    } else if (name === 'firstPreference') {
      setFormData((prev) => ({
        ...prev,
        firstPreference: value,
        secondPreference: prev.secondPreference === value ? '' : prev.secondPreference,
      }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'signature' | 'parentSignature' | 'aadhaarCard', nameField: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError(`File size must be less than 2 MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (['photo', 'signature', 'parentSignature'].includes(field)) {
        const isPhoto = field === 'photo';
        setCropModal({
          isOpen: true,
          imageSrc: result,
          field: field as 'photo' | 'signature' | 'parentSignature',
          title: isPhoto ? 'Crop Candidate Photograph' : field === 'signature' ? 'Crop Candidate Signature' : 'Crop Parent / Guardian Signature',
          aspectRatio: isPhoto ? 3.5 / 4.5 : 3.5 / 1.5,
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          aadhaarCard: result,
          aadhaarCardName: file.name,
        }));
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    const field = cropModal.field;
    setFormData((prev) => ({
      ...prev,
      [field]: croppedDataUrl,
      [`${field}Name`]: `${field}-cropped.jpg`,
    }));
    setError('');
  };

  const handleCancelApplication = async () => {
    setCancelLoading(true);
    try {
      await fetch('/api/applications/cancel', { method: 'POST' });
      try {
        localStorage.removeItem('gurukul_application_draft');
      } catch { }
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  // Step Validation & Navigation
  const nextStep = () => {
    setError('');

    if (step === 1) {
      if (!ntaCheckbox) {
        setError('Please review and check the undertaking declaration before proceeding.');
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 2) {
      const nameVal = validateName(formData.fullName, 'Candidate Full Name');
      if (!nameVal.isValid) {
        setError(nameVal.error || 'Invalid name');
        return;
      }
      const dobVal = validateDob(formData.dob);
      if (!dobVal.isValid) {
        setError(dobVal.error || 'Invalid Date of Birth');
        return;
      }
      const aadhaarVal = validateAadhaar(formData.aadhaarNumber);
      if (!aadhaarVal.isValid) {
        setError(aadhaarVal.error || 'Invalid Aadhaar Number');
        return;
      }
      const classVal = validateClassAndStream(formData.applyingClass, formData.stream);
      if (!classVal.isValid) {
        setError(classVal.error || 'Invalid Class selection');
        return;
      }
      if (!formData.previousSchoolName.trim()) {
        setError('Please enter Previous School Name.');
        return;
      }
      if (!formData.previousBoard.trim()) {
        setError('Please select Previous Educational Board.');
        return;
      }
      if (formData.previousBoard === 'Others' && !formData.otherBoard.trim()) {
        setError('Please specify your Previous Educational Board name.');
        return;
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 3) {
      const fNameVal = validateName(formData.fatherName, "Father's Full Name");
      if (!fNameVal.isValid) {
        setError(fNameVal.error || 'Invalid Father Name');
        return;
      }
      if (formData.fatherOccupation && formData.fatherOccupation.trim()) {
        const fOccVal = validateOccupation(formData.fatherOccupation, "Father's Occupation");
        if (!fOccVal.isValid) {
          setError(fOccVal.error || 'Invalid Father Occupation');
          return;
        }
      }
      const fPhoneVal = validatePhone(formData.fatherPhone, "Father's Mobile Number");
      if (!fPhoneVal.isValid) {
        setError(fPhoneVal.error || 'Invalid Father Mobile Number');
        return;
      }
      const mNameVal = validateName(formData.motherName, "Mother's Full Name");
      if (!mNameVal.isValid) {
        setError(mNameVal.error || 'Invalid Mother Name');
        return;
      }
      if (!formData.annualIncome) {
        setError('Please select Annual Family Income.');
        return;
      }
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 4) {
      if (!formData.streetAddress.trim()) {
        setError('Permanent Street Address is required.');
        return;
      }
      if (!formData.city.trim()) {
        setError('City is required.');
        return;
      }
      if (!formData.district.trim()) {
        setError('District is required.');
        return;
      }
      if (!formData.pincode.trim() || formData.pincode.length !== 6) {
        setError('Please enter a valid 6-digit PIN Code.');
        return;
      }
      setStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 5) {
      const locVal = validateStudyLocation(formData.gender, formData.firstPreference, formData.secondPreference);
      if (!locVal.isValid) {
        setError(locVal.error || 'Invalid Study Location Preference');
        return;
      }
      setStep(6);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 6) {
      const docsVal = validateAllFourDocuments(formData);
      if (!docsVal.isValid) {
        setError(docsVal.error || 'All 4 documents are mandatory.');
        return;
      }
      setStep(7);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  };

  const prevStep = () => {
    setError('');
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Final ₹800 Payment & Official Registration Submission
  const handleSubmitPayment = async () => {
    setError('');

    if (!declarationAgreed) {
      setError('Please accept the final declaration undertaking before completing fee payment.');
      return;
    }

    setLoading(true);

    let chosenPassword = '';
    try {
      const stored = sessionStorage.getItem('gurukul_reg_info');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.password) chosenPassword = parsed.password;
      }
    } catch { }

    try {
      const payload = {
        password: chosenPassword || undefined,
        classApplying: formData.applyingClass,
        stream: formData.applyingClass.includes('11') ? formData.stream : undefined,
        personalInfo: {
          fullName: formData.fullName.trim(),
          dob: formData.dob,
          gender: formData.gender,
          category: formData.category,
          aadhaarNumber: formData.aadhaarNumber,
          panNumber: formData.panNumber || undefined,
          familyId: formData.familyId || undefined,
          previousSchoolName: formData.previousSchoolName,
          previousBoard: formData.previousBoard,
          otherBoard: formData.otherBoard || undefined,
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
          guardianName: formData.guardianName || undefined,
          guardianRelation: formData.guardianRelation || undefined,
        },
        addressInfo: {
          streetAddress: formData.streetAddress,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode,
          whatsappNumber: formData.whatsappNumber,
        },
        studyLocationPref: {
          firstPreference: formData.firstPreference,
          secondPreference: formData.secondPreference || undefined,
        },
        documents: {
          photo: formData.photo,
          signature: formData.signature,
          parentSignature: formData.parentSignature,
          aadhaarCard: formData.aadhaarCard,
        },
        amountPaid: 800,
        transactionId: `TXN_RZP_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      };

      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Payment verification failed. Please try again.');
        setLoading(false);
        return;
      }

      setSubmittedApp(data.application);

      try {
        sessionStorage.removeItem('gurukul_reg_info');
        localStorage.removeItem('gurukul_application_draft');
      } catch { }

      setTimeout(() => {
        window.location.href = '/dashboard?registered=true';
      }, 1800);
    } catch {
      setError('An error occurred during payment processing. Please check your internet connection.');
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Instructions' },
    { num: 2, label: 'Candidate' },
    { num: 3, label: 'Parents' },
    { num: 4, label: 'Address' },
    { num: 5, label: 'Campus' },
    { num: 6, label: 'Documents' },
    { num: 7, label: 'Payment' },
  ];

  const currentDistricts = INDIAN_STATES_AND_DISTRICTS[formData.state] || ['Other'];

  // SCREEN: Registration Confirmed Screen
  if (submittedApp) {
    const regNo = submittedApp.registrationNumber || submittedApp.applicationNumber;
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-elevated p-8 text-center space-y-5">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded border border-emerald-200 inline-block">
              Payment Confirmed
            </span>
            <h2 className="text-xl font-bold text-slate-900 pt-1">
              Registration Successful
            </h2>
            <p className="text-xs text-slate-600">
              Your entrance examination application and fee payment have been received.
            </p>
            {regNo && (
              <div className="pt-2">
                <span className="text-xs text-slate-500 block">Permanent Registration Number</span>
                <span className="text-sm font-mono font-bold text-portal-navy tracking-wide">{regNo}</span>
              </div>
            )}
          </div>

          <div className="pt-3 flex flex-col items-center justify-center space-y-2">
            <div className="w-6 h-6 border-2 border-portal-navy border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Redirecting to candidate dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-navy bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
            Entrance Session 2027-28
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Online Entrance Application
          </h1>
          <p className="text-xs text-slate-500">
            Admissions for Gurukul Nilokheri, Gurukul Jyotisar, and Aryakulam Nilokheri
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="text-xs text-rose-600 hover:text-rose-700 px-3 py-1.5 font-medium border border-rose-200 rounded-lg hover:bg-rose-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex items-center justify-between min-w-[560px] bg-white border border-slate-200 rounded-lg p-3">
          {steps.map((s, idx) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                onClick={() => isCompleted && setStep(s.num)}
                className={`flex items-center gap-2 text-xs select-none ${isCompleted ? 'cursor-pointer text-slate-700 font-medium' : isActive ? 'text-portal-navy font-bold' : 'text-slate-400 font-normal'
                  }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${isActive
                    ? 'bg-portal-navy text-white'
                    : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                >
                  {isCompleted ? '✓' : s.num}
                </div>
                <span>{s.label}</span>
                {idx < steps.length - 1 && (
                  <div className="w-6 h-px bg-slate-200 ml-1 hidden sm:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Content Card */}
      <div className="portal-card p-6 sm:p-8">
        {/* STEP 1: Instructions & Declaration */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Pre-Application Advisory &amp; Candidate Undertaking
              </h2>
              <p className="text-xs text-slate-500">
                Read all conditions carefully before filling out the online application.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900">1.</span>
                <div>
                  <strong className="text-slate-900">Identity Veracity:</strong> Full name, date of birth, gender, and parents&apos; names must match the candidate&apos;s official school records and Aadhaar Card.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900">2.</span>
                <div>
                  <strong className="text-slate-900">Single Application Rule:</strong> Only one Admission form is permitted per candidate. Duplicate submissions are systematically rejected.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900">3.</span>
                <div>
                  <strong className="text-slate-900">Document Uploads:</strong> Candidate photo, candidate signature, parent/guardian signature, and Aadhaar copy must be legible files under 2 MB each.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900">4.</span>
                <div>
                  <strong className="text-slate-900">Application Fee:</strong> Registration is officially finalized only upon payment of the ₹800 non-refundable examination fee.
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={ntaCheckbox}
                onChange={(e) => setNtaCheckbox(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-portal-navy rounded border-slate-300 focus:ring-portal-navy"
              />
              <span className="text-xs text-slate-800 leading-normal">
                I have read, understood, and accept all eligibility terms and examination guidelines for the Gurukul Entrance Examination 2027-28. I declare that all furnished particulars are accurate.
              </span>
            </label>
          </div>
        )}

        {/* STEP 2: Candidate Details */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Step 2: Candidate Details</h2>
              <p className="text-xs text-slate-500">Provide personal and academic background information.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Candidate Full Name (As per Aadhaar) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Candidate full name"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="dob"
                  required
                  max={todayString}
                  value={formData.dob}
                  onChange={handleChange}
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-input-field"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="form-label">
                  Social Category <span className="text-rose-500">*</span>
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="form-input-field"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>

              <div>
                <label className="form-label">
                  Class Applying For <span className="text-rose-500">*</span>
                </label>
                <select
                  name="applyingClass"
                  required
                  value={formData.applyingClass}
                  onChange={handleChange}
                  className="form-input-field font-semibold"
                >
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 11">Class 11</option>
                </select>
              </div>

              {formData.applyingClass.includes('11') && (
                <div>
                  <label className="form-label">
                    Stream <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="stream"
                    required
                    value={formData.stream || 'Non Medical'}
                    onChange={handleChange}
                    className="form-input-field font-semibold"
                  >
                    <option value="Non Medical">Non Medical</option>
                    <option value="Medical">Medical</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Arts">Arts</option>
                  </select>
                </div>
              )}

              <div>
                <label className="form-label">
                  Previous School Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="previousSchoolName"
                  required
                  value={formData.previousSchoolName}
                  onChange={handleChange}
                  placeholder="Last attended school"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  Previous Educational Board <span className="text-rose-500">*</span>
                </label>
                <select
                  name="previousBoard"
                  required
                  value={formData.previousBoard}
                  onChange={handleChange}
                  className="form-input-field"
                >
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="HBSE">HBSE (Haryana Board)</option>
                  <option value="State Board">State Board</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {formData.previousBoard === 'Others' && (
                <div>
                  <label className="form-label">
                    Specify Educational Board <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="otherBoard"
                    required
                    value={formData.otherBoard}
                    onChange={handleChange}
                    placeholder="Enter board name"
                    className="form-input-field"
                  />
                </div>
              )}

              <div>
                <label className="form-label">
                  Aadhaar Card Number (12 Digits) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="aadhaarNumber"
                  maxLength={12}
                  required
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                  placeholder="12-digit UIDAI number"
                  className="form-input-field font-mono"
                />
              </div>

              <div>
                <label className="form-label">
                  PEN Number (Permanent Education Number)
                </label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleChange}
                  placeholder="Optional (if allotted)"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  Family ID (Parivar Pehchan Patra)
                </label>
                <input
                  type="text"
                  name="familyId"
                  value={formData.familyId}
                  onChange={handleChange}
                  placeholder="Optional (if applicable)"
                  className="form-input-field"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Parent/Guardian Details */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Step 3: Parent &amp; Guardian Particulars</h2>
              <p className="text-xs text-slate-500">Provide official contact details for parents or guardians.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Father&apos;s Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="fatherName"
                  required
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="Father's full name"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  Father&apos;s Occupation
                </label>
                <input
                  type="text"
                  name="fatherOccupation"
                  value={formData.fatherOccupation}
                  onChange={handleChange}
                  placeholder="e.g. Service, Business, Agriculture"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  Father&apos;s Mobile Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">+91</span>
                  <input
                    type="tel"
                    name="fatherPhone"
                    maxLength={10}
                    required
                    value={formData.fatherPhone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    className="form-input-field pl-10 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  Mother&apos;s Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="motherName"
                  required
                  value={formData.motherName}
                  onChange={handleChange}
                  placeholder="Mother's full name"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  Mother&apos;s Occupation
                </label>
                <input
                  type="text"
                  name="motherOccupation"
                  value={formData.motherOccupation}
                  onChange={handleChange}
                  placeholder="e.g. Homemaker, Teacher, Doctor"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  Annual Family Income <span className="text-rose-500">*</span>
                </label>
                <select
                  name="annualIncome"
                  required
                  value={formData.annualIncome}
                  onChange={handleChange}
                  className="form-input-field"
                >
                  <option value="">Select Income Bracket</option>
                  <option value="Below ₹1,50,000">Below ₹1,50,000</option>
                  <option value="₹1,50,000 - ₹3,00,000">₹1,50,000 - ₹3,00,000</option>
                  <option value="₹3,00,000 - ₹5,00,000">₹3,00,000 - ₹5,00,000</option>
                  <option value="₹5,00,000 - ₹8,00,000">₹5,00,000 - ₹8,00,000</option>
                  <option value="Above ₹8,00,000">Above ₹8,00,000</option>
                </select>
              </div>

              <div>
                <label className="form-label">
                  Guardian&apos;s Name (If applicable)
                </label>
                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  placeholder="Optional"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  Guardian&apos;s Relation
                </label>
                <input
                  type="text"
                  name="guardianRelation"
                  value={formData.guardianRelation}
                  onChange={handleChange}
                  placeholder="e.g. Uncle, Grandparent"
                  className="form-input-field"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Permanent Address */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Step 4: Permanent &amp; Correspondence Address</h2>
              <p className="text-xs text-slate-500">Provide official residential and communication address.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="form-label">
                  Street / House Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="streetAddress"
                  required
                  value={formData.streetAddress}
                  onChange={handleChange}
                  placeholder="House No., Building Name, Street / Sector"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  City / Town / Village <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  className="form-input-field"
                />
              </div>

              <div>
                <label className="form-label">
                  State / UT <span className="text-rose-500">*</span>
                </label>
                <select
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  className="form-input-field"
                >
                  {Object.keys(INDIAN_STATES_AND_DISTRICTS).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  District <span className="text-rose-500">*</span>
                </label>
                <select
                  name="district"
                  required
                  value={formData.district}
                  onChange={handleChange}
                  className="form-input-field"
                >
                  {currentDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  PIN Code (6 Digits) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="pincode"
                  maxLength={6}
                  required
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="6-digit PIN code"
                  className="form-input-field font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Study Location Preference */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Step 5: Preferred Study Location</h2>
              <p className="text-xs text-slate-500">Select campus preferences for admission.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  1st Preference Study Location <span className="text-rose-500">*</span>
                </label>
                {formData.gender === 'Female' ? (
                  <input
                    type="text"
                    disabled
                    value={formData.firstPreference || 'Gurukul Nilokheri'}
                    className="form-input-field bg-slate-50 text-slate-700 font-semibold cursor-not-allowed"
                  />
                ) : (
                  <select
                    name="firstPreference"
                    required
                    value={formData.firstPreference}
                    onChange={handleChange}
                    className="form-input-field font-semibold"
                  >
                    <option value="">Select 1st Preference</option>
                    {STUDY_LOCATIONS_BOYS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="form-label">
                  2nd Preference Study Location {formData.gender === 'Female' ? '(Not Applicable)' : '(Optional)'}
                </label>
                {formData.gender === 'Female' ? (
                  <input
                    type="text"
                    disabled
                    value="Not Applicable for Girls"
                    className="form-input-field bg-slate-50 text-slate-400 cursor-not-allowed"
                  />
                ) : (
                  <select
                    name="secondPreference"
                    value={formData.secondPreference}
                    onChange={handleChange}
                    className="form-input-field"
                  >
                    <option value="">None / No Second Choice</option>
                    {STUDY_LOCATIONS_BOYS.filter((l) => l !== formData.firstPreference).map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Mandatory Documents Upload */}
        {step === 6 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Step 6: Upload Documents</h2>
              <p className="text-xs text-slate-500">
                Upload clear scans or photographs (JPG, PNG, or PDF, max 2 MB each). All 4 documents are required.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Document 1: Photo */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">1. Candidate Photograph <span className="text-rose-500">*</span></span>
                  {formData.photo && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Uploaded</span>}
                </div>
                {formData.photo ? (
                  <div className="flex items-center gap-3">
                    <img src={formData.photo} alt="Candidate" className="w-16 h-20 object-cover rounded border border-slate-200" />
                    <div className="flex-1 text-xs">
                      <span className="font-medium text-slate-800 block truncate">{formData.photoName}</span>
                      <label className="text-portal-navy hover:underline font-semibold cursor-pointer inline-block mt-1">
                        Change Photo
                        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'photo', 'photoName')} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="w-full py-5 border border-dashed border-slate-300 bg-white hover:bg-slate-50 rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Select Photograph</span>
                    <span className="text-[10px] text-slate-400">JPG or PNG (max 2 MB)</span>
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'photo', 'photoName')} />
                  </label>
                )}
              </div>

              {/* Document 2: Candidate Signature */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">2. Candidate Signature <span className="text-rose-500">*</span></span>
                  {formData.signature && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Uploaded</span>}
                </div>
                {formData.signature ? (
                  <div className="flex items-center gap-3">
                    <img src={formData.signature} alt="Signature" className="w-24 h-12 object-contain bg-white rounded border border-slate-200" />
                    <div className="flex-1 text-xs">
                      <span className="font-medium text-slate-800 block truncate">{formData.signatureName}</span>
                      <label className="text-portal-navy hover:underline font-semibold cursor-pointer inline-block mt-1">
                        Change Signature
                        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'signature', 'signatureName')} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="w-full py-5 border border-dashed border-slate-300 bg-white hover:bg-slate-50 rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Select Signature</span>
                    <span className="text-[10px] text-slate-400">JPG or PNG (max 2 MB)</span>
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'signature', 'signatureName')} />
                  </label>
                )}
              </div>

              {/* Document 3: Parent Signature */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">3. Parent / Guardian Signature <span className="text-rose-500">*</span></span>
                  {formData.parentSignature && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Uploaded</span>}
                </div>
                {formData.parentSignature ? (
                  <div className="flex items-center gap-3">
                    <img src={formData.parentSignature} alt="Parent Signature" className="w-24 h-12 object-contain bg-white rounded border border-slate-200" />
                    <div className="flex-1 text-xs">
                      <span className="font-medium text-slate-800 block truncate">{formData.parentSignatureName}</span>
                      <label className="text-portal-navy hover:underline font-semibold cursor-pointer inline-block mt-1">
                        Change Signature
                        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'parentSignature', 'parentSignatureName')} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="w-full py-5 border border-dashed border-slate-300 bg-white hover:bg-slate-50 rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Select Parent Signature</span>
                    <span className="text-[10px] text-slate-400">JPG or PNG (max 2 MB)</span>
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'parentSignature', 'parentSignatureName')} />
                  </label>
                )}
              </div>

              {/* Document 4: Aadhaar Card */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">4. Aadhaar / ID Document <span className="text-rose-500">*</span></span>
                  {formData.aadhaarCard && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Uploaded</span>}
                </div>
                {formData.aadhaarCard ? (
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-12 bg-white border border-slate-200 rounded flex items-center justify-center text-slate-500 font-mono text-[10px] font-bold">
                      DOC
                    </div>
                    <div className="flex-1 text-xs">
                      <span className="font-medium text-slate-800 block truncate">{formData.aadhaarCardName}</span>
                      <label className="text-portal-navy hover:underline font-semibold cursor-pointer inline-block mt-1">
                        Change Document
                        <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'aadhaarCard', 'aadhaarCardName')} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="w-full py-5 border border-dashed border-slate-300 bg-white hover:bg-slate-50 rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Select Aadhaar File</span>
                    <span className="text-[10px] text-slate-400">PDF, JPG, or PNG (max 2 MB)</span>
                    <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'aadhaarCard', 'aadhaarCardName')} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Application Review & Fee Payment */}
        {step === 7 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Step 7: Application Review &amp; Fee Payment</h2>
              <p className="text-xs text-slate-500">Review your particulars and complete the examination fee payment.</p>
            </div>

            {/* Particulars Summary */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 block text-[11px]">Candidate Name</span>
                  <span className="font-bold text-slate-900">{formData.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Gender &amp; DOB</span>
                  <span className="font-medium text-slate-900">{formData.gender} • {formData.dob}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Class Applied</span>
                  <span className="font-semibold text-portal-navy">
                    {formData.applyingClass} {formData.stream ? `(${formData.stream})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Father&apos;s Name</span>
                  <span className="font-medium text-slate-900">{formData.fatherName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Study Location</span>
                  <span className="font-semibold text-slate-900">{formData.firstPreference}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Residence</span>
                  <span className="font-medium text-slate-900">{formData.city}, {formData.state}</span>
                </div>
              </div>
            </div>

            {/* Fee Card */}
            <div className="border border-slate-200 bg-white rounded-lg p-5">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Entrance Examination Application Fee
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official registration is confirmed immediately upon successful transaction
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-portal-navy">₹800</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-3">
                <span>Secure payment gateway</span>
                <span>UPI, NetBanking, Debit &amp; Credit Cards</span>
              </div>
            </div>

            {/* Final Declaration Undertaking */}
            <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={declarationAgreed}
                onChange={(e) => {
                  setDeclarationAgreed(e.target.checked);
                  if (e.target.checked) setError('');
                }}
                className="mt-0.5 h-4 w-4 rounded text-portal-navy focus:ring-portal-navy border-slate-300"
              />
              <span className="leading-normal">
                I hereby declare that the particulars provided in this application are authentic and true. I understand that admission is strictly merit-based on entrance examination performance. <span className="text-rose-500 font-bold">*</span>
              </span>
            </label>
          </div>
        )}

        {/* Step Navigation Bar */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="btn-secondary text-xs px-4 py-2"
              >
                Previous Step
              </button>
            )}
          </div>

          {step < 7 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary text-xs px-5 py-2"
            >
              {step === 1 ? 'Accept Declaration & Continue' : 'Continue to Next Step'}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || !declarationAgreed}
              onClick={handleSubmitPayment}
              className={`btn-primary text-xs px-6 py-2.5 font-bold ${!declarationAgreed || loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {loading ? 'Processing Payment...' : 'Pay ₹800 & Submit Application'}
            </button>
          )}
        </div>
      </div>

      {/* Cancel Application Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 shadow-elevated border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">Discard Application?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel? Any draft information will be discarded and you will not be registered for the entrance examination.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 btn-secondary text-xs py-2"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleCancelApplication}
                disabled={cancelLoading}
                className="flex-1 btn-danger text-xs py-2"
              >
                {cancelLoading ? 'Canceling...' : 'Discard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cropper Modal */}
      <ImageCropperModal
        isOpen={cropModal.isOpen}
        imageSrc={cropModal.imageSrc}
        title={cropModal.title}
        aspectRatio={cropModal.aspectRatio}
        onCropComplete={handleCropComplete}
        onClose={() => setCropModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
