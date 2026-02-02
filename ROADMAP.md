# Prenatal Ultrasound Booking System - Development Roadmap

## Project Overview
A full-featured, web-based appointment scheduling platform for multi-location prenatal ultrasound clinics. This roadmap breaks down the development into manageable phases with specific, actionable tasks.

---

## Phase 1: Foundation & Database Setup ✅
*Building the core infrastructure and data models*

### Database Schema & Types
- [x] **1.1** Create Supabase database schema for core entities
  - [x] 1.1.1 Create `users` table (id, email, role, first_name, last_name, phone, created_at, updated_at, last_login)
  - [x] 1.1.2 Create `services` table (id, name, description, duration, buffer_time, lead_time, reschedule_cutoff, instructions, price, sale_price, cancel_cutoff, scheduling_window, category_id, policy_fields, is_active, created_at, updated_at)
  - [x] 1.1.3 Create `locations` table (id, name, address, phone, email, is_active, created_at, updated_at)
  - [x] 1.1.4 Create `staff` table (id, user_id, employee_id, first_name, last_name, email, phone, hire_date, role, specializations, certifications, bio, is_active, created_at, updated_at)
  - [x] 1.1.5 Create `staff_services` table (id, staff_id, service_id, is_qualified, qualification_date, notes, created_at, updated_at)
  - [x] 1.1.6 Create `staff_locations` table (id, staff_id, location_id, is_primary, created_at, updated_at)
  - [x] 1.1.7 Create `service_categories` table (id, name, description, created_at, updated_at)
  - [x] 1.1.8 Set up proper foreign key constraints and indexes
  - [x] 1.1.9 Create database triggers for updated_at fields
  - [x] 1.1.10 Set up automatic user creation trigger on Supabase Auth signup

- [x] **1.2** Create TypeScript type definitions
  - [x] 1.2.1 Define `User` interface with role and profile properties
  - [x] 1.2.2 Define `Service` interface with all properties including policy fields
  - [x] 1.2.3 Define `Location` interface with all properties
  - [x] 1.2.4 Define `Staff` interface with qualifications and locations
  - [x] 1.2.5 Define `StaffServiceQualification` and `StaffLocationAssignment` interfaces
  - [x] 1.2.6 Define `ServiceCategory` and `ServicePolicyField` interfaces
  - [x] 1.2.7 Create API response/request types for all entities
  - [x] 1.2.8 Create comprehensive type definitions for forms and validation

- [x] **1.3** Set up database utilities
  - [x] 1.3.1 Create Supabase client configuration (server and client)
  - [x] 1.3.2 Create database service classes (UserService, LocationService, ServiceService, StaffService)
  - [x] 1.3.3 Set up error handling for database operations
  - [x] 1.3.4 Create RLS policies for all tables

---

## Phase 2: API Routes & Backend Logic ✅
*Building the server-side functionality*

### Core API Routes
- [x] **2.1** Services API (`/api/services`)
  - [x] 2.1.1 GET `/api/services` - List all services with pagination and filtering
  - [x] 2.1.2 GET `/api/services/[id]` - Get single service details
  - [x] 2.1.3 POST `/api/services` - Create new service with policy fields
  - [x] 2.1.4 PUT `/api/services/[id]` - Update service
  - [x] 2.1.5 DELETE `/api/services/[id]` - Delete service
  - [x] 2.1.6 Add input validation and error handling

- [x] **2.2** Locations API (`/api/locations-simple`)
  - [x] 2.2.1 GET `/api/locations-simple` - List all locations
  - [x] 2.2.2 GET `/api/locations-simple/[id]` - Get single location details
  - [x] 2.2.3 POST `/api/locations-simple` - Create new location
  - [x] 2.2.4 PUT `/api/locations-simple/[id]` - Update location
  - [x] 2.2.5 DELETE `/api/locations-simple/[id]` - Delete location
  - [x] 2.2.6 Add input validation and error handling

