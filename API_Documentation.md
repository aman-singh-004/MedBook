# MedBook REST API Documentation

This document describes all REST API endpoints available in the **MedBook Appointment Booking System**. 

The base URL for all endpoints is: `http://localhost:8080/api`

---

## Authentication Endpoints

### 1. User Registration
* **Endpoint**: `/auth/register`
* **Method**: `POST`
* **Authentication**: None (Public)
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "user123",
  "role": "USER"
}
```
> Note: `role` can be `"USER"` (default) or `"ADMIN"`.
* **Response (201 Created)**:
```json
{
  "message": "User registered successfully",
  "username": "john_doe"
}
```
* **Response (400 Bad Request)**:
```json
{
  "message": "Username is already taken" 
}
```

### 2. User Login
* **Endpoint**: `/auth/login`
* **Method**: `POST`
* **Authentication**: None (Public)
* **Request Body**:
```json
{
  "username": "john_doe",
  "password": "user123"
}
```
* **Response (200 OK)**:
```json
{
  "token": "4a13d789-940d-4ea3-8f0a-112233445566",
  "id": 2,
  "username": "john_doe",
  "email": "john@example.com",
  "role": "USER"
}
```
> Save this `token` and attach it as a `Bearer` token in the `Authorization` header for all protected requests.

### 3. User Logout
* **Endpoint**: `/auth/logout`
* **Method**: `POST`
* **Authentication**: Required (Token validation)
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**:
```json
{
  "message": "Logged out successfully"
}
```

---

## Doctor/Service Provider Endpoints

### 1. List / Search Doctors
* **Endpoint**: `/providers`
* **Method**: `GET`
* **Authentication**: Required (Token validation)
* **Query Parameters** (Optional):
  * `query`: Search term matching doctor name or specialization (case-insensitive). E.g., `/providers?query=cardio`
* **Response (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "Dr. Sarah Connor",
    "specialization": "Cardiologist",
    "contactInfo": "sarah.connor@clinic.com | +1 555-0199",
    "availableSlots": "09:00,10:00,11:00,14:00,15:00"
  }
]
```

### 2. Get Doctor Details
* **Endpoint**: `/providers/{id}`
* **Method**: `GET`
* **Authentication**: Required (Token validation)
* **Response (200 OK)**:
```json
{
  "id": 1,
  "name": "Dr. Sarah Connor",
  "specialization": "Cardiologist",
  "contactInfo": "sarah.connor@clinic.com | +1 555-0199",
  "availableSlots": "09:00,10:00,11:00,14:00,15:00"
}
```

### 3. Add Doctor Profile
* **Endpoint**: `/providers`
* **Method**: `POST`
* **Authentication**: Required (Token validation + **ADMIN role**)
* **Request Body**:
```json
{
  "name": "Dr. Ian Malcolm",
  "specialization": "Neurologist",
  "contactInfo": "ian.malcolm@clinic.com | +1 555-0188",
  "availableSlots": "09:00,10:30,13:00,15:30"
}
```
* **Response (201 Created)**:
```json
{
  "id": 4,
  "name": "Dr. Ian Malcolm",
  "specialization": "Neurologist",
  "contactInfo": "ian.malcolm@clinic.com | +1 555-0188",
  "availableSlots": "09:00,10:30,13:00,15:30"
}
```

### 4. Update Doctor Profile
* **Endpoint**: `/providers/{id}`
* **Method**: `PUT`
* **Authentication**: Required (Token validation + **ADMIN role**)
* **Request Body**: (Same format as POST)
* **Response (200 OK)**: Returns updated doctor object.

### 5. Remove Doctor Profile
* **Endpoint**: `/providers/{id}`
* **Method**: `DELETE`
* **Authentication**: Required (Token validation + **ADMIN role**)
* **Response (200 OK)**:
```json
{
  "message": "Provider deleted successfully"
}
```

---

## Appointment Booking Endpoints

