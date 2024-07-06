const supabase = require('../lib/supabaseAPI');

// * メタ情報を取得するための関数
const getPageMetaData = (blog) => {
  return {
    title: blog.title,
    description: blog.description,
    slug: blog.slug,
    date: blog.created_at,
    tags: blog.tags ? blog.tags.split(',') : [],
    image_name: blog.image_name,
    image_url: blog.image_url,
  }
}

// @GET /api/blogs
exports.getAllBlogs = async (req, res) => {
  console.log('@GET /api/blogs getAllBlogs');
  try {
    const response = await supabase.from('blogs').select('*');
    const blogsMetadatas = response.data.map((blog) => {
      const metadata = getPageMetaData(blog);
      return metadata;
    });
    res.status(200).json({
      metadatas: blogsMetadatas
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};

// @GET /api/blogs/:slug
exports.getSingleBlog = async (req, res) => {
  console.log('@GET /api/blogs/:slug getSingleBlog');
  try {
    const { slug } = req.params;
    const response = await supabase.from('blogs').select('*').eq('slug', slug).single();
    if (!response.data) {
      return res.status(404).json({ error: '指定された記事が存在しません' });
    }

    const page = response.data;
    const metadata = getPageMetaData(page);
    const markdown = page.content;

    res.status(200).json({
      metadata: metadata,
      markdown: markdown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};

// @GET /api/blogs/tag/:tag
exports.getTagBlogs = async (req, res) => {
  console.log('@GET /api/blogs/tag/:tag getTagBlogs');
  try {
    const { tag } = req.params;

    const response = await supabase.from('blogs').select('*').ilike('tags', tag);
    if (!response.data) {
      return res.status(404).json({ error: '指定された記事が存在しません' });
    }

    const metadatas = response.data.map((blog) => {
      return getPageMetaData(blog)
    });

    res.status(200).json(metadatas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};