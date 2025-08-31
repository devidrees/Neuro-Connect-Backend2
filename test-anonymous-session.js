import mongoose from 'mongoose';
import Session from './models/Session.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/neuroo');
    console.log('MongoDB connected successfully for testing');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test anonymous session creation
const testAnonymousSession = async () => {
  try {
    console.log('Testing anonymous session creation...\n');

    // Test 1: Anonymous session with custom name
    const session1 = new Session({
      student: new mongoose.Types.ObjectId(),
      doctor: new mongoose.Types.ObjectId(),
      title: 'Test Anonymous Session 1',
      description: 'This is a test anonymous session with custom name',
      isAnonymous: true,
      anonymousName: 'Test Student',
      preferredDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 60
    });

    await session1.save();
    console.log('✅ Test 1 passed: Anonymous session with custom name created');
    console.log('   Anonymous name:', session1.anonymousName);
    console.log('   End time:', session1.endTime);

    // Test 2: Anonymous session without custom name (should use default)
    const session2 = new Session({
      student: new mongoose.Types.ObjectId(),
      doctor: new mongoose.Types.ObjectId(),
      title: 'Test Anonymous Session 2',
      description: 'This is a test anonymous session without custom name',
      isAnonymous: true,
      preferredDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      duration: 45
    });

    // Use validation method
    session2.validateSessionData();
    await session2.save();
    
    console.log('✅ Test 2 passed: Anonymous session without custom name created');
    console.log('   Anonymous name:', session2.anonymousName);
    console.log('   End time:', session2.endTime);

    // Test 3: Regular session (not anonymous)
    const session3 = new Session({
      student: new mongoose.Types.ObjectId(),
      doctor: new mongoose.Types.ObjectId(),
      title: 'Test Regular Session',
      description: 'This is a test regular session',
      isAnonymous: false,
      preferredDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      duration: 90
    });

    await session3.save();
    console.log('✅ Test 3 passed: Regular session created');
    console.log('   End time:', session3.endTime);

    // Clean up test data
    await Session.findByIdAndDelete(session1._id);
    await Session.findByIdAndDelete(session2._id);
    await Session.findByIdAndDelete(session3._id);
    console.log('\n🧹 Test sessions cleaned up');

    console.log('\n🎉 All anonymous session tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the test
connectDB().then(() => {
  testAnonymousSession();
});
