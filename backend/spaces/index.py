import base64
import json
import os
import uuid

import boto3
import psycopg2
from psycopg2.extras import RealDictCursor

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def upload_image(data_b64: str, space_id: int) -> str:
    data = base64.b64decode(data_b64)
    key = f"spaces/{space_id}/{uuid.uuid4().hex}.jpg"
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType="image/jpeg")
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handler(event: dict, context) -> dict:
    """Управление помещениями: получение списка и изменение статуса аренды."""
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
        }

    method = event.get("httpMethod", "GET")
    headers = event.get("headers", {}) or {}
    schema = os.environ.get("MAIN_DB_SCHEMA", "public")

    cors = {"Access-Control-Allow-Origin": "*"}

    # GET — список всех помещений
    if method == "GET":
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(f'SELECT * FROM {schema}.spaces ORDER BY id')
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps([dict(r) for r in rows], default=str),
        }

    # POST — загрузить фото помещения
    if method == "POST":
        pwd = headers.get("X-Admin-Password") or headers.get("x-admin-password")
        if pwd != ADMIN_PASSWORD:
            return {"statusCode": 403, "headers": cors, "body": json.dumps({"error": "Неверный пароль"})}

        body = json.loads(event.get("body") or "{}")
        space_id = body.get("id")
        image_b64 = body.get("image")

        image_url = upload_image(image_b64, space_id)

        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            f"UPDATE {schema}.spaces SET image_url = %s WHERE id = %s RETURNING *",
            (image_url, space_id),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps(dict(row), default=str),
        }

    # PUT — изменить статус аренды
    if method == "PUT":
        pwd = headers.get("X-Admin-Password") or headers.get("x-admin-password")
        if pwd != ADMIN_PASSWORD:
            return {"statusCode": 403, "headers": cors, "body": json.dumps({"error": "Неверный пароль"})}

        body = json.loads(event.get("body") or "{}")
        space_id = body.get("id")
        is_rented = body.get("is_rented")

        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if is_rented:
            cur.execute(
                f"""UPDATE {schema}.spaces SET
                    is_rented = TRUE,
                    renter_name = %s,
                    renter_contact = %s,
                    rent_start = %s,
                    rent_end = %s,
                    rent_notes = %s
                WHERE id = %s RETURNING *""",
                (
                    body.get("renter_name"),
                    body.get("renter_contact"),
                    body.get("rent_start") or None,
                    body.get("rent_end") or None,
                    body.get("rent_notes"),
                    space_id,
                ),
            )
        else:
            cur.execute(
                f"""UPDATE {schema}.spaces SET
                    is_rented = FALSE,
                    renter_name = NULL,
                    renter_contact = NULL,
                    rent_start = NULL,
                    rent_end = NULL,
                    rent_notes = NULL
                WHERE id = %s RETURNING *""",
                (space_id,),
            )

        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps(dict(row), default=str),
        }

    # DELETE — удалить помещение
    if method == "DELETE":
        pwd = headers.get("X-Admin-Password") or headers.get("x-admin-password")
        if pwd != ADMIN_PASSWORD:
            return {"statusCode": 403, "headers": cors, "body": json.dumps({"error": "Неверный пароль"})}

        body = json.loads(event.get("body") or "{}")
        space_id = body.get("id")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {schema}.spaces WHERE id = %s", (space_id,))
        conn.commit()
        cur.close()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # POST (create) — создать новое помещение (если нет поля image)
    if method == "POST":
        pwd = headers.get("X-Admin-Password") or headers.get("x-admin-password")
        if pwd != ADMIN_PASSWORD:
            return {"statusCode": 403, "headers": cors, "body": json.dumps({"error": "Неверный пароль"})}

        body = json.loads(event.get("body") or "{}")

        # Если есть поле image — это загрузка фото
        if "image" in body:
            space_id = body.get("id")
            image_url = upload_image(body["image"], space_id)
            conn = get_conn()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                f"UPDATE {schema}.spaces SET image_url = %s WHERE id = %s RETURNING *",
                (image_url, space_id),
            )
            row = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            return {"statusCode": 200, "headers": cors, "body": json.dumps(dict(row), default=str)}

        # Иначе — создание нового помещения
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            f"""INSERT INTO {schema}.spaces (title, area, price, location, description)
                VALUES (%s, %s, %s, %s, %s) RETURNING *""",
            (
                body.get("title", "Новое помещение"),
                body.get("area") or None,
                body.get("price") or None,
                body.get("location", ""),
                body.get("description", ""),
            ),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {"statusCode": 201, "headers": cors, "body": json.dumps(dict(row), default=str)}

    # PATCH — редактировать поля помещения (название, площадь, цена, локация, описание)
    if method == "PATCH":
        pwd = headers.get("X-Admin-Password") or headers.get("x-admin-password")
        if pwd != ADMIN_PASSWORD:
            return {"statusCode": 403, "headers": cors, "body": json.dumps({"error": "Неверный пароль"})}

        body = json.loads(event.get("body") or "{}")
        space_id = body.get("id")

        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            f"""UPDATE {schema}.spaces SET
                title = %s,
                area = %s,
                price = %s,
                location = %s,
                description = %s
            WHERE id = %s RETURNING *""",
            (
                body.get("title"),
                body.get("area") or None,
                body.get("price") or None,
                body.get("location"),
                body.get("description"),
                space_id,
            ),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps(dict(row), default=str),
        }

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "Method not allowed"})}