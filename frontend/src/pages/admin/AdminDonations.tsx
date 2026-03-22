import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";

const AdminDonations = () => (
  <div className="max-w-6xl mx-auto space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground">Donation Management</h1>
      <p className="text-sm text-muted-foreground">Manage donation campaigns and submissions</p>
    </div>
    <Card>
      <CardContent className="p-6">
        <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Donation management coming soon</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default AdminDonations;
