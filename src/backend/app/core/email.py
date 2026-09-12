from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
from jinja2 import Template

from app.config import get_config


class IEmailSender(ABC):
    @abstractmethod
    async def send_password_reset_email(self, to_email: str, reset_link: str) -> None:
        pass


PASSWORD_RESET_TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Сброс пароля</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; box-sizing: border-box; }
        .header { text-align: center; padding: 20px 0; background-color: #f8f8f8; }
        .header h1 { margin: 0; font-size: 24px; color: #333333; }
        .content { padding: 20px; text-align: center; }
        .content p { font-size: 16px; color: #333333; line-height: 1.5; margin: 0 0 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold; }
        .button:hover { background-color: #0056b3; }
        .footer { text-align: center; padding: 20px; font-size: 14px; color: #666666; }
        .footer p { margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Запрос на сброс пароля</h1>
        </div>
        <div class="content">
            <p>Здравствуйте, </p>
            <p>Мы получили запрос на сброс вашего пароля. Нажмите на кнопку ниже, чтобы сбросить пароль:</p>
            <p><a href="{{ reset_link }}" class="button">Сбросить пароль</a></p>
            <p>Если вы не запрашивали сброс пароля, пожалуйста, проигнорируйте это письмо или свяжитесь со службой поддержки.</p>
            <p>Эта ссылка действительна в течение 1 часа в целях безопасности.</p>
        </div>
        <div class="footer">
            <p>С уважением,<br>{{ company_name }}</p>
            <p><a href="{{ support_link }}">Связаться с поддержкой</a></p>
        </div>
    </div>
</body>
</html>"""


class SMTPSender(IEmailSender):
    async def send_password_reset_email(self, to_email: str, reset_link: str) -> None:
        config = get_config()

        message = MIMEMultipart("alternative")
        message["Subject"] = "Запрос на сброс пароля"
        message["From"] = config.email.username
        message["To"] = to_email

        template = Template(PASSWORD_RESET_TEMPLATE)
        html_content = template.render(
            reset_link=reset_link,
            company_name=config.security.company_name,
            support_link=config.security.support_link,
        )

        message.attach(MIMEText(html_content, "html"))

        await aiosmtplib.send(
            message,
            hostname=config.email.host,
            port=config.email.port,
            username=config.email.username,
            password=config.email.password,
            start_tls=True,
        )
