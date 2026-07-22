const nodemailer = require('nodemailer');

// Configure the transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a password reset email
 * @param {string} toEmail - Recipient email
 * @param {string} resetLink - The full reset URL
 * @param {string} userName - The user's name
 */
async function sendResetEmail(toEmail, resetLink, userName) {
  const from = process.env.SMTP_FROM || '"ActuaYa" <no-reply@actuaya.co>';
  const subject = '🔐 Recuperación de Contraseña - ActuaYa';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://www.actuaya.co/assets/icons/logo-full.png" alt="ActuaYa" style="height: 50px; width: auto;" />
      </div>
      <p style="color: #1a2e35; font-size: 16px;">Hola <strong>${userName}</strong>,</p>
      <p style="color: #5a7a84; font-size: 15px; line-height: 1.5;">Recibimos una solicitud para restablecer tu contraseña en ActuaYa.</p>
      <p style="color: #5a7a84; font-size: 15px; line-height: 1.5;">Haz clic en el siguiente botón para crear una nueva contraseña. Este enlace es válido por 1 hora.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background: linear-gradient(135deg, #6c3ce9, #8c60ff); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(108, 60, 233, 0.2);">
          Restablecer Contraseña
        </a>
      </div>
      <p style="color: #5a7a84; font-size: 14px;">O copia y pega este enlace en tu navegador:</p>
      <p style="word-break: break-all; color: #6c3ce9; font-size: 14px;"><a href="${resetLink}" style="color: #6c3ce9;">${resetLink}</a></p>
      <p style="color: #8fa8b0; font-size: 13px; margin-top: 30px;">Si no solicitaste este cambio, puedes ignorar este correo con seguridad. Tu contraseña actual no cambiará.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888; text-align: center;">
        ActuaYa &copy; ${new Date().getFullYear()} Todos los derechos reservados.<br />
        Por favor no respondas a este correo generado automáticamente.
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      html,
    });
    console.log(`[EmailService] Reset email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Error sending reset email to ${toEmail}:`, error);
    throw error;
  }
}

module.exports = {
  sendResetEmail,
};
