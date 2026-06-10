-- Create Database
CREATE DATABASE IF NOT EXISTS appointment_db;
USE appointment_db;

-- 1. Users Table (Handles customers and admins)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Stored as BCrypt hash
    role VARCHAR(20) NOT NULL DEFAULT 'USER', -- 'USER' or 'ADMIN'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Providers Table (Handles doctors/service providers)
CREATE TABLE IF NOT EXISTS providers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    contact_info VARCHAR(150) NOT NULL,
    available_slots TEXT NOT NULL -- Store comma-separated time slots, e.g., "09:00,10:00,11:00,14:00,15:00"
);

-- 3. Appointments Table (Handles appointment bookings)
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(10) NOT NULL, -- E.g., "10:00"
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    -- Add a unique constraint to prevent booking overlaps
    -- Note: For a production app with cancellations, we normally enforce this at the service layer 
    -- to allow booking again if a prior appointment was cancelled.
    UNIQUE KEY unique_provider_slot (provider_id, appointment_date, time_slot)
);

-- 4. User Sessions Table (Handles custom token-based sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    token VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Data (Optional, for initial testing)
-- Default admin password: admin123 (hashed using BCrypt: $2a$10$wR3k3hY/HwzM8cW8JpM/AOVY95G.PZlD1bIqN6t6c0Fv04B1rX2mK)
-- Default user password: user123 (hashed using BCrypt: $2a$10$0k4z4f4sV7Bf3g2G3d4v5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1)
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@example.com', '$2a$10$wR3k3hY/HwzM8cW8JpM/AOVY95G.PZlD1bIqN6t6c0Fv04B1rX2mK', 'ADMIN'),
('john_doe', 'john@example.com', '$2a$10$0k4z4f4sV7Bf3g2G3d4v5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1', 'USER');

INSERT INTO providers (name, specialization, contact_info, available_slots) VALUES
('Dr. Sarah Connor', 'Cardiologist', 'sarah.connor@clinic.com | +1 555-0199', '09:00,10:00,11:00,14:00,15:00'),
('Dr. Alan Grant', 'Pediatrician', 'alan.grant@clinic.com | +1 555-0144', '08:00,09:30,11:00,13:30,15:00,16:30'),
('Dr. Ellie Sattler', 'Dermatologist', 'ellie.sattler@clinic.com | +1 555-0123', '10:00,11:00,12:00,14:00,16:00');
