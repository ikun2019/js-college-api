const notion = require('../lib/notionAPI');

const getPageMetaData = (blog) => {
  const getTags = (tags) => {
    const allTags = tags.map((tag) => {
      return tag.name;
    });
    return allTags;
  };
  return {
    title: blog.properties.Title.title[0].plain_text,
    description: blog.properties.Description.rich_text[0].plain_text,
    slug: blog.properties.Slug.rich_text[0].plain_text,
    date: blog.properties.Date.date.start,
    tags: getTags(blog.properties.Tags.multi_select),
    image: blog.properties.Image.files[0],
  };
}

// @GET /api/blogs
exports.getAllBlogs = async (req, res) => {
  console.log('@GET /api/blogs getAllBlogs');
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
  });
  const blogs = response.results;
  const metadatas = blogs.map((blog) => {
    return getPageMetaData(blog);
  })
  res.status(200).json(metadatas);
};

// @GET /api/blogs/:blogId
exports.getSingleBlog = (req, res) => {
  console.log('@GET /api/blogs/:blogId getSingleBlog');
  const blogId = req.params.blogId;
  const blog = blogs.filter(blog => blog.id === parseInt(blogId));
  res.status(200).json(blog);
};