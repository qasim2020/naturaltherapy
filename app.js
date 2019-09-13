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
const Handlebars = require('handlebars');
const axios = require('axios');
const fs = require('fs');

const {serverRunning} = require('./js/serverRunning');
const {sheet} = require('./server/sheets.js');
const {Users} = require('./models/users');
const {SheetData} = require('./models/sheetData');
const {sendmail} = require('./js/sendmail');
const {Subscription} = require('./models/subscription');
const {mongoose} = require('./db/mongoose');
const {Contacted} = require('./models/contacted');


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
  let part = '', poppedItem = '', nobject = {}, iterate = 0, mainCount = 1, subCount = 1;

  let en = data;
  
  _.each(en,(v,i) => {

    if (!v[0] || i == 0) {
      part = en[i+1][0].replace(/ /g,'');
      nobject[part] = {};
      return;
    }
    switch (part) {
      case 'Documentation':
        if (!v[1]) return;
        let sortings = v.map((cV,index,arr) => {
          if (index == 0 && cV == 'Section') {
            subCount = 1;
            return {
              [arr[0].replace(/ /g,'')]: `${mainCount++}. ${arr[1]}`,
              type: arr[0].replace(/ /g,'')
            };
          }
          if (index == 0 && cV == 'Subsection') return {
            [arr[0].replace(/ /g,'')]: `${(9 + subCount++).toString(36)}. ${arr[1]}`,
            type: arr[0].replace(/ /g,'')
          };
          if (index == 1) return null;
          if (cV.indexOf('img:') != -1) return {image: cV.split('img:')[1]};
          return {para: cV};
        }).filter(cV => cV != null);
        console.log(sortings);
        nobject[part][iterate++] = sortings;
        break;
      default:
        poppedItem = v.shift().replace(/ /g,'');
        if (!v[0]) return;
        nobject[part][poppedItem] = v;
    }

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
  SheetData.findOne({status: 'live'}).lean().then(returned => {
    if (!returned) return Promise.reject('Did not find any "Live" data ! Either update website using admin portal or Contact Developer !');
    returned.en = {...returned.en,
      urdu_flag: 'inactive',
      nok_flag: 'inactive',
      eng_flag: 'active'
    }

    console.log(returned.en);
    res.status(200).render('home.hbs',returned.en);
  }).catch((e) => {
    res.status(400).render('error.hbs',{msg: e});
  });
})

app.get('/urdu',(req,res) => {
  SheetData.findOne({status: 'live'}).lean().then(returned => {
    if (!returned) return Promise.reject('Did not find any "Live" data ! Either update website using admin portal or Contact Developer !');
    returned.ur = {...returned.ur,
      urdu_flag: 'active',
      nok_flag: 'inactive',
      eng_flag: 'inactive'
    }
    res.status(200).render('home.hbs',returned.ur);
  }).catch((e) => {
    console.log(e);
    res.status(400).render('error.hbs',{msg: e});
  });
})

app.get('/nok',(req,res) => {
  SheetData.findOne({status: 'live'}).lean().then(returned => {
    if (!returned) return Promise.reject('Did not find any "Live" data ! Either update website using admin portal or Contact Developer !');
    returned.nok = {...returned.nok,
      urdu_flag: 'inactive',
      nok_flag: 'active',
      eng_flag: 'inactive'
    }
    res.status(200).render('home.hbs',returned.nok);
  }).catch((e) => {
    console.log(e);
    res.status(400).render('error.hbs',{msg: e});
  });
})

function create_email(email_data) {
  return new Promise(function(resolve, reject) {

    return fs.readFile('./views/email.hbs', function(err, data){
      if (!err) {
        var source = data.toString();
        var template = Handlebars.compile(source);
        var result = template(email_data);
        return resolve(result);
      } else {
        console.log(err);
        return reject(err);
      }
  });

  });
}

app.post('/contacted',(req,res) => {

  let contacted = new Contacted({
    browser_location: req.body.browser_location,
    msg: req.body.value
  });

  // return res.render('email.hbs',contacted);

  contacted.save().then(msg => {
    res.status(200).send('done');
    return create_email(contacted);
  }).then(response => {
    console.log('sending email now');
    sendmail('qasimali24@gmail.com',response,'New Message from website').then((msg) => console.log(msg));
  }).catch(e => {
    console.log(e);
    res.status(400).send(e);
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

app.get('/documentation',(req,res) => {
  SheetData.findOne({status: 'live'}).lean().then(returned => {
    if (!returned) return Promise.reject('Did not find stuff !');
    returned.en = {...returned.en,
      urdu_flag: 'inactive',
      nok_flag: 'inactive',
      eng_flag: 'active'
    }
    console.log(returned);
    res.status(200).render('documentation.hbs',returned.en);
  }).catch((e) => {
    res.status(400).render('error.hbs',{msg: e});
  });
})

serverRunning();

module.exports = {app, http, Users, SheetData, Contacted};
