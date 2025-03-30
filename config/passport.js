const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                // Match user
                const user = await User.findOne({ email: email });
                
                if (!user) {
                    return done(null, false, { 
                        message: 'Account not found. Please register a new account or try logging in with a different email.',
                        type: 'account_not_found'
                    });
                }

                // Match password
                const isMatch = await user.comparePassword(password);
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { 
                        message: 'Incorrect password. Please try again.',
                        type: 'invalid_password'
                    });
                }
            } catch (err) {
                console.error(err);
                return done(null, false, { 
                    message: 'An error occurred while trying to log in. Please try again.',
                    type: 'server_error'
                });
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            if (!user) {
                return done(null, false, { 
                    message: 'Your account has been deleted or is no longer available.',
                    type: 'account_deleted'
                });
            }
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
}; 