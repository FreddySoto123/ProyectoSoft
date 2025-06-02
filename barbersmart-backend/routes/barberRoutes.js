// routes/barberRoutes.js
const express = require('express');
const router = express.Router();
const {getBarberProfileById} = require('../controllers/barberController'); // Ajusta la ruta

// GET /api/barbers/profile/:userId - Obtener el perfil de un barbero específico
router.get('/profile/:userId', getBarberProfileById);

module.exports = router;
