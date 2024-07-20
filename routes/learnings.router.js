const router = require('express').Router();
const { getAllLearnings, getSingleLearning, getSingleLearningPage, getNewImageUrl } = require('../controllers/learnings.controller');

// @GET /api/learnings
router.get('/', getAllLearnings);

// @GET /api/learnings/get-new-image-url
router.get('/get-new-image-url', getNewImageUrl);

// @GET /api/learnings/:slug
router.get('/:slug', getSingleLearning);

// @ GET /api/learnings/:slug/:childSlug
router.get('/:slug/:childSlug', getSingleLearningPage);


module.exports = router;