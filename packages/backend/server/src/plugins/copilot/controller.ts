import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
  Sse,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  catchError,
  concatMap,
  connect,
  EMPTY,
  from,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  switchMap,
  toArray,
} from 'rxjs';

import { Public } from '../../core/auth';
import { CurrentUser } from '../../core/auth/current-user';
import { Config } from '../../fundamentals';
import { CopilotProviderService } from './providers';
import { ChatSession, ChatSessionService } from './session';
import { CopilotStorage } from './storage';
import { CopilotCapability } from './types';

export interface ChatEvent {
  type: 'attachment' | 'message' | 'error';
  id?: string;
  data: string;
}

type CheckResult = {
  model: string | undefined;
  hasAttachment?: boolean;
};

@Controller('/api/copilot')
export class CopilotController {
  private readonly logger = new Logger(CopilotController.name);

  constructor(
    private readonly config: Config,
    private readonly chatSession: ChatSessionService,
    private readonly provider: CopilotProviderService,
    private readonly storage: CopilotStorage
  ) {}

  private async checkRequest(
    userId: string,
    sessionId: string,
    messageId?: string
  ): Promise<CheckResult> {
    await this.chatSession.checkQuota(userId);
    const session = await this.chatSession.get(sessionId);
    if (!session || session.config.userId !== userId) {
      throw new BadRequestException('Session not found');
    }

    const ret: CheckResult = { model: session.model };

    if (messageId) {
      const message = await session.getMessageById(messageId);
      ret.hasAttachment =
        Array.isArray(message.attachments) && !!message.attachments.length;
    }

    return ret;
  }

  private async appendSessionMessage(
    sessionId: string,
    messageId: string
  ): Promise<ChatSession> {
    const session = await this.chatSession.get(sessionId);
    if (!session) {
      throw new BadRequestException('Session not found');
    }

    await session.pushByMessageId(messageId);

    return session;
  }

  private getSignal(req: Request) {
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    return controller.signal;
  }

  private parseNumber(value: string | string[] | undefined) {
    if (!value) {
      return undefined;
    }
    const num = Number.parseInt(Array.isArray(value) ? value[0] : value, 10);
    if (Number.isNaN(num)) {
      return undefined;
    }
    return num;
  }

  private handleError(err: any) {
    if (err instanceof Error) {
      const ret = {
        message: err.message,
        status: (err as any).status,
      };
      if (err instanceof HttpException) {
        ret.status = err.getStatus();
      }
    }
    return err;
  }

  @Get('/chat/:sessionId')
  async chat(
    @CurrentUser() user: CurrentUser,
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Query('messageId') messageId: string,
    @Query() params: Record<string, string | string[]>
  ): Promise<string> {
    const { model } = await this.checkRequest(user.id, sessionId);
    const provider = await this.provider.getProviderByCapability(
      CopilotCapability.TextToText,
      model
    );
    if (!provider) {
      throw new InternalServerErrorException('No provider available');
    }

    const session = await this.appendSessionMessage(sessionId, messageId);

    try {
      delete params.messageId;
      const content = await provider.generateText(
        session.finish(params),
        session.model,
        {
          signal: this.getSignal(req),
          user: user.id,
        }
      );

      session.push({
        role: 'assistant',
        content,
        createdAt: new Date(),
      });
      await session.save();

      return content;
    } catch (e: any) {
      throw new InternalServerErrorException(
        e.message || "Couldn't generate text"
      );
    }
  }

  @Sse('/chat/:sessionId/stream')
  async chatStream(
    @CurrentUser() user: CurrentUser,
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Query('messageId') messageId: string,
    @Query() params: Record<string, string>
  ): Promise<Observable<ChatEvent>> {
    try {
      const { model } = await this.checkRequest(user.id, sessionId);
      const provider = await this.provider.getProviderByCapability(
        CopilotCapability.TextToText,
        model
      );
      if (!provider) {
        throw new InternalServerErrorException('No provider available');
      }

      const session = await this.appendSessionMessage(sessionId, messageId);
      delete params.messageId;

      return from(
        provider.generateTextStream(session.finish(params), session.model, {
          signal: this.getSignal(req),
          user: user.id,
        })
      ).pipe(
        connect(shared$ =>
          merge(
            // actual chat event stream
            shared$.pipe(
              map(data => ({ type: 'message' as const, id: messageId, data }))
            ),
            // save the generated text to the session
            shared$.pipe(
              toArray(),
              concatMap(values => {
                session.push({
                  role: 'assistant',
                  content: values.join(''),
                  createdAt: new Date(),
                });
                return from(session.save());
              }),
              switchMap(() => EMPTY)
            )
          )
        ),
        catchError(err =>
          of({
            type: 'error' as const,
            data: this.handleError(err),
          })
        )
      );
    } catch (err) {
      return of({
        type: 'error' as const,
        data: this.handleError(err),
      });
    }
  }

