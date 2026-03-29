export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestEssentialNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showEssentialDueNotification(titles: string[]): void {
  if (!notificationsSupported() || Notification.permission !== 'granted' || titles.length === 0) {
    return;
  }
  const title = titles.length === 1 ? 'Essential reminder' : `${titles.length} essential reminders`;
  const body = titles.join(' · ');
  try {
    const n = new Notification(title, {
      body,
      tag: 'brain-backup-essential',
      renotify: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* Safari / privacy mode */
  }
}
