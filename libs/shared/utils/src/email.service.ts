import { env } from './env';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email service for sending emails
 * In development, logs to console
 * In production, configure with your email provider (SendGrid, Mailgun, AWS SES, etc.)
 */
class EmailService {
  private isDevelopment = process.env['NODE_ENV'] !== 'production';

  async sendEmail(options: EmailOptions): Promise<void> {
    if (this.isDevelopment) {
      // In development, log to console
      console.log('📧 [EMAIL] Sending email:', {
        to: options.to,
        subject: options.subject,
        preview:
          options.text?.substring(0, 100) || options.html.substring(0, 100),
      });
      console.log('📧 [EMAIL] HTML Content:', options.html);
      return;
    }

    // Production: Use SendGrid
    const sendgridApiKey = process.env['SENDGRID_API_KEY'];
    const fromEmail = process.env['FROM_EMAIL'] || 'noreply@ecotech.com';
    const fromName = process.env['FROM_NAME'] || 'EcoTech Sys';

    if (!sendgridApiKey) {
      console.error('⚠️ [EMAIL] SENDGRID_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    try {
      // Dynamically import SendGrid
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(sendgridApiKey);

      await sgMail.default.send({
        to: options.to,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log('✅ [EMAIL] Email sent successfully to:', options.to);
    } catch (error) {
      console.error('❌ [EMAIL] Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName: string,
  ): Promise<void> {
    const appUrl = env.APP_URL || 'http://localhost:3000';
    const finalResetUrl = `${appUrl}/reset-senha?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperação de Senha</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #00ff87; font-size: 28px; font-weight: bold;">EcoTech Sys</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Olá, ${userName}!</h2>
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                        Recebemos uma solicitação para redefinir a senha da sua conta.
                      </p>
                      <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                        Clique no botão abaixo para criar uma nova senha:
                      </p>

                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${finalResetUrl}"
                               style="display: inline-block; padding: 16px 40px; background-color: #00ff87; color: #000000; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px; transition: background-color 0.3s;">
                              Redefinir Senha
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 30px 0 10px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                        Ou copie e cole o link abaixo no seu navegador:
                      </p>
                      <p style="margin: 0 0 30px 0; color: #0066cc; font-size: 14px; word-break: break-all;">
                        ${finalResetUrl}
                      </p>

                      <div style="border-top: 1px solid #e0e0e0; margin: 30px 0; padding-top: 20px;">
                        <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px; line-height: 1.5;">
                          <strong>⏱️ Este link expira em 1 hora.</strong>
                        </p>
                        <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.5;">
                          Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        © ${new Date().getFullYear()} EcoTech Sys. Todos os direitos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const text = `
Olá, ${userName}!

Recebemos uma solicitação para redefinir a senha da sua conta.

Clique no link abaixo para criar uma nova senha:
${finalResetUrl}

Este link expira em 1 hora.

Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.

© ${new Date().getFullYear()} EcoTech Sys. Todos os direitos reservados.
    `.trim();

    await this.sendEmail({
      to: email,
      subject: 'Recuperação de Senha - EcoTech Sys',
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
