package com.appointment.booking.service;

import com.appointment.booking.dto.AuthResponse;
import com.appointment.booking.dto.LoginRequest;
import com.appointment.booking.dto.RegisterRequest;
import com.appointment.booking.entity.User;
import com.appointment.booking.entity.UserSession;
import com.appointment.booking.exception.BadRequestException;
import com.appointment.booking.repository.UserRepository;
import com.appointment.booking.repository.UserSessionRepository;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserSessionRepository userSessionRepository;

    @Transactional
    public User registerUser(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered");
        }

        // Encrypt the password using BCrypt
        String hashedPassword = BCrypt.hashpw(request.getPassword(), BCrypt.gensalt(10));

        // Create user entity
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(hashedPassword);
        
        // Ensure role is either USER or ADMIN
        String role = request.getRole() != null ? request.getRole().toUpperCase() : "USER";
        if (!"USER".equals(role) && !"ADMIN".equals(role)) {
            role = "USER";
        }
        user.setRole(role);

        return userRepository.save(user);
    }

    @Transactional
    public AuthResponse loginUser(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadRequestException("Invalid username or password"));

        // Verify password
        if (!BCrypt.checkpw(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid username or password");
        }

        // Clean up any existing session for this user first
        userSessionRepository.deleteByUserId(user.getId());

        // Generate session token
        String token = UUID.randomUUID().toString();
        // Session valid for 12 hours
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(12);

        UserSession session = new UserSession(token, user, expiresAt);
        userSessionRepository.save(session);

        return new AuthResponse(token, user.getId(), user.getUsername(), user.getEmail(), user.getRole());
    }

    @Transactional
    public void logoutUser(String token) {
        userSessionRepository.deleteByToken(token);
    }
}
