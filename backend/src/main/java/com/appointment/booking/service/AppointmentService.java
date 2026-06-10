package com.appointment.booking.service;

import com.appointment.booking.dto.AppointmentRequest;
import com.appointment.booking.entity.Appointment;
import com.appointment.booking.entity.Provider;
import com.appointment.booking.entity.User;
import com.appointment.booking.exception.BadRequestException;
import com.appointment.booking.exception.ResourceNotFoundException;
import com.appointment.booking.repository.AppointmentRepository;
import com.appointment.booking.repository.ProviderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AppointmentService {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private ProviderRepository providerRepository;

    public Page<Appointment> getAllAppointments(Pageable pageable) {
        return appointmentRepository.findAll(pageable);
    }

    public List<Appointment> getAllAppointmentsList() {
        return appointmentRepository.findAll();
    }

    public List<Appointment> getAppointmentsByUserId(Long userId) {
        return appointmentRepository.findByUserIdOrderByAppointmentDateDescTimeSlotDesc(userId);
    }

    public Page<Appointment> getAppointmentsByUserIdPaginated(Long userId, Pageable pageable) {
        return appointmentRepository.findByUserId(userId, pageable);
    }

    public Appointment getAppointmentById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));
    }

    // Fetch already booked slots (non-cancelled) for a provider on a specific date
    public List<String> getBookedSlots(Long providerId, LocalDate date) {
        List<Appointment> appointments = appointmentRepository
                .findByProviderIdAndAppointmentDateAndStatusNot(providerId, date, "CANCELLED");
        
        return appointments.stream()
                .map(Appointment::getTimeSlot)
                .collect(Collectors.toList());
    }

    @Transactional
    public Appointment bookAppointment(User user, AppointmentRequest request) {
        Provider provider = providerRepository.findById(request.getProviderId())
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found with id: " + request.getProviderId()));

        // Validate that the slot is in the provider's available slots
        List<String> availableSlotsList = Arrays.asList(provider.getAvailableSlots().split(","));
        if (!availableSlotsList.contains(request.getTimeSlot())) {
            throw new BadRequestException("Selected time slot is not available for this provider");
        }

        // Prevent double booking (check for non-cancelled appointments at same date & time slot for this provider)
        boolean isDoubleBooked = appointmentRepository.existsByProviderIdAndAppointmentDateAndTimeSlotAndStatusNot(
                request.getProviderId(), request.getAppointmentDate(), request.getTimeSlot(), "CANCELLED"
        );
        if (isDoubleBooked) {
            throw new BadRequestException("This time slot is already booked. Please choose another slot or date.");
        }

        Appointment appointment = new Appointment();
        appointment.setUser(user);
        appointment.setProvider(provider);
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setTimeSlot(request.getTimeSlot());
        appointment.setStatus("PENDING"); // Defaults to PENDING, Admin can confirm
        appointment.setNotes(request.getNotes());

        return appointmentRepository.save(appointment);
    }

    @Transactional
    public Appointment updateAppointment(Long id, User currentUser, AppointmentRequest request) {
        Appointment appointment = getAppointmentById(id);

        // Security check: Only Admin or the owner can update
        if (!"ADMIN".equals(currentUser.getRole()) && !appointment.getUser().getId().equals(currentUser.getId())) {
            throw new BadRequestException("You do not have permission to modify this appointment");
        }

        Provider provider = providerRepository.findById(request.getProviderId())
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found with id: " + request.getProviderId()));

        // Validate slot existence in provider details
        List<String> availableSlotsList = Arrays.asList(provider.getAvailableSlots().split(","));
        if (!availableSlotsList.contains(request.getTimeSlot())) {
            throw new BadRequestException("Selected time slot is not available for this provider");
        }

        // Prevent double booking (excluding this appointment itself)
        boolean isDoubleBooked = appointmentRepository.existsByProviderIdAndAppointmentDateAndTimeSlotAndStatusNotAndIdNot(
                request.getProviderId(), request.getAppointmentDate(), request.getTimeSlot(), "CANCELLED", id
        );
        if (isDoubleBooked) {
            throw new BadRequestException("This time slot is already booked by another user.");
        }

        appointment.setProvider(provider);
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setTimeSlot(request.getTimeSlot());
        appointment.setNotes(request.getNotes());
        
        // If user modifies appointment, reset status to PENDING for re-approval
        if (!"ADMIN".equals(currentUser.getRole())) {
            appointment.setStatus("PENDING");
        }

        return appointmentRepository.save(appointment);
    }

    @Transactional
    public Appointment cancelAppointment(Long id, User currentUser) {
        Appointment appointment = getAppointmentById(id);

        // Security check: Only Admin or the owner can cancel
        if (!"ADMIN".equals(currentUser.getRole()) && !appointment.getUser().getId().equals(currentUser.getId())) {
            throw new BadRequestException("You do not have permission to cancel this appointment");
        }

        appointment.setStatus("CANCELLED");
        return appointmentRepository.save(appointment);
    }

    @Transactional
    public Appointment updateStatus(Long id, String status) {
        Appointment appointment = getAppointmentById(id);
        String upperStatus = status.toUpperCase();
        
        if (!Arrays.asList("PENDING", "CONFIRMED", "CANCELLED", "COMPLETED").contains(upperStatus)) {
            throw new BadRequestException("Invalid appointment status: " + status);
        }
        
        appointment.setStatus(upperStatus);
        return appointmentRepository.save(appointment);
    }
}
