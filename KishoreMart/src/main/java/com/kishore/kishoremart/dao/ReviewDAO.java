package com.kishore.kishoremart.dao;

import com.kishore.kishoremart.exception.DataAccessException;
import com.kishore.kishoremart.model.Review;

import java.util.List;

public interface ReviewDAO {
    Review insert(Review review) throws DataAccessException;
    List<Review> findByProduct(long productId) throws DataAccessException;
    boolean existsByUserAndOrderAndProduct(long userId, long orderId, long productId) throws DataAccessException;
    double averageRating(long productId) throws DataAccessException;
}
