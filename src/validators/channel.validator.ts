import { z } from "zod";

export const createChannelSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid("Invalid workspace ID"),
  }),
  body: z.object({
    name: z
      .string()
      .min(1, "Channel name is required")
      .max(80, "Channel name must be under 80 characters")
      .regex(
        /^[a-z0-9-]+$/,
        "Channel name can only contain lowercase letters, numbers, and dashes",
      )
      .trim(),
    description: z.string().max(250).optional(),
    isPrivate: z.boolean().default(false),
  }),
});

export const getChannelsSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid("Invalid workspace ID"),
  }),
});

export const channelIdParamSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid("Invalid workspace ID"),
    channelId: z.string().uuid("Invalid channel ID"),
  }),
});

export const updateChannelSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid("Invalid workspace ID"),
    channelId: z.string().uuid("Invalid channel ID"),
  }),
  body: z.object({
    name: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/)
      .trim()
      .optional(),
    description: z.string().max(250).optional(),
  }),
});

export const addChannelMemberSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid("Invalid workspace ID"),
    channelId: z.string().uuid("Invalid channel ID"),
  }),
  body: z.object({
    userId: z.string().uuid("Invalid user ID"),
  }),
});

export const removeChannelMemberSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid("Invalid workspace ID"),
    channelId: z.string().uuid("Invalid channel ID"),
    userId: z.string().uuid("Invalid user ID"),
  }),
});

export const createDmSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid("Invalid workspace ID"),
  }),
  body: z.object({
    targetUserId: z.string().uuid("Invalid user ID"),
  }),
});

export const markAsReadSchema = z.object({
  params: z.object({
    workspaceId: z.string().uuid("Invalid workspace ID"),
    channelId: z.string().uuid("Invalid channel ID"),
  }),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>["body"];
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>["body"];
