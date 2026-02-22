#!/usr/bin/env python3
"""Clear old test frames from MongoDB"""

from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv('MONGODB_URI')

client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True)
db = client['hireprep']
collection = db['videoanalysisframes']

result = collection.delete_many({})
print(f"✅ Deleted {result.deleted_count} frames from MongoDB")

client.close()
