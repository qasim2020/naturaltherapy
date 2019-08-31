require('../config/config');

const express = require('express');
const request = require('supertest');
const session = require('supertest-session');
const _ = require('lodash');
const {app,mongoose,People,Orders,CurrencyRates,Users,axios, SheetData} = require('../app.js');

beforeEach(() => {
  // testSession = session(app);
});

describe('Open pages just fine', () => {

  var currencySession = session(app);

  test('Should sign up user', async() => {
    await Users.find().deleteMany();
    await currencySession.get('/signup_request?email=y-asmin60@outlook.com').set('Accept',`${process.env.test_call}`).send({

    }).expect(200);
  })

  test('Should log in with correct password fine', async() => {
    await currencySession.post('/login_request').set('Accept',`${process.env.test_call}`).send({
      password: '12341234'
    }).expect(msg => {
      expect(msg.text.length).toBe(171);
      currencySession.token = msg.text;
    }).expect(200);
  })

  test('Should authenticate admin page fine', async() => {
    await currencySession.get('/admin').set('Accept',`${process.env.test_call}`).send({
      token: currencySession.token,
    }).expect(200);
  })

  test('Should not authenticate admin page', async() => {
    await currencySession.get('/admin').set('Accept',`${process.env.test_call}`).send({
      token: currencySession.token + '010',
    }).expect(301);
  })

  test('Should fetch google sheet data fine', async() => {
    await SheetData.find().deleteMany();
    await currencySession.post('/fetch_google_sheet').set('Accept',`${process.env.test_call}`).send({
      token: currencySession.token,
    }).expect(msg => {
      expect(msg.text).not.toBe();
      currencySession.sheetId = msg.text;
    }).expect(200);
  })

  test('Should fetch this google sheet id data as draft website', async() => {
    await currencySession.get(`/draft_site?token=${currencySession.token}&sheetId=${currencySession.sheetId}`).set('Accept',`${process.env.test_call}`).expect(200);
  })

  test('Should change status to pending of all live sheets before updating next to live', async() => {
    await currencySession.post('/deploy_request').set('Accept',`${process.env.test_call}`).send({
      token: currencySession.token,
      sheetId: currencySession.sheetId,
    }).expect(200);
    console.log('deployment completed');
    await currencySession.post('/fetch_google_sheet').set('Accept',`${process.env.test_call}`).send({
      token: currencySession.token,
    }).expect(msg => {
      expect(msg.text).not.toBe();
      currencySession.sheetId = msg.text;
    }).expect(200);
    console.log('fetched new completed');
    await currencySession.post('/deploy_request').set('Accept',`${process.env.test_call}`).send({
      token: currencySession.token,
      sheetId: currencySession.sheetId,
    }).expect(200);
    console.log('deployment completed 2');
  })

})
