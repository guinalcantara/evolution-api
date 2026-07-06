import { InstanceDto } from '@api/dto/instance.dto';
import { AtendePlusDto } from '@api/integrations/chatbot/atendeplus/dto/atendeplus.dto';
import { AtendePlusService } from '@api/integrations/chatbot/atendeplus/services/atendeplus.service';
import { ConfigService, HttpServer } from '@config/env.config';
import { BadRequestException } from '@exceptions';
import { isURL } from 'class-validator';

export class AtendePlusController {
  constructor(
    private readonly atendePlusService: AtendePlusService,
    private readonly configService: ConfigService,
  ) {}

  public async createAtendePlus(instance: InstanceDto, data: AtendePlusDto) {
    if (data?.enabled) {
      if (!isURL(data.url, { require_tld: false })) {
        throw new BadRequestException('url is not valid');
      }


      if (!data.token) {
        throw new BadRequestException('token is required');
      }
    }

    if (!data.nameInbox || data.nameInbox === '') {
      data.nameInbox = instance.instanceName;
    }

    const result = await this.atendePlusService.create(instance, data);
    const urlServer = this.configService.get<HttpServer>('SERVER').URL;

    return {
      ...result,
      webhook_url: `${urlServer}/atendeplus/webhook/${encodeURIComponent(instance.instanceName)}`,
    };
  }

  public async findAtendePlus(instance: InstanceDto): Promise<AtendePlusDto & { webhook_url: string }> {
    const result = await this.atendePlusService.find(instance);
    const urlServer = this.configService.get<HttpServer>('SERVER').URL;

    if (Object.keys(result || {}).length === 0) {
      return {
        enabled: false,
        url: '',
        accountId: '',
        token: '',
        nameInbox: '',
        webhook_url: `${urlServer}/atendeplus/webhook/${encodeURIComponent(instance.instanceName)}`,
        autoCreate: false,
      };
    }

    return {
      ...result,
      webhook_url: `${urlServer}/atendeplus/webhook/${encodeURIComponent(instance.instanceName)}`,
    };
  }

  public async testConnection(data: AtendePlusDto) {
    if (!data.url || !isURL(data.url, { require_tld: false })) {
      throw new BadRequestException('url is not valid');
    }

    if (!data.token) {
      throw new BadRequestException('token is required');
    }

    return this.atendePlusService.testConnection(data);
  }

  public async receiveWebhook(instance: InstanceDto, data: any) {
    return this.atendePlusService.receiveWebhook(instance, data);
  }
}


