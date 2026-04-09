import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

const Donations = () => (
  <div className="mx-auto w-full max-w-screen-2xl space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground">Donations</h1>
      <p className="text-sm text-muted-foreground">Active donation campaigns</p>
    </div>
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Campaigns</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No active donation campaigns</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default Donations;
