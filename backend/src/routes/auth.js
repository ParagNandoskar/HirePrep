const express = require('express');
const { 
  register, 
  login, 
  refreshAccessToken, 
  getProfile, 
  updateProfile, 
  changePassword, 
  logout,
  getUserStats 
} = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validate, registerValidation, loginValidation } = require('../middlewares/validation');

const router = express.Router();

// Public routes
router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);
router.post('/refresh-token', refreshAccessToken);

// Protected routes
router.use(authenticate); // Apply authentication middleware to all routes below

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);
router.post('/logout', logout);
router.get('/stats', getUserStats);

module.exports = router;
