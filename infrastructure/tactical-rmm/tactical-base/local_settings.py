from .custom_settings import *
import os

def get_env_var(key, default=''):
    value = os.getenv(key, default)
    # Handle Docker Compose style variables
    if value.startswith('${') and value.endswith('}'):
        inner_key = value[2:-1]
        return os.getenv(inner_key, default)
    return value

SECRET_KEY = get_env_var('DJANGO_SEKRET', '9=w)banooqsbug+x-klraw4%yak9l#-l(67s!hcl^z@p*3ir8v')  # https://djecrety.ir/

DEBUG = True

DOCKER_BUILD = True

TRMM_PROTO = 'http'

EXE_DIR = get_env_var('TACTICAL_DIR', '') + '/api/tacticalrmm/private/exe'
LOG_DIR = get_env_var('TACTICAL_DIR', '') + '/api/tacticalrmm/private/log'

SCRIPTS_DIR = get_env_var('TACTICAL_DIR', '') + '/community-scripts'

ALLOWED_HOSTS = ['*']

ADMIN_URL = get_env_var('ADMINURL', '') + '/'
ADMIN_ENABLED = True
SWAGGER_ENABLED = True
BETA_API_ENABLED = True

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

HEADLESS_FRONTEND_URLS = {
    'socialaccount_login_error': 'http://' + get_env_var('APP_HOST', '') + '/account/provider/callback'
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': get_env_var('POSTGRES_DB', ''),
        'USER': get_env_var('POSTGRES_USER', ''),
        'PASSWORD': get_env_var('POSTGRES_PASSWORD', ''),
        'HOST': get_env_var('POSTGRES_HOST', ''),
        'PORT': get_env_var('POSTGRES_PORT', ''),
    }
}

# Disable MeshCentral
MESH_USERNAME = 'disabled'
MESH_SITE = 'disabled'
MESH_TOKEN_KEY = 'disabled'
MESH_DEVICE_GROUP = 'disabled'
MESH_WS_URL = 'disabled'
ADMIN_ENABLED = False
TRMM_DISABLE_WEB_TERMINAL = get_env_var('TRMM_DISABLE_WEB_TERMINAL', 'False').lower() == 'true'
TRMM_DISABLE_SERVER_SCRIPTS = get_env_var('TRMM_DISABLE_SERVER_SCRIPTS', 'False').lower() == 'true'
TRMM_DISABLE_SSO = get_env_var('TRMM_DISABLE_SSO', 'False').lower() == 'true'
TRMM_DISABLE_2FA = True

# Disable SSL/TLS
USE_NATS_STANDARD = False
NATS_PROTOCOL = 'nats'
NATS_HTTP_PROTOCOL = 'http'
NATS_WS_PROTOCOL = 'ws'

# Certificate paths for NATS
CERT_FILE = get_env_var('CERT_PUB_PATH', '')
KEY_FILE = get_env_var('CERT_PRIV_PATH', '')

# Redis configuration
REDIS_HOST = get_env_var('REDIS_HOST', '')
REDIS_PORT = 6379
REDIS_DB = 0

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
