import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
    try {
        console.log('Testing database connection...');

        // Test connection
        await prisma.$connect();
        console.log('Database connection successful');

        // Create a test post
        const testPost = await prisma.post.create({
            data: {
                content: 'Test post',
                likes: 10,
                reposts: 5,
                replies: 3,
                isReply: false,
                createdAt: new Date()
            }
        });

        console.log('Created test post:', testPost);

        // Query all posts
        const posts = await prisma.post.findMany();
        console.log('All posts:', posts);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('Database connection closed');
    }
}

testDatabase(); 