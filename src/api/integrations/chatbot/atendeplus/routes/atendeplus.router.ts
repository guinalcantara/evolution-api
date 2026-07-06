import { RouterBroker } from '@api/abstract/abstract.router';
import { InstanceDto } from '@api/dto/instance.dto';
import { AtendePlusDto } from '@api/integrations/chatbot/atendeplus/dto/atendeplus.dto';
import { HttpStatus } from '@api/routes/index.router';
import { atendePlusController } from '@api/server.module';
import { atendePlusSchema } from '@api/integrations/chatbot/atendeplus/validate/atendeplus.schema';
import { RequestHandler, Router } from 'express';
import { asyncHandler } from '@api/lib/async';

export class AtendePlusRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router
      .post(this.routerPath('set'), ...guards, async (req, res) => {
        const response = await this.dataValidate<AtendePlusDto>({
          request: req,
          schema: atendePlusSchema,
          ClassRef: AtendePlusDto,
          execute: (instance, data) => atendePlusController.createAtendePlus(instance, data),
        });

        res.status(HttpStatus.CREATED).json(response);
      })
      .get(this.routerPath('find'), ...guards, asyncHandler(async (req, res) => {
        const response = await atendePlusController.findAtendePlus(req.params as unknown as InstanceDto);
        res.status(HttpStatus.OK).json(response);
      }))
      .post(this.routerPath('test'), ...guards, async (req, res) => {
        const response = await this.dataValidate<AtendePlusDto>({
          request: req,
          schema: atendePlusSchema,
          ClassRef: AtendePlusDto,
          execute: (_instance, data) => atendePlusController.testConnection(data),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('webhook'), asyncHandler(async (req, res) => {
        const response = await atendePlusController.receiveWebhook(req.params as unknown as InstanceDto, req.body);
        res.status(HttpStatus.OK).json(response);
      }));
  }

  public readonly router: Router = Router();
}
