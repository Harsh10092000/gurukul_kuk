'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle,
  AlertCircle,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  ShieldCheck,
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
  getStreamsForCampus,
  STUDY_LOCATIONS_BOYS,
  STUDY_LOCATIONS_GIRLS,
} from '@/lib/validations';
import ImageCropperModal from '@/components/ImageCropperModal';

const FATHER_OCCUPATIONS = [
  'Service',
  'Government Service',
  'Business / Self-Employed',
  'Agriculture / Farming',
  'Defense / Armed Forces',
  'Professional (Doctor, Engineer, CA, Advocate)',
  'Teaching / Academic',
  'Others',
];

const MOTHER_OCCUPATIONS = [
  'Homemaker',
  'Service',
  'Government Service',
  'Teaching / Academic',
  'Business / Self-Employed',
  'Professional (Doctor, Engineer, CA, Advocate)',
  'Agriculture / Farming',
  'Others',
];

const normalizeGender = (g?: string | null): 'Male' | 'Female' => {
  if (!g) return 'Male';
  const lower = g.trim().toLowerCase();
  return lower === 'female' || lower === 'girl' || lower === 'girls' ? 'Female' : 'Male';
};

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
  const [activeLocations, setActiveLocations] = useState<string[]>([
    'Gurukul Nilokheri',
    'Gurukul Jyotisar',
    'Aryakulam Nilokheri',
  ]);
  const [instructionLang, setInstructionLang] = useState<'en' | 'hi'>('en');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [recoveringPayment, setRecoveringPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    apaarId: '',
    familyId: '',
    previousSchoolName: '',
    previousBoard: 'CBSE',
    otherBoard: '',
    nationality: 'Indian',
    religion: 'Hindu',
    candidateEmail: '',
    candidateMobile: '',
    whatsappNumber: '',
    password: '',
    confirmPassword: '',

    // Step 3: Parent/Guardian Details
    fatherName: '',
    fatherOccupation: '',
    fatherOccupationOption: '',
    fatherOccupationOther: '',
    fatherPhone: '',
    motherName: '',
    motherOccupation: '',
    motherOccupationOption: '',
    motherOccupationOther: '',
    annualIncome: '',
    guardianName: '',
    guardianRelation: '',

    // Step 4: Address
    streetAddress: '',
    city: '',
    district: 'Kurukshetra',
    state: 'Haryana',
    pincode: '',

    // Step 1: Preferred Study Location
    firstPreference: 'Gurukul Jyotisar',
    secondPreference: 'Aryakulam Nilokheri',

    // Step 5: 4 Mandatory Documents
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

  // Explicit Gender switch handler ensuring instantaneous, atomic state transition
  const handleGenderSelect = (selectedGender: 'Male' | 'Female') => {
    setError('');
    const isFem = selectedGender === 'Female';
    const validBoys = ['Aryakulam Nilokheri', 'Gurukul Jyotisar'].filter((l) =>
      activeLocations.includes(l)
    );
    const effectiveBoys = validBoys.length > 0 ? validBoys : ['Aryakulam Nilokheri', 'Gurukul Jyotisar'];

    setFormData((prev) => {
      const nextFirst = isFem
        ? 'Gurukul Nilokheri'
        : (effectiveBoys.includes(prev.firstPreference) && prev.firstPreference !== 'Gurukul Nilokheri'
          ? prev.firstPreference
          : effectiveBoys[0] || 'Aryakulam Nilokheri');

      const nextSecond = isFem
        ? ''
        : (prev.secondPreference === nextFirst || prev.secondPreference === 'Gurukul Nilokheri'
          ? (effectiveBoys.find((l) => l !== nextFirst) || '')
          : prev.secondPreference);

      const nextClass = isFem && prev.applyingClass === 'Class 5' ? 'Class 6' : prev.applyingClass;

      return {
        ...prev,
        gender: selectedGender,
        firstPreference: nextFirst,
        secondPreference: nextSecond,
        applyingClass: nextClass,
      };
    });
  };

  // Adjust study locations and class when activeLocations load or settings change
  useEffect(() => {
    const isFem = formData.gender === 'Female' || (formData.gender as string)?.toLowerCase() === 'female';
    if (isFem) {
      if (formData.firstPreference !== 'Gurukul Nilokheri' || formData.secondPreference !== '') {
        setFormData((prev) => ({
          ...prev,
          firstPreference: 'Gurukul Nilokheri',
          secondPreference: '',
          applyingClass: prev.applyingClass === 'Class 5' ? 'Class 6' : prev.applyingClass,
        }));
      }
    } else {
      const validBoys = ['Aryakulam Nilokheri', 'Gurukul Jyotisar'].filter((l) =>
        activeLocations.includes(l)
      );
      const effectiveBoys = validBoys.length > 0 ? validBoys : ['Aryakulam Nilokheri', 'Gurukul Jyotisar'];
      if (!effectiveBoys.includes(formData.firstPreference) || formData.firstPreference === 'Gurukul Nilokheri') {
        setFormData((prev) => {
          const first = effectiveBoys[0] || 'Aryakulam Nilokheri';
          const second = prev.secondPreference && prev.secondPreference !== first && effectiveBoys.includes(prev.secondPreference)
            ? prev.secondPreference
            : '';
          return {
            ...prev,
            firstPreference: first,
            secondPreference: second,
          };
        });
      }
    }
  }, [formData.gender, activeLocations]);

  // Adjust stream when class or firstPreference campus changes
  useEffect(() => {
    if (!formData.applyingClass.includes('11') && formData.applyingClass !== '11') {
      if (formData.stream) {
        setFormData((prev) => ({ ...prev, stream: '' }));
      }
    } else {
      const allowedStreams = getStreamsForCampus(formData.firstPreference);
      if (!formData.stream || !allowedStreams.includes(formData.stream as any)) {
        setFormData((prev) => ({ ...prev, stream: allowedStreams[0] || 'Non Medical' }));
      }
    }
  }, [formData.applyingClass, formData.firstPreference]);

  // Restore contact info and pre-fill on mount
  useEffect(() => {
    // 1. Restore saved application draft from localStorage (crucial when returning from cancelled payment)
    try {
      const localDraft = localStorage.getItem('gurukul_application_draft');
      if (localDraft) {
        const parsed = JSON.parse(localDraft);
        setFormData((prev) => ({
          ...prev,
          ...parsed,
          gender: normalizeGender(parsed.gender || prev.gender),
        }));
        if (parsed.photo) setNtaCheckbox(true);
      }
    } catch { }

    // 2. Check return payment status from HDFC gateway if returning from payment
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      const orderId = params.get('orderId');
      const regNo = params.get('regNo');
      const msg = params.get('msg');

      if (paymentStatus === 'success') {
        try {
          sessionStorage.removeItem('gurukul_reg_info');
          localStorage.removeItem('gurukul_application_draft');
          window.history.replaceState({}, '', window.location.pathname);
        } catch { }
        window.location.replace(`/payment/thank-you?orderId=${encodeURIComponent(orderId || '')}&regNo=${encodeURIComponent(regNo || '')}`);
        return;
      }

      if (paymentStatus === 'pending') {
        const orderId = params.get('orderId');
        const msg = params.get('msg');
        setStep(6);
        setDeclarationAgreed(true);
        if (orderId) {
          setPendingOrderId(orderId);
        }
        setError(msg || `Your payment (Order: ${orderId || ''}) is pending confirmation. You can review your particulars below and retry submitting anytime.`);
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch { }
      } else if (paymentStatus === 'failed' || paymentStatus === 'error' || paymentStatus === 'cancelled') {
        setStep(6);
        setDeclarationAgreed(true);
        setError(msg || 'Payment session was cancelled. All your application particulars are safely preserved below; click "Pay ₹800 & Submit Application" to retry.');
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch { }
      }
    }

    // 3. Check session storage from registration step
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

    // Fetch public settings for activeStudyLocations
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.activeStudyLocations && Array.isArray(data.settings.activeStudyLocations)) {
          setActiveLocations(data.settings.activeStudyLocations);
        }
      })
      .catch(() => { });

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((authData) => {
        if (authData.user) {
          const user = authData.user;
          // If applicant is already registered and fee payment is completed, redirect to dashboard immediately
          if (user.role === 'applicant' && !user.isTemporary) {
            fetch('/api/applications')
              .then((r) => r.json())
              .then((appRes) => {
                if (appRes?.application && appRes.application.paymentStatus === 'completed') {
                  try {
                    localStorage.removeItem('gurukul_application_draft');
                    sessionStorage.removeItem('gurukul_reg_info');
                  } catch { }
                  window.location.replace('/dashboard');
                }
              })
              .catch(() => { });
            return;
          }
          setCurrentUser(user);
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
                gender: normalizeGender(app.personalInfo?.gender || prev.gender),
                category: app.personalInfo?.category || prev.category,
                aadhaarNumber: app.personalInfo?.aadhaarNumber || prev.aadhaarNumber,
                panNumber: app.personalInfo?.panNumber || prev.panNumber,
                apaarId: app.personalInfo?.apaarId || prev.apaarId,
                familyId: app.personalInfo?.familyId || prev.familyId,
                previousSchoolName: app.personalInfo?.previousSchoolName || prev.previousSchoolName,
                previousBoard: app.personalInfo?.previousBoard || prev.previousBoard,
                otherBoard: app.personalInfo?.otherBoard || prev.otherBoard,
                applyingClass: app.classApplying || prev.applyingClass,
                stream: app.stream || prev.stream,
                fatherName: app.parentInfo?.fatherName || prev.fatherName,
                fatherOccupation: app.parentInfo?.fatherOccupation || prev.fatherOccupation,
                fatherOccupationOption: (() => {
                  const f = app.parentInfo?.fatherOccupation || prev.fatherOccupation;
                  if (!f) return '';
                  return FATHER_OCCUPATIONS.some((o) => o.toLowerCase() === f.toLowerCase() && o !== 'Others') ? f : 'Others';
                })(),
                fatherOccupationOther: (() => {
                  const f = app.parentInfo?.fatherOccupation || prev.fatherOccupation;
                  if (!f) return '';
                  return FATHER_OCCUPATIONS.some((o) => o.toLowerCase() === f.toLowerCase() && o !== 'Others') ? '' : f;
                })(),
                fatherPhone: app.parentInfo?.fatherPhone || prev.fatherPhone,
                motherName: app.parentInfo?.motherName || prev.motherName,
                motherOccupation: app.parentInfo?.motherOccupation || prev.motherOccupation,
                motherOccupationOption: (() => {
                  const m = app.parentInfo?.motherOccupation || prev.motherOccupation;
                  if (!m) return '';
                  return MOTHER_OCCUPATIONS.some((o) => o.toLowerCase() === m.toLowerCase() && o !== 'Others') ? m : 'Others';
                })(),
                motherOccupationOther: (() => {
                  const m = app.parentInfo?.motherOccupation || prev.motherOccupation;
                  if (!m) return '';
                  return MOTHER_OCCUPATIONS.some((o) => o.toLowerCase() === m.toLowerCase() && o !== 'Others') ? '' : m;
                })(),
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

              if (app.currentStep && app.currentStep > 1 && app.currentStep <= 6) {
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
      const allowedStreams = getStreamsForCampus(formData.firstPreference);
      setFormData((prev) => ({
        ...prev,
        applyingClass: value,
        stream: is11 ? (prev.stream && allowedStreams.includes(prev.stream as any) ? prev.stream : allowedStreams[0] || 'Non Medical') : '',
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
      handleGenderSelect(normalizeGender(value));
    } else if (name === 'firstPreference') {
      const allowedStreams = getStreamsForCampus(value);
      setFormData((prev) => ({
        ...prev,
        firstPreference: value,
        secondPreference: prev.secondPreference === value ? '' : prev.secondPreference,
        stream: prev.applyingClass.includes('11')
          ? (prev.stream && allowedStreams.includes(prev.stream as any) ? prev.stream : allowedStreams[0] || 'Non Medical')
          : prev.stream,
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

  // Step Validation & Navigation (6 Steps Total)
  const nextStep = () => {
    setError('');

    if (step === 1) {
      if (!ntaCheckbox) {
        setError('Please read and accept the Admission & Counselling Instruction Manual above before proceeding.');
        return;
      }
      const locVal = validateStudyLocation(formData.gender, formData.firstPreference, formData.secondPreference, activeLocations);
      if (!locVal.isValid) {
        setError(locVal.error || 'Please select a valid study location preference.');
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
      const classVal = validateClassAndStream(formData.applyingClass, formData.stream, formData.firstPreference, formData.gender);
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
      if (!formData.password || formData.password.length < 6) {
        setError('Please create a candidate login password of at least 6 characters.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Candidate login passwords do not match. Please ensure both fields are identical.');
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
      if (formData.fatherOccupationOption === 'Others' && (!formData.fatherOccupationOther || !formData.fatherOccupationOther.trim())) {
        setError("Please specify Father's Occupation.");
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
      if (formData.motherOccupationOption === 'Others' && (!formData.motherOccupationOther || !formData.motherOccupationOther.trim())) {
        setError("Please specify Mother's Occupation.");
        return;
      }
      if (formData.motherOccupation && formData.motherOccupation.trim()) {
        const mOccVal = validateOccupation(formData.motherOccupation, "Mother's Occupation");
        if (!mOccVal.isValid) {
          setError(mOccVal.error || 'Invalid Mother Occupation');
          return;
        }
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
      const docsVal = validateAllFourDocuments(formData);
      if (!docsVal.isValid) {
        setError(docsVal.error || 'All 3 documents are mandatory.');
        return;
      }
      setStep(6);
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

  // Final ₹800 Payment & Official Registration Submission via HDFC SmartGateway
  const handleSubmitPayment = async () => {
    setError('');

    if (!declarationAgreed) {
      setError('Please accept the final declaration undertaking before completing fee payment.');
      return;
    }

    setLoading(true);

    let chosenPassword = formData.password || '';
    if (!chosenPassword) {
      try {
        const stored = sessionStorage.getItem('gurukul_reg_info');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.password) chosenPassword = parsed.password;
        }
      } catch { }
    }

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
          apaarId: formData.apaarId || undefined,
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
      };

      // Backup draft in localStorage
      try {
        localStorage.setItem('gurukul_application_draft', JSON.stringify({
          ...formData,
          step: 6,
        }));
      } catch { }

      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Payment gateway initialization failed. Please review your details and try again.');
        setLoading(false);
        return;
      }

      // Case A: Razorpay Gateway Checkout Modal
      if (data.gateway === 'razorpay') {
        const loadScript = (): Promise<boolean> => {
          return new Promise((resolve) => {
            if (typeof window === 'undefined') return resolve(false);
            if ((window as any).Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const loaded = await loadScript();
        if (!loaded) {
          setError('Failed to load secure payment gateway. Please check your internet connection.');
          setLoading(false);
          return;
        }

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency || 'INR',
          name: 'The Gurukul',
          description: data.description || 'Entrance Examination Fee 2027-28',
          image: '/logo-gurukul.png',
          order_id: data.orderId,
          remember_customer: false,
          prefill: {
            name: data.candidateName,
            contact: data.candidatePhone || '',
          },
          theme: {
            color: '#8b0000',
          },
          handler: async function (response: any) {
            setLoading(true);
            setVerifyingPayment(true);
            try {
              const verifyRes = await fetch('/api/payment/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success && verifyData.redirectUrl) {
                try {
                  localStorage.removeItem('gurukul_application_draft');
                  sessionStorage.removeItem('gurukul_reg_info');
                } catch { }
                window.location.href = verifyData.redirectUrl;
              } else {
                setVerifyingPayment(false);
                setError(verifyData.error || 'Payment verification failed. Please contact admission helpline.');
                setLoading(false);
              }
            } catch {
              setVerifyingPayment(false);
              setError('Failed to confirm transaction. If money was deducted, please contact admissions helpdesk with your Order ID: ' + data.orderId);
              setLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setError(resp?.error?.description || 'Payment was unsuccessful. Please try again.');
          setLoading(false);
        });
        rzp.open();
        return;
      }

      // Case B: HDFC Hosted Page Redirect
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setError('Payment gateway returned an invalid session. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('An error occurred while connecting to the payment gateway. Please check your internet connection.');
      setLoading(false);
    }
  };

  const handleRecoverPayment = async () => {
    if (!pendingOrderId) return;
    setRecoveringPayment(true);
    setError('');
    try {
      const payload = {
        classApplying: formData.applyingClass,
        stream: formData.stream || undefined,
        personalInfo: {
          fullName: formData.fullName,
          dob: formData.dob,
          gender: formData.gender,
          category: formData.category,
          aadhaarNumber: formData.aadhaarNumber,
          panNumber: formData.panNumber || undefined,
          apaarId: formData.apaarId || undefined,
          familyId: formData.familyId || undefined,
          previousSchoolName: formData.previousSchoolName,
          previousBoard: formData.previousBoard,
          otherBoard: formData.otherBoard || undefined,
          nationality: formData.nationality,
          religion: formData.religion,
          whatsappNumber: formData.whatsappNumber,
          candidateEmail: formData.candidateEmail,
          candidateMobile: formData.candidateMobile,
        },
        parentInfo: {
          fatherName: formData.fatherName,
          fatherOccupation: formData.fatherOccupationOption === 'Other' ? formData.fatherOccupationOther : formData.fatherOccupationOption,
          fatherPhone: formData.fatherPhone,
          motherName: formData.motherName,
          motherOccupation: formData.motherOccupationOption === 'Other' ? formData.motherOccupationOther : formData.motherOccupationOption,
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
        },
        studyLocationPref: {
          firstPreference: formData.firstPreference,
          secondPreference: formData.secondPreference || undefined,
        },
        documents: {
          passportPhoto: formData.photo,
          candidateSignature: formData.signature,
          parentSignature: formData.parentSignature,
          aadhaarCard: formData.aadhaarCard,
        },
        password: formData.password || undefined,
      };

      const res = await fetch('/api/payment/hdfc/complete-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: pendingOrderId,
          formData: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete registration for this order.');
      }

      try {
        localStorage.removeItem('gurukul_application_draft');
        sessionStorage.removeItem('gurukul_reg_info');
      } catch {}
      window.location.href = data.redirectUrl || `/payment/thank-you?orderId=${encodeURIComponent(pendingOrderId)}&regNo=${encodeURIComponent(data.registrationNumber)}`;
    } catch (err: any) {
      setError(err?.message || 'Verification failed. If your payment was deducted, please contact admissions helpdesk.');
    } finally {
      setRecoveringPayment(false);
    }
  };

  const steps = [
    { num: 1, label: 'Instructions & Campus' },
    { num: 2, label: 'Candidate' },
    { num: 3, label: 'Parents' },
    { num: 4, label: 'Address' },
    { num: 5, label: 'Documents' },
    { num: 6, label: 'Payment' },
  ];

  const currentDistricts = INDIAN_STATES_AND_DISTRICTS[formData.state] || ['Other'];

  const rawBoysActive = ['Aryakulam Nilokheri', 'Gurukul Jyotisar'].filter((l) =>
    activeLocations.includes(l)
  );
  const boysActiveLocations = rawBoysActive.length > 0 ? rawBoysActive : ['Aryakulam Nilokheri', 'Gurukul Jyotisar'];

  // SCREEN: Registration Confirmed Screen -> Redirect to Thank You page
  if (submittedApp) {
    if (typeof window !== 'undefined') {
      window.location.replace(`/payment/thank-you?orderId=${encodeURIComponent(submittedApp.orderId || '')}&regNo=${encodeURIComponent(submittedApp.registrationNumber || '')}`);
    }
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-800">Payment received! Loading confirmation...</p>
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

      {currentUser && (
        <div className="mb-5 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Currently logged in as: <strong>{currentUser.name}</strong> ({currentUser.email || currentUser.role})</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.reload();
            }}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 underline"
          >
            Sign Out to Start Fresh
          </button>
        </div>
      )}

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
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span className="font-semibold text-rose-900">Notice</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed ml-7">{error}</p>

          {pendingOrderId && (
            <div className="mt-3 ml-7 pt-3 border-t border-rose-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-700 font-semibold">
                  Already paid ₹800 on {process.env.NEXT_PUBLIC_ACTIVE_PAYMENT_GATEWAY === 'hdfc' ? 'HDFC SmartGateway' : 'Razorpay'} for Order ID: <span className="font-mono text-portal-navy bg-slate-100 px-1.5 py-0.5 rounded">{pendingOrderId}</span>?
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Your details are preserved. Click to verify payment with the bank and issue your Admit Card immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRecoverPayment}
                disabled={recoveringPayment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                {recoveringPayment ? (
                  <>
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Verifying with Bank...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Verify & Complete Registration</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Form Content Card */}
      <div className="portal-card p-6 sm:p-8">
        {/* STEP 1: Instructions, Gender & Study Location */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Admission & Counselling Instruction Manual (From Official PDF) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-portal-navy to-slate-900 text-white p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold inline-block mb-1">
                      Academic Session 2027–28
                    </span>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white font-serif">
                      {instructionLang === 'hi'
                        ? 'प्रवेश एवं काउंसलिंग निर्देश विवरणिका'
                        : 'ADMISSION & COUNSELLING INSTRUCTION MANUAL'}
                    </h2>
                    <p className="text-xs text-slate-300">
                      {instructionLang === 'hi'
                        ? 'The Gurukul Nilokheri • Aryakulam Nilokheri • Gurukul Jyotisar'
                        : 'The Gurukul Nilokheri • Aryakulam Nilokheri • Gurukul Jyotisar'}
                    </p>
                  </div>

                  {/* Language Switch Buttons */}
                  <div className="flex items-center gap-1 bg-white/10 p-1 rounded-lg border border-white/20 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setInstructionLang('en')}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        instructionLang === 'en'
                          ? 'bg-white text-portal-navy shadow-xs'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstructionLang('hi')}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        instructionLang === 'hi'
                          ? 'bg-white text-portal-navy shadow-xs'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      हिन्दी
                    </button>
                  </div>
                </div>
              </div>

              {/* Instructions Content Body */}
              <div className="p-4 sm:p-6 space-y-5 text-xs text-slate-800 leading-relaxed divide-y divide-slate-100">
                {instructionLang === 'en' ? (
                  <>
                    {/* 1. Registration */}
                    <div className="space-y-2">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">1</span>
                        <span>Registration</span>
                      </h3>
                      <ul className="list-disc pl-7 space-y-1.5 text-slate-700">
                        <li>Registration starts on <strong>5 October 2026</strong>.</li>
                        <li>Registration fee: <strong>₹800</strong>.</li>
                        <li>Last date for registration: <strong>12 February 2027</strong>.</li>
                        <li>A latest coloured photograph of the student is mandatory.</li>
                        <li>Student and parent details must be filled correctly as per supporting documents.</li>
                        <li>Details once submitted in the registration form cannot be changed.</li>
                      </ul>
                    </div>

                    {/* 2. Entrance Examination */}
                    <div className="pt-4 space-y-2">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">2</span>
                        <span>Entrance Examination</span>
                      </h3>
                      <p className="text-slate-700 leading-relaxed">
                        The offline entrance examination for <strong>The Gurukul Nilokheri (Girls)</strong> will be held on <strong>Sunday, 14 February 2027 at 8:30 AM</strong> at <strong>The Gurukul Nilokheri</strong>.
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        The entrance examination for <strong>boys</strong> will be held on <strong>14 February 2027</strong>. Candidates must report at <strong>9:30 AM at Aryakulam Nilokheri</strong>.
                      </p>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg mt-2">
                        <span className="font-bold text-slate-900 block mb-1">Candidates must bring:</span>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                          <li>Admit Card</li>
                          <li>Aadhaar Card copy as ID proof</li>
                          <li>Two passport-size photographs</li>
                        </ul>
                      </div>
                    </div>

                    {/* 3. Counselling Schedule */}
                    <div className="pt-4 space-y-2.5">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">3</span>
                        <span>Counselling Schedule</span>
                      </h3>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                            <tr>
                              <th className="p-2 border-r border-slate-200">Category</th>
                              <th className="p-2 border-r border-slate-200">Exam Date</th>
                              <th className="p-2 border-r border-slate-200">Venue</th>
                              <th className="p-2 border-r border-slate-200">Reporting Time</th>
                              <th className="p-2 border-r border-slate-200">Counselling Dates</th>
                              <th className="p-2 border-r border-slate-200">Counselling Venue</th>
                              <th className="p-2">Reporting Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-[11px]">
                            <tr className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-purple-900 border-r border-slate-200 bg-purple-50/50">Girls</td>
                              <td className="p-2 border-r border-slate-200 font-medium">14 Feb 2027</td>
                              <td className="p-2 border-r border-slate-200">The Gurukul Nilokheri</td>
                              <td className="p-2 border-r border-slate-200 font-semibold text-rose-700">8:30 AM</td>
                              <td className="p-2 border-r border-slate-200 font-medium">15, 16 &amp; 17 February 2027</td>
                              <td className="p-2 border-r border-slate-200">The Gurukul Nilokheri</td>
                              <td className="p-2 font-medium">9:00 AM to 1:00 PM</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-blue-900 border-r border-slate-200 bg-blue-50/50">Boys</td>
                              <td className="p-2 border-r border-slate-200 font-medium">14 Feb 2027</td>
                              <td className="p-2 border-r border-slate-200">Aryakulam Nilokheri</td>
                              <td className="p-2 border-r border-slate-200 font-semibold text-rose-700">9:30 AM</td>
                              <td className="p-2 border-r border-slate-200 font-medium">15, 16 &amp; 17 February 2027</td>
                              <td className="p-2 border-r border-slate-200">Aryakulam Nilokheri</td>
                              <td className="p-2 font-medium">9:00 AM to 1:00 PM</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 4. Counselling-Day Deposit */}
                    <div className="pt-4 space-y-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">4</span>
                        <span>Counselling-Day Deposit</span>
                      </h3>
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-950 font-medium">
                        A deposit of <strong>₹25,000</strong> is to be deposited on the day of counselling for all three institutions.
                      </div>
                    </div>

                    {/* 5. Result */}
                    <div className="pt-4 space-y-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">5</span>
                        <span>Result</span>
                      </h3>
                      <p className="text-slate-700">
                        The entrance examination result will be declared on the official website/portal only.
                      </p>
                    </div>

                    {/* 6. Important Portal Instructions */}
                    <div className="pt-4 space-y-2">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">6</span>
                        <span>Important Portal Instructions</span>
                      </h3>
                      <ul className="list-disc pl-7 space-y-1.5 text-slate-700">
                        <li>Read all instructions carefully before filling the registration form.</li>
                        <li>Enter student and parent information exactly as per supporting documents.</li>
                        <li>Upload the latest coloured photograph.</li>
                        <li>Keep registration/application details and the admit card safely for examination and counselling.</li>
                        <li>Carry all required documents on the examination/counselling day.</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 1. पंजीकरण */}
                    <div className="space-y-2">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">1</span>
                        <span>पंजीकरण</span>
                      </h3>
                      <ul className="list-disc pl-7 space-y-1.5 text-slate-700">
                        <li>पंजीकरण <strong>5 अक्तूबर 2026</strong> से प्रारम्भ होगा।</li>
                        <li>पंजीकरण शुल्क <strong>₹800</strong> है।</li>
                        <li>पंजीकरण की अंतिम तिथि <strong>12 फरवरी 2027</strong> है।</li>
                        <li>विद्यार्थी का नवीनतम रंगीन फोटो अपलोड करना अनिवार्य है।</li>
                        <li>विद्यार्थी एवं अभिभावक की जानकारी संबंधित दस्तावेजों के अनुसार सही भरनी होगी।</li>
                        <li>पंजीकरण फॉर्म में दिया गया विवरण एक बार जमा करने के बाद उसमें परिवर्तन नहीं किया जा सकेगा।</li>
                      </ul>
                    </div>

                    {/* 2. प्रवेश परीक्षा */}
                    <div className="pt-4 space-y-2">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">2</span>
                        <span>प्रवेश परीक्षा</span>
                      </h3>
                      <p className="text-slate-700 leading-relaxed">
                        The Gurukul Nilokheri (Girls) की ऑफलाइन प्रवेश परीक्षा <strong>रविवार, 14 फरवरी 2027 को प्रातः 8:30 बजे</strong> आयोजित होगी। लड़कियों को <strong>प्रातः 8:00 बजे The Gurukul Nilokheri</strong> में रिपोर्ट करना होगा।
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        लड़कों की प्रवेश परीक्षा <strong>14 फरवरी 2027</strong> को आयोजित की जाएगी। विद्यार्थियों को <strong>प्रातः 9:30 बजे Aryakulam Nilokheri</strong> में रिपोर्ट करना होगा।
                      </p>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg mt-2">
                        <span className="font-bold text-slate-900 block mb-1">विद्यार्थी निम्नलिखित को अपने साथ लाएँ:</span>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                          <li>Admit Card</li>
                          <li>पहचान हेतु Aadhaar Card की एक प्रति</li>
                          <li>दो पासपोर्ट साइज फोटो</li>
                        </ul>
                      </div>
                    </div>

                    {/* 3. परीक्षा एवं काउंसलिंग कार्यक्रम */}
                    <div className="pt-4 space-y-2.5">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">3</span>
                        <span>परीक्षा एवं काउंसलिंग कार्यक्रम</span>
                      </h3>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                            <tr>
                              <th className="p-2 border-r border-slate-200">श्रेणी</th>
                              <th className="p-2 border-r border-slate-200">परीक्षा</th>
                              <th className="p-2 border-r border-slate-200">स्थान</th>
                              <th className="p-2 border-r border-slate-200">रिपोर्टिंग समय</th>
                              <th className="p-2 border-r border-slate-200">काउंसलिंग</th>
                              <th className="p-2 border-r border-slate-200">स्थान</th>
                              <th className="p-2">रिपोर्टिंग समय</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-[11px]">
                            <tr className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-purple-900 border-r border-slate-200 bg-purple-50/50">छात्राएँ</td>
                              <td className="p-2 border-r border-slate-200 font-medium">14 फरवरी 2027</td>
                              <td className="p-2 border-r border-slate-200">गुरुकुल नीलोखेड़ी</td>
                              <td className="p-2 border-r border-slate-200 font-semibold text-rose-700">प्रातः 8:30 बजे (रिपोर्ट 8:00 बजे)</td>
                              <td className="p-2 border-r border-slate-200 font-medium">15, 16 एवं 17 फरवरी 2027</td>
                              <td className="p-2 border-r border-slate-200">गुरुकुल नीलोखेड़ी</td>
                              <td className="p-2 font-medium">प्रातः 9:00 से 1:00 बजे</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-blue-900 border-r border-slate-200 bg-blue-50/50">छात्र</td>
                              <td className="p-2 border-r border-slate-200 font-medium">14 फरवरी 2027</td>
                              <td className="p-2 border-r border-slate-200">आर्यकुलम नीलोखेड़ी</td>
                              <td className="p-2 border-r border-slate-200 font-semibold text-rose-700">प्रातः 9:30 बजे</td>
                              <td className="p-2 border-r border-slate-200 font-medium">15, 16 एवं 17 फरवरी 2027</td>
                              <td className="p-2 border-r border-slate-200">आर्यकुलम नीलोखेड़ी</td>
                              <td className="p-2 font-medium">प्रातः 9:00 से 1:00 बजे</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 4. काउंसलिंग जमा राशि */}
                    <div className="pt-4 space-y-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">4</span>
                        <span>काउंसलिंग जमा राशि</span>
                      </h3>
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-950 font-medium">
                        तीनों संस्थानों के लिए काउंसलिंग के दिन <strong>₹25,000</strong> जमा करना होगा।
                      </div>
                    </div>

                    {/* 5. परिणाम */}
                    <div className="pt-4 space-y-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">5</span>
                        <span>परिणाम</span>
                      </h3>
                      <p className="text-slate-700">
                        प्रवेश परीक्षा का परिणाम केवल आधिकारिक वेबसाइट/पोर्टल पर घोषित किया जाएगा।
                      </p>
                    </div>

                    {/* 6. जरुरी पोर्टल निर्देश */}
                    <div className="pt-4 space-y-2">
                      <h3 className="text-xs sm:text-sm font-bold text-portal-navy uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-portal-navy text-white text-[11px] flex items-center justify-center font-bold">6</span>
                        <span>जरुरी पोर्टल निर्देश</span>
                      </h3>
                      <ul className="list-disc pl-7 space-y-1.5 text-slate-700">
                        <li>पंजीकरण फॉर्म भरने से पहले सभी निर्देश ध्यानपूर्वक पढ़ें।</li>
                        <li>विद्यार्थी एवं अभिभावक की जानकारी संबंधित दस्तावेजों के अनुसार ही भरें।</li>
                        <li>नवीनतम रंगीन फोटो अपलोड करें।</li>
                        <li>पंजीकरण/आवेदन विवरण तथा Admit Card को परीक्षा एवं काउंसलिंग तक सुरक्षित रखें।</li>
                        <li>परीक्षा/काउंसलिंग के दिन सभी आवश्यक दस्तावेज साथ लाएँ।</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Checkbox: User Reading & Accepting Instructions */}
            <label className="flex items-start gap-3 p-4 bg-amber-50/80 border border-amber-300 rounded-xl cursor-pointer hover:bg-amber-50 transition shadow-2xs">
              <input
                type="checkbox"
                checked={ntaCheckbox}
                onChange={(e) => setNtaCheckbox(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-portal-navy rounded border-slate-300 focus:ring-portal-navy"
              />
              <span className="text-xs text-slate-900 leading-normal font-medium">
                {instructionLang === 'hi'
                  ? 'मैंने उपरोक्त प्रवेश एवं काउंसलिंग निर्देश विवरणिका (शैक्षणिक सत्र 2027–28) के सभी 6 निर्देशों को ध्यानपूर्वक पढ़ व समझ लिया है और मैं सभी नियमों, परीक्षा व काउंसलिंग कार्यक्रम को स्वीकार करता/करती हूँ।'
                  : 'I have read, understood, and accept all the instructions in the Admission & Counselling Instruction Manual (Academic Session 2027–28) as given above. I agree to all examination conditions, schedules, deposit rules, and campus terms.'} <span className="text-rose-500 font-bold">*</span>
              </span>
            </label>

            {/* Candidate Gender & Study Location Selection (At the end, intact with PDF-aligned instructions) */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
              <div className="border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Candidate Gender &amp; Preferred Campus</span>
                  <span className="text-rose-500">*</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select candidate gender to view eligible Gurukul campuses and specific examination details as per the manual.
                </p>
              </div>

              {/* Gender Selector */}
              <div>
                <label className="form-label mb-2">
                  Candidate Gender <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => handleGenderSelect('Male')}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition select-none ${
                      formData.gender === 'Male'
                        ? 'border-portal-navy bg-portal-navy/5 text-portal-navy font-bold shadow-xs ring-1 ring-portal-navy'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                        formData.gender === 'Male'
                          ? 'border-portal-navy bg-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {formData.gender === 'Male' && (
                        <div className="w-2 h-2 rounded-full bg-portal-navy" />
                      )}
                    </div>
                    <span className="text-xs">Male (Boys)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenderSelect('Female')}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition select-none ${
                      formData.gender === 'Female'
                        ? 'border-portal-navy bg-portal-navy/5 text-portal-navy font-bold shadow-xs ring-1 ring-portal-navy'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                        formData.gender === 'Female'
                          ? 'border-portal-navy bg-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {formData.gender === 'Female' && (
                        <div className="w-2 h-2 rounded-full bg-portal-navy" />
                      )}
                    </div>
                    <span className="text-xs">Female (Girls)</span>
                  </button>
                </div>
              </div>

              {/* Preferred Study Location Options with PDF-aligned details */}
              {(formData.gender === 'Female' || (formData.gender as string)?.toLowerCase() === 'female') ? (
                <div className="p-4 rounded-lg bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950">Study Location Preference (Girls)</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                      The Gurukul Nilokheri (Girls)
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value="The Gurukul Nilokheri (Girls Wing)"
                    className="form-input-field bg-white text-slate-800 font-semibold cursor-not-allowed border-indigo-200"
                  />
                  <div className="bg-white/80 p-3 rounded-md border border-indigo-100 text-[11px] text-indigo-950 space-y-1">
                    <p className="font-semibold text-indigo-900">
                      Official Schedule as per Instruction Manual (Girls):
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      <li><strong>Entrance Exam:</strong> Sunday, 14 February 2027 at 8:30 AM at <strong>The Gurukul Nilokheri</strong>.</li>
                      <li><strong>Reporting Time:</strong> Candidates must report at <strong>8:00 AM / 8:30 AM</strong>.</li>
                      <li><strong>Counselling Schedule:</strong> 15, 16 &amp; 17 February 2027 (9:00 AM to 1:00 PM) at <strong>The Gurukul Nilokheri</strong>.</li>
                      <li><strong>Counselling-Day Deposit:</strong> A deposit of <strong>₹25,000</strong> is to be deposited on the day of counselling.</li>
                      <li><strong>Must Bring:</strong> Admit Card, Aadhaar Card copy, and 2 passport-size photographs.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">
                        1st Preference Study Location <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="firstPreference"
                        required
                        value={formData.firstPreference}
                        onChange={handleChange}
                        className="form-input-field font-semibold"
                      >
                        <option value="">Select 1st Preference</option>
                        {boysActiveLocations.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                      {boysActiveLocations.length === 1 && (
                        <p className="text-[11px] text-emerald-700 mt-1">
                          Currently the active campus enabled for admission.
                        </p>
                      )}
                    </div>

                    {boysActiveLocations.length > 1 && (
                      <div>
                        <label className="form-label">
                          2nd Preference Study Location <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <select
                          name="secondPreference"
                          value={formData.secondPreference}
                          onChange={handleChange}
                          className="form-input-field"
                        >
                          <option value="">None / No Second Choice</option>
                          {boysActiveLocations
                            .filter((l) => l !== formData.firstPreference)
                            .map((loc) => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50/70 p-3 rounded-md border border-blue-200 text-[11px] text-blue-950 space-y-1">
                    <p className="font-semibold text-blue-900">
                      Official Schedule as per Instruction Manual (Boys):
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                      <li><strong>Entrance Exam:</strong> Sunday, 14 February 2027 at <strong>Aryakulam Nilokheri</strong>.</li>
                      <li><strong>Reporting Time:</strong> Candidates must report at <strong>9:30 AM</strong> at Aryakulam Nilokheri.</li>
                      <li><strong>Counselling Schedule:</strong> 15, 16 &amp; 17 February 2027 (9:00 AM to 1:00 PM) at <strong>Aryakulam Nilokheri</strong>.</li>
                      <li><strong>Counselling-Day Deposit:</strong> A deposit of <strong>₹25,000</strong> is to be deposited on the day of counselling for all institutions.</li>
                      <li><strong>Must Bring:</strong> Admit Card, Aadhaar Card copy, and 2 passport-size photographs.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
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
                <label className="form-label flex items-center justify-between">
                  <span>
                    Gender <span className="text-rose-500">*</span>
                  </span>
                </label>
                <div className="relative">
                  <select
                    name="gender"
                    disabled
                    value={formData.gender}
                    className="form-input-field bg-slate-100 text-slate-700 font-semibold cursor-not-allowed border-slate-300 opacity-90 shadow-none"
                  >
                    <option value={formData.gender}>{formData.gender === 'Female' ? 'Female (Girls)' : 'Male (Boys)'}</option>
                  </select>
                </div>
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
                  {formData.gender === 'Male' && <option value="Class 5">Class 5</option>}
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 11">Class 11</option>
                </select>
              </div>

              {formData.applyingClass.includes('11') && (
                <div>
                  <label className="form-label flex items-center justify-between">
                    <span>
                      Stream <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  <select
                    name="stream"
                    required
                    value={formData.stream || getStreamsForCampus(formData.firstPreference)[0] || 'Non Medical'}
                    onChange={handleChange}
                    className="form-input-field font-semibold"
                  >
                    {getStreamsForCampus(formData.firstPreference).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
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
                  APAAR ID (One Nation, One Student ID)
                </label>
                <input
                  type="text"
                  name="apaarId"
                  maxLength={14}
                  value={formData.apaarId}
                  onChange={handleChange}
                  placeholder="12-digit APAAR ID (if allotted)"
                  className="form-input-field font-mono"
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

              {/* Candidate Portal Login Password */}
              <div>
                <label className="form-label">
                  Create Login Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    className="form-input-field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Used for logging into Candidate Portal after registration.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="form-label mb-0">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  {formData.confirmPassword && (
                    <span className={`text-[10px] font-semibold ${formData.password === formData.confirmPassword ? 'text-emerald-600' : 'text-rose-500'
                      }`}>
                      {formData.password === formData.confirmPassword ? 'Passwords Match' : 'Passwords Differ'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className={`form-input-field pr-10 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-rose-400 focus:border-rose-500' : ''
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                <select
                  name="fatherOccupationOption"
                  value={formData.fatherOccupationOption}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      fatherOccupationOption: val,
                      fatherOccupation: val === 'Others' ? (prev.fatherOccupationOther.trim() || 'Others') : val,
                    }));
                  }}
                  className="form-input-field"
                >
                  <option value="">Select Father&apos;s Occupation</option>
                  {FATHER_OCCUPATIONS.map((occ) => (
                    <option key={occ} value={occ}>{occ}</option>
                  ))}
                </select>
                {formData.fatherOccupationOption === 'Others' && (
                  <div className="mt-2">
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Specify Father&apos;s Occupation <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fatherOccupationOther"
                      value={formData.fatherOccupationOther}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          fatherOccupationOther: val,
                          fatherOccupation: val.trim() || 'Others',
                        }));
                      }}
                      placeholder="e.g. Architect, Consultant, Artist"
                      maxLength={50}
                      className="form-input-field text-xs"
                    />
                  </div>
                )}
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
                <select
                  name="motherOccupationOption"
                  value={formData.motherOccupationOption}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      motherOccupationOption: val,
                      motherOccupation: val === 'Others' ? (prev.motherOccupationOther.trim() || 'Others') : val,
                    }));
                  }}
                  className="form-input-field"
                >
                  <option value="">Select Mother&apos;s Occupation</option>
                  {MOTHER_OCCUPATIONS.map((occ) => (
                    <option key={occ} value={occ}>{occ}</option>
                  ))}
                </select>
                {formData.motherOccupationOption === 'Others' && (
                  <div className="mt-2">
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Specify Mother&apos;s Occupation <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="motherOccupationOther"
                      value={formData.motherOccupationOther}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          motherOccupationOther: val,
                          motherOccupation: val.trim() || 'Others',
                        }));
                      }}
                      placeholder="e.g. Banker, Designer, Healthcare"
                      maxLength={50}
                      className="form-input-field text-xs"
                    />
                  </div>
                )}
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

        {/* STEP 5: Mandatory Documents Upload */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Step 5: Upload Documents</h2>
              <p className="text-xs text-slate-500">
                Upload clear scans or photographs (JPG, PNG, or PDF, max 2 MB each). All 3 documents are required.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Document 1: Photo */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3 overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">1. Candidate Photograph <span className="text-rose-500">*</span></span>
                  {formData.photo && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">Uploaded</span>}
                </div>
                {formData.photo ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={formData.photo} alt="Candidate" className="w-16 h-20 object-cover rounded border border-slate-200 shrink-0" />
                    <div className="flex-1 min-w-0 text-xs">
                      <span className="font-medium text-slate-800 block truncate" title={formData.photoName}>{formData.photoName}</span>
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
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3 overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">2. Candidate Signature <span className="text-rose-500">*</span></span>
                  {formData.signature && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">Uploaded</span>}
                </div>
                {formData.signature ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={formData.signature} alt="Signature" className="w-24 h-12 object-contain bg-white rounded border border-slate-200 shrink-0" />
                    <div className="flex-1 min-w-0 text-xs">
                      <span className="font-medium text-slate-800 block truncate" title={formData.signatureName}>{formData.signatureName}</span>
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

              {/* Document 3: Aadhaar Card */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3 overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-800">3. Aadhaar / ID Document <span className="text-rose-500">*</span></span>
                  {formData.aadhaarCard && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">Uploaded</span>}
                </div>
                {formData.aadhaarCard ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-12 shrink-0 bg-white border border-slate-200 rounded flex items-center justify-center text-slate-500 font-mono text-[10px] font-bold">
                      DOC
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <span className="font-medium text-slate-800 block truncate" title={formData.aadhaarCardName}>{formData.aadhaarCardName}</span>
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

        {/* STEP 6: Application Review & Fee Payment */}
        {step === 6 && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Step 6: Application Review &amp; Fee Payment</h2>
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
                  <span className="font-semibold text-slate-900">
                    {formData.firstPreference} {formData.secondPreference ? `(2nd: ${formData.secondPreference})` : ''}
                  </span>
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
                  <span className="block text-[11px] text-emerald-600 font-medium">Non-refundable</span>
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
                I hereby declare that provided particulars in application are true. <span className="text-rose-500 font-bold">*</span>
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

          {step < 6 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary text-xs px-5 py-2"
            >
              {step === 1 ? 'Accept & Continue to Candidate Details' : 'Continue to Next Step'}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || !declarationAgreed}
              onClick={handleSubmitPayment}
              className={`btn-primary text-xs px-6 py-2.5 font-bold ${!declarationAgreed || loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {loading
                ? (process.env.NEXT_PUBLIC_ACTIVE_PAYMENT_GATEWAY === 'hdfc'
                  ? 'Connecting to HDFC Payment Gateway...'
                  : 'Redirecting to Razorpay...')
                : 'Pay ₹800 & Submit Application'}
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

      {/* Full-Screen Payment Finalizing Overlay */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center border border-slate-100 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Payment Received Successfully!</h3>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mb-3 inline-block">
              Finalizing Institutional Registration...
            </span>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mb-4">
              We are issuing your permanent <strong>Registration ID</strong> and generating your <strong>Entrance Admit Card</strong>.
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full animate-pulse w-3/4"></div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Please do not refresh or navigate back. Redirecting to your confirmation receipt...
            </p>
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
