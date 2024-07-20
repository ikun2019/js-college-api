const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');

const { fetchBlogData, fetchLearningData, fetchBlogsUnpublishedData, fetchLearningsUnpublishedData } = require('./services/notionService');
const { saveBlogToSupabaes, saveLearningToSupabase, deleteBlogsFromSupabase, deleteLearningsFromSupabase } = require('./services/supabaseService');

const port = fs.existsSync(process.env.PORT_FILE) ? fs.readFileSync(process.env.PORT_FILE, 'utf8').trim() : process.env.PORT;

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

syncData();

// * データの同期をするにあたっての定期的なスケジュール
cron.schedule('0 * * * *', async () => {
  console.log('Running data sync');
  await syncData();
});

// * routerのインポート
const blogsRouter = require('./routes/blogs.router');
const learningsRouter = require('./routes/learnings.router');
const authRouter = require('./routes/auth.router');

// * exporessの初期設定
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// * CORSの設定
const allowOrigins = ['https://js-college.net', 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowOrigins.indexOf(origin) === -1) {
      const msg = 'The Cors policy does not allow.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// * ルーターのマウント
app.use('/api/blogs', blogsRouter);
app.use('/api/learnings', learningsRouter);
app.use('/api/auth', authRouter);

// * アプリの起動
app.listen({ port: port || 8080 }, () => {
  console.log('Server is running');
});