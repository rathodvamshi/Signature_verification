# 🖊️ Signature Verification System

A modern, AI-powered signature verification system using deep learning for secure document authentication.

## ✨ Features

- **AI-Powered Verification**: Uses trained neural network models to detect genuine vs forged signatures
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Modern UI/UX**: Responsive design with dark mode support
- **Profile Management**: Users can create profiles and track verification history
- **Drag & Drop Upload**: Easy-to-use file upload with image preview

## 🏗️ Project Structure

```
signature_verification/
├── js/                          # Backend
│   ├── server.js               # Express.js server
│   ├── app.py                  # Python ML prediction script
│   ├── models/                 # Database models
│   │   ├── user.js            # User schema
│   │   ├── verification.js    # Verification records schema
│   │   └── .env               # Environment configuration
│   ├── trained_models/         # Pre-trained signature models (.h5)
│   │   ├── vamshi.h5
│   │   ├── vijay.h5
│   │   ├── yashwant.h5
│   │   ├── naveen.h5
│   │   └── anirudh.h5
│   └── uploads/                # Temporary upload directory
│
├── templates/                   # Frontend
│   ├── index.html              # Home page
│   ├── login.html              # Login page
│   ├── signup.html             # Registration page
│   ├── main.html               # Verification page
│   ├── profile.html            # User profile page
│   ├── css/                    # Stylesheets
│   │   ├── common.css         # Shared styles & design system
│   │   ├── home.css           # Home page styles
│   │   ├── auth.css           # Login/Signup styles
│   │   ├── verify.css         # Verification page styles
│   │   └── profile.css        # Profile page styles
│   └── js/                     # Frontend JavaScript
│       ├── common.js          # Shared utilities
│       └── profile.js         # Profile page logic
│
├── signatures_of_candidates/    # Training data
├── package.json                # Node.js dependencies
├── requirements.txt            # Python dependencies
└── .gitignore                  # Git ignore rules
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (running locally or remote)
- Python 3.8+ with required packages

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd signature_verification
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   - Copy `js/models/.env.example` to `js/models/.env`
   - Update the JWT_SECRET for production
   - Update MongoDB URI if not using localhost

5. **Start MongoDB**
   ```bash
   mongod
   ```

6. **Run the server**
   ```bash
   npm start
   ```

7. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

### Environment Variables (js/models/.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/SignatureVerification |
| `JWT_SECRET` | Secret key for JWT tokens | (change in production!) |
| `NODE_ENV` | Environment mode | development |

## 📱 API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /logout` - User logout

### Profile
- `GET /profile` - Get profile page (protected)
- `GET /get-user-details` - Get user details API (protected)
- `POST /update-profile` - Update profile (protected)

### Verification
- `POST /predict` - Verify signature
- `GET /verification-history` - Get user's verification history (protected)

## 🎨 Design System

The project uses CSS custom properties for consistent theming:

```css
:root {
    --primary-color: #6366f1;
    --bg-primary: #f8fafc;
    --text-primary: #0f172a;
    /* ... more variables */
}

body.dark-mode {
    --bg-primary: #0f172a;
    --text-primary: #f1f5f9;
    /* ... dark mode overrides */
}
```

## 🔐 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based sessions
- **HTTP-Only Cookies**: XSS protection
- **Input Validation**: Server-side validation
- **File Type Filtering**: Only image files accepted

## 📝 Available Trained Models

The system includes pre-trained models for:
- vamshi
- vijay
- yashwant
- naveen
- anirudh

## 🛠️ Development

### Adding New Trained Models

1. Train your model using the signature dataset
2. Save as `.h5` file in `js/trained_models/`
3. Add username to `TRAINED_USERS` object in `server.js`

### CSS Architecture

- `common.css` - Design tokens, navbar, buttons, forms, utilities
- Page-specific CSS files for component styles
- Mobile-first responsive design
- Dark mode support via CSS variables

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💻 Author

**Vamshi Rathod**

---

Built with ❤️ using Express.js, MongoDB, and Deep Learning
