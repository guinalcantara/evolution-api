import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

const isNotEmpty = (...propertyNames: string[]): JSONSchema7 => {
  const properties = {};
  propertyNames.forEach(
    (property) =>
      (properties[property] = {
        minLength: 1,
        description: `The "${property}" cannot be empty`,
      }),
  );
  return {
    if: {
      propertyNames: {
        enum: [...propertyNames],
      },
    },
    then: { properties },
  };
};

export const atendePlusSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    enabled: { type: 'boolean', enum: [true, false] },
    token: { type: 'string' },
    url: { type: 'string' },
    accountId: { type: ['string', 'null'] },
    nameInbox: { type: ['string', 'null'] },
    webhookUrl: { type: ['string', 'null'] },
    autoCreate: { type: 'boolean', enum: [true, false] },
  },
  required: ['enabled', 'token', 'url', 'autoCreate'],
  ...isNotEmpty('enabled', 'token', 'url', 'autoCreate'),
};
