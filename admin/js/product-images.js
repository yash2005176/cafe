(function() {
    const maxFileSize = 5 * 1024 * 1024;
    const mimeByExtension = new Map([
        ["jpg", "image/jpeg"],
        ["jpeg", "image/jpeg"],
        ["png", "image/png"],
        ["webp", "image/webp"]
    ]);
    const acceptedMimes = new Set([
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    ]);

    function inspectImage(file) {
        if (!file) {
            return { error: null, extension: null, contentType: null };
        }

        if (file.size <= 0 || file.size > maxFileSize) {
            return {
                error: "Image size must be greater than 0 and no more than 5 MB.",
                extension: null,
                contentType: null
            };
        }

        const extension = file.name.split(".").pop().toLowerCase();
        const expectedMime = mimeByExtension.get(extension);
        const actualMime = file.type.toLowerCase();
        const normalizedMime = actualMime === "image/jpg"
            ? "image/jpeg"
            : actualMime;

        if (
            !expectedMime ||
            (actualMime && !acceptedMimes.has(actualMime)) ||
            (normalizedMime && normalizedMime !== expectedMime)
        ) {
            return {
                error: "Choose a JPG, PNG, or WebP image.",
                extension: null,
                contentType: null
            };
        }

        return {
            error: null,
            extension,
            contentType: expectedMime
        };
    }

    async function uploadImage(file) {
        const inspection = inspectImage(file);

        if (inspection.error) {
            throw new Error(inspection.error);
        }

        const filePath = `products/${crypto.randomUUID()}.${inspection.extension}`;
        const { data, error } = await supabaseClient.storage
            .from("product-images")
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: inspection.contentType
            });

        if (error) {
            throw error;
        }

        const { data: publicData } = supabaseClient.storage
            .from("product-images")
            .getPublicUrl(data.path);
        const publicUrl = new URL(publicData.publicUrl);

        if (publicUrl.protocol !== "https:" && publicUrl.protocol !== "http:") {
            throw new Error("Supabase returned an invalid product image URL.");
        }

        return {
            image_url: publicUrl.href,
            image_path: data.path
        };
    }

    async function removeIfUnused(path) {
        if (!path) {
            return { removed: false, inUse: false };
        }

        const { data: publicData } = supabaseClient.storage
            .from("product-images")
            .getPublicUrl(path);
        const [pathReferences, urlReferences] = await Promise.all([
            supabaseClient
                .from("products")
                .select("id", { count: "exact", head: true })
                .eq("image_path", path),
            supabaseClient
                .from("products")
                .select("id", { count: "exact", head: true })
                .eq("image_url", publicData.publicUrl)
        ]);

        if (pathReferences.error) {
            throw pathReferences.error;
        }

        if (urlReferences.error) {
            throw urlReferences.error;
        }

        if (
            typeof pathReferences.count !== "number" ||
            typeof urlReferences.count !== "number"
        ) {
            throw new Error("Could not verify whether the product image is still in use.");
        }

        if (pathReferences.count > 0 || urlReferences.count > 0) {
            return { removed: false, inUse: true };
        }

        const { error: removeError } = await supabaseClient.storage
            .from("product-images")
            .remove([path]);

        if (removeError) {
            throw removeError;
        }

        return { removed: true, inUse: false };
    }

    window.productImageTools = Object.freeze({
        inspectImage,
        uploadImage,
        removeIfUnused
    });
})();
