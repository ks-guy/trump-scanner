import { PrismaClient } from '@prisma/client';
import { Quote } from './Quote.js';

const prisma = new PrismaClient();

export { prisma, Quote }; 