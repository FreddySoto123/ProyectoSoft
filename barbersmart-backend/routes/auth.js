const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { register, login, updateProfile, getProfile } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.put('/profile/:id', updateProfile);
router.get('/profile/:id', getProfile);
=======
const { register, login } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login); // ✅ Esta es la nueva ruta
>>>>>>> e343c8f (loginyregistro)

module.exports = router;
