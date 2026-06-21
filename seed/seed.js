require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const Session = require('../src/models/Session');
const Notification = require('../src/models/Notification');
const Review = require('../src/models/Review');
const Match = require('../src/models/Match');

const SEED_PASSWORD = 'BrainX2024!';

const DEMO_USERS = [
  {
    fullName: 'Admin User',
    email: 'admin@brainx.com',
    bio: 'System Administrator',
    location: 'System',
    languages: ['English'],
    skillsCanTeach: [],
    skillsWantToLearn: [],
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=ef4444&color=fff',
    isVerified: true,
    isAdmin: true,
  },
  {
    fullName: 'Rema',
    email: 'rema@brainx.app',
    bio: 'Frontend developer passionate about building beautiful web apps. I love sharing my knowledge of React and JavaScript while learning new creative skills.',
    location: 'Algiers, Algeria',
    languages: ['English', 'French', 'Arabic'],
    skillsCanTeach: ['JavaScript', 'React', 'Python', 'Cooking'],
    skillsWantToLearn: ['Guitar', 'Spanish', 'Photography'],
    avatar: 'https://i.pravatar.cc/400?img=5',
    isVerified: true,
    ratingAverage: 4.9,
    ratingCount: 2,
    completedExchanges: 5,
  },
  {
    fullName: 'Sofia Martinez',
    email: 'sofia@brainx.app',
    bio: 'Native Spanish teacher with 8 years of experience. Passionate about language exchange and cultural connection.',
    location: 'Alger, Algeria',
    languages: ['Spanish', 'English', 'French'],
    skillsCanTeach: ['Spanish', 'Cooking', 'Yoga'],
    skillsWantToLearn: ['JavaScript', 'React', 'Photography'],
    avatar: 'https://i.pravatar.cc/400?img=47',
    isVerified: true,
    ratingAverage: 5.0,
    ratingCount: 87,
    completedExchanges: 87,
  },
  {
    fullName: 'Marcus Johnson',
    email: 'marcus@brainx.app',
    bio: 'Session guitarist with 15 years of experience. I teach guitar, music theory, and composition. Always eager to learn new languages and cooking!',
    location: 'Oran, Algeria',
    languages: ['English'],
    skillsCanTeach: ['Guitar', 'Music Theory', 'Composition'],
    skillsWantToLearn: ['Cooking', 'English', 'Spanish'],
    avatar: 'https://i.pravatar.cc/400?img=12',
    isVerified: true,
    ratingAverage: 4.9,
    ratingCount: 62,
    completedExchanges: 62,
  },
  {
    fullName: 'Yuki Tanaka',
    email: 'yuki@brainx.app',
    bio: 'Graphic designer with a passion for illustration and branding. I also teach Japanese to beginners.',
    location: 'Constantine, Algeria',
    languages: ['Japanese', 'English'],
    skillsCanTeach: ['Japanese', 'Illustration', 'Photoshop', 'Graphic Design'],
    skillsWantToLearn: ['Photography', 'English', 'React'],
    avatar: 'https://i.pravatar.cc/400?img=32',
    isVerified: true,
    ratingAverage: 4.8,
    ratingCount: 41,
    completedExchanges: 41,
  },
];

