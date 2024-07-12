const router = require('express').Router();

const { updateProfile, getProfile, signup, signin } = require('../controllers/auth.controller');

// @POST /api/auth/signup
router.post('/signup', signup);

// @POST /api/auth/signin
router.post('/signin', signin);

// @PUT /api/auth/profile
router.put('/profile', updateProfile);

// @GET /api/auth/profile
router.get('/profile', getProfile);

module.exports = router;