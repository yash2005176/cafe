let allProducts = [];
let allCategories = [];

const productsTable = document.getElementById("productsTable");
const productsMessage = document.getElementById("productsMessage");
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchProduct");
const statusFilter = document.getElementById("statusFilter");

async function initializeProducts() {
    const admin = await protectAdminPage();

    if (!admin) {
        return;
    }

    try {
        const [categoriesResult, productsResult] = await Promise.all([
            supabaseClient
                .from("categories")
                .select("id, name")
                .order("name"),
            supabaseClient
                .from("products")
                .select("*")
                .order("created_at", { ascending: false })
        ]);

        if (categoriesResult.error) {
            throw categoriesResult.error;
        }

        if (productsResult.error) {
            throw productsResult.error;
        }

        allCategories = categoriesResult.data;
        allProducts = productsResult.data;
        renderCategoryFilter();
        renderProducts(allProducts);
        productsMessage.textContent = "";
    } catch (error) {
        console.error("Could not load products:", error);
        productsMessage.textContent = `Products could not be loaded: ${error.message}`;
        productsMessage.className = "message error";
        renderEmptyRow("Products could not be loaded.");
    }
}

function renderCategoryFilter() {
    categoryFilter.replaceChildren(new Option("All Categories", ""));

    allCategories.forEach(category => {
        categoryFilter.add(new Option(category.name, category.id));
    });
}

function renderEmptyRow(message) {
    productsTable.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = message;
    row.appendChild(cell);
    productsTable.appendChild(row);
}

function productImageUrl(value) {
    const fallback = "../assets/images/coffee.jpg";

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

function renderProducts(products) {
    productsTable.replaceChildren();

    if (!products.length) {
        renderEmptyRow("No products found. Add your first product to get started.");
        return;
    }

    const categoryById = new Map(
        allCategories.map(category => [category.id, category.name])
    );

    products.forEach(product => {
        const row = document.createElement("tr");
        const imageCell = document.createElement("td");
        const image = document.createElement("img");
        const nameCell = document.createElement("td");
        const categoryCell = document.createElement("td");
        const priceCell = document.createElement("td");
        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        const actionsCell = document.createElement("td");
        const actions = document.createElement("div");
        const editButton = document.createElement("button");
        const editIcon = document.createElement("i");
        const deleteButton = document.createElement("button");
        const deleteIcon = document.createElement("i");

        image.className = "product-table-image";
        image.src = productImageUrl(product.image_url);
        image.onerror = function() {
            image.onerror = null;
            image.src = "../assets/images/coffee.jpg";
        };
        image.alt = product.name;
        image.loading = "lazy";

        nameCell.textContent = product.name;
        categoryCell.textContent =
            categoryById.get(product.category_id) || "Uncategorized";
        priceCell.textContent = `₹${Number(product.price).toFixed(2)}`;

        status.className = product.is_available
            ? "status available"
            : "status unavailable";
        status.textContent = product.is_available
            ? "Available"
            : "Unavailable";

        actions.className = "action-buttons";
        editButton.type = "button";
        editButton.className = "icon-btn edit-btn";
        editButton.title = `Edit ${product.name}`;
        editButton.setAttribute("aria-label", `Edit ${product.name}`);
        editButton.dataset.action = "edit";
        editButton.dataset.productId = product.id;
        editIcon.className = "fa-solid fa-pen";
        editButton.appendChild(editIcon);

        deleteButton.type = "button";
        deleteButton.className = "icon-btn delete-btn";
        deleteButton.title = `Delete ${product.name}`;
        deleteButton.setAttribute("aria-label", `Delete ${product.name}`);
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.productId = product.id;
        deleteIcon.className = "fa-solid fa-trash";
        deleteButton.appendChild(deleteIcon);

        imageCell.appendChild(image);
        statusCell.appendChild(status);
        actions.append(editButton, deleteButton);
        actionsCell.appendChild(actions);
        row.append(
            imageCell,
            nameCell,
            categoryCell,
            priceCell,
            statusCell,
            actionsCell
        );
        productsTable.appendChild(row);
    });
}

async function deleteProduct(productId) {
    const product = allProducts.find(item => item.id === productId);

    if (!product || !confirm(`Delete "${product.name}"? This cannot be undone.`)) {
        return;
    }

    const { data: deletedProduct, error } = await supabaseClient
        .from("products")
        .delete()
        .eq("id", productId)
        .select("id")
        .single();

    if (error) {
        console.error("Product deletion failed:", error);
        productsMessage.textContent = `Product could not be deleted: ${error.message}`;
        productsMessage.className = "message error";
        return;
    }

    if (!deletedProduct) {
        productsMessage.textContent = "The product was not deleted.";
        productsMessage.className = "message error";
        return;
    }

    allProducts = allProducts.filter(item => item.id !== productId);
    renderProducts(filterProducts());

    if (product.image_path) {
        try {
            const cleanup = await productImageTools.removeIfUnused(
                product.image_path
            );

            if (cleanup.inUse) {
                productsMessage.textContent =
                    "Product deleted. Its image was retained because another product still uses it.";
                productsMessage.className = "message success";
                return;
            }
        } catch (imageError) {
            console.error("Product image cleanup failed:", imageError);
            productsMessage.textContent =
                `Product deleted, but its image could not be safely removed: ${imageError.message}`;
            productsMessage.className = "message error";
            return;
        }
    }

    productsMessage.textContent = "Product deleted successfully.";
    productsMessage.className = "message success";
}

function filterProducts() {
    const searchValue = searchInput.value.trim().toLowerCase();
    const categoryValue = categoryFilter.value;
    const statusValue = statusFilter.value;

    return allProducts.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchValue);
        const matchesCategory =
            !categoryValue || product.category_id === categoryValue;
        const matchesStatus =
            !statusValue ||
            (statusValue === "available" && product.is_available === true) ||
            (statusValue === "unavailable" && product.is_available !== true);

        return matchesSearch && matchesCategory && matchesStatus;
    });
}

productsTable.addEventListener("click", function(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    if (button.dataset.action === "edit") {
        window.location.href =
            `add-product.html?id=${encodeURIComponent(button.dataset.productId)}`;
        return;
    }

    if (button.dataset.action === "delete") {
        deleteProduct(button.dataset.productId);
    }
});

searchInput.addEventListener("input", function() {
    renderProducts(filterProducts());
});

categoryFilter.addEventListener("change", function() {
    renderProducts(filterProducts());
});

statusFilter.addEventListener("change", function() {
    renderProducts(filterProducts());
});

initializeProducts();
