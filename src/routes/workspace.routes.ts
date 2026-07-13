import { Router }               from 'express'
import { WorkspaceController }  from '../controllers/workspace.controller.js'
import { authMiddleware }       from '../middlewares/auth.middleware.js'
import { validate }             from '../middlewares/validate.middleware.js'
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
  inviteMemberSchema,
  acceptInviteSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} from '../validators/workspace.validator.js'

const router = Router()

// All workspace routes require authentication
router.use(authMiddleware)

// ── Workspace CRUD ────────────────────────────
router.post(
  '/',
  validate(createWorkspaceSchema),
  WorkspaceController.create
)

router.get(
  '/',
  WorkspaceController.getAll
)

router.get(
  '/:workspaceId',
  validate(workspaceIdParamSchema),
  WorkspaceController.getOne
)

router.patch(
  '/:workspaceId',
  validate(updateWorkspaceSchema),
  WorkspaceController.update
)

router.delete(
  '/:workspaceId',
  validate(workspaceIdParamSchema),
  WorkspaceController.remove
)

// ── Invites ────────────────────────────────────
// Note: accept invite before :workspaceId invites route
// to avoid route conflicts
router.post(
  '/invites/accept',
  validate(acceptInviteSchema),
  WorkspaceController.acceptInvite
)

router.post(
  '/:workspaceId/invites',
  validate(inviteMemberSchema),
  WorkspaceController.invite
)

// ── Members ─────────────────────────────────────
router.get(
  '/:workspaceId/members',
  validate(workspaceIdParamSchema),
  WorkspaceController.getMembers
)

router.patch(
  '/:workspaceId/members/:userId',
  validate(updateMemberRoleSchema),
  WorkspaceController.updateMemberRole
)

router.delete(
  '/:workspaceId/members/:userId',
  validate(removeMemberSchema),
  WorkspaceController.removeMember
)

export default router