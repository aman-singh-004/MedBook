package com.appointment.booking.service;

import com.appointment.booking.entity.Provider;
import com.appointment.booking.exception.ResourceNotFoundException;
import com.appointment.booking.repository.ProviderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProviderService {

    @Autowired
    private ProviderRepository providerRepository;

    public List<Provider> getAllProviders() {
        return providerRepository.findAll();
    }

    public Provider getProviderById(Long id) {
        return providerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found with id: " + id));
    }

    public List<Provider> searchProviders(String query) {
        if (query == null || query.trim().isEmpty()) {
            return providerRepository.findAll();
        }
        return providerRepository.findBySpecializationContainingIgnoreCaseOrNameContainingIgnoreCase(query, query);
    }

    @Transactional
    public Provider createProvider(Provider provider) {
        // Simple input validation before saving
        if (provider.getName() == null || provider.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Provider name is required");
        }
        if (provider.getSpecialization() == null || provider.getSpecialization().trim().isEmpty()) {
            throw new IllegalArgumentException("Specialization is required");
        }
        if (provider.getAvailableSlots() == null || provider.getAvailableSlots().trim().isEmpty()) {
            throw new IllegalArgumentException("At least one available slot is required");
        }
        return providerRepository.save(provider);
    }

    @Transactional
    public Provider updateProvider(Long id, Provider providerDetails) {
        Provider provider = getProviderById(id);
        
        provider.setName(providerDetails.getName());
        provider.setSpecialization(providerDetails.getSpecialization());
        provider.setContactInfo(providerDetails.getContactInfo());
        provider.setAvailableSlots(providerDetails.getAvailableSlots());
        
        return providerRepository.save(provider);
    }

    @Transactional
    public void deleteProvider(Long id) {
        Provider provider = getProviderById(id);
        providerRepository.delete(provider);
    }
}
