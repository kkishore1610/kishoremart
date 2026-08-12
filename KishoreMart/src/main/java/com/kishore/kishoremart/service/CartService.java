package com.kishore.kishoremart.service;

import com.kishore.kishoremart.dao.CartDAO;
import com.kishore.kishoremart.dao.ProductDAO;
import com.kishore.kishoremart.exception.AppException;
import com.kishore.kishoremart.exception.ConflictException;
import com.kishore.kishoremart.exception.NotFoundException;
import com.kishore.kishoremart.exception.ValidationException;
import com.kishore.kishoremart.model.CartItem;
import com.kishore.kishoremart.model.Product;

import java.math.BigDecimal;
import java.util.List;

/** Business rules for the cart (F4): add, update, remove, running total. No JDBC here. */
public class CartService {

    private final CartDAO cartDAO;
    private final ProductDAO productDAO;

    public CartService(CartDAO cartDAO, ProductDAO productDAO) {
        this.cartDAO = cartDAO;
        this.productDAO = productDAO;
    }

    public CartItem addItem(long userId, long productId, int quantity) throws AppException {
        if (quantity <= 0) {
            throw new ValidationException("quantity", "Quantity must be at least 1");
        }
        Product product = productDAO.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found"));
        if (!product.isActive()) {
            throw new ConflictException("This product is no longer available");
        }
        int existingQty = cartDAO.findByUserAndProduct(userId, productId).map(CartItem::getQuantity).orElse(0);
        int newQty = existingQty + quantity;
        if (newQty > product.getStockQty()) {
            throw new ConflictException("Only " + product.getStockQty() + " units in stock");
        }
        return cartDAO.upsert(userId, productId, newQty);
    }

    public void updateQuantity(long userId, long productId, int quantity) throws AppException {
        if (quantity <= 0) {
            throw new ValidationException("quantity", "Quantity must be at least 1");
        }
        Product product = productDAO.findById(productId)
                .orElseThrow(() -> new NotFoundException("Product not found"));
        if (quantity > product.getStockQty()) {
            throw new ConflictException("Only " + product.getStockQty() + " units in stock");
        }
        if (!cartDAO.updateQuantity(userId, productId, quantity)) {
            throw new NotFoundException("Item not in cart");
        }
    }

    public void removeItem(long userId, long productId) throws AppException {
        if (!cartDAO.remove(userId, productId)) {
            throw new NotFoundException("Item not in cart");
        }
    }

    public List<CartItem> view(long userId) throws AppException {
        return cartDAO.findByUser(userId);
    }

    public BigDecimal runningTotal(long userId) throws AppException {
        return view(userId).stream()
                .map(CartItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
