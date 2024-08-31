const notion = require('../lib/notionAPI');
const { NotionToMarkdown } = require('notion-to-md');
const NodeCache = require('node-cache');
const cron = require('node-cron');
const fs = require('fs');


// * キャッシュの初期化
const cache = new NodeCache({ stdTTL: 3300 });
// * notionの初期化
const notionLearningDatabaseId = fs.existsSync(process.env.NOTION_LEARNING_DATABASE_ID_FILE) ? fs.readFileSync(process.env.NOTION_LEARNING_DATABASE_ID_FILE, 'utf8').trim() : process.env.NOTION_LEARNING_DATABASE_ID;
console.log('notionLearningDatabaseId =>', notionLearningDatabaseId);

// * n2mの初期化
const n2m = new NotionToMarkdown({ notionClient: notion });
// * メタデータ取得メソッド
const getPageMetadata = (learning, type) => {
  if (type === 'parent') {
    return {
      title: learning.properties.Title.title[0].plain_text,
      description: learning.properties.Description.rich_text[0].plain_text,
      image_name: learning.properties.Image.files[0].name,
      image_url: learning.properties.Image.files[0].file.url,
      slug: learning.properties.Slug.rich_text[0].plain_text,
      tags: learning.properties.Tags.multi_select.map(tag => tag.name),
      premium: learning.properties.Premium.checkbox,
    }
  } else {
    return {
      title: learning.title,
      description: learning.description,
      slug: learning.slug,
      premium: learning.premium,
    }
  }
};
// * ページIDからMarkdownのコンテンツを取得
const getPageContentAsMarkdown = async (pageId) => {
  try {
    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdBlocks);
    return mdString;
  } catch (error) {
    console.error(error);
    return '';
  }
};
// * 見出しを取り出す
const getHeadeingsFromMarkdown = (markdown) => {
  const headingLines = markdown.split('\n').filter(line => line.startsWith('#'));
  const headings = headingLines.map(line => {
    const level = line.match(/^#+/)[0].length;
    const text = line.replace(/^#+/, '').trim();
    return { level, text };
  })
  return headings;
}
// * childのメタデータを取得する関数
const getChildMetadata = (page) => {
  const title = page.properties.Title.title[0]?.plain_text || '';
  const description = page.properties.Description.rich_text[0]?.plain_text || '';
  const slug = page.properties.Slug.rich_text[0]?.plain_text || '';
  const published = page.properties.Published?.checkbox;
  const premium = page.properties.Premium?.checkbox;
  return {
    title,
    description,
    slug,
    premium,
    published,
  }
};
// * childsのメタデータを取得する関数
const getNestedMetadatas = async (childDatabaseId) => {
  const cacheKey = `nestedmetadatas_${childDatabaseId}`;
  return getCachedData(cacheKey, async () => {
    const response = await notion.databases.query({
      database_id: childDatabaseId,
      filter: {
        property: 'Published',
        checkbox: {
          equals: true
        }
      }
    });
    return response.results.map((page) => {
      const metadata = getChildMetadata(page);
      return { ...metadata, childId: page.id }
    });
  });
};
// * childsのデータベースを取得
const getNestedDatabases = async (parentPageId) => {
  // キャッシュからデータを取得
  const cacheKey = `nesteddatabases_${parentPageId}`;
  return getCachedData(cacheKey, async () => {
    const response = await notion.blocks.children.list({ block_id: parentPageId });
    const childDatabases = response.results.filter((database) => database.type === 'child_database');
    const childMetadatas = await Promise.all(
      childDatabases.map(async (childDatabase) => getNestedMetadatas(childDatabase.id))
    );
    return childMetadatas;
  });
};

// * サーバー起動時にキャッシュを準備（データの事前取得）
const prefetchLearnings = async () => {
  try {
    // learnings_allのキャッシュ
    const response = await notion.databases.query({
      database_id: notionLearningDatabaseId,
      filter: {
        property: 'Published',
        checkbox: { equals: true }
      }
    });
    const parentMetadatas = response.results.map((parentData) => getPageMetadata(parentData, 'parent'));
    cache.set('learnings_all', parentMetadatas);

    // learnings_slugのキャッシュ
    for (const parentData of response.results) {
      const slug = parentData.properties.Slug.rich_text[0].plain_text;
      const parentPageId = parentData.id;
      const nestedMetadatas = await getNestedDatabases(parentPageId);
      const responseSlug = {
        parentMetadata: parentData.properties,
        nestedMetadatas: nestedMetadatas[0],
      };
      cache.set(`learnings_${slug}`, responseSlug);
      // learnings_slug_childSlugのキャッシュ
      for (const childMetadata of nestedMetadatas[0]) {
        const childSlug = childMetadata.slug;
        const markdown = await getPageContentAsMarkdown(childMetadata.childId);
        const headings = getHeadeingsFromMarkdown(markdown.parent);
        const responseLearning = {
          metadata: childMetadata,
          markdown: markdown,
          headings: headings,
        };
        cache.set(`learnings_${slug}_${childSlug}`, responseLearning);
      };
    }
  } catch (error) {
    console.error('Error prefetching learnings:', error);
  }
};
prefetchLearnings();
// * キャッシュの定期更新
cron.schedule('*/55 * * * *', async () => {
  console.log('Updating cache');
  try {
    await prefetchLearnings();
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
}

// @GET /api/learnings
exports.getAllLearnings = async (req, res) => {
  console.log('@GET /api/learnings getAllLearnings');
  // キャッシュを保存先から取得
  const cacheKey = 'learnings_all';

  try {
    const parentMetadatas = await getCachedData(cacheKey, async () => {
      const response = await notion.databases.query({
        database_id: notionLearningDatabaseId,
        filter: {
          property: 'Published',
          checkbox: { equals: true }
        }
      });
      return response.results.map((parentData) => getPageMetadata(parentData, 'parent'));
    });

    res.status(200).json({
      metadatas: parentMetadatas,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};

// @GET /api/learnings/:slug
exports.getSingleLearning = async (req, res) => {
  console.log('@GET /api/learnings/:slug getSingleLearning');
  const { slug } = req.params;

  // キャッシュからデータを取得
  const cacheKey = `learnings_${slug}`;

  try {
    const responseSlug = await getCachedData(cacheKey, async () => {
      const response = await notion.databases.query({
        database_id: notionLearningDatabaseId,
        filter: {
          and: [
            { property: 'Published', checkbox: { equals: true } },
            { property: 'Slug', rich_text: { equals: slug } }
          ]
        }
      });
      const data = response.results[0];
      const parentPageId = data.id
      const nestedMetadatas = await getNestedDatabases(parentPageId);

      return {
        parentMetadata: data.properties,
        nestedMetadatas: nestedMetadatas[0],
      }
    });

    res.status(200).json(responseSlug);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};

// @ GET /api/learnings/:slug/:childSlug
exports.getSingleLearningPage = async (req, res) => {
  console.log('@ GET /api/learnings/:slug/:childSlug getSingleLearningPage');
  const { slug, childSlug } = req.params;

  // キャッシュからデータを取得
  const cacheKey = `learnings_${slug}_${childSlug}`;

  try {
    const responseLearning = await getCachedData(cacheKey, async () => {
      const response = await notion.databases.query({
        database_id: notionLearningDatabaseId,
        filter: {
          and: [
            { property: 'Published', checkbox: { equals: true } },
            { property: 'Slug', rich_text: { equals: slug } }
          ]
        }
      });
      const data = response.results[0];
      const parentPageId = data.id;
      const nestedMetadatas = await getNestedDatabases(parentPageId);
      const childMetadata = nestedMetadatas[0].find(nestedMetadata => nestedMetadata.slug === childSlug);
      const markdown = await getPageContentAsMarkdown(childMetadata.childId);
      const headings = getHeadeingsFromMarkdown(markdown.parent);

      return {
        metadata: childMetadata,
        markdown: markdown,
        headings: headings,
      }
    });

    res.status(200).json(responseLearning);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};
