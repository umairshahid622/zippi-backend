import { Router }             from 'express'
import { MessageController }  from '../controllers/message.controller.js'
import { authMiddleware }     from '../middlewares/auth.middleware.js'
import { validate }           from '../middlewares/validate.middleware.js'
import {
  getMessagesSchema,
  sendMessageSchema,
  editMessageSchema,
  messageIdParamSchema,
  reactToMessageSchema,
  removeReactionSchema,
  getThreadRepliesSchema,
} from '../validators/message.validator.js'

const router = Router({ mergeParams: true })

router.use(authMiddleware)

// ── Messages CRUD ──────────────────────────────
router.get(
  '/',
  validate(getMessagesSchema),
  MessageController.getAll
)

router.post(
  '/',
  validate(sendMessageSchema),
  MessageController.send
)

router.patch(
  '/:messageId',
  validate(editMessageSchema),
  MessageController.edit
)

router.delete(
  '/:messageId',
  validate(messageIdParamSchema),
  MessageController.remove
)

// ── Threads ─────────────────────────────────────
router.get(
  '/:messageId/replies',
  validate(getThreadRepliesSchema),
  MessageController.getThreadReplies
)

// ── Pinning ──────────────────────────────────────
router.post(
  '/:messageId/pin',
  validate(messageIdParamSchema),
  MessageController.togglePin
)

router.get(
  '/pinned',
  MessageController.getPinned
)

// ── Decisions ────────────────────────────────────
router.post(
  '/:messageId/decision',
  validate(messageIdParamSchema),
  MessageController.toggleDecision
)

// ── Reactions ────────────────────────────────────
router.post(
  '/:messageId/reactions',
  validate(reactToMessageSchema),
  MessageController.addReaction
)

router.delete(
  '/:messageId/reactions/:emoji',
  validate(removeReactionSchema),
  MessageController.removeReaction
)

export default router