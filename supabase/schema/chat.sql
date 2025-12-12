-- Add deletion tracking columns to the conversations table

-- Check if the 'buyer_deleted' column exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='buyer_deleted') THEN
        ALTER TABLE public.conversations ADD COLUMN buyer_deleted BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
END
$$;

-- Check if the 'seller_deleted' column exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='seller_deleted') THEN
        ALTER TABLE public.conversations ADD COLUMN seller_deleted BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
END
$$;
