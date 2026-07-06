import fs from 'node:fs/promises';
import path from 'node:path';

import axios from 'axios';

import { InstanceDto } from '@api/dto/instance.dto';
import { AtendePlusDto } from '@api/integrations/chatbot/atendeplus/dto/atendeplus.dto';
import { ConfigService, HttpServer } from '@config/env.config';
import { Logger } from '@config/logger.config';
import { BadRequestException } from '@exceptions';
import { STORE_DIR } from '@config/path.config';

const normalizeUrl = (value: string) => value.replace(/\/+$/, '');

const readString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const safeInstanceFolder = (instanceName: string) => encodeURIComponent(instanceName);

export class AtendePlusService {
  private readonly logger = new Logger('AtendePlusService');

  constructor(private readonly configService: ConfigService) {}

  private getStorePath(instanceName: string) {
    return path.join(STORE_DIR, 'atendeplus', safeInstanceFolder(instanceName), 'config.json');
  }

  private async ensureDir(instanceName: string) {
    await fs.mkdir(path.dirname(this.getStorePath(instanceName)), { recursive: true });
  }

  private async readConfig(instanceName: string): Promise<AtendePlusDto | null> {
    try {
      const raw = await fs.readFile(this.getStorePath(instanceName), 'utf8');
      return JSON.parse(raw) as AtendePlusDto;
    } catch {
      return null;
    }
  }

  private async writeConfig(instanceName: string, data: AtendePlusDto) {
    await this.ensureDir(instanceName);
    await fs.writeFile(this.getStorePath(instanceName), JSON.stringify(data, null, 2), 'utf8');
  }

  public async create(instance: InstanceDto, data: AtendePlusDto) {
    const payload: AtendePlusDto = {
      enabled: data.enabled,
      accountId: data.accountId,
      token: data.token,
      url: data.url ? normalizeUrl(data.url) : data.url,
      nameInbox: data.nameInbox || instance.instanceName,
      webhookUrl:
        data.webhookUrl ||
        `${this.configService.get<HttpServer>('SERVER').URL}/atendeplus/webhook/${encodeURIComponent(instance.instanceName)}`,
      autoCreate: data.autoCreate ?? false,
    };

    await this.writeConfig(instance.instanceName, payload);
    return payload;
  }

  public async find(instance: InstanceDto): Promise<AtendePlusDto | null> {
    return this.readConfig(instance.instanceName);
  }

  public async testConnection(data: AtendePlusDto) {
    const url = readString(data.url);
    const token = readString(data.token);
    const accountId = readString(data.accountId);

    if (!url) {
      throw new BadRequestException('url is required');
    }

    if (!token) {
      throw new BadRequestException('token is required');
    }

    const client = axios.create({
      baseURL: normalizeUrl(url),
      timeout: 15000,
      headers: {
        apikey: token,
        'x-api-key': token,
        'x-bridge-token': token,
        'api_access_token': token,
        Authorization: `Bearer ${token}`,
      },
    });

    if (accountId) {
      const response = await client.get(`/api/v1/accounts/${encodeURIComponent(accountId)}/inboxes`);
      return {
        ok: true,
        status: response.status,
        payload: response.data,
      };
    }

    const response = await client.get('/health');
    return {
      ok: true,
      status: response.status,
      payload: response.data,
    };
  }

  public async receiveWebhook(instance: InstanceDto, data: any) {
    this.logger.log(`Webhook received for ${instance.instanceName}`);
    return {
      ok: true,
      received: true,
      data,
    };
  }
}
