CREATE TABLE live_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    link_text TEXT,
    is_active BOOLEAN DEFAULT false NOT NULL
);
