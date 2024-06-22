const { Client } = require('@notionhq/client');
const fs = require('fs');

const notionToken = fs.existsSync(process.env.NOTION_TOKEN_FILE) ? fs.readFileSync(process.env.NOTION_TOKEN_FILE, 'utf8').trim() : process.env.NOTION_TOKEN;

const notion = new Client({
  auth: notionToken,
});

module.exports = notion;