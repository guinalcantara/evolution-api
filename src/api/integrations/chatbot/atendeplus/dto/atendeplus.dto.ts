import { Constructor } from '@api/integrations/integration.dto';

export class AtendePlusDto {
  enabled?: boolean;
  accountId?: string;
  token?: string;
  url?: string;
  nameInbox?: string;
  webhookUrl?: string;
  autoCreate?: boolean;
}

export function AtendePlusInstanceMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    atendePlusEnabled?: boolean;
    atendePlusAccountId?: string;
    atendePlusToken?: string;
    atendePlusUrl?: string;
    atendePlusNameInbox?: string;
    atendePlusWebhookUrl?: string;
    atendePlusAutoCreate?: boolean;
  };
}
