import mongoose from 'mongoose';
import Session from './models/Session.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/neuroo');
    console.log('MongoDB connected successfully for migration');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migrate existing sessions
const migrateSessions = async () => {
  try {
    console.log('Starting session migration...\n');

    // Find all sessions that don't have endTime or duration
    const sessionsToMigrate = await Session.find({
      $or: [
        { endTime: { $exists: false } },
        { duration: { $exists: false } }
      ]
    });

    console.log(`Found ${sessionsToMigrate.length} sessions to migrate`);

    let migratedCount = 0;
    for (const session of sessionsToMigrate) {
      try {
        // Set default duration if missing
        if (!session.duration) {
          session.duration = 60; // Default to 60 minutes
          console.log(`  - Set duration to 60 minutes for session: ${session.title}`);
        }

        // Calculate endTime if missing
        if (!session.endTime && session.preferredDateTime) {
          const durationInMinutes = session.duration || 60;
          session.endTime = new Date(session.preferredDateTime.getTime() + (durationInMinutes * 60 * 1000));
          console.log(`  - Calculated endTime for session: ${session.title}`);
        }

        await session.save();
        migratedCount++;
      } catch (error) {
        console.error(`  - Error migrating session ${session.title}:`, error.message);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`📊 Migrated ${migratedCount} sessions`);
    console.log(`📊 Total sessions in database: ${await Session.countDocuments()}`);

    // Verify migration
    const remainingSessions = await Session.find({
      $or: [
        { endTime: { $exists: false } },
        { duration: { $exists: false } }
      ]
    });

    if (remainingSessions.length === 0) {
      console.log('✅ All sessions have been successfully migrated!');
    } else {
      console.log(`⚠️  ${remainingSessions.length} sessions still need migration`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the migration
connectDB().then(() => {
  migrateSessions();
});
