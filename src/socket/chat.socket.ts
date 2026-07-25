import { Server, Socket } from 'socket.io'
import { WorkspaceService } from '../services/workspace.service.js';
import { MessageService } from '../services/message.service.js';

// Room naming convention — one room per channel
const channelRoom = (channelId: string) => `channel:${channelId}`

export const registerChatHandlers = (io: Server, socket: Socket) => {

  // ── Join a channel room ─────────────────────────
  // Client calls this when opening a channel
  socket.on('channel:join', async (data: { workspaceId: string; channelId: string }) => {
    try {
      await WorkspaceService.requireMembership(data.workspaceId, socket.userId!)
      socket.join(channelRoom(data.channelId))
      socket.emit('channel:joined', { channelId: data.channelId })
    } catch (err) {
      socket.emit('error', { message: 'Failed to join channel' })
    }
  })

  // ── Leave a channel room ─────────────────────────
  // Client calls this when navigating away from a channel
  socket.on('channel:leave', (data: { channelId: string }) => {
    socket.leave(channelRoom(data.channelId))
  })

  // ── Send a message ───────────────────────────────
  socket.on('message:send', async (
    data: { workspaceId: string; channelId: string; content?: string; parentId?: string; fileIds?: string[] },
    callback: (response: any) => void
  ) => {
    try {
      const result = await MessageService.sendMessage(
        data.workspaceId,
        data.channelId,
        socket.userId!,
        { content: data.content, parentId: data.parentId, fileIds: data.fileIds },
      )

      // Broadcast to EVERYONE in the channel room, including the sender
      io.to(channelRoom(data.channelId)).emit('message:new', result.message)

      // Acknowledge back to the sender specifically (for optimistic UI confirmation)
      callback?.({ success: true, message: result.message })
    } catch (err: any) {
      callback?.({ success: false, error: err.message ?? 'Failed to send message' })
    }
  })

  // ── Edit a message ────────────────────────────────
  socket.on('message:edit', async (
    data: { workspaceId: string; channelId: string; messageId: string; content: string },
    callback: (response: any) => void
  ) => {
    try {
      const result = await MessageService.editMessage(
        data.workspaceId, data.channelId, data.messageId, socket.userId!, { content: data.content },
      )
      io.to(channelRoom(data.channelId)).emit('message:updated', result.message)
      callback?.({ success: true })
    } catch (err: any) {
      callback?.({ success: false, error: err.message })
    }
  })

  // ── Delete a message ──────────────────────────────
  socket.on('message:delete', async (
    data: { workspaceId: string; channelId: string; messageId: string },
    callback: (response: any) => void
  ) => {
    try {
      await MessageService.deleteMessage(data.workspaceId, data.channelId, data.messageId, socket.userId!)
      io.to(channelRoom(data.channelId)).emit('message:deleted', { messageId: data.messageId })
      callback?.({ success: true })
    } catch (err: any) {
      callback?.({ success: false, error: err.message })
    }
  })

  // ── React to a message ────────────────────────────
  socket.on('message:react', async (
    data: { workspaceId: string; channelId: string; messageId: string; emoji: string },
    callback: (response: any) => void
  ) => {
    try {
      const result = await MessageService.addReaction(
        data.workspaceId, data.channelId, data.messageId, socket.userId!, data.emoji,
      )
      io.to(channelRoom(data.channelId)).emit('message:reaction-added', {
        messageId: data.messageId,
        reaction:  result.reaction,
      })
      callback?.({ success: true })
    } catch (err: any) {
      callback?.({ success: false, error: err.message })
    }
  })

  // ── Remove a reaction ─────────────────────────────
  socket.on('message:unreact', async (
    data: { workspaceId: string; channelId: string; messageId: string; emoji: string },
    callback: (response: any) => void
  ) => {
    try {
      await MessageService.removeReaction(
        data.workspaceId, data.channelId, data.messageId, socket.userId!, data.emoji,
      )
      io.to(channelRoom(data.channelId)).emit('message:reaction-removed', {
        messageId: data.messageId,
        userId:    socket.userId,
        emoji:     data.emoji,
      })
      callback?.({ success: true })
    } catch (err: any) {
      callback?.({ success: false, error: err.message })
    }
  })

  // ── Typing indicator ──────────────────────────────
  socket.on('typing:start', (data: { channelId: string }) => {
    socket.to(channelRoom(data.channelId)).emit('typing:update', {
      channelId: data.channelId,
      userId:    socket.userId,
      user:      socket.user,
      isTyping:  true,
    })
  })

  socket.on('typing:stop', (data: { channelId: string }) => {
    socket.to(channelRoom(data.channelId)).emit('typing:update', {
      channelId: data.channelId,
      userId:    socket.userId,
      isTyping:  false,
    })
  })
}