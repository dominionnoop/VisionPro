"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { DatabaseAction, ModbusAction, MQTTAction } from "@/types/vision";

interface ActionSettingsState {
  database: DatabaseAction;
  modbus: ModbusAction;
  mqtt: MQTTAction;
}

const initialState: ActionSettingsState = {
  database: {
    type: "database",
    enabled: true,
    tableName: "inspection_results",
    saveImage: true,
    saveDetections: true,
  },
  modbus: {
    type: "modbus",
    enabled: false,
    host: "192.168.1.200",
    port: 502,
    unitId: 1,
    registerAddress: 100,
    registerType: "holding",
    mapping: [
      { classId: 0, value: 0 },
      { classId: 1, value: 1 },
    ],
  },
  mqtt: {
    type: "mqtt",
    enabled: false,
    broker: "mqtt://192.168.1.201",
    port: 1883,
    topic: "vision/results",
    qos: 1,
    retain: false,
  },
};

export function ActionSettings() {
  const [settings, setSettings] = useState<ActionSettingsState>(initialState);
  const [testStatus, setTestStatus] = useState<{
    database?: "success" | "error" | "testing";
    modbus?: "success" | "error" | "testing";
    mqtt?: "success" | "error" | "testing";
  }>({});

  const handleTestConnection = async (type: "database" | "modbus" | "mqtt") => {
    setTestStatus((prev) => ({ ...prev, [type]: "testing" }));
    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const success = Math.random() > 0.3;
    setTestStatus((prev) => ({ ...prev, [type]: success ? "success" : "error" }));
  };

  const handleSave = () => {
    // In real implementation, save to backend
    alert("Settings saved successfully!");
  };

  return (
    <div className="space-y-4">
      {/* Database Action */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              Database Storage
              <Badge
                variant="outline"
                className={
                  settings.database.enabled
                    ? "bg-success/20 text-success border-success/30"
                    : "bg-muted text-muted-foreground"
                }
              >
                {settings.database.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </CardTitle>
            <Button
              variant={settings.database.enabled ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSettings({
                  ...settings,
                  database: {
                    ...settings.database,
                    enabled: !settings.database.enabled,
                  },
                })
              }
            >
              {settings.database.enabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Table Name</label>
              <Input
                value={settings.database.tableName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    database: { ...settings.database, tableName: e.target.value },
                  })
                }
                placeholder="inspection_results"
                disabled={!settings.database.enabled}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.database.saveImage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    database: {
                      ...settings.database,
                      saveImage: e.target.checked,
                    },
                  })
                }
                disabled={!settings.database.enabled}
                className="size-4 rounded border-border"
              />
              <span className="text-sm">Save Images</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.database.saveDetections}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    database: {
                      ...settings.database,
                      saveDetections: e.target.checked,
                    },
                  })
                }
                disabled={!settings.database.enabled}
                className="size-4 rounded border-border"
              />
              <span className="text-sm">Save Detections</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestConnection("database")}
              disabled={!settings.database.enabled || testStatus.database === "testing"}
            >
              {testStatus.database === "testing" ? "Testing..." : "Test Connection"}
            </Button>
            {testStatus.database === "success" && (
              <Badge className="bg-success/20 text-success">Connected</Badge>
            )}
            {testStatus.database === "error" && (
              <Badge className="bg-destructive/20 text-destructive">Failed</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modbus Action */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              Modbus Output
              <Badge
                variant="outline"
                className={
                  settings.modbus.enabled
                    ? "bg-success/20 text-success border-success/30"
                    : "bg-muted text-muted-foreground"
                }
              >
                {settings.modbus.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </CardTitle>
            <Button
              variant={settings.modbus.enabled ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSettings({
                  ...settings,
                  modbus: { ...settings.modbus, enabled: !settings.modbus.enabled },
                })
              }
            >
              {settings.modbus.enabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Host</label>
              <Input
                value={settings.modbus.host}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    modbus: { ...settings.modbus, host: e.target.value },
                  })
                }
                placeholder="192.168.1.200"
                disabled={!settings.modbus.enabled}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Port</label>
              <Input
                type="number"
                value={settings.modbus.port}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    modbus: { ...settings.modbus, port: Number(e.target.value) },
                  })
                }
                disabled={!settings.modbus.enabled}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit ID</label>
              <Input
                type="number"
                value={settings.modbus.unitId}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    modbus: { ...settings.modbus, unitId: Number(e.target.value) },
                  })
                }
                disabled={!settings.modbus.enabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Register Address</label>
              <Input
                type="number"
                value={settings.modbus.registerAddress}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    modbus: {
                      ...settings.modbus,
                      registerAddress: Number(e.target.value),
                    },
                  })
                }
                disabled={!settings.modbus.enabled}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Register Type</label>
              <div className="flex gap-2">
                {(["coil", "holding"] as const).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={
                      settings.modbus.registerType === type ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        modbus: { ...settings.modbus, registerType: type },
                      })
                    }
                    disabled={!settings.modbus.enabled}
                    className="flex-1 capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestConnection("modbus")}
              disabled={!settings.modbus.enabled || testStatus.modbus === "testing"}
            >
              {testStatus.modbus === "testing" ? "Testing..." : "Test Connection"}
            </Button>
            {testStatus.modbus === "success" && (
              <Badge className="bg-success/20 text-success">Connected</Badge>
            )}
            {testStatus.modbus === "error" && (
              <Badge className="bg-destructive/20 text-destructive">Failed</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MQTT Action */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              MQTT Output
              <Badge
                variant="outline"
                className={
                  settings.mqtt.enabled
                    ? "bg-success/20 text-success border-success/30"
                    : "bg-muted text-muted-foreground"
                }
              >
                {settings.mqtt.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </CardTitle>
            <Button
              variant={settings.mqtt.enabled ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSettings({
                  ...settings,
                  mqtt: { ...settings.mqtt, enabled: !settings.mqtt.enabled },
                })
              }
            >
              {settings.mqtt.enabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Broker</label>
              <Input
                value={settings.mqtt.broker}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    mqtt: { ...settings.mqtt, broker: e.target.value },
                  })
                }
                placeholder="mqtt://192.168.1.201"
                disabled={!settings.mqtt.enabled}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Port</label>
              <Input
                type="number"
                value={settings.mqtt.port}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    mqtt: { ...settings.mqtt, port: Number(e.target.value) },
                  })
                }
                disabled={!settings.mqtt.enabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic</label>
              <Input
                value={settings.mqtt.topic}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    mqtt: { ...settings.mqtt, topic: e.target.value },
                  })
                }
                placeholder="vision/results"
                disabled={!settings.mqtt.enabled}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">QoS</label>
              <div className="flex gap-2">
                {([0, 1, 2] as const).map((qos) => (
                  <Button
                    key={qos}
                    type="button"
                    variant={settings.mqtt.qos === qos ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        mqtt: { ...settings.mqtt, qos },
                      })
                    }
                    disabled={!settings.mqtt.enabled}
                    className="flex-1"
                  >
                    {qos}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username (Optional)</label>
              <Input
                value={settings.mqtt.username || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    mqtt: { ...settings.mqtt, username: e.target.value || undefined },
                  })
                }
                placeholder="username"
                disabled={!settings.mqtt.enabled}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password (Optional)</label>
              <Input
                type="password"
                value={settings.mqtt.password || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    mqtt: { ...settings.mqtt, password: e.target.value || undefined },
                  })
                }
                placeholder="password"
                disabled={!settings.mqtt.enabled}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.mqtt.retain}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    mqtt: { ...settings.mqtt, retain: e.target.checked },
                  })
                }
                disabled={!settings.mqtt.enabled}
                className="size-4 rounded border-border"
              />
              <span className="text-sm">Retain Messages</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestConnection("mqtt")}
              disabled={!settings.mqtt.enabled || testStatus.mqtt === "testing"}
            >
              {testStatus.mqtt === "testing" ? "Testing..." : "Test Connection"}
            </Button>
            {testStatus.mqtt === "success" && (
              <Badge className="bg-success/20 text-success">Connected</Badge>
            )}
            {testStatus.mqtt === "error" && (
              <Badge className="bg-destructive/20 text-destructive">Failed</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
