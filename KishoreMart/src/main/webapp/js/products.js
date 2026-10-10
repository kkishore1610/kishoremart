function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function localProductImage(product) {
    const name = String(product?.name ?? "").trim().toLowerCase();
    const known = {
        "wireless mouse": "wireless-mouse.svg",
        "mechanical keyboard": "mechanical-keyboard.svg",
        "usb-c hub": "usb-c-hub.svg",
        "cotton t-shirt": "cotton-t-shirt.svg",
        "denim jacket": "denim-jacket.svg",
        "running shoes": "running-shoes.svg",
        "stainless steel bottle": "stainless-steel-bottle.svg",
        "desk lamp": "desk-lamp.svg"
    };
    const slug = name.normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return "/images/products/" + (known[name] || (slug ? slug + ".svg" : "wireless-mouse.svg"));
}

function productPlaceholderDataUri(label) {
    const safeLabel = escapeHtml(String(label || "KishoreMart product").slice(0, 42));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eef7ef"/><stop offset="1" stop-color="#d9eadc"/></linearGradient></defs><rect width="640" height="480" rx="28" fill="url(#g)"/><circle cx="320" cy="185" r="94" fill="#ffffff" stroke="#b9d2bf" stroke-width="5"/><path d="M275 175h90l-8 76h-74z" fill="#2b6b43"/><path d="M295 175v-20a25 25 0 0 1 50 0v20" fill="none" stroke="#2b6b43" stroke-width="10"/><text x="320" y="350" font-family="Arial,sans-serif" font-size="25" font-weight="700" text-anchor="middle" fill="#19482d">${safeLabel}</text><text x="320" y="386" font-family="Arial,sans-serif" font-size="18" text-anchor="middle" fill="#55745d">KishoreMart</text></svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function attachProductImageFallbacks(root) {
    root.querySelectorAll("img.product-image").forEach(img => {
        img.addEventListener("error", () => {
            if (img.dataset.fallbackUsed === "yes") return;
            img.dataset.fallbackUsed = "yes";
            img.src = productPlaceholderDataUri(img.alt);
        }, { once: true });
    });
}

async function loadProducts() {
    const grid = document.getElementById("productGrid");
    const searchInput = document.getElementById("searchInput");
    const categorySelect = document.getElementById("categorySelect");
    if (!grid) return;

    const params = new URLSearchParams();
    const keyword = searchInput ? searchInput.value.trim() : "";
    const category = categorySelect ? categorySelect.value : "";
    if (keyword) params.set("q", keyword);
    if (category) params.set("category", category);

    grid.innerHTML = '<p class="catalog-loading">Loading products...</p>';
    let timeoutId;
    try {
        const path = "/products" + (params.toString() ? "?" + params.toString() : "");
        const timeout = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("The product request timed out. Press Retry.")), 10000);
        });
        let data = await Promise.race([api.get(path), timeout]);
        clearTimeout(timeoutId);
        if (!Array.isArray(data)) {
            if (Array.isArray(data?.products)) data = data.products;
            else if (Array.isArray(data?.items)) data = data.items;
            else throw new Error("The product API returned an unexpected response.");
        }
        if (data.length === 0) {
            grid.innerHTML = '<p class="catalog-empty">No products found. Try another search.</p>';
            return;
        }
        grid.innerHTML = data.map(renderProductCard).join("");
        attachProductImageFallbacks(grid);
    } catch (err) {
        clearTimeout(timeoutId);
        console.error("KishoreMart product loading failed:", err);
        grid.innerHTML = `<div class="catalog-error"><p>Could not load products: ${escapeHtml(err.message || "Unknown error")}</p><button type="button" id="retryProducts">Retry</button></div>`;
        const retry = document.getElementById("retryProducts");
        if (retry) retry.addEventListener("click", loadProducts);
    }
}

function renderProductCard(product) {
    const name = escapeHtml(product.name || "Product");
    const category = escapeHtml(product.category || "General");
    const id = String(product.id ?? "");
    const image = escapeHtml(localProductImage(product));
    const stock = Number(product.stockQty || 0);
    const price = formatMoney(product.price);
    const encodedId = encodeURIComponent(id);
    return `
      <article class="product-card">
        <a class="product-card-link" href="product-detail.jsp?id=${encodedId}" aria-label="View ${name}">
          <div class="product-image-wrap">
            <img class="product-image" src="${image}" alt="${name}" loading="lazy">
            <span class="product-image-tag">${category}</span>
          </div>
          <div class="product-card-content">
            <span class="category">${category}</span>
            <strong class="product-name">${name}</strong>
            <span class="price">${escapeHtml(price)}</span>
            <span class="product-stock ${stock > 0 ? "in-stock" : "out-of-stock"}">${stock > 0 ? stock + " in stock" : "Out of stock"}</span>
          </div>
        </a>
        <div class="quick-cart-actions">
          <button type="button" class="quick-add-btn" data-product-id="${escapeHtml(id)}" ${stock <= 0 ? "disabled" : ""}>Add to cart</button>
          <button type="button" class="quick-buy-btn" data-product-id="${escapeHtml(id)}" ${stock <= 0 ? "disabled" : ""}>Buy now</button>
        </div>
        <p class="quick-cart-msg" aria-live="polite"></p>
      </article>`;
}

async function addProductToCart(button, buyNow) {
    const card = button.closest(".product-card");
    const message = card ? card.querySelector(".quick-cart-msg") : null;
    const buttons = card ? card.querySelectorAll(".quick-add-btn, .quick-buy-btn") : [button];
    buttons.forEach(b => { b.disabled = true; });
    button.textContent = buyNow ? "Processing..." : "Adding...";
    try {
        await api.post("/cart/items", { productId: Number(button.dataset.productId), quantity: 1 });
        if (message) message.textContent = "Added to cart successfully.";
        button.textContent = buyNow ? "Added!" : "Added âœ“";
        if (buyNow) {
            window.location.href = "/jsp/cart.jsp";
            return;
        }
        buttons.forEach(b => { b.disabled = false; });
        button.disabled = false;
    } catch (err) {
        if (message) {
            if (err.status === 401 || err.status === 403 || /login|sign in|session|authenticated|buyer/i.test(err.message || "")) {
                message.innerHTML = 'Please <a href="/jsp/login.jsp">log in</a> as a buyer to add items to your cart.';
            } else {
                message.textContent = err.message || "Could not add this item.";
            }
        }
        buttons.forEach(b => { b.disabled = false; });
        button.textContent = buyNow ? "Buy now" : "Add to cart";
    }
}

const productGrid = document.getElementById("productGrid");
if (productGrid) {
    productGrid.addEventListener("click", event => {
        const addButton = event.target.closest(".quick-add-btn");
        const buyButton = event.target.closest(".quick-buy-btn");
        if (addButton) addProductToCart(addButton, false);
        else if (buyButton) addProductToCart(buyButton, true);
    });
}
const searchButton = document.getElementById("searchBtn");
if (searchButton) searchButton.addEventListener("click", loadProducts);
const searchInput = document.getElementById("searchInput");
if (searchInput) searchInput.addEventListener("keydown", event => { if (event.key === "Enter") loadProducts(); });
const categorySelect = document.getElementById("categorySelect");
if (categorySelect) categorySelect.addEventListener("change", loadProducts);
loadProducts();
