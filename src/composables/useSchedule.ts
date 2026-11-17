import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import {
  fetchPublicSchedule,
  type DemoScenario,
  subscribeScheduleChanges,
  scheduleCacheExpiresAt,
} from "../services/publicSchedule";
import type { PublicSchedule } from "../types/schedule";

export function useSchedule(
  week: Ref<string>,
  scenario = ref<DemoScenario>("success"),
) {
  const data = ref<PublicSchedule | null>(null),
    loading = ref(true),
    error = ref(""),
    now = ref(Date.now());
  let controller: AbortController | undefined;
  let refresh: ReturnType<typeof setTimeout> | undefined,
    tick: ReturnType<typeof setInterval>;
  let stopChanges = () => {};
  let request = 0;
  function visible() {
    if (!document.hidden) {
      now.value = Date.now();
      void load();
    }
  }
  function scheduleNextCheck(delay: number) {
    clearTimeout(refresh);
    refresh = setTimeout(
      () => {
        if (!document.hidden) void load(true);
      },
      Math.max(1000, delay),
    );
  }
  async function load(refreshView = false) {
    const current = ++request;
    controller?.abort();
    controller = new AbortController();
    loading.value = true;
    error.value = "";
    data.value = null;
    try {
      const result = await fetchPublicSchedule(week.value, {
        signal: controller.signal,
        scenario: scenario.value,
        refresh: refreshView,
      });
      if (current === request) {
        data.value = result;
        now.value = Date.now();
        scheduleNextCheck(scheduleCacheExpiresAt(result) - Date.now() + 100);
      }
    } catch (e) {
      if (
        current === request &&
        !(e instanceof DOMException && e.name === "AbortError")
      )
        error.value =
          "Data belum dapat diperbarui. Status ketersediaan belum diketahui.";
      if (current === request) scheduleNextCheck(60_000);
    } finally {
      if (current === request) loading.value = false;
    }
  }
  watch([week, scenario], () => void load(), { immediate: true });
  onMounted(() => {
    stopChanges = subscribeScheduleChanges(() => void load());
    tick = setInterval(() => (now.value = Date.now()), 1000);
    document.addEventListener("visibilitychange", visible);
  });
  onBeforeUnmount(() => {
    ++request;
    controller?.abort();
    clearTimeout(refresh);
    stopChanges();
    clearInterval(tick);
    document.removeEventListener("visibilitychange", visible);
  });
  return { data, loading, error, now, reload: () => load(true) };
}
