const webpush = require('web-push');

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:webmaster@mru.ac.ug',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Send push notification
const sendPushNotification = async (subscription, payload) => {
  try {
    const options = {
      TTL: 60 * 60, // Time to live - 1 hour
      urgency: payload.priority === 'high' ? 'high' : 'normal',
      topic: 'mru-chat-notification'
    };

    const pushPayload = {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/logo192.png',
        badge: '/notification-badge.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: payload.data?.notificationId || 1,
          ...payload.data
        },
        actions: getNotificationActions(payload.type)
      }
    };

    await webpush.sendNotification(
      subscription,
      JSON.stringify(pushPayload),
      options
    );

    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    if (error.statusCode === 410) {
      // Subscription has expired or is no longer valid
      return 'invalid-subscription';
    }
    throw error;
  }
};

// Get notification actions based on type
const getNotificationActions = (type) => {
  switch (type) {
    case 'message':
      return [
        {
          action: 'reply',
          title: 'Reply'
        },
        {
          action: 'view',
          title: 'View'
        }
      ];
    case 'call':
      return [
        {
          action: 'answer',
          title: 'Answer'
        },
        {
          action: 'decline',
          title: 'Decline'
        }
      ];
    case 'group':
      return [
        {
          action: 'view',
          title: 'View Group'
        }
      ];
    case 'timetable':
      return [
        {
          action: 'view',
          title: 'View Changes'
        }
      ];
    case 'lecture':
      return [
        {
          action: 'join',
          title: 'Join Lecture'
        },
        {
          action: 'view',
          title: 'View Details'
        }
      ];
    case 'assignment':
      return [
        {
          action: 'view',
          title: 'View Assignment'
        }
      ];
    default:
      return [
        {
          action: 'view',
          title: 'View'
        }
      ];
  }
};

// Send bulk push notifications
const sendBulkPushNotifications = async (subscriptions, payload) => {
  try {
    const results = await Promise.allSettled(
      subscriptions.map(subscription =>
        sendPushNotification(subscription, payload)
      )
    );

    return results.map((result, index) => ({
      subscription: subscriptions[index],
      status: result.status,
      error: result.reason
    }));

  } catch (error) {
    console.error('Error sending bulk push notifications:', error);
    throw error;
  }
};

// Generate VAPID keys
const generateVAPIDKeys = () => {
  return webpush.generateVAPIDKeys();
};

// Validate subscription
const validateSubscription = (subscription) => {
  try {
    if (!subscription.endpoint || 
        !subscription.keys || 
        !subscription.keys.p256dh || 
        !subscription.keys.auth) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

// Create notification schedule
const scheduleNotification = async (subscription, payload, scheduledTime) => {
  const delay = scheduledTime.getTime() - Date.now();
  if (delay <= 0) {
    return sendPushNotification(subscription, payload);
  }

  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await sendPushNotification(subscription, payload);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
};

// Handle push notification errors
const handlePushError = (error, subscription) => {
  if (error.statusCode === 410 || error.statusCode === 404) {
    // Subscription is no longer valid
    return 'invalid-subscription';
  }
  
  if (error.statusCode === 429) {
    // Too many requests - implement rate limiting
    return 'rate-limited';
  }
  
  console.error('Push notification error:', error);
  return 'error';
};

module.exports = {
  sendPushNotification,
  sendBulkPushNotifications,
  generateVAPIDKeys,
  validateSubscription,
  scheduleNotification,
  handlePushError
};
