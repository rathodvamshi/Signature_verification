const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
// const { exec } = require('child_process');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');


require('dotenv').config();


const fs = require('fs');

const app = express();

// MongoDB Models
const userModel = require('../js/models/user');
// const verificationModel = require('../js/models/verification'); // Assuming this is defined correctly


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static File Serving
app.use(express.static(path.join(__dirname, '../templates')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose
    .connect('mongodb://localhost:27017/Database', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Multer Setup for File Uploads
const upload = multer({ dest: 'uploads/' }); // All files saved to the 'uploads' folder

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../templates', 'index.html'));
});



 // Serve login page
 app.get('/login', (req, res) => {
   res.sendFile(path.join(__dirname, '../templates', 'login.html'));
});

// Register route
app.post('/register', async (req, res) => {
    let { username, email, password } = req.body;

    // Check if any required field is missing
    if (!email || !password || !username ) {
        return res.status(400).send("All fields are required");
    }

    let user = await userModel.findOne({ email });
    if (user) return res.status(500).send("User already registered");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let newUser = await userModel.create({
                username,
                
                email,
                
                password: hash,
            });

            // Create a JWT token for the new user
            let token = jwt.sign({
                email: email,
                userid: newUser._id
            }, "car", { expiresIn: '1h' });

            // Set the token as a cookie
            res.cookie("token", token, { httpOnly: true });

            // Redirect to profile after successful registration
            res.redirect("/profile");
        });
    });
});

// Login Route
app.post('/login', async (req, res) => {
    
    const { username, password } = req.body;
    const user = await userModel.findOne({ username });
    if (!user) return res.status(404).send('User not found.');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send('Invalid credentials.');

    const token = jwt.sign(
        { username: user.username, email: user.email,  userid: user._id },
        "car",
        { expiresIn: '1h' }
    );

    res.cookie('token', token, { httpOnly: true });
    res.redirect('/profile');
 });

 


// Serve profile page (ensure user is logged in)
app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findById(req.user.userid);
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Profile</title>
                <link rel="stylesheet" href="/css/profile.css">  <!-- Serving CSS from /frontend/css -->
            </head>
            <body>
                <nav class="navbar">
                    <div class="logo">
                        <img src="https://i.pinimg.com/564x/05/8c/02/058c02ca15b75b634b40fcdbf36f5a5f.jpg" alt="Logo">
                        <h1>Signature Verification</h1>
                    </div>
                    <ul class="nav-links">
                        <li><a href="./main.html">Back</a></li>
                        <li><a href="#template">History</a></li>
                        <li><a href="./login.html">Login</a></li>
                        <li><a href="./register.html">Signup</a></li>
                        <li class="mode-toggle">
                            <img id="moonIcon" src="https://i.pinimg.com/564x/c2/1b/06/c21b068e9cc106913f482690dcd104fa.jpg" alt="Moon Mode" class="mode-icon">
                        </li>
                    </ul>
                </nav>
                <div class="profile-container">
                    <div class="profile-info">
                        <div class="pic">
                            <img id="profile-pic" src="https://i.pinimg.com/736x/49/49/40/494940d842c38cd9fd6de378b0caadb7.jpg" alt="Default Profile Picture" class="profile-image">
                        </div>
                        <div class="details">
                            <h1>Welcome, <span id="username">${user.username}</span></h1>
                            <p>Email: <span id="email">${user.email}</span></p>
                            <p>Age: <span id="age">${user.age || 'Not provided'}</span></p>
                            <p>College: <span id="college">${user.college || 'Not provided'}</span></p>
                            <p>Bio: <span id="bio">${user.bio || 'Not provided'}</span></p>
                            <button id="edit-profile">Edit Profile</button>
                            <button id="logout" onclick="window.location.href='/logout';">Logout</button>
                        </div>
                    </div>
                </div>

                 <div id="edit-popup" class="hidden">
                    <div class="popup-content">
                        <!-- Profile Edit Form -->
                        <input id="edit-email" type="email" />
                        <input id="edit-age" type="number" />
                        <input id="edit-college" type="text" />
                        <textarea id="edit-bio"></textarea>
                        
                        <!-- Close button -->
                        <button id="close-popup">Close</button>
                        <button id="update-details">Update Details</button>
                    </div>
                <script src="/js/profile.js"></script>  <!-- Serving JS from /frontend/js -->
            </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send('Error fetching user profile');
    }
});


