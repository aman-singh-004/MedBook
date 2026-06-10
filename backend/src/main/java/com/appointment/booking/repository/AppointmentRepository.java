package com.appointment.booking.repository;

import com.appointment.booking.entity.Appointment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    
    // Find all appointments for a specific user (no pagination)
    List<Appointment> findByUserIdOrderByAppointmentDateDescTimeSlotDesc(Long userId);
    
    // Find appointments for a user with pagination
    Page<Appointment> findByUserId(Long userId, Pageable pageable);
    
    // Find all appointments for a specific doctor
    List<Appointment> findByProviderId(Long providerId);
    
    // Find already-booked (non-cancelled) slots for a doctor on a specific date
    // Useful for disabling booked slots on the frontend
    List<Appointment> findByProviderIdAndAppointmentDateAndStatusNot(Long providerId, LocalDate date, String status);

    // Check if a doctor is already booked at a specific date and time slot
    boolean existsByProviderIdAndAppointmentDateAndTimeSlotAndStatusNot(Long providerId, LocalDate date, String timeSlot, String status);
    
    // Check if a doctor is already booked at a specific date and time slot, excluding a specific appointment (for updates)
    boolean existsByProviderIdAndAppointmentDateAndTimeSlotAndStatusNotAndIdNot(Long providerId, LocalDate date, String timeSlot, String status, Long id);
}
