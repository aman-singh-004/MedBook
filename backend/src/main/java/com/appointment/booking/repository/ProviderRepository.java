package com.appointment.booking.repository;

import com.appointment.booking.entity.Provider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProviderRepository extends JpaRepository<Provider, Long> {
    List<Provider> findBySpecializationContainingIgnoreCaseOrNameContainingIgnoreCase(String specialization, String name);
}
