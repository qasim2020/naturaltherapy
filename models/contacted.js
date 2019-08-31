const mongoose = require('mongoose');

var Contacted = mongoose.Schema({
  msg: {
    type: String,
    required: true,
  },
  browser_location: {
    type: Object,
    required: true
  }
});

var Contacted = mongoose.model('Contacted',Contacted);

module.exports = {Contacted};
