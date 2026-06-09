/**
 * Mock do serviço de email (SendGrid).
 * Usar como: vi.mock('@ecotech/shared/utils/email.service', () => emailMock)
 */
export const emailMock = {
  emailService: {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
};
