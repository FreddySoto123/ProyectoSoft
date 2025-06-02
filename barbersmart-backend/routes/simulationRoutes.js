const express = require('express');
const router = express.Router();
const {
  generateHairstyleSimulation,
} = require('../controllers/simulationController');
router.post('/generate', generateHairstyleSimulation);

module.exports = router;
