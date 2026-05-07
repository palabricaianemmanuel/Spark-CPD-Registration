import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Home, Upload, Check, ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';

const PH_REGIONS: Record<string, string[]> = {
  "Region I (Ilocos Region)": ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan", "Alaminos City", "Batac City", "Candon City", "Dagupan City", "Laoag City", "San Carlos City", "San Fernando City", "Urdaneta City", "Vigan City"],
  "Region II (Cagayan Valley)": ["Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino", "Cauayan City", "Ilagan City", "Santiago City", "Tuguegarao City"],
  "Region III (Central Luzon)": ["Aurora", "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales", "Angeles City", "Balanga City", "Cabanatuan City", "Gapan City", "Mabalacat City", "Malolos City", "Meycauayan City", "Olongapo City", "San Fernando City", "San Jose City", "San Jose del Monte City", "Science City of Muñoz", "Tarlac City"],
  "Region IV-A (CALABARZON)": ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal", "Antipolo City", "Bacoor City", "Batangas City", "Biñan City", "Cabuyao City", "Calamba City", "Cavite City", "Dasmariñas City", "General Trias City", "Imus City", "Lipa City", "Lucena City", "San Pablo City", "Santa Rosa City", "Santo Tomas City", "Tanauan City", "Tayabas City"],
  "Region IV-B (MIMAROPA)": ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon", "Calapan City", "Puerto Princesa City"],
  "Region V (Bicol Region)": ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon", "Iriga City", "Legazpi City", "Ligao City", "Masbate City", "Naga City", "Sorsogon City", "Tabaco City"],
  "Region VI (Western Visayas)": ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental", "Bacolod City", "Bago City", "Cadiz City", "Escalante City", "Himamaylan City", "Iloilo City", "Kabankalan City", "La Carlota City", "Passi City", "Roxas City", "Sagay City", "San Carlos City", "Silay City", "Sipalay City", "Victorias City"],
  "Region VII (Central Visayas)": ["Bohol", "Cebu", "Negros Oriental", "Siquijor", "Bais City", "Bayawan City", "Bogo City", "Canlaon City", "Carcar City", "Cebu City", "Danao City", "Dumaguete City", "Guihulngan City", "Lapu-Lapu City", "Mandaue City", "Naga City", "Tagbilaran City", "Talisay City", "Tanjay City", "Toledo City"],
  "Region VIII (Eastern Visayas)": ["Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte", "Baybay City", "Borongan City", "Calbayog City", "Catbalogan City", "Maasin City", "Ormoc City", "Tacloban City"],
  "Region IX (Zamboanga Peninsula)": ["Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay", "Dapitan City", "Dipolog City", "Isabela City", "Pagadian City", "Zamboanga City"],
  "Region X (Northern Mindanao)": ["Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental", "Cagayan de Oro City", "El Salvador City", "Gingoog City", "Iligan City", "Malaybalay City", "Oroquieta City", "Ozamiz City", "Tangub City", "Valencia City"],
  "Region XI (Davao Region)": ["Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental", "Davao City", "Digos City", "Mati City", "Panabo City", "Island Garden City of Samal", "Tagum City"],
  "Region XII (SOCCSKSARGEN)": ["Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat", "Kidapawan City", "Koronadal City", "General Santos City", "Tacurong City"],
  "Region XIII (Caraga)": ["Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur", "Bayugan City", "Bislig City", "Butuan City", "Cabadbaran City", "Surigao City", "Tandag City"],
  "NCR (National Capital Region)": ["Caloocan City", "Las Piñas City", "Makati City", "Malabon City", "Mandaluyong City", "Manila", "Marikina City", "Muntinlupa City", "Navotas City", "Parañaque City", "Pasay City", "Pasig City", "Quezon City", "San Juan City", "Taguig City", "Valenzuela City"],
  "CAR (Cordillera Administrative Region)": ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province", "Baguio City", "Tabuk City"],
  "BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)": ["Basilan", "Lanao del Sur", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi", "Cotabato City", "Marawi City"]
};

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  errorGlow?: boolean;
  onDisabledClick?: () => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, placeholder, disabled, errorGlow, onDisabledClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Sync local input state with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleToggle = () => {
    if (disabled) {
      if (onDisabledClick) onDisabledClick();
      return;
    }
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    onChange(e.target.value); // Let parent know of partial changes too
  };

  const handleSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
  };

  const filteredOptions = (options || []).filter(opt => 
    opt.toLowerCase().includes((inputValue || '').toLowerCase())
  );

  return (
    <div className="relative w-full" style={{ zIndex: isOpen ? 50 : 1 }}>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div 
        className={`form-input flex justify-between items-center transition-all duration-300 relative z-50
          ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'bg-white cursor-text'}
          ${errorGlow ? 'shadow-[0_0_15px_rgba(255,94,0,0.4)] border-[var(--brand-orange)] ring-1 ring-[var(--brand-orange)]' : ''}
          ${isOpen ? 'border-[var(--brand-orange)] ring-1 ring-[var(--brand-orange)]' : 'border-[var(--brand-border)]'}
        `}
        style={{ padding: '0.6rem 1rem', minHeight: '42px', borderRadius: '8px' }}
        onClick={handleToggle}
      >
        <input 
          type="text"
          className={`w-full bg-transparent border-none outline-none text-[0.95rem] ${disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-text text-[var(--brand-black)]'}`}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled}
        />
        <ChevronDown 
          size={18} 
          className={`transition-transform duration-300 cursor-pointer flex-shrink-0 ml-2 ${isOpen ? 'rotate-180 text-[var(--brand-orange)]' : 'text-gray-400'}`} 
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
        />
      </div>

      <div 
        className={`absolute top-full left-0 w-full mt-2 bg-white border border-[var(--brand-border)] rounded-lg shadow-xl z-50 overflow-hidden transition-all duration-200 transform origin-top
          ${isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}
        `}
      >
        <div className="max-h-60 overflow-y-auto py-1">
          {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
            <div
              key={opt}
              className={`px-4 py-2.5 cursor-pointer transition-colors duration-200 text-sm
                ${value === opt ? 'bg-[rgba(255,94,0,0.1)] text-[var(--brand-orange)] font-medium' : 'text-[var(--brand-text)] hover:bg-slate-50'}
              `}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </div>
          )) : (
            <div className="px-4 py-3 text-sm text-gray-500 italic">No matches found</div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showShake, setShowShake] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [introKey, setIntroKey] = useState(0);
  const [hasManuallyEditedPreferredName, setHasManuallyEditedPreferredName] = useState(false);

  const [regionErrorGlow, setRegionErrorGlow] = useState(false);

  const handleDivisionClickWhenDisabled = () => {
    if (!formData.region) {
      setRegionErrorGlow(true);
      triggerShake();
      setTimeout(() => setRegionErrorGlow(false), 2000);
    }
  };

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

      // Clear division if region changes
      if (name === 'region') {
        next.division = '';
      }

      return next;
    });

    if (name === 'preferredName') {
      setHasManuallyEditedPreferredName(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setError('Only JPG, JPEG, PNG  & PDF files are accepted.');
        setProofFile(null);
        triggerShake();
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must not exceed 10 MB.');
        setProofFile(null);
        triggerShake();
        return;
      }
      setError(null);
      setProofFile(file);
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
    setProofFile(null);
    setHasManuallyEditedPreferredName(false);
    setSuccess(false);
    setError(null);
    setShowIntro(true);
    setIntroKey(prev => prev + 1);
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

      if (contactNumber.length !== 11) {
        setError('Contact number must be exactly 11 digits.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      setError('Please upload your proof of payment.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${Date.now()}_${formData.lastName.replace(/\s+/g, '_')}_payment.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(fileName, proofFile);

      if (uploadError) {
        throw new Error('Failed to upload proof of payment. ' + uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from('payment_proofs')
        .getPublicUrl(uploadData.path);

      const fileUrl = publicUrlData.publicUrl;

      const { error: insertError } = await supabase
        .from('paid_registration')
        .insert([
          {
            given_name: formData.givenName,
            middle_initial: formData.middleInitial,
            last_name: formData.lastName,
            preferred_name: formData.preferredName,
            email: formData.email,
            contact_number: formData.contactNumber,
            position: formData.position,
            school_name: formData.schoolName,
            region: formData.region,
            division: formData.division,
            prc_id: formData.prcId,
            proof_of_payment_url: fileUrl
          }
        ]);

      if (insertError) {
        throw insertError;
      }

      setRegisteredName(formData.givenName);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.message || 'An error occurred. Please try again.');
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
                Thanks, {registeredName}!
              </h2>
              <p className="success-text-celebratory" style={{ fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 2rem auto', lineHeight: '1.6', color: 'var(--brand-text)' }}>
                Your registration and payment proof have been successfully submitted. We will review your payment and send you a confirmation email shortly.
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
                      <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-2.5">
                        <strong style={{ color: 'var(--brand-black)' }}>WHAT:</strong> <span>Financial Literacy</span>
                        <strong style={{ color: 'var(--brand-black)' }}>WHEN:</strong> <span>May 29 to 31, 2026</span>
                        <strong style={{ color: 'var(--brand-black)' }}>WHERE:</strong> <span>Zoom Online Meeting</span>
                        <strong style={{ color: 'var(--brand-black)' }}>TIME:</strong> <span>7:00 PM to 10:00 PM</span>
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

                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr] gap-4 mb-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>PREFERRED NAME ON CERTIFICATE *</label>
                        <input type="text" name="preferredName" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.preferredName} onChange={handleChange} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>PERSONAL EMAIL *</label>
                        <input type="email" name="email" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.email} onChange={handleChange} placeholder="example@email.com" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>CONTACT NUMBER *</label>
                        <input type="text" name="contactNumber" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.contactNumber} onChange={handleChange} maxLength={11} placeholder="09123456789" required />
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

                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4 mb-0">
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>NAME OF SCHOOL *</label>
                        <input type="text" name="schoolName" className="form-input" style={{ padding: '0.6rem 1rem' }} value={formData.schoolName} onChange={handleChange} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>REGION *</label>
                        <CustomSelect 
                          options={Object.keys(PH_REGIONS)}
                          value={formData.region}
                          onChange={(val) => handleChange({ target: { name: 'region', value: val } } as any)}
                          placeholder="Select Region"
                          errorGlow={regionErrorGlow}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>DIVISION *</label>
                        <CustomSelect 
                          options={formData.region ? PH_REGIONS[formData.region] : []}
                          value={formData.division}
                          onChange={(val) => handleChange({ target: { name: 'division', value: val } } as any)}
                          placeholder="Select Division"
                          disabled={!formData.region}
                          onDisabledClick={handleDivisionClickWhenDisabled}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="step-4 fade-in" style={{ color: 'var(--brand-text)' }}>
                    <h3 style={{ color: 'var(--brand-black-deep)', marginBottom: '2rem', fontSize: '1.4rem', fontWeight: 'bold' }}>Payment Process</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Column: QR and Info */}
                      <div>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <h4 style={{ color: 'var(--brand-black)', marginBottom: '0.8rem', fontSize: '1.1rem', fontWeight: 'bold' }}>STEP 1: Scan GCash QR</h4>
                          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>(Note: We only accept GCash Payment for now)</p>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--brand-border)' }}>
                            <img src="/zoomed-gcash-qr.png" alt="GCash QR Code" style={{ width: '180px', height: '180px', objectFit: 'contain', background: '#fff', padding: '10px', borderRadius: '12px', marginBottom: '15px', border: '1px dashed #ccc' }} />
                            <p style={{ color: 'var(--brand-black)', fontWeight: 'bold', fontSize: '1.1rem' }}>Regina Schelle Palabrica</p>
                            <p style={{ fontSize: '1.2rem', letterSpacing: '1px', marginTop: '5px' }}>0915 671 4332</p>
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid var(--brand-border)', padding: '15px', borderRadius: '12px' }}>
                          <p style={{ color: 'var(--brand-black)', fontWeight: 'bold', marginBottom: '5px' }}>Questions or concerns?</p>
                          <p>Nanelyn Bontoyan, PhD</p>
                          <p style={{ fontSize: '0.85rem' }}>CPD Programs Lead</p>
                          <a href="mailto:nanelyn.bontoyan@gmail.com" style={{ color: 'var(--brand-orange)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>nanelyn.bontoyan@gmail.com</a>
                        </div>
                      </div>

                      {/* Right Column: Upload */}
                      <div>
                        <h4 style={{ color: 'var(--brand-black)', marginBottom: '0.8rem', fontSize: '1.1rem', fontWeight: 'bold' }}>STEP 2: Upload Proof</h4>

                        <div style={{ background: 'rgba(255, 94, 0, 0.05)', border: '1px solid rgba(255, 94, 0, 0.2)', padding: '15px', borderRadius: '12px', marginBottom: '1.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--brand-black)', fontWeight: '500' }}>Total Due</span>
                            <span style={{ color: 'var(--brand-orange)', fontWeight: 'bold', fontSize: '1.2rem' }}>Php 300.00</span>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.85rem', marginBottom: '15px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid var(--brand-border)' }}>
                          <p style={{ color: 'var(--brand-black)', fontWeight: 'bold', marginBottom: '8px' }}>Important Notes:</p>
                          <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li>Only JPG, JPEG, PNG, & PDF files are accepted</li>
                            <li>Ensure Amount and Reference Number are clearly visible</li>
                            <li>Rename file: <strong>&lt;Your Name - School - CPD Payment&gt;</strong></li>
                          </ul>
                        </div>

                        <label className="upload-container" style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2.5rem 1rem',
                          border: proofFile ? '2px solid var(--brand-orange)' : '2px dashed #cbd5e1',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          background: proofFile ? 'rgba(255, 94, 0, 0.05)' : '#f8fafc'
                        }}>
                          {proofFile ? (
                            <>
                              <CheckCircle size={40} style={{ color: 'var(--brand-orange)', marginBottom: '15px' }} />
                              <span style={{ color: 'var(--brand-black)', fontWeight: '500', textAlign: 'center', wordBreak: 'break-all' }}>{proofFile.name}</span>
                              <span style={{ fontSize: '0.8rem', marginTop: '10px', color: 'var(--brand-text)' }}>Click to change file</span>
                            </>
                          ) : (
                            <>
                              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255, 94, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                                <Upload size={28} style={{ color: 'var(--brand-orange)' }} />
                              </div>
                              <span style={{ color: 'var(--brand-black)', fontWeight: '500', fontSize: '1.1rem' }}>Upload Receipt</span>
                              <span style={{ fontSize: '0.85rem', marginTop: '8px' }}>JPG, JPEG, PNG or PDF (Max. 10MB)</span>
                            </>
                          )}
                          <input type="file" accept=".pdf, .jpg, .jpeg, .png, image/png, image/jpeg" onChange={handleFileChange} style={{ display: 'none' }} />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Actions */}
              <div className="form-actions flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t" style={{ borderColor: 'var(--brand-border)' }}>
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
                    onClick={handleSubmit}
                    className="submit-btn"
                    style={{ flex: 2 }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="spinner" size={20} />
                        <span>Processing...</span>
                      </>
                    ) : (
                      'Submit Registration'
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
