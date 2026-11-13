"""
PulseOps - Autonomous On-Call Incident Investigation Agent
Database Layer with MongoDB (Motor / PyMongo) + In-Memory Fallback.
Ensures zero crashes during live demos while fully supporting real MongoDB instances.
"""

import os
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("pulseops.database")

# Default MongoDB URI, configurable via env
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "pulseops_db")

# In-memory storage structures for robust fallback
_in_memory_db: Dict[str, List[Dict[str, Any]]] = {
    "server_logs": [],
    "deployments": [],
    "service_traces": [],
    "node_metrics": [],
    "db_clusters": [],
    "ssl_gateways": [],
    "incidents": [],
    "audit_trail": []
}

class InMemoryCollection:
    """Provides an async MongoDB-like interface over in-memory lists."""
    def __init__(self, name: str):
        self.name = name

    def _get_data(self) -> List[Dict[str, Any]]:
        if self.name not in _in_memory_db:
            _in_memory_db[self.name] = []
        return _in_memory_db[self.name]

    async def find(self, query: Optional[Dict[str, Any]] = None, sort: Optional[List] = None, limit: int = 100):
        data = self._get_data()
        results = []
        query = query or {}
        
        for doc in data:
            match = True
            for k, v in query.items():
                if isinstance(v, dict):
                    # Basic support for $in or $gte
                    if "$in" in v and doc.get(k) not in v["$in"]:
                        match = False
                        break
                    if "$regex" in v and not (v["$regex"].lower() in str(doc.get(k, "")).lower()):
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                results.append(doc.copy())

        if sort:
            for field, order in reversed(sort):
                results.sort(key=lambda x: str(x.get(field, "")), reverse=(order == -1))

        if limit:
            results = results[:limit]

        class AsyncCursor:
            def __init__(self, items):
                self.items = items
            def __aiter__(self):
                self._iter = iter(self.items)
                return self
            async def __anext__(self):
                try:
                    return next(self._iter)
                except StopIteration:
                    raise StopAsyncIteration
            async def to_list(self, length: int = 100):
                return self.items[:length]

        return AsyncCursor(results)

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        cursor = await self.find(query, limit=1)
        items = await cursor.to_list(1)
        return items[0] if items else None

    async def insert_one(self, doc: Dict[str, Any]):
        data = self._get_data()
        item = doc.copy()
        if "_id" not in item:
            item["_id"] = str(len(data) + 1)
        data.append(item)
        return type("InsertResult", (), {"inserted_id": item["_id"]})()

    async def insert_many(self, docs: List[Dict[str, Any]]):
        data = self._get_data()
        inserted_ids = []
        for doc in docs:
            item = doc.copy()
            if "_id" not in item:
                item["_id"] = str(len(data) + 1)
            data.append(item)
            inserted_ids.append(item["_id"])
        return type("InsertManyResult", (), {"inserted_ids": inserted_ids})()

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        data = self._get_data()
        for doc in data:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                if "$set" in update:
                    doc.update(update["$set"])
                else:
                    doc.update(update)
                return type("UpdateResult", (), {"modified_count": 1})()
        return type("UpdateResult", (), {"modified_count": 0})()

    async def delete_many(self, query: Dict[str, Any]):
        data = self._get_data()
        initial_len = len(data)
        if not query:
            _in_memory_db[self.name] = []
            return type("DeleteResult", (), {"deleted_count": initial_len})()
        
        filtered = []
        for doc in data:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if not match:
                filtered.append(doc)
        _in_memory_db[self.name] = filtered
        return type("DeleteResult", (), {"deleted_count": initial_len - len(filtered)})()

    async def count_documents(self, query: Optional[Dict[str, Any]] = None) -> int:
        if not query:
            return len(self._get_data())
        cursor = await self.find(query)
        items = await cursor.to_list(1000)
        return len(items)


class DatabaseManager:
    """Manages connection to real MongoDB with automatic seamless in-memory fallback."""
    def __init__(self):
        self.is_connected_to_mongo = False
        self.mongo_client = None
        self.mongo_db = None

    async def initialize(self):
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            # Attempt to connect with short timeout so startup never lags
            client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=800)
            # Test connection
            await client.admin.command('ping')
            self.mongo_client = client
            self.mongo_db = client[MONGODB_DB_NAME]
            self.is_connected_to_mongo = True
            logger.info("Successfully connected to live MongoDB instance at %s", MONGODB_URI)
        except Exception as e:
            self.is_connected_to_mongo = False
            logger.info("MongoDB not reachable (%s). Initializing high-speed in-memory database fallback.", str(e))

    def get_collection(self, name: str):
        if self.is_connected_to_mongo and self.mongo_db is not None:
            return self.mongo_db[name]
        return InMemoryCollection(name)

    async def get_raw_collection_items(self, name: str, limit: int = 50) -> List[Dict[str, Any]]:
        col = self.get_collection(name)
        cursor = await col.find({}, sort=[("timestamp", -1)], limit=limit)
        return await cursor.to_list(limit)

    def is_mongo(self) -> bool:
        return self.is_connected_to_mongo


db_manager = DatabaseManager()
