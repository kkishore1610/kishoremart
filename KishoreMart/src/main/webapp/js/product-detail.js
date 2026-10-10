function getProductIdFromUrl() {
    return new URLSearchParams(window.location.search).get("id");
}
function detailProductImage(product) {
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
    const slug = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return "/images/products/" + (known[name] || (slug ? slug + ".svg" : "wireless-mouse.svg"));
}
function detailPlaceholder(label) {
    const safe = escapeHtml(String(label || "KishoreMart product").slice(0, 42));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" rx="28" fill="#eaf4ec"/><circle cx="320" cy="190" r="90" fill="#fff" stroke="#b7d0bf" stroke-width="5"/><path d="M275 180h90l-8 76h-74z" fill="#2b6b43"/><path d="M295 180v-20a25 25 0 0 1 50 0v20" fill="none" stroke="#2b6b43" stroke-width="10"/><text x="320" y="350" font-family="Arial,sans-serif" font-size="25" font-weight="700" text-anchor="middle" fill="#19482d">${safe}</text></svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}
async function loadProduct() {
    const container = document.getElementById("productDetail");
    const id = getProductIdFromUrl();
    if (!id) { container.innerHTML = "<p>No product specified.</p>"; return; }
    try {
        const [product, reviewData] = await Promise.all([
            api.get("/products/" + encodeURIComponent(id)),
            api.get("/reviews/product/" + encodeURIComponent(id))
        ]);
        container.innerHTML = `
            <img class="detail-product-image" src="${escapeHtml(detailProductImage(product))}" alt="${escapeHtml(product.name)}" style="max-width:320px;width:100%;height:280px;object-fit:contain;background:#edf5ef;border-radius:14px;padding:12px;">
            <h1>${escapeHtml(product.name)}</h1>
            <p>${escapeHtml(product.description || "")}</p>
            <p class="price">${escapeHtml(formatMoney(product.price))}</p>
            <p>${product.stockQty > 0 ? product.stockQty + " in stock" : "Out of stock"}</p>
            <p>Average rating: ${reviewData.averageRating ? reviewData.averageRating.toFixed(1) : "No ratings yet"} / 5</p>
            <label for="qty">Quantity</label>
            <input type="number" id="qty" min="1" max="${Math.max(1, Number(product.stockQty || 1))}" value="1" style="width:80px;">
            <button id="addToCartBtn" ${product.stockQty > 0 ? "" : "disabled"}>Add to cart</button>
            <button id="buyNowBtn" ${product.stockQty > 0 ? "" : "disabled"}>Buy now</button>
            <p id="addToCartMsg" aria-live="polite"></p>
        `;
        const image = container.querySelector(".detail-product-image");
        image.addEventListener("error", () => { if (image.dataset.fallbackUsed !== "yes") { image.dataset.fallbackUsed = "yes"; image.src = detailPlaceholder(product.name); } }, { once: true });
        document.getElementById("addToCartBtn").addEventListener("click", () => addToCart(product.id, false));
        document.getElementById("buyNowBtn").addEventListener("click", () => addToCart(product.id, true));
        renderReviews(reviewData.reviews);
        const reviewForm = document.getElementById("reviewForm");
        if (reviewForm) { reviewForm.classList.remove("hidden"); reviewForm.dataset.productId = product.id; }
    } catch (err) {
        container.innerHTML = "<p>Could not load product: " + escapeHtml(err.message || "Unknown error") + "</p>";
    }
}
function renderReviews(reviews) {
    const list = document.getElementById("reviewList");
    if (!list) return;
    if (!reviews || reviews.length === 0) { list.innerHTML = "<p>No reviews yet.</p>"; return; }
    list.innerHTML = reviews.map(r => `<div class="order-card"><strong>${"&#9733;".repeat(r.rating)}${"&#9734;".repeat(5 - r.rating)}</strong> by ${escapeHtml(r.userName)}<p>${escapeHtml(r.comment || "")}</p></div>`).join("");
}
async function addToCart(productId, buyNow) {
    const msg = document.getElementById("addToCartMsg");
    const qtyField = document.getElementById("qty");
    const quantity = Math.max(1, parseInt(qtyField?.value, 10) || 1);
    const addButton = document.getElementById("addToCartBtn");
    const buyButton = document.getElementById("buyNowBtn");
    if (addButton) addButton.disabled = true;
    if (buyButton) buyButton.disabled = true;
    try {
        await api.post("/cart/items", { productId: Number(productId), quantity });
        if (buyNow) { window.location.href = "/jsp/cart.jsp"; return; }
        if (msg) msg.textContent = "Added to cart successfully. Open Cart to place your order.";
    } catch (err) {
        if (msg) {
            if (err.status === 401 || err.status === 403 || /login|sign in|session|authenticated|buyer/i.test(err.message || "")) {
                msg.innerHTML = 'Please <a href="/jsp/login.jsp">log in</a> as a buyer before adding to cart.';
            } else msg.textContent = err.message || "Could not add item to cart.";
        }
    } finally {
        if (addButton) addButton.disabled = false;
        if (buyButton) buyButton.disabled = false;
    }
}
const reviewForm = document.getElementById("reviewForm");
if (reviewForm) reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("reviewError");
    errorEl.textContent = "";
    const productId = parseInt(e.target.dataset.productId, 10);
    const orderId = parseInt(document.getElementById("orderIdForReview").value, 10);
    const rating = parseInt(document.getElementById("rating").value, 10);
    const comment = document.getElementById("comment").value;
    try { await api.post("/reviews", { productId, orderId, rating, comment }); loadProduct(); }
    catch (err) { errorEl.textContent = err.message || "Could not submit review."; }
});
loadProduct();
