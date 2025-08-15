const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { optionalAuth, authenticateToken: auth } = require('../middleware/auth');

// Helper to find or create cart
async function findOrCreateCart({ userId, sessionId }) {
	let query = {};
	if (userId) query.user = userId;
	else query.sessionId = sessionId;

	let cart = await Cart.findOne(query).populate('items.product');
	if (!cart) {
		cart = new Cart({ user: userId, sessionId, items: [] });
		await cart.save();
	}
	return cart;
}

// GET cart by session ID or user ID
router.get('/:sessionId', optionalAuth, async (req, res) => {
	try {
		const { sessionId } = req.params;
		const cart = await findOrCreateCart({ userId: req.user?.id, sessionId });
		await cart.populate('items.product');
		return res.json(cart.toJSON());
	} catch (error) {
		console.error('Error fetching cart:', error);
		return res.status(500).json({ items: [], discount: 0 });
	}
});

// POST add item to cart
router.post('/:sessionId/items', optionalAuth, async (req, res) => {
	try {
		const { sessionId } = req.params;
		const { productId, quantity = 1 } = req.body;
		if (!productId) {
			return res.status(400).json({ message: 'Product ID is required' });
		}

		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}

		const cart = await findOrCreateCart({ userId: req.user?.id, sessionId });
		let q = Number(quantity);
		if (!Number.isFinite(q) || q <= 0) q = 1;
		let numericPrice = Number(product.price);
		if (!Number.isFinite(numericPrice) || numericPrice < 0) numericPrice = 0;
		cart.addItem(product._id, q, numericPrice);
		await cart.save();
		await cart.populate('items.product');
		return res.json(cart.toJSON());
	} catch (error) {
		console.error('Error adding item to cart:', error);
		return res.status(500).json({ message: 'Error adding item to cart' });
	}
});

// PUT update item quantity
router.put('/:sessionId/items/:productId', optionalAuth, async (req, res) => {
	try {
		const { sessionId, productId } = req.params;
		let { quantity } = req.body;
		let q = Number(quantity);
		if (!Number.isFinite(q) || q < 0) {
			return res.status(400).json({ message: 'Quantity must be a non-negative number' });
		}
		const cart = await findOrCreateCart({ userId: req.user?.id, sessionId });
		cart.updateQuantity(productId, q);
		await cart.save();
		await cart.populate('items.product');
		return res.json(cart.toJSON());
	} catch (error) {
		console.error('Error updating cart item:', error);
		return res.status(500).json({ message: 'Error updating cart item' });
	}
});

// DELETE remove item from cart
router.delete('/:sessionId/items/:productId', optionalAuth, async (req, res) => {
	try {
		const { sessionId, productId } = req.params;
		const cart = await findOrCreateCart({ userId: req.user?.id, sessionId });
		cart.removeItem(productId);
		await cart.save();
		await cart.populate('items.product');
		return res.json(cart.toJSON());
	} catch (error) {
		console.error('Error removing item from cart:', error);
		return res.status(500).json({ message: 'Error removing item from cart' });
	}
});

// POST apply discount code
router.post('/:sessionId/discount', optionalAuth, async (req, res) => {
	try {
		const { sessionId } = req.params;
		const { code } = req.body;
		const cart = await findOrCreateCart({ userId: req.user?.id, sessionId });
		const applied = cart.applyDiscount(code);
		await cart.save();
		await cart.populate('items.product');
		if (!applied) return res.status(400).json({ message: 'Invalid discount code' });
		return res.json(cart.toJSON());
	} catch (error) {
		console.error('Error applying discount:', error);
		return res.status(500).json({ message: 'Error applying discount' });
	}
});

// DELETE clear cart
router.delete('/:sessionId', optionalAuth, async (req, res) => {
	try {
		const { sessionId } = req.params;
		const cart = await findOrCreateCart({ userId: req.user?.id, sessionId });
		cart.clearCart();
		await cart.save();
		await cart.populate('items.product');
		return res.json(cart.toJSON());
	} catch (error) {
		console.error('Error clearing cart:', error);
		return res.status(500).json({ message: 'Error clearing cart' });
	}
});

// POST checkout
router.post('/:sessionId/checkout', auth, async (req, res) => {
	try {
		const { sessionId } = req.params;
		const { shippingAddress } = req.body;
		const cart = await findOrCreateCart({ userId: req.user.id, sessionId });

		if (!cart || cart.items.length === 0) {
			return res.status(400).json({ message: 'Cart is empty' });
		}

		const orderItems = cart.items.map(item => ({
			product: item.product,
			quantity: item.quantity,
			price: item.price,
			total: item.price * item.quantity,
		}));

		const order = new Order({
			user: req.user.id,
			items: orderItems,
			totalAmount: cart.total,
			shippingAddress: shippingAddress,
			status: 'Pending',
		});

		const savedOrder = await order.save();

		cart.clearCart();
		await cart.save();

		res.status(201).json({
			message: 'Checkout successful',
			orderId: savedOrder._id,
			order: savedOrder,
		});
	} catch (error) {
		console.error('Error during checkout:', error.message, error.stack);
		return res.status(500).json({
			message: 'Error during checkout',
			error: error.message,
		});
	}
});

// POST merge cart
router.post('/:sessionId/merge', auth, async (req, res) => {
	try {
		const { sessionId } = req.params;
		const guestCart = await Cart.findOne({ sessionId });
		const userCart = await findOrCreateCart({ userId: req.user.id });

		if (guestCart && guestCart.items.length > 0) {
			guestCart.items.forEach(item => {
				userCart.addItem(item.product, item.quantity, item.price);
			});
			await userCart.save();
			await Cart.deleteOne({ _id: guestCart._id });
		}

		res.json(userCart.toJSON());
	} catch (error) {
		console.error('Error merging carts:', error);
		res.status(500).json({ message: 'Error merging carts' });
	}
});

module.exports = router;
