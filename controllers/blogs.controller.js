const blogs = [
  {
    id: 1,
    title: "first title",
    description: "first description"
  },
  {
    id: 2,
    title: "second title",
    description: "second description"
  },
  {
    id: 3,
    title: "third title",
    description: "third description"
  },
]

// @GET /api/blogs
exports.getAllBlogs = (req, res) => {
  console.log('@GET /api/blogs getAllBlogs');
  res.status(200).json(blogs);
};

// @GET /api/blogs/:blogId
exports.getSingleBlog = (req, res) => {
  console.log('@GET /api/blogs/:blogId getSingleBlog');
  const blogId = req.params.blogId;
  const blog = blogs.filter(blog => blog.id === parseInt(blogId));
  res.status(200).json(blog);
};