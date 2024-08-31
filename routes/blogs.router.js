const router = require('express').Router();

const { getAllBlogs, getSingleBlog } = require('../controllers/blogs.controller');

// @GET /api/blogs
router.get('/', getAllBlogs);

// @GET /api/blogs/:slug
router.get('/:slug', getSingleBlog);

// @GET /api/blogs/tag/:tag
// router.get('/tag/:tag', getTagBlogs);

module.exports = router;