from .custom_settings import *

SECRET_KEY = '${DJANGO_SEKRET}'

DEBUG = True

DOCKER_BUILD = True

TRMM_PROTO = 'http'

EXE_DIR = '${TACTICAL_DIR}/api/tacticalrmm/private/exe'
LOG_DIR = '${TACTICAL_DIR}/api/tacticalrmm/private/log'

SCRIPTS_DIR = '${TACTICAL_DIR}/community-scripts'

ALLOWED_HOSTS = ['*']

ADMIN_URL = '${ADMINURL}/'
ADMIN_ENABLED = True

CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ORIGIN_WHITELIST = ['*']

# Disable all CSRF protections
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = None
CSRF_COOKIE_DOMAIN = None
CSRF_TRUSTED_ORIGINS = ['http://*', 'https://*']
CSRF_USE_SESSIONS = False
CSRF_COOKIE_NAME = 'csrftoken'
CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'

# Disable session security
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = None
SESSION_COOKIE_DOMAIN = None

HEADLESS_FRONTEND_URLS = {'socialaccount_login_error': 'http://${APP_HOST}/account/provider/callback'}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': '${POSTGRES_DB}',
        'USER': '${POSTGRES_USER}',
        'PASSWORD': '${POSTGRES_PASSWORD}',
        'HOST': '${POSTGRES_HOST}',
        'PORT': '${POSTGRES_PORT}',
    }
}

# Disable MeshCentral
MESH_USERNAME = 'disabled'
MESH_SITE = 'disabled'
MESH_TOKEN_KEY = 'disabled'
MESH_DEVICE_GROUP = 'disabled'
MESH_WS_URL = 'disabled'
ADMIN_ENABLED = False
TRMM_DISABLE_WEB_TERMINAL = '${TRMM_DISABLE_WEB_TERMINAL}'
TRMM_DISABLE_SERVER_SCRIPTS = '${TRMM_DISABLE_SERVER_SCRIPTS}'
TRMM_DISABLE_SSO = '${TRMM_DISABLE_SSO}'
TRMM_DISABLE_2FA = True

# Disable SSL/TLS
USE_NATS_STANDARD = False
NATS_PROTOCOL = 'nats'
NATS_HTTP_PROTOCOL = 'http'
NATS_WS_PROTOCOL = 'ws'

# Certificate paths for NATS
CERT_FILE = '${CERT_PUB_PATH}'
KEY_FILE = '${CERT_PRIV_PATH}'

# Redis configuration
REDIS_HOST = '${REDIS_HOST}'
REDIS_PORT = 6379
REDIS_DB = 0

# Swagger and Beta API
SWAGGER_ENABLED = True
BETA_API_ENABLED = True 

# Cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}