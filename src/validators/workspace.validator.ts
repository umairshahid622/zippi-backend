import { z } from 'zod'

export const createWorkspaceSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2,  'Workspace name must be at least 2 characters')
      .max(100, 'Workspace name must be under 100 characters')
      .trim(),
  }),
})

export const updateWorkspaceSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid('Invalid workspace ID'),
  }),
  body: z.object({
    name:    z.string().min(2).max(100).trim().optional(),
    logoUrl: z.string().url('Invalid logo URL').optional(),
  }),
})

export const workspaceIdParamSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid('Invalid workspace ID'),
  }),
})

export const inviteMemberSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid('Invalid workspace ID'),
  }),
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    role:  z.enum(['admin', 'member', 'guest']).default('member'),
  }),
})

export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invite token is required'),
  }),
})

export const updateMemberRoleSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid('Invalid workspace ID'),
    userId:      z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    role: z.enum(['admin', 'member', 'guest']),
  }),
})

export const removeMemberSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid('Invalid workspace ID'),
    userId:      z.string().uuid('Invalid user ID'),
  }),
})

export type CreateWorkspaceInput   = z.infer<typeof createWorkspaceSchema>['body']
export type UpdateWorkspaceInput   = z.infer<typeof updateWorkspaceSchema>['body']
export type InviteMemberInput      = z.infer<typeof inviteMemberSchema>['body']
export type UpdateMemberRoleInput  = z.infer<typeof updateMemberRoleSchema>['body']