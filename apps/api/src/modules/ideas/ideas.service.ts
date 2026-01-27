import { eq, and } from 'drizzle-orm';
import { contentIdeas, channels, type DbClient, type NewContentIdea } from '@creatorops/database';
import { NotFoundError, ForbiddenError } from '../../middleware/error-handler.js';

interface CreateIdeaData {
  channelId: string;
  title: string;
  description?: string;
  contentType?: 'long_form' | 'short';
  priority?: number;
  estimatedEffort?: 'low' | 'medium' | 'high';
  inspirationUrls?: string[];
  status?: 'new' | 'researching' | 'approved' | 'in_production' | 'completed' | 'archived';
}

interface UpdateIdeaData {
  title?: string;
  description?: string;
  contentType?: 'long_form' | 'short';
  priority?: number;
  estimatedEffort?: 'low' | 'medium' | 'high' | null;
  inspirationUrls?: string[] | null;
  status?: 'new' | 'researching' | 'approved' | 'in_production' | 'completed' | 'archived';
}

export class IdeasService {
  async getIdeas(channelId: string, userId: string, db: DbClient) {
    // Verify channel ownership
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this channel');
    }

    return db.query.contentIdeas.findMany({
      where: eq(contentIdeas.channelId, channelId),
      orderBy: (ideas, { desc }) => [desc(ideas.createdAt)],
    });
  }

  async getIdea(ideaId: string, userId: string, db: DbClient) {
    const idea = await db.query.contentIdeas.findFirst({
      where: eq(contentIdeas.id, ideaId),
      with: { channel: true },
    });

    if (!idea) {
      return null;
    }

    // Check ownership through channel
    if (idea.channel.userId !== userId) {
      throw new ForbiddenError('You do not have access to this idea');
    }

    return idea;
  }

  async createIdea(data: CreateIdeaData, userId: string, db: DbClient) {
    // Verify channel ownership
    const channel = await db.query.channels.findFirst({
      where: and(eq(channels.id, data.channelId), eq(channels.userId, userId)),
    });

    if (!channel) {
      throw new ForbiddenError('You do not have access to this channel');
    }

    const newIdea: NewContentIdea = {
      channelId: data.channelId,
      title: data.title,
      description: data.description || null,
      contentType: data.contentType || 'long_form',
      priority: data.priority ?? 0,
      estimatedEffort: data.estimatedEffort || null,
      inspirationUrls: data.inspirationUrls || null,
      status: data.status || 'new',
    };

    const [idea] = await db.insert(contentIdeas).values(newIdea).returning();

    return idea;
  }

  async updateIdea(ideaId: string, data: UpdateIdeaData, userId: string, db: DbClient) {
    const idea = await this.getIdea(ideaId, userId, db);

    if (!idea) {
      throw new NotFoundError('Idea');
    }

    const updateData: Partial<typeof contentIdeas.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.contentType !== undefined) updateData.contentType = data.contentType;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.estimatedEffort !== undefined) updateData.estimatedEffort = data.estimatedEffort;
    if (data.inspirationUrls !== undefined) updateData.inspirationUrls = data.inspirationUrls;
    if (data.status !== undefined) updateData.status = data.status;

    const [updatedIdea] = await db
      .update(contentIdeas)
      .set(updateData)
      .where(eq(contentIdeas.id, ideaId))
      .returning();

    return updatedIdea;
  }

  async deleteIdea(ideaId: string, userId: string, db: DbClient) {
    const idea = await this.getIdea(ideaId, userId, db);

    if (!idea) {
      throw new NotFoundError('Idea');
    }

    await db.delete(contentIdeas).where(eq(contentIdeas.id, ideaId));
  }
}
