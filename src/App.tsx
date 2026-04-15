import React, { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

function App() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Initial check for Supabase config
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setError('Supabase is not configured yet. Please check SUPABASE_INTEGRATION.md for setup instructions and add your .env file.');
      setLoading(false);
      return;
    }

    const cleanedMobile = formData.mobileNumber.replace(/[-\s]/g, '');
    const mobileRegex = /^(09|\+639)\d{9}$/;

    if (!mobileRegex.test(cleanedMobile)) {
      setError('Please enter a valid Philippine mobile number (e.g., 0917-123-4567 or +639171234567).');
      setLoading(false);
      return;
    }

    try {
      const { error: submitError } = await supabase
        .from('registrations')
        .insert([
          {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            mobile_number: cleanedMobile
          }
        ]);

      if (submitError) {
        if (submitError.code === '23505') {
          throw new Error('Details provided already exist.');
        }
        throw submitError;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Registration failed:', err);
      // Simplify error message as requested
      const msg = err.message?.toLowerCase().includes('already exist')
        ? 'This entry already exists.'
        : (err.message || 'An error occurred. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/sparklogo.png" alt="SPARK Logo" className="auth-logo" />
          <h1 className="auth-title">SPARK CPD </h1>
          <p className="auth-subtitle">Raffle Registration</p>
        </div>

        {success ? (
          <div className="success-message">
            <CheckCircle className="success-icon" size={64} />
            <h2 className="success-title">Registration Complete!</h2>
            <p className="success-text">
              Thank you for registering. You have been successfully entered into the raffle.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                <AlertCircle size={20} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className="form-input"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Juan"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName" className="form-label">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className="form-input"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Dela Cruz"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="juan.delacruz@gmail.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mobileNumber" className="form-label">Mobile Number</label>
              <input
                type="tel"
                id="mobileNumber"
                name="mobileNumber"
                className="form-input"
                value={formData.mobileNumber}
                onChange={handleChange}
                required
                placeholder="0917-123-4567"
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="spinner" size={20} />
                  <span>Registering...</span>
                </>
              ) : (
                'Register Now'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
