import { prisma } from "../config/database.js";
import { omitUndefined } from "../lib/object.js";
import { AppError } from "../middlewares/error.middleware.js";
import type {
  CreateChannelInput,
  UpdateChannelInput,
} from "../validators/channel.validator.js";
import { WorkspaceService } from "./workspace.service.js";

const CHANNEL_MEMBER_INCLUDE = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          handle: true,
          isOnline: true,
          lastSeenAt: true,
        },
      },
    },
  },
} as const;

export class ChannelService {
  // ── Get all channels I'm a member of, in this workspace ──
  static async getWorkspaceChannels(workspaceId: string, userId: string) {
    await WorkspaceService.requireMembership(workspaceId, userId);

    const channels = await prisma.channel.findMany({
      where: {
        workspaceId,
        isArchived: false,
        members: { some: { userId } }, // only channels I've joined
      },
      include: CHANNEL_MEMBER_INCLUDE,
      orderBy: { createdAt: "asc" },
    });

    return { channels };
  }

  // ── Get all PUBLIC channels in the workspace, joined or not ──
  // Used for "browse channels" / "join a channel" UI
  static async getPublicChannels(workspaceId: string, userId: string) {
    await WorkspaceService.requireMembership(workspaceId, userId);

    const channels = await prisma.channel.findMany({
      where: {
        workspaceId,
        isArchived: false,
        isPrivate: false,
        isDm: false,
      },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });

    // Mark which ones I've already joined
    const myMemberships = await prisma.channelMember.findMany({
      where: { userId, channel: { workspaceId } },
      select: { channelId: true },
    });
    const myChannelIds = new Set(myMemberships.map((m) => m.channelId));

    return {
      channels: channels.map((c) => ({
        ...c,
        memberCount: c._count.members,
        isJoined: myChannelIds.has(c.id),
      })),
    };
  }

