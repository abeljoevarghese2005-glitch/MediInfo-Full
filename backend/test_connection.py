import psycopg2

# Your full connection URL from Railway
conn = psycopg2.connect("postgresql://postgres:tuEifPQTTYoKsTfXppVFddqliLaVoaTN@mainline.proxy.rlwy.net:41984/railway")

print("✅ Connection successful!")
conn.close()