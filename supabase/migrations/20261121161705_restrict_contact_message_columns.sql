BEGIN;

REVOKE INSERT ON TABLE public.contact_messages
    FROM anon, authenticated;
GRANT INSERT (name, email, phone, subject, message)
    ON TABLE public.contact_messages
    TO anon, authenticated;

REVOKE UPDATE ON TABLE public.contact_messages
    FROM authenticated;
GRANT UPDATE (is_read)
    ON TABLE public.contact_messages
    TO authenticated;

COMMIT;
