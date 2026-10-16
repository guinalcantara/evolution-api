export type ChatwootInteractiveActionType = 'select' | 'url' | 'call' | 'copy' | 'payment' | 'unknown';

export interface ChatwootConversationButtonOption {
  index: number;
  id: string;
  label: string;
  actionType: ChatwootInteractiveActionType;
  cardIndex?: number;
  sectionIndex?: number;
  sectionTitle?: string;
}

export interface ChatwootInteractiveAction {
  type: Exclude<ChatwootInteractiveActionType, 'select'>;
  label: string;
  rawParamsJson?: string;
}

export interface ChatwootInteractiveMedia {
  type: string;
  content: Record<string, unknown>;
  cardIndex?: number;
}

export interface ChatwootInteractiveCard {
  index: number;
  title?: string;
  body?: string;
}

export interface ChatwootInteractiveResponse {
  family: string;
  id?: string;
  label?: string;
  bodyText?: string;
  flowName?: string;
  flowVersion?: string;
  cardIndex?: number;
  rawParamsJson?: string;
  params?: unknown;
  paramsParseError?: string;
  contextInfo?: Record<string, unknown>;
}

export interface ChatwootNormalizedMessage {
  content: Record<string, unknown>;
  family?: string;
  variant?: string;
  wrapperPath: string[];
  title?: string;
  body?: string;
  footer?: string;
  options: ChatwootConversationButtonOption[];
  actions: ChatwootInteractiveAction[];
  cards: ChatwootInteractiveCard[];
  media: ChatwootInteractiveMedia[];
  response?: ChatwootInteractiveResponse;
  contextInfo?: Record<string, unknown>;
  partial: boolean;
  isInteractive: boolean;
  isMedia: boolean;
  isContent: boolean;
  fallbackType?: string;
}

interface ParsedJson {
  raw?: string;
  value?: unknown;
  error?: string;
}

const MAX_JSON_PARAMETER_LENGTH = 20_000;
const WRAPPER_TYPES = [
  'ephemeralMessage',
  'viewOnceMessage',
  'viewOnceMessageV2',
  'viewOnceMessageV2Extension',
  'associatedChildMessage',
  'deviceSentMessage',
] as const;
const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage'] as const;
const RESPONSE_TYPES = [
  'buttonsResponseMessage',
  'templateButtonReplyMessage',
  'listResponseMessage',
  'interactiveResponseMessage',
] as const;
const INTERACTIVE_TYPES = [
  'buttonsMessage',
  'templateMessage',
  'interactiveMessage',
  'listMessage',
  ...RESPONSE_TYPES,
] as const;
const NON_CONTENT_TYPES = new Set([
  'messageContextInfo',
  'protocolMessage',
  'reactionMessage',
  'pollUpdateMessage',
  'senderKeyDistributionMessage',
  'keepInChatMessage',
  'pinInChatMessage',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const firstNonEmptyRecord = (...values: unknown[]) =>
  values.map(asRecord).find((value) => Object.keys(value).length > 0) ?? {};

const asText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const text = value.trim();
  return text || undefined;
};

const firstText = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const text = asText(value);
    if (text) {
      return text;
    }
  }

  return undefined;
};

const structuredText = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const directValue = firstText(value);
    if (directValue) {
      return directValue;
    }

    const structuredValue = asRecord(value);
    const fallback = firstText(
      structuredValue.fallbackLg,
      structuredValue.fallbackLc,
      structuredValue.deterministicLg,
      structuredValue.elementName,
    );
    if (fallback) {
      return fallback;
    }
  }

  return undefined;
};

