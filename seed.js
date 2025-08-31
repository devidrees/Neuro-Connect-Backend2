import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Post from './models/Post.js';
import Session from './models/Session.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/neuroo');
    console.log('MongoDB connected successfully for seeding');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Post.deleteMany({});
    await Session.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = new User({
      name: 'Idrees Admin',
      email: 'idrees@gmail.com',
      password: 'admin@123',
      role: 'admin',
      isActive: true,
      verificationStatus: 'approved'
    });
    await adminUser.save();
    console.log('Admin user created:', adminUser.email);

    // Create doctors
    const doctors = [
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@neuroconnect.com',
        password: 'doctor123',
        role: 'doctor',
        specialization: 'Clinical Psychology',
        qualifications: 'Ph.D. in Clinical Psychology, Licensed Clinical Psychologist',
        experience: 8,
        licenseNumber: 'PSY-001234',
        isActive: true,
        verificationStatus: 'approved',
        verificationDate: new Date(),
        verifiedBy: adminUser._id
      },
      {
        name: 'Dr. Michael Chen',
        email: 'michael.chen@neuroconnect.com',
        password: 'doctor123',
        role: 'doctor',
        specialization: 'Psychiatry',
        qualifications: 'M.D. in Psychiatry, Board Certified Psychiatrist',
        experience: 12,
        licenseNumber: 'PSY-005678',
        isActive: true,
        verificationStatus: 'approved',
        verificationDate: new Date(),
        verifiedBy: adminUser._id
      },
      {
        name: 'Dr. Emily Rodriguez',
        email: 'emily.rodriguez@neuroconnect.com',
        password: 'doctor123',
        role: 'doctor',
        specialization: 'Child Psychology',
        qualifications: 'Ph.D. in Child Psychology, Licensed Child Psychologist',
        experience: 6,
        licenseNumber: 'PSY-009012',
        isActive: true,
        verificationStatus: 'approved',
        verificationDate: new Date(),
        verifiedBy: adminUser._id
      },
      {
        name: 'Dr. James Wilson',
        email: 'james.wilson@neuroconnect.com',
        password: 'doctor123',
        role: 'doctor',
        specialization: 'Cognitive Behavioral Therapy',
        qualifications: 'Ph.D. in Clinical Psychology, CBT Specialist',
        experience: 10,
        licenseNumber: 'PSY-003456',
        isActive: true,
        verificationStatus: 'approved',
        verificationDate: new Date(),
        verifiedBy: adminUser._id
      },
      {
        name: 'Dr. Lisa Thompson',
        email: 'lisa.thompson@neuroconnect.com',
        password: 'doctor123',
        role: 'doctor',
        specialization: 'Trauma Therapy',
        qualifications: 'Ph.D. in Clinical Psychology, Trauma Specialist',
        experience: 9,
        licenseNumber: 'PSY-007890',
        isActive: true,
        verificationStatus: 'approved',
        verificationDate: new Date(),
        verifiedBy: adminUser._id
      }
    ];

    const savedDoctors = [];
    for (const doctorData of doctors) {
      const doctor = new User(doctorData);
      await doctor.save();
      savedDoctors.push(doctor);
      console.log('Doctor created:', doctor.name);
    }

    // Create some sample students
    const students = [
      {
        name: 'Alex Smith',
        email: 'alex.smith@student.com',
        password: 'student123',
        role: 'student'
      },
      {
        name: 'Maria Garcia',
        email: 'maria.garcia@student.com',
        password: 'student123',
        role: 'student'
      },
      {
        name: 'David Kim',
        email: 'david.kim@student.com',
        password: 'student123',
        role: 'student'
      }
    ];

    const savedStudents = [];
    for (const studentData of students) {
      const student = new User(studentData);
      await student.save();
      savedStudents.push(student);
      console.log('Student created:', student.name);
    }

    // Create posts
    const posts = [
      {
        title: 'Understanding Anxiety: A Comprehensive Guide',
        content: `Anxiety is a natural response to stress, but when it becomes overwhelming, it can significantly impact daily life. This guide explores the different types of anxiety, common symptoms, and effective coping strategies.

Key points covered:
• Types of anxiety disorders
• Common symptoms and triggers
• Professional treatment options
• Self-help techniques and lifestyle changes
• When to seek professional help

Remember, anxiety is treatable, and seeking help is a sign of strength, not weakness.`,
        author: adminUser._id,
        category: 'awareness',
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop'
      },
      {
        title: 'Daily Mental Health Tips for Students',
        content: `Being a student can be challenging, with academic pressure, social dynamics, and personal growth all happening simultaneously. Here are some practical tips to maintain good mental health during your academic journey:

1. **Establish a Routine**: Create a consistent daily schedule that includes study time, breaks, and self-care activities.

2. **Practice Mindfulness**: Take 5-10 minutes daily for meditation or deep breathing exercises.

3. **Stay Connected**: Maintain relationships with friends and family, even when busy with studies.

4. **Get Adequate Sleep**: Aim for 7-9 hours of quality sleep each night.

5. **Exercise Regularly**: Physical activity releases endorphins and reduces stress.

6. **Set Realistic Goals**: Break large tasks into smaller, manageable steps.

7. **Seek Support**: Don't hesitate to reach out to counselors or mental health professionals when needed.

Remember, your mental health is just as important as your academic success!`,
        author: savedDoctors[0]._id,
        category: 'tips',
        image: 'https://images.unsplash.com/photo-1523240798131-1133aae28954?w=800&h=600&fit=crop'
      },
      {
        title: 'The Science Behind Depression: What You Need to Know',
        content: `Depression is more than just feeling sad - it's a complex mental health condition that affects millions of people worldwide. Understanding the science behind depression can help reduce stigma and encourage people to seek help.

**Biological Factors:**
• Neurotransmitter imbalances (serotonin, norepinephrine, dopamine)
• Genetic predisposition
• Brain structure and function changes
• Hormonal imbalances

**Environmental Factors:**
• Stressful life events
• Trauma or abuse
• Chronic illness
• Social isolation

**Treatment Approaches:**
• Psychotherapy (CBT, DBT, psychodynamic therapy)
• Medication (antidepressants)
• Lifestyle modifications
• Support groups and peer support

Early intervention is crucial for better outcomes. If you or someone you know is experiencing symptoms of depression, professional help is available and effective.`,
        author: savedDoctors[1]._id,
        category: 'article',
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop'
      },
      {
        title: 'Building Resilience: How to Bounce Back from Life\'s Challenges',
        content: `Resilience is the ability to adapt and recover from difficult situations. It's not about avoiding stress or hardship, but about developing the skills to navigate through them effectively.

**Key Components of Resilience:**
• **Self-awareness**: Understanding your emotions and reactions
• **Optimism**: Maintaining hope and positive outlook
• **Problem-solving**: Developing effective coping strategies
• **Social support**: Building strong relationships
• **Purpose**: Having meaningful goals and values

**Practical Strategies:**
1. Practice gratitude daily
2. Develop healthy coping mechanisms
3. Build a support network
4. Learn from past experiences
5. Maintain physical health
6. Practice mindfulness and meditation

Remember, resilience is a skill that can be developed and strengthened over time. Every challenge you overcome makes you stronger for the next one.`,
        author: savedDoctors[2]._id,
        category: 'tips',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'
      },
      {
        title: 'Breaking the Stigma: Mental Health in the Modern World',
        content: `Despite significant progress in understanding mental health, stigma remains a major barrier to people seeking help. This article explores the current state of mental health awareness and what we can do to create a more supportive society.

**Current Challenges:**
• Misconceptions about mental illness
• Fear of judgment and discrimination
• Lack of understanding about treatment options
• Cultural and generational barriers

**What We Can Do:**
• Educate ourselves and others about mental health
• Use respectful and accurate language
• Share personal experiences when comfortable
• Support mental health initiatives and organizations
• Challenge stereotypes and misconceptions

**Signs of Progress:**
• Increased public awareness campaigns
• Better representation in media
• Improved workplace mental health policies
• Growing acceptance of therapy and counseling

Together, we can create a world where mental health is treated with the same importance as physical health.`,
        author: adminUser._id,
        category: 'awareness',
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop'
      }
    ];

    for (const postData of posts) {
      const post = new Post(postData);
      await post.save();
      console.log('Post created:', post.title);
    }

    // Create sample sessions
    const sessions = [
      {
        student: savedStudents[0]._id,
        doctor: savedDoctors[0]._id,
        title: 'Anxiety Management Session',
        description: 'I\'ve been experiencing increased anxiety during exams and need help developing coping strategies.',
        isAnonymous: false,
        preferredDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        duration: 60,
        status: 'approved'
      },
      {
        student: savedStudents[1]._id,
        doctor: savedDoctors[1]._id,
        title: 'Stress and Academic Pressure',
        description: 'Feeling overwhelmed with coursework and need guidance on stress management.',
        isAnonymous: true,
        anonymousName: 'Stressed Student',
        preferredDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        duration: 45,
        status: 'pending'
      },
      {
        student: savedStudents[2]._id,
        doctor: savedDoctors[2]._id,
        title: 'Building Self-Confidence',
        description: 'Struggling with low self-esteem and need help building confidence.',
        isAnonymous: false,
        preferredDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago (expired)
        duration: 60,
        status: 'approved'
      }
    ];

    for (const sessionData of sessions) {
      const session = new Session(sessionData);
      await session.save();
      console.log('Session created:', session.title);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log(`📊 Created ${savedDoctors.length} doctors`);
    console.log(`📊 Created ${savedStudents.length} students`);
    console.log(`📊 Created ${posts.length} posts`);
    console.log(`📊 Created ${sessions.length} sessions`);
    console.log(`👑 Admin user: idrees@gmail.com / admin@123`);
    console.log(`👨‍⚕️ Doctor users: doctor123 (for all doctors)`);
    console.log(`👨‍🎓 Student users: student123 (for all students)`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seed
connectDB().then(() => {
  seedData();
});
