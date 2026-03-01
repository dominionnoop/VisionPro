import paho.mqtt.client as mqtt
import json
import time

def test_mqtt():
    client = mqtt.Client()
    
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("✅ Connected to MQTT Broker!")
            client.subscribe("vision/+/results")
            print("📡 Subscribed to 'vision/+/results'")
        else:
            print(f"❌ Connection failed with code {rc}")

    def on_message(client, userdata, msg):
        print(f"\n📩 Message received on {msg.topic}")
        try:
            payload = json.loads(msg.payload.decode())
            print(json.dumps(payload, indent=2))
        except Exception as e:
            print(f"Error parsing JSON: {e}")

    client.on_connect = on_connect
    client.on_message = on_message

    print("🔌 Connecting to localhost:1883...")
    client.connect("localhost", 1883, 60)
    
    client.loop_start()
    
    print("⏳ Waiting for messages... (Press Ctrl+C to stop)")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping...")
        client.loop_stop()

if __name__ == "__main__":
    test_mqtt()
