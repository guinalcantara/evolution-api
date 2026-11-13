import { jidNormalizedUser, proto, WAMessage } from 'baileys';
import { createDecipheriv, createHmac } from 'crypto';

// Based on WhiskeySockets/Baileys PR #2690. Authentication verifies each JID candidate.
export function decryptSecretMessageEdit(message: WAMessage, original: proto.IMessage, ownJids: string[]) {
  const envelope =
    message.message?.secretEncryptedMessage ?? message.message?.editedMessage?.message?.secretEncryptedMessage;
  const target = envelope?.targetMessageKey;
  if (
    envelope?.secretEncType !== proto.Message.SecretEncryptedMessage.SecretEncType.MESSAGE_EDIT ||
    !target?.id ||
    !envelope.encPayload ||
    !envelope.encIv
  )
    return null;

  const rawSecret = original?.messageContextInfo?.messageSecret as
    | Uint8Array
    | string
    | Record<string, number>
    | undefined;
  const secret =
    typeof rawSecret === 'string'
      ? Buffer.from(rawSecret, 'base64')
      : rawSecret instanceof Uint8Array
        ? rawSecret
        : rawSecret && Object.keys(rawSecret).every((key) => /^\d+$/.test(key))
          ? Buffer.from(
              Object.keys(rawSecret)
                .sort((a, b) => Number(a) - Number(b))
                .map((key) => rawSecret[key]),
            )
          : undefined;
  if (!secret?.length) return null;

  const candidates = message.key.fromMe
    ? ownJids
    : [message.key.participant, message.key.participantAlt, message.key.remoteJid, message.key.remoteJidAlt];
  for (const jid of [...new Set([...candidates, target.remoteJid].filter(Boolean).map(jidNormalizedUser))]) {
    try {
      const info = Buffer.concat([
        Buffer.from(target.id),
        Buffer.from(jid),
        Buffer.from(jid),
        Buffer.from('Message Edit'),
        Buffer.from([1]),
      ]);
      const prk = createHmac('sha256', Buffer.alloc(32)).update(secret).digest();
      const key = createHmac('sha256', prk).update(info).digest();
      const payload = Buffer.from(envelope.encPayload);
      const decipher = createDecipheriv('aes-256-gcm', key, envelope.encIv);
      decipher.setAuthTag(payload.subarray(-16));
      const decoded = proto.Message.decode(
        Buffer.concat([decipher.update(payload.subarray(0, -16)), decipher.final()]),
      );
      const protocol = decoded.protocolMessage ?? {
        type: proto.Message.ProtocolMessage.Type.MESSAGE_EDIT,
        editedMessage: decoded,
      };
      if (protocol.type !== proto.Message.ProtocolMessage.Type.MESSAGE_EDIT || !protocol.editedMessage) return null;
      return {
        ...protocol,
        key: {
          ...target,
          remoteJid: message.key.remoteJid,
          fromMe: message.key.fromMe,
          participant: message.key.participant,
        },
      };
    } catch {
      // Try the next authenticated PN/LID identity.
    }
  }
  return null;
}
