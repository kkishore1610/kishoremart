async function loadCart() {
    const container = document.getElementById("cartItems");
    try {
        const data = await api.get("/cart");
        document.getElementById("cartTotal").textContent = formatMoney(data.total);
        if (data.items.length === 0) {
            container.innerHTML = "<p>Your cart is empty.</p>";
            return;
        }
        container.innerHTML = data.items.map(item => `
            <div class="cart-item" data-product-id="${item.productId}">
                <strong>${escapeHtml(item.productName)}</strong>
                &mdash; ${formatMoney(item.unitPrice)} each
                <div>
                    <label>Qty
                        <input type="number" min="1" value="${item.quantity}" class="qtyInput" style="width:70px;">
                    </label>
                    <button class="updateQtyBtn">Update</button>
                    <button class="removeBtn secondary">Remove</button>
                </div>
                <div>Line total: ${formatMoney(item.unitPrice * item.quantity)}</div>
            </div>
        `).join("");
        wireItemButtons();
    } catch (err) {
        container.innerHTML = "<p>Could not load cart: " + escapeHtml(err.message) + "</p>";
    }
}

function wireItemButtons() {
    document.querySelectorAll(".updateQtyBtn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const row = e.target.closest(".cart-item");
            const productId = row.dataset.productId;
            const qty = parseInt(row.querySelector(".qtyInput").value, 10);
            try {
                await api.put("/cart/items/" + productId, { quantity: qty });
                loadCart();
            } catch (err) {
                document.getElementById("checkoutMessage").textContent = err.message;
            }
        });
    });
    document.querySelectorAll(".removeBtn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const row = e.target.closest(".cart-item");
            const productId = row.dataset.productId;
            try {
                await api.del("/cart/items/" + productId);
                loadCart();
            } catch (err) {
                document.getElementById("checkoutMessage").textContent = err.message;
            }
        });
    });
}

document.getElementById("checkoutBtn").addEventListener("click", async () => {
    const msg = document.getElementById("checkoutMessage");
    msg.textContent = "";
    try {
        const order = await api.post("/orders/checkout");
        msg.textContent = "Order #" + order.id + " placed successfully!";
        loadCart();
    } catch (err) {
        msg.textContent = err.message;
    }
});

loadCart();
