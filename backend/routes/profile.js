const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');

// @route   GET api/profile
// @desc    Get user profile
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/profile/details
// @desc    Update user details
// @access  Private
router.put('/details', auth, async (req, res) => {
  const { firstName, lastName, phone, addresses } = req.body;

  try {
    const user = await User.findById(req.user.id);

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (addresses) user.addresses = addresses;

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/profile/orders
// @desc    Get user orders
// @access  Private
router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate('items.product');
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
