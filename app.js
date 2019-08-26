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

sheet('naturaltherapy','read').then(msg => {
  // console.log(msg[0].values);
  let myobject = {}, part = '';
  let en = msg[0].values;

  _.each(en,(v,i) => {
    if (!v) {
      return part = v[i+1];
    }
    myobject[part][v[0]] = v.shift();
  })
  console.log(myobject);
}).catch(e => console.log(e));

app.get('/publish',(req,res) => {

  sheet('naturaltherapy','read').then(msg => {
    // console.log(msg[0].values);
    let en = msg[0].values;

    _.each(en,(v,i) => {
      if (!v) {
        part = v[i+1];
      }
      myobject[part][v[0]] = v.shift();
    })

    // myobject = {
    //   landingpage: {
    //     logo: en[2][1],
    //     booking: {
    //       line1: en[3][1],
    //       line2: en[3][2],
    //       line3: en[3][3]
    //     },
    //     welcome: {
    //       line1: en[4][1],
    //       line2: en[4][2],
    //       line3: en[4][3]
    //     },
    //     photocredits: en[5][1]
    //   },
    //   servicespage: {
    //     heading: en[8][1],
    //     service1: {
    //       line1: en[9][1],
    //       line2: en[9][2],
    //       line3: en[9][3]
    //     },
    //     service2: {
    //       line1: en[10][1],
    //       line2: en[10][2],
    //       line3: en[10][3]
    //     },
    //     service3: {
    //       line1: en[11][1],
    //       line2: en[11][2],
    //       line3: en[11][3]
    //     },
    //   }
    // };
    console.log(myobject);
    res.render('home.hbs',{myobject});
  }).catch(e => {
    res.status(404).send(e);
  });
})

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
