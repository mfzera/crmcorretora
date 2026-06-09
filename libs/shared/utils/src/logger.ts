import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Nunca logar dados sensíveis de cartão (PCI-DSS)
  redact: {
    paths: [
      'req.body.creditCard.number',
      'req.body.creditCard.ccv',
      'req.body.creditCard.holderName',
      'req.body.creditCard.expiryMonth',
      'req.body.creditCard.expiryYear',
      'body.creditCard.number',
      'body.creditCard.ccv',
      'body.creditCard.holderName',
      'body.creditCard.expiryMonth',
      'body.creditCard.expiryYear',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            // UTC em ambos os ambientes — logs de dev e prod são correlacionáveis
            translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export type Logger = typeof logger;
