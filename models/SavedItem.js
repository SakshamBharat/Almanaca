const mongoose = require('mongoose');

const SavedItemSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['email', 'phone', 'bank', 'text', 'document', 'image']
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String
    },
    documentPath: String,
    documentName: String,
    imagePath: String,
    imageName: String,
    order: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SavedItem', SavedItemSchema); 