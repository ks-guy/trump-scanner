import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDatabase() {
    try {
        console.log('Starting database seeding...');

        // Test database connection
        try {
            await prisma.$connect();
            console.log('Database connection successful');
        } catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }

        // Clear existing data
        await prisma.post.deleteMany({});
        console.log('Cleared existing data');

        // Create test posts
        const posts = [
            {
                content: 'Just had a great meeting with my team! #MAGA',
                likes: 150,
                reposts: 45,
                replies: 23,
                isReply: false,
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
            },
            {
                content: 'The fake news media won\'t tell you this, but our numbers are through the roof!',
                likes: 200,
                reposts: 67,
                replies: 34,
                isReply: false,
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            },
            {
                content: 'Thank you to all my supporters! Together we will make America great again!',
                likes: 300,
                reposts: 89,
                replies: 45,
                isReply: false,
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
            },
            {
                content: 'The election was rigged! We need to fight back!',
                likes: 250,
                reposts: 78,
                replies: 56,
                isReply: false,
                createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
            },
            {
                content: 'Great rally in Florida today! The energy was incredible!',
                likes: 180,
                reposts: 52,
                replies: 28,
                isReply: false,
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
            }
        ];

        console.log('Creating test posts...');
        for (const post of posts) {
            try {
                const createdPost = await prisma.post.create({
                    data: post
                });
                console.log('Created post:', createdPost);
            } catch (error) {
                console.error('Error creating post:', error);
                throw error;
            }
        }

        // Verify data was created
        const totalPosts = await prisma.post.count();
        console.log('Successfully seeded database with test data. Total posts:', totalPosts);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('Database connection closed');
    }
}

// Run seeding if script is executed directly
seedDatabase();

export default seedDatabase; 