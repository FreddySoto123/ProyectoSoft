// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  updateProfile,
  getProfile,
  initiatePasswordReset,
  verifyResetCode,
  resetPasswordWithCode,
} = require('../controllers/authController');

// Rutas existentes
router.post('/register', register);
router.post('/login', login);
router.put('/profile/:id', updateProfile); 
router.get('/profile/:id', getProfile);

// Reseteo de contraseña
router.post('/initiate-password-reset', initiatePasswordReset);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password-with-code', resetPasswordWithCode);

module.exports = router;
