const express = require('express');
const router = express.Router();
const {
  getAllBarbershops,
  getBarbershopById,
} = require('../controllers/barbershopController');

router.get('/barbershops', getAllBarbershops); // <-- ESTA es la ruta que necesitas
router.get('/barbershops/:id', getBarbershopById); // <-- para ver detalles

module.exports = router;