// Profile Update Route
app.post('/update-profile', isLoggedIn, async (req, res) => {
    console.log('Received update request:', req.body);  // Log incoming request data

    const { email, age, college, bio } = req.body;

    if (!email || !age || !college || !bio) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Log the user ID to make sure we are updating the correct user
        console.log('Updating user with ID:', req.user.userid);

        // Update user details in the database
        const updatedUser = await userModel.findByIdAndUpdate(req.user.userid, {
            email,
            age,
            college,
            bio
        }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('User updated:', updatedUser);  // Log updated user

        res.status(200).json({
            email: updatedUser.email,
            age: updatedUser.age,
            college: updatedUser.college,
            bio: updatedUser.bio,
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Error updating profile' });
    }
});



// Middleware to check authentication
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).send('You must be logged in.');

    jwt.verify(token, "car", (err, decoded) => {
        if (err) return res.status(401).send('Invalid or expired token.');
        req.user = decoded;
        next();
    });
}



// API route to get user details
app.get('/get-user-details', isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findById(req.user.userid);
        res.status(200).json({
            username: user.username,
            email: user.email,
            age: user.age || 'Not provided',
            college: user.college || 'Not provided',
            bio: user.bio || 'Not provided',
        });
    } catch (err) {
        res.status(500).send('Error fetching user details');
    }
});


// Logout Route
app.get('/logout', (req, res) => {
    res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
    res.redirect('/login');
});


// File Upload & Prediction
const pythonScriptPath = path.join(__dirname, 'app.py'); // Correct path

const users = {
    "vamshi": path.resolve(__dirname, "trained_models/vamshi.h5"),
    "vijay": path.resolve(__dirname, "trained_models/vijay.h5"),
    "yashwant": path.resolve(__dirname, "trained_models/yashwant.h5"),
    "naveen": path.resolve(__dirname, "trained_models/naveen.h5"),
    "anirudh": path.resolve(__dirname, "trained_models/anirudh.h5"),
};

// Endpoint to handle file upload and model prediction
app.post('/predict', upload.single('file'), (req, res) => {
    let { username } = req.body; // Extract username from the request
    const file = req.file;

    if (!username) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    // Convert username to lowercase
    username = username.toLowerCase();

    const modelPath = users[username]; // Select the model based on the lowercase username
    if (!modelPath) {
        return res.status(400).json({ error: 'Model for this username not found. Please enter a valid username.' });
    }

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Run Python script to make predictions
    const pythonProcess = spawn('python', ['app.py', file.path, modelPath]);

    pythonProcess.stdout.on('data', (data) => {
        const result = data.toString().trim().split(' with ');
        const label = result[0];
        const confidence = result[1].replace('%', '');

        res.json({
            label: label,
            confidence: parseFloat(confidence)
        });
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error while processing the image.' });
        }
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0 && !res.headersSent) {
            res.status(500).json({ error: 'Error in Python script execution.' });
        }
    });
});








// Verification History
app.get('/verification-history', async (req, res) => {
    try {
        const records = await verificationModel.find().sort({ timestamp: -1 }).limit(10);
        res.status(200).send(records);
    } catch (err) {
        console.error('Error fetching verification history:', err);
        res.status(500).send({ error: 'Failed to fetch history.' });
    }
});




app.post('/verify', (req, res) => {
    const imagePath = req.file.path;
    const modelPath = path.join(__dirname, 'saved_model.pkl');
    const pythonScriptPath = path.join(__dirname, 'app.py');

    exec(`python "${pythonScriptPath}" "${imagePath}" "${modelPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('Error executing Python script:', error);
            return res.status(500).send({ error: 'Verification failed.' });
        }
        if (stderr) {
            console.error('Python script stderr:', stderr);
            return res.status(500).send({ error: stderr });
        }

        try {
            const result = JSON.parse(stdout); // Parse the JSON output
            if (result.error) {
                return res.status(500).send({ error: result.error });
            }
            res.status(200).send(result); // Send the success result
        } catch (parseError) {
            console.error('Error parsing Python script output:', parseError);
            res.status(500).send({ error: 'Unexpected response from verification script.' });
        }
    });
});


// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
