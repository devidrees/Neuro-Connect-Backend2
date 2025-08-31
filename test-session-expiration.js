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

// Test session expiration
const testSessionExpiration = async () => {
  try {
    console.log('Testing session expiration functionality...\n');

    // Create a test session that expires in 1 minute
    const testSession = new Session({
      student: new mongoose.Types.ObjectId(),
      doctor: new mongoose.Types.ObjectId(),
      title: 'Test Session',
      description: 'This is a test session for expiration testing',
      preferredDateTime: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      duration: 1, // 1 minute duration
      status: 'approved'
    });

    await testSession.save();
    console.log('✅ Test session created:', testSession.title);
    console.log('   Preferred time:', testSession.preferredDateTime);
    console.log('   Duration:', testSession.duration, 'minutes');
    console.log('   End time:', testSession.endTime);
    console.log('   Status:', testSession.status);
    console.log('   Is expired:', testSession.isExpired());

    // Wait for 2 minutes to test expiration
    console.log('\n⏳ Waiting 2 minutes for session to expire...');
    await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));

    // Check if session is expired
    const updatedSession = await Session.findById(testSession._id);
    console.log('\n📊 Session after waiting:');
    console.log('   Status:', updatedSession.status);
    console.log('   Is expired:', updatedSession.isExpired());
    console.log('   Current time:', new Date());
    console.log('   End time:', updatedSession.endTime);

    // Test the endSession method
    console.log('\n🧪 Testing endSession method...');
    await updatedSession.endSession(
      'Great session! Student showed good progress.',
      5,
      'Student is ready for follow-up in 2 weeks.'
    );

    const finalSession = await Session.findById(testSession._id);
    console.log('✅ Session ended successfully:');
    console.log('   Status:', finalSession.status);
    console.log('   Session ended at:', finalSession.sessionEndedAt);
    console.log('   Feedback:', finalSession.finalFeedback);
    console.log('   Rating:', finalSession.sessionRating);
    console.log('   Notes:', finalSession.sessionNotes);

    // Clean up test data
    await Session.findByIdAndDelete(testSession._id);
    console.log('\n🧹 Test session cleaned up');

    console.log('\n🎉 All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the test
connectDB().then(() => {
  testSessionExpiration();
});
