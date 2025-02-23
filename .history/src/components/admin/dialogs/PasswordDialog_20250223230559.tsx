import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from 'react';
import { User } from "@/types/poker";

interface PasswordDialogProps {
  user: User;
  onPasswordChange: (newPassword: string) => Promise<void>;
  loading: boolean;
}

const PasswordDialog = ({ user, onPasswordChange, loading }: PasswordDialogProps) => {
  const [newPassword, setNewPassword] = useState('');

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Change Password</DialogTitle>
        <DialogDescription>
          Enter a new password for {user.user_metadata?.username || user.email}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-4">
        <Input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button 
          onClick={() => onPasswordChange(newPassword)}
          disabled={!newPassword || loading}
        >
          Update Password
        </Button>
      </div>
    </DialogContent>
  );
};

export default PasswordDialog;