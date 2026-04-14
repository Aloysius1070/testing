-- Migration: Add payment and onboarding tracking fields
-- Date: 2025-12-22
-- Purpose: Support dummy payment flow (Razorpay-compatible)

-- =========================================================
-- 1. Add payment fields to subscriptions table
-- =========================================================

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS payment_order_id TEXT NULL,
ADD COLUMN IF NOT EXISTS payment_id TEXT NULL,
ADD COLUMN IF NOT EXISTS payment_signature TEXT NULL,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ NULL;

-- Add check constraint for payment_status enum
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_payment_status_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_payment_status_check 
CHECK (payment_status IN ('PENDING', 'PAID'));

-- =========================================================
-- 2. Add onboarding tracking to accounts table
-- =========================================================

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS previous_plan_id BIGINT NULL;

-- Add check constraint for onboarding_status enum
ALTER TABLE accounts
DROP CONSTRAINT IF EXISTS accounts_onboarding_status_check;

ALTER TABLE accounts
ADD CONSTRAINT accounts_onboarding_status_check 
CHECK (onboarding_status IN (
    'NONE',
    'SIGNUP_STARTED',
    'PAYMENT_PENDING',
    'PAYMENT_DONE',
    'ONBOARD_INCOMPLETE',
    'COMPLETE'
));

-- Add foreign key for previous_plan_id
ALTER TABLE accounts
DROP CONSTRAINT IF EXISTS accounts_previous_plan_id_fkey;

ALTER TABLE accounts
ADD CONSTRAINT accounts_previous_plan_id_fkey 
FOREIGN KEY (previous_plan_id) REFERENCES plans(id);

-- =========================================================
-- 3. Update existing records to have valid status
-- =========================================================

-- Set existing accounts with passwords as COMPLETE
UPDATE accounts
SET onboarding_status = 'COMPLETE'
WHERE password_hash IS NOT NULL 
  AND password_hash != ''
  AND password_hash != 'PENDING'
  AND onboarding_status = 'NONE';

-- Set existing subscriptions as PAID (backwards compatibility)
UPDATE subscriptions
SET payment_status = 'PAID'
WHERE payment_status = 'PENDING'
  AND status = 'ACTIVE';

-- =========================================================
-- 4. Create indexes for performance
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_status 
ON subscriptions(payment_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_order_id 
ON subscriptions(payment_order_id);

CREATE INDEX IF NOT EXISTS idx_accounts_onboarding_status 
ON accounts(onboarding_status);

-- =========================================================
-- DONE
-- =========================================================
