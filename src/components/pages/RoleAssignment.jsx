import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import ApperIcon from '@/components/ApperIcon';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Loading from '@/components/ui/Loading';
import Error from '@/components/ui/Error';
import Empty from '@/components/ui/Empty';
import employeeService from '@/services/api/employeeService';

// Error Boundary Component
class RoleAssignmentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RoleAssignment Error:', error, errorInfo);
    toast.error('An unexpected error occurred in Role Assignment');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-6xl mx-auto">
            <Error
              title="Role Assignment Error"
              message="Something went wrong while loading the role assignment page."
              onRetry={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Role Assignment Component
const RoleAssignment = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

const availableRoles = [
    { value: 'admin', label: 'Administrator', color: 'text-red-600 bg-red-50' },
    { value: 'moderator', label: 'Moderator', color: 'text-blue-600 bg-blue-50' },
    { value: 'employee', label: 'Employee', color: 'text-green-600 bg-green-50' },
    { value: 'vendor', label: 'Vendor', color: 'text-purple-600 bg-purple-50' },
    { value: 'purchaser', label: 'Purchaser', color: 'text-orange-600 bg-orange-50' },
    { value: 'delivery', label: 'Delivery', color: 'text-teal-600 bg-teal-50' },
    { value: 'user', label: 'User', color: 'text-gray-600 bg-gray-50' }
  ];
const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all employees using the correct method name
      const usersData = await employeeService.getAll();
      
      // Add role information to users if not present
      const usersWithRoles = usersData.map(user => ({
        ...user,
        role: user.role || 'user',
        lastLogin: user.lastLogin || new Date().toISOString(),
        status: user.status || 'active'
      }));
      
      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
      setRetryCount(0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError({
        title: 'Failed to Load Users',
        message: err.message || 'Unable to fetch user data. Please try again.',
        code: err.code || 'FETCH_ERROR'
      });
      
      // Simulate retry logic
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchUsers();
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

const handleRoleUpdate = async (userId, newRole) => {
    try {
      setUpdatingUserId(userId);
      
      // Use the new updateRole service method
      await employeeService.updateRole(userId, newRole);
      
      // Update local state with correct Id field (capital I)
      const updatedUsers = users.map(user =>
        user.Id === userId ? { ...user, role: newRole } : user
      );
      setUsers(updatedUsers);
      
      const roleLabel = availableRoles.find(r => r.value === newRole)?.label || newRole;
      toast.success(`Role updated successfully to ${roleLabel}`);
    } catch (err) {
      console.error('Failed to update role:', err);
      toast.error('Failed to update role. Please try again.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleColor = (role) => {
    const roleConfig = availableRoles.find(r => r.value === role);
    return roleConfig?.color || 'text-gray-600 bg-gray-50';
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4 shimmer"></div>
            <div className="h-4 bg-gray-200 rounded w-96 shimmer"></div>
          </div>
          
          <div className="card p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="h-12 bg-gray-200 rounded flex-1 shimmer"></div>
              <div className="h-12 bg-gray-200 rounded w-32 shimmer"></div>
            </div>
          </div>
          
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full shimmer"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2 shimmer"></div>
                      <div className="h-3 bg-gray-200 rounded w-48 shimmer"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-24 shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Error
            title={error.title}
            message={error.message}
            onRetry={handleRetry}
            details={error.code && `Error Code: ${error.code}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <ApperIcon name="Settings" className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Role Assignment</h1>
          </div>
          <p className="text-gray-600">
            Manage user roles and permissions across the system
          </p>
        </div>

        {/* Search and Filter */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="">All Roles</option>
              {availableRoles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {filteredUsers.length} of {users.length} users
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="flex items-center space-x-2"
            >
              <ApperIcon name="RefreshCw" className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <Empty
            title="No Users Found"
            message={searchTerm ? "No users match your search criteria." : "No users available for role assignment."}
            icon="Users"
          />
        ) : (
          <div className="space-y-4">
            {filteredUsers.map(user => (
              <div key={user.id} className="card p-6 hover:shadow-premium transition-shadow duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.name || 'Unknown User'}</h3>
                      <p className="text-gray-600">{user.email || 'No email provided'}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {availableRoles.find(r => r.value === user.role)?.label || user.role}
                        </span>
                        <span className="text-xs text-gray-500">
                          Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
<select
                      value={user.role}
                      onChange={(e) => handleRoleUpdate(user.Id, e.target.value)}
                      disabled={updatingUserId === user.Id}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
                    >
                      {availableRoles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    
{updatingUserId === user.Id && (
                      <div className="flex items-center space-x-2">
                        <Loading type="spinner" size="sm" />
                        <span className="text-sm text-gray-500">Updating...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Main export with ErrorBoundary wrapper
const RoleAssignmentWithErrorBoundary = () => (
  <RoleAssignmentErrorBoundary>
    <RoleAssignment />
  </RoleAssignmentErrorBoundary>
);

export default RoleAssignmentWithErrorBoundary;