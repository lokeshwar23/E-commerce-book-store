const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
	try {
		const { username, email, password, firstName, lastName, phone, addresses = [] } = req.body;

		if (!username || !email || !password) {
			return res.status(400).json({ message: 'All fields are required' });
		}

		if (password.length < 6) {
			return res.status(400).json({ message: 'Password must be at least 6 characters long' });
		}

		// Check if user already exists
		const existingUser = await User.findOne({ $or: [{ username }, { email }] });
		if (existingUser) {
			return res.status(400).json({ message: 'Username or email already exists' });
		}

		// Create user
		const user = new User({ username, email, password, firstName, lastName, phone, addresses });
		await user.save();

		const token = generateToken(user._id.toString());
		return res.status(201).json({
			message: 'User registered successfully',
			token,
			user: {
				id: user._id.toString(),
				username: user.username,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				phone: user.phone
			}
		});
	} catch (error) {
		console.error('Registration error:', error);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// User login
router.post('/login', async (req, res) => {
	try {
		const { username, password } = req.body;
		if (!username || !password) {
			return res.status(400).json({ message: 'Username and password are required' });
		}

		const user = await User.findOne({ $or: [{ username }, { email: username }] });
		if (!user) {
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		const isValid = await user.comparePassword(password);
		if (!isValid) {
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		const token = generateToken(user._id.toString());
		return res.json({
			message: 'Login successful',
			token,
			user: {
				id: user._id.toString(),
				username: user.username,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				phone: user.phone
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select('-password');
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		return res.json(user);
	} catch (error) {
		console.error('Profile error:', error);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// Update user profile
router.put('/me', authenticateToken, async (req, res) => {
	try {
		const { name, email, addresses } = req.body;
		const user = await User.findById(req.user.id);

		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		user.name = name || user.name;
		user.email = email || user.email;
		user.addresses = addresses || user.addresses;

		await user.save();
		res.json(user);
	} catch (error) {
		console.error('Update profile error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
	return res.json({ message: 'Logout successful' });
});

module.exports = router;
