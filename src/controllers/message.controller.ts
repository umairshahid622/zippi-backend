import type { Request, Response, NextFunction } from "express";
import { MessageService } from "../services/message.service.js";

export class MessageController {
  static getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await MessageService.getMessages(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
        req.query as any,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  static getThreadReplies = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await MessageService.getThreadReplies(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.params.messageId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  static send = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await MessageService.sendMessage(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
        req.body,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  static edit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await MessageService.editMessage(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.params.messageId as string,
        req.user!.id,
        req.body,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  static remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await MessageService.deleteMessage(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.params.messageId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  static togglePin = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await MessageService.togglePin(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.params.messageId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  static getPinned = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await MessageService.getPinnedMessages(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  static toggleDecision = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await MessageService.toggleDecision(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.params.messageId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  static getDecisions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await MessageService.getWorkspaceDecisions(
        req.params.workspaceId as string,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  static addReaction = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await MessageService.addReaction(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.params.messageId as string,
        req.user!.id,
        req.body.emoji,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  static removeReaction = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await MessageService.removeReaction(
        req.params.workspaceId as string,
        req.params.channelId as string,
        req.params.messageId as string,
        req.user!.id,
        req.params.emoji as string,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