async function seed() {
  try {
    // Only connect if mongoose is not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connected to MongoDB');
    }

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      Session.deleteMany({}),
      Notification.deleteMany({}),
      Review.deleteMany({}),
      Match.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create users
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 12);
    const users = await User.insertMany(
      DEMO_USERS.map((u) => ({ ...u, password: hashedPassword }))
    );
    console.log(`👤 Created ${users.length} users`);

    const [rema, sofia, marcus, yuki] = users;

    // Create matches
    const matches = await Match.insertMany([
      {
        user1: rema._id,
        user2: sofia._id,
        compatibilityScore: 95,
        matchingSkills: [
          { skill: 'React', direction: 'user1_teaches' },
          { skill: 'Spanish', direction: 'user2_teaches' },
        ],
        status: 'accepted',
      },
      {
        user1: rema._id,
        user2: marcus._id,
        compatibilityScore: 88,
        matchingSkills: [
          { skill: 'Guitar', direction: 'user2_teaches' },
          { skill: 'Cooking', direction: 'user1_teaches' },
        ],
        status: 'pending',
      },
      {
        user1: rema._id,
        user2: yuki._id,
        compatibilityScore: 81,
        matchingSkills: [
          { skill: 'React', direction: 'user1_teaches' },
          { skill: 'Photography', direction: 'user2_teaches' },
        ],
        status: 'pending',
      },
    ]);
    console.log(`🔗 Created ${matches.length} matches`);

    // Create conversations
    const conv1 = await Conversation.create({ participants: [rema._id, sofia._id] });
    const conv2 = await Conversation.create({ participants: [rema._id, marcus._id] });
    console.log('💬 Created conversations');

    // Create messages
    const msgs1 = await Message.insertMany([
      { conversation: conv1._id, sender: rema._id, receiver: sofia._id, text: 'Hi Sofia! I can help you with React.', read: true },
      { conversation: conv1._id, sender: sofia._id, receiver: rema._id, text: 'That sounds perfect! I have been wanting to learn it.', read: true },
      { conversation: conv1._id, sender: sofia._id, receiver: rema._id, text: 'When would you like to start?', read: false },
    ]);
    const msgs2 = await Message.insertMany([
      { conversation: conv2._id, sender: marcus._id, receiver: rema._id, text: 'Tuesday 7pm works?', read: true },
      { conversation: conv2._id, sender: rema._id, receiver: marcus._id, text: 'Yes, Tuesday works great!', read: true },
    ]);

    // Update conversation lastMessage
    await Conversation.findByIdAndUpdate(conv1._id, { lastMessage: msgs1[2]._id, lastMessageAt: new Date() });
    await Conversation.findByIdAndUpdate(conv2._id, { lastMessage: msgs2[1]._id, lastMessageAt: new Date() });
    console.log('📨 Created messages');

    // Create sessions
    const now = new Date();
    const sessions = await Session.insertMany([
      {
        teacher: sofia._id,
        learner: rema._id,
        skill: 'Spanish',
        date: new Date(now.getTime() + 2 * 60 * 60 * 1000), // today +2h
        duration: 60,
        status: 'confirmed',
        meetingLink: 'https://meet.jit.si/brainx-english-spanish-demo',
        notes: 'Focus on conversational Spanish for beginners.',
      },
      {
        teacher: marcus._id,
        learner: rema._id,
        skill: 'Guitar',
        date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // in 4 days
        duration: 60,
        status: 'pending',
        notes: 'Learn basic chords first.',
      },
      {
        teacher: rema._id,
        learner: sofia._id,
        skill: 'React',
        date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        duration: 90,
        status: 'completed',
        meetingLink: 'https://meet.jit.si/brainx-react-sofia-demo',
        reviewLeft: true,
      },
      {
        teacher: rema._id,
        learner: marcus._id,
        skill: 'JavaScript',
        date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        duration: 60,
        status: 'completed',
        meetingLink: 'https://meet.jit.si/brainx-js-marcus-demo',
        reviewLeft: true,
      },
    ]);
    console.log(`📅 Created ${sessions.length} sessions`);

    // Create reviews
    await Review.insertMany([
      {
        reviewer: sofia._id,
        reviewedUser: rema._id,
        session: sessions[2]._id,
        rating: 5,
        comment: 'Rema explains React clearly and gives practical examples. The session felt structured and easy to follow.',
      },
      {
        reviewer: marcus._id,
        reviewedUser: rema._id,
        session: sessions[3]._id,
        rating: 5,
        comment: 'Very patient and friendly. The session was useful, organized, and beginner-friendly.',
      },
    ]);
    console.log('⭐ Created reviews');

    // Create notifications for rema
    await Notification.insertMany([
      {
        user: rema._id,
        type: 'new_message',
        title: 'New Message',
        message: 'Sofia Martinez sent you a message',
        sender: sofia._id,
        read: false,
      },
      {
        user: rema._id,
        type: 'session_requested',
        title: 'Session Reminder',
        message: 'Your Spanish session starts in 1 hour',
        read: false,
      },
      {
        user: rema._id,
        type: 'match_accepted',
        title: 'Match Accepted! 🎉',
        message: 'Sofia accepted your exchange request',
        sender: sofia._id,
        read: true,
      },
      {
        user: rema._id,
        type: 'review_received',
        title: 'New Review ⭐',
        message: 'Marcus Johnson left you a 5-star review',
        sender: marcus._id,
        read: true,
      },
    ]);
    console.log('🔔 Created notifications');

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('Demo accounts:');
    DEMO_USERS.forEach((u) => console.log(`  📧 ${u.email} | 🔒 ${SEED_PASSWORD}`));

    if (require.main === module) {
      await mongoose.disconnect();
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    if (require.main === module) {
      await mongoose.disconnect();
      process.exit(1);
    }
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
