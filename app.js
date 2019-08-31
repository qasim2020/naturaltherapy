require('./config/config');

const http = require('http');
const reload = require('reload');
const express = require('express');
const pjax    = require('express-pjax');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const bodyParser = require('body-parser');
const hbs = require('hbs');
const _ = require('lodash');
const axios = require('axios');

const {serverRunning} = require('./js/serverRunning');
const {sheet} = require('./server/sheets.js');
const {Users} = require('./models/users');
const {SheetData} = require('./models/sheetData');
const {sendmail} = require('./js/sendmail');
const {Subscription} = require('./models/subscription');
const {mongoose} = require('./db/mongoose');


var app = express();
var port = process.env.PORT || 3000;
app.use(pjax());
app.use(express.static(__dirname+'/static'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
}));

hbs.registerPartials(__dirname + '/views/partials');
app.set('view engine','hbs');

hbs.registerHelper("inc", function(value, options) {
    return parseInt(value) + 1;
});

let authenticate = (req,res,next) => {
  let token = req.params.token || req.body.token || req.query.token;
  Users.findByToken(token).then((user) => {
    if (!user) return Promise.reject('No user found for token :', token);
    req.params.user = user;
    next();
  }).catch((e) => {
    console.log(e);
    req.url = '/';
    return app._router.handle(req, res, next);
  });
};

let convertGoogleData = function(data) {
  let part = '', poppedItem = '', nobject = {};
  let en = data;
  _.each(en,(v,i) => {
    if (!v[0] || i == 0) {
      part = en[i+1][0].replace(/ /g,'');
      nobject[part] = {};
      return;
    }
    poppedItem = v.shift().replace(/ /g,'');
    if (!v[0]) return;
    nobject[part][poppedItem] = v;
  })
  return nobject;
}

app.get('/publish',(req,res) => {
  sheet('naturaltherapy','read').then(msg => {
      let data = convertGoogleData(msg[0].values);
      console.log(JSON.stringify(data, 0, 2));
      res.status(200).render('home.hbs',data);
  }).catch(e => console.log(e));
})

app.get('/',(req,res) => {
  SheetData.findOne({status: 'live'}).then(returned => {
    if (!returned) return Promise.reject('Did not find any "Live" data ! Either update website using admin portal or Contact Developer !');
    res.status(200).render('home.hbs',returned.en);
  }).catch((e) => {
    console.log(e);
    res.status(400).render('error.hbs',{msg: e});
  });
})

app.get('/login',(req,res) => {
  res.status(200).render('login.hbs');
})

app.get('/signup_request',(req,res) => {

  console.log('signup request',process.env.Admin_Password);
  let user = new Users({
    email: req.query.email,
    password: process.env.Admin_Password
  });
  user.save().then(msg => {
    res.status(200).send('Password and email has been stored')
  }).catch(e => {
    console.log(e);
    res.status(404).send(e);
  });
})

app.post('/login_request',(req,res) => {
  console.log('request made');
  var user = _.pick(req.body,['password']);
  user.email = "y-asmin60@outlook.com";
  // console.log(user);
  Users.findByCredentials(user.email, user.password).then((returned) => {
    console.log('returned');
    if (!returned) return Promise.reject('Wrong password !')
    return returned.generateAuthToken(req);
  }).then((user) => {
    if (!user) return Promise.reject('Failed to generate token ! Kindly contact the developer !');
    return res.status(200).send(user.tokens[0].token);
  }).catch((e) => {
    console.log(e);
    res.status(404).send(e);
  });
})

app.get('/admin', authenticate,(req,res) => {

  res.render('admin.hbs',{
    google_link: process.env.google_link,
    token: req.query.token
  });
})

app.post('/fetch_google_sheet', authenticate, (req,res) => {

  sheet('naturaltherapy','read').then(msg => {

      let sheetData = new SheetData({
        en: convertGoogleData(msg[0].values),
        ur: convertGoogleData(msg[1].values),
        nok: convertGoogleData(msg[2].values),
        status: 'pending'
      });
      return sheetData.save();
    }).then(returned => {
      res.status(200).send(returned._id.toString());
    }).catch(e => {
    console.log(e);
    res.status(400).send(e);
  });

})

app.get('/draft_site', authenticate, (req,res) => {

  SheetData.findById(mongoose.Types.ObjectId(req.query.sheetId)).then(returned => {
    if (!returned) return Promise.reject('Data not found ! Contact Developer !');
    res.status(200).render('home.hbs',returned.en);
  }).catch((e) => {
    console.log(e);
    res.status(400).render('error.hbs',e.msg);
  });
})

app.post('/deploy_request', authenticate, async (req,res) => {

  SheetData.updateMany({status: 'live'},{$set:{status: 'took_offline'}}).then(oldSheet => {
    return SheetData.findOneAndUpdate({_id: mongoose.Types.ObjectId(req.body.sheetId)},{$set: {status: 'live'}});
  }).then(returned => {
    if (!returned) return Promise.reject('Sheet not found ! Please restart from step 2 (Fetch Google Sheet) !');
    res.status(200).send('done');
  }).catch(e => {
    console.log(e);
    res.status(400).send(e);
  });
})

serverRunning();

module.exports = {app, http, Users, SheetData};
