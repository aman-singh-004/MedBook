document.addEventListener('DOMContentLoaded', () => {
    // 1. Session Protection Check
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    const currentUser = getCurrentUser();
    const isAdmin = currentUser.role === 'ADMIN';

    // 2. Global State Variables
    let doctorsMap = {};        // Map of doctorId -> Doctor details
    let currentApptsPage = 0;   // Pagination state
    let totalApptsPages = 0;
    const apptsPageSize = 5;    // Show 5 items per page

    // 3. DOM Elements (Header & General)
    document.getElementById('display-username').innerText = currentUser.username;
    document.getElementById('display-role').innerText = currentUser.role === 'ADMIN' ? 'Clinic Administrator' : 'Patient';
    
    const logoutBtn = document.getElementById('logout-btn');
    
    // DOM Elements (Dashboard Layout Views)
    const userStats = [
        document.getElementById('stat-user-total'),
        document.getElementById('stat-user-pending'),
        document.getElementById('stat-user-confirmed')
    ];
    const adminStats = [
        document.getElementById('stat-admin-total'),
        document.getElementById('stat-admin-doctors'),
        document.getElementById('stat-admin-patients')
    ];
    const userBookingAction = document.getElementById('user-booking-action');
    const adminDoctorAction = document.getElementById('admin-doctor-action');
    const adminNavTabs = document.getElementById('admin-nav-tabs');
    const appointmentsPanel = document.getElementById('appointments-panel');
    const appointmentsTitle = document.getElementById('appointments-title');
    const appointmentsTableBody = document.getElementById('appointments-table-body');
    const adminDoctorsCrudPanel = document.getElementById('admin-doctors-crud-panel');
    
    // Filters and Search elements
    const doctorSearchInput = document.getElementById('doctor-search-input');
    const apptStatusFilter = document.getElementById('appt-status-filter');
    const doctorsList = document.getElementById('doctors-list');
    
    // Pagination Controls
    const paginationControls = document.getElementById('pagination-controls');
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const paginationInfo = document.getElementById('pagination-info');

    // Modals
    const apptModal = document.getElementById('appointment-modal');
    const apptForm = document.getElementById('appointment-form');
    const apptModalTitle = document.getElementById('appt-modal-title');
    const apptIdInput = document.getElementById('appt-id');
    const apptProviderSelect = document.getElementById('appt-provider');
    const apptDateInput = document.getElementById('appt-date');
    const apptSelectedSlotInput = document.getElementById('appt-selected-slot');
    const apptNotesInput = document.getElementById('appt-notes');
    const slotsPickerContainer = document.getElementById('slots-picker-container');
    const btnSubmitApptModal = document.getElementById('btn-submit-appt-modal');
    
    const docModal = document.getElementById('doctor-modal');
    const docForm = document.getElementById('doctor-form');
    const docModalTitle = document.getElementById('doctor-modal-title');
    const docIdInput = document.getElementById('doc-id');
    const docNameInput = document.getElementById('doc-name');
    const docSpecInput = document.getElementById('doc-spec');
    const docContactInput = document.getElementById('doc-contact');
    const docSlotsInput = document.getElementById('doc-slots');

    // 4. Role-Based UI Initialization
    if (isAdmin) {
        // Hide user elements, show admin elements
        userStats.forEach(el => el.style.display = 'none');
        adminStats.forEach(el => el.style.display = 'flex');
        userBookingAction.style.display = 'none';
        adminDoctorAction.style.display = 'block';
        adminNavTabs.style.display = 'flex';
        appointmentsTitle.innerText = 'All Patient Bookings';
        document.getElementById('th-patient-doctor').innerText = 'Patient / Doctor';
    }

    // Set minimum booking date to today
    const today = new Date().toISOString().split('T')[0];
    apptDateInput.setAttribute('min', today);

    // 5. Core Actions & API Integration
    
    // Load statistics
    async function loadStats() {
        try {
            if (isAdmin) {
                const stats = await apiRequest('/appointments/stats');
                document.getElementById('val-admin-total').innerText = stats.totalAppointments;
                document.getElementById('val-admin-doctors').innerText = stats.totalDoctors;
                document.getElementById('val-admin-patients').innerText = stats.totalPatients;
            } else {
                // For regular users, calculate stats from their full appointments list
                const appts = await apiRequest('/appointments');
                const total = appts.length;
                const pending = appts.filter(a => a.status === 'PENDING').length;
                const confirmed = appts.filter(a => a.status === 'CONFIRMED').length;
                
                document.getElementById('val-user-total').innerText = total;
                document.getElementById('val-user-pending').innerText = pending;
                document.getElementById('val-user-confirmed').innerText = confirmed;
            }
        } catch (error) {
            console.error('Failed to load dashboard stats', error);
        }
    }

    // Load Doctor Directory
    async function loadDoctors(searchQuery = '') {
        try {
            const endpoint = searchQuery ? `/providers?query=${encodeURIComponent(searchQuery)}` : '/providers';
            const providers = await apiRequest(endpoint);
            
            // Build map of ID -> details
            doctorsMap = {};
            providers.forEach(p => doctorsMap[p.id] = p);

            // Populate booking modal dropdown (only do once or when updated)
            if (!searchQuery) {
                apptProviderSelect.innerHTML = '<option value="">-- Choose a Doctor --</option>';
                providers.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.innerText = `${p.name} (${p.specialization})`;
                    apptProviderSelect.appendChild(opt);
                });
            }

            // Render catalog in sidebar
            renderDoctorCatalog(providers);
            
            // If Admin, render CRUD table
            if (isAdmin) {
                renderDoctorCrudTable(providers);
            }
        } catch (error) {
            showToast('Failed to load doctors list', 'error');
        }
    }

    // Render doctor profiles in sidebar
    function renderDoctorCatalog(providers) {
        if (providers.length === 0) {
            doctorsList.innerHTML = '<div class="empty-state">No doctors found</div>';
            return;
        }

        doctorsList.innerHTML = '';
        providers.forEach(p => {
            const card = document.createElement('div');
            card.className = 'glass-card provider-card';
            card.innerHTML = `
                <div class="provider-details">
                    <h3>🧑‍⚕️ ${p.name}</h3>
                    <div class="provider-meta">
                        <span><strong>Specialization:</strong> ${p.specialization}</span>
                        <span><strong>Contact:</strong> ${p.contactInfo}</span>
                        <span><strong>Timings:</strong> ${p.availableSlots.split(',').join(' | ')}</span>
                    </div>
                </div>
            `;
            doctorsList.appendChild(card);
        });
    }

    // Render doctor CRUD operations table (Admin only)
    function renderDoctorCrudTable(providers) {
        const tbody = document.getElementById('crud-doctors-table-body');
        if (providers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No doctor entries found. Add a doctor to begin.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        providers.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.id}</td>
                <td><strong>${p.name}</strong></td>
                <td><span class="badge badge-confirmed">${p.specialization}</span></td>
                <td>${p.contactInfo}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${p.availableSlots}
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-outline btn-sm edit-doc-btn" data-id="${p.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-doc-btn" data-id="${p.id}">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners for edit and delete buttons
        tbody.querySelectorAll('.edit-doc-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const docId = e.target.getAttribute('data-id');
                openDoctorModal(doctorsMap[docId]);
            });
        });

        tbody.querySelectorAll('.delete-doc-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.getAttribute('data-id');
                if (confirm(`Are you sure you want to remove Dr. ${doctorsMap[docId].name}? This will delete all their appointments.`)) {
                    try {
                        await apiRequest(`/providers/${docId}`, { method: 'DELETE' });
                        showToast('Doctor profile removed', 'success');
                        loadDoctors();
                        loadStats();
                        loadAppointments(currentApptsPage);
                    } catch (err) {
                        showToast(err.message, 'error');
                    }
                }
            });
        });
    }

    // Load Appointments (Paginated)
    async function loadAppointments(page = 0) {
        try {
            currentApptsPage = page;
            const filter = apptStatusFilter.value;
            
            // Build request with pagination params
            const endpoint = `/appointments?page=${page}&size=${apptsPageSize}`;
            const responseData = await apiRequest(endpoint);
            
            // Since API returns Page<Appointment>, extract elements
            const appointments = responseData.content || [];
            totalApptsPages = responseData.totalPages || 0;

            // Apply front-end filtering if a specific status (other than ALL) is selected
            let filteredAppts = appointments;
            if (filter !== 'ALL') {
                // If backend didn't filter it already, we filter here
                filteredAppts = appointments.filter(a => a.status === filter);
            }

            renderAppointmentsTable(filteredAppts);
            
            // Configure pagination controls
            if (totalApptsPages > 1) {
                paginationControls.style.display = 'flex';
                paginationInfo.innerText = `Page ${currentApptsPage + 1} of ${totalApptsPages}`;
                btnPrevPage.disabled = currentApptsPage === 0;
                btnNextPage.disabled = currentApptsPage === totalApptsPages - 1;
            } else {
                paginationControls.style.display = 'none';
            }
        } catch (error) {
            showToast('Failed to load appointments', 'error');
        }
    }

    // Render appointments table content
    function renderAppointmentsTable(appointments) {
        if (appointments.length === 0) {
            appointmentsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-state-icon">📅</div>
                        No appointments matched your search criteria.
                    </td>
                </tr>
            `;
            return;
        }

        appointmentsTableBody.innerHTML = '';
        appointments.forEach(a => {
            const tr = document.createElement('tr');
            
            // Formulate patient & doctor column
            let labelCol = '';
            if (isAdmin) {
                labelCol = `
                    <div class="table-doctor">
                        👤 ${a.user.username} 
                        <div style="font-size:0.75rem; color:var(--text-muted);">patient id: ${a.user.id}</div>
                        <div style="font-size:0.85rem; margin-top:0.25rem;">🩺 <strong>${a.provider.name}</strong></div>
                    </div>
                `;
            } else {
                labelCol = `
                    <div class="table-doctor">🩺 ${a.provider.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${a.provider.specialization}</div>
                `;
            }

            // Formulate actions column based on role & status
            let actionButtons = '';
            const status = a.status.toUpperCase();

            if (isAdmin) {
                if (status === 'PENDING') {
                    actionButtons += `<button class="btn btn-secondary btn-sm confirm-appt-btn" data-id="${a.id}">Confirm</button>`;
                }
                if (status === 'CONFIRMED') {
                    actionButtons += `<button class="btn btn-primary btn-sm complete-appt-btn" data-id="${a.id}">Complete</button>`;
                }
                if (status !== 'CANCELLED' && status !== 'COMPLETED') {
                    actionButtons += `<button class="btn btn-danger btn-sm cancel-appt-btn" data-id="${a.id}">Cancel</button>`;
                }
            } else {
                // Patient actions: Can edit or cancel before confirmed/completed
                if (status === 'PENDING' || status === 'CONFIRMED') {
                    actionButtons += `
                        <button class="btn btn-outline btn-sm edit-appt-btn" data-id="${a.id}">Reschedule</button>
                        <button class="btn btn-danger btn-sm cancel-appt-btn" data-id="${a.id}">Cancel</button>
                    `;
                }
            }

            if (!actionButtons) {
                actionButtons = '<span style="font-size:0.85rem; color:var(--text-muted);">None</span>';
            }

            // Note snippet preview
            const notesText = a.notes ? a.notes : '<em>No notes</em>';

            tr.innerHTML = `
                <td>${labelCol}</td>
                <td><strong>${a.appointmentDate}</strong></td>
                <td><span class="badge badge-outline" style="border: 1px solid var(--border-color);">${a.timeSlot}</span></td>
                <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${a.notes || ''}">
                    ${notesText}
                </td>
                <td><div class="table-actions">${actionButtons}</div></td>
            `;

            appointmentsTableBody.appendChild(tr);
        });

        // Add actions event handlers
        bindAppointmentActions();
    }

    // Bind event handlers to dynamic appointment action buttons
    function bindAppointmentActions() {
        // Confirm Button (Admin only)
        appointmentsTableBody.querySelectorAll('.confirm-appt-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                try {
                    await apiRequest(`/appointments/${id}/status?status=CONFIRMED`, { method: 'PUT' });
                    showToast('Appointment confirmed', 'success');
                    loadAppointments(currentApptsPage);
                    loadStats();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

        // Complete Button (Admin only)
        appointmentsTableBody.querySelectorAll('.complete-appt-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                try {
                    await apiRequest(`/appointments/${id}/status?status=COMPLETED`, { method: 'PUT' });
                    showToast('Appointment marked as completed', 'success');
                    loadAppointments(currentApptsPage);
                    loadStats();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

        // Cancel Button (Both User & Admin)
        appointmentsTableBody.querySelectorAll('.cancel-appt-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to cancel this appointment?')) {
                    try {
                        await apiRequest(`/appointments/${id}/cancel`, { method: 'PUT' });
                        showToast('Appointment cancelled successfully', 'info');
                        loadAppointments(currentApptsPage);
                        loadStats();
                    } catch (err) {
                        showToast(err.message, 'error');
                    }
                }
            });
        });

        // Edit Reschedule Button (User only)
        appointmentsTableBody.querySelectorAll('.edit-appt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                openAppointmentEdit(id);
            });
        });
    }

    // 6. Modal Functions (Booking and Doctor Form Controls)
    
    // Open modal to book a new appointment
    function openNewBookingModal() {
        apptForm.reset();
        apptIdInput.value = '';
        apptModalTitle.innerText = 'Schedule Appointment';
        btnSubmitApptModal.innerText = 'Book Appointment';
        
        apptProviderSelect.disabled = false;
        apptDateInput.disabled = false;
        
        clearSlotSelection();
        
        apptModal.classList.add('active');
    }

    // Open modal to edit/reschedule an appointment
    async function openAppointmentEdit(id) {
        try {
            const appt = await apiRequest(`/appointments/${id}`);
            
            apptIdInput.value = appt.id;
            apptModalTitle.innerText = 'Reschedule Appointment';
            btnSubmitApptModal.innerText = 'Save Changes';
            
            apptProviderSelect.value = appt.provider.id;
            // Disable changing doctor to keep edit simple, or allow it. Let's allow it but trigger slots reload
            apptDateInput.value = appt.appointmentDate;
            apptNotesInput.value = appt.notes || '';
            
            // Retrieve available slots dynamically
            await refreshSlotsPicker(appt.provider.id, appt.appointmentDate);
            
            // Set the existing selected slot as active
            const targetBtn = slotsPickerContainer.querySelector(`.slot-btn[data-slot="${appt.timeSlot}"]`);
            if (targetBtn) {
                targetBtn.disabled = false; // Make sure it isn't disabled even if booked (since this appointment owns it)
                targetBtn.click();
            }

            apptModal.classList.add('active');
        } catch (error) {
            showToast('Failed to load appointment details', 'error');
        }
    }

    // Close Booking Modal
    function closeBookingModal() {
        apptModal.classList.remove('active');
        apptForm.reset();
        clearSlotSelection();
    }

    function clearSlotSelection() {
        apptSelectedSlotInput.value = '';
        slotsPickerContainer.innerHTML = `
            <div style="grid-column: 1/-1; font-size: 0.85rem; color: var(--text-muted);">
                Please select a doctor and date to check available timings.
            </div>
        `;
    }

    // Fetch and draw the time-slot picker grid
    async function refreshSlotsPicker(providerId, dateString) {
        if (!providerId || !dateString) {
            clearSlotSelection();
            return;
        }

        try {
            slotsPickerContainer.innerHTML = '<div style="grid-column: 1/-1; font-size: 0.85rem; color: var(--text-muted);">Loading time slots...</div>';
            
            // Call API to get already booked slots
            const bookedSlots = await apiRequest(`/appointments/booked-slots?providerId=${providerId}&date=${dateString}`);
            
            // Find doctor to get all their defined slots
            const doctor = doctorsMap[providerId];
            if (!doctor) return;

            const allSlots = doctor.availableSlots.split(',').map(s => s.trim());
            slotsPickerContainer.innerHTML = '';
            
            allSlots.forEach(slot => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'slot-btn';
                btn.innerText = slot;
                btn.setAttribute('data-slot', slot);

                // If this slot is already booked, disable it
                if (bookedSlots.includes(slot)) {
                    btn.disabled = true;
                }

                btn.addEventListener('click', () => {
                    // Deselect previous selection
                    slotsPickerContainer.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                    
                    // Select current
                    btn.classList.add('selected');
                    apptSelectedSlotInput.value = slot;
                });

                slotsPickerContainer.appendChild(btn);
            });
        } catch (error) {
            slotsPickerContainer.innerHTML = '<div style="grid-column: 1/-1; font-size: 0.85rem; color: red;">Failed to retrieve slots.</div>';
        }
    }

    // Listener for triggers to reload slots in picker
    const handleSlotTrigger = () => {
        const providerId = apptProviderSelect.value;
        const date = apptDateInput.value;
        refreshSlotsPicker(providerId, date);
    };

    apptProviderSelect.addEventListener('change', handleSlotTrigger);
    apptDateInput.addEventListener('change', handleSlotTrigger);

    // Book/Edit Form Submit
    apptForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const apptId = apptIdInput.value;
        const providerId = apptProviderSelect.value;
        const date = apptDateInput.value;
        const slot = apptSelectedSlotInput.value;
        const notes = apptNotesInput.value.trim();

        if (!providerId || !date || !slot) {
            showToast('Please select a doctor, date, and available time slot', 'error');
            return;
        }

        const body = {
            providerId: parseInt(providerId),
            appointmentDate: date,
            timeSlot: slot,
            notes: notes || null
        };

        try {
            let response;
            if (apptId) {
                // Update
                response = await apiRequest(`/appointments/${apptId}`, {
                    method: 'PUT',
                    body
                });
                showToast('Appointment rescheduled successfully!', 'success');
            } else {
                // Book
                response = await apiRequest('/appointments', {
                    method: 'POST',
                    body
                });
                showToast('Appointment booked successfully! Awaiting confirmation.', 'success');
            }

            closeBookingModal();
            loadAppointments(currentApptsPage);
            loadStats();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });


    // Doctor Modal functions
    function openDoctorModal(doc = null) {
        docForm.reset();
        if (doc) {
            docIdInput.value = doc.id;
            docModalTitle.innerText = `Edit Dr. ${doc.name}`;
            docNameInput.value = doc.name;
            docSpecInput.value = doc.specialization;
            docContactInput.value = doc.contactInfo;
            docSlotsInput.value = doc.availableSlots;
        } else {
            docIdInput.value = '';
            docModalTitle.innerText = 'Add New Doctor Profile';
        }
        docModal.classList.add('active');
    }

    function closeDoctorModal() {
        docModal.classList.remove('active');
        docForm.reset();
    }

    docForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = docIdInput.value;
        const name = docNameInput.value.trim();
        const specialization = docSpecInput.value.trim();
        const contactInfo = docContactInput.value.trim();
        const availableSlots = docSlotsInput.value.trim();

        const body = { name, specialization, contactInfo, availableSlots };

        try {
            if (id) {
                // Edit
                await apiRequest(`/providers/${id}`, {
                    method: 'PUT',
                    body
                });
                showToast('Doctor profile updated successfully', 'success');
            } else {
                // Add new
                await apiRequest('/providers', {
                    method: 'POST',
                    body
                });
                showToast('Doctor profile added successfully', 'success');
            }

            closeDoctorModal();
            loadDoctors();
            loadStats();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // 7. General Navigation & Search Filters
    
    // Doctor search bar
    let searchTimeout;
    doctorSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadDoctors(e.target.value.trim());
        }, 300);
    });

    // Appointment status select filter
    apptStatusFilter.addEventListener('change', () => {
        loadAppointments(0); // Reset to page 1
    });

    // Pagination Click Listeners
    btnPrevPage.addEventListener('click', () => {
        if (currentApptsPage > 0) {
            loadAppointments(currentApptsPage - 1);
        }
    });

    btnNextPage.addEventListener('click', () => {
        if (currentApptsPage < totalApptsPages - 1) {
            loadAppointments(currentApptsPage + 1);
        }
    });

    // Modal UI Click handlers
    document.getElementById('open-book-modal-btn').addEventListener('click', openNewBookingModal);
    document.getElementById('close-appt-modal').addEventListener('click', closeBookingModal);
    document.getElementById('btn-cancel-appt-modal').addEventListener('click', closeBookingModal);

    if (isAdmin) {
        document.getElementById('open-doctor-modal-btn').addEventListener('click', () => openDoctorModal());
        document.getElementById('close-doctor-modal').addEventListener('click', closeDoctorModal);
        document.getElementById('btn-cancel-doctor-modal').addEventListener('click', closeDoctorModal);
        
        // Admin Nav tabs switching between Bookings and Doctor list
        const btnTabAppts = document.getElementById('tab-btn-appts');
        const btnTabDoctors = document.getElementById('tab-btn-doctors');
        
        btnTabAppts.addEventListener('click', () => {
            btnTabAppts.classList.add('active');
            btnTabDoctors.classList.remove('active');
            appointmentsPanel.style.display = 'block';
            adminDoctorsCrudPanel.style.display = 'none';
        });

        btnTabDoctors.addEventListener('click', () => {
            btnTabDoctors.classList.add('active');
            btnTabAppts.classList.remove('active');
            appointmentsPanel.style.display = 'none';
            adminDoctorsCrudPanel.style.display = 'block';
        });
    }

    // 8. Logout logic
    logoutBtn.addEventListener('click', async () => {
        try {
            // Trigger server-side logout
            const token = sessionStorage.getItem('token');
            if (token) {
                await fetch('http://localhost:8080/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (e) {
            console.error('Network error on logout', e);
        } finally {
            clearSession();
            showToast('Logged out successfully', 'info');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        }
    });

    // 9. Initial Load Invocation
    loadDoctors();
    loadAppointments(0);
    loadStats();
});
