# Account Saver

A secure web application for managing your account details using Express.js, EJS, and MongoDB.

## Features

- User authentication (login/register)
- Secure password hashing
- Protected routes
- CRUD operations for account details
- Modern and responsive UI with Bootstrap
- Session management

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or a remote instance)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd account-saver
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your MongoDB connection string:
```
MONGODB_URI=mongodb://localhost:27017/account-saver
SESSION_SECRET=your-secret-key
```

4. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Register a new account or login with existing credentials
3. Add, edit, or delete your account details
4. All data is securely stored in MongoDB

## Security Features

- Password hashing using bcrypt
- Protected routes using Passport.js
- Session-based authentication
- Input validation
- XSS protection
- CSRF protection

## Technologies Used

- Express.js
- EJS (Embedded JavaScript)
- MongoDB with Mongoose
- Passport.js for authentication
- Bootstrap 5 for styling
- Font Awesome for icons

## License

MIT License 