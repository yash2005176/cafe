const featuredProductsContainer =
    document.getElementById("featuredProducts");
const featuredProductsStatus =
    document.getElementById("featuredProductsStatus");

function setFeaturedStatus(message, type) {
    featuredProductsStatus.textContent = message;
    featuredProductsStatus.className = type
        ? `featured-status ${type}`
        : "featured-status";
}

function featuredImageUrl(value) {
    const fallback = "assets/images/coffee.jpg";

    if (typeof value !== "string" || !value.trim()) {
        return fallback;
    }

    try {
        const url = new URL(value, window.location.href);

        if (url.protocol === "https:" || url.protocol === "http:") {
            return url.href;
        }
    } catch (error) {
        console.warn("Ignoring invalid featured image URL:", error);
    }

    return fallback;
}

function renderFeaturedProducts(products, categories) {
    featuredProductsContainer.replaceChildren();

    if (!products.length) {
        setFeaturedStatus("Featured items are coming soon.", "empty");
        return;
    }

    const categoryById = new Map(
        categories.map(category => [category.id, category.name])
    );
    const priceFormatter = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    });

    products.forEach((product, index) => {
        const card = document.createElement("article");
        const image = document.createElement("img");
        const details = document.createElement("div");
        const category = document.createElement("span");
        const name = document.createElement("h3");
        const description = document.createElement("p");
        const price = document.createElement("strong");

        card.className = "food-card";
        image.src = featuredImageUrl(product.image_url);
        image.onerror = function() {
            image.onerror = null;
            image.src = "assets/images/coffee.jpg";
        };
        image.alt = product.name;
        image.loading = "lazy";
        details.appendChild(category);
        category.textContent =
            `${String(index + 1).padStart(2, "0")} / ${
                categoryById.get(product.category_id) || "FEATURED"
            }`;
        name.textContent = product.name;
        description.textContent = product.description || "";
        price.className = "featured-price";
        price.textContent = priceFormatter.format(Number(product.price));
        details.append(name, description, price);
        card.append(image, details);
        featuredProductsContainer.appendChild(card);
    });

    setFeaturedStatus("", "");
}

async function loadFeaturedProducts() {
    setFeaturedStatus("Loading featured products...", "");

    try {
        const [productsResult, categoriesResult] = await Promise.all([
            supabaseClient
                .from("products")
                .select("id, name, description, price, category_id, image_url")
                .eq("is_available", true)
                .eq("is_featured", true)
                .order("created_at", { ascending: false })
                .limit(3),
            supabaseClient
                .from("categories")
                .select("id, name")
        ]);

        if (productsResult.error) {
            throw productsResult.error;
        }

        if (categoriesResult.error) {
            throw categoriesResult.error;
        }

        renderFeaturedProducts(productsResult.data, categoriesResult.data);
    } catch (error) {
        console.error("Could not load featured products:", error);
        featuredProductsContainer.replaceChildren();
        setFeaturedStatus(
            "Featured products could not be loaded right now.",
            "error"
        );
    }
}

loadFeaturedProducts();
