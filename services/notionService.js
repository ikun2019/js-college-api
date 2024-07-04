const { NotionToMarkdown } = require('notion-to-md');
const notion = require('../lib/notionAPI');

const fs = require('fs');

const notionDatabaseId = fs.existsSync(process.env.NOTION_DATABASE_ID_FILE) ? fs.readFileSync(process.env.NOTION_DATABASE_ID_FILE, 'utf8').trim() : process.env.NOTION_DATABASE_ID;
const n2m = new NotionToMarkdown({ notionClient: notion });

// * notionをmarkdownにする関数
async function pageToMarkdown(pageId) {
  const mdBlock = await n2m.pageToMarkdown(pageId);
  const mdString = n2m.toMarkdownString(mdBlock);
  return {
    markdown: mdString,
  }
}

// * pageのメタデータを取得する関数
async function getPageMetadata(page) {
  const getTags = (tags) => {
    return tags.map((tag) => tag.name).join(',');
  }
  return {
    title: page.properties.Title.title[0]?.plain_text || '',
    description: page.properties.Description.rich_text[0]?.plain_text || '',
    slug: page.properties.Slug.rich_text[0]?.plain_text || '',
    tags: getTags(page.properties.Tags.multi_select),
    image_name: page.properties.Image.files[0].name || null,
    image_url: page.properties.Image.files[0].file.url || null,
  };
}

// * notionからブログデータを取得する関数
async function fetchNotionData() {
  const response = await notion.databases.query({
    database_id: notionDatabaseId,
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
      const metadata = await getPageMetadata(page);
      const pageDetails = await pageToMarkdown(page.id);
      return {
        ...metadata,
        content: pageDetails.markdown.parent,
      }
    })
  );

  console.log('DETAILED PAGES =>', detailedPages);

  return detailedPages;
};

module.exports = { fetchNotionData };