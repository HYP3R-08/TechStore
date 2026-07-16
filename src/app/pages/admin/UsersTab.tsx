import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, type Profile } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthContext';

export function UsersTab() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) toast.error(`Could not load users: ${error.message}`);
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (id: string, role: Profile['role']) => {
    const previous = users.find((u) => u.id === id)?.role;

    // Optimistic, with the previous value kept so a rejected change can be undone.
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));

    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select('id');

    if (error || !data?.length) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id && previous ? { ...u, role: previous } : u))
      );
      toast.error(error ? error.message : 'The role was not changed.');
      return;
    }

    toast.success(`Role updated to ${role}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <tr>
              {['Name', 'Email', 'Role', 'Joined'].map((h) => (
                <th
                  key={h}
                  className="text-left px-6 py-4 text-sm font-normal text-neutral-700 dark:text-neutral-300 tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {users.map((profile) => {
              const isSelf = profile.id === user?.id;
              return (
                <tr
                  key={profile.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-black dark:text-white">
                    {profile.full_name || '—'}
                    {isSelf && (
                      <span className="ml-2 text-xs text-neutral-400 dark:text-neutral-500">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                    {profile.email}
                  </td>
                  <td className="px-6 py-4">
                    {/*
                      Your own role is read-only here: demoting yourself would
                      lock you out of this page, and there is no other admin UI
                      to undo it from.
                    */}
                    <select
                      value={profile.role}
                      disabled={isSelf}
                      aria-label={`Role for ${profile.email}`}
                      onChange={(e) => updateRole(profile.id, e.target.value as Profile['role'])}
                      className="text-xs px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 cursor-pointer bg-white dark:bg-neutral-800 dark:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-16 text-neutral-500 dark:text-neutral-400 text-sm">
            No users yet
          </div>
        )}
      </div>
    </div>
  );
}
