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

COMMIT;
