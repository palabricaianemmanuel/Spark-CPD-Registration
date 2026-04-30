import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Home, Check, CreditCard, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

function PaidRegistration() {
  const [currentStep, setCurrentStep] = useState(1);
  const [consent, setConsent] = useState<'agree' | 'disagree' | null>(null);
  const [formData, setFormData] = useState({
    givenName: '',
    middleInitial: '',
    lastName: '',
    preferredName: '',
    email: '',
    contactNumber: '',
    position: '',
    schoolName: '',
    region: '',
    division: '',
    prcId: ''
  });
  const [searchParams] = useSearchParams();
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showShake, setShowShake] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [introKey, setIntroKey] = useState(0);
  const [hasManuallyEditedPreferredName, setHasManuallyEditedPreferredName] = useState(false);

  // Mouse tracking state for the dynamic orange edge light
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isInsideForm, setIsInsideForm] = useState(false);

  const steps = [
    { id: 1, title: 'Program' },
    { id: 2, title: 'Consent' },
    { id: 3, title: 'Details' },
    { id: 4, title: 'Payment' }
  ];

  useEffect(() => {
    document.title = 'SPARK CPD Paid Registration';
  }, []);

  // Handle PayMongo redirect callback
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setPaymentSuccess(true);
      setSuccess(true);
      setRegisteredName('Participant');
      setShowIntro(false);

      // Verify payment and update DB
      const checkoutId = localStorage.getItem('paymongo_checkout_id');
      console.log('Redirect success detected. checkoutId in localStorage:', checkoutId);
      if (checkoutId) {
        fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkout_id: checkoutId })
        }).then((res) => {
          console.log('Verify payment response status:', res.status);
          return res.json();
        }).then((data) => {
          console.log('Verify payment data:', data);
          localStorage.removeItem('paymongo_checkout_id');
        }).catch(err => console.error('Payment verification failed:', err));
      } else {
        console.warn('No checkoutId found in localStorage on success redirect');
      }
    } else if (status === 'failed') {
      setError('Payment was cancelled or failed. You can try again.');
      setCurrentStep(4);
      setShowIntro(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 4200);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let filteredValue = value;

    if (name === 'contactNumber') {
      filteredValue = value.replace(/[^0-9]/g, '');
    } else if (name === 'givenName' || name === 'lastName' || name === 'middleInitial') {
      filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
      // Capitalize first letter of every word
      filteredValue = filteredValue.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }

    setFormData(prev => {
      const next = { ...prev, [name]: filteredValue };

      // Auto-fill logic for preferredName
      if (!hasManuallyEditedPreferredName && (name === 'givenName' || name === 'middleInitial' || name === 'lastName')) {
        const mi = next.middleInitial ? ` ${next.middleInitial}.` : '';
        next.preferredName = `${next.givenName}${mi} ${next.lastName}`.trim().replace(/\s+/g, ' ');
      }

      return next;
    });

    if (name === 'preferredName') {
      setHasManuallyEditedPreferredName(true);
    }
  };



  const triggerShake = () => {
    setShowShake(true);
    setTimeout(() => setShowShake(false), 500);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setConsent(null);
    setFormData({
      givenName: '',
      middleInitial: '',
      lastName: '',
      preferredName: '',
      email: '',
      contactNumber: '',
      position: '',
      schoolName: '',
      region: '',
      division: '',
      prcId: ''
    });
    setPaymentSuccess(false);
    setHasManuallyEditedPreferredName(false);
    setSuccess(false);
    setError(null);
    setShowIntro(true);
    setIntroKey(prev => prev + 1);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const nextStep = () => {
    setError(null);
    if (currentStep === 2 && consent !== 'agree') {
      setError('You must agree to the data privacy consent to proceed.');
      triggerShake();
      return;
    }

    if (currentStep === 3) {
      const { givenName, lastName, email, contactNumber, position, schoolName, region, division, prcId, preferredName } = formData;
      if (!givenName || !lastName || !email || !contactNumber || !position || !schoolName || !region || !division || !prcId || !preferredName) {
        setError('Please fill in all required fields.');
        triggerShake();
        return;
      }

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        triggerShake();
        return;
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentStep(prev => prev - 1);
  };

  const handlePayWithGcash = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Payment API is not available. Please try again later or contact support.');
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment session.');
      }

      // Save checkout ID for verification after redirect, then redirect
      localStorage.setItem('paymongo_checkout_id', result.checkout_id);
      window.location.href = result.checkout_url;
    } catch (err: any) {
      console.error('Payment initiation failed:', err);
      setError(err.message || 'Failed to start payment. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
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
          <p className="intro-subtitle">Paid Registration Portal</p>
        </div>
      </div>

      <div
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: '#f1f5f9', /* Smoke/slate color */
          position: 'relative',
          zIndex: 10
        }}>
        {/* Dynamic Spotlight Glow */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 94, 0, ${isInsideForm ? '0' : '0.18'}), transparent 40%)`,
            transition: 'background 0.3s ease',
            zIndex: -1
          }}
        />

        <div
          className={`auth-card registration-card ${showShake ? 'shake' : ''}`}
          onMouseEnter={() => setIsInsideForm(true)}
          onMouseLeave={() => setIsInsideForm(false)}
          style={{
            width: '100%',
            maxWidth: '850px',
            margin: '0 auto',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            borderRadius: '16px'
          }}>
          {success ? (
            <div className="success-phase" style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div className="success-icon-wrapper" style={{ margin: '0 auto 1.5rem auto' }}>
                <div className="success-glow" />
                <CheckCircle className="success-icon-animated" size={80} color="var(--brand-orange)" />
              </div>
              <h2 className="success-title-personalized" style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--brand-black)' }}>
                {paymentSuccess ? 'Payment Confirmed!' : `Thanks, ${registeredName}!`}
              </h2>
              <p className="success-text-celebratory" style={{ fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 2rem auto', lineHeight: '1.6', color: 'var(--brand-text)' }}>
                {paymentSuccess
                  ? 'Your payment has been received and verified automatically. You will receive a confirmation email with your program details shortly.'
                  : 'Your registration has been submitted. We will send you a confirmation email shortly.'}
              </p>
              <div className="success-actions" style={{ justifyContent: 'center' }}>
                <button onClick={handleReset} className="submit-btn" style={{ width: 'auto', padding: '0.875rem 2rem' }}>
                  <Home size={18} />
                  <span>Home</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <img src="/sparklogo.png" alt="SPARK Logo" style={{ width: '60px', height: '60px', margin: '0 auto 0.5rem auto' }} />
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--brand-black-deep)', marginBottom: '0.2rem' }}>SPARK CPD Online Registration</h1>
                <p style={{ color: 'var(--brand-text)', fontSize: '0.9rem' }}>Complete the steps below to secure your spot</p>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '2rem', position: 'relative' }}>
                {/* Connecting Line */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  background: 'var(--brand-border)',
                  zIndex: 0
                }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--brand-orange)',
                    width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                  {steps.map(step => (
                    <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: step.id < currentStep ? 'var(--brand-orange)' : step.id === currentStep ? 'var(--brand-orange)' : 'var(--brand-white)',
                        border: `2px solid ${step.id <= currentStep ? 'var(--brand-orange)' : 'var(--brand-border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: step.id <= currentStep ? '#fff' : 'var(--brand-text)',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        boxShadow: step.id === currentStep ? '0 0 15px rgba(255, 94, 0, 0.3)' : 'none'
                      }}>
                        {step.id < currentStep ? <Check size={16} strokeWidth={3} /> : step.id}
                      </div>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: step.id === currentStep ? 'bold' : 'normal',
                        color: step.id <= currentStep ? 'var(--brand-black)' : 'var(--brand-text)',
                        textAlign: 'center'
                      }}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="error-message" style={{ marginBottom: '2rem' }}>
                  <AlertCircle size={20} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form Content */}
              <div className="step-content" style={{ minHeight: '300px' }}>
                {currentStep === 1 && (
                  <div className="step-1 fade-in" style={{ color: 'var(--brand-text)', lineHeight: '1.7' }}>


                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--brand-border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                        <strong style={{ color: 'var(--brand-black)' }}>WHAT:</strong> <span>Financial Literacy</span>
                        <strong style={{ color: 'var(--brand-black)' }}>WHEN:</strong> <span>May 29 to 31, 2026</span>
                        <strong style={{ color: 'var(--brand-black)' }}>WHERE:</strong> <span>Zoom Online Meeting</span>
                        <strong style={{ color: 'var(--brand-black)' }}>TIME:</strong> <span>8:00 AM to 11:00 AM</span>
                        <strong style={{ color: 'var(--brand-black)' }}>DURATION:</strong> <span>3 Hours</span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <h4 style={{ color: 'var(--brand-black)', marginBottom: '0.8rem', fontSize: '1.1rem', fontWeight: 'bold' }}>Topic Description:</h4>
                      <p>This CPD program equips participants with practical budgeting strategies they can immediately apply to manage their finances effectively by tracking income and expenses, identifying spending habits, setting financial goals, and building their own emergency funds. </p>
                    </div>

                    <div style={{ background: 'rgba(255, 94, 0, 0.05)', border: '1px solid rgba(255, 94, 0, 0.2)', padding: '20px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '1.1rem', color: 'var(--brand-black)', fontWeight: 'bold' }}>Investment Fee</span>
                        <span style={{ color: 'var(--brand-orange)', fontSize: '1.4rem', fontWeight: 'bold' }}>Php 300.00</span>
                      </div>
                      <div style={{ height: '1px', background: 'rgba(255, 94, 0, 0.2)', margin: '10px 0' }} />
                      <p style={{ fontSize: '0.95rem' }}><strong style={{ color: 'var(--brand-black)' }}>Inclusions:</strong> Online Learning Materials and E-Certificate with 4 CPD Units</p>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="step-2 fade-in" style={{ color: 'var(--brand-text)', lineHeight: '1.7' }}>
                    <h3 style={{ color: 'var(--brand-black-deep)', marginBottom: '1.5rem', fontSize: '1.4rem', fontWeight: 'bold' }}>Data Privacy Consent</h3>
                    <p style={{ marginBottom: '1.5rem' }}>Before proceeding with the Registration Form, kindly read through the consent form below and provide your approval.</p>

                    <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--brand-border)' }}>
                      <p style={{ marginBottom: '1rem' }}>Spark Yes Inc. CPD Program (“we”, “us”, “our”) respects your right to privacy. We are committed to collecting and protecting your personal data in accordance with applicable data privacy laws and regulations. Thus, we are providing this form to obtain your consent for us to collect, store and process your personal data as well as inform you of your rights as a data subject.</p>
                      <p style={{ marginBottom: '1rem' }}>This document is important so please read it carefully. It is designed to help you make informed decisions regarding the personal data you share with us and your privacy.</p>
                      <p style={{ color: 'var(--brand-black)', fontWeight: '600' }}>I have read this form, understood its contents and hereunder signify my consent for the collection and processing of my personal data.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--brand-black)', padding: '15px', borderRadius: '8px', transition: 'background 0.2s', background: consent === 'agree' ? 'rgba(255, 94, 0, 0.05)' : '#f8fafc', border: consent === 'agree' ? '1px solid rgba(255, 94, 0, 0.3)' : '1px solid var(--brand-border)' }}>
                        <input
                          type="radio"
                          name="consent"
                          value="agree"
                          checked={consent === 'agree'}
                          onChange={() => setConsent('agree')}
                          style={{ width: '20px', height: '20px', accentColor: 'var(--brand-orange)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '1.05rem', fontWeight: '500' }}>I AGREE to the terms and conditions stated in this consent form.</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--brand-black)', padding: '15px', borderRadius: '8px', transition: 'background 0.2s', background: consent === 'disagree' ? 'rgba(239, 68, 68, 0.05)' : '#f8fafc', border: consent === 'disagree' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--brand-border)' }}>
                        <input
                          type="radio"
                          name="consent"
                          value="disagree"
                          checked={consent === 'disagree'}
                          onChange={() => setConsent('disagree')}
                          style={{ width: '20px', height: '20px', accentColor: '#ef4444', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '1.05rem', fontWeight: '500' }}>I DO NOT AGREE to the terms and conditions stated in this consent form.</span>
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="step-3 fade-in">
                    <h3 style={{ color: 'var(--brand-black-deep)', marginBottom: '1.5rem', fontSize: '1.3rem', fontWeight: 'bold' }}>Personal Details</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>GIVEN NAME *</label>
                        <input type="text" name="givenName" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.givenName} onChange={handleChange} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>M.I.</label>
                        <input type="text" name="middleInitial" className="form-input" style={{ padding: '0.6rem 1rem', textAlign: 'center' }} value={formData.middleInitial} onChange={handleChange} maxLength={2} />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>LAST NAME *</label>
                        <input type="text" name="lastName" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.lastName} onChange={handleChange} required />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>PREFERRED NAME ON CERTIFICATE *</label>
                        <input type="text" name="preferredName" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.preferredName} onChange={handleChange} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>PERSONAL EMAIL *</label>
                        <input type="email" name="email" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.email} onChange={handleChange} required />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>CONTACT NUMBER *</label>
                        <input type="text" name="contactNumber" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.contactNumber} onChange={handleChange} maxLength={11} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>POSITION *</label>
                        <input type="text" name="position" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.position} onChange={handleChange} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>PRC ID NUMBER *</label>
                        <input type="text" name="prcId" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.prcId} onChange={handleChange} required />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '0' }}>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>NAME OF SCHOOL *</label>
                        <input type="text" name="schoolName" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.schoolName} onChange={handleChange} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>REGION *</label>
                        <input type="text" name="region" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.region} onChange={handleChange} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>DIVISION *</label>
                        <input type="text" name="division" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.division} onChange={handleChange} required />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="step-4 fade-in" style={{ color: 'var(--brand-text)' }}>
                    <h3 style={{ color: 'var(--brand-black-deep)', marginBottom: '2rem', fontSize: '1.4rem', fontWeight: 'bold' }}>Payment</h3>

                    {/* Order Summary */}
                    <div style={{ background: 'rgba(255, 94, 0, 0.05)', border: '1px solid rgba(255, 94, 0, 0.2)', padding: '24px', borderRadius: '12px', marginBottom: '2rem' }}>
                      <h4 style={{ color: 'var(--brand-black)', marginBottom: '1rem', fontSize: '1.05rem', fontWeight: 'bold' }}>Order Summary</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--brand-text)' }}>SPARK CPD — Financial Literacy</span>
                        <span style={{ color: 'var(--brand-black)', fontWeight: '500' }}>₱300.00</span>
                      </div>
                      <div style={{ height: '1px', background: 'rgba(255, 94, 0, 0.2)', margin: '12px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--brand-black)', fontWeight: 'bold', fontSize: '1.1rem' }}>Total</span>
                        <span style={{ color: 'var(--brand-orange)', fontWeight: 'bold', fontSize: '1.4rem' }}>₱300.00</span>
                      </div>
                    </div>

                    {/* Registrant Info */}
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--brand-border)' }}>
                      <h4 style={{ color: 'var(--brand-black)', marginBottom: '0.8rem', fontSize: '1rem', fontWeight: 'bold' }}>Registrant</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px 12px', fontSize: '0.95rem' }}>
                        <span style={{ color: 'var(--brand-text)' }}>Name:</span>
                        <span style={{ color: 'var(--brand-black)', fontWeight: '500' }}>{formData.givenName} {formData.middleInitial ? formData.middleInitial + '.' : ''} {formData.lastName}</span>
                        <span style={{ color: 'var(--brand-text)' }}>Email:</span>
                        <span style={{ color: 'var(--brand-black)', fontWeight: '500' }}>{formData.email}</span>
                        <span style={{ color: 'var(--brand-text)' }}>School:</span>
                        <span style={{ color: 'var(--brand-black)', fontWeight: '500' }}>{formData.schoolName}</span>
                      </div>
                    </div>

                    {/* GCash Payment Info */}
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--brand-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#007DFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CreditCard size={20} color="#fff" />
                        </div>
                        <div>
                          <p style={{ color: 'var(--brand-black)', fontWeight: 'bold', fontSize: '1rem', margin: 0 }}>Pay with GCash</p>
                          <p style={{ color: 'var(--brand-text)', fontSize: '0.85rem', margin: 0 }}>Secure payment via PayMongo</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--brand-text)', lineHeight: '1.6' }}>
                        Clicking the button below will redirect you to a secure PayMongo checkout page where you can complete your payment via GCash. You will be redirected back here after payment.
                      </p>
                    </div>

                    {/* Contact Info */}
                    <div style={{ background: '#f8fafc', border: '1px solid var(--brand-border)', padding: '15px', borderRadius: '12px' }}>
                      <p style={{ color: 'var(--brand-black)', fontWeight: 'bold', marginBottom: '5px' }}>Questions or concerns?</p>
                      <p>Nanelyn Bontoyan, PhD</p>
                      <p style={{ fontSize: '0.85rem' }}>CPD Programs Lead</p>
                      <a href="mailto:nanelyn.bontoyan@gmail.com" style={{ color: 'var(--brand-orange)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>nanelyn.bontoyan@gmail.com</a>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Actions */}
              <div className="form-actions" style={{ display: 'flex', gap: '15px', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--brand-border)' }}>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="submit-btn"
                    style={{ background: '#f1f5f9', color: 'var(--brand-black)', flex: 1 }}
                  >
                    Back
                  </button>
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="submit-btn"
                    style={{ flex: 2 }}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePayWithGcash}
                    className="submit-btn"
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="spinner" size={20} />
                        <span>Redirecting to GCash...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={20} />
                        <span>Pay ₱300 with GCash</span>
                        <ExternalLink size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default PaidRegistration;
