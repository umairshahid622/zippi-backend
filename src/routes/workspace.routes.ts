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

/**
 * @openapi
 * /workspaces:
 *   post:
 *     summary: Create a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Workspace created
 */
// ── Workspace CRUD ────────────────────────────
router.post(
  '/',
  validate(createWorkspaceSchema),
  WorkspaceController.create
)

/**
 * @openapi
 * /workspaces:
 *   get:
 *     summary: List workspaces for the current user
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 */
router.get(
  '/',
  WorkspaceController.getAll
)

/**
 * @openapi
 * /workspaces/{workspaceId}:
 *   get:
 *     summary: Get a workspace by ID
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace details
 */
router.get(
  '/:workspaceId',
  validate(workspaceIdParamSchema),
  WorkspaceController.getOne
)

/**
 * @openapi
 * /workspaces/{workspaceId}:
 *   patch:
 *     summary: Update a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace updated
 */
router.patch(
  '/:workspaceId',
  validate(updateWorkspaceSchema),
  WorkspaceController.update
)

/**
 * @openapi
 * /workspaces/{workspaceId}:
 *   delete:
 *     summary: Delete a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace deleted
 */
router.delete(
  '/:workspaceId',
  validate(workspaceIdParamSchema),
  WorkspaceController.remove
)

// ── Invites ────────────────────────────────────
// Note: accept invite before :workspaceId invites route
// to avoid route conflicts
/**
 * @openapi
 * /workspaces/invites/accept:
 *   post:
 *     summary: Accept a workspace invite
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invite accepted
 */
router.post(
  '/invites/accept',
  validate(acceptInviteSchema),
  WorkspaceController.acceptInvite
)

/**
 * @openapi
 * /workspaces/{workspaceId}/invites:
 *   post:
 *     summary: Invite a member to a workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite sent
 */
router.post(
  '/:workspaceId/invites',
  validate(inviteMemberSchema),
  WorkspaceController.invite
)

// ── Members ─────────────────────────────────────
/**
 * @openapi
 * /workspaces/{workspaceId}/members:
 *   get:
 *     summary: List workspace members
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace members returned
 */
router.get(
  '/:workspaceId/members',
  validate(workspaceIdParamSchema),
  WorkspaceController.getMembers
)

/**
 * @openapi
 * /workspaces/{workspaceId}/members/{userId}:
 *   patch:
 *     summary: Update a workspace member role
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member role updated
 */
router.patch(
  '/:workspaceId/members/:userId',
  validate(updateMemberRoleSchema),
  WorkspaceController.updateMemberRole
)

/**
 * @openapi
 * /workspaces/{workspaceId}/members/{userId}:
 *   delete:
 *     summary: Remove a workspace member
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete(
  '/:workspaceId/members/:userId',
  validate(removeMemberSchema),
  WorkspaceController.removeMember
)

export default router