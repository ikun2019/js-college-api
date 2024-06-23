const fs = require('fs');

const notion = require('../lib/notionAPI');

const notionLearningDatabaseId = fs.existsSync(process.env.NOTION_LEARNING_DATABASE_ID_FILE) ? fs.readFileSync(process.env.NOTION_LEARNING_DATABASE_ID, 'utf8').trim() : process.env.NOTION_LEARNING_DATABASE_ID;

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
    res.status(200).json(metadatas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error' });
  }
};