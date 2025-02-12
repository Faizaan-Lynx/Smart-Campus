from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import logging

# Initialize logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# List of blocked IPs (modify as needed)
BLOCKED_IPS = ["192.168.1.10", "203.0.113.45","::1"]

class IPMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log and restrict access based on client IP address.
    """

    async def dispatch(self, request: Request, call_next):
        """
        Process incoming request, log the IP, and restrict access if blocked.

        Args:
            request (Request): Incoming request object.
            call_next (function): Next middleware or route handler.

        Returns:
            Response: Either a blocked response or the original response.
        """
        # Extract client IP address (handles proxies)
        client_ip = request.client.host
        forwarded_for = request.headers.get("X-Forwarded-For")

        if forwarded_for:
            # In case of proxies, get the first IP in the list
            client_ip = forwarded_for.split(",")[0].strip()

        # Log IP address
        logger.info(f"Incoming request from IP: {client_ip}")

        # Block request if IP is in the blocked list
        if client_ip in BLOCKED_IPS:
            return Response("Access Denied: Your IP is blocked", status_code=403)

        return await call_next(request)
