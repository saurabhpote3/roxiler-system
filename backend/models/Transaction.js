const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  category: String,
  sold: Boolean,
  dateOfSale: String,
});

module.exports = mongoose.model('Transaction', transactionSchema);
