import type { Request, Response, NextFunction } from "express";
import { ChannelService } from "../services/channel.service.js";

export class ChannelController {
  // GET /api/workspaces/:workspaceId/channels
  static getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ChannelService.getWorkspaceChannels(
        req.params.workspaceId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/workspaces/:workspaceId/channels/public
  static getPublic = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await ChannelService.getPublicChannels(
        req.params.workspaceId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/workspaces/:workspaceId/channels/:channelId
  static getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ChannelService.getChannel(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/workspaces/:workspaceId/channels
  static create = async (req: Request, res: Response, next: NextFunction) => {
    try {
    
      const result = await ChannelService.createChannel(
        req.params.workspaceId as string,
        req.user!.id,
        req.body,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  // PATCH /api/workspaces/:workspaceId/channels/:channelId
  static update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ChannelService.updateChannel(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
        req.body,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/workspaces/:workspaceId/channels/:channelId
  static archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ChannelService.archiveChannel(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/workspaces/:workspaceId/channels/:channelId/join
  static join = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ChannelService.joinChannel(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/workspaces/:workspaceId/channels/:channelId/leave
  static leave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ChannelService.leaveChannel(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/workspaces/:workspaceId/channels/:channelId/members
  static addMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await ChannelService.addMember(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
        req.body.userId,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/workspaces/:workspaceId/channels/:channelId/members/:userId
  static removeMember = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await ChannelService.removeMember(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
        req.params.userId as string,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/workspaces/:workspaceId/channels/dm
  static createDm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ChannelService.getOrCreateDm(
        req.params.workspaceId as string,
        req.user!.id,
        req.body.targetUserId,
      );
      res.status(result.isNew ? 201 : 200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/workspaces/:workspaceId/channels/:channelId/read
  static markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await ChannelService.markAsRead(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
