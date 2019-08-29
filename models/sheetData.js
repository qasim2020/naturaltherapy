const mongoose = require('mongoose');

var SheetData = mongoose.Schema({
  en: {
    type: Object
  },
  ur: {
    type: Object
  },
  nok: {
    type: Object
  },
  status: {
    type: String
  }
});

var SheetData = mongoose.model('SheetData',SheetData);

module.exports = {SheetData};
