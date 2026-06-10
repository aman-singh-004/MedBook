package com.appointment.booking.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "providers")
public class Provider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 100)
    private String specialization;

    @Column(name = "contact_info", nullable = false, length = 150)
    private String contactInfo;

    @Column(name = "available_slots", nullable = false, columnDefinition = "TEXT")
    private String availableSlots; // Comma-separated list of time slots, e.g., "09:00,10:00,11:00"

    // Constructors
    public Provider() {}

    public Provider(String name, String specialization, String contactInfo, String availableSlots) {
        this.name = name;
        this.specialization = specialization;
        this.contactInfo = contactInfo;
        this.availableSlots = availableSlots;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSpecialization() {
        return specialization;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public String getContactInfo() {
        return contactInfo;
    }

    public void setContactInfo(String contactInfo) {
        this.contactInfo = contactInfo;
    }

    public String getAvailableSlots() {
        return availableSlots;
    }

    public void setAvailableSlots(String availableSlots) {
        this.availableSlots = availableSlots;
    }
}
