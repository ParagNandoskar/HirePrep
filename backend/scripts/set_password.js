const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const mongoose = require('mongoose')

const User = require('../src/models/User')

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in .env')
    process.exit(1)
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    const email = 'test@gmail.com'
    const newPassword = 'Test@123'

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      console.error(`User with email ${email} not found`)
      process.exitCode = 1
      return
    }

    user.password = newPassword
    await user.save()

    console.log(`Password updated for ${email}`)
  } catch (err) {
    console.error('Error updating password:', err.message || err)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

run()
