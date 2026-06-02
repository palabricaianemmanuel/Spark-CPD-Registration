import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, User, Mail, Phone, Home } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TheInfiniteGrid } from '@/components/ui/the-infinite-grid';

function Registration() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showShake, setShowShake] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [introKey, setIntroKey] = useState(0);

  // Session state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [noActiveSession, setNoActiveSession] = useState(false);

  // Page Title
  useEffect(() => {
    document.title = 'SPARK CPD Registration';
  }, []);

  // Fetch active session on mount
  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('sessions')
          .select('id')
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
          setActiveSessionId(data.id);
        } else {
          setNoActiveSession(true);
        }
      } catch (err: any) {
        console.error('Failed to fetch active session:', err);
        // Fallback: don't block registration if sessions table doesn't exist yet
        setNoActiveSession(false);
      } finally {
        setSessionLoading(false);
      }
    };
    fetchActiveSession();
  }, []);

  // Intro timer
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 4200); // Matching slower CSS animations
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let filteredValue = value;

    if (name === 'mobileNumber') {
      filteredValue = value.replace(/[^0-9]/g, '');
    } else if (name === 'firstName' || name === 'lastName') {
      // Allow only letters and spaces
      filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: filteredValue
    }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SPARK-${result}`;
  };

  const triggerShake = () => {
    setShowShake(true);
    setTimeout(() => setShowShake(false), 500);
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: ''
    });
    setSuccess(false);
    setError(null);
    setShowIntro(true);
    setIntroKey(prev => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Initial check for Supabase config
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setError('Supabase is not configured yet. Please check SUPABASE_INTEGRATION.md for setup instructions.');
      setLoading(false);
      triggerShake();
      return;
    }

    // 1. Validate Names (Letters and spaces only, max 20 chars)
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(formData.firstName) || !nameRegex.test(formData.lastName)) {
      setError('First and Last Name should not be blank.');
      setLoading(false);
      triggerShake();
      return;
    }
    if (formData.firstName.length > 20 || formData.lastName.length > 20) {
      setError('Names must not exceed 20 characters.');
      setLoading(false);
      triggerShake();
      return;
    }

    // 2. Validate Email (Max 30, real provider pattern)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (formData.email.length > 30 || !emailRegex.test(formData.email)) {
      setError('Please enter a valid email address with a real provider.');
      setLoading(false);
      triggerShake();
      return;
    }

    // 3. Validate Mobile (Exactly 11 digits, numbers only, starts with 09)
    const cleanedMobile = formData.mobileNumber;
    const mobileRegex = /^09\d{9}$/;

    if (!mobileRegex.test(cleanedMobile)) {
      setError('Mobile number must be exactly 11 digits starting with "09".');
      setLoading(false);
      triggerShake();
      return;
    }

    try {
      // 4. Duplicate Checks (Supabase) — scoped to the active session
      const sessionFilter = activeSessionId || undefined;

      let nameQuery = supabase
        .from('registrations')
        .select('id')
        .eq('first_name', formData.firstName)
        .eq('last_name', formData.lastName);
      if (sessionFilter) nameQuery = nameQuery.eq('session_id', sessionFilter);
      const { data: nameCheck } = await nameQuery.maybeSingle();

      if (nameCheck) {
        throw new Error('A person with this name is already registered.');
      }

      let emailQuery = supabase
        .from('registrations')
        .select('id')
        .eq('email', formData.email);
      if (sessionFilter) emailQuery = emailQuery.eq('session_id', sessionFilter);
      const { data: emailCheck } = await emailQuery.maybeSingle();

      if (emailCheck) {
        throw new Error('Email already registered.');
      }

      let mobileQuery = supabase
        .from('registrations')
        .select('id')
        .eq('mobile_number', cleanedMobile);
      if (sessionFilter) mobileQuery = mobileQuery.eq('session_id', sessionFilter);
      const { data: mobileCheck } = await mobileQuery.maybeSingle();

      if (mobileCheck) {
        throw new Error('Mobile number already registered.');
      }

      const tempPassword = generatePassword();
      const firstNameToStore = formData.firstName;

      const insertPayload: Record<string, string> = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        mobile_number: cleanedMobile,
        temporary_password: tempPassword
      };
      if (activeSessionId) {
        insertPayload.session_id = activeSessionId;
      }

      const { error: submitError } = await supabase
        .from('registrations')
        .insert([insertPayload]);

      if (submitError) {
        if (submitError.code === '23505') {
          throw new Error('This entry already exists.');
        }
        throw submitError;
      }

      setRegisteredName(firstNameToStore);
      setSuccess(true);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.message || 'An error occurred. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // Registration Closed screen
  if (!sessionLoading && noActiveSession) {
    return (
      <>
        <TheInfiniteGrid />
        <div className="auth-container registration-container">
          <div className="registration-card-entrance">
            <div className="auth-card registration-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <img src="/sparklogo.png" alt="SPARK Logo" className="auth-logo" style={{ marginBottom: '1rem' }} />
              <h1 className="auth-title registration-title">Registration Closed</h1>
              <p className="auth-subtitle" style={{ maxWidth: '400px', margin: '0 auto' }}>
                There are currently no active registration sessions. Please check back later or contact the administrator.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TheInfiniteGrid />
      {/* 🌪️ Welcome Animation Overlay */}
      <div className={`intro-screen ${!showIntro ? 'hidden' : ''}`}>
        <div className="intro-logo-container" key={introKey}>
          <img src="/sparklogo.png" alt="Logo" className="intro-logo" />
          <div className="spark-overlay">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="spark-particle" />
            ))}
          </div>
        </div>
        <div className="intro-text-container">
          <h1 className="intro-title">Welcome to SPARK CPD</h1>
          <p className="intro-subtitle">Register for the Raffle Event</p>
        </div>
      </div>

      <div className="auth-container registration-container">
        <div className="registration-card-entrance">
          <div className="registration-split-container">
            {/* Left Side / Top Banner: Event Image */}
            <div className="registration-image-side">
              <img src="/eventimage.jpg" alt="Event Banner" className="event-image" />
              <div className="event-image-overlay">
                <h2 className="event-overlay-title">Join the SPARK CPD Raffle!</h2>
                <p className="event-overlay-subtitle">Learn, Grow, and win exciting prizes for a brighter future.</p>
              </div>
              {/* 
                  LATEST FLUID DESIGN (FOR FUTURE APPROVAL):
                  <img src="/eventimage.jpg" alt="Event Banner" className="event-image-fluid" />
              */}
            </div>

            {/* Right Side / Bottom: Form */}
            <div className="registration-form-side">
              <div className={`auth-card registration-card ${showShake ? 'shake' : ''}`}>
            {success ? (
              <div className="success-phase">
                <div className="success-icon-wrapper">
                  <div className="success-glow" />
                  <CheckCircle className="success-icon-animated" size={80} />
                </div>

                <h2 className="success-title-personalized">
                  Thanks, {registeredName}! You're In! 🎉
                </h2>

                <p className="success-text-celebratory">
                  Your registration is complete. Wait for the upcoming announcement for our lucky winners!
                </p>

                <div className="success-actions">
                  <button onClick={handleReset} className="success-btn success-btn-primary">
                    <Home size={18} />
                    <span>Home</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="auth-header">
                  <img src="/sparklogo.png" alt="SPARK Logo" className="auth-logo" />
                  <h1 className="auth-title registration-title">SPARK CPD</h1>
                  <p className="auth-subtitle">Fill in your details to join the raffle</p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  {error && (
                    <div className="error-message">
                      <AlertCircle size={20} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName" className="form-label">First Name</label>
                      <div className="form-group-icon">
                        <User size={18} className="form-input-icon" />
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          className="form-input form-input-with-icon"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          maxLength={20}
                          placeholder="Juan"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="lastName" className="form-label">Last Name</label>
                      <div className="form-group-icon">
                        <User size={18} className="form-input-icon" />
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          className="form-input form-input-with-icon"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          maxLength={20}
                          placeholder="Dela Cruz"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email" className="form-label">Email Address</label>
                    <div className="form-group-icon">
                      <Mail size={18} className="form-input-icon" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-input form-input-with-icon"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        maxLength={30}
                        placeholder="juan.delacruz@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="mobileNumber" className="form-label">Mobile Number</label>
                    <div className="form-group-icon">
                      <Phone size={18} className="form-input-icon" />
                      <input
                        type="text"
                        id="mobileNumber"
                        name="mobileNumber"
                        className="form-input form-input-with-icon"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        required
                        maxLength={11}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="09171234567"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="submit-btn registration-submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="spinner" size={20} />
                        <span>Processing...</span>
                      </>
                    ) : (
                      'Register Now'
                    )}
                  </button>
                </form>
              </>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Registration;
