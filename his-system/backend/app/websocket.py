from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        # user_id -> WebSocket
        self.active: Dict[str, WebSocket] = {}
        # role -> list of user_ids
        self.role_map: Dict[str, List[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, role: str):
        await websocket.accept()
        self.active[user_id] = websocket
        self.role_map.setdefault(role, [])
        if user_id not in self.role_map[role]:
            self.role_map[role].append(user_id)

    def disconnect(self, user_id: str, role: str):
        self.active.pop(user_id, None)
        if role in self.role_map:
            self.role_map[role] = [u for u in self.role_map[role] if u != user_id]

    async def send_to_user(self, user_id: str, event: str, payload: dict):
        ws = self.active.get(user_id)
        if ws:
            await ws.send_text(json.dumps({"event": event, "payload": payload}))

    async def broadcast_to_role(self, role: str, event: str, payload: dict):
        """Send event to all connected users of a given role."""
        for user_id in self.role_map.get(role, []):
            await self.send_to_user(user_id, event, payload)

    async def broadcast_to_roles(self, roles: List[str], event: str, payload: dict):
        """Send event to multiple roles at once."""
        for role in roles:
            await self.broadcast_to_role(role, event, payload)

manager = ConnectionManager()

