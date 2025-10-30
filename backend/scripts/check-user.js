const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    const user = await User.findOne({ email: 'employee@gmail.com' });
    if (user) {
      console.log('✅ User found:');
      console.log('   ID:', user._id);
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   First Name:', user.firstName);
      console.log('   Last Name:', user.lastName);
      console.log('   Created At:', user.createdAt);
    } else {
      console.log('❌ User not found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkUser();