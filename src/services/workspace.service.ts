import crypto              from 'crypto'
import { prisma }          from '../config/database.js'
import { createUniqueSlug } from '../lib/slug.js'
import { AppError }        from '../middlewares/error.middleware.js'
import { sendWorkspaceInviteEmail } from '../lib/email.js'
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
} from '../validators/workspace.validator.js'

export class WorkspaceService {

  // ── Core permission check — reused by EVERY other domain ──
  // Channels, tasks, files, messages all call this before
  // allowing any action inside a workspace
  static async requireMembership(
    workspaceId: string,
    userId:      string,
  ) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    })

    if (!member || !member.isActive) {
      throw new AppError('You are not a member of this workspace', 403)
    }

    return member
  }

  // ── Role-based permission check ───────────────────────
  static async requireRole(
    workspaceId: string,
    userId:      string,
    allowedRoles: Array<'owner' | 'admin' | 'member' | 'guest'>,
  ) {
    const member = await WorkspaceService.requireMembership(workspaceId, userId)

    if (!allowedRoles.includes(member.role as any)) {
      throw new AppError('You do not have permission to perform this action', 403)
    }

    return member
  }

  // ── Create workspace ───────────────────────────────────
  static async createWorkspace(userId: string, data: CreateWorkspaceInput) {
    const slug = await createUniqueSlug(data.name)

    const workspace = await prisma.workspace.create({
      data: {
        name:    data.name,
        slug,
        ownerId: userId,
        members: {
          create: {
            userId,
            role:     'owner',
            isActive: true,
          },
        },
        // Create default "general" channel automatically
        channels: {
          create: {
            name:      'general',
            createdBy: userId,
            isPrivate: false,
            members: {
              create: { userId },
            },
          },
        },
      },
      include: {
        members:  { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
        channels: true,
      },
    })

    return { workspace }
  }

  // ── Get all workspaces for a user ─────────────────────
  static async getUserWorkspaces(userId: string) {
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId,
        isActive: true,
        workspace: { deletedAt: null },
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true, channels: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    return {
      workspaces: memberships.map(m => ({
        ...m.workspace,
        role: m.role,
        memberCount:  m.workspace._count.members,
        channelCount: m.workspace._count.channels,
      })),
    }
  }

  // ── Get single workspace details ──────────────────────
  static async getWorkspace(workspaceId: string, userId: string) {
    await WorkspaceService.requireMembership(workspaceId, userId)

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId, deletedAt: null },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true, fullName: true, avatarUrl: true,
                handle: true, isOnline: true, lastSeenAt: true,
              },
            },
          },
        },
        channels: {
          where: { isArchived: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!workspace) throw new AppError('Workspace not found', 404)

    return { workspace }
  }

  // ── Update workspace ───────────────────────────────────
  static async updateWorkspace(
    workspaceId: string,
    userId:      string,
    data:        UpdateWorkspaceInput,
  ) {
    // Only owner/admin can update workspace settings
    await WorkspaceService.requireRole(workspaceId, userId, ['owner', 'admin'])

      const updateData = {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
      }

      const workspace = await prisma.workspace.update({
        where: { id: workspaceId },
      data: updateData,
    })

    return { workspace }
  }

  // ── Delete workspace (soft delete) ────────────────────
  static async deleteWorkspace(workspaceId: string, userId: string) {
    // Only the owner can delete a workspace
    await WorkspaceService.requireRole(workspaceId, userId, ['owner'])

    await prisma.workspace.update({
      where: { id: workspaceId },
      data:  { deletedAt: new Date() },
    })

    return { message: 'Workspace deleted successfully' }
  }

  // ── Invite a member by email ───────────────────────────
  static async inviteMember(
    workspaceId: string,
    invitedBy:   string,
    data:        InviteMemberInput,
  ) {
    // Only owner/admin can invite
    await WorkspaceService.requireRole(workspaceId, invitedBy, ['owner', 'admin'])

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    })
    if (!workspace) throw new AppError('Workspace not found', 404)

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: existingUser.id },
        },
      })

      if (existingMember?.isActive) {
        throw new AppError('This person is already a member', 409)
      }
    }

    // Check for existing pending invite
    const existingInvite = await prisma.workspaceInvite.findFirst({
      where: {
        workspaceId,
        email:      data.email,
        acceptedAt: null,
        expiresAt:  { gt: new Date() },
      },
    })

    if (existingInvite) {
      throw new AppError('An invite has already been sent to this email', 409)
    }

    const token = crypto.randomBytes(32).toString('hex')

    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        invitedBy,
        email:     data.email,
        role:      data.role,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    await sendWorkspaceInviteEmail(data.email, workspace.name, token)

    return { message: 'Invite sent successfully', invite }
  }

  // ── Accept an invite ────────────────────────────────────
  static async acceptInvite(userId: string, token: string) {
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: true },
    })

    if (!invite)                 throw new AppError('Invalid invite', 400)
    if (invite.acceptedAt)       throw new AppError('This invite was already used', 400)
    if (invite.expiresAt < new Date()) throw new AppError('This invite has expired', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new AppError('User not found', 404)

    // Optional: verify the invite email matches the logged-in user's email
    if (user.email !== invite.email) {
      throw new AppError('This invite was sent to a different email address', 403)
    }

    // Check if already a member (rejoining after being removed)
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: invite.workspaceId, userId },
      },
    })

    const result = await prisma.$transaction(async (tx) => {
      if (existingMember) {
        // Reactivate membership
        await tx.workspaceMember.update({
          where: { id: existingMember.id },
          data:  { isActive: true, role: invite.role, leftAt: null },
        })
      } else {
        // Create new membership
        await tx.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId,
            role:        invite.role,
          },
        })
      }

      // Mark invite as accepted
      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data:  { acceptedAt: new Date() },
      })

      // Auto-join the default "general" channel
      const generalChannel = await tx.channel.findFirst({
        where: {
          workspaceId: invite.workspaceId,
          name:        'general',
          isDm:        false,
        },
      })

      if (generalChannel) {
        await tx.channelMember.upsert({
          where: {
            channelId_userId: { channelId: generalChannel.id, userId },
          },
          create: { channelId: generalChannel.id, userId },
          update: {},
        })
      }

      return invite.workspace
    })

    return { workspace: result }
  }

  // ── List workspace members ─────────────────────────────
  static async getMembers(workspaceId: string, userId: string) {
    await WorkspaceService.requireMembership(workspaceId, userId)

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId, isActive: true },
      include: {
        user: {
          select: {
            id: true, fullName: true, avatarUrl: true,
            handle: true, email: true, isOnline: true, lastSeenAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    return { members }
  }

  // ── Update a member's role ─────────────────────────────
  static async updateMemberRole(
    workspaceId:    string,
    requesterId:    string,
    targetUserId:   string,
    data:           UpdateMemberRoleInput,
  ) {
    // Only owner can change roles (admins can't promote others to admin)
    await WorkspaceService.requireRole(workspaceId, requesterId, ['owner'])

    if (requesterId === targetUserId) {
      throw new AppError('You cannot change your own role', 400)
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: targetUserId },
      },
    })

    if (!targetMember) throw new AppError('Member not found', 404)
    if (targetMember.role === 'owner') {
      throw new AppError('Cannot change the owner\'s role', 400)
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: targetMember.id },
      data:  { role: data.role },
    })

    return { member: updated }
  }

  // ── Remove a member ────────────────────────────────────
  static async removeMember(
    workspaceId:  string,
    requesterId:  string,
    targetUserId: string,
  ) {
    // Owner/admin can remove members. Anyone can remove themselves (leave).
    const isSelf = requesterId === targetUserId

    if (!isSelf) {
      await WorkspaceService.requireRole(workspaceId, requesterId, ['owner', 'admin'])
    } else {
      await WorkspaceService.requireMembership(workspaceId, requesterId)
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: targetUserId },
      },
    })

    if (!targetMember) throw new AppError('Member not found', 404)
    if (targetMember.role === 'owner') {
      throw new AppError('The workspace owner cannot be removed', 400)
    }

    await prisma.workspaceMember.update({
      where: { id: targetMember.id },
      data:  { isActive: false, leftAt: new Date() },
    })

    return { message: isSelf ? 'You left the workspace' : 'Member removed' }
  }
}