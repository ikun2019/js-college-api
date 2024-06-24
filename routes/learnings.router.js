const router = require('express').Router();
const { getAllLearnings, getSingleLearning } = require('../controllers/learnings.controller');

// @GET /api/learnings
router.get('/', getAllLearnings);

// @GET /api/learnings/:slug
router.get('/:slug', getSingleLearning);

module.exports = router;