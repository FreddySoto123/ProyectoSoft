const express = require('express');
const router = express.Router();
const {
  getAllBarbershops,
  getBarbershopById,
} = require('../controllers/barbershopController');

router.get('/', getAllBarbershops);

router.get('/:id', getBarbershopById);

module.exports = router;
