import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email. Returns True on success, False on failure.
    Falls back to logging the content if SMTP is not configured."""

    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        # No SMTP configured — log the email for dev/testing
        logger.warning("SMTP not configured. Email would have been sent to: %s", to_email)
        logger.info("Subject: %s", subject)
        logger.info("Body: %s", html_body)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"HostelMS <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
        logger.info("Email sent to %s", to_email)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))
        return False


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    subject = "Reset your HostelMS password"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb;">
      <h2 style="color:#6366f1;margin-bottom:8px;">HostelMS — Password Reset</h2>
      <p style="color:#374151;">You requested a password reset. Click the button below to set a new password.</p>
      <p style="text-align:center;margin:32px 0;">
        <a href="{reset_url}"
           style="background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
          Reset Password
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">This link expires in <strong>30 minutes</strong>.</p>
      <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="color:#9ca3af;font-size:12px;">HostelMS · Secure Hostel Management</p>
    </div>
    """
    return send_email(to_email, subject, html)
