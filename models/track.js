const mongoose = require('mongoose')

const schema = mongoose.Schema({
  timestamp: Date,
  images: [String] // Base64
})

module.exports = mongoose.model('Track', schema)