  // ── Get one channel's detail ────────────────────────────
  static async getChannel(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    await WorkspaceService.requireMembership(workspaceId, userId);

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
      include: CHANNEL_MEMBER_INCLUDE,
    });

    if (!channel) throw new AppError("Channel not found", 404);

    // For private channels — must be a member to view
    if (channel.isPrivate || channel.isDm) {
      const isMember = channel.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new AppError("You do not have access to this channel", 403);
      }
    }

    return { channel };
  }

  // ── Create a new channel ─────────────────────────────────
  static async createChannel(
    workspaceId: string,
    userId: string,
    data: CreateChannelInput,
  ) {
    // Any active member can create a channel — adjust to
    // ['owner', 'admin'] if you want to restrict this later
    await WorkspaceService.requireMembership(workspaceId, userId);

    // Check for duplicate name within the workspace
    const existing = await prisma.channel.findFirst({
      where: { workspaceId, name: data.name, isDm: false },
    });
    if (existing) {
      throw new AppError("A channel with this name already exists", 409);
    }

    const channel = await prisma.channel.create({
      data: {
        workspaceId,
        createdBy: userId,
        name: data.name,
        description: data.description ?? "",
        isPrivate: data.isPrivate,
        isDm: false,
        members: {
          create: { userId }, // creator auto-joins
        },
      },
      include: CHANNEL_MEMBER_INCLUDE,
    });

    return { channel };
  }

  // ── Update channel details ───────────────────────────────
  static async updateChannel(
    workspaceId: string,
    channelId: string,
    userId: string,
    data: UpdateChannelInput,
  ) {
    await WorkspaceService.requireMembership(workspaceId, userId);

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new AppError("Channel not found", 404);
    if (channel.isDm) throw new AppError("Cannot rename a direct message", 400);

    if (data.name && data.name !== channel.name) {
      const duplicate = await prisma.channel.findFirst({
        where: {
          workspaceId,
          name: data.name,
          isDm: false,
          NOT: { id: channelId },
        },
      });
      if (duplicate)
        throw new AppError("A channel with this name already exists", 409);
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: {
        name: data.name ?? "",
        description: data.description ?? "",
      },
    });

    return { channel: updated };
  }

  // ── Archive (soft-delete) a channel ──────────────────────
  static async archiveChannel(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    // Only owner/admin can archive — creator-only would also be reasonable
    await WorkspaceService.requireRole(workspaceId, userId, ["owner", "admin"]);

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new AppError("Channel not found", 404);
    if (channel.isDm)
      throw new AppError("Cannot archive a direct message", 400);
    if (channel.name === "general") {
      throw new AppError("The general channel cannot be archived", 400);
    }

    await prisma.channel.update({
      where: { id: channelId },
      data: { isArchived: true },
    });

    return { message: "Channel archived successfully" };
  }

  // ── Join a public channel ────────────────────────────────
  static async joinChannel(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    await WorkspaceService.requireMembership(workspaceId, userId);

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new AppError("Channel not found", 404);
    if (channel.isPrivate) {
      throw new AppError(
        "This is a private channel — you must be added by a member",
        403,
      );
    }
    if (channel.isDm) {
      throw new AppError("Cannot join a direct message", 400);
    }

    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId, userId } },
      create: { channelId, userId },
      update: {}, // already a member — no-op
    });

    return { message: "Joined channel successfully" };
  }

  // ── Leave a channel ──────────────────────────────────────
  static async leaveChannel(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    await WorkspaceService.requireMembership(workspaceId, userId);

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new AppError("Channel not found", 404);
    if (channel.name === "general") {
      throw new AppError("You cannot leave the general channel", 400);
    }
    if (channel.isDm) {
      throw new AppError("You cannot leave a direct message", 400);
    }

    await prisma.channelMember.deleteMany({
      where: { channelId, userId },
    });

    return { message: "Left channel successfully" };
  }

  // ── Add a member to a private channel ────────────────────
  static async addMember(
    workspaceId: string,
    channelId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    // Requester must be a member of the channel to add others to it
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
      include: { members: true },
    });
    if (!channel) throw new AppError("Channel not found", 404);
    if (channel.isDm)
      throw new AppError("Cannot add members to a direct message", 400);

    const requesterIsMember = channel.members.some(
      (m) => m.userId === requesterId,
    );
    if (!requesterIsMember) {
      throw new AppError(
        "You must be a member of this channel to add others",
        403,
      );
    }

    // Target must already be a workspace member — channels don't
    // have their own separate invite system (per our earlier design)
    await WorkspaceService.requireMembership(workspaceId, targetUserId);

    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId, userId: targetUserId } },
      create: { channelId, userId: targetUserId },
      update: {},
    });

    return { message: "Member added to channel" };
  }

  // ── Remove a member from a channel ───────────────────────
  static async removeMember(
    workspaceId: string,
    channelId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new AppError("Channel not found", 404);
    if (channel.isDm)
      throw new AppError("Cannot remove members from a direct message", 400);

    const isSelf = requesterId === targetUserId;
    if (!isSelf) {
      // Removing someone else — must be workspace owner/admin
      await WorkspaceService.requireRole(workspaceId, requesterId, [
        "owner",
        "admin",
      ]);
    }

    await prisma.channelMember.deleteMany({
      where: { channelId, userId: targetUserId },
    });

    return { message: isSelf ? "Left channel" : "Member removed from channel" };
  }

  // ── Get or create a DM channel between two users ─────────
  static async getOrCreateDm(
    workspaceId: string,
    userId: string,
    targetUserId: string,
  ) {
    if (userId === targetUserId) {
      throw new AppError("Cannot start a DM with yourself", 400);
    }

    await WorkspaceService.requireMembership(workspaceId, userId);
    await WorkspaceService.requireMembership(workspaceId, targetUserId);

    // Look for an existing DM between exactly these two users
    // in this workspace — a DM channel has exactly 2 members
    const existingDm = await prisma.channel.findFirst({
      where: {
        workspaceId,
        isDm: true,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: CHANNEL_MEMBER_INCLUDE,
    });

    if (existingDm) {
      return { channel: existingDm, isNew: false };
    }

    // Create a new DM channel
    const channel = await prisma.channel.create({
      data: {
        workspaceId,
        createdBy: userId,
        isDm: true,
        isPrivate: true,
        members: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: CHANNEL_MEMBER_INCLUDE,
    });

    return { channel, isNew: true };
  }

  // ── Mark channel as read (updates lastReadAt) ─────────────
  static async markAsRead(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    await WorkspaceService.requireMembership(workspaceId, userId);

    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member)
      throw new AppError("You are not a member of this channel", 403);

    await prisma.channelMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });

    return { message: "Marked as read" };
  }
}
