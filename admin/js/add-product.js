const productForm = document.getElementById("productForm");
const productIdInput = document.getElementById("productId");
const productNameInput = document.getElementById("productName");
const productPriceInput = document.getElementById("productPrice");
const productCategoryInput = document.getElementById("productCategory");
const productDescriptionInput = document.getElementById("productDescription");
const productImageInput = document.getElementById("productImage");
const imagePreview = document.getElementById("imagePreview");
const isAvailableInput = document.getElementById("isAvailable");
const isFeaturedInput = document.getElementById("isFeatured");
const saveProductBtn = document.getElementById("saveProductBtn");
const formMessage = document.getElementById("formMessage");

let currentProduct = null;
let categories = [];
let previewUrl = null;

async function initializeProductForm() {
    const admin = await protectAdminPage();

    if (!admin) {
        return;
    }

    try {
        await loadProductCategories();

        const productId = new URLSearchParams(window.location.search)
            .get("id");

        if (productId) {
            await loadExistingProduct(productId);
        }
    } catch (error) {
        console.error("Could not initialize the product form:", error);
        showMessage(`The product form could not be loaded: ${error.message}`, "error");
        saveProductBtn.disabled = true;
    }
}

async function loadProductCategories() {
    const { data, error } = await supabaseClient
        .from("categories")
        .select("id, name")
        .order("name");

    if (error) {
        throw error;
    }

    categories = data;
    productCategoryInput.replaceChildren(
        new Option("Select Category", "")
    );

    categories.forEach(category => {
        productCategoryInput.add(
            new Option(category.name, category.id)
        );
    });

    if (!categories.length) {
        showMessage("Create a category before adding products.", "error");
        saveProductBtn.disabled = true;
    }
}

async function loadExistingProduct(id) {
    const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        throw error;
    }

    currentProduct = data;
    productIdInput.value = data.id;
    productNameInput.value = data.name;
    productPriceInput.value = data.price;
    productCategoryInput.value = data.category_id;
    productDescriptionInput.value = data.description || "";
    isAvailableInput.checked = data.is_available === true;
    isFeaturedInput.checked = data.is_featured === true;

    if (data.image_url) {
        imagePreview.src = data.image_url;
        imagePreview.style.display = "block";
        imagePreview.onerror = function() {
            imagePreview.onerror = null;
            imagePreview.src = "../assets/images/coffee.jpg";
        };
    }

    document.getElementById("pageTitle").textContent = "Edit Product";
    saveProductBtn.innerHTML = `
        <i class="fa-solid fa-save"></i>
        Update Product
    `;
}

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `message ${type}`;
}

function clearPreviewUrl() {
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }
}

productImageInput.addEventListener("change", function() {
    const file = productImageInput.files[0];
    showMessage("", "");

    if (!file) {
        return;
    }

    const inspection = productImageTools.inspectImage(file);

    if (inspection.error) {
        productImageInput.value = "";
        showMessage(inspection.error, "error");
        return;
    }

    clearPreviewUrl();
    previewUrl = URL.createObjectURL(file);
    imagePreview.src = previewUrl;
    imagePreview.style.display = "block";
});

productForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    saveProductBtn.disabled = true;
    saveProductBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Saving...
    `;
    showMessage("", "");

    let newlyUploadedPath = null;

    try {
        const productName = productNameInput.value.trim();
        const priceText = productPriceInput.value.trim();
        const productPrice = Number(priceText);
        const categoryId = productCategoryInput.value;
        const categoryExists =
            categories.some(category => category.id === categoryId);
        const description = productDescriptionInput.value.trim();
        const imageFile = productImageInput.files[0];

        if (!productName) {
            throw new Error("Product name is required.");
        }

        if (!priceText || !Number.isFinite(productPrice) || productPrice < 0) {
            throw new Error("Enter a valid, non-negative product price.");
        }

        if (!categoryId || !categoryExists) {
            throw new Error("Select a valid category.");
        }

        if (imageFile) {
            const inspection = productImageTools.inspectImage(imageFile);

            if (inspection.error) {
                throw new Error(inspection.error);
            }
        }

        const productData = {
            name: productName,
            description: description || null,
            price: productPrice,
            category_id: categoryId,
            image_url: currentProduct ? currentProduct.image_url : null,
            image_path: currentProduct ? currentProduct.image_path : null,
            is_available: isAvailableInput.checked,
            is_featured: isFeaturedInput.checked,
            updated_at: new Date().toISOString()
        };

        if (imageFile) {
            const uploadedImage = await productImageTools.uploadImage(imageFile);
            newlyUploadedPath = uploadedImage.image_path;
            productData.image_url = uploadedImage.image_url;
            productData.image_path = uploadedImage.image_path;
        }

        const previousImagePath =
            currentProduct ? currentProduct.image_path : null;
        let saveResult;

        if (productIdInput.value) {
            saveResult = await supabaseClient
                .from("products")
                .update(productData)
                .eq("id", productIdInput.value)
                .select("id")
                .single();
        } else {
            saveResult = await supabaseClient
                .from("products")
                .insert(productData)
                .select("id")
                .single();
        }

        if (saveResult.error) {
            throw saveResult.error;
        }

        newlyUploadedPath = null;

        let successMessage = productIdInput.value
            ? "Product updated successfully."
            : "Product added successfully.";

        if (
            imageFile &&
            previousImagePath &&
            previousImagePath !== productData.image_path
        ) {
            try {
                const cleanup = await productImageTools.removeIfUnused(
                    previousImagePath
                );

                if (cleanup.inUse) {
                    successMessage += " The old image was retained because another product still uses it.";
                }
            } catch (error) {
                console.error("Old product image cleanup failed:", error);
                successMessage += ` The old image could not be removed: ${error.message}`;
            }
        }

        if (productIdInput.value) {
            currentProduct = Object.assign({}, currentProduct, productData);
            productImageInput.value = "";
            clearPreviewUrl();

            if (currentProduct.image_url) {
                imagePreview.src = currentProduct.image_url;
                imagePreview.style.display = "block";
            }
        }

        showMessage(successMessage, "success");

        if (!productIdInput.value) {
            productForm.reset();
            currentProduct = null;
            clearPreviewUrl();
            imagePreview.removeAttribute("src");
            imagePreview.style.display = "none";
        }
    } catch (error) {
        console.error("Product save failed:", error);
        let message = error.message || "The product could not be saved.";

        if (newlyUploadedPath) {
            try {
                await productImageTools.removeIfUnused(newlyUploadedPath);
            } catch (cleanupError) {
                console.error("New product image cleanup failed:", cleanupError);
                message += ` The uploaded image also could not be removed: ${cleanupError.message}`;
            }
        }

        showMessage(message, "error");
    } finally {
        saveProductBtn.disabled = false;
        saveProductBtn.innerHTML = productIdInput.value
            ? '<i class="fa-solid fa-save"></i> Update Product'
            : '<i class="fa-solid fa-save"></i> Save Product';
    }
});

initializeProductForm();
