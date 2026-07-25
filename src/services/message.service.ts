import { prisma } from "../config/database.js";
import { AppError } from "../middlewares/error.middleware.js";
import type {
  EditMessageInput,
  GetMessagesQuery,
  SendMessageInput,
} from "../validators/message.validator.js";
import { WorkspaceService } from "./workspace.service.js";

// Reusable include shape for every message response
const MESSAGE_INCLUDE = {
  sender: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      handle: true,
      isOnline: true,
    },
  },
  reactions: {
    include: {
      user: { select: { id: true, fullName: true } },
    },
  },
  files: true,
  _count: {
    select: { replies: true },
  },
} as const;

export class MessageService {
  // ── Verify the user can access this channel ───────────
  private static async requireChannelAccess(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    await WorkspaceService.requireMembership(workspaceId, userId);

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
      include: { members: true },
    });

    if (!channel) throw new AppError("Channel not found", 404);

    if (channel.isPrivate || channel.isDm) {
      const isMember = channel.members.some((m) => m.userId === userId);
      if (!isMember)
        throw new AppError("You do not have access to this channel", 403);
    }

    return channel;
  }

  // ── Get messages with cursor-based pagination ─────────
  static async getMessages(
    workspaceId: string,
    channelId: string,
    userId: string,
    query: GetMessagesQuery,
  ) {
    await MessageService.requireChannelAccess(workspaceId, channelId, userId);

    let cursorDate: Date | undefined;

    if (query.before) {
      const cursorMessage = await prisma.message.findUnique({
        where: { id: query.before },
        select: { createdAt: true },
      });

      if (!cursorMessage) {
        throw new AppError("Invalid pagination cursor", 400);
      }

      cursorDate = cursorMessage.createdAt;
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        parentId: null,
        deletedAt: null,
        ...(cursorDate && { createdAt: { lt: cursorDate } }),
      },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });

    return { messages: messages.reverse() };
  }

  // ── Get replies within a thread ───────────────────────
  static async getThreadReplies(
    workspaceId: string,
    channelId: string,
    messageId: string,
    userId: string,
  ) {
    await MessageService.requireChannelAccess(workspaceId, channelId, userId);

    const parent = await prisma.message.findFirst({
      where: { id: messageId, channelId },
    });
    if (!parent) throw new AppError("Message not found", 404);

    const replies = await prisma.message.findMany({
      where: { parentId: messageId, deletedAt: null },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: "asc" },
    });

    return { replies };
  }

  // ── Send a message ─────────────────────────────────────
  static async sendMessage(
    workspaceId: string,
    channelId: string,
    userId: string,
    data: SendMessageInput,
  ) {
    await MessageService.requireChannelAccess(workspaceId, channelId, userId);

    if (data.parentId) {
      const parent = await prisma.message.findFirst({
        where: { id: data.parentId, channelId, deletedAt: null },
      });
      if (!parent) {
        throw new AppError("Cannot reply — parent message not found", 404);
      }
    }

    const type =
      data.fileIds && data.fileIds.length > 0
        ? data.content
          ? "text"
          : "file"
        : "text";

    const message = await prisma.message.create({
      data: {
        channelId,
        senderId: userId,
        parentId: data.parentId ?? null, 
        content: data.content ?? null, 
        type,
        ...(data.fileIds &&
          data.fileIds.length > 0 && {
            files: {
              connect: data.fileIds.map((id) => ({ id })),
            },
          }),
      },
      include: MESSAGE_INCLUDE,
    });

    return { message };
  }

  // ── Edit a message ─────────────────────────────────────
  static async editMessage(
    workspaceId: string,
    channelId: string,
    messageId: string,
    userId: string,
    data: EditMessageInput,
  ) {
    await MessageService.requireChannelAccess(workspaceId, channelId, userId);

    const message = await prisma.message.findFirst({
      where: { id: messageId, channelId, deletedAt: null },
    });
    if (!message) throw new AppError("Message not found", 404);
    if (message.senderId !== userId) {
      throw new AppError("You can only edit your own messages", 403);
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: data.content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: MESSAGE_INCLUDE,
    });

    return { message: updated };
  }

  // ── Delete a message (soft delete) ─────────────────────
  static async deleteMessage(
    workspaceId: string,
    channelId: string,
    messageId: string,
    userId: string,
  ) {
    await MessageService.requireChannelAccess(workspaceId, channelId, userId);

    const message = await prisma.message.findFirst({
      where: { id: messageId, channelId, deletedAt: null },
    });
    if (!message) throw new AppError("Message not found", 404);

    const isOwnMessage = message.senderId === userId;
    if (!isOwnMessage) {
      // Non-owners need admin/owner workspace role to delete others' messages
      await WorkspaceService.requireRole(workspaceId, userId, [
        "owner",
        "admin",
      ]);
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return { message: "Message deleted successfully" };
  }

  // ── Pin / unpin a message ──────────────────────────────
  static async togglePin(
    workspaceId: string,
    channelId: string,
    messageId: string,
    userId: string,
  ) {
    await MessageService.requireChannelAccess(workspaceId, channelId, userId);

    const message = await prisma.message.findFirst({
      where: { id: messageId, channelId, deletedAt: null },
    });
    if (!message) throw new AppError("Message not found", 404);

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
      include: MESSAGE_INCLUDE,
    });

    return { message: updated };
  }

  // ── Get all pinned messages in a channel ───────────────
  static async getPinnedMessages(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    await MessageService.requireChannelAccess(workspaceId, channelId, userId);

    const messages = await prisma.message.findMany({
      where: { channelId, isPinned: true, deletedAt: null },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return { messages };
  }

  // ── Mark / unmark a message as a decision ──────────────
  static async toggleDecision(
    workspaceId: string,
    channelId: string,
    messageId: string,
    userId: string,
  ) {
    await MessageService.requireChannelAccess(workspaceId, channelId, userId);

    const message = await prisma.message.findFirst({
      where: { id: messageId, channelId, deletedAt: null },
    });
    if (!message) throw new AppError("Message not found", 404);

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isDecision: !message.isDecision },
      include: MESSAGE_INCLUDE,
    });

    return { message: updated };
  }

  // ── Get all decisions logged in a workspace ────────────
  static async getWorkspaceDecisions(workspaceId: string, userId: string) {
    await WorkspaceService.requireMembership(workspaceId, userId);

    const messages = await prisma.message.findMany({
      where: {
        isDecision: true,
        deletedAt: null,
        channel: { workspaceId },
      },
      include: {
        ...MESSAGE_INCLUDE,
        channel: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { messages };
  }

  // ── Add a reaction ──────────────────────────────────────
  static async addReaction(
    workspaceId: string,
    channelId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    await MessageService.requireChannelAccess(workspaceId, channelId, userId);

    const message = await prisma.message.findFirst({
      where: { id: messageId, channelId, deletedAt: null },
    });
    if (!message) throw new AppError("Message not found", 404);

    const reaction = await prisma.reaction.upsert({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
      create: { messageId, userId, emoji },
      update: {}, // already reacted with this emoji — no-op
      include: { user: { select: { id: true, fullName: true } } },
    });

    return { reaction };
  }

  // ── Remove a reaction ───────────────────────────────────
  static async removeReaction(
    workspaceId: string,
    channelId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    await MessageService.requireChannelAccess(workspaceId, channelId, userId);

    await prisma.reaction.deleteMany({
      where: { messageId, userId, emoji },
    });

    return { message: "Reaction removed" };
  }
}
