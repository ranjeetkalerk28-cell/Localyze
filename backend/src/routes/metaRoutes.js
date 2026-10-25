const express = require('express');
const router = express.Router();
const { getCities } = require('../controllers/metaController');

router.get('/cities', getCities);

module.exports = router;
