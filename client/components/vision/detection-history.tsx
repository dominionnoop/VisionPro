"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface DetectionLog {
    id: string;
    timestamp: string;
    camera_id: string;
    model_id: string;
    speed_inference: number;
    speed_fps: number;
    has_detections: boolean;
    detection_count: number;
    detections: any[];
}

export function DetectionHistory() {
    const [logs, setLogs] = useState<DetectionLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [limit] = useState(20);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const skip = page * limit;
            const res = await fetch(`/api/logs?skip=${skip}&limit=${limit}`);
            const data = await res.json();
            if (data.data) {
                setLogs(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const clearLogs = async () => {
        if (!confirm("Are you sure you want to clear all logs?")) return;
        try {
            await fetch("/api/logs", { method: "DELETE" });
            fetchLogs();
        } catch (error) {
            console.error("Failed to clear logs:", error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Detection History</CardTitle>
                        <CardDescription>
                            View past detection events and statistics
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchLogs}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button variant="destructive" size="sm" onClick={clearLogs}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Camera</TableHead>
                                <TableHead>Result</TableHead>
                                <TableHead>Count</TableHead>
                                <TableHead>Speed</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No logs found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-mono text-xs">
                                            {format(new Date(log.timestamp), "MMM dd HH:mm:ss")}
                                        </TableCell>
                                        <TableCell>{log.camera_id}</TableCell>
                                        <TableCell>
                                            <Badge variant={log.has_detections ? "destructive" : "secondary"}>
                                                {log.has_detections ? "DETECTED" : "OK"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{log.detection_count}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {log.speed_inference.toFixed(1)}ms
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs max-w-[200px] truncate">
                                                {log.detections.map(d => d.className).join(", ")}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={logs.length < limit}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
