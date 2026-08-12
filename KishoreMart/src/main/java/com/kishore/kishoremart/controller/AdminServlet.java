package com.kishore.kishoremart.controller;

import com.kishore.kishoremart.exception.AppException;
import com.kishore.kishoremart.exception.ForbiddenException;
import com.kishore.kishoremart.exception.NotFoundException;
import com.kishore.kishoremart.model.User;
import com.kishore.kishoremart.util.JsonUtil;

import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * F7: admin views all users and orders, and moderates/removes listings.
 * Mapped at /api/v1/admin/users, /api/v1/admin/orders,
 * /api/v1/admin/products/{id} (DELETE = moderate/deactivate).
 */
@WebServlet(urlPatterns = {"/api/v1/admin/users", "/api/v1/admin/orders", "/api/v1/admin/products/*"})
public class AdminServlet extends BaseApiServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            User admin = requireAdmin(req);
            switch (req.getServletPath()) {
                case "/api/v1/admin/users" -> JsonUtil.writeSuccess(resp, HttpServletResponse.SC_OK,
                        services().userService().listAll().stream()
                                .map(com.kishore.kishoremart.dto.UserResponseDTO::from).toList());
                case "/api/v1/admin/orders" -> JsonUtil.writeSuccess(resp, HttpServletResponse.SC_OK,
                        services().orderService().listAllForAdmin(admin));
                default -> JsonUtil.writeError(resp, HttpServletResponse.SC_NOT_FOUND, "NOT_FOUND", "Unknown route");
            }
        } catch (AppException e) {
            handleError(resp, e);
        }
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            User admin = requireAdmin(req);
            if (!req.getServletPath().equals("/api/v1/admin/products")) {
                JsonUtil.writeError(resp, HttpServletResponse.SC_NOT_FOUND, "NOT_FOUND", "Unknown route");
                return;
            }
            String pathInfo = req.getPathInfo();
            if (pathInfo == null || pathInfo.equals("/")) {
                throw new NotFoundException("Product id required");
            }
            long productId = Long.parseLong(pathInfo.substring(1));
            services().productService().moderateRemove(productId, admin);
            JsonUtil.writeSuccess(resp, HttpServletResponse.SC_OK, null);
        } catch (AppException e) {
            handleError(resp, e);
        } catch (NumberFormatException e) {
            JsonUtil.writeError(resp, HttpServletResponse.SC_BAD_REQUEST, "VALIDATION_ERROR", "Invalid product id");
        }
    }

    private User requireAdmin(HttpServletRequest req) throws AppException {
        User user = requireUser(req);
        if (user.getRole() != User.Role.ADMIN) {
            throw new ForbiddenException("Admin role required");
        }
        return user;
    }
}