  @Sse('/chat/:sessionId/images')
  async chatImagesStream(
    @CurrentUser() user: CurrentUser,
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Query('messageId') messageId: string,
    @Query() params: Record<string, string>
  ): Promise<Observable<ChatEvent>> {
    try {
      const { model, hasAttachment } = await this.checkRequest(
        user.id,
        sessionId,
        messageId
      );
      const provider = await this.provider.getProviderByCapability(
        hasAttachment
          ? CopilotCapability.ImageToImage
          : CopilotCapability.TextToImage,
        model
      );
      if (!provider) {
        throw new InternalServerErrorException('No provider available');
      }

      const session = await this.appendSessionMessage(sessionId, messageId);
      delete params.messageId;

      const handleRemoteLink = this.storage.handleRemoteLink.bind(
        this.storage,
        user.id,
        sessionId
      );

      return from(
        provider.generateImagesStream(session.finish(params), session.model, {
          seed: this.parseNumber(params.seed),
          signal: this.getSignal(req),
          user: user.id,
        })
      ).pipe(
        mergeMap(handleRemoteLink),
        connect(shared$ =>
          merge(
            // actual chat event stream
            shared$.pipe(
              map(attachment => ({
                type: 'attachment' as const,
                id: messageId,
                data: attachment,
              }))
            ),
            // save the generated text to the session
            shared$.pipe(
              toArray(),
              concatMap(attachments => {
                session.push({
                  role: 'assistant',
                  content: '',
                  attachments: attachments,
                  createdAt: new Date(),
                });
                return from(session.save());
              }),
              switchMap(() => EMPTY)
            )
          )
        ),
        catchError(err =>
          of({
            type: 'error' as const,
            data: this.handleError(err),
          })
        )
      );
    } catch (err) {
      return of({
        type: 'error' as const,
        data: this.handleError(err),
      });
    }
  }

  @Get('/unsplash/photos')
  async unsplashPhotos(
    @Req() req: Request,
    @Res() res: Response,
    @Query() params: Record<string, string>
  ) {
    const { unsplashKey } = this.config.plugins.copilot || {};
    if (!unsplashKey) {
      throw new InternalServerErrorException('Unsplash key is not configured');
    }

    const query = new URLSearchParams(params);
    const response = await fetch(
      `https://api.unsplash.com/search/photos?${query}`,
      {
        headers: { Authorization: `Client-ID ${unsplashKey}` },
        signal: this.getSignal(req),
      }
    );

    res.set({
      'Content-Type': response.headers.get('Content-Type'),
      'Content-Length': response.headers.get('Content-Length'),
      'X-Ratelimit-Limit': response.headers.get('X-Ratelimit-Limit'),
      'X-Ratelimit-Remaining': response.headers.get('X-Ratelimit-Remaining'),
    });

    res.status(response.status).send(await response.json());
  }

  @Public()
  @Get('/blob/:userId/:workspaceId/:key')
  async getBlob(
    @Res() res: Response,
    @Param('userId') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('key') key: string
  ) {
    const { body, metadata } = await this.storage.get(userId, workspaceId, key);

    if (!body) {
      throw new NotFoundException(
        `Blob not found in ${userId}'s workspace ${workspaceId}: ${key}`
      );
    }

    // metadata should always exists if body is not null
    if (metadata) {
      res.setHeader('content-type', metadata.contentType);
      res.setHeader('last-modified', metadata.lastModified.toUTCString());
      res.setHeader('content-length', metadata.contentLength);
    } else {
      this.logger.warn(`Blob ${workspaceId}/${key} has no metadata`);
    }

    res.setHeader('cache-control', 'public, max-age=2592000, immutable');
    body.pipe(res);
  }
}
