const menuFilters = document.getElementById("menuFilters");
const menuGrid = document.getElementById("menuGrid");
const menuStatus = document.getElementById("menuStatus");

function setMenuStatus(message, type) {
    menuStatus.textContent = message;
    menuStatus.className = type ? `menu-status ${type}` : "menu-status";
}

function productImageUrl(value) {
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
        console.warn("Ignoring invalid product image URL:", error);
    }

    return fallback;
}

function renderMenuFilters(categories) {
    menuFilters.replaceChildren();

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "filter active";
    allButton.dataset.filter = "all";
    allButton.textContent = "All";
    menuFilters.appendChild(allButton);

    categories.forEach(category => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter";
        button.dataset.filter = category.id;
        button.textContent = category.name;
        menuFilters.appendChild(button);
    });

    menuFilters.addEventListener("click", function(event) {
        const button = event.target.closest("button[data-filter]");

        if (!button) {
            return;
        }

        menuFilters.querySelectorAll(".filter").forEach(filter => {
            filter.classList.toggle("active", filter === button);
        });

        const selectedCategory = button.dataset.filter;
        menuGrid.querySelectorAll(".menu-card").forEach(card => {
            card.hidden =
                selectedCategory !== "all" &&
                card.dataset.category !== selectedCategory;
        });
    });
}

function renderMenu(products, categories) {
    menuGrid.replaceChildren();

    if (!products.length) {
        setMenuStatus("Our menu is being updated. Please check back soon.", "empty");
        return;
    }

    const categoryById = new Map(
        categories.map(category => [category.id, category.name])
    );
    const priceFormatter = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    });

    products.forEach(product => {
        const card = document.createElement("article");
        const image = document.createElement("img");
        const info = document.createElement("div");
        const category = document.createElement("span");
        const name = document.createElement("h3");
        const description = document.createElement("p");
        const price = document.createElement("strong");

        card.className = "menu-card";
        card.dataset.category = product.category_id || "";
        image.src = productImageUrl(product.image_url);
        image.onerror = function() {
            image.onerror = null;
            image.src = "assets/images/coffee.jpg";
        };
        image.alt = product.name;
        image.loading = "lazy";
        info.className = "menu-card-info";
        category.textContent =
            categoryById.get(product.category_id) || "Cafe Favorite";
        name.textContent = product.name;
        description.textContent = product.description || "";
        price.className = "menu-card-price";
        price.textContent = priceFormatter.format(Number(product.price));

        info.append(category, name, description, price);
        card.append(image, info);
        menuGrid.appendChild(card);
    });

    setMenuStatus("", "");
}

async function loadMenu() {
    setMenuStatus("Loading menu...", "");

    try {
        const [categoriesResult, productsResult] = await Promise.all([
            supabaseClient
                .from("categories")
                .select("id, name")
                .order("name"),
            supabaseClient
                .from("products")
                .select("id, name, description, price, category_id, image_url, is_available")
                .eq("is_available", true)
                .order("name")
        ]);

        if (categoriesResult.error) {
            throw categoriesResult.error;
        }

        if (productsResult.error) {
            throw productsResult.error;
        }

        renderMenuFilters(categoriesResult.data);
        renderMenu(productsResult.data, categoriesResult.data);
    } catch (error) {
        console.error("Could not load the public menu:", error);
        menuGrid.replaceChildren();
        menuFilters.replaceChildren();
        setMenuStatus(
            "The menu could not be loaded right now. Please try again later.",
            "error"
        );
    }
}

loadMenu();
