import { useState } from 'react';
import { X, Shield, CreditCard as Edit3, Users } from 'lucide-react';
import { validateRole } from '../lib/accessControl';
import { UserRole } from '../lib/types';

interface RoleSelectorProps {
  matchId: string;
  onRoleSelected: (role: UserRole) => void;
  onClose: () => void;
}

export function RoleSelector({ matchId, onRoleSelected, onClose }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles: { value: UserRole; label: string; icon: typeof Shield; description: string }[] = [
    {
      value: 'admin',
      label: 'Admin',
      icon: Shield,
      description: 'Full control: Manage rules, complete matches',
    },
    {
      value: 'umpire',
      label: 'Umpire',
      icon: Users,
      description: 'Match authority: Override rules, complete matches',
    },
    {
      value: 'scorer',
      label: 'Scorer',
      icon: Edit3,
      description: 'Data entry: Record balls and scoring',
    },
  ];

  const handleVerify = async () => {
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    if (!passcode.trim()) {
      setError('Please enter passcode');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = await validateRole(matchId, passcode, selectedRole);

      if (isValid) {
        onRoleSelected(selectedRole);
        onClose();
      } else {
        setError('Invalid passcode for selected role');
      }
    } catch (err) {
      setError('Failed to verify role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Select Your Role</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.value}
                  onClick={() => {
                    setSelectedRole(role.value);
                    setError('');
                  }}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedRole === role.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      size={24}
                      className={selectedRole === role.value ? 'text-blue-600' : 'text-gray-400'}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{role.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{role.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedRole && (
            <div className="space-y-2 animate-fadeIn">
              <label className="block text-sm font-medium text-gray-700">
                Enter {roles.find(r => r.value === selectedRole)?.label} Passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="Enter passcode"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={!selectedRole || !passcode.trim() || loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
