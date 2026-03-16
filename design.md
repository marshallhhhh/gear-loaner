# Project
A webapp which allows quick checkout/loaning of climbing gear for a univeristy climbing club.
Similar to other asset management solutions but with simplified features and a focus on self-service loaning.

# Primary Business Goals
- Prevent gear loss by maintaining a clear chain of custody
- Allow easy self-checkout and check in for gear via QR code scanning

## User Personas & Stories
As a Club Member, I want to:
- Check out gear quickly via simple QR code scan 
- See my active loans and due dates

As a Club Leader, I want to:
- Add/remove/edit gear items in inventory
- See who has what gear at any moment
- Get notifications for overdue returns (via email)

# Feature Requirements
## Core Functions
### Inventory Management System
- CRUD operations for gear items
- Categories
- Serial number / manufacturer ID tracking

### Gear Tagging & QR Code System
- Auto-generate unique IDs for each gear item
- Generate printable QR codes/customized gear tags
- QR code links to item detail page
    - unauthenticated users can report lost
    - authenticated users can checkout gear if available
    - users who have checkout out a peice of gear can return it
- Mobile-friendly scan-to-checkout interface
- Optionally capture scan geolocation if user allows.-
    - location is required for checkin or checkout
- Option to print labels with club logo and return instructions

### User Self-Checkout/Return System
- User sign-up
- QR code scanner interface (camera access)
- Checkout flow:
    1. Scan gear QR code
    2. Confirm member identity
    3. Select checkout duration (or use defaults)
    4. Confirmation email/text
- Return flow:
    1. Scan gear QR code
    2. Confirm condition
    3. Return confirmation

### checkout rules
Users with overdue items cannot checkout new gear
Max duration: 30 days (users can checkout again)

### Custody/Loan Tracking
- Real-time status: Available, Checked Out, Lost
- Loan history for each item
- Current custodian contact info
- Due date tracking
- Automatic overdue notifications via email
- Checkout limits per member
- Warning system for late returns

### Admin Dashboard
- Overview dashboard 
- Overdue items alert
- User management (activate/deactivate)
- Manual checkout override (for non-digital members)
- Export data (CSV/Excel) for reporting
- Audit log of all actions

## Non-functional Requirements

| Category | Requirement |
|-|-|
| Mobile Responsiveness	| Must work well on phones for field checkout
| Security | Members only see their own loans; leaders see all |
| Performance | QR scan → checkout in <3 seconds | 

## User roles and permmissions
member
- checkout gear
- return gear
- see own loans
- report lost gear

admin
- all member permissions
- create/edit gear
- view all loans
- manage users
- override loans

## Data model (tentative)
Gear
- id (UUID)
- name
- description
- category
- tags
- serialNumber
- loanstatus (available | checked_out | lost)
- qrCodeUrl
- createdAt
- updatedAt
- default loan days
- Loans
- qr scans

Loan
- id 
- gearItemId
- gearItem
- userId
- user
- status
- duedate
- checkout date
- createdAt
- updatedAt
- notes

QRScan
- id 
- userID
- user
- gearItemId
- gearItem
- latitude
- longitude
- ip address
- createdAt


# QR System Design
## Content
`https://tasuniclimbing.club/gear/{gear-id}`
## Generation
When gear added → Generate unique UUID → Create QR code → Store QR image in cloud storage → Save QR URL to gear record

## Scanning Flow
Member scans QR → Opens gear page → Sees status & checkout button → 
Click checkout → System verifies eligibility → Creates loan → 
Updates gear status → Sends confirmation

# Tech Stack 
Frontend: React + Vite
Backend: Node.js/Express
Database: Supabase
Authentication: Supabase
File Storage: Supabase

# Tech Requirements
Prisma ORM
Use javascript for backend 
Prefer non-legacy authentication methods (jwks vs jwt key)
Use module type imports/exports

# Architecture

Frontend
React SPA using Vite

Backend
Node.js + Express REST API

Database
PostgreSQL via Supabase

ORM
Prisma

Authentication
Supabase Auth

Storage
Supabase Storage for QR code images

API Pattern
REST API

# Gear Status Transitions
Available → Checked Out
Checked Out → Available
Any → Lost

# UI Pages 
Public 
- QR landing
- lost gear report

Member 
- my loans

admin
- admin dashboard
- gear inventory/management
- loan history
- user management

# System constraints
- follow modern security principles
- follow web dev best practives 
- do not mix front and and backend logic