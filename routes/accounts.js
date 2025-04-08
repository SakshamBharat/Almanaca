const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Account = require('../models/Account');

// Get all accounts
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const accounts = await Account.find({ user: req.user._id });
        res.render('accounts/index', { 
            title: 'My Accounts',
            accounts
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Add new account form
router.get('/add', ensureAuthenticated, (req, res) => {
    res.render('accounts/add', { title: 'Add Account' });
});

// Add new account
router.post('/add', ensureAuthenticated, async (req, res) => {
    const { accountName, accountNumber, email, password, additionalInfo } = req.body;
    
    try {
        const newAccount = new Account({
            user: req.user._id,
            accountName,
            accountNumber,
            email,
            password,
            additionalInfo
        });

        await newAccount.save();
        req.flash('success_msg', 'Account added successfully');
        res.redirect('/accounts');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Edit account form
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
    try {
        const account = await Account.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).send('Account not found');
        }

        res.render('accounts/edit', { 
            title: 'Edit Account',
            account
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Update account
router.post('/edit/:id', ensureAuthenticated, async (req, res) => {
    const { accountName, accountNumber, email, password, additionalInfo } = req.body;

    try {
        const account = await Account.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).send('Account not found');
        }

        account.accountName = accountName;
        account.accountNumber = accountNumber;
        account.email = email;
        account.password = password;
        account.additionalInfo = additionalInfo;

        await account.save();
        req.flash('success_msg', 'Account updated successfully');
        res.redirect('/accounts');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Delete account
router.post('/delete/:id', ensureAuthenticated, async (req, res) => {
    try {
        const account = await Account.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).send('Account not found');
        }

        req.flash('success_msg', 'Account deleted successfully');
        res.redirect('/accounts');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 