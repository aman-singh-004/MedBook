package com.appointment.booking.config;

import com.appointment.booking.entity.Provider;
import com.appointment.booking.entity.User;
import com.appointment.booking.repository.ProviderRepository;
import com.appointment.booking.repository.UserRepository;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProviderRepository providerRepository;

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed users if none exist
        if (userRepository.count() == 0) {
            // Seed Admin User (admin / admin123)
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@example.com");
            admin.setPassword(BCrypt.hashpw("admin123", BCrypt.gensalt(10)));
            admin.setRole("ADMIN");
            userRepository.save(admin);

            // Seed Regular Patient User (john_doe / user123)
            User patient = new User();
            patient.setUsername("john_doe");
            patient.setEmail("john@example.com");
            patient.setPassword(BCrypt.hashpw("user123", BCrypt.gensalt(10)));
            patient.setRole("USER");
            userRepository.save(patient);
            
            System.out.println(">>> Database Seeded: Default Admin ('admin' / 'admin123') and User ('john_doe' / 'user123') created.");
        }

        // 2. Seed doctor profiles if none exist
        if (providerRepository.count() == 0) {
            providerRepository.save(new Provider(
                    "Dr. Sarah Connor", 
                    "Cardiologist", 
                    "sarah.connor@clinic.com | +1 555-0199", 
                    "09:00,10:00,11:00,14:00,15:00"
            ));
            
            providerRepository.save(new Provider(
                    "Dr. Alan Grant", 
                    "Pediatrician", 
                    "alan.grant@clinic.com | +1 555-0144", 
                    "08:00,09:30,11:00,13:30,15:00,16:30"
            ));
            
            providerRepository.save(new Provider(
                    "Dr. Ellie Sattler", 
                    "Dermatologist", 
                    "ellie.sattler@clinic.com | +1 555-0123", 
                    "10:00,11:00,12:00,14:00,16:00"
            ));
            
            System.out.println(">>> Database Seeded: Default Doctors created.");
        }
    }
}
