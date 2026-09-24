import os
import psycopg

DB_HOST = os.getenv("CYBERGUARD_DB_HOST", "localhost")
DB_PORT = os.getenv("CYBERGUARD_DB_PORT", "5432")
DB_NAME = os.getenv("CYBERGUARD_DB_NAME", "cyberguard_db")
DB_USER = os.getenv("CYBERGUARD_DB_USER", "postgres")
DB_PASSWORD = os.getenv("CYBERGUARD_DB_PASSWORD", "Swadhin1520")


def get_connection():
    return psycopg.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )