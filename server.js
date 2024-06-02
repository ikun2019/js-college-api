const express = require('express');
const cors = require('cors');

// * exporessの初期設定
const app = express();
app.use(express.json(), express.urlencoded({ extended: true }), cors());

// * ルーティング
app.get('/', (req, res) => {
  res.send('Hello');
});

// * アプリの起動
app.listen({ port: process.env.PORT }, () => {
  console.log('Server is running');
});