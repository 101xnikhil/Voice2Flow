import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth.js';
import { usersApi } from '../../lib/api/users.js';
import { SessionDTO } from '@voice2flow/shared';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Modal } from '../../components/ui/Modal.js';
import { Skeleton } from '../../components/ui/Skeleton.js';
import {
  Shield,
  Laptop,
  Smartphone,
  Trash2,
  AlertTriangle,
  Lock,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, updateUser, logout } = useAuthStore();

  // Profile update state
  const [name, setName] = useState(user?.name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Sessions Query
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<SessionDTO[]>({
    queryKey: ['user-sessions'],
    queryFn: () => usersApi.getSessions(),
  });

  // Revoke Session Mutation
  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => usersApi.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
      toast.success('Session revoked');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to revoke session'),
  });

  const getInitials = (nameStr?: string) => {
    if (!nameStr) return 'U';
    return nameStr
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsUpdatingProfile(true);
    try {
      const res = await usersApi.updateMe({ name: name.trim() });
      updateUser(res.user);
      toast.success('Profile updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setIsChangingPassword(true);
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password changed successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) return;

    setIsDeletingAccount(true);
    try {
      await usersApi.deleteAccount({ password: deletePassword });
      toast.success('Account deleted');
      await logout();
      navigate('/login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Profile</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Manage your account information, security, and sessions
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] text-white flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-md">
          {getInitials(user?.name)}
        </div>

        <div className="flex-1 flex flex-col gap-1 text-center sm:text-left">
          <h2 className="text-lg font-bold text-[var(--text)]">{user?.name}</h2>
          <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
          <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-[var(--text-muted)] mt-2">
            <span>Timezone: {user?.timezone}</span>
            {user?.createdAt && (
              <span>
                Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-[var(--text)]">Account Details</h2>

        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={user?.email || ''}
            disabled
            helper="Email address cannot be changed"
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isUpdatingProfile}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Update Profile
            </Button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#7C5CFF]" />
          <h2 className="text-base font-semibold text-[var(--text)]">Security & Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <Input
            label="Current Password"
            isPassword
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Input
            label="New Password"
            isPassword
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            helper="Min 8 characters, letters and numbers"
            required
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              isLoading={isChangingPassword}
              leftIcon={<Shield className="w-4 h-4" />}
            >
              Change Password
            </Button>
          </div>
        </form>
      </div>

      {/* Active Sessions List */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">Active Sessions</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Devices that are currently signed in to your account.
          </p>
        </div>

        {isLoadingSessions ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No active sessions found.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((session) => {
              const isMobile =
                session.userAgent &&
                (session.userAgent.includes('Mobile') || session.userAgent.includes('Android'));
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-[var(--surface)] text-[var(--text-muted)]">
                      {isMobile ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--text)] truncate max-w-xs">
                          {session.userAgent || 'Unknown Device'}
                        </span>
                        {session.isCurrent && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded font-semibold bg-[#059669]/15 text-[#059669]">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        IP: {session.ip || 'Unknown'} · Created{' '}
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeSessionMutation.mutate(session.id)}
                      isLoading={revokeSessionMutation.isPending}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#DC2626]">Danger Zone</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Permanently delete your account and all associated tasks and workflows.
          </p>
        </div>

        <div className="flex justify-start">
          <Button
            variant="danger"
            onClick={() => setIsDeleteModalOpen(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Voice2Flow Account"
      >
        <form onSubmit={handleDeleteAccount} className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[#DC2626]">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold">Irreversible action</p>
              <p className="mt-0.5">
                All of your tasks, history, reminders, and user data will be permanently wiped.
                Please enter your password to confirm.
              </p>
            </div>
          </div>

          <Input
            label="Confirm Password"
            isPassword
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="••••••••"
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isDeletingAccount}
            >
              Permanently Delete My Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
