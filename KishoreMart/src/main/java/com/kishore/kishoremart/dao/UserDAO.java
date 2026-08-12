package com.kishore.kishoremart.dao;

import com.kishore.kishoremart.exception.DataAccessException;
import com.kishore.kishoremart.model.User;

import java.util.Optional;

public interface UserDAO {
    User insert(User user) throws DataAccessException;
    Optional<User> findById(long id) throws DataAccessException;
    Optional<User> findByEmail(String email) throws DataAccessException;
    java.util.List<User> findAll() throws DataAccessException;
}
