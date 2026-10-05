function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function loadProducts() {
    const grid = document.getElementById("productGrid");
    const searchInput = document.getElementById("searchInput");
    const categorySelect = document.getElementById("categorySelect");

    const keyword = searchInput
        ? searchInput.value.trim()
        : "";

    const category = categorySelect
        ? categorySelect.value
        : "";

    const params = new URLSearchParams();

    if (keyword) {
        params.set("q", keyword);
    }

    if (category) {
        params.set("category", category);
    }

    grid.innerHTML = "<p>Loading products...</p>";

    try {
        const url =
            "/products" +
            (params.toString()
                ? "?" + params.toString()
                : "");

        const products = await api.get(url);

        if (!Array.isArray(products)) {
            throw new Error("Invalid product response from server");
        }

        if (products.length === 0) {
            grid.innerHTML = "<p>No products found.</p>";
            return;
        }

        grid.innerHTML = products
            .map(renderCard)
            .join("");

    } catch (err) {

        console.error(
            "Failed to load products:",
            err
        );

        grid.innerHTML =
            "<p>Could not load products: " +
            escapeHtml(err.message) +
            "</p>";
    }
}

function renderCard(product) {

    const imageUrl = product.imageUrl
        ? escapeHtml(product.imageUrl)
        : "";

    const productName =
        escapeHtml(product.name);

    const category =
        escapeHtml(product.category);

    const productId =
        encodeURIComponent(product.id);

    const stock =
        Number(product.stockQty || 0);

    return `
        <a
            class="product-card"
            href="product-detail.jsp?id=${productId}"
            style="text-decoration:none;color:inherit;"
        >

            ${
                imageUrl
                    ? `
                        <img
                            src="${imageUrl}"
                            alt="${productName}"
                        >
                      `
                    : ""
            }

            <strong>
                ${productName}
            </strong>

            <span class="category">
                ${category}
            </span>

            <span class="price">
                ${formatMoney(product.price)}
            </span>

            <span>
                ${
                    stock > 0
                        ? stock + " in stock"
                        : "Out of stock"
                }
            </span>

        </a>
    `;
}

const searchButton =
    document.getElementById("searchBtn");

if (searchButton) {
    searchButton.addEventListener(
        "click",
        loadProducts
    );
}

const searchInput =
    document.getElementById("searchInput");

if (searchInput) {
    searchInput.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Enter") {
                loadProducts();
            }
        }
    );
}

loadProducts();