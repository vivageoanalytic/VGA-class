import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import {
  fetchPublicSchedule,
  type DemoScenario,
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
  let refresh: ReturnType<typeof setInterval>,
    tick: ReturnType<typeof setInterval>;
  let request = 0;
  function visible() {
    if (!document.hidden) {
      now.value = Date.now();
      void load();
    }
  }
  async function load() {
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
      });
      if (current === request) {
        data.value = result;
        now.value = Date.now();
      }
    } catch (e) {
      if (
        current === request &&
        !(e instanceof DOMException && e.name === "AbortError")
      )
        error.value =
          "Data belum dapat diperbarui. Status ketersediaan belum diketahui.";
    } finally {
      if (current === request) loading.value = false;
    }
  }
  watch([week, scenario], load, { immediate: true });
  onMounted(() => {
    refresh = setInterval(() => {
      if (!document.hidden) void load();
    }, 240_000);
    tick = setInterval(() => (now.value = Date.now()), 1000);
    document.addEventListener("visibilitychange", visible);
  });
  onBeforeUnmount(() => {
    ++request;
    controller?.abort();
    clearInterval(refresh);
    clearInterval(tick);
    document.removeEventListener("visibilitychange", visible);
  });
  return { data, loading, error, now, reload: load };
}
