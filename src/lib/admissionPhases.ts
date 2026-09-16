export interface AdmissionPhaseInfo {
  phaseId: 'REGISTRATION_UPCOMING' | 'REGISTRATION_ACTIVE' | 'REGISTRATION_EXTENDED' | 'REGISTRATION_CLOSED' | 'ADMIT_CARD_RELEASED' | 'EXAMINATION_PERIOD' | 'RESULTS_DECLARED' | 'COUNSELING_ACTIVE';
  portalOpen: boolean;
  banner: {
    badge: string;
    badgeStyle: string;
    message: string;
    link?: {
      href: string;
      label: string;
    };
    containerStyle: string;
  };
  stages: Array<{
    stageNumber: string;
    event: string;
    date: string;
    status: 'Upcoming' | 'Active' | 'Ongoing' | 'Extended' | 'Closed' | 'Conducted' | 'Declared';
    badgeClass: string;
  }>;
  registrationCard: {
    isOpen: boolean;
    badge: string;
    title: string;
    description: string;
    actionText: string;
    actionHref: string;
    isPrimary: boolean;
  };
}

export interface PhaseDatesInput {
  currentDate?: Date;
  registrationStartDate?: string;
  registrationEndDate?: string;
  admitCardReleaseDate?: string;
  entranceExamDate?: string;
  resultDeclarationDate?: string;
  counselingStartDate?: string;
  academicSession?: string;
  admitCardsReleased?: boolean;
  resultsDeclared?: boolean;
  statusOverride?: 'auto' | 'open' | 'closed' | 'extended';
  customNotice?: string;
}

export function formatDateString(dateStr?: string, fallback: string = ''): string {
  if (!dateStr) return fallback;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    return dateStr || fallback;
  } catch {
    return dateStr || fallback;
  }
}

function parseDateToTime(dateStr?: string): number | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

/**
 * Calculates current admission lifecycle phase and returns dynamic banners,
 * stage badges, and card states.
 */
