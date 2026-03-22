import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const AdminSettings = () => (
  <div className="max-w-4xl mx-auto space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground">System configuration and preferences</p>
    </div>
    <div className="grid gap-4">
      {["Profile Edit Permission", "Directory Visibility Rules", "Default Post Names", "OTP Settings", "Election Settings", "Footer & Contact Settings"].map((section) => (
        <Card key={section}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> {section}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configuration coming soon</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default AdminSettings;
