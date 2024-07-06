const { NotionToMarkdown } = require('notion-to-md');
const notion = require('../lib/notionAPI');

const fs = require('fs');

const notionBlogDatabaseId = fs.existsSync(process.env.NOTION_DATABASE_ID_FILE) ? fs.readFileSync(process.env.NOTION_DATABASE_ID_FILE, 'utf8').trim() : process.env.NOTION_DATABASE_ID;
const notionLearningDatabaseId = fs.existsSync(process.env.NOTION_LEARNING_DATABASE_ID_FILE) ? fs.readFileSync(process.env.NOTION_LEARNING_DATABASE_ID_FILE, 'utf8').trim() : process.env.NOTION_LEARNING_DATABASE_ID;
const n2m = new NotionToMarkdown({ notionClient: notion });

// * notionをmarkdownにする関数
async function pageToMarkdown(pageId) {
  const mdBlock = await n2m.pageToMarkdown(pageId);
  // child_databaseブロックをフィルタリング
  const filteredMdBlock = mdBlock.filter(block => block.type !== 'child_database');
  const mdString = n2m.toMarkdownString(filteredMdBlock);

  return {
    markdown: mdString,
  }
}

// * pageのメタデータを取得する関数
async function getPageMetadata(page, parent, type) {
  const getTags = (tags) => {
    return tags.map((tag) => tag.name).join(',');
  }
  const title = page.properties.Title.title[0]?.plain_text || '';
  const description = page.properties.Description.rich_text[0]?.plain_text || '';
  const slug = page.properties.Slug.rich_text[0]?.plain_text || '';
  const tags = page.properties.Tags ? getTags(page.properties.Tags.multi_select) : '';
  const imageFile = page.properties.Image?.files[0];
  const image_name = imageFile ? imageFile.name : null;
  const image_url = imageFile ? imageFile.file.url : null;
  const published = page.properties.Published?.checkbox;
  const premium = page.properties.Premium?.checkbox;
  if (parent && type === 'learning') {
    return {
      title,
      description,
      slug,
      tags,
      image_name,
      image_url,
      premium,
    };
  } else if (!parent && type === 'learning') {
    return {
      title,
      description,
      slug,
      premium,
      published,
    }
  } else {
    return {
      title,
      description,
      slug,
      tags,
      image_name,
      image_url,
    };
  }
}

// * notionからブログデータを取得する関数
async function fetchBlogData() {
  const response = await notion.databases.query({
    database_id: notionBlogDatabaseId,
    filter: {
      property: 'Published',
      checkbox: {
        equals: true,
      }
    }
  });

  const pages = response.results;

  const detailedPages = await Promise.all(
    pages.map(async (page) => {
      const metadata = await getPageMetadata(page, true, 'blog');
      const pageDetails = await pageToMarkdown(page.id);
      return {
        ...metadata,
        content: pageDetails.markdown.parent,
      }
    })
  );

  return detailedPages;
};

// * 子データベースのページを取得する関数
async function fetchChildDatabasePages(databaseId) {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Published',
      checkbox: {
        equals: true,
      }
    }
  });
  const pages = response.results;
  const detailPages = await Promise.all(
    pages.map(async (page) => {
      const metadata = await getPageMetadata(page, false, 'learning');
      const pageDetails = await pageToMarkdown(page.id);
      return {
        ...metadata,
        content: pageDetails.markdown.parent,
      }
    })
  );
  return detailPages;
}

// * 入れ子になったデータベースを取得する関数
async function fetchNestedPages(pageId) {
  const response = await notion.blocks.children.list({ block_id: pageId });
  const childPages = response.results.filter((block) => block.type === 'child_database');
  const detailPages = await Promise.all(
    childPages.map(async (childPage) => {
      const childDatabasePages = await fetchChildDatabasePages(childPage.id);
      return childDatabasePages;
    })
  );
  return detailPages;
};

// * notionからラーニングデータを取得する関数
async function fetchLearningData() {
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

  const detailPages = await Promise.all(
    learnings.map(async (learning) => {
      const metadata = await getPageMetadata(learning, true, 'learning');
      const pageDetails = await pageToMarkdown(learning.id);
      const nestedPages = await fetchNestedPages(learning.id);
      return {
        ...metadata,
        content: pageDetails.markdown.parent,
        nestedPages,
      }
    })
  );
  return detailPages.flat();
}

// * notionからunpublishedデータを取得する関数
async function fetchBlogsUnpublishedData() {
  const response = await notion.databases.query({
    database_id: notionBlogDatabaseId,
    filter: {
      property: 'Published',
      checkbox: {
        equals: false,
      }
    }
  });
  return response.results.map((page) => page.properties.Slug.rich_text[0]?.plain_text);
};
async function fetchLearningsUnpublishedData() {
  const response = await notion.databases.query({
    database_id: notionLearningDatabaseId,
    filter: {
      property: 'Published',
      checkbox: {
        equals: false,
      }
    }
  });
  return response.results.map((page) => page.properties.Slug.rich_text[0]?.plain_text);
};

module.exports = { fetchBlogData, fetchLearningData, fetchBlogsUnpublishedData, fetchLearningsUnpublishedData };