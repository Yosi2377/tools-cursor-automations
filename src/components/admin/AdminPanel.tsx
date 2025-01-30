import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { UserPlus, Users } from 'lucide-react';
import CreateUserForm from './CreateUserForm';
import UserList from './UserList';

const AdminPanel = () => {
  const [showCreateUser, setShowCreateUser] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Button
          onClick={() => setShowCreateUser(true)}
          variant={showCreateUser ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
        <Button
          onClick={() => setShowCreateUser(false)}
          variant={!showCreateUser ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Manage Users
        </Button>
      </div>

      {showCreateUser ? (
        <CreateUserForm onUserCreated={() => setShowCreateUser(false)} />
      ) : (
        <UserList />
      )}
    </div>
  );
};

export default AdminPanel;