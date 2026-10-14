'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Trash2,
  Lock,
  Upload,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
  Loader2,
  FileText,
  User,
  MapPin,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Application, AdmitCard } from '@/lib/types';
import { INDIAN_STATES_AND_DISTRICTS } from '@/lib/indianLocations';

const FATHER_OCCUPATIONS = [
  'Government Service',
  'Business / Self-Employed',
  'Agriculture / Farming',
  'Defense / Armed Forces',
  'Advocate',
  'Professional (Doctor, Engineer, CA)',
  'Teaching / Academic',
  'Others',
];

const MOTHER_OCCUPATIONS = [
  'Homemaker',
  'Government Service',
  'Teaching / Academic',
  'Business / Self-Employed',
  'Advocate',
  'Professional (Doctor, Engineer, CA)',
  'Agriculture / Farming',
  'Others',
];

const BOARD_OPTIONS = ['CBSE', 'ICSE', 'Haryana Board (HBSE)', 'UP Board', 'Punjab Board (PSEB)', 'Other Board'];

const CLASS_OPTIONS = ['Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 11'];
const STREAM_OPTIONS = ['Non Medical', 'Medical', 'Commerce', 'Humanities'];

const CAMPUS_OPTIONS = [
  'The Gurukul Nilokheri',
  'The Gurukul Jyotisar',
  'Aryakulam Nilokheri',
];

