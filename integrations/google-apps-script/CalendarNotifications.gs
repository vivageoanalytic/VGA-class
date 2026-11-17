/** Add beside the existing Code.gs. Its doPost and JSON response stay unchanged. */
function installVgaCalendarNotifications() {
  const settings = vgaNotificationSettings_();
  const props = PropertiesService.getScriptProperties();
  const configured =
    typeof CONFIG !== "undefined" && Array.isArray(CONFIG.CALENDAR_IDS) && CONFIG.CALENDAR_IDS.length
      ? CONFIG.CALENDAR_IDS
      : JSON.parse(props.getProperty("VGA_NOTIFICATION_CALENDAR_IDS") || "[]");
  const ids = Array.from(
    new Set(
      configured.filter(function (id) {
        return typeof id === "string" && id.trim();
      }),
    ),
  );
  if (!ids.length)
    throw new Error("Calendar IDs belum dikonfigurasi untuk trigger.");
  const existing = ScriptApp.getProjectTriggers();
  let added = 0;
  ids.forEach(function (id) {
    const found = existing.some(function (trigger) {
      return (
        trigger.getHandlerFunction() === "onVgaCalendarChanged" &&
        trigger.getTriggerSourceId() === id
      );
    });
    if (!found) {
      ScriptApp.newTrigger("onVgaCalendarChanged")
        .forUserCalendar(id)
        .onEventUpdated()
        .create();
      added++;
    }
  });
  if (
    !existing.some(function (trigger) {
      return trigger.getHandlerFunction() === "retryVgaCalendarNotification";
    })
  )
    ScriptApp.newTrigger("retryVgaCalendarNotification")
      .timeBased()
      .everyMinutes(5)
      .create();
  const result = {
    calendarTriggersAdded: added,
    testDelivered: onVgaCalendarChanged(),
  };
  console.log(JSON.stringify(result));
  return result;
}

/** Google fires this for event creation, edits and deletion. No event details are transmitted. */
function onVgaCalendarChanged() {
  const changeId = Utilities.getUuid();
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    PropertiesService.getScriptProperties().setProperty(
      "VGA_PENDING_CHANGE",
      changeId,
    );
  } finally {
    lock.releaseLock();
  }
  return vgaSendChange_(changeId);
}

/** Retries only a pending failed notification; an unchanged calendar causes no HTTP request. */
function retryVgaCalendarNotification() {
  const changeId =
    PropertiesService.getScriptProperties().getProperty("VGA_PENDING_CHANGE");
  return changeId ? vgaSendChange_(changeId) : true;
}

function vgaNotificationSettings_() {
  const props = PropertiesService.getScriptProperties();
  const url = (props.getProperty("VGA_WEBHOOK_URL") || "").trim();
  const secret = props.getProperty("VGA_WEBHOOK_SECRET") || "";
  if (
    !/^https:\/\/[A-Za-z0-9][A-Za-z0-9.-]+(?:\:443)?\/api\/calendar-changed$/.test(
      url,
    ) ||
    /\/\/(localhost|127\.|10\.|192\.168\.)/i.test(url)
  )
    throw new Error(
      "VGA_WEBHOOK_URL harus endpoint HTTPS publik /api/calendar-changed.",
    );
  if (secret.length < 32)
    throw new Error("VGA_WEBHOOK_SECRET belum dikonfigurasi.");
  return { url: url, secret: secret };
}

function vgaSendChange_(changeId) {
  try {
    const settings = vgaNotificationSettings_();
    const response = UrlFetchApp.fetch(settings.url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ changeId: changeId }),
      headers: { Authorization: "Bearer " + settings.secret },
      muteHttpExceptions: true,
      followRedirects: false,
    });
    const status = response.getResponseCode();
    if (
      status < 200 ||
      status >= 300 ||
      JSON.parse(response.getContentText()).success !== true
    )
      return false;
    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      const props = PropertiesService.getScriptProperties();
      if (props.getProperty("VGA_PENDING_CHANGE") === changeId)
        props.deleteProperty("VGA_PENDING_CHANGE");
    } finally {
      lock.releaseLock();
    }
    return true;
  } catch (ignored) {
    console.warn("Notifikasi kalender belum terkirim; akan dicoba kembali.");
    return false;
  }
}
