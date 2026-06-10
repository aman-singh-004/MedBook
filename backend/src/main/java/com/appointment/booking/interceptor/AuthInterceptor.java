package com.appointment.booking.interceptor;

import com.appointment.booking.entity.UserSession;
import com.appointment.booking.repository.UserSessionRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Autowired
    private UserSessionRepository userSessionRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Skip check for CORS preflight OPTIONS requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"message\": \"Unauthorized: Missing or invalid authorization header\"}");
            return false;
        }

        String token = authHeader.substring(7).trim();
        UserSession session = userSessionRepository.findByToken(token).orElse(null);

        if (session == null) {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"message\": \"Unauthorized: Session not found\"}");
            return false;
        }

        if (session.isExpired()) {
            // Clean up expired session
            userSessionRepository.delete(session);
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"message\": \"Unauthorized: Session has expired. Please log in again.\"}");
            return false;
        }

        // Store user details in request context for controllers to access
        request.setAttribute("currentUser", session.getUser());
        return true;
    }
}
