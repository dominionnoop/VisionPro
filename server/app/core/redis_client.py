import redis.asyncio as redis
from typing import Optional
import json

class RedisClient:
    def __init__(self, host: str = "redis", port: int = 6379):
        self.redis = redis.Redis(host=host, port=port, decode_responses=True)
    
    async def set_session(self, user_id: str, refresh_token: str, expire_seconds: int = 604800):
        """Store user session (7 days default)"""
        session_data = {
            "refresh_token": refresh_token,
            "created_at": str(datetime.utcnow())
        }
        await self.redis.setex(
            f"session:{user_id}",
            expire_seconds,
            json.dumps(session_data)
        )
    
    async def get_session(self, user_id: str) -> Optional[dict]:
        """Get user session"""
        data = await self.redis.get(f"session:{user_id}")
        if data:
            return json.loads(data)
        return None
    
    async def delete_session(self, user_id: str):
        """Delete user session (logout)"""
        await self.redis.delete(f"session:{user_id}")
    
    async def blacklist_token(self, token: str, expire_seconds: int = 900):
        """Blacklist a token (15 minutes default)"""
        await self.redis.setex(f"blacklist:{token}", expire_seconds, "1")
    
    async def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        return await self.redis.exists(f"blacklist:{token}") > 0
    
    async def close(self):
        """Close Redis connection"""
        await self.redis.close()

# Global Redis client
redis_client = RedisClient()

from datetime import datetime
