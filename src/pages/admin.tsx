import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  AlertCircle,
  Lock,
  LogOut,
  Copy,
  FileDown,
  FileText,
  Users,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  CheckCircle2,
  PartyPopper,
  File,
  CreditCard,
  Archive,
  Plus,
  X,
  FolderOpen,
  Trash2,
  CalendarDays
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import '../winners.css';

// ─── Types ───────────────────────────────────────────────────────────
interface SessionDay {
  id?: string;
  session_id?: string;
  day_number: number;
  day_label: string;
  day_date: string;
  modality: 'Synchronous' | 'Asynchronous';
  where_location: string;
  start_time: string;
  end_time: string;
  time_schedule?: string;
  duration?: string;
}

interface Session {
  id: string;
  name: string;
  is_archived: boolean;
  created_at: string;
  archived_at: string | null;
  what?: string;
  when_date?: string;
  where_location?: string;
  time_schedule?: string;
  duration?: string;
  topic_description?: string;
  investment_fee?: string;
  cpd_units?: string;
  days?: SessionDay[];
}

interface Registration {
  id: string; // Updated to string (UUID)
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  temporary_password: string;
  created_at: string;
  session_id: string;
  is_winner?: boolean;
  email_sent?: boolean;
  email_sent_at?: string;
}

interface PaidRegistration {
  id: string;
  created_at: string;
  given_name: string;
  middle_initial?: string;
  last_name: string;
  preferred_name: string;
  email: string;
  contact_number: string;
  position: string;
  school_name: string;
  region: string;
  division: string;
  prc_id: string;
  proof_of_payment_url?: string;
  payment_status?: string;
  paymongo_checkout_id?: string;
  paymongo_payment_id?: string;
  paid_at?: string;
}

type SortField = 'created_at' | 'first_name' | 'last_name' | 'email';
type SortDir = 'asc' | 'desc';

