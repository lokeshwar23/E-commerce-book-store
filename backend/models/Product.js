const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    default: 'Books'
  },
  image: {
    type: String,
    default: '📚'
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  description: {
    type: String,
    trim: true
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  bookType: {
    type: String,
    default: 'Paperback'
  },
  votes: {
    type: Number,
    default: 0,
    min: 0
  },
  amazonLink: {
    type: String,
    trim: true
  },
  isbn: {
    type: String,
    trim: true
  },
  bookLanguage: {
    type: String,
    default: 'en'
  },
  genre: {
    type: String,
    default: 'General'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes for better search performance
productSchema.index({ name: 'text', author: 'text', description: 'text' });
productSchema.index({ category: 1, genre: 1, language: 1, bookType: 1 });
productSchema.index({ price: 1, rating: 1, votes: 1 });

// Ensure id virtual in JSON
productSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

productSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('Product', productSchema);