- [x] **2.3** Staff API (`/api/staff`)
  - [x] 2.3.1 GET `/api/staff` - List all staff with pagination and filtering
  - [x] 2.3.2 GET `/api/staff/[id]` - Get single staff member details
  - [x] 2.3.3 POST `/api/staff` - Create new staff member with qualifications and locations
  - [x] 2.3.4 PUT `/api/staff/[id]` - Update staff member
  - [x] 2.3.5 DELETE `/api/staff/[id]` - Delete staff member
  - [x] 2.3.6 Integrated qualification management in staff CRUD
  - [x] 2.3.7 Integrated location assignment management in staff CRUD
  - [x] 2.3.8 Add input validation and error handling

- [x] **2.4** Authentication & Authorization
  - [x] 2.4.1 Set up role-based access control (Admin, Client)
  - [x] 2.4.2 Create server-side auth checks for protecting admin routes
  - [x] 2.4.3 Add RLS policies for database security
  - [x] 2.4.4 Create user management API (`/api/users`)

---

## Phase 3: Admin Dashboard ✅
*Building the management interfaces for admins*

### Services Management (`/dashboard/services`)
- [x] **3.1** Services List Page
  - [x] 3.1.1 Create responsive data table with search and filtering
  - [x] 3.1.2 DataTable component with built-in pagination
  - [x] 3.1.3 Add sortable columns by name, duration, status
  - [x] 3.1.4 Add status toggle (active/inactive)
  - [x] 3.1.5 Add view/edit/delete actions
  - [x] 3.1.6 Add loading states and error handling with empty states

- [x] **3.2** Service Form (Create/Edit)
  - [x] 3.2.1 Create comprehensive service form with tabbed interface (Details, Pricing, Advanced, Policy, Staff)
  - [x] 3.2.2 Add form validation with react-hook-form
  - [x] 3.2.3 Add dynamic policy fields with drag-and-drop reordering
  - [x] 3.2.4 Add view mode for service details
  - [x] 3.2.5 Add save/cancel functionality with drawer UI
  - [x] 3.2.6 Add real-time form state management and validation feedback

### Locations Management (`/dashboard/locations`)
- [x] **3.3** Locations List Page
  - [x] 3.3.1 Create responsive data table with search and filtering
  - [ ] 3.3.2 Add map integration (deferred)
  - [x] 3.3.3 Add location status indicators
  - [ ] 3.3.4 Add staff count per location (deferred)
  - [x] 3.3.5 Add edit/delete/toggle active actions

- [x] **3.4** Location Form (Create/Edit)
  - [x] 3.4.1 Create location form with all required fields
  - [ ] 3.4.2 Add Google Maps integration (deferred)
  - [x] 3.4.3 Add contact information fields (name, address, phone, email)
  - [x] 3.4.4 Add active/inactive toggle
  - [x] 3.4.5 Add form validation and error handling with drawer UI

### Staff Management (`/dashboard/staff`)
- [x] **3.5** Staff List Page
  - [x] 3.5.1 Create responsive data table with staff information
  - [x] 3.5.2 Show qualifications (services) in table
  - [x] 3.5.3 Show assigned locations in table
  - [x] 3.5.4 Add search and filter by name/email
  - [x] 3.5.5 Add staff status management (active/inactive toggle)

- [x] **3.6** Staff Form (Create/Edit)
  - [x] 3.6.1 Create staff form with personal information (linked to user account)
  - [x] 3.6.2 Add service qualifications multi-select with searchable dropdown
  - [x] 3.6.3 Add location assignments multi-select
  - [x] 3.6.4 Add specializations and certifications management
  - [x] 3.6.5 Add user selection with search functionality
  - [x] 3.6.6 Add form validation and error handling with drawer UI

---

## Phase 4: Shift Management System
*Building the calendar-based shift creation and management*

### Shift Database Schema
- [x] **4.1** Create shift-related tables
  - [x] 4.1.1 Create `shifts` table (id, staff_id, location_id, start_time, end_time, priority, is_active, created_at, updated_at)
  - [x] 4.1.2 Create `shift_services` table (id, shift_id, service_id, max_bookings, created_at)
  - [x] 4.1.3 Create `blackout_periods` table (id, location_id, start_date, end_date, reason, created_at)
  - [x] 4.1.4 Add proper constraints and indexes

