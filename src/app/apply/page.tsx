'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Users,
  MapPin,
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
  FileText,
  Save,
  BookmarkCheck,
  ShieldAlert,
  Trash2,
  Crop,
  Eye,
  Download
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
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState('');
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

  // Restore authenticated session & draft details on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((authData) => {
        if (!authData.user) {
          window.location.href = '/login?redirect=/apply';
          return;
        }

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
          // Father phone starts empty per specification
          fatherPhone: prev.fatherPhone || '',
        }));

        // Fetch draft application if any
        fetch('/api/applications/draft')
          .then((res) => res.json())
          .then((data) => {
            if (data.application) {
              const app = data.application;
              setFormData((prev) => ({
                ...prev,
                fullName: app.personalInfo?.fullName || user.name || prev.fullName,
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
        window.location.href = '/login';
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
        // Open the interactive NTA-style cropping modal
        const isPhoto = field === 'photo';
        setCropModal({
          isOpen: true,
          imageSrc: result,
          field: field as 'photo' | 'signature' | 'parentSignature',
          title: isPhoto ? 'Crop Candidate Photograph' : field === 'signature' ? 'Crop Candidate Signature' : 'Crop Parent / Guardian Signature',
          aspectRatio: isPhoto ? 3.5 / 4.5 : 3.5 / 1.5,
        });
      } else {
        // Aadhaar Document
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

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setError('');
    try {
      await fetch('/api/applications/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classApplying: formData.applyingClass,
          stream: formData.stream,
          currentStep: step,
          personalInfo: {
            fullName: formData.fullName,
            dob: formData.dob,
            gender: formData.gender,
            category: formData.category,
            aadhaarNumber: formData.aadhaarNumber,
            panNumber: formData.panNumber,
            familyId: formData.familyId,
            previousSchoolName: formData.previousSchoolName,
            previousBoard: formData.previousBoard,
            otherBoard: formData.otherBoard,
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
            guardianName: formData.guardianName,
            guardianRelation: formData.guardianRelation,
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
            secondPreference: formData.secondPreference,
          },
          documents: {
            photo: formData.photo,
            signature: formData.signature,
            parentSignature: formData.parentSignature,
            aadhaarCard: formData.aadhaarCard,
          },
        }),
      });
      setDraftSavedMsg('Application progress saved. You can resume anytime.');
      setTimeout(() => setDraftSavedMsg(''), 4000);
    } catch {
      setError('Failed to save draft. Please check your connection.');
    } finally {
      setSavingDraft(false);
    }
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
      // Candidate details validation
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
      // Parents validation
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
      // Address validation
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
      // Preferred Study Location validation
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
      // Documents validation (4 documents only)
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

    try {
      const payload = {
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

      // Clean local storage
      try {
        localStorage.removeItem('gurukul_application_draft');
      } catch { }

      // Directly move candidate to dashboard
      window.location.href = '/dashboard?registered=true';
    } catch {
      setError('An error occurred during payment processing. Please check your internet connection.');
      setLoading(false);
    }
  };

  const stepTitles = [
    { num: 1, title: 'Instructions', icon: ShieldCheck },
    { num: 2, title: 'Candidate', icon: User },
    { num: 3, title: 'Parents', icon: Users },
    { num: 4, title: 'Address', icon: MapPin },
    { num: 5, title: 'Study Location', icon: Building },
    { num: 6, title: 'Documents', icon: Upload },
    { num: 7, title: 'Payment', icon: CreditCard },
  ];

  const currentDistricts = INDIAN_STATES_AND_DISTRICTS[formData.state] || ['Other'];

  // SCREEN: Official Payment & Registration Confirmed Card
  if (submittedApp) {
    const regNo = submittedApp.registrationNumber || submittedApp.applicationNumber;
    return (
      <div className="max-w-3xl mx-auto my-12 px-4">
        <div className="bg-white border-2 border-emerald-500 rounded-3xl shadow-2xl p-6 sm:p-10 space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-mono font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3.5 py-1 rounded-full">
              Officially Registered &amp; Confirmed
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gurukul-navy mt-3">
              Registration Successful!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your application has been registered and entrance examination fee payment of <strong>₹800</strong> has been confirmed.
            </p>
          </div>

          {/* Official Printable Fee Receipt Card */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-6 text-left space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b pb-3 font-sans">
              <div>
                <h4 className="font-black text-gurukul-navy text-base">GURUKUL</h4>
                <p className="text-[11px] text-slate-500">Official E-Payment Receipt • Entrance Session 2026-27</p>
              </div>
              <div className="text-right">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  PAID - ₹800
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">Official Registration ID:</span>
                <span className="font-bold text-gurukul-navy text-base">{regNo}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Candidate Full Name:</span>
                <span className="font-bold text-slate-900">{formData.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Gender:</span>
                <span className="font-bold text-slate-900">{formData.gender}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Class &amp; Stream:</span>
                <span className="font-bold text-slate-900">{formData.applyingClass} {formData.stream ? `(${formData.stream})` : ''}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Preferred Study Location:</span>
                <span className="font-bold text-slate-900">{formData.firstPreference}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Payment Transaction ID:</span>
                <span className="font-bold text-slate-900">{submittedApp.transactionId}</span>
              </div>
            </div>
          </div>

          {/* Immediate Action Buttons: Admission Form & Admit Card */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>

            <Link
              href="/admission-form"
              className="w-full sm:w-auto px-6 py-3 bg-gurukul-navy hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Download Admission Form</span>
            </Link>

            <Link
              href="/admit-card"
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-gurukul-600 hover:from-amber-600 hover:to-gurukul-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>View Admit Card</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="text-xs text-slate-500 hover:text-slate-900 font-bold underline"
            >
              Go to Candidate Dashboard →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gurukul-600 bg-amber-100 px-3 py-1 rounded-full">
            Entrance Session 2026-27
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy mt-1">
            GURUKUL Online Entrance Application
          </h1>
          <p className="text-xs text-slate-500">
            Admissions for Gurukul Nilokheri, Gurukul Jyotisar, and Aryakulam Nilokheri
          </p>
        </div>

        {/* Abandon / Cancel Button */}
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl border border-red-200 transition self-start sm:self-center"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Cancel Application</span>
        </button>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex items-center justify-between min-w-[640px] border-b border-slate-200 pb-4">
          {stepTitles.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                className={`flex items-center gap-2 transition ${isActive
                  ? 'text-gurukul-600 font-bold'
                  : isCompleted
                    ? 'text-emerald-600 font-semibold cursor-pointer'
                    : 'text-slate-400 font-medium'
                  }`}
                onClick={() => isCompleted && setStep(s.num)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${isActive
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

      {/* Messages */}
      {draftSavedMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm">
          <BookmarkCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{draftSavedMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Steps Container */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-10">

        {/* STEP 1: Declaration & Instructions */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-b border-amber-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h2 className="text-base sm:text-lg font-black text-gurukul-navy">
                    Pre-Application Advisory &amp; Candidate Undertaking
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    (In accordance with Entrance Examination Standards for Session 2026-27)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full w-fit">
                Mandatory Step
              </span>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed bg-amber-50/60 p-5 sm:p-6 rounded-2xl border border-amber-200">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-gurukul-navy font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-slate-900 font-bold block mb-0.5">
                    Official Identity Veracity:
                  </strong>
                  Candidate Full Name, Date of Birth, Gender, Father’s Name, Mother’s Name, and Aadhaar Card Number must strictly match the candidate’s official school records and Aadhaar Card.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-gurukul-navy font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-slate-900 font-bold block mb-0.5">
                    Prohibition of Duplicate Registrations &amp; Aadhaar Misuse:
                  </strong>
                  A candidate can submit only ONE application form for the academic session 2026-27. Duplicate registrations are automatically blocked.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-gurukul-navy font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-slate-900 font-bold block mb-0.5">
                    Mandatory Documents:
                  </strong>
                  Candidate Photograph, Candidate Signature, Parent/Guardian Signature, and Aadhaar Card copy must be clear and authentic.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-gurukul-navy font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <strong className="text-slate-900 font-bold block mb-0.5">
                    Official Registration &amp; Fee:
                  </strong>
                  Candidate becomes officially registered ONLY after confirmed payment of the application fee of ₹800. An official Registration ID (NILB for boys, NILG for girls) is generated after successful payment.
                </div>
              </div>
            </div>

            {/* Mandatory Undertaking Checkbox */}
            <div className="p-4 sm:p-5 bg-slate-50 border-2 border-slate-300 rounded-2xl space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ntaCheckbox}
                  onChange={(e) => setNtaCheckbox(e.target.checked)}
                  className="mt-1 w-4 h-4 text-gurukul-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer flex-shrink-0"
                />
                <span className="text-xs text-slate-800 font-bold leading-relaxed">
                  I have carefully read, understood, and accept all the instructions, eligibility criteria, and examination guidelines for the GURUKUL Entrance Examination 2026-27. I solemnly declare that all particulars furnished by me in this application are authentic and true.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: Candidate Details */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-gurukul-600" /> Step 2: Candidate Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Candidate Full Name (As per AADHAAR CARD) *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="As per candidate's Aadhaar Card"
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
                  required
                  max={todayString}
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gender *
                </label>
                <select
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Social Category *
                </label>
                <select
                  name="category"
                  required
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
                  Class Applying For *
                </label>
                <select
                  name="applyingClass"
                  required
                  value={formData.applyingClass}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-bold text-gurukul-navy"
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Stream *
                  </label>
                  <select
                    name="stream"
                    required
                    value={formData.stream || 'Non Medical'}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white font-semibold text-slate-800"
                  >
                    <option value="Non Medical">Non Medical</option>
                    <option value="Medical">Medical</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Arts">Arts</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Previous School Name *
                </label>
                <input
                  type="text"
                  name="previousSchoolName"
                  required
                  value={formData.previousSchoolName}
                  onChange={handleChange}
                  placeholder="Name of last attended school"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Previous Educational Board *
                </label>
                <select
                  name="previousBoard"
                  required
                  value={formData.previousBoard}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Specify Educational Board *
                  </label>
                  <input
                    type="text"
                    name="otherBoard"
                    required
                    value={formData.otherBoard}
                    onChange={handleChange}
                    placeholder="Enter board name"
                    className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Aadhaar Card Number (12 Digits) *
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
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  PEN Number (Permanent Education Number)
                </label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleChange}
                  placeholder="Optional (if allotted by previous school)"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Family ID (Parivar Pehchan Patra)
                </label>
                <input
                  type="text"
                  name="familyId"
                  value={formData.familyId}
                  onChange={handleChange}
                  placeholder="Optional (if applicable)"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Parent/Guardian Details */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-gurukul-600" /> Step 3: Parent &amp; Guardian Particulars
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Father&apos;s Full Name *
                </label>
                <input
                  type="text"
                  name="fatherName"
                  required
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="Father's full name"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Father&apos;s Occupation (Optional)
                </label>
                <input
                  type="text"
                  name="fatherOccupation"
                  value={formData.fatherOccupation}
                  onChange={handleChange}
                  placeholder="e.g. Service, Business, Agriculture"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Father&apos;s Mobile Phone *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">+91</span>
                  <input
                    type="tel"
                    name="fatherPhone"
                    maxLength={10}
                    required
                    value={formData.fatherPhone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    className="w-full pl-11 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mother&apos;s Full Name *
                </label>
                <input
                  type="text"
                  name="motherName"
                  required
                  value={formData.motherName}
                  onChange={handleChange}
                  placeholder="Mother's full name"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mother&apos;s Occupation (Optional)
                </label>
                <input
                  type="text"
                  name="motherOccupation"
                  value={formData.motherOccupation}
                  onChange={handleChange}
                  placeholder="e.g. Homemaker, Teacher, Doctor"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Annual Family Income *
                </label>
                <select
                  name="annualIncome"
                  required
                  value={formData.annualIncome}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Guardian&apos;s Name (If applicable)
                </label>
                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  placeholder="Optional"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Guardian&apos;s Relation
                </label>
                <input
                  type="text"
                  name="guardianRelation"
                  value={formData.guardianRelation}
                  onChange={handleChange}
                  placeholder="e.g. Uncle, Grandparent"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Permanent Address */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gurukul-600" /> Step 4: Permanent &amp; Correspondence Address
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Street / House Address *
                </label>
                <input
                  type="text"
                  name="streetAddress"
                  required
                  value={formData.streetAddress}
                  onChange={handleChange}
                  placeholder="House No., Building Name, Street / Sector"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  City / Town / Village *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  State / UT *
                </label>
                <select
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                >
                  {Object.keys(INDIAN_STATES_AND_DISTRICTS).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  District *
                </label>
                <select
                  name="district"
                  required
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                >
                  {currentDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  PIN Code (6 Digits) *
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
                  className="w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Preferred Study Location */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building className="w-5 h-5 text-gurukul-600" /> Step 5: Preferred Study Location
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  1st Preference Study Location *
                </label>
                {formData.gender === 'Female' ? (
                  <input
                    type="text"
                    disabled
                    value={formData.firstPreference || 'Gurukul Nilokheri'}
                    className="w-full px-3.5 py-2.5 text-sm border rounded-lg bg-slate-100 text-slate-700 font-bold cursor-not-allowed"
                  />
                ) : (
                  <select
                    name="firstPreference"
                    required
                    value={formData.firstPreference}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-bold text-gurukul-navy"
                  >
                    <option value="">Select 1st Preference</option>
                    {STUDY_LOCATIONS_BOYS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  2nd Preference Study Location {formData.gender === 'Female' ? '(Not Applicable)' : '(Optional)'}
                </label>
                {formData.gender === 'Female' ? (
                  <input
                    type="text"
                    disabled
                    value="Not Applicable for Girls"
                    className="w-full px-3.5 py-2.5 text-sm border rounded-lg bg-slate-100 text-slate-400 font-medium cursor-not-allowed"
                  />
                ) : (
                  <select
                    name="secondPreference"
                    value={formData.secondPreference}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium text-slate-800"
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

        {/* STEP 6: Mandatory 4 Documents Upload */}
        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-gurukul-600" /> Step 6: Mandatory Documents (All 4 Required)
            </h2>

            <p className="text-xs text-slate-500">
              Please upload clear documents (JPG, PNG, or PDF, max 2 MB each).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Document 1: Candidate Photograph */}
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl hover:border-amber-400 transition space-y-3 bg-slate-50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">1. Candidate Photograph *</span>
                  {formData.photo && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Uploaded</span>}
                </div>
                {formData.photo ? (
                  <div className="flex items-center gap-3">
                    <img src={formData.photo} alt="Photo" className="w-16 h-20 object-cover rounded-lg border shadow-sm" />
                    <div className="flex-1 text-xs">
                      <span className="font-semibold text-slate-800 block truncate">{formData.photoName}</span>
                      <label className="text-amber-600 hover:underline font-bold cursor-pointer inline-block mt-1">
                        Change Photo
                        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'photo', 'photoName')} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="w-full py-4 border border-slate-300 bg-white hover:bg-amber-50/50 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 transition">
                    <Upload className="w-6 h-6 text-amber-500" />
                    <span className="text-xs font-bold text-slate-700">Upload Photograph</span>
                    <span className="text-[10px] text-slate-400">JPG or PNG (&le; 2 MB)</span>
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'photo', 'photoName')} />
                  </label>
                )}
              </div>

              {/* Document 2: Candidate Signature */}
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl hover:border-amber-400 transition space-y-3 bg-slate-50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">2. Candidate Signature *</span>
                  {formData.signature && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Uploaded</span>}
                </div>
                {formData.signature ? (
                  <div className="flex items-center gap-3">
                    <img src={formData.signature} alt="Signature" className="w-24 h-12 object-contain bg-white rounded-lg border shadow-sm" />
                    <div className="flex-1 text-xs">
                      <span className="font-semibold text-slate-800 block truncate">{formData.signatureName}</span>
                      <label className="text-amber-600 hover:underline font-bold cursor-pointer inline-block mt-1">
                        Change Signature
                        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'signature', 'signatureName')} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="w-full py-4 border border-slate-300 bg-white hover:bg-amber-50/50 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 transition">
                    <Upload className="w-6 h-6 text-amber-500" />
                    <span className="text-xs font-bold text-slate-700">Upload Candidate Signature</span>
                    <span className="text-[10px] text-slate-400">JPG or PNG (&le; 2 MB)</span>
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'signature', 'signatureName')} />
                  </label>
                )}
              </div>

              {/* Document 3: Parent Signature */}
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl hover:border-amber-400 transition space-y-3 bg-slate-50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">3. Parent / Guardian Signature *</span>
                  {formData.parentSignature && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Uploaded</span>}
                </div>
                {formData.parentSignature ? (
                  <div className="flex items-center gap-3">
                    <img src={formData.parentSignature} alt="Parent Signature" className="w-24 h-12 object-contain bg-white rounded-lg border shadow-sm" />
                    <div className="flex-1 text-xs">
                      <span className="font-semibold text-slate-800 block truncate">{formData.parentSignatureName}</span>
                      <label className="text-amber-600 hover:underline font-bold cursor-pointer inline-block mt-1">
                        Change Signature
                        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'parentSignature', 'parentSignatureName')} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="w-full py-4 border border-slate-300 bg-white hover:bg-amber-50/50 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 transition">
                    <Upload className="w-6 h-6 text-amber-500" />
                    <span className="text-xs font-bold text-slate-700">Upload Parent Signature</span>
                    <span className="text-[10px] text-slate-400">JPG or PNG (&le; 2 MB)</span>
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileUpload(e, 'parentSignature', 'parentSignatureName')} />
                  </label>
                )}
              </div>

              {/* Document 4: Aadhaar Card */}
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl hover:border-amber-400 transition space-y-3 bg-slate-50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">4. Aadhaar / ID Proof *</span>
                  {formData.aadhaarCard && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Uploaded</span>}
                </div>
                {formData.aadhaarCard ? (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-14 bg-white border rounded-lg flex items-center justify-center text-slate-600 font-mono text-[10px] font-bold shadow-sm">
                      DOC
                    </div>
                    <div className="flex-1 text-xs">
                      <span className="font-semibold text-slate-800 block truncate">{formData.aadhaarCardName}</span>
                      <label className="text-amber-600 hover:underline font-bold cursor-pointer inline-block mt-1">
                        Change File
                        <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'aadhaarCard', 'aadhaarCardName')} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="w-full py-4 border border-slate-300 bg-white hover:bg-amber-50/50 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 transition">
                    <Upload className="w-6 h-6 text-amber-500" />
                    <span className="text-xs font-bold text-slate-700">Choose Aadhaar File</span>
                    <span className="text-[10px] text-slate-400">PDF, JPG, or PNG (&le; 2 MB)</span>
                    <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'aadhaarCard', 'aadhaarCardName')} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Application Review & Fee Payment */}
        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gurukul-600" /> Step 7: Application Review &amp; Fee Payment
            </h2>

            {/* Summary Review Card */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 block">Candidate Name:</span>
                  <span className="font-bold text-slate-900 text-sm">{formData.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Gender &amp; DOB:</span>
                  <span className="font-bold text-slate-900">{formData.gender} • {formData.dob}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Class Applied:</span>
                  <span className="font-bold text-gurukul-700 bg-amber-100 px-2 py-0.5 rounded inline-block">
                    {formData.applyingClass} {formData.stream ? `(${formData.stream})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Father&apos;s Name:</span>
                  <span className="font-semibold text-slate-800">{formData.fatherName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">1st Preference Study Location:</span>
                  <span className="font-bold text-gurukul-navy">{formData.firstPreference}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Permanent Residence:</span>
                  <span className="font-semibold text-slate-800">{formData.city}, {formData.state}</span>
                </div>
              </div>
            </div>

            {/* Fee Breakdown Card */}
            <div className="border-2 border-amber-300 bg-amber-50/70 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-amber-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Entrance Examination Application Fee
                  </h3>
                  <p className="text-xs text-slate-600">
                    Official registration is completed immediately upon successful payment
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-gurukul-navy">₹800</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-700 pt-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-4 h-4" /> 256-Bit Encrypted Payment Verification
                </div>
                <span className="text-[11px] text-slate-500">Supports UPI, NetBanking, Cards</span>
              </div>
            </div>

            {/* Undertaking Declaration Checkbox */}
            <label className="flex items-start gap-2.5 pt-2 text-xs text-slate-700 cursor-pointer select-none bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-300 transition shadow-sm">
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
                I hereby declare that the particulars provided in this application are authentic and true. I understand that admission is strictly merit-based on entrance examination performance. <span className="text-red-500 font-bold">*</span>
              </span>
            </label>
          </div>
        )}

        {/* Navigation Buttons */}
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
          </div>

          {step < 7 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 bg-gurukul-600 hover:bg-gurukul-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <span>{step === 1 ? 'Accept Declaration & Continue' : 'Save & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || !declarationAgreed}
              onClick={handleSubmitPayment}
              className={`px-8 py-3 rounded-xl shadow-lg transition flex items-center gap-2 font-extrabold text-sm ${!declarationAgreed || loading
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white hover:shadow-xl'
                }`}
            >
              {loading ? (
                <span>Verifying Payment...</span>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹800 &amp; Complete Registration</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl border">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-slate-900">Cancel Application?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel? All temporary information entered will be permanently removed, and you will not be registered.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Continue Application
              </button>
              <button
                type="button"
                onClick={handleCancelApplication}
                disabled={cancelLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
              >
                {cancelLoading ? 'Canceling...' : 'Yes, Discard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive NTA Cropper Modal */}
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
