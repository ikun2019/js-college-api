const express = require('express');
const cors = require('cors');
const fs = require('fs');

const port = fs.existsSync(process.env.PORT_FILE) ? fs.readFileSync(process.env.PORT_FILE, 'utf8').trim() : process.env.PORT;

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