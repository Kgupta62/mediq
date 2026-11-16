export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS clinics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    openTime TEXT,
    closeTime TEXT,
    activeNotice TEXT
  );

  CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    specialization TEXT,
    experience TEXT,
    roomNumber TEXT NOT NULL,
    fee INTEGER DEFAULT 500,
    bio TEXT,
    avatarUrl TEXT,
    isAvailable INTEGER DEFAULT 1,
    currentServingTokenId TEXT,
    todayQueueCount INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    doctorId TEXT,
    avatar TEXT
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    appointmentNumber TEXT UNIQUE NOT NULL,
    patientName TEXT NOT NULL,
    patientPhone TEXT NOT NULL,
    patientAge INTEGER,
    patientGender TEXT,
    doctorId TEXT REFERENCES doctors(id),
    doctorName TEXT,
    specialization TEXT,
    roomNumber TEXT,
    appointmentDate TEXT NOT NULL,
    slotTime TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'booked',
    tokenNumber INTEGER,
    displayToken TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS queue_tokens (
    id TEXT PRIMARY KEY,
    tokenNumber INTEGER NOT NULL,
    displayToken TEXT NOT NULL,
    tokenType TEXT DEFAULT 'walk_in',
    patientName TEXT NOT NULL,
    patientPhone TEXT NOT NULL,
    patientAge INTEGER,
    patientGender TEXT,
    reason TEXT,
    doctorId TEXT REFERENCES doctors(id),
    roomNumber TEXT NOT NULL,
    status TEXT DEFAULT 'waiting',
    priorityLevel INTEGER DEFAULT 1,
    appointmentId TEXT REFERENCES appointments(id),
    checkInTime TEXT NOT NULL,
    calledTime TEXT,
    completedTime TEXT,
    waitTimeMinutes INTEGER DEFAULT 0,
    serviceTimeMinutes INTEGER DEFAULT 0,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS consultations (
    id TEXT PRIMARY KEY,
    tokenId TEXT,
    doctorId TEXT REFERENCES doctors(id),
    patientName TEXT NOT NULL,
    patientPhone TEXT,
    patientAge INTEGER,
    patientGender TEXT,
    diagnosis TEXT,
    prescription TEXT,
    vitals TEXT,
    notes TEXT,
    followUpDate TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipientPhone TEXT NOT NULL,
    channel TEXT NOT NULL,
    messageType TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'delivered',
    timestamp TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_tokens_doctor_status ON queue_tokens(doctorId, status);
  CREATE INDEX IF NOT EXISTS idx_tokens_status ON queue_tokens(status);
  CREATE INDEX IF NOT EXISTS idx_tokens_patient_phone ON queue_tokens(patientPhone);
  CREATE INDEX IF NOT EXISTS idx_tokens_display ON queue_tokens(displayToken);
  CREATE INDEX IF NOT EXISTS idx_tokens_number ON queue_tokens(tokenNumber);
  CREATE INDEX IF NOT EXISTS idx_tokens_order ON queue_tokens(priorityLevel, checkInTime);
  CREATE INDEX IF NOT EXISTS idx_appointments_date_doc ON appointments(appointmentDate, doctorId);
  CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
  CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments(patientPhone);
  CREATE INDEX IF NOT EXISTS idx_appointments_created ON appointments(created_at);
  CREATE INDEX IF NOT EXISTS idx_consultations_doc ON consultations(doctorId);
  CREATE INDEX IF NOT EXISTS idx_consultations_token ON consultations(tokenId);
  CREATE INDEX IF NOT EXISTS idx_consultations_phone ON consultations(patientPhone);
  CREATE INDEX IF NOT EXISTS idx_notifications_time ON notifications(timestamp);
`;

export const defaultState = {
  clinic: {
    id: 'clinic-1',
    name: 'MediQ Health Clinic & OPD Centre',
    tagline: 'Smart Healthcare & Real-Time Queue Management',
    address: '42, Health City Avenue, Sector 5, Medical District',
    phone: '+91 98765 43210',
    email: 'helpdesk@mediq.health',
    openTime: '08:00 AM',
    closeTime: '08:00 PM',
    activeNotice: 'Please maintain physical queue distance. Emergency cases are prioritized.'
  },
  doctors: [
    {
      id: 'doc-1',
      name: 'Dr. Rajesh Sharma',
      title: 'Senior Consultant Cardiologist',
      specialization: 'Cardiology',
      experience: '16 Years',
      roomNumber: 'Room 101 (Floor 1)',
      fee: 600,
      bio: 'MBBS, MD, DM (Cardiology). AIIMS Gold Medalist specializing in cardiovascular wellness and hypertension management.',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80',
      isAvailable: 1,
      currentServingTokenId: null,
      todayQueueCount: 0
    },
    {
      id: 'doc-2',
      name: 'Dr. Priya Patel',
      title: 'General Physician & Diabetologist',
      specialization: 'General Medicine',
      experience: '11 Years',
      roomNumber: 'Room 102 (Floor 1)',
      fee: 400,
      bio: 'MBBS, DNB (Internal Medicine). Expertise in acute care, seasonal infections, diabetes lifestyle care and preventive health.',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      isAvailable: 1,
      currentServingTokenId: null,
      todayQueueCount: 0
    },
    {
      id: 'doc-3',
      name: 'Dr. Ananya Verma',
      title: 'Consultant Pediatrician & Child Specialist',
      specialization: 'Pediatrics',
      experience: '9 Years',
      roomNumber: 'Room 103 (Floor 1)',
      fee: 500,
      bio: 'MBBS, MD (Pediatrics). Friendly and compassionate child healthcare, infant vaccinations, and developmental care.',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80',
      isAvailable: 1,
      currentServingTokenId: null,
      todayQueueCount: 0
    }
  ],
  users: [
    {
      id: 'usr-1',
      name: 'Sunita Sharma',
      email: 'receptionist@clinic.com',
      password: 'password123',
      role: 'receptionist',
      avatar: '👩‍💼',
      doctorId: null
    },
    {
      id: 'usr-2',
      name: 'Dr. Rajesh Sharma',
      email: 'doctor.sharma@clinic.com',
      password: 'password123',
      role: 'doctor',
      doctorId: 'doc-1',
      avatar: '👨‍⚕️'
    },
    {
      id: 'usr-3',
      name: 'Dr. Priya Patel',
      email: 'doctor.patel@clinic.com',
      password: 'password123',
      role: 'doctor',
      doctorId: 'doc-2',
      avatar: '👩‍⚕️'
    },
    {
      id: 'usr-4',
      name: 'Dr. Ananya Verma',
      email: 'doctor.ananya@clinic.com',
      password: 'password123',
      role: 'doctor',
      doctorId: 'doc-3',
      avatar: '👩‍⚕️'
    }
  ]
};

export const POSTGRES_SCHEMA = `
-- MediQ Hospital & Queue Management Production Schema
CREATE TABLE IF NOT EXISTS clinics (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    tagline VARCHAR(256),
    address TEXT,
    phone VARCHAR(32),
    email VARCHAR(128),
    open_time VARCHAR(32),
    close_time VARCHAR(32),
    active_notice TEXT
);

CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    title VARCHAR(128),
    specialization VARCHAR(128) NOT NULL,
    experience VARCHAR(64),
    room_number VARCHAR(32) NOT NULL,
    fee INTEGER DEFAULT 500,
    bio TEXT,
    avatar_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    current_serving_token_id VARCHAR(64),
    today_queue_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    appointment_number VARCHAR(32) UNIQUE NOT NULL,
    patient_name VARCHAR(128) NOT NULL,
    patient_phone VARCHAR(32) NOT NULL,
    patient_age INTEGER,
    patient_gender VARCHAR(16),
    doctor_id VARCHAR(64) REFERENCES doctors(id) ON DELETE RESTRICT,
    doctor_name VARCHAR(128),
    specialization VARCHAR(128),
    room_number VARCHAR(32),
    appointment_date DATE NOT NULL,
    slot_time VARCHAR(32) NOT NULL,
    reason TEXT,
    status VARCHAR(32) DEFAULT 'booked',
    token_number INTEGER,
    display_token VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queue_tokens (
    id VARCHAR(64) PRIMARY KEY,
    token_number INTEGER NOT NULL,
    display_token VARCHAR(32) NOT NULL,
    token_type VARCHAR(32) DEFAULT 'walk_in',
    patient_name VARCHAR(128) NOT NULL,
    patient_phone VARCHAR(32) NOT NULL,
    patient_age INTEGER,
    patient_gender VARCHAR(16),
    reason TEXT,
    doctor_id VARCHAR(64) REFERENCES doctors(id) ON DELETE CASCADE,
    room_number VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'waiting',
    priority_level INTEGER DEFAULT 1,
    appointment_id VARCHAR(64) REFERENCES appointments(id) ON DELETE SET NULL,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    called_time TIMESTAMP WITH TIME ZONE,
    completed_time TIMESTAMP WITH TIME ZONE,
    wait_time_minutes INTEGER DEFAULT 0,
    service_time_minutes INTEGER DEFAULT 0,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS consultations (
    id VARCHAR(64) PRIMARY KEY,
    token_id VARCHAR(64) REFERENCES queue_tokens(id) ON DELETE SET NULL,
    doctor_id VARCHAR(64) REFERENCES doctors(id) ON DELETE CASCADE,
    patient_name VARCHAR(128) NOT NULL,
    patient_phone VARCHAR(32),
    patient_age INTEGER,
    patient_gender VARCHAR(16),
    diagnosis TEXT,
    prescription TEXT,
    vitals JSONB,
    notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    recipient_phone VARCHAR(32) NOT NULL,
    channel VARCHAR(16) NOT NULL,
    message_type VARCHAR(32) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(16) DEFAULT 'delivered',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_doctor_status ON queue_tokens(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_doc ON appointments(appointment_date, doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_phone ON consultations(patient_phone);
`;