const valueAt = (value: unknown, ...path: string[]): unknown => {
  let current: unknown = value;

  for (const part of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
};

const stringFromKeys = (value: unknown, keys: string[]): string | undefined => {
  const record = asRecord(value);

  for (const key of keys) {
    const text = asText(record[key]);
    if (text) {
      return text;
    }
  }

  return undefined;
};

const parseJson = (value: unknown): ParsedJson => {
  if (typeof value !== 'string') {
    return {};
  }

  if (!value.trim()) {
    return { raw: value, error: 'empty_json' };
  }

  if (value.length > MAX_JSON_PARAMETER_LENGTH) {
    return { raw: value, error: 'json_too_large' };
  }

  try {
    return { raw: value, value: JSON.parse(value) as unknown };
  } catch {
    return { raw: value, error: 'invalid_json' };
  }
};

const hasMessageContent = (message: Record<string, unknown>, family?: string) => {
  if (family && !NON_CONTENT_TYPES.has(family)) {
    return true;
  }

  return Object.keys(message).some((key) => key.endsWith('Message') && !NON_CONTENT_TYPES.has(key));
};

export class ChatwootMessageNormalizer {
  private readonly maxWrapperDepth = 8;

  public normalize(input: unknown): ChatwootNormalizedMessage {
    const envelope = asRecord(input);
    const initial = isRecord(envelope.message) ? envelope.message : envelope;
    const wrapperPath: string[] = [];
    const contexts: Record<string, unknown>[] = [];
    let content = initial;

    for (let depth = 0; depth < this.maxWrapperDepth; depth++) {
      const contextInfo = asRecord(content.contextInfo);
      if (Object.keys(contextInfo).length > 0) {
        contexts.push(contextInfo);
      }

      const wrapperType = WRAPPER_TYPES.find(
        (type) => isRecord(content[type]) && isRecord(asRecord(content[type]).message),
      );
      if (!wrapperType) {
        break;
      }

      wrapperPath.push(wrapperType);
      content = asRecord(asRecord(content[wrapperType]).message);
    }

    const family = this.detectFamily(content);
    const normalized: ChatwootNormalizedMessage = {
      content,
      family,
      wrapperPath,
      options: [],
      actions: [],
      cards: [],
      media: [],
      contextInfo: contexts[contexts.length - 1] ?? asRecord(envelope.contextInfo),
      partial: wrapperPath.length === this.maxWrapperDepth,
      isInteractive: Boolean(family && INTERACTIVE_TYPES.includes(family as (typeof INTERACTIVE_TYPES)[number])),
      isMedia: false,
      isContent: hasMessageContent(content, family),
    };

    if (!family) {
      normalized.fallbackType = this.detectUnknownType(content);
      return normalized;
    }

    switch (family) {
      case 'buttonsMessage':
        this.normalizeButtonsMessage(normalized, asRecord(content.buttonsMessage));
        break;
      case 'templateMessage':
        this.normalizeTemplateMessage(normalized, asRecord(content.templateMessage));
        break;
      case 'interactiveMessage':
        this.normalizeInteractiveMessage(normalized, asRecord(content.interactiveMessage));
        break;
      case 'listMessage':
        this.normalizeListMessage(normalized, asRecord(content.listMessage));
        break;
      case 'buttonsResponseMessage':
      case 'templateButtonReplyMessage':
      case 'listResponseMessage':
      case 'interactiveResponseMessage':
        this.normalizeResponse(normalized, family, asRecord(content[family]));
        break;
      default:
        this.collectMedia(normalized, content);
    }

    normalized.isMedia = normalized.media.length > 0;
    return normalized;
  }

  public getSelectableOptions(input: unknown) {
    return this.normalize(input).options;
  }

  public findSelectedOption(input: unknown, options: ChatwootConversationButtonOption[]) {
    const response = this.normalize(input).response;
    if (!response || options.length === 0) {
      return null;
    }

    if (response.id) {
      const selectedById = options.find((option) => option.id === response.id);
      if (selectedById) {
        return selectedById;
      }
    }

    if (response.label) {
      return options.find((option) => option.label === response.label) ?? null;
    }

    return null;
  }

  public renderForChatwoot(message: ChatwootNormalizedMessage) {
    if (message.response) {
      const selected = message.response.label ?? message.response.id ?? message.response.bodyText;
      const flowName = message.response.flowName ? ` (${message.response.flowName})` : '';

      return selected ? `*Opção selecionada${flowName}:*\n\n${selected}` : `*Resposta interativa recebida${flowName}*`;
    }

    if (!message.isInteractive) {
      return message.fallbackType
        ? `[Mensagem do WhatsApp com formato ainda não suportado: ${message.fallbackType}]`
        : undefined;
    }

    const parts: string[] = [];
    if (message.title) {
      parts.push(`*${message.title}*`);
    }
    if (message.body && message.body !== message.title) {
      parts.push(message.body);
    }

    if (message.cards.length > 0) {
      parts.push(
        message.cards
          .map((card) => {
            const cardContent = [card.title, card.body].filter(Boolean).join('\n');
            return cardContent ? `*Cartão ${card.index + 1}*\n${cardContent}` : `*Cartão ${card.index + 1}*`;
          })
          .join('\n\n'),
      );
    }

    if (message.options.length > 0) {
      const groupedOptions = new Map<string, ChatwootConversationButtonOption[]>();
      for (const option of message.options) {
        const group = option.sectionTitle ?? (option.cardIndex !== undefined ? `Cartão ${option.cardIndex + 1}` : '');
        const options = groupedOptions.get(group) ?? [];
        options.push(option);
        groupedOptions.set(group, options);
      }

      const renderedOptions = [...groupedOptions.entries()]
        .map(([group, options]) => {
          const header = group ? `*${group}*\n` : '';
          return `${header}${options.map((option) => `${option.index} - ${option.label}`).join('\n')}`;
        })
        .join('\n\n');
      parts.push(renderedOptions);
      parts.push('_Responda com o número da opção._');
    }

    if (message.actions.length > 0) {
      parts.push(message.actions.map((action) => `_Ação ${action.type}:_ ${action.label}`).join('\n'));
    }

    if (message.footer) {
      parts.push(`_${message.footer}_`);
    }

    if (message.partial) {
      parts.push(`_[Conteúdo do WhatsApp parcialmente suportado: ${message.variant ?? message.family}]_`);
    }

    if (parts.length > 0) {
      return parts.join('\n\n');
    }

    return `[Mensagem do WhatsApp com formato ainda não suportado: ${message.variant ?? message.family ?? 'desconhecido'}]`;
  }

  private detectFamily(message: Record<string, unknown>) {
    const knownFamilies = [
      'conversation',
      'extendedTextMessage',
      'imageMessage',
      'videoMessage',
      'documentMessage',
      'documentWithCaptionMessage',
      'audioMessage',
      'contactMessage',
      'contactsArrayMessage',
      'locationMessage',
      'liveLocationMessage',
      'buttonsMessage',
      'buttonsResponseMessage',
      'templateMessage',
      'templateButtonReplyMessage',
      'interactiveMessage',
      'interactiveResponseMessage',
      'listMessage',
      'listResponseMessage',
      'stickerMessage',
    ];

    return knownFamilies.find((family) => message[family] !== undefined);
  }

  private detectUnknownType(message: Record<string, unknown>) {
    return Object.keys(message).find((key) => key.endsWith('Message') && !NON_CONTENT_TYPES.has(key));
  }

  private normalizeButtonsMessage(message: ChatwootNormalizedMessage, value: Record<string, unknown>) {
    message.variant = 'buttonsMessage';
    message.title = firstText(value.headerText, value.contentText);
    message.body = firstText(value.contentText, value.text);
    message.footer = firstText(value.footerText);
    this.collectMedia(message, value);

    for (const button of asArray(value.buttons)) {
      const buttonValue = asRecord(button);
      const buttonText = asRecord(buttonValue.buttonText);
      this.addOption(message, {
        id: firstText(buttonValue.buttonId, buttonValue.id) ?? String(message.options.length + 1),
        label:
          firstText(buttonText.displayText, buttonValue.buttonText, buttonValue.displayText) ??
          `Opção ${message.options.length + 1}`,
        actionType: 'select',
      });
    }
  }

  private normalizeTemplateMessage(message: ChatwootNormalizedMessage, value: Record<string, unknown>) {
    const hydratedTemplate = asRecord(value.hydratedTemplate);
    const hydratedFourRowTemplate = asRecord(value.hydratedFourRowTemplate);
    const fourRowTemplate = asRecord(value.fourRowTemplate);
    const interactiveMessageTemplate = asRecord(value.interactiveMessageTemplate);

    if (Object.keys(interactiveMessageTemplate).length > 0) {
      this.normalizeInteractiveMessage(message, interactiveMessageTemplate);
      message.variant = 'interactiveMessageTemplate';
      return;
    }

    const template = firstNonEmptyRecord(hydratedTemplate, hydratedFourRowTemplate, fourRowTemplate);

    message.variant =
      Object.keys(hydratedTemplate).length > 0
        ? 'hydratedTemplate'
        : Object.keys(hydratedFourRowTemplate).length > 0
          ? 'hydratedFourRowTemplate'
          : Object.keys(fourRowTemplate).length > 0
            ? 'fourRowTemplate'
            : 'templateMessage';
    message.title = structuredText(
      template.hydratedTitleText,
      template.title,
      valueAt(template, 'highlyStructuredMessage'),
      valueAt(template, 'header', 'text'),
    );
    message.body = structuredText(
      template.hydratedContentText,
      template.contentText,
      template.text,
      valueAt(template, 'content'),
      valueAt(template, 'body', 'text'),
    );
    message.footer = structuredText(
      template.hydratedFooterText,
      template.footerText,
      valueAt(template, 'footer'),
      valueAt(template, 'footer', 'text'),
    );
    this.collectMedia(message, template);

    const buttons =
      asArray(template.hydratedButtons).length > 0 ? asArray(template.hydratedButtons) : asArray(template.buttons);
    for (const button of buttons) {
      this.addTemplateButton(message, asRecord(button));
    }

    if (buttons.length === 0) {
      message.partial = true;
    }
  }

  private addTemplateButton(message: ChatwootNormalizedMessage, button: Record<string, unknown>, cardIndex?: number) {
    const quickReply = asRecord(button.quickReplyButton);
    if (Object.keys(quickReply).length > 0) {
      this.addOption(message, {
        id: firstText(quickReply.id, quickReply.buttonId) ?? String(message.options.length + 1),
        label: structuredText(quickReply.displayText, quickReply.text) ?? `Opção ${message.options.length + 1}`,
        actionType: 'select',
        cardIndex,
      });
      return;
    }

    const urlButton = asRecord(button.urlButton);
    if (Object.keys(urlButton).length > 0) {
      this.addAction(
        message,
        'url',
        structuredText(urlButton.displayText, urlButton.text, urlButton.url) ?? 'Abrir link',
        cardIndex,
      );
      return;
    }

    const callButton = asRecord(button.callButton);
    if (Object.keys(callButton).length > 0) {
      this.addAction(
        message,
        'call',
        structuredText(callButton.displayText, callButton.text, callButton.phoneNumber) ?? 'Ligar',
        cardIndex,
      );
      return;
    }

    const buttonText = asRecord(button.buttonText);
    if (Object.keys(buttonText).length > 0 || button.buttonId || button.id) {
      this.addOption(message, {
        id: firstText(button.buttonId, button.id) ?? String(message.options.length + 1),
        label: firstText(buttonText.displayText, button.displayText) ?? `Opção ${message.options.length + 1}`,
        actionType: 'select',
        cardIndex,
      });
      return;
    }

    message.partial = true;
  }

  private normalizeInteractiveMessage(message: ChatwootNormalizedMessage, value: Record<string, unknown>) {
    message.variant = asRecord(value.carouselMessage).cards ? 'carouselMessage' : 'nativeFlowMessage';
    message.title = firstText(valueAt(value, 'header', 'text'), valueAt(value, 'header', 'title'));
    message.body = firstText(valueAt(value, 'body', 'text'), value.body);
    message.footer = firstText(valueAt(value, 'footer', 'text'), value.footerText);
    this.collectMedia(message, asRecord(value.header));
    this.addNativeFlowButtons(message, asRecord(value.nativeFlowMessage));

    const carousel = asRecord(value.carouselMessage);
    const cards = asArray(carousel.cards);
    cards.forEach((card, cardIndex) => {
      const cardValue = asRecord(card);
      const cardTitle = firstText(valueAt(cardValue, 'header', 'text'), valueAt(cardValue, 'header', 'title'));
      const cardBody = firstText(valueAt(cardValue, 'body', 'text'));
      message.cards.push({ index: cardIndex, title: cardTitle, body: cardBody });
      this.collectMedia(message, asRecord(cardValue.header), cardIndex);
      this.addNativeFlowButtons(message, asRecord(cardValue.nativeFlowMessage), cardIndex);
    });

    if (cards.length > 0 && message.options.length === 0 && message.actions.length === 0) {
      message.partial = true;
    }
  }

  private addNativeFlowButtons(message: ChatwootNormalizedMessage, flow: Record<string, unknown>, cardIndex?: number) {
    for (const rawButton of asArray(flow.buttons)) {
      const button = asRecord(rawButton);
      const parsed = parseJson(button.buttonParamsJson);
      const params = asRecord(parsed.value);
      const name = firstText(button.name) ?? 'unknown';
      const actionType = this.getNativeActionType(name, params);
      if (parsed.error || actionType === 'unknown') {
        message.partial = true;
      }
      const label =
        stringFromKeys(params, ['displayText', 'display_text', 'buttonText', 'button_text', 'title', 'text']) ??
        firstText(valueAt(button, 'buttonText', 'displayText'), button.buttonText, button.displayText, button.name) ??
        `Ação ${name}`;

      if (actionType === 'select') {
        this.addOption(message, {
          id:
            stringFromKeys(params, ['id', 'buttonId', 'button_id', 'rowId', 'row_id']) ??
            firstText(button.buttonId, button.id) ??
            String(message.options.length + 1),
          label,
          actionType,
          cardIndex,
        });
      } else {
        this.addAction(message, actionType, label, cardIndex, parsed.raw);
      }
    }
  }

  private getNativeActionType(name: string, params: Record<string, unknown>): ChatwootInteractiveActionType {
    const normalizedName = name.toLowerCase();
    if (normalizedName.includes('payment')) {
      return 'payment';
    }
    if (normalizedName.includes('url') || params.url || params.link) {
      return 'url';
    }
    if (normalizedName.includes('call') || params.phoneNumber || params.phone_number) {
      return 'call';
    }
    if (normalizedName.includes('copy') || params.copy_code) {
      return 'copy';
    }
    if (
      normalizedName.includes('reply') ||
      normalizedName.includes('select') ||
      normalizedName.includes('quick') ||
      params.id ||
      params.buttonId ||
      params.rowId
    ) {
      return 'select';
    }

    return 'unknown';
  }

  private normalizeListMessage(message: ChatwootNormalizedMessage, value: Record<string, unknown>) {
    message.variant = 'listMessage';
    message.title = firstText(value.title);
    message.body = firstText(value.description);
    message.footer = firstText(value.footerText);

    asArray(value.sections).forEach((rawSection, sectionIndex) => {
      const section = asRecord(rawSection);
      const sectionTitle = firstText(section.title, section.description) ?? `Seção ${sectionIndex + 1}`;
      asArray(section.rows).forEach((rawRow) => {
        const row = asRecord(rawRow);
        this.addOption(message, {
          id: firstText(row.rowId, row.id) ?? String(message.options.length + 1),
          label: firstText(row.title, row.description) ?? `Opção ${message.options.length + 1}`,
          actionType: 'select',
          sectionIndex,
          sectionTitle,
        });
      });
    });

    if (message.options.length === 0) {
      message.partial = true;
    }
  }

  private normalizeResponse(message: ChatwootNormalizedMessage, family: string, value: Record<string, unknown>) {
    message.variant = family;
    const contextInfo = asRecord(value.contextInfo);
    message.contextInfo = Object.keys(contextInfo).length > 0 ? contextInfo : message.contextInfo;

    if (family === 'buttonsResponseMessage') {
      message.response = {
        family,
        id: firstText(value.selectedButtonId),
        label: firstText(value.selectedDisplayText),
        contextInfo: message.contextInfo,
      };
      return;
    }

    if (family === 'templateButtonReplyMessage') {
      message.response = {
        family,
        id: firstText(value.selectedId, value.selectedButtonId),
        label: firstText(value.selectedDisplayText, value.selectedButtonText),
        cardIndex: typeof value.selectedCarouselCardIndex === 'number' ? value.selectedCarouselCardIndex : undefined,
        contextInfo: message.contextInfo,
      };
      return;
    }

    if (family === 'listResponseMessage') {
      const reply = asRecord(value.singleSelectReply);
      message.response = {
        family,
        id: firstText(reply.selectedRowId),
        label: firstText(value.title, value.description),
        contextInfo: message.contextInfo,
      };
      return;
    }

    const nativeResponse = asRecord(value.nativeFlowResponseMessage);
    const parsed = parseJson(nativeResponse.paramsJson);
    const params = asRecord(parsed.value);
    message.response = {
      family,
      id: stringFromKeys(params, [
        'id',
        'selectedId',
        'selected_id',
        'selectedRowId',
        'selected_row_id',
        'rowId',
        'row_id',
      ]),
      label:
        stringFromKeys(params, ['displayText', 'display_text', 'title', 'text']) ??
        firstText(valueAt(value, 'body', 'text')),
      bodyText: firstText(valueAt(value, 'body', 'text')),
      flowName: firstText(nativeResponse.name),
      flowVersion: firstText(nativeResponse.version),
      rawParamsJson: parsed.raw,
      params: parsed.value,
      paramsParseError: parsed.error,
      contextInfo: message.contextInfo,
    };
  }

  private addOption(message: ChatwootNormalizedMessage, option: Omit<ChatwootConversationButtonOption, 'index'>) {
    message.options.push({
      ...option,
      index: message.options.length + 1,
    });
  }

  private addAction(
    message: ChatwootNormalizedMessage,
    type: Exclude<ChatwootInteractiveActionType, 'select'>,
    label: string,
    cardIndex?: number,
    rawParamsJson?: string,
  ) {
    const cardLabel = cardIndex === undefined ? label : `Cartão ${cardIndex + 1}: ${label}`;
    message.actions.push({ type, label: cardLabel, rawParamsJson });
  }

  private collectMedia(message: ChatwootNormalizedMessage, value: Record<string, unknown>, cardIndex?: number) {
    for (const type of MEDIA_TYPES) {
      const media = asRecord(value[type]);
      if (Object.keys(media).length > 0) {
        message.media.push({ type, content: media, cardIndex });
      }
    }
  }
}
