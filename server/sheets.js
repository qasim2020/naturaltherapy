
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const _ = require('lodash');
const axios = require('axios');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

let sheets = {
  bunkers: '1hTznrKNzJDImMyHuEg3yiktJf2nWfB8N0OWIjxu6uJ0',
  external: '1-ViuHnzTD-6OpRC7nnfj2BzQxMKthfmCAyzGwSGRceU',
  construction: '1-ViuHnzTD-6OpRC7nnfj2BzQxMKthfmCAyzGwSGRceU',
  material: '10f4xlmbpb_1Lu8raDjk5ofxBZA1REIOZzUilm_lMzIs',
  old: '15TGQS6gj_sZb0HkvvlwACL6YsuPxlgcvJb0xnyAoPw0',
  oldformatted: '1Eb8K8-Ksy-DnDTD0FIRyhNsJTaKGgYuhk50bD7axUfw',
  naturaltherapy: '1safZxL4wCjQMh6JJxJCE6t--PPd2SdtD3nlgxu5crFQ'
};

function sheet(name,type,values) {
  return new Promise((resolve, reject) => {
    fs.readFile('config/credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      let data = {
        content: JSON.parse(content),
        values: values,
        sheet: sheets[`${name}`]
      };
      if (type == 'read') return resolve(authorize(data, readSheet));
      if (type == 'update') return resolve(authorize(data,updateSheet));
      if (type == 'batchUpdate') return resolve(authorize(data,batchUpdateSheet));
      if (type == 'todayUpdates') return resolve(authorize(data,todayUpdates));
    });
  });
}

function readSheet(auth, value) {
  return new Promise((resolve,reject) => {
    const sheets = google.sheets({version: 'v4', auth});
    var request = {
      spreadsheetId: value.sheet,
      ranges: ['English!1:1000','Urdu!1:1000','Norsk!1:1000'],
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    };

    sheets.spreadsheets.values.batchGet(request, function(err, response) {
      if (err) {
        console.error(err);
        return reject(err);
      }
      return resolve(response.data.valueRanges);
    });
  });
};

function todayUpdates(auth, value) {
  return new Promise((resolve,reject) => {
    const sheets = google.sheets({version: 'v4', auth});
    var request = {
    spreadsheetId: value.sheet,
    ranges: ['Sheet2!A1:J','Sheet2!G2:G'],
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  };

  sheets.spreadsheets.values.batchGet(request, function(err, response) {
    if (err) {
      console.error(err);
      reject(err);
    }
    resolve(response.data.valueRanges);
  });
  });
};

function authorize(credentials, callback) {
  return new Promise((resolve,reject) => {
    const {client_secret, client_id, redirect_uris} = credentials.content.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getNewToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      return resolve(callback(oAuth2Client,credentials));
    });
  });
};

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
};

function updateSheet(auth,value) {
  return new Promise((resolve,reject) => {
    const sheets = google.sheets({version: 'v4', auth});
    console.log(value.values);
    let values = value.values;
    const resource = {
      values,
    };
    sheets.spreadsheets.values.append({
      spreadsheetId: value.sheet,
      range: "Sheet2!A:Z",
      valueInputOption: "RAW",
      resource,
    }, (err, res) => {
      if (err) return reject('The API returned an error: ' + err);
      resolve(res.data);
    });
  });
};

function batchUpdateSheet(auth,value) {
  return new Promise((resolve,reject) => {
    const sheets = google.sheets({version: 'v4', auth});
    let values = value.values;
    const resource = {
      data: [
        {
          "range":"Sheet1!A2:Z2000",
          values,
        }
      ],
      valueInputOption: 'RAW',
    };
    sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: value.sheet,
      resource,
    }, (err, res) => {
      if (err) return reject('The batchUpdate API returned an error: ' + err);
      return resolve(res.data);
    });
  });
};

module.exports = {sheet}
