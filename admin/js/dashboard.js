async function loadDashboard() {
    const admin = await protectAdminPage();

    if (!admin) {
        return;
    }

    const message = document.getElementById("dashboardMessage");
    const adminEmail = document.getElementById("adminEmail");
    adminEmail.textContent = admin.email;

    try {
        const [
            productsResult,
            availableProductsResult,
            featuredProductsResult,
            categoriesResult,
            messagesResult,
            unreadMessagesResult,
            recentProductsResult
        ] = await Promise.all([
            supabaseClient
                .from("products")
                .select("id", { count: "exact", head: true }),
            supabaseClient
                .from("products")
                .select("id", { count: "exact", head: true })
                .eq("is_available", true),
            supabaseClient
                .from("products")
                .select("id", { count: "exact", head: true })
                .eq("is_featured", true),
            supabaseClient
                .from("categories")
                .select("id, name", { count: "exact" }),
            supabaseClient
                .from("contact_messages")
                .select("id", { count: "exact", head: true }),
            supabaseClient
                .from("contact_messages")
                .select("id", { count: "exact", head: true })
                .eq("is_read", false),
            supabaseClient
                .from("products")
                .select("name, price, category_id, is_available, created_at")
                .order("created_at", { ascending: false })
                .limit(5)
        ]);

        if (productsResult.error) {
            throw productsResult.error;
        }

        if (availableProductsResult.error) {
            throw availableProductsResult.error;
        }

        if (featuredProductsResult.error) {
            throw featuredProductsResult.error;
        }

        if (categoriesResult.error) {
            throw categoriesResult.error;
        }

        if (messagesResult.error) {
            throw messagesResult.error;
        }

        if (unreadMessagesResult.error) {
            throw unreadMessagesResult.error;
        }

        if (recentProductsResult.error) {
            throw recentProductsResult.error;
        }

        const totalProducts = productsResult.count || 0;
        const availableProducts = availableProductsResult.count || 0;

        document.getElementById("totalProducts").textContent = totalProducts;
        document.getElementById("availableProducts").textContent =
            availableProducts;
        document.getElementById("unavailableProducts").textContent =
            totalProducts - availableProducts;
        document.getElementById("featuredProductsCount").textContent =
            featuredProductsResult.count || 0;
        document.getElementById("totalCategories").textContent =
            categoriesResult.count || 0;
        document.getElementById("totalMessages").textContent =
            messagesResult.count || 0;
        document.getElementById("unreadMessages").textContent =
            unreadMessagesResult.count || 0;

        renderRecentProducts(
            recentProductsResult.data,
            categoriesResult.data
        );
        message.textContent = "";
    } catch (error) {
        console.error("Could not load dashboard data:", error);
        message.textContent = `Dashboard data could not be loaded: ${error.message}`;
        message.className = "message error";
    }
}

function renderRecentProducts(products, categories) {
    const container = document.getElementById("recentProducts");
    container.replaceChildren();

    if (!products.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.textContent = "No products added yet.";
        row.appendChild(cell);
        container.appendChild(row);
        return;
    }

    const categoryById = new Map(
        categories.map(category => [category.id, category.name])
    );

    products.forEach(product => {
        const row = document.createElement("tr");
        const productName = document.createElement("td");
        const categoryName = document.createElement("td");
        const price = document.createElement("td");
        const statusCell = document.createElement("td");
        const status = document.createElement("span");

        productName.textContent = product.name;
        categoryName.textContent =
            categoryById.get(product.category_id) || "Uncategorized";
        price.textContent = `₹${Number(product.price).toFixed(2)}`;
        status.className = product.is_available
            ? "status available"
            : "status unavailable";
        status.textContent = product.is_available
            ? "Available"
            : "Unavailable";

        statusCell.appendChild(status);
        row.append(productName, categoryName, price, statusCell);
        container.appendChild(row);
    });
}

loadDashboard();
