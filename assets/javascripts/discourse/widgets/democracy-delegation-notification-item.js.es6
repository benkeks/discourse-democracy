import { createWidgetFrom } from "discourse/widgets/widget";
import { DefaultNotificationItem } from "discourse/widgets/default-notification-item";
import { userPath } from "discourse/lib/url";

createWidgetFrom(
  DefaultNotificationItem,
  "democracy-delegation-notification-item",
  {
    description() {
      return I18n.t('notifications.delegation_description');
    },

    url(data) {
      return userPath(data.username || data.display_username);
    }
  }
);