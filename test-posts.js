import mongoose from 'mongoose';
import Post from './models/Post.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const testPosts = async () => {
  try {
    await connectDB();
    
    // Count all posts
    const totalPosts = await Post.countDocuments();
    console.log('Total posts in database:', totalPosts);
    
    // Get a few posts
    const posts = await Post.find().limit(5).populate('author', 'name email');
    console.log('Sample posts:', posts.map(p => ({
      id: p._id,
      title: p.title,
      author: p.author?.name || 'Unknown',
      isActive: p.isActive,
      createdAt: p.createdAt
    })));
    
    // Check posts by status
    const publishedPosts = await Post.countDocuments({ isActive: true });
    const draftPosts = await Post.countDocuments({ isActive: false });
    console.log('Published posts:', publishedPosts);
    console.log('Draft posts:', draftPosts);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error testing posts:', error);
    mongoose.connection.close();
  }
};

testPosts();