export function resolveAdmissionPhase(input: PhaseDatesInput): AdmissionPhaseInfo {
  const now = input.currentDate ? input.currentDate.getTime() : Date.now();
  const session = input.academicSession || '2026-27';

  // Format milestone dates for user display
  const regStartFormatted = formatDateString(input.registrationStartDate, '01 September 2026');
  const regEndFormatted = formatDateString(input.registrationEndDate, '30 September 2026');
  const admitDateFormatted = formatDateString(input.admitCardReleaseDate, '20 November 2026');
  const examDateFormatted = formatDateString(input.entranceExamDate, '10 December 2026');
  const resultDateFormatted = formatDateString(input.resultDeclarationDate, '25 December 2026');
  const counselingDateFormatted = formatDateString(input.counselingStartDate, '10 January 2027');

  const regStartTime = parseDateToTime(input.registrationStartDate) ?? new Date('2026-09-01T00:00:00Z').getTime();
  // Ensure registration end date is evaluated through 23:59:59 IST
  let regEndTime = parseDateToTime(input.registrationEndDate) ?? new Date('2026-09-30T23:59:59+05:30').getTime();
  if (input.registrationEndDate) {
    if (input.registrationEndDate.length === 10) {
      const d = new Date(input.registrationEndDate + 'T23:59:59+05:30');
      if (!isNaN(d.getTime())) regEndTime = d.getTime();
    } else if (input.registrationEndDate.includes('T00:00:00')) {
      const datePart = input.registrationEndDate.split('T')[0];
      const d = new Date(datePart + 'T23:59:59+05:30');
      if (!isNaN(d.getTime())) regEndTime = d.getTime();
    }
  }

  const admitDateTime = parseDateToTime(input.admitCardReleaseDate) ?? new Date('2026-11-20T00:00:00Z').getTime();
  const examDateTime = parseDateToTime(input.entranceExamDate) ?? new Date('2026-12-10T00:00:00Z').getTime();
  const resultDateTime = parseDateToTime(input.resultDeclarationDate) ?? new Date('2026-12-25T00:00:00Z').getTime();
  const counselingDateTime = parseDateToTime(input.counselingStartDate) ?? new Date('2027-01-10T00:00:00Z').getTime();

  // Flags
  const isAdmitCardReleased = Boolean(input.admitCardsReleased) || (now >= admitDateTime && now < examDateTime);
  const isResultsDeclared = Boolean(input.resultsDeclared) || (now >= resultDateTime);
  const isCounselingTime = isResultsDeclared && (now >= counselingDateTime);
  const isExamConducted = now >= examDateTime && !isResultsDeclared;
  const isOverrideExtended = input.statusOverride === 'extended';
  const isOverrideClosed = input.statusOverride === 'closed';
  const isDateSurpassed = now > regEndTime;

  // Determine portalOpen status
  let isPortalOpen = false;
  if (isOverrideClosed) {
    isPortalOpen = false;
  } else if (isOverrideExtended) {
    isPortalOpen = true;
  } else if (input.statusOverride === 'open') {
    isPortalOpen = !isDateSurpassed; // Even if open, if date is surpassed, it auto closes unless extended
  } else {
    // 'auto' mode
    isPortalOpen = now >= regStartTime && now <= regEndTime;
  }

  // Determine Lifecycle Phase
  let phaseId: AdmissionPhaseInfo['phaseId'] = 'REGISTRATION_ACTIVE';

  if (isCounselingTime) {
    phaseId = 'COUNSELING_ACTIVE';
  } else if (isResultsDeclared) {
    phaseId = 'RESULTS_DECLARED';
  } else if (isExamConducted) {
    phaseId = 'EXAMINATION_PERIOD';
  } else if (isAdmitCardReleased) {
    phaseId = 'ADMIT_CARD_RELEASED';
  } else if (isDateSurpassed || !isPortalOpen) {
    phaseId = 'REGISTRATION_CLOSED';
  } else if (isOverrideExtended) {
    phaseId = 'REGISTRATION_EXTENDED';
  } else if (now < regStartTime) {
    phaseId = 'REGISTRATION_UPCOMING';
  } else {
    phaseId = 'REGISTRATION_ACTIVE';
  }

  // Generate Banner State
  let banner: AdmissionPhaseInfo['banner'];

  switch (phaseId) {
    case 'COUNSELING_ACTIVE':
      banner = {
        badge: `COUNSELING ${session}`,
        badgeStyle: 'bg-purple-600 text-white font-black',
        message: `Admission Counseling & Document Verification for Session ${session} is currently underway. Qualified candidates must report per allotment letter.`,
        containerStyle: 'bg-purple-50 border-purple-200 text-purple-950',
        link: {
          href: '/result',
          label: 'View Counseling Details →',
        },
      };
      break;

    case 'RESULTS_DECLARED':
      banner = {
        badge: 'RESULTS DECLARED',
        badgeStyle: 'bg-emerald-600 text-white font-black animate-pulse',
        message: `Entrance Examination Session ${session} Merit List & Scorecards are now officially declared! Check your results online:`,
        containerStyle: 'bg-emerald-50 border-emerald-300 text-emerald-950',
        link: {
          href: '/result',
          label: 'View Scorecard & Merit Ranking →',
        },
      };
      break;

    case 'EXAMINATION_PERIOD':
      banner = {
        badge: `EXAMINATION ${session}`,
        badgeStyle: 'bg-blue-600 text-white font-black',
        message: `Written Entrance Examination for Session ${session} was conducted on ${examDateFormatted}. Answer evaluation in progress. Result declaration scheduled for ${resultDateFormatted}.`,
        containerStyle: 'bg-blue-50 border-blue-200 text-blue-950',
      };
      break;

    case 'ADMIT_CARD_RELEASED':
      banner = {
        badge: 'ADMIT CARD RELEASED',
        badgeStyle: 'bg-emerald-600 text-white font-black animate-pulse',
        message: `Entrance Examination Session ${session} Admit Cards are now officially released! Click here to download your Hall Ticket:`,
        containerStyle: 'bg-emerald-50/90 border-emerald-300 text-emerald-950',
        link: {
          href: '/admit-card',
          label: 'Download Hall Ticket →',
        },
      };
      break;

    case 'REGISTRATION_CLOSED':
      banner = {
        badge: 'REGISTRATIONS CLOSED',
        badgeStyle: 'bg-rose-600 text-white font-black',
        message: `Online Application for Session ${session} closed on ${regEndFormatted}. Scrutiny of applications & roll number allotment in progress. Hall Tickets (Admit Cards) will be available on ${admitDateFormatted}.`,
        containerStyle: 'bg-rose-50/70 border-rose-200 text-rose-950',
        link: {
          href: '/status',
          label: 'Track Application Status →',
        },
      };
      break;

    case 'REGISTRATION_EXTENDED':
      banner = {
        badge: 'APPLICATION EXTENDED',
        badgeStyle: 'bg-amber-500 text-gurukul-navy font-black',
        message: `Notice: Online Application for Entrance Examination Session ${session} has been extended up to ${regEndFormatted}. Submit online application before the final deadline.`,
        containerStyle: 'bg-amber-50 border-amber-300 text-amber-950',
      };
      break;

    case 'REGISTRATION_UPCOMING':
      banner = {
        badge: `UPCOMING ADMISSION ${session}`,
        badgeStyle: 'bg-blue-600 text-white font-black',
        message: `Online Registration for Entrance Examination Session ${session} will commence on ${regStartFormatted}.`,
        containerStyle: 'bg-blue-50 border-blue-200 text-blue-900',
      };
      break;

    case 'REGISTRATION_ACTIVE':
    default:
      banner = {
        badge: `ADMISSION ${session}`,
        badgeStyle: 'bg-amber-500 text-gurukul-navy font-black',
        message: `Online Application for Entrance Examination Session ${session} is currently OPEN. Last date to register online: ${regEndFormatted}.`,
        containerStyle: 'bg-amber-500/10 border-amber-500/20 text-slate-800',
      };
      break;
  }

  // Generate Stage Cards with dynamic status
  const stage1Status: 'Upcoming' | 'Active' | 'Closed' = now < regStartTime ? 'Upcoming' : isDateSurpassed ? 'Closed' : 'Active';
  const stage1Badge = stage1Status === 'Active' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-700';

  let stage2Status: 'Upcoming' | 'Ongoing' | 'Extended' | 'Closed' = 'Ongoing';
  let stage2Badge = 'bg-blue-100 text-blue-800';

  if (now < regStartTime) {
    stage2Status = 'Upcoming';
    stage2Badge = 'bg-slate-200 text-slate-700';
  } else if (isDateSurpassed) {
    stage2Status = 'Closed';
    stage2Badge = 'bg-rose-100 text-rose-800 border border-rose-300';
  } else if (isOverrideExtended) {
    stage2Status = 'Extended';
    stage2Badge = 'bg-amber-100 text-amber-900 font-bold border border-amber-300';
  } else {
    stage2Status = 'Ongoing';
    stage2Badge = 'bg-blue-100 text-blue-800';
  }

  const stage3Status: 'Upcoming' | 'Active' | 'Closed' = isAdmitCardReleased ? 'Active' : now > examDateTime ? 'Closed' : 'Upcoming';
  const stage3Badge = isAdmitCardReleased ? 'bg-emerald-100 text-emerald-800 font-bold animate-pulse' : 'bg-slate-200 text-slate-700';

  const stage4Status: 'Upcoming' | 'Active' | 'Conducted' = isResultsDeclared ? 'Conducted' : now >= examDateTime ? 'Active' : 'Upcoming';
  const stage4Badge = stage4Status === 'Active' ? 'bg-amber-100 text-amber-900' : stage4Status === 'Conducted' ? 'bg-slate-200 text-slate-700' : 'bg-slate-200 text-slate-700';

  const stage5Status: 'Upcoming' | 'Declared' = isResultsDeclared ? 'Declared' : 'Upcoming';
  const stage5Badge = isResultsDeclared ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-200 text-slate-700';

  const stages: AdmissionPhaseInfo['stages'] = [
    {
      stageNumber: '01',
      event: 'Online Registration Commences',
      date: regStartFormatted,
      status: stage1Status,
      badgeClass: stage1Badge,
    },
    {
      stageNumber: '02',
      event: 'Last Date for Online Application',
      date: regEndFormatted,
      status: stage2Status,
      badgeClass: stage2Badge,
    },
    {
      stageNumber: '03',
      event: 'Release of Hall Ticket / Admit Card',
      date: admitDateFormatted,
      status: stage3Status,
      badgeClass: stage3Badge,
    },
    {
      stageNumber: '04',
      event: 'Written Entrance Examination',
      date: examDateFormatted,
      status: stage4Status,
      badgeClass: stage4Badge,
    },
    {
      stageNumber: '05',
      event: 'Declaration of Merit List / Result',
      date: resultDateFormatted,
      status: stage5Status,
      badgeClass: stage5Badge,
    },
  ];

  // Generate Registration Card State for Homepage
  let registrationCard: AdmissionPhaseInfo['registrationCard'];
  if (isPortalOpen) {
    registrationCard = {
      isOpen: true,
      badge: isOverrideExtended ? 'Reopened / Extended' : 'Step 1: Apply Online',
      title: 'New Candidate Registration',
      description: `New candidates applying for admission for Session ${session} must register here first to generate their Registration Number.`,
      actionText: `Register Online (Session ${session})`,
      actionHref: '/register',
      isPrimary: true,
    };
  } else if (now < regStartTime) {
    registrationCard = {
      isOpen: false,
      badge: 'Opening Soon',
      title: 'Registrations Commencing Soon',
      description: `Online registrations for Entrance Examination Session ${session} will officially open on ${regStartFormatted}.`,
      actionText: 'Track Status / Existing Candidates',
      actionHref: '/status',
      isPrimary: false,
    };
  } else {
    // Registration closed
    registrationCard = {
      isOpen: false,
      badge: 'Registrations Closed',
      title: 'Online Applications Concluded',
      description: `The deadline for online registration for Session ${session} ended on ${regEndFormatted}. Registered applicants can track status, download admission forms, and prepare for entrance examination.`,
      actionText: 'Track Application Status',
      actionHref: '/status',
      isPrimary: false,
    };
  }

  return {
    phaseId,
    portalOpen: isPortalOpen,
    banner,
    stages,
    registrationCard,
  };
}
