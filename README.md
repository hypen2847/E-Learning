# National Coaching Centre - Database System

## Overview
This project now includes a comprehensive database system for storing user registrations, login data, enrollments, and admin information. The system provides a structured approach to data management with proper separation of concerns.

## Database Structure

### 1. `database.db` - SQLite Database Schema
This file contains the database schema with the following tables:

- **users**: Stores user registration information
  - id, name, email, password, compact_mobile, created_at, last_login, login_count

- **enrollments**: Stores course enrollment data
  - id, full_name, email, mobile, compact_mobile, course, timestamp

- **sessions**: Tracks user login sessions
  - id, user_id, email, created_at, expires_at

- **admin**: Stores admin credentials
  - id, email, password, created_at

### 2. `database.js` - Database Management Layer
This file provides a `DatabaseManager` class that handles all database operations:

- **User Management**: addUser, getUserByEmail, updateUserLogin, getAllUsers
- **Enrollment Management**: addEnrollment, getEnrollmentsByEmail, getAllEnrollments
- **Session Management**: createSession, getSession, clearSession
- **Admin Functions**: verifyAdmin
- **Database Operations**: exportDatabase, importDatabase, clearDatabase

## Features

### ✅ **User Registration & Login**
- Complete user registration with name, email, mobile, and password
- Secure login with password verification
- Automatic login after successful registration
- Session management with expiration (24 hours)

### ✅ **Login Time Tracking**
- Records timestamp of each login
- Tracks total login count per user
- Stores last login time for user profile display

### ✅ **Data Persistence**
- All data stored in structured format
- Automatic data validation
- Error handling and fallback mechanisms
- Export/Import functionality for data backup

### ✅ **Admin Panel**
- Secure admin authentication
- View all user registrations and enrollments
- Export data in JSON format
- Import data from backup files
- Clear database functionality

### ✅ **User Profile Dashboard**
- Personal profile information
- Course enrollment history
- Login statistics and timestamps
- Account settings and preferences

## How It Works

### 1. **Registration Flow**
```
User fills form → Data validation → Check for existing email → 
Create user record → Store in database → Create session → 
Auto-login → Redirect to profile
```

### 2. **Login Flow**
```
User enters credentials → Verify against database → 
Update login time/count → Create new session → 
Update UI state → Show account button
```

### 3. **Data Storage**
- **Current Implementation**: Uses localStorage as a fallback
- **Future Implementation**: Can be easily migrated to a real SQLite database or backend server
- **Data Structure**: Consistent JSON format across all operations

## Usage Examples

### User Registration
```javascript
const newUser = await db.addUser({
    name: "John Doe",
    email: "john@example.com",
    password: "hashedPassword",
    compactMobile: "+91-9876543210"
});
```

### User Login
```javascript
const user = await db.getUserByEmail(email);
if (user && user.password === hashedPassword) {
    await db.updateUserLogin(email);
    await db.createSession(email);
}
```

### Get User Enrollments
```javascript
const enrollments = await db.getEnrollmentsByEmail(userEmail);
```

### Export Database
```javascript
const data = await db.exportDatabase();
// Download as JSON file
```

## File Structure
```
web project/
├── index.html                 # Main website
├── styles.css                # Main website styles
├── script.js                 # Main website logic
├── database.js               # Database management layer
├── database.db               # SQLite database schema
├── User_profile_dashboard/   # User profile dashboard
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── dashboard/                # Admin dashboard
│   ├── index.html
│   ├── styles.css
│   └── script.js
└── loading/                  # Loading screen
    ├── index.html
    └── style.css
```

## Security Features

- **Password Hashing**: Simple hash function (replace with bcrypt in production)
- **Session Expiration**: Automatic session cleanup after 24 hours
- **Input Validation**: Comprehensive form validation
- **Error Handling**: Graceful error handling without exposing sensitive data

## Future Enhancements

1. **Real Database Integration**: Replace localStorage with actual SQLite or MySQL
2. **Backend API**: Create RESTful API endpoints
3. **Enhanced Security**: Implement JWT tokens, bcrypt hashing
4. **Data Encryption**: Encrypt sensitive user data
5. **Backup System**: Automated database backups
6. **User Roles**: Multiple admin levels and permissions

## Notes

- **Current Implementation**: Uses localStorage as a fallback for browser compatibility
- **Production Ready**: The database layer is designed to be easily migrated to a real backend
- **Cross-Platform**: Works in all modern browsers
- **Scalable**: Architecture supports future growth and enhancements

## Getting Started

1. Open `index.html` in a web browser
2. Register a new user account
3. Login with your credentials
4. Access your profile dashboard
5. Use admin panel (admin@gmail.com / Admin@123) for management

The system is now fully functional with a robust database architecture that provides a professional user experience for the National Coaching Centre website.
