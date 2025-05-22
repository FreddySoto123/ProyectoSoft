const express = require('express');
const router = express.Router();
const {getAllBarbershops} = require('../controllers/barbershopController');

router.get('/', getAllBarbershops);

module.exports = router;