require('./config/config');

const http = require('http');
const reload = require('reload');
const express = require('express');
const pjax    = require('express-pjax');
const session = require('express-session');
const bodyParser = require('body-parser');
const hbs = require('hbs');
const _ = require('lodash');
const axios = require('axios');

const {serverRunning} = require('./js/serverRunning');
const {sheet} = require('./server/sheets.js');

var app = express();
var port = process.env.PORT || 3000;
app.use(pjax());
app.use(express.static(__dirname+'/static'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(session({
  secret: 'oasdfkljh2j3lgh123ljkhl12kjh3',
  resave: false,
  saveUninitialized: true,
}))
hbs.registerPartials(__dirname + '/views/partials');
app.set('view engine','hbs');

hbs.registerHelper("inc", function(value, options) {
    return parseInt(value) + 1;
});

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
      // console.log(data.LandingPage.Logo[0]);
      res.status(200).render('home.hbs',data);
  }).catch(e => console.log(e));
})

app.get('/',(req,res) => {
  res.render('home.hbs');
})

app.get('/admin',(req,res) => {
  res.render('admin.hbs');
})

serverRunning();

app.set('port', process.env.PORT || 3000);
var server = http.createServer(app);

// Reload code here
reload(app).then(function (reloadReturned) {
  server.listen(app.get('port'), function () {
    console.log('Web server listening on port ' + app.get('port'))
  })
}).catch(function (err) {
  console.error('Reload could not start, could not start server/sample app', err);
});
