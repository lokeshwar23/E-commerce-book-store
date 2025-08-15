const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

	if (!token) {
		return res.status(401).json({ message: 'Access token required' });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		const user = await User.findById(decoded.userId).select('_id username email');
		if (!user) {
			return res.status(401).json({ message: 'Invalid token' });
		}
		req.user = { id: user._id.toString(), username: user.username, email: user.email };
		next();
	} catch (error) {
		return res.status(403).json({ message: 'Invalid or expired token' });
	}
};

// Middleware to check if user is authenticated (optional)
const optionalAuth = async (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if (token) {
		try {
			const decoded = jwt.verify(token, JWT_SECRET);
			const user = await User.findById(decoded.userId).select('_id username email');
			if (user) {
				req.user = { id: user._id.toString(), username: user.username, email: user.email };
			}
		} catch (error) {
			// ignore invalid token
		}
	}
	return next();
};

// Generate JWT token
const generateToken = (userId) => {
	return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

module.exports = {
	authenticateToken,
	optionalAuth,
	generateToken
};
