import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ShieldCheck,
  Ticket,
  MapPin,
  Check,
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react';

const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="input-error-text flex items-center gap-1">
      <AlertCircle size={14} aria-hidden="true" /> {message}
    </p>
  ) : null;

const Progress = ({ steps }) => (
  <ol className="flex items-center justify-between gap-2 card px-4 py-3 mb-6" aria-label="Booking progress">
    {steps.map((s, i) => (
      <li key={s.label} className="flex items-center gap-2 min-w-0">
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold shrink-0 ${
            s.done ? 'bg-green text-white' : 'bg-fill text-secondary'
          }`}
          aria-hidden="true"
        >
          {s.done ? <Check size={13} strokeWidth={3} /> : i + 1}
        </span>
        <span className={`text-footnote font-medium leading-tight ${s.done ? 'text-label' : 'text-secondary'}`}>
          <span className="sr-only">Step {i + 1}, {s.done ? 'complete' : 'pending'}: </span>
          {s.label}
        </span>
      </li>
    ))}
  </ol>
);

export const PatientBookingPage = ({ onNavigateToTracker }) => {
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    patientAge: '',
    patientGender: 'Male',
    reason: ''
  });

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const availableSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'
  ];

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (!showOtpModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !isVerifying) setShowOtpModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showOtpModal, isVerifying]);

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    setDoctorsError('');
    try {
      const data = await api.getDoctors();
      setDoctors(data.doctors || []);
      if (data.doctors && data.doctors.length > 0) {
        setSelectedDoctor(data.doctors[0]);
      }
    } catch (err) {
      setDoctorsError(err.message || 'Unable to load doctors right now.');
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!formData.patientName.trim()) next.patientName = 'Enter your full name.';
    if (!formData.patientPhone.trim()) next.patientPhone = 'Enter your mobile number so we can send the code.';
    if (!selectedDoctor) next.doctor = 'Choose a doctor to continue.';
    if (!selectedSlot) next.slot = 'Pick a time slot to continue.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const firstId = next.patientName ? 'patientName' : next.patientPhone ? 'patientPhone' : next.doctor ? 'doctor-error' : 'slot-error';
      document.getElementById(firstId)?.scrollIntoView?.({ block: 'center' });
      return;
    }
    setOtpCode('1234');
    setOtpError('');
    setShowOtpModal(true);
  };

  const handleConfirmOtp = async () => {
    setIsVerifying(true);
    setOtpError('');

    try {
      await api.verifyOTP({ phone: formData.patientPhone, otp: otpCode });

      const result = await api.bookAppointment({
        ...formData,
        doctorId: selectedDoctor.id,
        appointmentDate: selectedDate,
        slotTime: selectedSlot
      });

      setShowOtpModal(false);
      setConfirmedBooking(result.appointment);

      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      setOtpError(err.message || 'That code did not match. Check the SMS and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const steps = [
    { label: 'Doctor', done: !!selectedDoctor },
    { label: 'Date and time', done: !!selectedSlot },
    { label: 'Your details', done: !!formData.patientName.trim() && !!formData.patientPhone.trim() }
  ];

  const fieldClass = (hasError) => `input-base ${hasError ? 'input-error' : ''}`;

  return (
    <div className="max-w-6xl w-full min-w-0 mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-36 lg:pb-10">
      <header className="mb-6 sm:mb-8 animate-fade-in">
        <h1 className="page-title">Book an appointment</h1>
        <p className="page-subtitle">Pick a doctor and a time. We send queue updates to your phone.</p>
      </header>

      {confirmedBooking ? (
        <section aria-live="polite" className="max-w-xl mx-auto card p-6 sm:p-8 text-center">
          <span className="icon-tile icon-tile-green w-14 h-14 rounded-2xl mx-auto mb-4">
            <CheckCircle2 size={30} aria-hidden="true" />
          </span>

          <p className="text-footnote font-semibold text-green uppercase tracking-wide">Booking confirmed</p>
          <h2 className="token-badge text-title1 mt-1 text-label">#{confirmedBooking.appointmentNumber}</h2>
          <p className="text-subheadline text-secondary mt-2">
            A confirmation has been sent to <span className="tabular text-label">{confirmedBooking.patientPhone}</span>.
          </p>

          <dl className="list-inset my-6 text-left">
            {[
              ['Patient', confirmedBooking.patientName],
              ['Doctor', `${confirmedBooking.doctorName} (${confirmedBooking.specialization})`],
              ['Date and time', `${confirmedBooking.appointmentDate} at ${confirmedBooking.slotTime}`],
              ['Room', confirmedBooking.roomNumber]
            ].map(([label, value]) => (
              <div key={label} className="list-row justify-between">
                <dt className="text-secondary shrink-0">{label}</dt>
                <dd className="text-label text-right">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex items-start gap-3 text-left text-subheadline text-secondary rounded-control bg-accent-tint p-4 mb-6">
            <Info size={18} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong className="text-label font-semibold">Fast OPD check in:</strong> show this booking ID at reception when you arrive to receive your live queue token.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" onClick={() => setConfirmedBooking(null)} className="btn-secondary flex-1">
              Book another appointment
            </button>
            <button type="button" onClick={() => onNavigateToTracker && onNavigateToTracker()} className="btn-primary flex-1">
              <Ticket size={16} aria-hidden="true" /> Track live queue
            </button>
          </div>
        </section>
      ) : (
        <>
          <Progress steps={steps} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <section className="lg:col-span-5 space-y-2" aria-labelledby="step-doctor">
              <h2 id="step-doctor" className="section-title px-4">Doctor</h2>

              {doctorsLoading && (
                <div className="list-inset" aria-busy="true" aria-label="Loading doctors">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="list-row py-3">
                      <div className="w-11 h-11 rounded-full skeleton shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-1/2 skeleton" />
                        <div className="h-3 w-1/3 skeleton" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!doctorsLoading && doctorsError && (
                <div role="alert" className="card p-5 text-center">
                  <AlertCircle size={22} className="text-red mx-auto mb-2" aria-hidden="true" />
                  <p className="text-subheadline text-red">{doctorsError}</p>
                  <button type="button" onClick={loadDoctors} className="btn-secondary mt-3">
                    <RefreshCw size={14} aria-hidden="true" /> Try again
                  </button>
                </div>
              )}

              {!doctorsLoading && !doctorsError && doctors.length === 0 && (
                <div className="empty-state">
                  <Stethoscope size={24} className="mx-auto mb-2" aria-hidden="true" />
                  <p className="text-body font-medium text-label">No doctors available today</p>
                  <p className="mt-1">Check back later or contact reception.</p>
                </div>
              )}

              {doctors.length > 0 && (
                <div className="list-inset" role="radiogroup" aria-label="Doctors">
                  {doctors.map((doc) => {
                    const isSelected = selectedDoctor?.id === doc.id;
                    return (
                      <button
                        type="button"
                        key={doc.id}
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setErrors(prev => ({ ...prev, doctor: '' }));
                        }}
                        className="list-row w-full text-left py-3 pr-4 active:bg-fill focus-visible:outline-offset-[-2px]"
                      >
                        <img src={doc.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover bg-fill shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-headline truncate">{doc.name}</p>
                          <p className="text-subheadline text-secondary truncate">{doc.specialization}</p>
                          <p className={`text-footnote mt-0.5 ${doc.waitingCount === 0 ? 'text-green' : 'text-secondary'}`}>
                            {doc.roomNumber}
                            {' · '}
                            {doc.waitingCount === 0 ? 'No wait' : `~${doc.estimatedWaitTime} min wait, ${doc.waitingCount} in line`}
                          </p>
                        </div>
                        <span className="text-body tabular text-secondary shrink-0">₹{doc.fee}</span>
                        <span className="w-5 flex justify-center shrink-0" aria-hidden="true">
                          {isSelected && <Check size={20} strokeWidth={2.5} className="text-accent" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="px-4">
                <FieldError id="doctor-error" message={errors.doctor} />
              </div>
            </section>

            <div className="lg:col-span-7">
              <form onSubmit={handleInitialSubmit} noValidate className="space-y-7">
                <section aria-labelledby="step-slot" className="space-y-2">
                  <h2 id="step-slot" className="section-title px-4">Date and time</h2>

                  <div className="card p-4 sm:p-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="booking-date" className="input-label">Date</label>
                        <input
                          id="booking-date"
                          type="date"
                          value={selectedDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="input-base"
                        />
                      </div>
                      <div>
                        <span className="input-label">Room</span>
                        <div className="input-base flex items-center gap-2 text-secondary">
                          <MapPin size={16} aria-hidden="true" />
                          {selectedDoctor?.roomNumber || 'Select a doctor first'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span id="slot-label" className="input-label mb-0">Time</span>
                        {selectedSlot && <span className="text-subheadline text-accent tabular">{selectedSlot}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="slot-label">
                        {availableSlots.map((slot) => {
                          const isSelected = selectedSlot === slot;
                          return (
                            <button
                              type="button"
                              key={slot}
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => {
                                setSelectedSlot(slot);
                                setErrors(prev => ({ ...prev, slot: '' }));
                              }}
                              className={`min-h-[44px] px-4 rounded-full text-subheadline font-semibold tabular transition-colors duration-150 active:scale-[0.97] ${
                                isSelected ? 'bg-accent text-white' : 'bg-fill text-label hover:bg-separator'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      <FieldError id="slot-error" message={errors.slot} />
                    </div>
                  </div>
                </section>

                <section aria-labelledby="step-details" className="space-y-2">
                  <h2 id="step-details" className="section-title px-4">Your details</h2>

                  <div className="card p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="patientName" className="input-label">Full name</label>
                        <input
                          id="patientName"
                          type="text"
                          name="patientName"
                          required
                          autoComplete="name"
                          aria-invalid={!!errors.patientName}
                          aria-describedby={errors.patientName ? 'patientName-error' : undefined}
                          placeholder="e.g. Rahul Sharma"
                          value={formData.patientName}
                          onChange={handleInputChange}
                          className={fieldClass(errors.patientName)}
                        />
                        <FieldError id="patientName-error" message={errors.patientName} />
                      </div>

                      <div>
                        <label htmlFor="patientPhone" className="input-label">Mobile number</label>
                        <input
                          id="patientPhone"
                          type="tel"
                          name="patientPhone"
                          required
                          inputMode="tel"
                          autoComplete="tel"
                          aria-invalid={!!errors.patientPhone}
                          aria-describedby={errors.patientPhone ? 'patientPhone-error' : 'patientPhone-hint'}
                          placeholder="+91 98765 43210"
                          value={formData.patientPhone}
                          onChange={handleInputChange}
                          className={`${fieldClass(errors.patientPhone)} tabular`}
                        />
                        {!errors.patientPhone && (
                          <p id="patientPhone-hint" className="input-hint">We send the verification code and queue updates here.</p>
                        )}
                        <FieldError id="patientPhone-error" message={errors.patientPhone} />
                      </div>

                      <div>
                        <label htmlFor="patientAge" className="input-label">Age</label>
                        <input
                          id="patientAge"
                          type="number"
                          name="patientAge"
                          inputMode="numeric"
                          min="0"
                          max="120"
                          placeholder="e.g. 34"
                          value={formData.patientAge}
                          onChange={handleInputChange}
                          className="input-base tabular"
                        />
                      </div>

                      <div>
                        <label htmlFor="patientGender" className="input-label">Gender</label>
                        <select
                          id="patientGender"
                          name="patientGender"
                          value={formData.patientGender}
                          onChange={handleInputChange}
                          className="input-base"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label htmlFor="reason" className="input-label">
                        Reason for visit <span className="text-secondary font-normal">(optional)</span>
                      </label>
                      <input
                        id="reason"
                        type="text"
                        name="reason"
                        placeholder="e.g. Mild chest pain, routine review"
                        value={formData.reason}
                        onChange={handleInputChange}
                        className="input-base"
                      />
                    </div>
                  </div>
                </section>

                <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:glass max-lg:border-x-0 max-lg:border-b-0 max-lg:px-4 max-lg:pt-3 max-lg:pb-[88px]">
                  <div className="max-w-6xl mx-auto space-y-2">
                    <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
                      <ShieldCheck size={18} aria-hidden="true" />
                      Continue to phone verification
                    </button>
                    <p className="hidden lg:block text-center text-footnote text-secondary">
                      Name and mobile number are required. A one time code will be sent to your phone.
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {showOtpModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/35 animate-fade-in"
          onClick={() => !isVerifying && setShowOtpModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="otp-title"
            aria-describedby="otp-desc"
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-t-sheet sm:rounded-sheet w-full sm:max-w-md px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-7 animate-slide-up sm:animate-scale-in"
          >
            <div className="w-9 h-1 rounded-full bg-tertiary mx-auto mb-5 sm:hidden" aria-hidden="true" />

            <span className="icon-tile w-12 h-12 rounded-xl mx-auto mb-4 flex">
              <ShieldCheck size={24} aria-hidden="true" />
            </span>

            <h3 id="otp-title" className="text-title2 text-center text-label">Verify your phone number</h3>
            <p id="otp-desc" className="text-subheadline text-center text-secondary mt-1.5">
              Enter the 4 digit code sent to <span className="tabular text-label">{formData.patientPhone}</span>
            </p>

            <div className="my-6">
              <label htmlFor="otp-code" className="sr-only">One time code</label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="1234"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && otpCode && !isVerifying) handleConfirmOtp();
                }}
                aria-invalid={!!otpError}
                aria-describedby={otpError ? 'otp-error' : 'otp-hint'}
                className={`input-base text-center text-title1 tabular tracking-[0.3em] min-h-[64px] ${otpError ? 'input-error' : ''}`}
              />
              <p id="otp-hint" className="text-center text-footnote text-secondary mt-3">
                Demo code: <code className="text-accent font-semibold">1234</code>
              </p>
              {otpError && (
                <p id="otp-error" role="alert" className="input-error-text text-center flex items-center justify-center gap-1 mt-2">
                  <AlertCircle size={14} aria-hidden="true" /> {otpError}
                </p>
              )}
            </div>

            <div className="flex gap-2.5">
              <button type="button" onClick={() => setShowOtpModal(false)} disabled={isVerifying} className="btn-secondary flex-1 btn-lg">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmOtp} disabled={isVerifying || !otpCode} className="btn-primary flex-1 btn-lg">
                {isVerifying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Verifying
                  </>
                ) : (
                  'Confirm and book'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
