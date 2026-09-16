"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    deadlineReminders: true,
    newCompetitions: true,
    applicationUpdates: true,
    platformAnnouncements: false
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await api.notifications?.() || [];
      setNotifications(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await api.markNotificationRead?.(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function markAllAsRead() {
    try {
      await api.markAllNotificationsRead?.();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function savePreferences() {
    try {
      await api.updateNotificationPreferences?.(preferences);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      "deadline_reminder": "⏰",
      "new_competition": "🏆",
      "application_update": "📝",
      "achievement": "🎯",
      "platform_announcement": "📢"
    };
    return icons[type] || "🔔";
  }

  function getNotificationColor(type: string): string {
    const colors: Record<string, string> = {
      "deadline_reminder": "bg-amber-100 text-amber-700",
      "new_competition": "bg-blue-100 text-blue-700",
      "application_update": "bg-green-100 text-green-700",
      "achievement": "bg-purple-100 text-purple-700",
      "platform_announcement": "bg-brand-100 text-brand-700"
    };
    return colors[type] || "bg-neutral-100 text-neutral-700";
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-neutral-500">Stay updated on deadlines, new opportunities, and your application progress.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Notification Preferences */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.deadlineReminders}
              onChange={(e) => setPreferences({ ...preferences, deadlineReminders: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="font-medium">Deadline reminders</span>
              <p className="text-sm text-neutral-500">Get notified before competition deadlines</p>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.newCompetitions}
              onChange={(e) => setPreferences({ ...preferences, newCompetitions: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="font-medium">New matching competitions</span>
              <p className="text-sm text-neutral-500">When new competitions match your profile</p>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.applicationUpdates}
              onChange={(e) => setPreferences({ ...preferences, applicationUpdates: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="font-medium">Application updates</span>
              <p className="text-sm text-neutral-500">Status changes for your applications</p>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.platformAnnouncements}
              onChange={(e) => setPreferences({ ...preferences, platformAnnouncements: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="font-medium">Platform announcements</span>
              <p className="text-sm text-neutral-500">News and updates from ScholarTrack</p>
            </div>
          </label>
        </div>
        <button
          onClick={savePreferences}
          className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-white text-sm hover:bg-brand-700"
        >
          Save preferences
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          {unreadCount > 0 && `${unreadCount} unread · `}
          All notifications
        </h2>

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="rounded-md border p-8 text-center">
            <div className="mb-4 text-4xl">🔔</div>
            <p className="font-medium">No notifications yet.</p>
            <p className="mt-1 text-sm text-neutral-500">
              We'll notify you about deadlines, new opportunities, and updates.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-xl border p-4 transition-colors ${
                !notification.read ? "bg-brand-50 border-brand-200" : "bg-white border-neutral-200"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{notification.title}</h3>
                      <p className="text-sm text-neutral-600 mt-1">{notification.message}</p>
                      {notification.competition && (
                        <a
                          href={`/competitions/${notification.competition.id}`}
                          className="mt-2 inline-block text-sm text-brand-600 hover:underline"
                        >
                          View competition →
                        </a>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${getNotificationColor(notification.type)}`}>
                      {notification.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}