// ─── Component ───────────────────────────────────────────────────────
function Admin() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [shakeLogin, setShakeLogin] = useState(false);

  // Data state
  const [records, setRecords] = useState<Registration[]>([]);
  const [paidRecords, setPaidRecords] = useState<PaidRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'registrations' | 'winners' | 'paid'>('registrations');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset page on search or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Winner action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Proof modal state
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  // Session state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionWhat, setNewSessionWhat] = useState('');
  const [newSessionWhen, setNewSessionWhen] = useState('');
  const [newSessionWhere, setNewSessionWhere] = useState('');
  const [newSessionStartTime, setNewSessionStartTime] = useState('');
  const [newSessionEndTime, setNewSessionEndTime] = useState('');
  const [newSessionTopic, setNewSessionTopic] = useState('');
  const [newSessionFee, setNewSessionFee] = useState('');
  const [newSessionCpdUnits, setNewSessionCpdUnits] = useState('');
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [sessionsReady, setSessionsReady] = useState(false);

  // Multi-day session state
  const emptyDay = (dayNum: number): SessionDay => ({
    day_number: dayNum,
    day_label: `Day ${dayNum}`,
    day_date: '',
    modality: 'Synchronous',
    where_location: 'Zoom Online Meeting',
    start_time: '',
    end_time: '',
  });
  const [newSessionDays, setNewSessionDays] = useState<SessionDay[]>([emptyDay(1), emptyDay(2)]);

  const tableRef = useRef<HTMLTableElement>(null);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const isArchivedSession = selectedSession?.is_archived ?? false;

  // Initialization (Session & Remember Me)
  useEffect(() => {
    document.title = 'SPARK CPD Admin';
    const session = sessionStorage.getItem('spark_admin_auth');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
    const savedEmail = localStorage.getItem('spark_admin_email');
    if (savedEmail) {
      setLoginEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Fetch sessions when authenticated, then records
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated]);

  // Fetch records when selected session changes or sessions are ready
  useEffect(() => {
    if (isAuthenticated && sessionsReady) {
      fetchRecords();
      fetchPaidRecords();
    }
  }, [selectedSessionId, sessionsReady]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── Auth ──────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    setShakeLogin(false);

    try {
      const { data, error: authError } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('email', loginEmail)
        .eq('password', loginPassword)
        .single();

      if (authError || !data) {
        setLoginError('Invalid email or password.');
        setShakeLogin(true);
        setTimeout(() => setShakeLogin(false), 600); // match animation duration
      } else {
        if (rememberMe) {
          localStorage.setItem('spark_admin_email', loginEmail);
        } else {
          localStorage.removeItem('spark_admin_email');
        }
        sessionStorage.setItem('spark_admin_auth', 'true');
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setLoginError('An error occurred during sign in.');
      setShakeLogin(true);
      setTimeout(() => setShakeLogin(false), 600);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('spark_admin_auth');
    setIsAuthenticated(false);
    setLoginPassword('');
  };

  // ─── Session Management ───────────────────────────────────────────
  const fetchSessions = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      const sessionList: Session[] = data ?? [];

      // Fetch session_days for all sessions
      try {
        const sessionIds = sessionList.map(s => s.id);
        if (sessionIds.length > 0) {
          const { data: daysData } = await supabase
            .from('session_days')
            .select('*')
            .in('session_id', sessionIds)
            .order('day_number', { ascending: true });

          if (daysData) {
            sessionList.forEach(session => {
              session.days = daysData.filter(d => d.session_id === session.id);
            });
          }
        }
      } catch {
        // session_days table may not exist yet — graceful fallback
      }

      setSessions(sessionList);

      // Auto-select the first non-archived session, or the first one
      if (sessionList.length > 0 && !selectedSessionId) {
        const active = sessionList.find(s => !s.is_archived);
        setSelectedSessionId(active?.id ?? sessionList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
      // If sessions table doesn't exist yet, still allow records to load
    } finally {
      setSessionsReady(true);
    }
  };

  const calculateDurationAndSchedule = (start: string, end: string) => {
    if (!start || !end) return { time_schedule: '', duration: '' };
    
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    const format12H = (h: number, m: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };
    
    const schedule = `${format12H(startH, startM)} to ${format12H(endH, endM)}`;
    
    let startTotalMins = startH * 60 + startM;
    let endTotalMins = endH * 60 + endM;
    if (endTotalMins < startTotalMins) endTotalMins += 24 * 60; // next day
    
    const diffMins = endTotalMins - startTotalMins;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    const durationParts = [];
    if (hours > 0) durationParts.push(`${hours} Hour${hours > 1 ? 's' : ''}`);
    if (mins > 0) durationParts.push(`${mins} Minute${mins > 1 ? 's' : ''}`);
    
    return { time_schedule: schedule, duration: durationParts.join(' and ') };
  };

  // Day management helpers for create modal
  const addDay = () => {
    setNewSessionDays(prev => [...prev, emptyDay(prev.length + 1)]);
  };

  const removeDay = (index: number) => {
    if (newSessionDays.length <= 1) return;
    setNewSessionDays(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Re-number days
      return updated.map((d, i) => ({ ...d, day_number: i + 1, day_label: `Day ${i + 1}` }));
    });
  };

  const updateDay = (index: number, field: keyof SessionDay, value: string) => {
    setNewSessionDays(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Auto-fill where_location based on modality
      if (field === 'modality') {
        updated[index].where_location = value === 'Asynchronous' ? 'Online (Self-paced)' : 'Zoom Online Meeting';
        if (value === 'Asynchronous') {
          updated[index].start_time = '';
          updated[index].end_time = '';
        }
      }
      return updated;
    });
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    setSessionLoading(true);
    try {
      // Compute a summary when_date from day dates
      const dayDates = newSessionDays.filter(d => d.day_date.trim()).map(d => d.day_date.trim());
      const summaryWhenDate = newSessionWhen.trim() || (dayDates.length > 0 ? dayDates.join(', ') : '');

      // For backward compat, use first synchronous day's time for session-level fields
      const firstSyncDay = newSessionDays.find(d => d.modality === 'Synchronous' && d.start_time && d.end_time);
      const { time_schedule, duration } = firstSyncDay
        ? calculateDurationAndSchedule(firstSyncDay.start_time, firstSyncDay.end_time)
        : calculateDurationAndSchedule(newSessionStartTime, newSessionEndTime);

      const firstWhere = newSessionDays.find(d => d.where_location.trim())?.where_location.trim() || newSessionWhere.trim();

      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert([{ 
          name: newSessionName.trim(),
          what: newSessionWhat.trim(),
          when_date: summaryWhenDate,
          where_location: firstWhere,
          time_schedule,
          duration,
          topic_description: newSessionTopic.trim(),
          investment_fee: newSessionFee.trim(),
          cpd_units: newSessionCpdUnits.trim()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert session_days
      const daysToInsert = newSessionDays.map(day => {
        const daySchedule = day.modality === 'Synchronous' && day.start_time && day.end_time
          ? calculateDurationAndSchedule(day.start_time, day.end_time)
          : { time_schedule: day.modality === 'Asynchronous' ? 'Self-paced' : '', duration: '' };
        return {
          session_id: data.id,
          day_number: day.day_number,
          day_label: day.day_label,
          day_date: day.day_date.trim(),
          modality: day.modality,
          where_location: day.where_location.trim(),
          start_time: day.start_time || null,
          end_time: day.end_time || null,
          time_schedule: daySchedule.time_schedule,
          duration: daySchedule.duration,
        };
      });

      const { error: daysError } = await supabase
        .from('session_days')
        .insert(daysToInsert);

      if (daysError) console.error('Failed to insert session days:', daysError);

      // Attach days to session data for local state
      const sessionWithDays: Session = { ...data, days: daysToInsert as SessionDay[] };

      setSessions(prev => [sessionWithDays, ...prev]);
      setSelectedSessionId(data.id);
      
      setNewSessionName('');
      setNewSessionWhat('');
      setNewSessionWhen('');
      setNewSessionWhere('');
      setNewSessionStartTime('');
      setNewSessionEndTime('');
      setNewSessionTopic('');
      setNewSessionFee('');
      setNewSessionCpdUnits('');
      setNewSessionDays([emptyDay(1), emptyDay(2)]);
      
      setShowCreateSession(false);
      showToast(`Session "${data.name}" created! 🎉`);
    } catch (err: any) {
      setError(err.message || 'Failed to create session.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleArchiveSession = async () => {
    if (!selectedSessionId) return;
    setSessionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', selectedSessionId);

      if (updateError) throw updateError;

      setSessions(prev => prev.map(s =>
        s.id === selectedSessionId
          ? { ...s, is_archived: true, archived_at: new Date().toISOString() }
          : s
      ));
      setShowArchiveConfirm(false);
      showToast('Session archived successfully! 📦');
    } catch (err: any) {
      setError(err.message || 'Failed to archive session.');
    } finally {
      setSessionLoading(false);
    }
  };

  // ─── Data fetching ────────────────────────────────────────────────
  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: true });

      if (selectedSessionId) {
        query = query.eq('session_id', selectedSessionId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setRecords(data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaidRecords = async () => {
    try {
      let query = supabase
        .from('paid_registration')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedSessionId) {
        query = query.eq('session_id', selectedSessionId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setPaidRecords(data ?? []);
    } catch (err: any) {
      console.error('Failed to fetch paid records:', err);
    }
  };

  // ─── Sorting & Filtering ─────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filteredRecords = records
    .filter((r) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.first_name.toLowerCase().includes(q) ||
        r.last_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.mobile_number.includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'created_at') {
        return (
          dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        );
      }
      return dir * a[sortField].localeCompare(b[sortField]);
    });

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ─── Winner Filters ────────────────────────────────────────────────
  const eligibleParticipants = records.filter(r => !r.is_winner).filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.mobile_number.includes(q)
    );
  });

  const confirmedWinners = records.filter(r => r.is_winner).filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.mobile_number.includes(q)
    );
  });

  const filteredPaidRecords = paidRecords.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.given_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.school_name.toLowerCase().includes(q) ||
      r.prc_id.toLowerCase().includes(q)
    );
  });

  const paginatedPaidRecords = filteredPaidRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPagesForPaid = Math.ceil(filteredPaidRecords.length / ITEMS_PER_PAGE);

  const recordsToExport = activeTab === 'registrations' ? filteredRecords : (activeTab === 'paid' ? filteredPaidRecords : confirmedWinners);

  const getRegistrationNumber = (id: string) => {
    const idx = records.findIndex(r => r.id === id);
    return idx !== -1 ? idx + 1 : 0;
  };

  // ─── Copy ─────────────────────────────────────────────────────────
  const handleCopy = async () => {
    const rows = recordsToExport.map((r: any) => {
      if (activeTab === 'paid') {
        return `${r.given_name} ${r.last_name} | ${r.email} | ${r.contact_number}`;
      }
      return `${r.first_name} ${r.last_name} | ${r.email} | ${r.mobile_number}`;
    });
    const text = rows.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied to clipboard!');
    }
  };

  // ─── CSV Export ───────────────────────────────────────────────────
  const handleCSV = () => {
    let header, rows;
    if (activeTab === 'paid') {
      header = ['First Name', 'Last Name', 'Email', 'Contact Number', 'Position', 'School', 'Region', 'Division', 'PRC ID', 'Proof URL', 'Payment ID', 'Registered At'];
      rows = (recordsToExport as PaidRegistration[]).map((r) => [
        r.given_name,
        r.last_name,
        r.email,
        r.contact_number,
        r.position,
        r.school_name,
        r.region,
        r.division,
        r.prc_id,
        r.proof_of_payment_url,
        r.paymongo_payment_id || '',
        new Date(r.created_at).toLocaleString(),
      ]);
    } else {
      header = ['First Name', 'Last Name', 'Email', 'Mobile Number', 'Temp Password', 'Registered At'];
      rows = (recordsToExport as Registration[]).map((r) => [
        r.first_name,
        r.last_name,
        r.email,
        r.mobile_number,
        r.temporary_password,
        new Date(r.created_at).toLocaleString(),
      ]);
    }

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell || ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spark_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV Exported Successfully');
  };

  // ─── PDF Export ───────────────────────────────────────────────────
  const handlePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.setTextColor(255, 94, 0);
    const title = activeTab === 'registrations' ? 'SPARK CPD - Raffle Registrations' : (activeTab === 'paid' ? 'SPARK CPD - Paid Registrations' : 'SPARK CPD - Raffle Winners');
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Total Records: ${recordsToExport.length}`, 14, 34);

    let head, body;
    if (activeTab === 'paid') {
      head = [['#', 'Name', 'Email', 'Contact', 'Position', 'School', 'PRC ID', 'Registered At']];
      body = (recordsToExport as PaidRegistration[]).map((r, i) => [
        i + 1,
        `${r.given_name} ${r.last_name}`,
        r.email,
        r.contact_number,
        r.position,
        r.school_name,
        r.prc_id,
        new Date(r.created_at).toLocaleDateString('en-PH'),
      ]);
    } else {
      head = [['#', 'First Name', 'Last Name', 'Email', 'Mobile Number', 'Temp Password', 'Registered At']];
      body = (recordsToExport as Registration[]).map((r) => [
        getRegistrationNumber(r.id),
        r.first_name,
        r.last_name,
        r.email,
        r.mobile_number,
        r.temporary_password,
        new Date(r.created_at).toLocaleString(),
      ]);
    }

    autoTable(doc, {
      startY: 42,
      head,
      body,
      headStyles: {
        fillColor: [15, 23, 42], // deep black slate for modern look
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [51, 65, 85],
      },
    });

    doc.save(`spark_registrations_${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast('PDF Exported Successfully');
  };

  // ─── DOCX Export ───────────────────────────────────────────────────
  const handleDocx = async () => {
    try {
      const title = activeTab === 'registrations' ? 'SPARK CPD - Raffle Registrations' : (activeTab === 'paid' ? 'SPARK CPD - Paid Registrations' : 'SPARK CPD - Raffle Winners');

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: title,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),
              new Paragraph({
                text: `Generated: ${new Date().toLocaleString()}`,
                alignment: AlignmentType.RIGHT,
                spacing: { after: 200 },
              }),
              new Paragraph({
                text: `Total Records: ${recordsToExport.length}`,
                alignment: AlignmentType.LEFT,
                spacing: { after: 400 },
              }),
              ...recordsToExport.map(
                (r: any, i: number) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${activeTab === 'paid' ? (i + 1) : getRegistrationNumber(r.id)}. ${activeTab === 'paid' ? r.given_name : r.first_name} ${r.last_name}`,
                        size: 24, // 12pt
                      }),
                    ],
                    spacing: { before: 120 },
                  })
              ),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spark_registrations_${new Date().toISOString().slice(0, 10)}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Word Document Exported Successfully');
    } catch (err: any) {
      setError('Failed to export DOCX: ' + err.message);
    }
  };

  // ─── Winner Management ──────────────────────────────────────────
  const toggleParticipant = (id: string) => {
    setSelectedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const visibleIds = eligibleParticipants.map(r => r.id);
    const allSelected = visibleIds.every(id => selectedParticipants.has(id));
    setSelectedParticipants(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleSetWinner = async (id: string) => {
    setActionLoading(id);
    try {
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ is_winner: true })
        .eq('id', id);

      if (updateError) throw updateError;

      setRecords(prev => prev.map(r => r.id === id ? { ...r, is_winner: true } : r));
      setSelectedParticipants(prev => { const next = new Set(prev); next.delete(id); return next; });
      showToast('Participant marked as winner! 🏆');
    } catch (err: any) {
      setError(err.message || 'Failed to update winner status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkSetWinners = async () => {
    if (selectedParticipants.size === 0) return;
    setActionLoading('bulk-winners');
    try {
      const ids = Array.from(selectedParticipants);
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ is_winner: true })
        .in('id', ids);

      if (updateError) throw updateError;

      setRecords(prev => prev.map(r => ids.includes(r.id) ? { ...r, is_winner: true } : r));
      setSelectedParticipants(new Set());
      showToast(`${ids.length} participant(s) marked as winners! 🏆`);
    } catch (err: any) {
      setError(err.message || 'Failed to bulk update winners.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = async (id: string) => {
    const winner = records.find(r => r.id === id);
    if (!winner) return;

    setActionLoading(`email-${id}`);
    try {
      // 1. Send real email via serverless function
      const response = await fetch('/api/send-winner-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: winner.email,
          name: `${winner.first_name} ${winner.last_name}`,
        }),
      });

      // Check if response is JSON (not HTML from dev server)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Email API is not available. Please deploy to Vercel or run "vercel dev".');
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send email.');

      // 2. Update Supabase only after successful send
      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setRecords(prev => prev.map(r => r.id === id ? { ...r, email_sent: true, email_sent_at: new Date().toISOString() } : r));
      showToast('Email sent successfully! ✅');
    } catch (err: any) {
      setError(err.message || 'Failed to send email.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendAllEmails = async () => {
    const unsentWinners = records.filter(r => r.is_winner && !r.email_sent);
    if (unsentWinners.length === 0) {
      showToast('No pending emails to send.');
      return;
    }

    setActionLoading('bulk-email');
    try {
      // 1. Send all emails via serverless function
      const response = await fetch('/api/send-bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winners: unsentWinners.map(w => ({
            id: w.id,
            email: w.email,
            name: `${w.first_name} ${w.last_name}`,
          })),
        }),
      });

      // Check if response is JSON (not HTML from dev server)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Email API is not available. Please deploy to Vercel or run "vercel dev".');
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send bulk emails.');

      // 2. Get IDs of successfully sent emails
      const sentIds = result.results
        ?.filter((r: { success: boolean }) => r.success)
        .map((r: { id: string }) => r.id) || [];

      if (sentIds.length > 0) {
        // 3. Update Supabase for successfully sent emails
        const { error: updateError } = await supabase
          .from('registrations')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString()
          })
          .in('id', sentIds);

        if (updateError) throw updateError;

        setRecords(prev => prev.map(r =>
          sentIds.includes(r.id)
            ? { ...r, email_sent: true, email_sent_at: new Date().toISOString() }
            : r
        ));
      }

      const { sent, failed } = result.summary;
      if (failed > 0) {
        showToast(`Sent ${sent} emails. ${failed} failed.`);
      } else {
        showToast(`Successfully sent ${sent} emails! ✅`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send bulk emails.');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Sort Icon Helper ─────────────────────────────────────────────
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={14} className="admin-sort-icon inactive" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={14} className="admin-sort-icon" />
    ) : (
      <ChevronDown size={14} className="admin-sort-icon" />
    );
  };

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║  LOGIN SCREEN                                                ║
  // ╚═══════════════════════════════════════════════════════════════╝
  if (!isAuthenticated) {
    return (
      <div className="admin-login-layout">
        <div className="admin-login-brand">
          <img src="/sparklogo.png" alt="SPARK Logo" />
          <h1>SPARK CPD</h1>
          <p>Access the Admin Portal to view and manage registrations.</p>
        </div>

        <div className="admin-login-container">
          <div className={`admin-login-card ${shakeLogin ? 'shake' : ''}`}>
            <h2>Welcome Back</h2>
            <p className="subtitle">Sign in to manage registrations.</p>

            <form onSubmit={handleLogin}>
              {loginError && (
                <div className="error-message">
                  <AlertCircle size={20} className="shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="input-group">
                <input
                  type="email"
                  id="adminEmail"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  placeholder=" "
                  autoComplete="email"
                />
                <label htmlFor="adminEmail">Email Address</label>
              </div>

              <div className="input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="adminPassword"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  placeholder=" "
                  autoComplete="current-password"
                />
                <label htmlFor="adminPassword">Password</label>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="login-options">
                <label>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <a href="#" onClick={(e) => e.preventDefault()}>Forgot password?</a>
              </div>

              <button type="submit" className="btn-primary" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <Loader2 className="spinner" size={20} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║  ADMIN DASHBOARD                                             ║
  // ╚═══════════════════════════════════════════════════════════════╝
  return (
    <div className="admin-layout">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="admin-header">
        <div className="admin-header-left">
          <img src="/sparklogo.png" alt="SPARK Logo" className="admin-header-logo" />
          <h1 className="admin-header-title">SPARK CPD</h1>
          <span className="admin-header-badge">Admin Portal</span>
        </div>

        <div className="admin-header-right">
          <div className="admin-avatar">
            <Users size={18} />
          </div>
          <button className="admin-logout-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main className="admin-main">
        {/* ── Session Selector Bar ──────────────────────────────── */}
        <div className="session-bar">
          <div className="session-bar-left">
            <FolderOpen size={18} style={{ color: 'var(--brand-orange)' }} />
            <span className="session-bar-label">Session:</span>
            <div className="session-dropdown-wrapper" style={{ position: 'relative' }}>
              <button
                className="session-selector-btn"
                onClick={() => setShowSessionDropdown(!showSessionDropdown)}
              >
                <span>{selectedSession?.name || 'Select Session'}</span>
                {isArchivedSession && <span className="session-archived-badge">Archived</span>}
                <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: showSessionDropdown ? 'rotate(180deg)' : 'none' }} />
              </button>
              {showSessionDropdown && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowSessionDropdown(false)} />
                  <div className="session-dropdown">
                    {sessions.length === 0 ? (
                      <div className="session-dropdown-empty">No sessions yet</div>
                    ) : (
                      sessions.map(s => (
                        <button
                          key={s.id}
                          className={`session-dropdown-item ${s.id === selectedSessionId ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedSessionId(s.id);
                            setShowSessionDropdown(false);
                            setCurrentPage(1);
                          }}
                        >
                          <span>{s.name}</span>
                          {s.is_archived && <span className="session-archived-badge">Archived</span>}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="session-bar-actions">
            {selectedSession && !isArchivedSession && (
              <button
                className="session-archive-btn"
                onClick={() => setShowArchiveConfirm(true)}
                disabled={sessionLoading}
              >
                <Archive size={16} />
                <span>Archive</span>
              </button>
            )}
            <button
              className="session-create-btn"
              onClick={() => setShowCreateSession(true)}
            >
              <Plus size={16} />
              <span>New Session</span>
            </button>
          </div>
        </div>

        {/* Archived banner */}
        {isArchivedSession && (
          <div className="session-archived-banner">
            <Archive size={18} />
            <span>This session is archived. Data is read-only.</span>
          </div>
        )}

        {/* Stats bar */}
        <div className="admin-stats-bar">
          <div className="admin-stat-card">
            <div className="admin-stat-icon primary">
              <Users size={24} />
            </div>
            <div>
              <span className="admin-stat-number">{records.length}</span>
              <span className="admin-stat-label">Raffle Registrants</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon warning">
              <PartyPopper size={24} />
            </div>
            <div>
              <span className="admin-stat-number">{records.filter(r => r.is_winner).length}</span>
              <span className="admin-stat-label">Raffle Winners</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon success" style={{ background: 'rgba(255, 94, 0, 0.1)', color: 'var(--brand-orange)' }}>
              <CreditCard size={24} />
            </div>
            <div>
              <span className="admin-stat-number">{paidRecords.length}</span>
              <span className="admin-stat-label">Paid Registrants</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'registrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('registrations')}
          >
            Raffle
          </button>
          <button
            className={`admin-tab ${activeTab === 'winners' ? 'active' : ''}`}
            onClick={() => setActiveTab('winners')}
          >
            Manage Winners
          </button>
          <button
            className={`admin-tab ${activeTab === 'paid' ? 'active' : ''}`}
            onClick={() => setActiveTab('paid')}
          >
            Paid
          </button>
        </div>

        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-search-wrapper">
            <Search size={18} className="admin-search-icon" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by name, email, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="admin-toolbar-actions">
            <button className="admin-action-btn" onClick={fetchRecords} title="Refresh">
              <RefreshCw size={16} className={loading ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>
            <button className="admin-action-btn" onClick={handleCopy} title="Copy shown records">
              <Copy size={16} />
              <span>Copy</span>
            </button>
            <button className="admin-action-btn" onClick={handleCSV} title="Download CSV">
              <FileDown size={16} />
              <span>CSV</span>
            </button>
            <button className="admin-action-btn" onClick={handlePDF} title="Download PDF">
              <FileText size={16} />
              <span>PDF</span>
            </button>
            <button className="admin-action-btn" onClick={handleDocx} title="Download Word (Names Only)">
              <File size={16} />
              <span>Word</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message" style={{ margin: '0 0 1.5rem' }}>
            <AlertCircle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content based on Active Tab */}
        {activeTab === 'registrations' && (
          <div className="admin-table-container">
            <table className="admin-table" ref={tableRef}>
              <thead>
                <tr>
                  <th className="admin-th-num">#</th>
                  <th className="admin-th-sortable" onClick={() => handleSort('first_name')}>
                    <div className="th-content">
                      First Name <SortIcon field="first_name" />
                    </div>
                  </th>
                  <th className="admin-th-sortable" onClick={() => handleSort('last_name')}>
                    <div className="th-content">
                      Last Name <SortIcon field="last_name" />
                    </div>
                  </th>
                  <th className="admin-th-sortable" onClick={() => handleSort('email')}>
                    <div className="th-content">
                      Email <SortIcon field="email" />
                    </div>
                  </th>
                  <th>Mobile Number</th>
                  <th>Status</th>
                  <th className="admin-th-sortable" onClick={() => handleSort('created_at')}>
                    <div className="th-content">
                      Registered At <SortIcon field="created_at" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="skeleton-row">
                      <td><div className="skeleton-box" style={{ width: '20px' }}></div></td>
                      <td><div className="skeleton-box" style={{ width: '80%' }}></div></td>
                      <td><div className="skeleton-box" style={{ width: '80%' }}></div></td>
                      <td><div className="skeleton-box" style={{ width: '90%' }}></div></td>
                      <td><div className="skeleton-box" style={{ width: '60%' }}></div></td>
                      <td><div className="skeleton-box" style={{ width: '100px' }}></div></td>
                      <td><div className="skeleton-box" style={{ width: '70%' }}></div></td>
                    </tr>
                  ))
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="admin-empty">
                        <Users size={48} />
                        <p>{searchQuery ? 'No matching records found.' : 'No registrations yet.'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`admin-table-row ${r.is_winner ? 'row-winner' : ''}`}
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <td className="admin-td-num">{getRegistrationNumber(r.id)}</td>
                      <td>{r.first_name}</td>
                      <td>{r.last_name}</td>
                      <td className="admin-td-email">{r.email}</td>
                      <td>{r.mobile_number}</td>
                      <td>
                        {r.is_winner ? (
                          <span className="badge-winner">🏆 Winner</span>
                        ) : (
                          <span className="badge-participant">Participant</span>
                        )}
                      </td>
                      <td className="admin-td-date">
                        {new Date(r.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                <div className="pagination-info">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'paid' && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th-num">#</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Position</th>
                  <th>School</th>
                  <th>PRC ID</th>
                  <th>Transaction ID</th>
                  <th>Payment Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skeleton-paid-${idx}`} className="skeleton-row">
                      <td colSpan={8}><div className="skeleton-box" style={{ width: '100%' }}></div></td>
                    </tr>
                  ))
                ) : filteredPaidRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="admin-empty">
                        <CreditCard size={48} />
                        <p>{searchQuery ? 'No matching paid records found.' : 'No paid registrations yet.'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPaidRecords.map((r, i) => (
                    <tr
                      key={r.id}
                      className="admin-table-row"
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <td className="admin-td-num">{((currentPage - 1) * ITEMS_PER_PAGE) + i + 1}</td>
                      <td style={{ fontWeight: '600' }}>{r.given_name} {r.last_name}</td>
                      <td className="admin-td-email">{r.email}</td>
                      <td>{r.position}</td>
                      <td>{r.school_name}</td>
                      <td>{r.prc_id}</td>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#64748b' }}>
                        {r.paymongo_payment_id ? r.paymongo_payment_id : 'N/A'}
                      </td>
                      <td>
                        {r.payment_status === 'paid' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            color: '#16a34a',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}>
                            <CheckCircle2 size={14} />
                            Paid
                          </span>
                        ) : r.proof_of_payment_url ? (
                          <button
                            onClick={() => setProofModalUrl(r.proof_of_payment_url!)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '0.4rem 0.8rem',
                              height: '36px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'var(--brand-orange)',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              transition: 'all 0.2s ease',
                            }}
                            title="View Payment Proof"
                          >
                            <Eye size={16} />
                            Proof
                          </button>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            background: 'rgba(234, 179, 8, 0.1)',
                            color: '#ca8a04',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}>
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="admin-td-date">
                        {new Date(r.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPagesForPaid > 1 && (
              <div className="admin-pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                <div className="pagination-info">
                  Page <strong>{currentPage}</strong> of <strong>{totalPagesForPaid}</strong>
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPagesForPaid, prev + 1))}
                  disabled={currentPage === totalPagesForPaid}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'winners' && (
          <div className="winners-management-grid">
            {/* Eligible Section */}
            <div className="management-card">
              <div className="management-card-header">
                <h3>Eligible Participants</h3>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {selectedParticipants.size > 0 && (
                    <button
                      className="bulk-action-btn"
                      onClick={handleBulkSetWinners}
                      disabled={!!actionLoading}
                      style={{ background: 'var(--brand-orange)' }}
                    >
                      {actionLoading === 'bulk-winners' ? <Loader2 className="spinner" size={16} /> : <><CheckCircle2 size={16} /> Set {selectedParticipants.size} as Winners</>}
                    </button>
                  )}
                  <span className="count-badge">{eligibleParticipants.length}</span>
                </div>
              </div>
              {/* Select All */}
              {eligibleParticipants.length > 0 && (
                <label className="select-all-row">
                  <input
                    type="checkbox"
                    className="winner-checkbox"
                    checked={eligibleParticipants.length > 0 && eligibleParticipants.every(r => selectedParticipants.has(r.id))}
                    onChange={toggleAllVisible}
                  />
                  <span className="select-all-label">Select All ({eligibleParticipants.length})</span>
                </label>
              )}
              <div className="management-list">
                {eligibleParticipants.length === 0 ? (
                  <p className="empty-msg">{searchQuery ? 'No matching participants.' : 'No eligible participants left.'}</p>
                ) : (
                  eligibleParticipants.map(r => (
                    <div key={r.id} className={`winner-row-item ${selectedParticipants.has(r.id) ? 'selected' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                          type="checkbox"
                          className="winner-checkbox"
                          checked={selectedParticipants.has(r.id)}
                          onChange={() => toggleParticipant(r.id)}
                        />
                        <div className="user-info">
                          <span className="user-name">{r.first_name} {r.last_name}</span>
                          <span className="user-email">{r.email}</span>
                        </div>
                      </div>
                      <button
                        className="btn-select-winner"
                        onClick={() => handleSetWinner(r.id)}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === r.id ? <Loader2 className="spinner" size={16} /> : 'Set as Winner'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Winners Section */}
            <div className="management-card highlighted">
              <div className="management-card-header">
                <h3>Confirmed Winners 🏆</h3>
                <button
                  className="bulk-action-btn"
                  onClick={handleSendAllEmails}
                  disabled={!!actionLoading || records.filter(r => r.is_winner && !r.email_sent).length === 0}
                >
                  {actionLoading === 'bulk-email' ? <Loader2 className="spinner" size={16} /> : <><FileText size={16} /> Send All Emails</>}
                </button>
              </div>
              <div className="management-list">
                {confirmedWinners.length === 0 ? (
                  <p className="empty-msg">{searchQuery ? 'No matching winners.' : 'No winners selected yet.'}</p>
                ) : (
                  confirmedWinners.map(r => (
                    <div key={r.id} className="winner-row-item winner-confirmed">
                      <div className="user-info">
                        <span className="user-name">{r.first_name} {r.last_name}</span>
                        <div className="winner-status-line">
                          <span className="user-email">{r.email}</span>
                          {r.email_sent ? (
                            <span className="status-sent">Sent ✅</span>
                          ) : (
                            <span className="status-pending">Not Sent</span>
                          )}
                        </div>
                      </div>
                      {!r.email_sent && (
                        <button
                          className="btn-send-email"
                          onClick={() => handleSendEmail(r.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === `email-${r.id}` ? <Loader2 className="spinner" size={16} /> : 'Send Email'}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Payment Proof Modal */}
      {proofModalUrl && (
        <div
          onClick={() => setProofModalUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#fff',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={() => setProofModalUrl(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--brand-orange)',
                color: '#fff',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 94, 0, 0.4)',
                zIndex: 1,
              }}
              title="Close"
            >
              ✕
            </button>
            <img
              src={proofModalUrl}
              alt="Payment Proof"
              style={{
                maxWidth: '85vw',
                maxHeight: '82vh',
                borderRadius: '10px',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Create Session Modal ──────────────────────────────── */}
      {showCreateSession && (
        <div className="modal-overlay" onClick={() => setShowCreateSession(false)} style={{ overflowY: 'auto', padding: '2rem 0' }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '95%', margin: 'auto' }}>
            <button className="modal-close" onClick={() => setShowCreateSession(false)}><X size={20} /></button>
            <h3 className="modal-title">Create New Session</h3>
            <p className="modal-desc">Fill in the session details for the registration page.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '65vh', overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>SESSION NAME (Internal)*</label>
                <input type="text" className="form-input" style={{ padding: '0.6rem 1rem' }} placeholder="e.g. Batch 3 - October 2026" value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>WHAT</label>
                  <input type="text" className="form-input" style={{ padding: '0.6rem 1rem' }} placeholder="e.g. Mental Wellness" value={newSessionWhat} onChange={(e) => setNewSessionWhat(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>WHEN (Summary/Override)</label>
                  <input type="text" className="form-input" style={{ padding: '0.6rem 1rem' }} placeholder="e.g. Oct 4 to 11, 2026 (auto-filled from days)" value={newSessionWhen} onChange={(e) => setNewSessionWhen(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>TOPIC DESCRIPTION</label>
                <textarea className="form-input" style={{ padding: '0.6rem 1rem', minHeight: '80px', resize: 'vertical' }} placeholder="Description..." value={newSessionTopic} onChange={(e) => setNewSessionTopic(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>INVESTMENT FEE AMOUNT</label>
                  <input type="number" step="0.01" className="form-input" style={{ padding: '0.6rem 1rem' }} placeholder="e.g. 500.00" value={newSessionFee} onChange={(e) => setNewSessionFee(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>CPD UNITS</label>
                  <input type="number" className="form-input" style={{ padding: '0.6rem 1rem' }} placeholder="e.g. 6" value={newSessionCpdUnits} onChange={(e) => setNewSessionCpdUnits(e.target.value)} />
                </div>
              </div>

              {/* ── Day Schedule Section ─────────────────────────── */}
              <div style={{ borderTop: '1px solid var(--brand-border, #e2e8f0)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarDays size={18} style={{ color: 'var(--brand-orange)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--brand-black, #0f172a)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schedule per Day</span>
                  </div>
                  <button
                    type="button"
                    onClick={addDay}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid var(--brand-orange)',
                      background: 'rgba(255, 94, 0, 0.05)', color: 'var(--brand-orange)',
                      fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <Plus size={14} /> Add Day
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {newSessionDays.map((day, idx) => (
                    <div key={idx} className="session-day-row" style={{
                      background: '#f8fafc', border: '1px solid var(--brand-border, #e2e8f0)',
                      borderRadius: '10px', padding: '0.875rem', position: 'relative',
                      borderLeft: day.modality === 'Asynchronous' ? '3px solid #8b5cf6' : '3px solid var(--brand-orange)'
                    }}>
                      {/* Day header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--brand-black, #0f172a)' }}>{day.day_label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {/* Modality selector */}
                          <select
                            value={day.modality}
                            onChange={(e) => updateDay(idx, 'modality', e.target.value)}
                            style={{
                              padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                              border: '1px solid var(--brand-border, #e2e8f0)', cursor: 'pointer',
                              background: day.modality === 'Asynchronous' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 94, 0, 0.1)',
                              color: day.modality === 'Asynchronous' ? '#7c3aed' : 'var(--brand-orange)',
                            }}
                          >
                            <option value="Synchronous">Synchronous</option>
                            <option value="Asynchronous">Asynchronous</option>
                          </select>
                          {newSessionDays.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDay(idx)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              title="Remove day"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Day fields */}
                      <div style={{ display: 'grid', gridTemplateColumns: day.modality === 'Synchronous' ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>DATE</label>
                          <input type="text" className="form-input" style={{ padding: '0.45rem 0.7rem', fontSize: '0.85rem' }} placeholder="e.g. October 4, 2026 (Saturday)" value={day.day_date} onChange={(e) => updateDay(idx, 'day_date', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>WHERE</label>
                          <input type="text" className="form-input" style={{ padding: '0.45rem 0.7rem', fontSize: '0.85rem' }} placeholder={day.modality === 'Asynchronous' ? 'Online (Self-paced)' : 'Zoom Online Meeting'} value={day.where_location} onChange={(e) => updateDay(idx, 'where_location', e.target.value)} />
                        </div>
                      </div>

                      {/* Time fields — only for Synchronous */}
                      {day.modality === 'Synchronous' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>START TIME</label>
                            <input type="time" className="form-input" style={{ padding: '0.45rem 0.7rem', fontSize: '0.85rem' }} value={day.start_time} onChange={(e) => updateDay(idx, 'start_time', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>END TIME</label>
                            <input type="time" className="form-input" style={{ padding: '0.45rem 0.7rem', fontSize: '0.85rem' }} value={day.end_time} onChange={(e) => updateDay(idx, 'end_time', e.target.value)} />
                          </div>
                        </div>
                      )}

                      {/* Async info hint */}
                      {day.modality === 'Asynchronous' && (
                        <p style={{ fontSize: '0.7rem', color: '#7c3aed', margin: '0.4rem 0 0', fontStyle: 'italic' }}>
                          ⓘ Asynchronous — participants complete at their own pace, no scheduled time.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setShowCreateSession(false)}>Cancel</button>
              <button className="modal-btn-primary" onClick={handleCreateSession} disabled={sessionLoading || !newSessionName.trim()}>
                {sessionLoading ? <Loader2 className="spinner" size={16} /> : <Plus size={16} />}
                <span>Create</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Archive Confirmation Modal ─────────────────────────── */}
      {showArchiveConfirm && (
        <div className="modal-overlay" onClick={() => setShowArchiveConfirm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowArchiveConfirm(false)}><X size={20} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Archive size={24} style={{ color: '#CA8A04' }} />
              </div>
              <h3 className="modal-title" style={{ margin: 0 }}>Archive Session</h3>
            </div>
            <p className="modal-desc">
              Are you sure you want to archive <strong>"{selectedSession?.name}"</strong>? 
              This will make the session read-only. Registrations will no longer be accepted for this session. 
              All existing data will be preserved.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setShowArchiveConfirm(false)}>Cancel</button>
              <button className="modal-btn-warning" onClick={handleArchiveSession} disabled={sessionLoading}>
                {sessionLoading ? <Loader2 className="spinner" size={16} /> : <Archive size={16} />}
                <span>Archive Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Application Toast */}
      {toastMessage && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default Admin;
