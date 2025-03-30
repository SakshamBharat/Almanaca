const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { forwardAuthenticated, ensureAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const SavedItem = require('../models/SavedItem');

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('login', { title: 'Login' });
});

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => {
    res.render('register', { title: 'Register' });
});

// Register Handle
router.post('/register', async (req, res) => {
    const { name, email, password, password2 } = req.body;
    let errors = [];

    // Check required fields
    if (!name || !email || !password || !password2) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    // Check passwords match
    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    // Check password length
    if (password.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|bbdu\.ac\.in)$/;
    if (!emailRegex.test(email)) {
        errors.push({ msg: 'Email must be a valid Gmail or BBDU email address' });
    }

    if (errors.length > 0) {
        res.render('register', {
            errors,
            name,
            email,
            password,
            password2
        });
    } else {
        try {
            const user = await User.findOne({ email: email });
            if (user) {
                errors.push({ msg: 'Email is already registered' });
                res.render('register', {
                    errors,
                    name,
                    email,
                    password,
                    password2
                });
            } else {
                const newUser = new User({
                    name,
                    email,
                    password
                });
                await newUser.save();
                req.flash('success_msg', 'You are now registered and can log in');
                res.redirect('/users/login');
            }
        } catch (err) {
            console.error(err);
            res.render('register', {
                errors,
                name,
                email,
                password,
                password2
            });
        }
    }
});

// Login Handle
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'An unexpected error occurred. Please try again.');
            return res.redirect('/users/login');
        }

        if (!user) {
            // Handle specific error types
            switch (info.type) {
                case 'account_not_found':
                    req.flash('error_msg', info.message);
                    break;
                case 'invalid_password':
                    req.flash('error_msg', info.message);
                    break;
                case 'account_deleted':
                    req.flash('error_msg', info.message);
                    break;
                case 'server_error':
                    req.flash('error_msg', info.message);
                    break;
                default:
                    req.flash('error_msg', 'Invalid email or password. Please try again.');
            }
            return res.redirect('/users/login');
        }

        req.logIn(user, (err) => {
            if (err) {
                console.error(err);
                req.flash('error_msg', 'An error occurred during login. Please try again.');
                return res.redirect('/users/login');
            }
            req.flash('success_msg', `Welcome back, ${user.name}!`);
            return res.redirect('/dashboard');
        });
    })(req, res, next);
});

// Logout Handle
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success_msg', 'You are logged out');
        res.redirect('/users/login');
    });
});

// Profile Page
router.get('/profile', ensureAuthenticated, async (req, res) => {
    try {
        // Get user statistics
        const totalItems = await SavedItem.countDocuments({ user: req.user._id });
        const stats = {
            totalItems,
            lastLogin: req.user.lastLogin ? new Date(req.user.lastLogin).toLocaleString() : 'Never'
        };

        res.render('users/profile', {
            title: 'Profile',
            user: req.user,
            stats
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading profile. Please try again.');
        res.redirect('/dashboard');
    }
});

// Update Profile
router.post('/profile', ensureAuthenticated, async (req, res) => {
    const { name, currentPassword, newPassword, confirmPassword, twoFactor, emailNotifications } = req.body;
    let errors = [];

    try {
        // Update name
        req.user.name = name;

        // Update password if provided
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                errors.push({ msg: 'New passwords do not match' });
            } else if (newPassword.length < 6) {
                errors.push({ msg: 'Password should be at least 6 characters' });
            } else {
                const isMatch = await req.user.comparePassword(currentPassword);
                if (!isMatch) {
                    errors.push({ msg: 'Current password is incorrect' });
                } else {
                    req.user.password = newPassword;
                }
            }
        }

        // Update security settings
        req.user.twoFactor = twoFactor === 'on';
        req.user.emailNotifications = emailNotifications === 'on';

        if (errors.length > 0) {
            res.render('users/profile', {
                title: 'Profile',
                user: req.user,
                errors
            });
        } else {
            await req.user.save();
            req.flash('success_msg', 'Profile updated successfully');
            res.redirect('/users/profile');
        }
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating profile. Please try again.');
        res.redirect('/users/profile');
    }
});

module.exports = router; 