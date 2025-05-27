const express = require('express');
const router = express.Router();
const {getAllHairstyles} = require('../controllers/styleController');

router.get('/hairstyles', getAllHairstyles);

module.exports = router;
