const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

var SheetData = mongoose.Schema({
  en: {
    type: Object
  },
  ur: {
    type: Object
  },
  nok: {
    type: Object
  }
});

var SheetData = mongoose.model('SheetData',SheetData);

module.exports = {SheetData};