export default function AdminEditApplicationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [admitCard, setAdmitCard] = useState<AdmitCard | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Personal Details (Locked immutable keys: email, aadhaar, regNo, rollNo)
    fullName: '',
    dob: '',
    gender: 'Male' as 'Male' | 'Female',
    category: 'General',
    panNumber: '',
    apaarId: '',
    familyId: '',
    previousSchoolName: '',
    previousBoard: 'CBSE',
    otherBoard: '',
    candidateMobile: '',
    whatsappNumber: '',

    // Parent Details
    fatherName: '',
    fatherOccupation: '',
    fatherPhone: '',
    motherName: '',
    motherOccupation: '',
    motherPhone: '',
    annualIncome: '',
    guardianName: '',
    guardianRelation: '',

    // Address Details
    streetAddress: '',
    state: '',
    district: '',
    city: '',
    pincode: '',

    // Academic & Campus Preferences
    classApplying: 'Class 6',
    stream: '',
    firstPreference: 'Aryakulam Nilokheri',
    secondPreference: 'The Gurukul Jyotisar',

    // Documents (Base64 or existing data URLs)
    photo: '',
    signature: '',
    aadhaarCard: '',
  });

  useEffect(() => {
    fetch(`/api/applications/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.application) {
          const app: Application = data.application;
          setApplication(app);

          const rawClass = app.classApplying || 'Class 6';
          const formattedClass = rawClass.startsWith('Class') ? rawClass : `Class ${rawClass}`;

          setFormData({
            fullName: app.personalInfo?.fullName || '',
            dob: app.personalInfo?.dob || '',
            gender: app.personalInfo?.gender || 'Male',
            category: app.personalInfo?.category || 'General',
            panNumber: app.personalInfo?.panNumber || '',
            apaarId: app.personalInfo?.apaarId || '',
            familyId: app.personalInfo?.familyId || '',
            previousSchoolName: app.personalInfo?.previousSchoolName || app.academicInfo?.previousSchoolName || '',
            previousBoard: app.personalInfo?.previousBoard || app.academicInfo?.previousBoard || 'CBSE',
            otherBoard: app.personalInfo?.otherBoard || app.academicInfo?.otherBoard || '',
            candidateMobile: app.personalInfo?.candidateMobile || app.parentInfo?.fatherPhone || '',
            whatsappNumber: app.personalInfo?.whatsappNumber || app.addressInfo?.whatsappNumber || '',

            fatherName: app.parentInfo?.fatherName || '',
            fatherOccupation: app.parentInfo?.fatherOccupation || '',
            fatherPhone: app.parentInfo?.fatherPhone || '',
            motherName: app.parentInfo?.motherName || '',
            motherOccupation: app.parentInfo?.motherOccupation || '',
            motherPhone: app.parentInfo?.motherPhone || '',
            annualIncome: app.parentInfo?.annualIncome || '',
            guardianName: app.parentInfo?.guardianName || '',
            guardianRelation: app.parentInfo?.guardianRelation || '',

            streetAddress: app.addressInfo?.streetAddress || '',
            state: app.addressInfo?.state || '',
            district: app.addressInfo?.district || '',
            city: app.addressInfo?.city || '',
            pincode: app.addressInfo?.pincode || '',

            classApplying: formattedClass,
            stream: app.stream || app.academicInfo?.stream || (formattedClass.includes('11') ? 'Non Medical' : ''),
            firstPreference: app.studyLocationPref?.firstPreference || app.examCentrePref?.firstPreference || 'Aryakulam Nilokheri',
            secondPreference: app.studyLocationPref?.secondPreference || app.examCentrePref?.secondPreference || 'The Gurukul Jyotisar',

            photo: app.documents?.photo || '',
            signature: app.documents?.signature || '',
            aadhaarCard: app.documents?.aadhaarCard || '',
          });

          // Fetch admit card
          fetch(`/api/admit-card?appId=${app.id}`)
            .then((r) => r.json())
            .then((admitData) => {
              if (admitData.admitCard) setAdmitCard(admitData.admitCard);
            })
            .catch(() => {});
        } else {
          setErrorMsg(data.error || 'Application record not found.');
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg('Failed to load candidate application.');
        setLoading(false);
      });
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'state') {
      setFormData((prev) => ({
        ...prev,
        state: value,
        district: '', // Reset district when state changes
      }));
    } else if (name === 'classApplying') {
      const is11 = value.includes('11');
      setFormData((prev) => ({
        ...prev,
        classApplying: value,
        stream: is11 ? (prev.stream || 'Non Medical') : '',
      }));
    } else if (['fatherPhone', 'motherPhone', 'candidateMobile', 'whatsappNumber'].includes(name)) {
      const clean = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: clean }));
    } else if (name === 'pincode') {
      const clean = value.replace(/\D/g, '').slice(0, 6);
      setFormData((prev) => ({ ...prev, [name]: clean }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'photo' | 'signature' | 'aadhaarCard') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg(`File size must be 2 MB or less. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        [fieldName]: base64Str,
      }));
      setSuccessMsg(`File selected for ${fieldName === 'photo' ? 'Photograph' : fieldName === 'signature' ? 'Signature' : 'Aadhaar Card'}. Click Save to commit.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        classApplying: formData.classApplying,
        stream: formData.classApplying.includes('11') ? formData.stream : undefined,
        personalInfo: {
          fullName: formData.fullName,
          dob: formData.dob,
          gender: formData.gender,
          category: formData.category,
          panNumber: formData.panNumber || undefined,
          apaarId: formData.apaarId || undefined,
          familyId: formData.familyId || undefined,
          previousSchoolName: formData.previousSchoolName || undefined,
          previousBoard: formData.previousBoard || undefined,
          otherBoard: formData.otherBoard || undefined,
          candidateMobile: formData.candidateMobile || formData.fatherPhone,
          whatsappNumber: formData.whatsappNumber || formData.candidateMobile,
        },
        parentInfo: {
          fatherName: formData.fatherName,
          fatherOccupation: formData.fatherOccupation,
          fatherPhone: formData.fatherPhone,
          motherName: formData.motherName,
          motherOccupation: formData.motherOccupation,
          motherPhone: formData.motherPhone || undefined,
          annualIncome: formData.annualIncome || undefined,
          guardianName: formData.guardianName || undefined,
          guardianRelation: formData.guardianRelation || undefined,
        },
        addressInfo: {
          streetAddress: formData.streetAddress,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode,
          whatsappNumber: formData.whatsappNumber || formData.candidateMobile,
        },
        academicInfo: {
          applyingClass: formData.classApplying,
          stream: formData.classApplying.includes('11') ? formData.stream : undefined,
          previousSchoolName: formData.previousSchoolName,
          previousBoard: formData.previousBoard,
          otherBoard: formData.otherBoard,
        },
        studyLocationPref: {
          firstPreference: formData.firstPreference,
          secondPreference: formData.secondPreference,
        },
        documents: {
          photo: formData.photo || undefined,
          signature: formData.signature || undefined,
          aadhaarCard: formData.aadhaarCard || undefined,
        },
      };

      const res = await fetch(`/api/applications/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.application) {
        setApplication(data.application);
        setSuccessMsg('Information edited successfully.');
        setSavedJustNow(true);
        setTimeout(() => {
          setSavedJustNow(false);
        }, 3500);
        setTimeout(() => {
          setSuccessMsg('');
        }, 6000);
      } else {
        setErrorMsg(data.error || 'Failed to save candidate modifications.');
      }
    } catch {
      setErrorMsg('Network error occurred while saving candidate details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!application) return;
    setDeleteLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/applications');
      } else {
        setErrorMsg(data.error || 'Failed to delete application.');
        setShowDeleteModal(false);
      }
    } catch {
      setErrorMsg('Network error occurred while deleting application.');
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const matchedStateKey = formData.state
    ? Object.keys(INDIAN_STATES_AND_DISTRICTS).find(
        (k) => k.toLowerCase() === formData.state.trim().toLowerCase()
      ) || formData.state
    : '';

  const currentDistricts = matchedStateKey && INDIAN_STATES_AND_DISTRICTS[matchedStateKey]
    ? INDIAN_STATES_AND_DISTRICTS[matchedStateKey]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-portal-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading Candidate Editor...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-xs font-bold text-rose-600">{errorMsg || 'Application record not found.'}</p>
        <Link href="/admin/applications" className="btn-primary text-xs px-4 py-2 inline-block">
          Return to Applications
        </Link>
      </div>
    );
  }

  const rollNumber = application.rollNumber || admitCard?.rollNumber || 'PENDING';
  const regNumber = application.registrationNumber || application.applicationNumber;
  const lockedEmail = application.personalInfo?.candidateEmail || application.personalInfo?.email || '—';
  const lockedAadhaar = application.personalInfo?.aadhaarNumber || '—';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Header Bar */}
      <div className="portal-card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/applications/${application.id}`}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition border border-slate-200"
            title="Cancel & Back to dossier"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-portal-navy bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {regNumber}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                Admin Edit Mode
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              Edit Candidate: {application.personalInfo?.fullName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={saving || deleteLoading}
            className="btn-danger text-xs px-3.5 py-2 font-semibold flex items-center gap-1.5"
            title="Delete this candidate permanently from database"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Candidate</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-medium flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <Link
            href={`/admin/applications/${application.id}`}
            className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline decoration-emerald-500 underline-offset-2 shrink-0"
          >
            View Updated Dossier →
          </Link>
        </div>
      )}

      {/* Immutable / Unique Identifier Locked Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Unique Audit Identifiers (Immutable &amp; Locked)</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Registration Number, Roll Number, Aadhaar Number, and Candidate Email are unique primary academic keys. They are locked to preserve audit integrity and prevent authentication collisions.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Registration ID</span>
            <span className="font-mono font-bold text-slate-900 text-sm flex items-center justify-between">
              {regNumber}
              <Lock className="w-3 h-3 text-slate-400" />
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Roll Number</span>
            <span className="font-mono font-bold text-slate-900 text-sm flex items-center justify-between">
              {rollNumber}
              <Lock className="w-3 h-3 text-slate-400" />
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Aadhaar Number</span>
            <span className="font-mono font-bold text-slate-900 text-sm flex items-center justify-between">
              {lockedAadhaar}
              <Lock className="w-3 h-3 text-slate-400" />
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Candidate Email</span>
            <span className="font-semibold text-slate-900 text-xs truncate block flex items-center justify-between">
              <span className="truncate">{lockedEmail}</span>
              <Lock className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Candidate Personal Details */}
        <div className="portal-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <User className="w-4 h-4 text-portal-navy" />
            <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              1. Candidate Personal Particulars
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="form-label">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="form-input-field font-semibold"
              />
            </div>

            <div>
              <label className="form-label">
                Date of Birth (YYYY-MM-DD) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="dob"
                required
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
                className="form-input-field font-semibold"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="form-label">
                Category <span className="text-rose-500">*</span>
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
                Primary Mobile Number (10 Digits) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                name="candidateMobile"
                required
                value={formData.candidateMobile}
                onChange={handleChange}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">WhatsApp Contact Number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">PAN / PEN Number</label>
              <input
                type="text"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleChange}
                placeholder="Optional"
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">APAAR ID</label>
              <input
                type="text"
                name="apaarId"
                value={formData.apaarId}
                onChange={handleChange}
                placeholder="Optional"
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">Family ID / PPP</label>
              <input
                type="text"
                name="familyId"
                value={formData.familyId}
                onChange={handleChange}
                placeholder="Optional"
                className="form-input-field font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Parent / Guardian Information */}
        <div className="portal-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Users className="w-4 h-4 text-portal-navy" />
            <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              2. Parent &amp; Guardian Office Record
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="form-label">
                Father&apos;s Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="fatherName"
                required
                value={formData.fatherName}
                onChange={handleChange}
                className="form-input-field font-semibold"
              />
            </div>

            <div>
              <label className="form-label">Father&apos;s Occupation</label>
              <select
                name="fatherOccupation"
                value={formData.fatherOccupation}
                onChange={handleChange}
                className="form-input-field"
              >
                <option value="">Select Occupation</option>
                {FATHER_OCCUPATIONS.map((occ) => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Father&apos;s Mobile (10 Digits) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                name="fatherPhone"
                required
                value={formData.fatherPhone}
                onChange={handleChange}
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">
                Mother&apos;s Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="motherName"
                required
                value={formData.motherName}
                onChange={handleChange}
                className="form-input-field font-semibold"
              />
            </div>

            <div>
              <label className="form-label">Mother&apos;s Occupation</label>
              <select
                name="motherOccupation"
                value={formData.motherOccupation}
                onChange={handleChange}
                className="form-input-field"
              >
                <option value="">Select Occupation</option>
                {MOTHER_OCCUPATIONS.map((occ) => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Mother&apos;s Mobile (Optional, 10 Digits)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                name="motherPhone"
                value={formData.motherPhone}
                onChange={handleChange}
                placeholder="Optional"
                className="form-input-field font-mono"
              />
            </div>

            <div>
              <label className="form-label">Annual Family Income</label>
              <input
                type="text"
                name="annualIncome"
                value={formData.annualIncome}
                onChange={handleChange}
                placeholder="e.g. ₹5,00,000"
                className="form-input-field"
              />
            </div>

            <div>
              <label className="form-label">Guardian Name (If applicable)</label>
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
              <label className="form-label">Guardian Relation</label>
              <input
                type="text"
                name="guardianRelation"
                value={formData.guardianRelation}
                onChange={handleChange}
                placeholder="e.g. Uncle"
                className="form-input-field"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Permanent Residential Address */}
        <div className="portal-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <MapPin className="w-4 h-4 text-portal-navy" />
            <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              3. Permanent &amp; Residential Address
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
                placeholder="House No., Building, Street / Sector"
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
                className="form-input-field font-semibold"
              >
                <option value="">Select State / UT</option>
                {formData.state && !Object.keys(INDIAN_STATES_AND_DISTRICTS).includes(formData.state) && (
                  <option value={formData.state}>{formData.state}</option>
                )}
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
                disabled={!formData.state}
                className={`form-input-field font-semibold ${!formData.state ? 'bg-slate-100 cursor-not-allowed' : ''}`}
              >
                <option value="">{formData.state ? 'Select District' : 'Select State / UT first'}</option>
                {formData.district && !currentDistricts.includes(formData.district) && (
                  <option value={formData.district}>{formData.district}</option>
                )}
                {currentDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
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
                placeholder="City, town, or village"
                className="form-input-field"
              />
            </div>

            <div>
              <label className="form-label">
                PIN Code (6 Digits) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                name="pincode"
                required
                value={formData.pincode}
                onChange={handleChange}
                placeholder="6-digit PIN code"
                className="form-input-field font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Academic History & Campus Allotment */}
        <div className="portal-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <GraduationCap className="w-4 h-4 text-portal-navy" />
            <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              4. Academic History &amp; Study Campus Allotment
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="form-label">
                Class Applying For <span className="text-rose-500">*</span>
              </label>
              <select
                name="classApplying"
                required
                value={formData.classApplying}
                onChange={handleChange}
                className="form-input-field font-semibold"
              >
                {CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {formData.classApplying.includes('11') && (
              <div>
                <label className="form-label">
                  Class 11 Academic Stream <span className="text-rose-500">*</span>
                </label>
                <select
                  name="stream"
                  required
                  value={formData.stream}
                  onChange={handleChange}
                  className="form-input-field font-semibold"
                >
                  {STREAM_OPTIONS.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="form-label">Previous School Name</label>
              <input
                type="text"
                name="previousSchoolName"
                value={formData.previousSchoolName}
                onChange={handleChange}
                placeholder="School last attended"
                className="form-input-field uppercase"
              />
            </div>

            <div>
              <label className="form-label">Previous Board</label>
              <select
                name="previousBoard"
                value={formData.previousBoard}
                onChange={handleChange}
                className="form-input-field"
              >
                {BOARD_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                1st Study Campus Preference <span className="text-rose-500">*</span>
              </label>
              <select
                name="firstPreference"
                required
                value={formData.firstPreference}
                onChange={handleChange}
                className="form-input-field font-semibold"
              >
                {CAMPUS_OPTIONS.map((camp) => (
                  <option key={camp} value={camp}>{camp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">2nd Study Campus Preference</label>
              <select
                name="secondPreference"
                value={formData.secondPreference}
                onChange={handleChange}
                className="form-input-field font-semibold"
              >
                <option value="">None / Single Preference</option>
                {CAMPUS_OPTIONS.filter((c) => c !== formData.firstPreference).map((camp) => (
                  <option key={camp} value={camp}>{camp}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 5: Candidate Uploaded Documents */}
        <div className="portal-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <FileText className="w-4 h-4 text-portal-navy" />
            <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              5. Candidate Documents &amp; Identity Artifacts (Image / PDF)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
            {/* Photo Card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-900 block text-xs">Candidate Photograph</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Passport size image (JPG, PNG)</span>
                <div className="mt-3 w-28 h-32 border border-slate-300 bg-white rounded-lg overflow-hidden mx-auto flex items-center justify-center shadow-xs">
                  {formData.photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={formData.photo} alt="Candidate Photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-400">No Photo</span>
                  )}
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <label className="btn-secondary text-[11px] py-1.5 px-3 w-full flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Replace Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'photo')}
                  />
                </label>
                {formData.photo && (
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({ title: 'Candidate Photograph', url: formData.photo })}
                    className="text-[11px] text-slate-600 hover:text-portal-navy font-semibold flex items-center justify-center gap-1 w-full"
                  >
                    <Eye className="w-3 h-3" /> View Full
                  </button>
                )}
              </div>
            </div>

            {/* Signature Card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-900 block text-xs">Candidate Signature</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Signature scan (JPG, PNG)</span>
                <div className="mt-3 w-36 h-20 border border-slate-300 bg-white rounded-lg overflow-hidden mx-auto flex items-center justify-center shadow-xs">
                  {formData.signature ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={formData.signature} alt="Candidate Signature" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-[10px] text-slate-400">No Signature</span>
                  )}
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <label className="btn-secondary text-[11px] py-1.5 px-3 w-full flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Replace Signature</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'signature')}
                  />
                </label>
                {formData.signature && (
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({ title: 'Candidate Signature', url: formData.signature })}
                    className="text-[11px] text-slate-600 hover:text-portal-navy font-semibold flex items-center justify-center gap-1 w-full"
                  >
                    <Eye className="w-3 h-3" /> View Full
                  </button>
                )}
              </div>
            </div>

            {/* Aadhaar Card Proof */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-900 block text-xs">Aadhaar Card Document</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Identity certificate (Image or PDF)</span>
                <div className="mt-3 w-36 h-24 border border-slate-300 bg-white rounded-lg overflow-hidden mx-auto flex items-center justify-center shadow-xs">
                  {formData.aadhaarCard ? (
                    formData.aadhaarCard.startsWith('data:application/pdf') ? (
                      <div className="text-center p-2">
                        <FileText className="w-8 h-8 text-rose-600 mx-auto" />
                        <span className="text-[10px] font-bold text-slate-700 block mt-1">PDF File</span>
                      </div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={formData.aadhaarCard} alt="Aadhaar Document" className="w-full h-full object-contain p-1" />
                    )
                  ) : (
                    <span className="text-[10px] text-slate-400">No Aadhaar File</span>
                  )}
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <label className="btn-secondary text-[11px] py-1.5 px-3 w-full flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Replace Aadhaar (PDF/Img)</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'aadhaarCard')}
                  />
                </label>
                {formData.aadhaarCard && (
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({ title: 'Aadhaar Card Document', url: formData.aadhaarCard })}
                    className="text-[11px] text-slate-600 hover:text-portal-navy font-semibold flex items-center justify-center gap-1 w-full"
                  >
                    <Eye className="w-3 h-3" /> View Full
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="sticky bottom-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-4 shadow-lg flex items-center justify-between gap-4 z-20">
          <Link
            href={`/admin/applications/${application.id}`}
            className="btn-secondary text-xs px-4 py-2 font-semibold flex items-center gap-1.5 text-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dossier</span>
          </Link>

          <div className="flex items-center gap-3">
            {savedJustNow && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Information edited</span>
              </span>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`text-xs px-6 py-2.5 font-bold flex items-center gap-2 rounded-lg transition-all shadow-sm ${
                savedJustNow
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'btn-primary'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving modifications...</span>
                </>
              ) : savedJustNow ? (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>Information edited</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Application Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                Delete Candidate Application?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Permanently delete application <strong>{regNumber}</strong> for candidate <strong>{application.personalInfo?.fullName}</strong>?
                This action cannot be reversed and will erase the candidate&apos;s records and admit card from the database.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="btn-secondary flex-1 text-xs py-2 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="btn-danger flex-1 text-xs py-2 font-semibold flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Record</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Full View Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-xs text-slate-800">{previewDoc.title}</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 hover:bg-slate-200 rounded-md text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100 min-h-[300px]">
              {previewDoc.url.startsWith('data:application/pdf') ? (
                <iframe src={previewDoc.url} className="w-full h-[70vh] border-0" title={previewDoc.title} />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewDoc.url} alt={previewDoc.title} className="max-h-[75vh] max-w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
