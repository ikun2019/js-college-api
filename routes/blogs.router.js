const router = require('express').Router();

const { getAllBlogs, getSingleBlog } = require('../controllers/blogs.controller');

// @GET /api/blogs
router.get('/', getAllBlogs);

// @GET /api/blogs/slug
router.get('/:slug', getSingleBlog);

module.exports = router;