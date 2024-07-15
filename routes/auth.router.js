const router = require('express').Router();

const { updateProfile, getProfile, signup, signin, github, callback, gmail, signout } = require('../controllers/auth.controller');

// @POST /api/auth/signup
router.post('/signup', signup);

// @POST /api/auth/signin
router.post('/signin', signin);

// @GET/api/auth/signout
router.get('/signout', signout);

// @GET /api/auth/github
router.get('/github', github);

// @GET /api/auth/gmail
router.get('/gmail', gmail);

// @GET /auth/callback
router.get('/callback', callback);

// @PUT /api/auth/profile
router.put('/profile', updateProfile);

// @GET /api/auth/profile
router.get('/profile', getProfile);

module.exports = router;