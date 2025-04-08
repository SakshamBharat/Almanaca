const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const SavedItem = require('../models/SavedItem');

// Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        // Get recent items (last 6)
        const recentItems = await SavedItem.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(6);

        res.render('dashboard', {
            title: 'Dashboard',
            user: req.user,
            recentItems
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Home page
router.get('/', (req, res) => {
    res.render('welcome', { title: 'Welcome' });
});

module.exports = router; 