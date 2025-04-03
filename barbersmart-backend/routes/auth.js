const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login); // ✅ Esta es la nueva ruta

module.exports = router;