### 1. View Appointment List (Paginated / Non-paginated)
* **Endpoint**: `/appointments`
* **Method**: `GET`
* **Authentication**: Required (Token validation)
* **Behavior**:
  * Users with role `USER` only receive their own appointments.
  * Users with role `ADMIN` receive all appointments across the clinic.
* **Query Parameters** (Optional):
  * `page`: Page index (starts at 0). E.g., `/appointments?page=0&size=5`
  * `size`: Number of records per page.
* **Response (200 OK - Paginated)**:
```json
{
  "content": [
    {
      "id": 1,
      "user": {
        "id": 2,
        "username": "john_doe",
        "email": "john@example.com",
        "role": "USER"
      },
      "provider": {
        "id": 1,
        "name": "Dr. Sarah Connor",
        "specialization": "Cardiologist",
        "contactInfo": "sarah.connor@clinic.com | +1 555-0199",
        "availableSlots": "09:00,10:00,11:00,14:00,15:00"
      },
      "appointmentDate": "2026-06-12",
      "timeSlot": "10:00",
      "status": "PENDING",
      "notes": "Regular cardiac checkup",
      "createdAt": "2026-06-10T05:20:00"
    }
  ],
  "totalPages": 1,
  "totalElements": 1,
  "size": 5,
  "number": 0
}
```
* **Response (200 OK - Non-paginated)**: Returns a flat array of appointment objects instead of the wrapper.

### 2. Check Booked Slots
* **Endpoint**: `/appointments/booked-slots`
* **Method**: `GET`
* **Authentication**: Required (Token validation)
* **Query Parameters**:
  * `providerId`: Long ID of the doctor.
  * `date`: Target date in `YYYY-MM-DD` format.
* **Response (200 OK)**:
```json
["10:00", "14:00"]
```
> Note: The frontend uses this list to disable already-booked timings on the date selected.

### 3. Book Appointment
* **Endpoint**: `/appointments`
* **Method**: `POST`
* **Authentication**: Required (Token validation)
* **Request Body**:
```json
{
  "providerId": 1,
  "appointmentDate": "2026-06-12",
  "timeSlot": "10:00",
  "notes": "Regular cardiac checkup"
}
```
* **Response (201 Created)**: Returns the created appointment object with status `"PENDING"`.
* **Response (400 Bad Request - Double Booking)**:
```json
{
  "message": "This time slot is already booked. Please choose another slot or date."
}
```

### 4. Reschedule Appointment
* **Endpoint**: `/appointments/{id}`
* **Method**: `PUT`
* **Authentication**: Required (Token validation)
* **Request Body**: (Same format as POST booking)
* **Response (200 OK)**: Returns the updated appointment object (resets status to `"PENDING"` for user adjustments, unless updated by ADMIN).

### 5. Cancel Appointment
* **Endpoint**: `/appointments/{id}/cancel`
* **Method**: `PUT`
* **Authentication**: Required (Token validation)
* **Behavior**: Soft-cancels the appointment, changing its status to `"CANCELLED"`.
* **Response (200 OK)**: Returns the updated appointment details.

### 6. Update Appointment Status (Admin only)
* **Endpoint**: `/appointments/{id}/status`
* **Method**: `PUT`
* **Authentication**: Required (Token validation + **ADMIN role**)
* **Query Parameters**:
  * `status`: Target status (`"PENDING"`, `"CONFIRMED"`, `"CANCELLED"`, `"COMPLETED"`).
* **Response (200 OK)**: Returns updated appointment object.

### 7. Get Clinic Statistics (Admin only)
* **Endpoint**: `/appointments/stats`
* **Method**: `GET`
* **Authentication**: Required (Token validation + **ADMIN role**)
* **Response (200 OK)**:
```json
{
  "totalAppointments": 12,
  "pendingAppointments": 3,
  "confirmedAppointments": 5,
  "cancelledAppointments": 2,
  "completedAppointments": 2,
  "totalDoctors": 3,
  "totalPatients": 8
}
```
