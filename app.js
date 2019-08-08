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

app.get('/',(req,res) => {
  res.render('home.hbs');
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
