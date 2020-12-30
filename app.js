const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require("body-parser");


const Pretreatment = require("./middleware/Pretreatment");


const indexRouter = require('./routes/index');
const userRouter = require('./routes/user');
const collectionRouter = require("./routes/collection");
const myRouter = require("./routes/my");
const rankRouter = require("./routes/ranking");
const authRouter = require("./routes/auth");
const gameRouter = require("./routes/game");

let app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));

app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({limit: "10mb", extended: false}));
app.use(bodyParser.json({limit: "10mb"}));

const multer = require('multer');
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, './tmp/profile')
    },
    filename(req, file, cb){
      let ext = path.extname(file.originalname);
      cb(null, path.basename(file.originalname, ext) + new Date().valueOf() + ext);
    }
  })
});
app.post('/user/profile_image', upload.single('img'), async (req, res, next) => {
  next();
});

app.use(Pretreatment);  // pre user search





app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/coll', collectionRouter);
app.use("/my", myRouter);
app.use("/rank", rankRouter);
app.use("/game", gameRouter);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
//
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
