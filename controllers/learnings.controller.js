const fs = require('fs');
const { NotionToMarkdown } = require('notion-to-md');

const notion = require('../lib/notionAPI');
const supabase = require('../lib/supabaseAPI');

const notionLearningDatabaseId = fs.existsSync(process.env.NOTION_LEARNING_DATABASE_ID_FILE) ? fs.readFileSync(process.env.NOTION_LEARNING_DATABASE_ID, 'utf8').trim() : process.env.NOTION_LEARNING_DATABASE_ID;

// * notion-to-mdの初期化
const n2m = new NotionToMarkdown({ notionClient: notion });

// * メタデータ取得メソッド
// const getPageMetaData = (page, type) => {
//   const getTags = (tags) => {
//     const allTags = tags.map((tag) => {
//       return tag.name;
//     });
//     return allTags;
//   };
//   const metadata = {
//     title: page.properties.Title.title[0]?.plain_text || '',
//     description: page.properties.Description.rich_text[0]?.plain_text || '',
//     slug: page.properties.Slug.rich_text[0]?.plain_text || '',
//   };
//   if (type === 'parent') {
//     metadata.date = page.properties.Date.date.start;
//     metadata.tags = getTags(page.properties.Tags.multi_select);
//     metadata.image = page.properties.Image.files[0] || null;
//     metadata.premium = page.properties.Premium.checkbox;
//   };
//   return metadata;
// };
const getPageMetadata = (learning, type) => {
  if (type === 'parent') {
    return {
      title: learning.title,
      description: learning.description,
      image_name: learning.image_name,
      image_url: learning.image_url,
      slug: learning.slug,
      tags: learning.tags ? learning.tags.split(',') : [],
      content: learning.content,
      premium: learning.premium,
    }
  }
}
// * 子ブロックを取得
const getBlockChildren = async (blockId) => {
  const response = await notion.blocks.children.list({ block_id: blockId });
  return response.results;
};

const getDatabaseItems = async (databaseId) => {
  const response = await notion.databases.query({
    database_id: databaseId,
  });
  return response.results.map(item => getPageMetaData(item, 'child'));
};

// * ネストしたメタデータの取得メソッド
const getNestedMetaData = (nestedPages) => {
  console.log('nestedPages =>', nestedPages);
  const nestedMetadatas = nestedPages.map((nestedPage) => {
    return {
      title: nestedPage.title,
      description: nestedPage.description,
      slug: nestedPage.slug,
      premium: nestedPage.premium,
    }
  });
  return nestedMetadatas;
};


// @GET /api/learnings
exports.getAllLearnings = async (req, res) => {
  console.log('@GET /api/learnings getAllLearnings');
  try {
    const response = await supabase.from('learnings').select('*');
    const learningsMetadatas = response.data.map((learning) => {
      const metadata = getPageMetadata(learning, 'parent');
      return metadata;
    })
    res.status(200).json({
      metadatas: learningsMetadatas,
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
    const response = await supabase.from('learnings').select('*').eq('slug', slug).single();
    if (!response.data) {
      return res.status(404).json({ error: '指定された記事が存在しません' });
    }

    const page = response.data;
    const metadata = getPageMetadata(page, 'parent');
    const nestedMetadatas = getNestedMetaData(page.nestedPages[0]);

    res.status(200).json({
      metadata: metadata,
      nestedMetadatas: nestedMetadatas,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};

// @ GET /api/learnings/:slug/:childSlug
exports.getSingleLearningPage = async (req, res) => {
  console.log('@ GET /api/learnings/:slug/:childSlug getSingleLearningPage');
  try {
    const { slug, childSlug } = req.params;
    // 親ページのクエリ
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
    const nestedMetaDatas = await getNestedMetaData(page.id);
    const childPageDatabaseId = nestedMetaDatas[0]?.database_id;

    if (!childPageDatabaseId) {
      return res.status(404).json({ error: '指定されたデータベースが存在しません' });
    }

    // 子ページのクエリ
    const childResponse = await notion.databases.query({
      database_id: childPageDatabaseId,
      filter: {
        property: 'Slug',
        formula: {
          string: {
            equals: childSlug,
          }
        }
      }
    });
    if (childResponse.results.length === 0) {
      return res.status(404).json({ error: '指定されたページが存在しません' });
    }

    const childPage = childResponse.results[0];
    const metadata = getPageMetaData(childPage, 'child');
    const mdBlock = await n2m.pageToMarkdown(childPage.id);
    const mdString = n2m.toMarkdownString(mdBlock);

    // 見出しタグの取得のための動的インポート
    const { unified } = await import('unified');
    const remarkParse = (await import('remark-parse')).default;
    const { visit } = await import('unist-util-visit');

    const headings = [];
    const processor = unified()
      .use(remarkParse)
      .use(() => (tree) => {
        visit(tree, 'heading', (node) => {
          const text = node.children.map((child) => (child.value ? child.value : '')).join('');
          headings.push({ level: node.depth, text });
        });
      });

    const parsedTree = processor.parse(mdString.parent);
    processor.runSync(parsedTree);

    res.status(200).json({
      metadata: metadata,
      markdown: mdString,
      headings: headings,
    }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};