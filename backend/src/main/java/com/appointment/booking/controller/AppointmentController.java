package com.appointment.booking.controller;

import com.appointment.booking.dto.AppointmentRequest;
import com.appointment.booking.entity.Appointment;
import com.appointment.booking.entity.User;
import com.appointment.booking.exception.BadRequestException;
import com.appointment.booking.repository.ProviderRepository;
import com.appointment.booking.repository.UserRepository;
import com.appointment.booking.service.AppointmentService;
import com.appointment.booking.service.ProviderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private ProviderRepository providerRepository;

    @Autowired
    private UserRepository userRepository;

    // Helper to get current user from request context (set by interceptor)
    private User getCurrentUser(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) {
            throw new BadRequestException("User context not found in request");
        }
        return user;
    }

    // Get appointments (Paginated or Non-paginated based on query parameters)
    // Admins see all, Users see only their own
    @GetMapping
    public ResponseEntity<?> getAppointments(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            HttpServletRequest request) {
        
        User currentUser = getCurrentUser(request);
        boolean isAdmin = "ADMIN".equals(currentUser.getRole());

        // Handle pagination if page & size params are provided
        if (page != null && size != null) {
            // Sort by date desc, then by time slot desc
            Pageable pageable = PageRequest.of(page, size, Sort.by("appointmentDate").descending().and(Sort.by("timeSlot").descending()));
            if (isAdmin) {
                Page<Appointment> paginated = appointmentService.getAllAppointments(pageable);
                return ResponseEntity.ok(paginated);
            } else {
                Page<Appointment> paginated = appointmentService.getAppointmentsByUserIdPaginated(currentUser.getId(), pageable);
                return ResponseEntity.ok(paginated);
            }
        }

        // Return flat list if pagination parameters are not present
        if (isAdmin) {
            return ResponseEntity.ok(appointmentService.getAllAppointmentsList());
        } else {
            return ResponseEntity.ok(appointmentService.getAppointmentsByUserId(currentUser.getId()));
        }
    }

    // Get appointment details by ID
    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointmentById(@PathVariable Long id, HttpServletRequest request) {
        User currentUser = getCurrentUser(request);
        Appointment appointment = appointmentService.getAppointmentById(id);

        // Access check
        if (!"ADMIN".equals(currentUser.getRole()) && !appointment.getUser().getId().equals(currentUser.getId())) {
            throw new BadRequestException("You do not have permission to view this appointment");
        }

        return ResponseEntity.ok(appointment);
    }

    // Dynamic slot checking: Get already-booked slots for a doctor on a specific date
    @GetMapping("/booked-slots")
    public ResponseEntity<List<String>> getBookedSlots(
            @RequestParam Long providerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<String> bookedSlots = appointmentService.getBookedSlots(providerId, date);
        return ResponseEntity.ok(bookedSlots);
    }

    // Book a new appointment
    @PostMapping
    public ResponseEntity<Appointment> bookAppointment(
            @Valid @RequestBody AppointmentRequest req, 
            HttpServletRequest request) {
        User currentUser = getCurrentUser(request);
        Appointment appointment = appointmentService.bookAppointment(currentUser, req);
        return new ResponseEntity<>(appointment, HttpStatus.CREATED);
    }

    // Update appointment details (date/time/notes)
    @PutMapping("/{id}")
    public ResponseEntity<Appointment> updateAppointment(
            @PathVariable Long id,
            @Valid @RequestBody AppointmentRequest req,
            HttpServletRequest request) {
        User currentUser = getCurrentUser(request);
        Appointment updated = appointmentService.updateAppointment(id, currentUser, req);
        return ResponseEntity.ok(updated);
    }

    // Cancel appointment (soft-cancel, sets status to CANCELLED)
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Appointment> cancelAppointment(@PathVariable Long id, HttpServletRequest request) {
        User currentUser = getCurrentUser(request);
        Appointment cancelled = appointmentService.cancelAppointment(id, currentUser);
        return ResponseEntity.ok(cancelled);
    }

    // Admin endpoint: Update appointment status (PENDING, CONFIRMED, CANCELLED, COMPLETED)
    @PutMapping("/{id}/status")
    public ResponseEntity<Appointment> updateAppointmentStatus(
            @PathVariable Long id,
            @RequestParam String status,
            HttpServletRequest request) {
        User currentUser = getCurrentUser(request);
        if (!"ADMIN".equals(currentUser.getRole())) {
            throw new BadRequestException("Access denied: Admin privileges required");
        }
        Appointment updated = appointmentService.updateStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    // Admin endpoint: Get dashboard stats
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats(HttpServletRequest request) {
        User currentUser = getCurrentUser(request);
        if (!"ADMIN".equals(currentUser.getRole())) {
            throw new BadRequestException("Access denied: Admin privileges required");
        }

        List<Appointment> allAppts = appointmentService.getAllAppointmentsList();
        long totalAppts = allAppts.size();
        long pending = allAppts.stream().filter(a -> "PENDING".equalsIgnoreCase(a.getStatus())).count();
        long confirmed = allAppts.stream().filter(a -> "CONFIRMED".equalsIgnoreCase(a.getStatus())).count();
        long cancelled = allAppts.stream().filter(a -> "CANCELLED".equalsIgnoreCase(a.getStatus())).count();
        long completed = allAppts.stream().filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus())).count();

        long totalDoctors = providerRepository.count();
        // Count users with role 'USER'
        long totalPatients = userRepository.findAll().stream().filter(u -> "USER".equalsIgnoreCase(u.getRole())).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalAppointments", totalAppts);
        stats.put("pendingAppointments", pending);
        stats.put("confirmedAppointments", confirmed);
        stats.put("cancelledAppointments", cancelled);
        stats.put("completedAppointments", completed);
        stats.put("totalDoctors", totalDoctors);
        stats.put("totalPatients", totalPatients);

        return ResponseEntity.ok(stats);
    }
}