### Shift Management Interface
- [x] **4.2** Shift Calendar (`/dashboard/shift`)
  - [x] 4.2.1 Create week-view calendar component
  - [x] 4.2.2 Add click-to-create shift functionality
  - [x] 4.2.3 Add drag-and-drop shift editing
  - [x] 4.2.4 Add shift conflict detection and prevention
  - [x] 4.2.5 Add staff availability filtering
  - [x] 4.2.6 Add location-based shift filtering

- [x] **4.3** Shift Form & Management
  - [x] 4.3.1 Create shift creation/editing form
  - [x] 4.3.2 Add staff selection with availability checking
  - [x] 4.3.3 Add service assignment to shifts
  - [x] 4.3.4 Add shift priority management
  - [x] 4.3.5 Add bulk shift operations
  - [x] 4.3.6 Add shift template functionality

---

## Phase 5: Staff Dashboard
*Building the interface for medical staff interactions*

### Staff Workflow
- [x] **5.1** Staff Overview (`/dashboard/staff-portal`)
  - [x] 5.1.1 Dashboard stats (today's appointments, pending actions)
  - [x] 5.1.2 Next patient card with quick actions

- [x] **5.2** My Schedule & Availability
  - [x] 5.2.1 View assigned shifts in calendar view
  - [x] 5.2.2 Request time off / buffer management
  - [x] 5.2.3 View location assignments

- [ ] **5.3** Appointment Management
  - [ ] 5.3.1 Daily appointment list with status indicators
  - [ ] 5.3.2 Appointment detail view (patient info, service details)
  - [ ] 5.3.3 Medical notes interface & patient history
  - [ ] 5.3.4 Media/Ultrasound image uploads
  - [ ] 5.3.5 Complete appointment & status updates

---

## Phase 6: Booking System
*Building the public and internal booking interfaces*

### Booking Database Schema
- [x] **6.1** Create booking-related tables
  - [x] 6.1.1 Create `bookings` table (id, client_id, service_id, location_id, staff_id, shift_id, appointment_date, appointment_time, status, payment_status, notes, created_at, updated_at)
  - [x] 6.1.2 Create `booking_addons` table (id, booking_id, addon_id, quantity, price, created_at)
  - [x] 6.1.3 Create `booking_notes` table (id, booking_id, note, author_id, created_at)
  - [x] 6.1.4 Add proper constraints and indexes

### Booking Interface
- [x] **6.2** Public Booking Flow
  - [x] 6.2.1 Create service selection page
  - [x] 6.2.2 Create location selection (filtered by service availability)
  - [x] 6.2.3 Create date/time selection (filtered by staff qualifications)
  - [x] 6.2.4 Create client information form
  - [x] 6.2.5 Create add-ons selection
  - [x] 6.2.6 Create payment method selection
  - [x] 6.2.7 Create booking confirmation page

- [ ] **6.3** Booking Management (Admin)
  - [ ] 6.3.1 Create bookings list with filtering
  - [ ] 6.3.2 Add booking status management
  - [ ] 6.3.3 Add rescheduling functionality
  - [ ] 6.3.4 Add cancellation functionality
  - [ ] 6.3.5 Add booking notes management
  - [ ] 6.3.6 Add booking search and filtering

---

## Phase 7: Client Dashboard
*Building the interface for client self-service*

### Client Portal
- [x] **7.1** Client Overview
  - [x] 7.1.1 Welcome screen with upcoming appointment highlights
  - [x] 7.1.2 Quick notifications/reminders

- [x] **7.2** My Appointments
  - [x] 7.2.1 List of upcoming and past appointments
  - [x] 7.2.2 Appointment detail view
  - [x] 7.2.3 Self-service rescheduling and cancellation
  - [x] 7.2.4 "Book New Echo" authenticated booking flow

- [x] **7.3** Profile & Settings
  - [x] 7.3.1 Personal information management
  - [x] 7.3.2 Pregnancy details/Family profile
  - [x] 7.3.3 Communication preferences

---

## Phase 8: Payment Integration
*Integrating Mollie payment processing*

### Payment Setup
- [ ] **8.1** Mollie Integration
  - [ ] 8.1.1 Set up Mollie API configuration
  - [ ] 8.1.2 Create payment processing API routes
  - [ ] 8.1.3 Add payment status tracking
  - [ ] 8.1.4 Add payment webhook handling
  - [ ] 8.1.5 Add refund processing

- [ ] **8.2** Payment UI
  - [ ] 8.2.1 Create payment method selection
  - [ ] 8.2.2 Add payment processing interface
  - [ ] 8.2.3 Add payment confirmation pages
  - [ ] 8.2.4 Add payment history for clients
  - [ ] 8.2.5 Add payment management for admins

---

## Phase 9: Notifications & Communication
*Building email and notification systems*

### Email System
- [ ] **9.1** Email Templates
  - [x] 9.1.1 Create booking confirmation email template
  - [x] 9.1.2 Create booking reminder email template
  - [x] 9.1.3 Create rescheduling notification template
  - [x] 9.1.4 Create cancellation confirmation template
  - [ ] 9.1.5 Create follow-up review request template

- [ ] **9.2** Email Automation
  - [x] 9.2.1 Set up email sending service (Resend/SendGrid)
  - [ ] 9.2.2 Create email queue system
  - [ ] 9.2.3 Add email scheduling for reminders
  - [ ] 9.2.4 Setup email analytics (open/click tracking)
  - [x] 9.2.5 Add email template management
  

---

## Phase 10: Google Calendar Integration
*Syncing with staff calendars*

### Calendar Sync
- [ ] **10.1** Google Calendar API
  - [ ] 10.1.1 Set up Google Calendar API credentials
  - [ ] 10.1.2 Create calendar sync service
  - [ ] 10.1.3 Add one-way sync to staff calendars
  - [ ] 10.1.4 Add calendar event creation/updates
  - [ ] 10.1.5 Add calendar event deletion

- [ ] **10.2** Calendar Management
  - [ ] 10.2.1 Add staff calendar connection interface
  - [ ] 10.2.2 Add sync status monitoring
  - [ ] 10.2.3 Add manual sync triggers
  - [ ] 10.2.4 Add calendar conflict detection

---

## Phase 11: Advanced Features
*Building advanced functionality*

### Audit & Reporting
- [ ] **11.1** Audit Logging
  - [ ] 11.1.1 Create audit log table
  - [ ] 11.1.2 Add audit logging middleware
  - [ ] 11.1.3 Create audit log viewer
  - [ ] 11.1.4 Add audit log filtering and search

- [ ] **11.2** Reporting System
  - [ ] 11.2.1 Create booking reports
  - [ ] 11.2.2 Create staff performance reports
  - [ ] 11.2.3 Create revenue reports
  - [ ] 11.2.4 Add report scheduling and export

### Advanced Booking Features
- [ ] **11.3** Booking Rules Engine
  - [ ] 11.3.1 Implement lead time enforcement
  - [ ] 11.3.2 Implement reschedule cutoff enforcement
  - [ ] 11.3.3 Implement service buffer time
  - [ ] 11.3.4 Add custom business rules

---

## Phase 12: Testing & Deployment
*Final testing and production deployment*

### Testing
- [ ] **12.1** Unit Testing
  - [ ] 12.1.1 Write unit tests for API routes
  - [ ] 12.1.2 Write unit tests for utility functions
  - [ ] 12.1.3 Write unit tests for form validation
  - [ ] 12.1.4 Add test coverage reporting

- [ ] **12.2** Integration Testing
  - [ ] 12.2.1 Test complete booking flow
  - [ ] 12.2.2 Test payment processing
  - [ ] 12.2.3 Test email notifications
  - [ ] 12.2.4 Test calendar synchronization

### Deployment
- [ ] **12.3** Production Setup
  - [ ] 12.3.1 Set up Vercel deployment
  - [ ] 12.3.2 Configure production environment variables
  - [ ] 12.3.3 Set up production database
  - [ ] 12.3.4 Configure domain and SSL

- [ ] **12.4** CI/CD Pipeline
  - [ ] 12.4.1 Set up GitHub Actions
  - [ ] 12.4.2 Add automated testing
  - [ ] 12.4.3 Add automated deployment
  - [ ] 12.4.4 Add environment management

---

*Last Updated: January 31, 2026*
*Total Tasks: 230+*
*Phases Completed: 3.5/12*
*Estimated Remaining Timeline: 8-12 weeks*
