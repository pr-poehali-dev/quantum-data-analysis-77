import base64
import json
import os
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import boto3
import psycopg2
from psycopg2.extras import RealDictCursor

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
NOTIFY_EMAIL = "amais@yandex.ru"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def schema():
    return os.environ.get("MAIN_DB_SCHEMA", "public")


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
        "Access-Control-Max-Age": "86400",
    }


def ok(data, status=200):
    return {"statusCode": status, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps(data, default=str)}


def err(msg, status=403):
    return {"statusCode": status, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"error": msg})}


def check_admin(headers):
    pwd = headers.get("X-Admin-Password") or headers.get("x-admin-password")
    return pwd == ADMIN_PASSWORD


def upload_image(data_b64: str, name: str) -> str:
    data = base64.b64decode(data_b64)
    key = f"hall/{uuid.uuid4().hex}_{name}"
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType="image/jpeg")
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def send_email(subject: str, body: str):
    smtp_pwd = os.environ.get("YANDEX_SMTP_PASSWORD", "")
    if not smtp_pwd:
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = NOTIFY_EMAIL
    msg["To"] = NOTIFY_EMAIL
    msg.attach(MIMEText(body, "html", "utf-8"))
    with smtplib.SMTP_SSL("smtp.yandex.ru", 465) as server:
        server.login(NOTIFY_EMAIL, smtp_pwd)
        server.sendmail(NOTIFY_EMAIL, NOTIFY_EMAIL, msg.as_string())


def handler(event: dict, context) -> dict:
    """Интерактивная карта торгового зала: точки, статусы, фото зала, заявки от клиентов."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    method = event.get("httpMethod", "GET")
    headers = event.get("headers", {}) or {}
    body = json.loads(event.get("body") or "{}")
    path = event.get("path", "/")
    sc = schema()

    # GET / — всё состояние: фото зала + точки
    if method == "GET":
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(f"SELECT image_url FROM {sc}.hall_image WHERE id = 1")
        hall = cur.fetchone()
        cur.execute(f"SELECT * FROM {sc}.hall_pins ORDER BY id")
        pins = cur.fetchall()
        cur.close()
        conn.close()
        return ok({"image_url": hall["image_url"] if hall else None, "pins": [dict(p) for p in pins]})

    # POST /upload-hall — загрузить фото зала (admin)
    if method == "POST" and "/upload-hall" in path:
        if not check_admin(headers):
            return err("Неверный пароль")
        url = upload_image(body["image"], "hall.jpg")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {sc}.hall_image SET image_url = %s WHERE id = 1", (url,))
        conn.commit()
        cur.close()
        conn.close()
        return ok({"image_url": url})

    # POST /pins — добавить точку (admin)
    if method == "POST" and "/pins" in path:
        if not check_admin(headers):
            return err("Неверный пароль")
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            f"INSERT INTO {sc}.hall_pins (label, x, y) VALUES (%s, %s, %s) RETURNING *",
            (body.get("label", "Место"), body["x"], body["y"]),
        )
        pin = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return ok(dict(pin), 201)

    # PATCH /pins — обновить точку: позицию, статус, метку (admin)
    if method == "PATCH" and "/pins" in path:
        if not check_admin(headers):
            return err("Неверный пароль")
        pin_id = body.get("id")
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        fields = []
        values = []
        for col in ("label", "x", "y", "is_rented", "renter_name", "rent_notes"):
            if col in body:
                fields.append(f"{col} = %s")
                values.append(body[col])
        values.append(pin_id)
        cur.execute(f"UPDATE {sc}.hall_pins SET {', '.join(fields)} WHERE id = %s RETURNING *", values)
        pin = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return ok(dict(pin))

    # DELETE /pins — удалить точку (admin)
    if method == "DELETE" and "/pins" in path:
        if not check_admin(headers):
            return err("Неверный пароль")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {sc}.hall_pins SET label=label WHERE id = %s", (body.get("id"),))
        # физически удаляем
        cur.execute(f"DELETE FROM {sc}.hall_pins WHERE id = %s", (body.get("id"),))
        conn.commit()
        cur.close()
        conn.close()
        return ok({"ok": True})

    # POST /request — заявка от клиента
    if method == "POST" and "/request" in path:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            f"INSERT INTO {sc}.rental_requests (pin_id, pin_label, name, phone, email, message) VALUES (%s,%s,%s,%s,%s,%s) RETURNING *",
            (body.get("pin_id"), body.get("pin_label"), body.get("name"), body.get("phone"), body.get("email"), body.get("message")),
        )
        req = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        send_email(
            f"Новая заявка на аренду — {body.get('pin_label', 'место')}",
            f"""<h2>Заявка на аренду</h2>
            <p><b>Место:</b> {body.get('pin_label', '—')}</p>
            <p><b>Имя:</b> {body.get('name', '—')}</p>
            <p><b>Телефон:</b> {body.get('phone', '—')}</p>
            <p><b>Email:</b> {body.get('email', '—')}</p>
            <p><b>Сообщение:</b> {body.get('message', '—')}</p>""",
        )
        return ok({"ok": True, "id": req["id"]}, 201)

    return err("Not found", 404)
