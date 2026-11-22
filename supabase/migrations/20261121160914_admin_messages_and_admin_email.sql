BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users AS admin_user
        JOIN auth.users AS auth_user
            ON auth_user.id = admin_user.id
        WHERE admin_user.id = auth.uid()
          AND lower(admin_user.email) = lower(auth_user.email)
          AND lower(auth_user.email) = 'maulichakor007@gmail.com'
    );
$function$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE TABLE public.contact_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 150),
    email text NOT NULL CHECK (
        char_length(btrim(email)) BETWEEN 3 AND 320
        AND btrim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    ),
    phone text CHECK (phone IS NULL OR char_length(btrim(phone)) <= 50),
    subject text CHECK (subject IS NULL OR char_length(btrim(subject)) <= 200),
    message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 5000),
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contact_messages_created_at_idx
    ON public.contact_messages (created_at DESC);

CREATE INDEX contact_messages_unread_idx
    ON public.contact_messages (created_at DESC)
    WHERE is_read IS FALSE;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.contact_messages
    FROM PUBLIC, anon, authenticated;

GRANT INSERT ON TABLE public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.contact_messages TO authenticated;

CREATE POLICY contact_messages_public_insert
    ON public.contact_messages
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY contact_messages_admin_read
    ON public.contact_messages
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY contact_messages_admin_update
    ON public.contact_messages
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

COMMIT;
