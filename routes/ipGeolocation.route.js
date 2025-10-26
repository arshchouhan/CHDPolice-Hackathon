const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const ipGeolocationController = require('../controllers/ipGeolocation.controller');

const router = Router();

// IP Geolocation routes (protected)
router.use(requireAuth);

router.get('/lookup/:ip', ipGeolocationController.lookupIP);
router.get('/history', ipGeolocationController.getLookupHistory);

module.exports = router;
