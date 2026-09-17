'use client';

import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Search, 
  CheckCircle, 
  Plus, 
  Send, 
  Calendar, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { Application, ExamResult } from '@/lib/types';

export default function AdminResultsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [resultsList, setResultsList] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'boys' | 'girls'>('all');

  // Mark Entry Form State
  const [subjects, setSubjects] = useState([
    { subject: 'Mathematics', maxMarks: 50, marksObtained: 45 },
    { subject: 'Science', maxMarks: 50, marksObtained: 42 },
    { subject: 'English & Hindi', maxMarks: 50, marksObtained: 40 },
    { subject: 'Sanskrit & General Studies', maxMarks: 50, marksObtained: 44 },
  ]);
  const [qualifyingStatus, setQualifyingStatus] = useState<ExamResult['qualifyingStatus']>('Qualified for Admission');

  useEffect(() => {
    fetch('/api/applications')
      .then((res) => res.json())
      .then((data) => {
        if (data.applications) {
          const registered = data.applications.filter((a: any) => a.status !== 'draft' && !(a.registrationNumber || '').startsWith('DRAFT-'));
          setApplications(registered);
          if (registered.length > 0) {
            setSelectedAppId(registered[0].id);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch existing demo results
    fetch('/api/results?appId=app-demo-1')
      .then((res) => res.json())
      .then((data) => {
        if (data.result) setResultsList([data.result]);
      })
      .catch(() => {});
  }, []);

  const handleMarkChange = (index: number, val: number) => {
    const updated = [...subjects];
    updated[index].marksObtained = val;
    setSubjects(updated);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;

    setPublishing(true);
    setMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedAppId,
          subjects,
          qualifyingStatus,
          remarks: 'Score verified by Gurukul Examination Controller.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Result published successfully! Candidate scorecard is now live.');
        setResultsList((prev) => [data.result, ...prev.filter((r) => r.id !== data.result.id)]);
      } else {
        setErrorMessage(data.error || 'Failed to publish result.');
      }
    } catch {
      setErrorMessage('Failed to publish result. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const totalObtained = subjects.reduce((sum, s) => sum + Number(s.marksObtained), 0);
  const totalMax = subjects.reduce((sum, s) => sum + Number(s.maxMarks), 0);
  const percentage = ((totalObtained / totalMax) * 100).toFixed(1);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gurukul-navy">
          Entrance Examination Results & Merit Processing
        </h1>
        <p className="text-xs text-slate-500">
          Enter candidate scores, calculate aggregate percentage, and publish official scorecards.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-600 mr-1">Merit Category:</span>
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            selectedCategory === 'all'
              ? 'bg-gurukul-navy text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Candidates ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('boys')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
            selectedCategory === 'boys'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
          }`}
        >
          <span>👦 Boys Wing</span>
          <span className="text-[10px] opacity-80">(Gurukul Nilokheri &amp; Jyotisar)</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('girls')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
            selectedCategory === 'girls'
              ? 'bg-pink-600 text-white shadow-xs'
              : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-50'
          }`}
        >
          <span>👧 Girls Wing</span>
          <span className="text-[10px] opacity-80">(Aryakulam Nilokheri)</span>
        </button>
      </div>

      {/* Grid: Entry Form + Live List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Mark Entry & Publishing Desk */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <Award className="w-4 h-4 text-gurukul-600" /> Enter &amp; Publish Candidate Marks
          </h3>

          <form onSubmit={handlePublish} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Select Candidate / Application
              </label>
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full p-2.5 border rounded-xl outline-none font-semibold text-slate-800"
              >
                {applications
                  .filter((app) => {
                    const isGirl = app.personalInfo?.gender === 'Female' || (app.registrationNumber || '').startsWith('NILG-');
                    if (selectedCategory === 'boys') return !isGirl;
                    if (selectedCategory === 'girls') return isGirl;
                    return true;
                  })
                  .map((app) => {
                    const isGirl = app.personalInfo?.gender === 'Female' || (app.registrationNumber || '').startsWith('NILG-');
                    return (
                      <option key={app.id} value={app.id}>
                        {app.registrationNumber || app.applicationNumber} - {app.personalInfo.fullName} ({app.classApplying}) • {isGirl ? 'Girls' : 'Boys'}
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Subject Marks Table */}
            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="font-bold text-slate-800 block text-xs">Subject-wise Evaluation</span>
              {subjects.map((sub, idx) => (
                <div key={idx} className="flex justify-between items-center gap-2">
                  <span className="text-slate-600 text-[11px] font-medium flex-1 truncate">{sub.subject}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={sub.maxMarks}
                      value={sub.marksObtained}
                      onChange={(e) => handleMarkChange(idx, Number(e.target.value))}
                      className="w-16 p-1.5 border rounded text-center font-bold text-slate-900"
                    />
                    <span className="text-slate-400 font-mono text-[11px]">/ {sub.maxMarks}</span>
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-xs">
                <span>Aggregate Total:</span>
                <span className="text-gurukul-navy font-mono text-sm">
                  {totalObtained} / {totalMax} ({percentage}%)
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Qualifying &amp; Admission Status
              </label>
              <select
                value={qualifyingStatus}
                onChange={(e) => setQualifyingStatus(e.target.value as any)}
                className="w-full p-2.5 border rounded-xl outline-none font-bold"
              >
                <option value="Qualified for Admission">Qualified for Admission (Merit List)</option>
                <option value="Waitlisted">Waitlisted</option>
                <option value="Not Qualified">Not Qualified</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={publishing}
              className="w-full py-3 bg-gurukul-600 hover:bg-gurukul-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              {publishing ? (
                <span>Publishing Scorecard...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publish Official Result &amp; Notify Candidate</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right 7 Cols: Published Merit List Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Published Results &amp; Merit List (2027-28)
            </h3>
            <span className="text-xs font-mono text-slate-400 font-semibold">
              {resultsList.filter((res) => {
                const isGirl = res.applicationNumber?.startsWith('NILG-') || (res as any).gender === 'Female';
                if (selectedCategory === 'boys') return !isGirl;
                if (selectedCategory === 'girls') return isGirl;
                return true;
              }).length} Declared
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b">
                <tr>
                  <th className="py-2.5 px-3">Roll No</th>
                  <th className="py-2.5 px-3">Candidate</th>
                  <th className="py-2.5 px-3">Wing</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3 text-center">Score</th>
                  <th className="py-2.5 px-3 text-center">Rank</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resultsList
                  .filter((res) => {
                    const isGirl = res.applicationNumber?.startsWith('NILG-') || (res as any).gender === 'Female';
                    if (selectedCategory === 'boys') return !isGirl;
                    if (selectedCategory === 'girls') return isGirl;
                    return true;
                  })
                  .map((res) => {
                    const isGirl = res.applicationNumber?.startsWith('NILG-') || (res as any).gender === 'Female';
                    return (
                      <tr key={res.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{res.rollNumber}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{res.candidateName}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isGirl ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                            {isGirl ? 'Girls' : 'Boys'}
                          </span>
                        </td>
                        <td className="py-3 px-3">{res.classApplying}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                          {res.totalMarks}/{res.maxTotalMarks} ({res.percentage}%)
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                            #{res.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              res.qualifyingStatus === 'Qualified for Admission'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {res.qualifyingStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

