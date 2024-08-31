const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const NodeCache = require('node-cache');
const cron = require('node-cron');

// * キャッシュの初期化
const cache = new NodeCache({ stdTTL: 600 });
// * notionの初期化
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})
// * n2mの初期化
const n2m = new NotionToMarkdown({ notionClient: notion });
// * メタ情報を取得するための関数
const getPageMetaData = (blog) => {
  return {
    title: blog.properties.Title?.title[0].plain_text,
    description: blog.properties.Description?.rich_text[0].plain_text,
    slug: blog.properties.Slug?.rich_text[0].plain_text,
    date: blog.properties.Date?.date.start,
    tags: blog.properties.Tags ? blog.properties.Tags?.multi_select.map((tag) => tag.name) : [],
    image_name: blog.properties.Image?.files[0].name,
    image_url: blog.properties.Image?.files[0].file.url,
  }
}
// * サーバー起動時にキャッシュを準備（データの事前取得）
const prefetchBlogs = async () => {
  try {
    const blogsResponse = await notion.databases.query({
      database_id: process.env.NOTION_BLOG_DATABASE_ID,
      filter: {
        property: 'Published',
        checkbox: { equals: true }
      }
    });
    const blogsResponseData = blogsResponse.results;
    const blogsMetadatas = blogsResponseData.map((blog) => blog.properties);
    cache.set('blogs_all', blogsMetadatas);
  } catch (error) {
    console.error('Error prefetching learnings:', error);
  }
};
prefetchBlogs();
// * キャッシュの定期更新
cron.schedule('*/55 * * * *', async () => {
  console.log('Updating cache');
  try {
    await prefetchBlogs();
    console.log('Updated cache');
  } catch (error) {
    console.error('キャッシュ更新中にエラーが発生しました', error);
  }
});
// * キャッシュを取得、検証、更新
const getCachedData = async (key, fetchFunction) => {
  const cachedData = cache.get(key);
  if (cachedData) {
    console.log(`Returning cached data for ${key}`);
    return cachedData;
  } else {
    const data = await fetchFunction();
    cache.set(key, data);
    return data;
  }
};

// @GET /api/blogs
exports.getAllBlogs = async (req, res) => {
  console.log('@GET /api/blogs getAllBlogs');
  // キャッシュを保存先から取得
  const cacheKey = req.query.tag ? `blogs_${req.query.tag}` : 'blogs_all';

  let filter = {
    and: [
      { property: 'Published', checkbox: { equals: true } }
    ]
  };
  if (req.query && req.query.tag) {
    const { tag } = req.query;
    filter.and.push({
      property: 'Tags',
      multi_select: { contains: tag }
    });
  }
  try {
    const allBlogsMetadatas = await getCachedData(cacheKey, async () => {
      const response = await notion.databases.query({
        database_id: process.env.NOTION_BLOG_DATABASE_ID,
        filter: filter,
      });
      const allBlogsResponseResults = response.results;
      return allBlogsResponseResults.map((blog) => blog.properties);
    });

    res.status(200).json({
      metadatas: allBlogsMetadatas || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};

// @GET /api/blogs/:slug
exports.getSingleBlog = async (req, res) => {
  console.log('@GET /api/blogs/:slug getSingleBlog');
  const { slug } = req.params;

  const cacheKey = `blogs_${slug}`;

  try {
    const blogMetadataAndMarkdown = await getCachedData(cacheKey, async () => {
      const response = await notion.databases.query({
        database_id: process.env.NOTION_BLOG_DATABASE_ID,
        filter: {
          and: [
            { property: 'Published', checkbox: { equals: true } },
            { property: 'Slug', rich_text: { equals: slug } }
          ]
        }
      });
      const blogResponseData = response.results;
      const metadata = getPageMetaData(blogResponseData[0]);
      // notionをmarkdownに変換
      const mdBlock = await n2m.pageToMarkdown(blogResponseData[0].id);
      const mdString = n2m.toMarkdownString(mdBlock);
      return {
        metadata: metadata,
        markdown: mdString.parent,
      };
    });

    res.status(200).json(blogMetadataAndMarkdown);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};