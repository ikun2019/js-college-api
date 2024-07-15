const router = require('express').Router();
const { getAllLearnings, getSingleLearning, getSingleLearningPage } = require('../controllers/learnings.controller');

// @GET /api/learnings
router.get('/', getAllLearnings);

// @GET /api/learnings/:slug
router.get('/:slug', getSingleLearning);

// @ GET /api/learnings/:slug/:childSlug
router.get('/:slug/:childSlug', getSingleLearningPage);

module.exports = router;