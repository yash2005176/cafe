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

REVOKE ALL PRIVILEGES
ON TABLE public.categories, public.products, public.admin_users
FROM anon, authenticated;

REVOKE REFERENCES (id, name, created_at)
ON TABLE public.categories
FROM anon, authenticated;

REVOKE REFERENCES (id, name, description, price, category_id, image_url, image_path, is_available, is_featured, created_at, updated_at)
ON TABLE public.products
FROM anon, authenticated;

REVOKE REFERENCES (id, email, created_at)
ON TABLE public.admin_users
FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE storage.buckets
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.categories
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
ON TABLE public.categories
TO authenticated;

GRANT SELECT
ON TABLE public.products
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
ON TABLE public.products
TO authenticated;

GRANT SELECT
ON TABLE public.admin_users
TO authenticated;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products
    ALTER COLUMN category_id SET NOT NULL;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.products'::regclass
          AND conname = 'products_price_nonnegative_check'
    ) THEN
        ALTER TABLE public.products
            ADD CONSTRAINT products_price_nonnegative_check
            CHECK (price >= 0);
    END IF;
END;
$migration$;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'categories'
          AND policyname = 'categories_public_read'
    ) THEN
        CREATE POLICY categories_public_read
        ON public.categories
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'categories'
          AND policyname = 'categories_admin_insert'
    ) THEN
        CREATE POLICY categories_admin_insert
        ON public.categories
        FOR INSERT
        TO authenticated
        WITH CHECK (public.is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'categories'
          AND policyname = 'categories_admin_update'
    ) THEN
        CREATE POLICY categories_admin_update
        ON public.categories
        FOR UPDATE
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'categories'
          AND policyname = 'categories_admin_delete'
    ) THEN
        CREATE POLICY categories_admin_delete
        ON public.categories
        FOR DELETE
        TO authenticated
        USING (public.is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'products'
          AND policyname = 'products_public_read_available'
    ) THEN
        CREATE POLICY products_public_read_available
        ON public.products
        FOR SELECT
        TO anon, authenticated
        USING (is_available IS TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'products'
          AND policyname = 'products_admin_read_all'
    ) THEN
        CREATE POLICY products_admin_read_all
        ON public.products
        FOR SELECT
        TO authenticated
        USING (public.is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'products'
          AND policyname = 'products_admin_insert'
    ) THEN
        CREATE POLICY products_admin_insert
        ON public.products
        FOR INSERT
        TO authenticated
        WITH CHECK (public.is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'products'
          AND policyname = 'products_admin_update'
    ) THEN
        CREATE POLICY products_admin_update
        ON public.products
        FOR UPDATE
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'products'
          AND policyname = 'products_admin_delete'
    ) THEN
        CREATE POLICY products_admin_delete
        ON public.products
        FOR DELETE
        TO authenticated
        USING (public.is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'product_images_public_read'
    ) THEN
        CREATE POLICY product_images_public_read
        ON storage.objects
        FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'product-images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'product_images_admin_insert'
    ) THEN
        CREATE POLICY product_images_admin_insert
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'product-images'
            AND public.is_admin()
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'product_images_admin_update'
    ) THEN
        CREATE POLICY product_images_admin_update
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'product-images'
            AND public.is_admin()
        )
        WITH CHECK (
            bucket_id = 'product-images'
            AND public.is_admin()
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'product_images_admin_delete'
    ) THEN
        CREATE POLICY product_images_admin_delete
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'product-images'
            AND public.is_admin()
        );
    END IF;
END;
$migration$;

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
