const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Build MongoDB filter from query
function buildProductFilter(query) {
	const { category, search, genre, language, bookType, author } = query;
	const filter = {};
	if (category && category !== 'All') filter.category = category;
	if (genre && genre !== 'All') filter.genre = genre;
	if (language && language !== 'All') filter.language = language;
	if (bookType && bookType !== 'All') filter.bookType = bookType;
	if (author) filter.author = new RegExp(author, 'i');
	if (search) {
		filter.$or = [
			{ name: new RegExp(search, 'i') },
			{ author: new RegExp(search, 'i') },
			{ description: new RegExp(search, 'i') },
			{ genre: new RegExp(search, 'i') }
		];
	}
	return filter;
}

function buildSort(sortBy) {
	if (!sortBy) return { name: 1 };
	switch (sortBy) {
		case 'price':
			return { price: 1 };
		case 'rating':
			return { rating: -1 };
		case 'votes':
			return { votes: -1 };
		case 'name':
			return { name: 1 };
		case 'author':
			return { author: 1 };
		default:
			return { name: 1 };
	}
}

// GET product original image (redirects to OG image if available)
router.get('/image/:id', async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (!product) return res.status(404).json({ message: 'Product not found' });
		const link = product.amazonLink;
		if (!link) return res.status(404).json({ message: 'No product link available' });

		const response = await fetch(link, { headers: { 'user-agent': 'Mozilla/5.0' } });
		if (!response.ok) return res.status(502).json({ message: 'Failed to fetch product page' });
		const html = await response.text();
		const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
					 html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i);
		if (match && match[1]) {
			return res.redirect(match[1]);
		}
		return res.status(404).json({ message: 'Product image not found' });
	} catch (error) {
		return res.status(500).json({ message: 'Error retrieving image' });
	}
});

// GET all products with enhanced filtering (supports optional pagination)
router.get('/', async (req, res) => {
	try {
		const filter = buildProductFilter(req.query);
		const sort = buildSort(req.query.sortBy);

		// Optional pagination
		const page = Math.max(parseInt(req.query.page || '1', 10), 1);
		const limitParam = req.query.limit !== undefined ? parseInt(req.query.limit, 10) : undefined;
		const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : undefined; // cap at 1000

		if (limit) {
			const [items, total] = await Promise.all([
				Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
				Product.countDocuments(filter)
			]);
			return res.json({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
		}

		// No limit provided: return all matching products
		const products = await Product.find(filter).sort(sort);
		return res.json(products);
	} catch (error) {
		console.error('Error fetching products:', error);
		return res.status(500).json({ message: 'Error fetching products' });
	}
});

// GET products by category
router.get('/category/:category', async (req, res) => {
	try {
		const products = await Product.find({ category: req.params.category }).sort({ name: 1 });
		return res.json(products);
	} catch (error) {
		console.error('Error fetching products by category:', error);
		return res.status(500).json({ message: 'Error fetching products by category' });
	}
});

// GET products by genre
router.get('/genre/:genre', async (req, res) => {
	try {
		const products = await Product.find({ genre: req.params.genre }).sort({ name: 1 });
		return res.json(products);
	} catch (error) {
		console.error('Error fetching products by genre:', error);
		return res.status(500).json({ message: 'Error fetching products by genre' });
	}
});

// GET products by author
router.get('/author/:author', async (req, res) => {
	try {
		const authorRegex = new RegExp(req.params.author, 'i');
		const products = await Product.find({ author: authorRegex }).sort({ author: 1 });
		return res.json(products);
	} catch (error) {
		console.error('Error fetching products by author:', error);
		return res.status(500).json({ message: 'Error fetching products by author' });
	}
});

// GET available genres
router.get('/genres/list', async (req, res) => {
	try {
		const genres = await Product.distinct('genre', { genre: { $ne: null } });
		return res.json(genres.sort());
	} catch (error) {
		console.error('Error fetching genres:', error);
		return res.status(500).json({ message: 'Error fetching genres' });
	}
});

// GET available languages
router.get('/languages/list', async (req, res) => {
	try {
		const languages = await Product.distinct('language', { language: { $ne: null } });
		return res.json(languages.sort());
	} catch (error) {
		console.error('Error fetching languages:', error);
		return res.status(500).json({ message: 'Error fetching languages' });
	}
});

// GET available book types
router.get('/types/list', async (req, res) => {
	try {
		const types = await Product.distinct('bookType', { bookType: { $ne: null } });
		return res.json(types.sort());
	} catch (error) {
		console.error('Error fetching book types:', error);
		return res.status(500).json({ message: 'Error fetching book types' });
	}
});

// GET top rated books
router.get('/top/rated', async (req, res) => {
	try {
		const topRated = await Product.find({ rating: { $gte: 4.0 }, votes: { $gte: 100 } })
			.sort({ rating: -1 })
			.limit(20);
		return res.json(topRated);
	} catch (error) {
		console.error('Error fetching top rated books:', error);
		return res.status(500).json({ message: 'Error fetching top rated books' });
	}
});

// GET bestselling books (by votes)
router.get('/top/bestselling', async (req, res) => {
	try {
		const bestselling = await Product.find({ votes: { $gte: 1000 } })
			.sort({ votes: -1 })
			.limit(20);
		return res.json(bestselling);
	} catch (error) {
		console.error('Error fetching bestselling books:', error);
		return res.status(500).json({ message: 'Error fetching bestselling books' });
	}
});

// GET single product by ID (keep last)
router.get('/:id', async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}
		return res.json(product);
	} catch (error) {
		console.error('Error fetching product:', error);
		return res.status(500).json({ message: 'Error fetching product' });
	}
});

module.exports = router;
