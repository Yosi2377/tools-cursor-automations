import PokerTable from "@/components/PokerTable";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Error logging out");
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="relative min-h-screen">
      <Button
        onClick={handleLogout}
        variant="outline"
        size="sm"
        className="absolute top-4 right-4 z-50"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
      <PokerTable />
    </div>
  );
};

export default Index;