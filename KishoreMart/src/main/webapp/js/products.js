function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function localFallbackImage(product) {
    const name = String(product?.name ?? "").trim().toLowerCase();
    const slug = name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return "/images/products/" +
        (slug ? slug + ".svg" : "wireless-mouse.svg");
}

async function loadProducts() {
    const grid = document.getElementById("productGrid");
    const searchInput = document.getElementById("searchInput");
    const categorySelect = document.getElementById("categorySelect");
    if (!grid) return;

    const keyword = searchInput ? searchInput.value.trim() : "";
    const category = categorySelect ? categorySelect.value : "";
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (category) params.set("category", category);

    grid.innerHTML = "<p>Loading products...</p>";
    try {
        const url = "/products" + (params.toString() ? "?" + params.toString() : "");
        const products = await api.get(url);
        if (!Array.isArray(products)) throw new Error("Invalid product response from server");
        if (products.length === 0) {
            grid.innerHTML = '<p class="catalog-empty">No products found. Try another search.</p>';
            return;
        }
        grid.innerHTML = products.map(renderCard).join("");
    } catch (err) {
        console.error("Failed to load products:", err);
        grid.innerHTML = '<p class="catalog-error">Could not load products: ' +
            escapeHtml(err.message) + "</p>";
    }
}

function renderCard(product) {
    const productName = escapeHtml(product.name);
    const category = escapeHtml(product.category || "General");
    const productId = encodeURIComponent(product.id);
    const stock = Number(product.stockQty || 0);
    const imageUrl = localFallbackImage(product);
    const price = formatMoney(product.price);

    return `
      <a class="product-card" href="product-detail.jsp?id=${productId}" aria-label="View ${productName}">
        <div class="product-image-wrap">
          <img src="${escapeHtml(imageUrl)}"
               alt="${productName}"
               loading="lazy"
               onerror="this.onerror=null;this.src='/images/products/wireless-mouse.svg';">
          <span class="product-image-tag">${category}</span>
        </div>
        <div class="product-card-content">
          <span class="category">${category}</span>
          <strong class="product-name">${productName}</strong>
          <span class="price">${escapeHtml(price)}</span>
          <span class="product-stock ${stock > 0 ? "in-stock" : "out-of-stock"}">
            ${stock > 0 ? stock + " in stock" : "Out of stock"}
          </span>
        </div>
      </a>
    `;
}

const searchButton = document.getElementById("searchBtn");
if (searchButton) searchButton.addEventListener("click", loadProducts);

const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") loadProducts();
    });
}

const categorySelect = document.getElementById("categorySelect");
if (categorySelect) categorySelect.addEventListener("change", loadProducts);

loadProducts();


// Trigger fresh Railway deployment for product images
