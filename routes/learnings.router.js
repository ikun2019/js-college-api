const router = require('express').Router();
const { getAllLearnings } = require('../controllers/learnings.controller');

// @GET /api/learnings
router.get('/', getAllLearnings);

module.exports = router;