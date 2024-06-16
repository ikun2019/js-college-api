const { NotionToMarkdown } = require('notion-to-md');
const notion = require('../lib/notionAPI');

// * メタ情報を取得するための関数
const getPageMetaData = (blog) => {
  const getTags = (tags) => {
    const allTags = tags.map((tag) => {
      return tag.name;
    });
    return allTags;
  };
  return {
    title: blog.properties.Title.title[0]?.plain_text || '',
    description: blog.properties.Description.rich_text[0]?.plain_text || '',
    slug: blog.properties.Slug.rich_text[0]?.plain_text || '',
    date: blog.properties.Date.date.start,
    tags: getTags(blog.properties.Tags.multi_select),
    image: blog.properties.Image.files[0] || null,
  };
}

// * notion-to-mdの初期化
const n2m = new NotionToMarkdown({ notionClient: notion });

// @GET /api/blogs
exports.getAllBlogs = async (req, res) => {
  console.log('@GET /api/blogs getAllBlogs');
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
    });
    const blogs = response.results;
    const metadatas = blogs.map((blog) => {
      return getPageMetaData(blog);
    })
    res.status(200).json(metadatas);
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
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: 'Slug',
        formula: {
          string: {
            equals: slug,
          }
        }
      },
    });

    if (response.results.length === 0) {
      return res.status(404).json({ error: '指定された記事が存在しません' });
    }

    const page = response.results[0];
    const metadata = getPageMetaData(page);
    const mdBlock = await n2m.pageToMarkdown(page.id);
    const mdString = n2m.toMarkdownString(mdBlock);

    res.status(200).json({
      metadata: metadata,
      markdown: mdString,
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

    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: 'Tags',
        multi_select: {
          contains: tag,
        }
      },
    });

    if (response.results.length === 0) {
      return res.status(404).json({ error: '指定された記事が存在しません' });
    };

    const blogs = response.results;
    const metadatas = blogs.map((blog) => {
      return getPageMetaData(blog)
    });
    res.status(200).json(metadatas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};