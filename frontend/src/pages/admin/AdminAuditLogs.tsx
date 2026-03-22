import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const AdminAuditLogs = () => (
  <div className="max-w-6xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">View admin activity history</p>
      </div>
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search logs..." className="pl-9" />
      </div>
    </div>
    <Card>
      <CardContent className="p-6">
        <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Audit logs coming soon</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default AdminAuditLogs;
