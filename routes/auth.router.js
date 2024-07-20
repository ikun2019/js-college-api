const router = require('express').Router();

const { updateProfile, getProfile } = require('../controllers/auth.controller');

// @PUT /api/auth/profile
router.put('/profile', updateProfile);

// @GET /api/auth/profile
router.get('/profile', getProfile);

module.exports = router;