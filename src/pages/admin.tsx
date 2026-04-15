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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);

  // Initialization (Session & Remember Me)
  useEffect(() => {
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

  // Fetch records when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecords();
    }
  }, [isAuthenticated]);

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
    showToast('CSV Exported Successfully');
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
        {/* Stats bar */}
        <div className="admin-stats-bar">
          <div className="admin-stat-card">
            <div className="admin-stat-icon primary">
              <Users size={24} />
            </div>
            <div>
              <span className="admin-stat-number">{records.length}</span>
              <span className="admin-stat-label">Total Registrations</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon secondary">
              <FileText size={24} />
            </div>
            <div>
              <span className="admin-stat-number">{filteredRecords.length}</span>
              <span className="admin-stat-label">Showing results</span>
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
              {loading ? (
                // Skeleton UI while loading
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
                filteredRecords.map((r, i) => (
                  <tr
                    key={r.id}
                    className="admin-table-row"
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <td className="admin-td-num">{i + 1}</td>
                    <td>{r.first_name}</td>
                    <td>{r.last_name}</td>
                    <td className="admin-td-email">{r.email}</td>
                    <td>{r.mobile_number}</td>
                    <td>
                      <span className="badge-temp-pwd">{r.temporary_password}</span>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

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
