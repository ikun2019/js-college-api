const fs = require('fs');

const notion = require('../lib/notionAPI');

const notionLearningDatabaseId = fs.existsSync(process.env.NOTION_LEARNING_DATABASE_ID_FILE) ? fs.readFileSync(process.env.NOTION_LEARNING_DATABASE_ID, 'utf8').trim() : process.env.NOTION_LEARNING_DATABASE_ID;

// メタデータの取得メソッド
const getPageMetaData = (learning) => {
  const getTags = (tags) => {
    const allTags = tags.map((tag) => {
      return tag.name;
    });
    return allTags;
  };

  return {
    title: learning.properties.Title.title[0]?.plain_text || '',
    description: learning.properties.Description.rich_text[0]?.plain_text || '',
    slug: learning.properties.Slug.rich_text[0]?.plain_text || '',
    data: learning.properties.Date.date.start,
    tags: getTags(learning.properties.Tags.multi_select),
    image: learning.properties.Image.files[0] || null,
    premium: learning.properties.Premium.checkbox,
  }
};
const getChildPageMetaData = (child) => {
  return {
    title: child.properties.Title.title[0]?.plain_text || '',
    description: child.properties.Description.rich_text[0]?.plain_text || '',
  }
};

// 子ブロックを取得
const getBlockChildren = async (blockId) => {
  const response = await notion.blocks.children.list({ block_id: blockId });
  return response.results;
};

const getDatabaseItems = async (databaseId) => {
  const response = await notion.databases.query({
    database_id: databaseId,
  });
  return response.results.map(item => getChildPageMetaData(item));
};

// ネストしたメタデータの取得メソッド
const getNestedMetaData = async (blockId) => {
  const blocks = await getBlockChildren(blockId);
  let nestedMetaDatas = [];

  for (const block of blocks) {
    if (block.type === 'child_database') {
      const databaseItems = await getDatabaseItems(block.id);
      nestedMetaDatas.push({
        database_id: block.id,
        items: databaseItems
      });
    } else if (block.has_children) {
      const childMetadatas = await getNestedMetaData(block.id);
      nestedMetaDatas = nestedMetaDatas.concat(childMetadatas);
    }
  }
  return nestedMetaDatas;
};

// @GET /api/learnings
exports.getAllLearnings = async (req, res) => {
  console.log('@GET /api/learnings getAllLearnings');
  try {
    const response = await notion.databases.query({
      database_id: notionLearningDatabaseId,
      filter: {
        property: 'Published',
        checkbox: {
          equals: true,
        }
      }
    });
    const learnings = response.results;
    const metadatas = learnings.map((learning) => {
      return getPageMetaData(learning);
    });

    res.status(200).json({
      metadatas: metadatas,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};

// @GET /api/learnings/:slug
exports.getSingleLearning = async (req, res) => {
  console.log('@GET /api/learnings/:slug getSingleLearning');
  try {
    const { slug } = req.params;
    const response = await notion.databases.query({
      database_id: notionLearningDatabaseId,
      filter: {
        property: 'Slug',
        formula: {
          string: {
            equals: slug,
          }
        }
      }
    });
    if (response.results.length === 0) {
      return res.status(404).json({ error: '指定された記事が存在しません' });
    }

    const page = response.results[0];
    const metadata = getPageMetaData(page);
    const nestedMetadatas = await getNestedMetaData(page.id);

    res.status(200).json({
      metadata: metadata,
      nestedMetadatas: nestedMetadatas,
    });
  } catch (err) {

  }
};