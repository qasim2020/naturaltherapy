require('../config/config');

const express = require('express');
const request = require('supertest');
const session = require('supertest-session');
const _ = require('lodash');
const {app,mongoose,People,Orders,CurrencyRates,Users,axios} = require('../app.js');
const {zeroiseDB} = require('./zeroiseDB');
const {getStripeToken} = require('./getStripeToken');

beforeEach(() => {
  testSession = session(app);
});

describe('Open pages just fine', () => {

  var currencySession = session(app);

  test('Should put people in due ids', async() => {
    await zeroiseDB();
    await currencySession.post('/signing').set('Accept',`${process.env.test_call}`).send({
      query: 'update-due',
      type: 'push',
      due: "5d477e1b006cfdef99932bbe",
    }).expect(200)
  })

})
