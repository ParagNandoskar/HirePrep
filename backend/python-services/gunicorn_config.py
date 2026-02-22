# Gunicorn Configuration for Video Analysis Service
# Production-ready WSGI server configuration

import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8001')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', '2'))
worker_class = 'sync'  # 'sync' is better for CPU-intensive ML tasks
worker_connections = 1000
threads = int(os.getenv('GUNICORN_THREADS', '4'))  # 4 threads per worker

# Worker timeout
timeout = 120  # 2 minutes (generous for batch processing)
graceful_timeout = 30
keepalive = 5

# Process naming
proc_name = 'video-analysis'

# Logging
accesslog = '-'  # Log to stdout
errorlog = '-'   # Log to stderr
loglevel = os.getenv('LOG_LEVEL', 'info')  # 'debug', 'info', 'warning', 'error'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Development vs Production
reload = os.getenv('FLASK_ENV') == 'development'
preload_app = True  # Load app before forking (better for ML models)

# Performance tuning
max_requests = 1000  # Restart workers after 1000 requests (prevent memory leaks)
max_requests_jitter = 50  # Add randomness to prevent all workers restarting at once

# Security
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8192

def post_fork(server, worker):
    """Called after worker is forked"""
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def pre_fork(server, worker):
    """Called before worker is forked"""
    pass

def pre_exec(server):
    """Called before new master process is forked"""
    server.log.info("Forked new master process")

def when_ready(server):
    """Called when server is ready to accept requests"""
    server.log.info("Video Analysis Service is ready")

def worker_int(worker):
    """Called when worker receives INT or QUIT signal"""
    worker.log.info("Worker received INT or QUIT signal")

def worker_abort(worker):
    """Called when worker receives SIGABRT signal"""
    worker.log.info("Worker received SIGABRT signal")
