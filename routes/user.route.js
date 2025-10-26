const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const userController = require('../controllers/user.controller');

const router = Router();

// User routes
router.get('/', requireAuth, userController.getProfile);
// Note: updateUserProfile function doesn't exist in the controller yet
// router.put('/', requireAuth, userController.updateUserProfile);

module.exports = router;
