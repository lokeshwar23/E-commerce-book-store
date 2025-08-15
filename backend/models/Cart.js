const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  sessionId: {
    type: String,
    sparse: true
  },
  items: [cartItemSchema],
  discountCode: {
    type: String,
    trim: true
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

// Method to calculate cart totals
cartSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  const discountAmount = this.subtotal * (this.discountPercent / 100);
  this.total = this.subtotal - discountAmount;
  
  return this;
};

// Method to add item to cart
cartSchema.methods.addItem = function(productId, quantity = 1, price) {
  const existingItem = this.items.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({
      product: productId,
      quantity: quantity,
      price: price
    });
  }
  
  this.calculateTotals();
  return this;
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => 
    item.product.toString() !== productId.toString()
  );
  this.calculateTotals();
  return this;
};

// Method to update item quantity
cartSchema.methods.updateQuantity = function(productId, quantity) {
  const item = this.items.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (item) {
    if (quantity <= 0) {
      this.removeItem(productId);
    } else {
      item.quantity = quantity;
      this.calculateTotals();
    }
  }
  
  return this;
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.discountCode = null;
  this.discountPercent = 0;
  this.calculateTotals();
  return this;
};

// Method to apply discount
cartSchema.methods.applyDiscount = function(code) {
  const discountCodes = {
    'SAVE10': 10,
    'SAVE20': 20,
    'WELCOME': 15
  };
  
  if (discountCodes[code]) {
    this.discountCode = code;
    this.discountPercent = discountCodes[code];
    this.calculateTotals();
    return true;
  }
  
  return false;
};

// Transform JSON to match frontend shape
cartSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    // Denormalize items for frontend compatibility
    if (Array.isArray(ret.items)) {
      ret.items = ret.items.map((item) => {
        const product = item.product || {};
        const productId = (product.id || product._id || item.product);
        const image = product.image || '📚';
        const name = product.name || 'Product';
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return {
          id: item._id?.toString() || item.id?.toString() || String(Math.random()),
          productId: productId?.toString?.() || productId,
          quantity,
          name,
          price,
          image,
          stock: Number(product.stock) || 0
        };
      });
    }
    // Map discountPercent -> discount for frontend
    ret.discount = Number(ret.discountPercent) || 0;
    // Ensure totals are numeric if present
    if (ret.subtotal != null) ret.subtotal = Number(ret.subtotal) || 0;
    if (ret.total != null) ret.total = Number(ret.total) || 0;
  }
});

module.exports = mongoose.model('Cart', cartSchema);
