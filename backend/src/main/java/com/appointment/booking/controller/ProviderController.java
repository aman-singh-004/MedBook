package com.appointment.booking.controller;

import com.appointment.booking.entity.Provider;
import com.appointment.booking.entity.User;
import com.appointment.booking.exception.BadRequestException;
import com.appointment.booking.service.ProviderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/providers")
public class ProviderController {

    @Autowired
    private ProviderService providerService;

    // Helper to check admin access
    private void checkAdminAccess(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null || !"ADMIN".equals(currentUser.getRole())) {
            throw new BadRequestException("Access denied: Admin privileges required");
        }
    }

    // Get all providers (supports searching/filtering by name or specialization)
    @GetMapping
    public ResponseEntity<List<Provider>> getAllProviders(@RequestParam(required = false) String query) {
        if (query != null && !query.trim().isEmpty()) {
            return ResponseEntity.ok(providerService.searchProviders(query));
        }
        return ResponseEntity.ok(providerService.getAllProviders());
    }

    // Get provider details by ID
    @GetMapping("/{id}")
    public ResponseEntity<Provider> getProviderById(@PathVariable Long id) {
        return ResponseEntity.ok(providerService.getProviderById(id));
    }

    // Admin endpoint: Create provider
    @PostMapping
    public ResponseEntity<Provider> createProvider(@RequestBody Provider provider, HttpServletRequest request) {
        checkAdminAccess(request);
        Provider created = providerService.createProvider(provider);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    // Admin endpoint: Update provider
    @PutMapping("/{id}")
    public ResponseEntity<Provider> updateProvider(
            @PathVariable Long id, 
            @RequestBody Provider providerDetails, 
            HttpServletRequest request) {
        checkAdminAccess(request);
        Provider updated = providerService.updateProvider(id, providerDetails);
        return ResponseEntity.ok(updated);
    }

    // Admin endpoint: Delete provider
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteProvider(@PathVariable Long id, HttpServletRequest request) {
        checkAdminAccess(request);
        providerService.deleteProvider(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Provider deleted successfully");
        return ResponseEntity.ok(response);
    }
}
