import json
import paho.mqtt.client as mqtt
import threading
import time
from app.core.config import settings

class MQTTService:
    def __init__(self):
        self.client = mqtt.Client()
        # paho-mqtt callbacks
        self.client.on_connect = self._on_connect
        self.client.on_publish = self._on_publish
        self.client.on_disconnect = self._on_disconnect
        
        self.broker = settings.MQTT_BROKER
        self.port = settings.MQTT_PORT
        self.connected = False
        self._lock = threading.Lock()

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"✅ MQTT Connected to {self.broker}:{self.port}")
            self.connected = True
        else:
            print(f"❌ MQTT Connection failed with code {rc}")
            self.connected = False

    def _on_disconnect(self, client, userdata, rc):
        print(f"⚠️ MQTT Disconnected (code {rc})")
        self.connected = False

    def _on_publish(self, client, userdata, mid):
        # Optional: confirm delivery
        pass

    def start(self):
        """Start the MQTT client loop in a background thread"""
        try:
            print(f"🔌 Connecting to MQTT Broker at {self.broker}:{self.port}...")
            # connect_async is better for non-blocking start
            self.client.connect_async(self.broker, self.port, 60)
            self.client.loop_start()
        except Exception as e:
            print(f"❌ MQTT Start failed: {e}")

    def publish(self, topic: str, payload: dict):
        """Publish a dictionary as JSON"""
        if not self.connected:
            # Attempt reconnect/start if not listed as connected
            # But loop_start handles atomic reconnects usually.
            pass
        
        try:
            # Use lock if needed, but client.publish is thread-safe
            self.client.publish(topic, json.dumps(payload))
        except Exception as e:
            print(f"⚠️ MQTT Publish failed: {e}")

# Global instance
mqtt_service = MQTTService()
