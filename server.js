const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const { fetchNotionData } = require('./services/notionService');
const { saveBlogToSupabaes } = require('./services/supabaseService');

// * notionデータをsupabaseに保存
async function syncData() {
  try {
    const notionData = await fetchNotionData();
    await saveBlogToSupabaes(notionData);
  } catch (error) {
    console.error('Error', error);
  }
};
// * データの同期をするにあたっての定期的なスケジュール
cron.schedule('0 * * * *', () => {
  console.log('Running data sync');
  syncData();
});

// * routerのインポート
const blogsRouter = require('./routes/blogs.router');
const learningsRouter = require('./routes/learnings.router');

// * exporessの初期設定
const app = express();
app.use(express.json(), express.urlencoded({ extended: true }), cors());

// * ルーターのマウント
app.use('/api/blogs', blogsRouter);
app.use('/api/learnings', learningsRouter);

// * アプリの起動
app.listen({ port: process.env.PORT || 8080 }, () => {
  console.log('Server is running');
});