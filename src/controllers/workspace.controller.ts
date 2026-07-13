import type { Request, Response, NextFunction } from 'express'
import { WorkspaceService }                 from '../services/workspace.service.js'

export class WorkspaceController {

  // POST /api/workspaces
  static create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WorkspaceService.createWorkspace(req.user!.id, req.body)
      res.status(201).json(result)
    } catch (err) { next(err) }
  }

  // GET /api/workspaces
  static getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WorkspaceService.getUserWorkspaces(req.user!.id)
      res.status(200).json(result)
    } catch (err) { next(err) }
  }

  // GET /api/workspaces/:workspaceId
  static getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WorkspaceService.getWorkspace(
        req.params.workspaceId as string,
        req.user!.id,
      )
      res.status(200).json(result)
    } catch (err) { next(err) }
  }

  // PATCH /api/workspaces/:workspaceId
  static update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WorkspaceService.updateWorkspace(
        req.params.workspaceId as string,
        req.user!.id,
        req.body,
      )
      res.status(200).json(result)
    } catch (err) { next(err) }
  }

  // DELETE /api/workspaces/:workspaceId
  static remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WorkspaceService.deleteWorkspace(
        req.params.workspaceId as string,
        req.user!.id,
      )
      res.status(200).json(result)
    } catch (err) { next(err) }
  }

  // POST /api/workspaces/:workspaceId/invites
  static invite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WorkspaceService.inviteMember(
        req.params.workspaceId as string,
        req.user!.id,
        req.body,
      )
      res.status(201).json(result)
    } catch (err) { next(err) }
  }

  // POST /api/workspaces/invites/accept
  static acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WorkspaceService.acceptInvite(req.user!.id, req.body.token)
      res.status(200).json(result)
    } catch (err) { next(err) }
  }

  // GET /api/workspaces/:workspaceId/members
static getMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WorkspaceService.getMembers(
        req.params.workspaceId as string,
        req.user!.id,
      )
      res.status(200).json(result)
    } catch (err) { next(err) }
  }

  // PATCH /api/workspaces/:workspaceId/members/:userId
  static updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WorkspaceService.updateMemberRole(
        req.params.workspaceId as string,
        req.user!.id,
        req.params.userId as string,
        req.body,
      )
      res.status(200).json(result)
    } catch (err) { next(err) }
  }

  // DELETE /api/workspaces/:workspaceId/members/:userId
  static removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await WorkspaceService.removeMember(
        req.params.workspaceId as string,
        req.user!.id,
        req.params.userId as string,
      )
      res.status(200).json(result)
    } catch (err) { next(err) }
  }
}