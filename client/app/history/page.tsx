import { DetectionHistory } from "@/components/vision/detection-history";

export default function HistoryPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold">Inspection History</h1>
                    <p className="text-muted-foreground">
                        Review past detection events and performance metrics.
                    </p>
                </div>
            </div>

            <DetectionHistory />
        </div>
    );
}
