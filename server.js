const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const { fetchBlogData, fetchLearningData, fetchBlogsUnpublishedData, fetchLearningsUnpublishedData } = require('./services/notionService');
const { saveBlogToSupabaes, saveLearningToSupabase, deleteBlogsFromSupabase, deleteLearningsFromSupabase } = require('./services/supabaseService');

// * notionデータをsupabaseに保存
async function syncData() {
  try {
    const notionBlogsData = await fetchBlogData();
    await saveBlogToSupabaes(notionBlogsData);

    const notionLearningsData = await fetchLearningData();
    await saveLearningToSupabase(notionLearningsData);

    const unpublishedBlogs = await fetchBlogsUnpublishedData();
    if (unpublishedBlogs.length > 0) {
      await deleteBlogsFromSupabase(unpublishedBlogs);
    }
    const unpublishedLearnings = await fetchLearningsUnpublishedData();
    if (unpublishedLearnings.length > 0) {
      await deleteLearningsFromSupabase(unpublishedLearnings);
    }
  } catch (error) {
    console.error('Error', error);
  }
};

// syncData();

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