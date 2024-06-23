const express = require('express');
const cors = require('cors');

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