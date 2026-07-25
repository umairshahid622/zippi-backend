import { z } from 'zod'

export const getMessagesSchema = z.object({
  params: z.object({
    workspaceId: z.uuid('Invalid workspace ID'),
    channelId:   z.uuid('Invalid channel ID'),
  }),
  query: z.object({
    before: z.uuid().optional(),
    limit:  z.coerce.number().min(1).max(100).default(50),
  }),
})

export const sendMessageSchema = z.object({
  params: z.object({
    workspaceId: z.uuid('Invalid workspace ID'),
    channelId:   z.uuid('Invalid channel ID'),
  }),
  body: z.object({
    content:  z.string().max(4000, 'Message is too long').optional(),
    parentId: z.uuid('Invalid parent message ID').optional(),
    fileIds:  z.array(z.uuid()).max(10, 'Max 10 files per message').optional(),
  }).refine(
    (data) => (data.content && data.content.trim().length > 0) || (data.fileIds && data.fileIds.length > 0),
    { message: 'Message must have content or at least one file' }
  ),
})

export const editMessageSchema = z.object({
  params: z.object({
    workspaceId: z.uuid('Invalid workspace ID'),
    channelId:   z.uuid('Invalid channel ID'),
    messageId:   z.uuid('Invalid message ID'),
  }),
  body: z.object({
    content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message is too long'),
  }),
})

export const messageIdParamSchema = z.object({
  params: z.object({
    workspaceId: z.uuid('Invalid workspace ID'),
    channelId:   z.uuid('Invalid channel ID'),
    messageId:   z.uuid('Invalid message ID'),
  }),
})

export const reactToMessageSchema = z.object({
  params: z.object({
    workspaceId: z.uuid('Invalid workspace ID'),
    channelId:   z.uuid('Invalid channel ID'),
    messageId:   z.uuid('Invalid message ID'),
  }),
  body: z.object({
    emoji: z.string().min(1).max(10),
  }),
})

export const removeReactionSchema = z.object({
  params: z.object({
    workspaceId: z.uuid('Invalid workspace ID'),
    channelId:   z.uuid('Invalid channel ID'),
    messageId:   z.uuid('Invalid message ID'),
    emoji:       z.string().min(1).max(10),
  }),
})

export const getThreadRepliesSchema = z.object({
  params: z.object({
    workspaceId: z.uuid('Invalid workspace ID'),
    channelId:   z.uuid('Invalid channel ID'),
    messageId:   z.uuid('Invalid message ID'),
  }),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>['body']
export type EditMessageInput = z.infer<typeof editMessageSchema>['body']
export type GetMessagesQuery = z.infer<typeof getMessagesSchema>['query']