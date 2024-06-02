const express = require('express');
const cors = require('cors');

// * routerのインポート
const blogsRouter = require('./routes/blogs.router');

// * exporessの初期設定
const app = express();
app.use(express.json(), express.urlencoded({ extended: true }), cors());

// * ルーターのマウント
app.use('/api/blogs', blogsRouter);

// * アプリの起動
app.listen({ port: process.env.PORT }, () => {
  console.log('Server is running');
});