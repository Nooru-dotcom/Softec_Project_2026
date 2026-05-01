CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  city TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('worker', 'verifier', 'advocate')),
  is_role_approved BOOLEAN NOT NULL DEFAULT false,
  is_identity_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  shift_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  gross NUMERIC(10,2) NOT NULL,
  deductions NUMERIC(10,2) NOT NULL,
  net NUMERIC(10,2) NOT NULL,
  city_zone TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verifier_comment TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  city TEXT NOT NULL,
  platform TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  cluster_key TEXT,
  anonymous BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

TRUNCATE grievances, screenshots, shifts, users RESTART IDENTITY CASCADE;

INSERT INTO users (email, password_hash, full_name, city, role, is_role_approved, is_identity_verified)
SELECT
  'worker' || g || '@fairgig.pk',
  'demo_hash',
  'Worker ' || g,
  (ARRAY['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Peshawar'])[1 + ((g - 1) % 5)],
  'worker',
  true,
  (g % 3 = 0)
FROM generate_series(1, 50) g;

INSERT INTO users (email, password_hash, full_name, city, role, is_role_approved, is_identity_verified)
VALUES
('verifier1@fairgig.pk', 'demo_hash', 'Verifier One', 'Lahore', 'verifier', true, true),
('advocate1@fairgig.pk', 'demo_hash', 'Advocate One', 'Karachi', 'advocate', true, true);

WITH workers AS (
  SELECT id, city, row_number() OVER () AS rn
  FROM users
  WHERE role = 'worker'
),
dates AS (
  SELECT generate_series(CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE, INTERVAL '1 day')::date AS d
),
platforms AS (
  SELECT unnest(ARRAY['Careem', 'Bykea', 'Foodpanda', 'Upwork', 'InDrive']) AS platform
),
raw AS (
  SELECT
    w.id AS user_id,
    p.platform,
    d.d AS shift_date,
    CASE
      WHEN p.platform = 'Upwork' THEN round((5 + random() * 5)::numeric, 2)
      ELSE round((7 + random() * 5)::numeric, 2)
    END AS hours,
    round((1800 + random() * 5200)::numeric, 2) AS gross,
    round((200 + random() * 1400)::numeric, 2) AS deductions,
    (ARRAY['Gulberg', 'Saddar', 'Blue Area', 'Hayatabad', 'Satellite Town'])[1 + ((w.rn - 1) % 5)] AS city_zone,
    random() AS keep
  FROM workers w
  CROSS JOIN dates d
  JOIN platforms p ON (w.rn + EXTRACT(day FROM d.d)::int) % 5 = 0
)
INSERT INTO shifts (user_id, platform, shift_date, hours, gross, deductions, net, city_zone)
SELECT
  user_id,
  platform,
  shift_date,
  hours,
  gross,
  deductions,
  GREATEST(gross - deductions, 0),
  city_zone
FROM raw
WHERE keep > 0.70
LIMIT 380;

INSERT INTO screenshots (user_id, shift_id, file_path, verification_status)
SELECT s.user_id, s.id, '/uploads/demo/' || s.id || '.png',
  CASE WHEN random() > 0.75 THEN 'approved' ELSE 'pending' END
FROM shifts s
ORDER BY random()
LIMIT 140;

INSERT INTO grievances (user_id, title, description, city, platform, tags, status, cluster_key, anonymous)
SELECT
  u.id,
  (ARRAY['Late payout', 'Unexpected deductions', 'App outage', 'Route mismatch', 'Fuel reimbursement issue'])[1 + floor(random()*5)::int],
  'Community submitted grievance about unfair payout and policy visibility.',
  u.city,
  (ARRAY['Careem', 'Bykea', 'Foodpanda', 'Upwork', 'InDrive'])[1 + floor(random()*5)::int],
  ARRAY['payout', 'policy'],
  CASE WHEN random() > 0.5 THEN 'open' ELSE 'in_review' END,
  (ARRAY['deduction', 'delay', 'safety'])[1 + floor(random()*3)::int],
  true
FROM users u
WHERE u.role = 'worker'
LIMIT 45;
