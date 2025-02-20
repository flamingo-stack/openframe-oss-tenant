from .custom_settings import *

SECRET_KEY = '${DJANGO_SEKRET}'

DEBUG = False

DOCKER_BUILD = True

TRMM_PROTO = 'http'

EXE_DIR = '${TACTICAL_DIR}/api/tacticalrmm/private/exe'
LOG_DIR = '${TACTICAL_DIR}/api/tacticalrmm/private/log'

SCRIPTS_DIR = '${TACTICAL_DIR}/community-scripts'

ALLOWED_HOSTS = ['*']

ADMIN_URL = '${ADMINURL}/'

CORS_ORIGIN_WHITELIST = ['http://${APP_HOST}', 'http://localhost:8080', 'http://192.168.1.208:8000', 'http://192.168.1.208:8080']
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = True

SESSION_COOKIE_DOMAIN = None
CSRF_COOKIE_DOMAIN = None
CSRF_TRUSTED_ORIGINS = ['http://${API_HOST}', 'http://${APP_HOST}', 'http://localhost:8080', 'http://localhost:8000', 'http://192.168.1.208:8000', 'http://192.168.1.208:8080']
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False

HEADLESS_FRONTEND_URLS = {'socialaccount_login_error': 'http://${APP_HOST}/account/provider/callback'}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': '${POSTGRES_DB}',
        'USER': '${POSTGRES_USER}',
        'PASSWORD': '${POSTGRES_PASS}',
        'HOST': '${POSTGRES_HOST}',
        'PORT': '${POSTGRES_PORT}',
    }
}

MESH_USERNAME = '${MESH_USER}'
MESH_SITE = 'http://${MESH_HOST}'
MESH_TOKEN_KEY = '${MESH_TOKEN}'
REDIS_HOST    = '${REDIS_HOST}'
MESH_WS_URL = '${MESH_WS_URL}'
ADMIN_ENABLED = False
TRMM_DISABLE_WEB_TERMINAL = ${TRMM_DISABLE_WEB_TERMINAL}
TRMM_DISABLE_SERVER_SCRIPTS = ${TRMM_DISABLE_SERVER_SCRIPTS}
TRMM_DISABLE_SSO = ${TRMM_DISABLE_SSO}
TRMM_DISABLE_2FA = True

# Disable SSL/TLS
USE_NATS_STANDARD = False
NATS_PROTOCOL = 'nats'
NATS_HTTP_PROTOCOL = 'http'
NATS_WS_PROTOCOL = 'ws'

# Certificate paths for NATS
CERT_FILE = '${CERT_PUB_PATH}'
KEY_FILE = '${CERT_PRIV_PATH}'