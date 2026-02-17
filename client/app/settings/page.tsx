import DashboardPageLayout from "@/components/dashboard/layout";
import GearIcon from "@/components/icons/gear";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
    return (
        <DashboardPageLayout
            header={{
                title: "Settings",
                description: "System configuration and preferences",
                icon: GearIcon,
            }}
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-display">General</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Language</p>
                                <p className="text-sm text-muted-foreground">Select display language</p>
                            </div>
                            <select className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
                                <option>English</option>
                                <option>Thai</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Theme</p>
                                <p className="text-sm text-muted-foreground">Choose appearance mode</p>
                            </div>
                            <select className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
                                <option>Dark</option>
                                <option>Light</option>
                                <option>System</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-display">Storage</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Auto Cleanup</p>
                                <p className="text-sm text-muted-foreground">Delete old results automatically</p>
                            </div>
                            <input type="checkbox" defaultChecked className="size-5 rounded" />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Retention Period</p>
                                <p className="text-sm text-muted-foreground">Keep results for</p>
                            </div>
                            <select className="px-3 py-2 rounded-lg bg-muted border border-border text-sm">
                                <option>7 days</option>
                                <option>30 days</option>
                                <option>90 days</option>
                                <option>Forever</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-display">About</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between py-2">
                            <span className="text-muted-foreground">Version</span>
                            <span className="font-mono">1.0.0</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-muted-foreground">Build</span>
                            <span className="font-mono">2025.01.20</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-muted-foreground">License</span>
                            <span className="font-mono">Commercial</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardPageLayout>
    );
}
