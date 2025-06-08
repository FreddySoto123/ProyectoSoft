// barbersmart-backend/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
// Podrías añadir middleware de autenticación/autorización aquí si es necesario
// const { authenticateToken } = require('../middleware/authMiddleware');

// Ruta para obtener todos los servicios
// GET / (cuando se monte como /api/servicios, esta será la ruta final)
router.get('/', serviceController.getAllServices);

// Aquí podrías añadir más rutas en el futuro:
// router.get('/:id', serviceController.getServiceById);
// router.post('/', authenticateToken, serviceController.createService); // Ejemplo con autenticación
// etc.

module.exports = router;