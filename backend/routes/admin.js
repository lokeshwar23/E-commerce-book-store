const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET /api/admin/stats
router.get('/stats', async (_req, res) => {
	try {
		const productCount = await Product.countDocuments();
		return res.json({ productCount });
	} catch (error) {
		console.error('Admin stats error:', error);
		return res.status(500).json({ message: 'Failed to get stats', error: error.message });
	}
});

// POST /api/admin/normalize-products
router.post('/normalize-products', async (_req, res) => {
	try {
		const products = await Product.find({});
		let updated = 0;
		const parseDigits = (txt) => {
			if (txt == null) return undefined;
			if (typeof txt === 'number') return txt;
			if (typeof txt !== 'string') return undefined;
			
			// Check if it's actually a number (not corrupted author name)
			const digits = txt.replace(/[^0-9]/g, '');
			if (digits && digits.length > 0 && digits.length <= 10) { // Reasonable vote count
				const votes = parseInt(digits, 10);
				if (votes >= 0 && votes <= 1000000) { // Reasonable range
					return votes;
				}
			}
			return undefined;
		};
		const parseRating = (val) => {
			if (val == null) return undefined;
			if (typeof val === 'number') return val;
			if (typeof val !== 'string') return undefined;
			
			// Handle "4.2 out of 5 stars" format
			const cleaned = val.replace(',', '.');
			const m = cleaned.match(/\d+(?:\.\d+)?/);
			if (m) {
				const rating = parseFloat(m[0]);
				// Validate rating is within reasonable bounds
				if (rating >= 0 && rating <= 5) return rating;
			}
			return undefined;
		};
		const parsePrice = (val, bookType) => {
			if (val == null) return undefined;
			if (typeof val === 'number') return val;
			if (typeof val !== 'string') return undefined;
			const cleaned = val.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
			const num = parseFloat(cleaned);
			if (!Number.isFinite(num)) return undefined;
			return num;
		};

		for (const p of products) {
			let changed = false;
			// rating
			const r = parseRating(p.rating);
			if (r != null && r !== p.rating) { p.rating = r; changed = true; }
			// votes
			const v = parseDigits(p.votes);
			if (v != null && v !== p.votes) { p.votes = v; changed = true; }
			// price
			const pr = parsePrice(p.price, p.bookType);
			if (pr != null && pr !== p.price) { p.price = pr; changed = true; }
			// trim text
			const name = (p.name || '').trim();
			const author = (p.author || '').trim();
			if (name !== p.name) { p.name = name; changed = true; }
			if (author !== p.author) { p.author = author; changed = true; }
			// normalize link protocol
			if (p.amazonLink && typeof p.amazonLink === 'string' && !/^https?:\/\//i.test(p.amazonLink)) {
				p.amazonLink = 'https://' + p.amazonLink.replace(/^\/+/, '');
				changed = true;
			}
			if (changed) {
				await p.save();
				updated++;
			}
		}
		return res.json({ success: true, updated, total: products.length });
	} catch (error) {
		console.error('Admin normalize error:', error);
		return res.status(500).json({ message: 'Failed to normalize products', error: error.message });
	}
});

module.exports = router;
