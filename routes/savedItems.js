const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { ensureAuthenticated } = require('../middleware/auth');
const SavedItem = require('../models/SavedItem');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Create uploads directory if it doesn't exist
        const uploadDir = 'public/uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Configure file filters
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'document') {
        // Accept only PDF, DOC, DOCX, TXT files
        if (file.mimetype === 'application/pdf' || 
            file.mimetype === 'application/msword' || 
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'text/plain') {
            cb(null, true);
        } else {
            cb(new Error('Invalid document format. Only PDF, DOC, DOCX, and TXT files are allowed.'), false);
        }
    } else if (file.fieldname === 'image') {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid image format. Only image files are allowed.'), false);
        }
    } else {
        cb(new Error('Unexpected field'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Get all saved items
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const items = await SavedItem.find({ user: req.user._id }).sort({ createdAt: -1 });
        
        // Icon mapping for different item types
        const iconMap = {
            email: 'envelope',
            phone: 'phone',
            bank: 'university',
            text: 'sticky-note',
            document: 'file-alt',
            image: 'image'
        };

        res.render('savedItems/index', { 
            title: 'My Saved Items',
            items,
            iconMap
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading items. Please try again.');
        res.redirect('/dashboard');
    }
});

// Add new item form
router.get('/add', ensureAuthenticated, (req, res) => {
    res.render('savedItems/add', { 
        title: 'Add New Item',
        errors: [],
        formData: {
            type: '',
            title: '',
            content: ''
        }
    });
});

// Handle type selection
router.post('/select-type', ensureAuthenticated, (req, res) => {
    const { type } = req.body;
    res.redirect(`/saved-items/add/${type}`);
});

// Add new item by type
router.get('/add/:type', ensureAuthenticated, (req, res) => {
    const { type } = req.params;
    const validTypes = ['email', 'phone', 'bank', 'text', 'document', 'image'];
    
    if (!validTypes.includes(type)) {
        req.flash('error_msg', 'Invalid item type');
        return res.redirect('/saved-items/add');
    }

    const template = type === 'document' ? 'add-document' : 
                    type === 'image' ? 'add-image' : 'add-text';

    const placeholders = {
        email: 'Enter email address (e.g., john@example.com)',
        phone: 'Enter phone number (e.g., +1 234 567 8900)',
        bank: 'Enter bank details (e.g., Account number, routing number)',
        text: 'Enter your note (you can use multiple lines)',
        document: 'Add any additional information or notes about this document',
        image: 'Add any additional information or notes about this image'
    };

    res.render(`savedItems/${template}`, { 
        title: `Add New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type,
        errors: [],
        placeholder: placeholders[type],
        formData: {
            title: '',
            content: ''
        }
    });
});

// Add new item
router.post('/add', async (req, res) => {
    try {
        const { type, title, content } = req.body;

        // Validate required fields
        if (!type || !title) {
            return res.render('savedItems/add-text', {
                type,
                errors: [{ msg: 'Type and title are required' }],
                formData: req.body
            });
        }

        let errors = [];
        let savedItemData = {
            type,
            title,
            content: content || '',
            user: req.user._id
        };

        // Handle different item types
        switch (type) {
            case 'email':
                const { email, password } = req.body;
                if (!email || !password) {
                    errors.push({ msg: 'Email and password are required' });
                } else {
                    savedItemData.content = `${email}:${password}`;
                }
                break;

            case 'bank':
                const { bankName, accountNumber, pin } = req.body;
                if (!bankName || !accountNumber || !pin) {
                    errors.push({ msg: 'Bank name, account number, and PIN are required' });
                } else {
                    savedItemData.content = `${bankName}:${accountNumber}:${pin}`;
                }
                break;

            case 'phone':
                const { isdCode, phoneNumber } = req.body;
                if (!isdCode || !phoneNumber) {
                    errors.push({ msg: 'ISD code and phone number are required' });
                } else {
                    savedItemData.content = `${isdCode}:${phoneNumber}`;
                }
                break;

            case 'document':
                if (!req.file) {
                    errors.push({ msg: 'Please upload a document' });
                } else {
                    savedItemData.documentPath = `/uploads/${req.file.filename}`;
                    savedItemData.documentName = req.file.originalname;
                }
                break;

            case 'image':
                if (!req.file) {
                    errors.push({ msg: 'Please upload an image' });
                } else {
                    savedItemData.imagePath = `/uploads/${req.file.filename}`;
                    savedItemData.imageName = req.file.originalname;
                }
                break;

            case 'text':
                if (!content) {
                    errors.push({ msg: 'Content is required' });
                }
                break;
        }

        if (errors.length > 0) {
            const template = type === 'document' ? 'add-document' : 
                           type === 'image' ? 'add-image' : 'add-text';
            return res.render(`savedItems/${template}`, {
                type,
                errors,
                formData: req.body
            });
        }

        const savedItem = new SavedItem(savedItemData);
        await savedItem.save();
        res.redirect('/saved-items');
    } catch (error) {
        console.error('Error adding item:', error);
        const template = req.body.type === 'document' ? 'add-document' : 
                        req.body.type === 'image' ? 'add-image' : 'add-text';
        res.render(`savedItems/${template}`, {
            type: req.body.type,
            errors: [{ msg: error.message || 'Error adding item. Please try again.' }],
            formData: req.body
        });
    }
});

// Add separate routes for document and image uploads
router.post('/add/document', upload.single('document'), async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title) {
            return res.render('savedItems/add-document', {
                errors: [{ msg: 'Title is required' }],
                formData: req.body
            });
        }

        if (!req.file) {
            return res.render('savedItems/add-document', {
                errors: [{ msg: 'Please upload a document' }],
                formData: req.body
            });
        }

        const savedItem = new SavedItem({
            type: 'document',
            title,
            content: content || '',
            documentPath: `/uploads/${req.file.filename}`,
            documentName: req.file.originalname,
            user: req.user._id
        });

        await savedItem.save();
        res.redirect('/saved-items');
    } catch (error) {
        console.error('Error adding document:', error);
        res.render('savedItems/add-document', {
            errors: [{ msg: error.message || 'Error adding document. Please try again.' }],
            formData: req.body
        });
    }
});

router.post('/add/image', upload.single('image'), async (req, res) => {
    try {
        const { title, content } = req.body;
        let errors = [];

        // Validate title
        if (!title) {
            errors.push({ msg: 'Title is required' });
        }

        // Validate image upload
        if (!req.file) {
            errors.push({ msg: 'Please upload an image' });
        } else {
            // Additional validation for image file
            if (!req.file.mimetype.startsWith('image/')) {
                errors.push({ msg: 'Invalid file type. Please upload an image file.' });
                // Delete the uploaded file if it's not an image
                if (req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
            }
        }

        if (errors.length > 0) {
            return res.render('savedItems/add-image', {
                errors,
                formData: req.body
            });
        }

        const savedItem = new SavedItem({
            type: 'image',
            title,
            content: content || '',
            imagePath: `/uploads/${req.file.filename}`,
            imageName: req.file.originalname,
            user: req.user._id
        });

        await savedItem.save();
        req.flash('success_msg', 'Image saved successfully');
        res.redirect('/saved-items');
    } catch (error) {
        console.error('Error adding image:', error);
        // Clean up uploaded file if there was an error
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }
        res.render('savedItems/add-image', {
            errors: [{ msg: error.message || 'Error adding image. Please try again.' }],
            formData: req.body
        });
    }
});

// Update item order (drag and drop)
router.post('/reorder', ensureAuthenticated, async (req, res) => {
    try {
        const { items } = req.body;
        for (let item of items) {
            await SavedItem.findByIdAndUpdate(item.id, { $set: { order: item.order } });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// Delete item
router.post('/delete/:id', ensureAuthenticated, async (req, res) => {
    try {
        const item = await SavedItem.findOne({ _id: req.params.id, user: req.user._id });
        
        if (!item) {
            req.flash('error_msg', 'Item not found');
            return res.redirect('/saved-items');
        }

        // Delete associated files if they exist
        if (item.documentPath) {
            const documentPath = path.join(__dirname, '..', 'public', item.documentPath);
            if (fs.existsSync(documentPath)) {
                fs.unlinkSync(documentPath);
            }
        }

        if (item.imagePath) {
            const imagePath = path.join(__dirname, '..', 'public', item.imagePath);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await SavedItem.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Item deleted successfully');
        res.redirect('/saved-items');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting item');
        res.redirect('/saved-items');
    }
});

// Edit item form
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
    try {
        const item = await SavedItem.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!item) {
            req.flash('error_msg', 'Item not found');
            return res.redirect('/saved-items');
        }

        res.render('savedItems/edit', { 
            title: 'Edit Item',
            item
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading item. Please try again.');
        res.redirect('/saved-items');
    }
});

// Edit item
router.post('/edit/:id', ensureAuthenticated, async (req, res) => {
    try {
        const item = await SavedItem.findOne({ _id: req.params.id, user: req.user._id });
        
        if (!item) {
            req.flash('error_msg', 'Item not found');
            return res.redirect('/saved-items');
        }

        const { type, title, content, email, password, bankName, accountNumber, pin, isdCode, phoneNumber } = req.body;
        let errors = [];

        // Validate required fields
        if (!title) {
            errors.push({ msg: 'Title is required' });
        }

        let itemContent = '';
        let updateData = {
            title,
            content: content || ''
        };

        // Handle different item types
        switch (type) {
            case 'email':
                if (!email || !password) {
                    errors.push({ msg: 'Email and password are required' });
                } else {
                    itemContent = `${email}:${password}`;
                }
                break;

            case 'bank':
                if (!bankName || !accountNumber || !pin) {
                    errors.push({ msg: 'Bank name, account number, and PIN are required' });
                } else {
                    itemContent = `${bankName}:${accountNumber}:${pin}`;
                }
                break;

            case 'phone':
                if (!isdCode || !phoneNumber) {
                    errors.push({ msg: 'ISD code and phone number are required' });
                } else {
                    itemContent = `${isdCode}:${phoneNumber}`;
                }
                break;

            case 'document':
                if (req.file) {
                    // Delete old file if exists
                    if (item.documentPath) {
                        const oldPath = path.join(__dirname, '..', 'public', item.documentPath);
                        if (fs.existsSync(oldPath)) {
                            fs.unlinkSync(oldPath);
                        }
                    }
                    updateData.documentPath = `/uploads/${req.file.filename}`;
                    updateData.documentName = req.file.originalname;
                }
                break;

            case 'image':
                if (req.file) {
                    // Delete old file if exists
                    if (item.imagePath) {
                        const oldPath = path.join(__dirname, '..', 'public', item.imagePath);
                        if (fs.existsSync(oldPath)) {
                            fs.unlinkSync(oldPath);
                        }
                    }
                    updateData.imagePath = `/uploads/${req.file.filename}`;
                    updateData.imageName = req.file.originalname;
                }
                break;
        }

        if (errors.length > 0) {
            return res.render('savedItems/edit', {
                item,
                errors,
                formData: req.body
            });
        }

        if (itemContent) {
            updateData.content = itemContent;
        }

        await SavedItem.findByIdAndUpdate(req.params.id, updateData);
        req.flash('success_msg', 'Item updated successfully');
        res.redirect('/saved-items');
    } catch (error) {
        console.error('Error updating item:', error);
        res.render('savedItems/edit', {
            item: req.body,
            errors: [{ msg: error.message || 'Error updating item. Please try again.' }],
            formData: req.body
        });
    }
});

// Add separate routes for document and image edits
router.post('/edit/:id/document', upload.single('document'), ensureAuthenticated, async (req, res) => {
    try {
        const item = await SavedItem.findOne({ _id: req.params.id, user: req.user._id });
        
        if (!item) {
            req.flash('error_msg', 'Item not found');
            return res.redirect('/saved-items');
        }

        const { title, content } = req.body;
        let errors = [];

        if (!title) {
            errors.push({ msg: 'Title is required' });
        }

        if (!req.file) {
            errors.push({ msg: 'Please upload a document' });
        }

        if (errors.length > 0) {
            return res.render('savedItems/edit', {
                item,
                errors,
                formData: req.body
            });
        }

        // Delete old file if exists
        if (item.documentPath) {
            const oldPath = path.join(__dirname, '..', 'public', item.documentPath);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        const updateData = {
            title,
            content: content || '',
            documentPath: `/uploads/${req.file.filename}`,
            documentName: req.file.originalname
        };

        await SavedItem.findByIdAndUpdate(req.params.id, updateData);
        req.flash('success_msg', 'Document updated successfully');
        res.redirect('/saved-items');
    } catch (error) {
        console.error('Error updating document:', error);
        res.render('savedItems/edit', {
            item: req.body,
            errors: [{ msg: error.message || 'Error updating document. Please try again.' }],
            formData: req.body
        });
    }
});

router.post('/edit/:id/image', upload.single('image'), ensureAuthenticated, async (req, res) => {
    try {
        const item = await SavedItem.findOne({ _id: req.params.id, user: req.user._id });
        
        if (!item) {
            req.flash('error_msg', 'Item not found');
            return res.redirect('/saved-items');
        }

        const { title, content } = req.body;
        let errors = [];

        if (!title) {
            errors.push({ msg: 'Title is required' });
        }

        if (!req.file) {
            errors.push({ msg: 'Please upload an image' });
        }

        if (errors.length > 0) {
            return res.render('savedItems/edit', {
                item,
                errors,
                formData: req.body
            });
        }

        // Delete old file if exists
        if (item.imagePath) {
            const oldPath = path.join(__dirname, '..', 'public', item.imagePath);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        const updateData = {
            title,
            content: content || '',
            imagePath: `/uploads/${req.file.filename}`,
            imageName: req.file.originalname
        };

        await SavedItem.findByIdAndUpdate(req.params.id, updateData);
        req.flash('success_msg', 'Image updated successfully');
        res.redirect('/saved-items');
    } catch (error) {
        console.error('Error updating image:', error);
        res.render('savedItems/edit', {
            item: req.body,
            errors: [{ msg: error.message || 'Error updating image. Please try again.' }],
            formData: req.body
        });
    }
});

// View item
router.get('/view/:id', ensureAuthenticated, async (req, res) => {
    try {
        const item = await SavedItem.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!item) {
            req.flash('error_msg', 'Item not found');
            return res.redirect('/saved-items');
        }

        res.render('savedItems/view', { 
            title: 'View Item',
            item
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading item. Please try again.');
        res.redirect('/saved-items');
    }
});

module.exports = router; 