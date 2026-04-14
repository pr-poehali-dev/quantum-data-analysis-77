import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


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

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "Method not allowed"})}
