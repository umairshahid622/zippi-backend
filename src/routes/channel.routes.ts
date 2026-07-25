import { Router }             from 'express'
import { ChannelController }  from '../controllers/channel.controller.js'
import { authMiddleware }     from '../middlewares/auth.middleware.js'
import { validate }           from '../middlewares/validate.middleware.js'
import {
  createChannelSchema,
  getChannelsSchema,
  channelIdParamSchema,
  updateChannelSchema,
  addChannelMemberSchema,
  removeChannelMemberSchema,
  createDmSchema,
  markAsReadSchema,
} from '../validators/channel.validator.js'
import messageRoutes from './message.routes.js'

// mergeParams lets this router access :workspaceId from the parent router
const router = Router({ mergeParams: true })

router.use(authMiddleware)

// ── Channel CRUD ───────────────────────────────
router.get(
  '/',
  validate(getChannelsSchema),
  ChannelController.getAll
)

router.get(
  '/public',
  validate(getChannelsSchema),
  ChannelController.getPublic
)

router.get(
  '/:channelId',
  validate(channelIdParamSchema),
  ChannelController.getOne
)

router.post(
  '/',
  validate(createChannelSchema),
  ChannelController.create
)

router.patch(
  '/:channelId',
  validate(updateChannelSchema),
  ChannelController.update
)

router.delete(
  '/:channelId',
  validate(channelIdParamSchema),
  ChannelController.archive
)

// ── Join / leave (public channels) ─────────────
router.post(
  '/:channelId/join',
  validate(channelIdParamSchema),
  ChannelController.join
)

router.post(
  '/:channelId/leave',
  validate(channelIdParamSchema),
  ChannelController.leave
)

// ── Members (private channels) ─────────────────
router.post(
  '/:channelId/members',
  validate(addChannelMemberSchema),
  ChannelController.addMember
)

router.delete(
  '/:channelId/members/:userId',
  validate(removeChannelMemberSchema),
  ChannelController.removeMember
)

// ── Direct messages ─────────────────────────────
router.post(
  '/dm',
  validate(createDmSchema),
  ChannelController.createDm
)

// ── Read receipts ────────────────────────────────
router.post(
  '/:channelId/read',
  validate(markAsReadSchema),
  ChannelController.markAsRead
)

router.use('/:channelId/messages', messageRoutes)


export default router