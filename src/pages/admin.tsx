import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  AlertCircle,
  Lock,
  Mail,
  LogOut,
  Copy,
  FileDown,
  FileText,
  Users,
  RefreshCw,
  CheckCircle,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ───────────────────────────────────────────────────────────
interface Registration {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  temporary_password: string;
  created_at: string;
}

type SortField = 'created_at' | 'first_name' | 'last_name' | 'email';
type SortDir = 'asc' | 'desc';

// ─── Constants ───────────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@spark.com';
const ADMIN_PASSWORD = 'Pass@123';

// ─── Component ───────────────────────────────────────────────────────
function Admin() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Data state
  const [records, setRecords] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [copySuccess, setCopySuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const tableRef = useRef<HTMLTableElement>(null);

  // Check session persistence
  useEffect(() => {
    const session = sessionStorage.getItem('spark_admin_auth');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch records when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecords();
    }
  }, [isAuthenticated]);

  // ─── Auth ──────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    // Small delay to simulate auth
    await new Promise((r) => setTimeout(r, 600));

    if (loginEmail === ADMIN_EMAIL && loginPassword === ADMIN_PASSWORD) {
      sessionStorage.setItem('spark_admin_auth', 'true');
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid email or password.');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('spark_admin_auth');
    setIsAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
  };

  // ─── Data fetching ────────────────────────────────────────────────
  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRecords(data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch records.');
    } finally {
      setLoading(false);
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

  // ─── Copy ─────────────────────────────────────────────────────────
  const handleCopy = async () => {
    const rows = filteredRecords.map(
      (r) =>
        `${r.first_name} ${r.last_name} | ${r.email} | ${r.mobile_number}`
    );
    const text = rows.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // ─── CSV Export ───────────────────────────────────────────────────
  const handleCSV = () => {
    const header = ['First Name', 'Last Name', 'Email', 'Mobile Number', 'Temp Password', 'Registered At'];
    const rows = filteredRecords.map((r) => [
      r.first_name,
      r.last_name,
      r.email,
      r.mobile_number,
      r.temporary_password,
      new Date(r.created_at).toLocaleString(),
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spark_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─── PDF Export ───────────────────────────────────────────────────
  const handlePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.setTextColor(255, 94, 0);
    doc.text('SPARK CPD - Registrations', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Total Records: ${filteredRecords.length}`, 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [['#', 'First Name', 'Last Name', 'Email', 'Mobile Number', 'Temp Password', 'Registered At']],
      body: filteredRecords.map((r, i) => [
        i + 1,
        r.first_name,
        r.last_name,
        r.email,
        r.mobile_number,
        r.temporary_password,
        new Date(r.created_at).toLocaleString(),
      ]),
      headStyles: {
        fillColor: [255, 94, 0],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [255, 245, 238],
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
    });

    doc.save(`spark_registrations_${new Date().toISOString().slice(0, 10)}.pdf`);
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
      <div className="auth-container">
        <div className="auth-card admin-login-card">
          <div className="auth-header">
            <img src="/sparklogo.png" alt="SPARK Logo" className="auth-logo" />
            <h1 className="auth-title">SPARK CPD</h1>
            <p className="auth-subtitle">Admin Portal</p>
          </div>

          <form onSubmit={handleLogin}>
            {loginError && (
              <div className="error-message">
                <AlertCircle size={20} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="adminEmail" className="form-label">
                <Mail size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                Email
              </label>
              <input
                type="email"
                id="adminEmail"
                className="form-input"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                placeholder="admin@spark.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="adminPassword" className="form-label">
                <Lock size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                Password
              </label>
              <input
                type="password"
                id="adminPassword"
                className="form-input"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loginLoading}>
              {loginLoading ? (
                <>
                  <Loader2 className="spinner" size={20} />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
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
          <div>
            <h1 className="admin-header-title">SPARK CPD</h1>
            <span className="admin-header-badge">Admin Portal</span>
          </div>
        </div>
        <button className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main className="admin-main">
        {/* Stats bar */}
        <div className="admin-stats-bar">
          <div className="admin-stat-card">
            <Users size={22} />
            <div>
              <span className="admin-stat-number">{records.length}</span>
              <span className="admin-stat-label">Total Registrations</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <FileText size={22} />
            <div>
              <span className="admin-stat-number">{filteredRecords.length}</span>
              <span className="admin-stat-label">Showing</span>
            </div>
          </div>
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
            <button className="admin-action-btn admin-action-copy" onClick={handleCopy} title="Copy all records">
              {copySuccess ? <CheckCircle size={16} /> : <Copy size={16} />}
              <span>{copySuccess ? 'Copied!' : 'Copy All'}</span>
            </button>
            <button className="admin-action-btn admin-action-csv" onClick={handleCSV} title="Download CSV">
              <FileDown size={16} />
              <span>CSV</span>
            </button>
            <button className="admin-action-btn admin-action-pdf" onClick={handlePDF} title="Download PDF">
              <FileText size={16} />
              <span>PDF</span>
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

        {/* Table */}
        <div className="admin-table-container">
          {loading ? (
            <div className="admin-loading">
              <Loader2 className="spinner" size={36} />
              <p>Loading records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="admin-empty">
              <Users size={48} />
              <p>{searchQuery ? 'No matching records found.' : 'No registrations yet.'}</p>
            </div>
          ) : (
            <table className="admin-table" ref={tableRef}>
              <thead>
                <tr>
                  <th className="admin-th-num">#</th>
                  <th className="admin-th-sortable" onClick={() => handleSort('first_name')}>
                    First Name <SortIcon field="first_name" />
                  </th>
                  <th className="admin-th-sortable" onClick={() => handleSort('last_name')}>
                    Last Name <SortIcon field="last_name" />
                  </th>
                  <th className="admin-th-sortable" onClick={() => handleSort('email')}>
                    Email <SortIcon field="email" />
                  </th>
                  <th>Mobile Number</th>
                  <th>Temp Password</th>
                  <th className="admin-th-sortable" onClick={() => handleSort('created_at')}>
                    Registered At <SortIcon field="created_at" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, i) => (
                  <tr key={r.id} className="admin-table-row">
                    <td className="admin-td-num">{i + 1}</td>
                    <td>{r.first_name}</td>
                    <td>{r.last_name}</td>
                    <td className="admin-td-email">{r.email}</td>
                    <td>{r.mobile_number}</td>
                    <td>
                      <code className="admin-temp-password">{r.temporary_password}</code>
                    </td>
                    <td className="admin-td-date">
                      {new Date(r.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                      <span className="admin-td-time">
                        {new Date(r.created_at).toLocaleTimeString('en-PH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default Admin;
